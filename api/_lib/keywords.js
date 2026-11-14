// SEO keyword tracker for Admin → SEO → Keywords (table public.keywords, supabase/08-keywords.sql).
//   GET    /api/admin/seo?tool=keywords             → { items }
//   POST   /api/admin/seo?tool=keywords             { items: [...] } or one keyword → { created, skipped }
//   PUT    /api/admin/seo?tool=keywords&id=<uuid>   one keyword → { item }
//   DELETE /api/admin/seo?tool=keywords&id=<uuid>
//   GET    /api/admin/seo?tool=ideas&q=eco+friendly+corporate+gifts&gl=in&deep=1
//          → what people actually type into Google (Autocomplete), grouped
import { readJson } from './admin.js';

const KINDS = ['target', 'trending'];
const INTENTS = ['commercial', 'informational', 'navigational', 'transactional'];
const STATUSES = ['planned', 'optimized', 'ranking'];
const MISSING_TABLE = 'The keywords table is missing. Run supabase/08-keywords.sql in Supabase → SQL Editor, then reload.';

const isMissingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST205' || /keywords/.test(error.message ?? '') && /does not exist|could not find/i.test(error.message ?? ''));

function fail(res, error, fallback) {
  if (isMissingTable(error)) return res.status(503).json({ error: MISSING_TABLE });
  console.error('[admin/keywords]', error);
  return res.status(500).json({ error: fallback });
}

// Checks one keyword from the browser; returns [value, null] or [null, message]
function clean(k) {
  if (!k || typeof k !== 'object') return [null, 'Send a keyword.'];
  const term = String(k.term ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (term.length < 2 || term.length > 120) return [null, 'A keyword needs 2–120 characters.'];
  const pick = (v, list, def) => (list.includes(v) ? v : def);
  const pos = k.position === null || k.position === '' || k.position === undefined ? null : Number(k.position);
  if (pos !== null && (!Number.isInteger(pos) || pos < 1 || pos > 1000)) return [null, 'Google position must be a whole number from 1 to 1000.'];
  const page = String(k.page ?? '').trim();
  if (page && !/^\/[a-z0-9\-/]*$/i.test(page)) return [null, 'Page must be a website address such as /occasions/birthday-gifting.'];
  return [{
    term,
    kind: pick(k.kind, KINDS, 'target'),
    intent: pick(k.intent, INTENTS, 'commercial'),
    page,
    status: pick(k.status, STATUSES, 'planned'),
    position: pos,
    notes: String(k.notes ?? '').slice(0, 1000),
  }, null];
}

export async function keywords(req, res, { db, profile, user }) {
  const id = String(req.query?.id ?? '');

  if (req.method === 'GET') {
    const { data, error } = await db.from('keywords').select('*').order('kind').order('page').order('term');
    if (error) return fail(res, error, 'Could not load keywords.');
    return res.status(200).json({ items: data });
  }

  if (req.method === 'POST') {
    const body = readJson(req);
    const list = Array.isArray(body.items) ? body.items : [body];
    if (list.length === 0 || list.length > 1000) return res.status(400).json({ error: 'Send 1–1000 keywords.' });
    const rows = [];
    for (const k of list) {
      const [row, msg] = clean(k);
      if (msg) return res.status(400).json({ error: `${msg}${k?.term ? ` (“${k.term}”)` : ''}` });
      rows.push(row);
    }
    const { data: existing, error: readErr } = await db.from('keywords').select('term');
    if (readErr) return fail(res, readErr, 'Could not add keywords.');
    const seen = new Set(existing.map((k) => k.term.toLowerCase()));
    const fresh = rows.filter((r) => !seen.has(r.term) && (seen.add(r.term), true));
    if (fresh.length) {
      const by = profile?.full_name || user.email;
      const { error } = await db.from('keywords').insert(fresh.map((r) => ({ ...r, created_by: by })));
      if (error) return fail(res, error, 'Could not add keywords.');
    }
    if (!Array.isArray(body.items) && fresh.length === 0) return res.status(409).json({ error: `“${rows[0].term}” is already tracked.` });
    return res.status(201).json({ created: fresh.length, skipped: rows.length - fresh.length });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing keyword id.' });
    const [row, msg] = clean(readJson(req));
    if (msg) return res.status(400).json({ error: msg });
    const { data, error } = await db.from('keywords').update(row).eq('id', id).select('*').maybeSingle();
    if (error?.code === '23505') return res.status(409).json({ error: `“${row.term}” is already tracked.` });
    if (error) return fail(res, error, 'Could not save the keyword.');
    if (!data) return res.status(404).json({ error: 'That keyword no longer exists.' });
    return res.status(200).json({ item: data });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'Missing keyword id.' });
    const { error } = await db.from('keywords').delete().eq('id', id);
    if (error) return fail(res, error, 'Could not remove the keyword.');
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

/* ── Keyword ideas: Google Autocomplete ───────────────────────── */

const ideaCache = new Map(); // lives as long as the warm function
const IDEA_TTL = 60 * 60 * 1000;

async function suggest(q, gl) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=${gl}&q=${encodeURIComponent(q)}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteAdmin/1.0)' } });
    if (!r.ok) return [];
    const json = JSON.parse(new TextDecoder('utf-8').decode(await r.arrayBuffer()));
    return Array.isArray(json?.[1]) ? json[1] : [];
  } catch {
    return [];
  }
}

export async function keywordIdeas(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const q = String(req.query?.q ?? '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 80);
  if (q.length < 2) return res.status(400).json({ error: 'Enter a topic to search (2+ characters).' });
  const gl = /^[a-z]{2}$/i.test(String(req.query?.gl)) ? String(req.query.gl).toLowerCase() : 'in';
  const deep = req.query?.deep === '1';
  const key = `${gl}|${deep}|${q}`;
  const hit = ideaCache.get(key);
  if (hit && Date.now() - hit.at < IDEA_TTL) return res.status(200).json(hit.data);

  const groups = [
    { label: 'Direct', queries: [q] },
    { label: 'Buying', queries: [`${q} online`, `best ${q}`, `${q} price`, `${q} with logo`, `${q} in bulk`] },
    { label: 'Local', queries: [`${q} in india`, `${q} near me`, `${q} patna`] },
    { label: 'Questions', queries: [`what ${q}`, `how to ${q}`, `which ${q}`] },
    { label: 'This year', queries: [`${q} 2026`, `${q} 2027`] },
    ...(deep ? [{ label: 'Long tail', queries: 'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => `${q} ${c}`) }] : []),
  ];

  const seen = new Set();
  const out = [];
  for (const g of groups) {
    const lists = await Promise.all(g.queries.map((x) => suggest(x, gl)));
    const ideas = lists.flat().map((s) => String(s).toLowerCase().trim()).filter((s) => s && !seen.has(s) && (seen.add(s), true));
    if (ideas.length) out.push({ label: g.label, ideas });
  }
  const data = { seed: q, gl, groups: out, total: seen.size };
  if (seen.size) ideaCache.set(key, { at: Date.now(), data });
  return res.status(200).json(data);
}
