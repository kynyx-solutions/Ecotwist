// Emails to clients from the admin panel (proposals, follow-ups, wishes…), sent through Resend.
//
// POST { messages: [{ to, subject, body, lead_id?, customer_id?, order_id?, template_id?, attachments? }],
//        campaign?, attachments? }
//   1–100 messages per call. Every recipient gets its own email (nobody sees the others).
//   attachments: [{ path, name, type, size }] in the private "attachments" bucket (uploaded by the
//   admin panel). Per-message files must sit in proposals/<that message's lead/customer/order id>/;
//   the top-level list goes to every recipient and must sit in campaigns/<id>/. Max 25 MB per email.
//   With attachments every email is sent on its own (Resend's batch endpoint can't carry files),
//   so keep those calls small (the admin sends 5 at a time).
//   → { results: [{ to, ok, error? }], logged, logError? }
// Every message is logged in the "messages" table (status sent / failed).
//
// Needs: RESEND_API_KEY, and MAIL_FROM (or ALERT_FROM_EMAIL) on a domain verified in Resend.
// Replies go to the staff member who sent the email.
import { readJson, requireStaff } from '../_lib/admin.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PER_CALL = 100;
const MAX_ATTACH_TOTAL = 25 * 1024 * 1024;
const ATTACH_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const PATH_RE = /^(proposals|campaigns)\/([A-Za-z0-9-]{1,64})\/(\d{10,16})-[A-Za-z0-9._-]{1,100}$/;
const FRESH_MS = 7 * 24 * 3600 * 1000;
const SITE_URL = 'https://ecotwist.in';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ctx = await requireStaff(req, res);
  if (!ctx) return;
  const { db, profile } = ctx;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Email isn't set up yet: add RESEND_API_KEY in Vercel / .env.local" });

  let body;
  try {
    body = readJson(req);
  } catch {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  const list = Array.isArray(body.messages) ? body.messages : [];
  if (!list.length) return res.status(400).json({ error: 'Nothing to send.' });
  if (list.length > MAX_PER_CALL) return res.status(400).json({ error: `Send at most ${MAX_PER_CALL} emails at a time.` });
  const campaign = String(body.campaign ?? '').trim().slice(0, 160);

  // Files for every recipient (bulk sends): campaigns/<id>/…
  const shared = cleanAttachments(body.attachments);
  if (shared.error) return res.status(400).json({ error: shared.error });
  if (shared.list.some((a) => PATH_RE.exec(a.path)[1] !== 'campaigns')) {
    return res.status(400).json({ error: 'Shared attachments must be uploaded for this campaign.' });
  }

  // Clean every message; invalid ones are reported (and logged) as failed without sending
  const items = list.map((m) => {
    const to = String(m?.to ?? '').trim().toLowerCase();
    const subject = String(m?.subject ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const text = String(m?.body ?? '').replace(/\r\n/g, '\n').trim().slice(0, 20000);
    const id = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);
    const ids = { lead_id: id(m?.lead_id), customer_id: id(m?.customer_id), order_id: id(m?.order_id), template_id: id(m?.template_id) };
    const own = cleanAttachments(m?.attachments);
    let error = '';
    if (!EMAIL_RE.test(to)) error = 'Not a valid email address';
    else if (!subject) error = 'Subject is empty';
    else if (!text) error = 'Message is empty';
    else if (own.error) error = own.error;
    else if (own.list.some((a) => !belongsTo(a, ids))) error = 'An attachment doesn’t belong to this message';
    const attachments = [...shared.list, ...own.list.filter((a) => !shared.list.some((s) => s.path === a.path))];
    return { to, subject, text, error, attachments, ...ids };
  });

  // Fetch each file once from the private bucket
  const files = new Map();
  for (const a of new Set(items.filter((i) => !i.error).flatMap((i) => i.attachments.map((x) => x.path)))) {
    const { data, error } = await db.storage.from('attachments').download(a);
    files.set(a, error || !data ? null : Buffer.from(await data.arrayBuffer()));
  }
  for (const i of items) {
    if (i.error || !i.attachments.length) continue;
    const missing = i.attachments.find((a) => !files.get(a.path));
    if (missing) {
      i.error = `Attachment not found: ${missing.name}`;
      continue;
    }
    // Real sizes, not what the browser said
    for (const a of i.attachments) a.size = files.get(a.path).length;
    if (i.attachments.reduce((s, a) => s + a.size, 0) > MAX_ATTACH_TOTAL) i.error = 'Attachments are over 25 MB in total';
  }

  const from = process.env.MAIL_FROM || process.env.ALERT_FROM_EMAIL || 'Ecotwist <onboarding@resend.dev>';
  const replyTo = EMAIL_RE.test(profile.email ?? '') ? profile.email : undefined;
  const senderName = profile.full_name || '';
  const valid = items.filter((i) => !i.error);
  const payload = valid.map((i) => ({
    from,
    to: [i.to],
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: i.subject,
    html: toHtml(i.text, senderName),
    text: toText(i.text),
    ...(i.attachments.length
      ? { attachments: i.attachments.map((a) => ({ filename: a.name, content: files.get(a.path).toString('base64') })) }
      : {}),
  }));

  if (valid.some((i) => i.attachments.length)) {
    // One by one, gently (Resend allows a few requests per second)
    for (let n = 0; n < payload.length; n++) {
      if (n) await new Promise((ok) => setTimeout(ok, 550));
      const r = await resend(apiKey, 'https://api.resend.com/emails', payload[n]);
      if (!r.ok) valid[n].error = r.error;
    }
  } else if (payload.length === 1) {
    const r = await resend(apiKey, 'https://api.resend.com/emails', payload[0]);
    if (!r.ok) valid[0].error = r.error;
  } else if (payload.length > 1) {
    const r = await resend(apiKey, 'https://api.resend.com/emails/batch', payload);
    // The batch is accepted or rejected as a whole
    if (!r.ok) for (const i of valid) i.error = r.error;
  }

  const rows = items.map((i) => ({
    channel: 'email',
    status: i.error ? 'failed' : 'sent',
    to_address: i.to || '(missing)',
    subject: i.subject,
    body: i.text || '(empty)',
    error: i.error,
    template_id: i.template_id,
    lead_id: i.lead_id,
    customer_id: i.customer_id,
    order_id: i.order_id,
    campaign,
    sent_by: profile.id,
    attachments: i.attachments,
  }));
  let { error: logErr } = await db.from('messages').insert(rows);
  if (logErr && /attachments/i.test(logErr.message ?? '')) {
    // Database script from before attachments: log without them
    ({ error: logErr } = await db.from('messages').insert(rows.map(({ attachments, ...r }) => r)));
  }
  if (logErr) console.error('[send-email] could not log messages', logErr);

  return res.status(200).json({
    results: items.map((i) => (i.error ? { to: i.to, ok: false, error: i.error } : { to: i.to, ok: true })),
    logged: !logErr,
    ...(logErr ? { logError: missingTable(logErr) ? 'The messages table is missing: run supabase/04-blog-and-messages.sql in Supabase.' : logErr.message } : {}),
  });
}

async function resend(apiKey, url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) return { ok: true };
    const raw = await response.text();
    let message = raw;
    try {
      message = JSON.parse(raw).message || raw;
    } catch { /* not JSON */ }
    console.error('[send-email] Resend', response.status, raw);
    return { ok: false, error: friendlyResendError(response.status, message) };
  } catch (e) {
    return { ok: false, error: `Could not reach the email service: ${e.message}` };
  }
}

function friendlyResendError(status, message) {
  const m = String(message || '').slice(0, 300);
  if (status === 401 || status === 403) {
    if (/domain/i.test(m) || /testing emails/i.test(m)) return `Email domain not verified in Resend (${m})`;
    return `Resend rejected the API key or sender (${m})`;
  }
  if (status === 429) return 'Too many emails at once (Resend rate limit). Wait a minute and try again.';
  return m || `Email service error (${status})`;
}

function cleanAttachments(value) {
  if (value == null) return { list: [] };
  if (!Array.isArray(value) || value.length > 10) return { list: [], error: 'Attach at most 10 files.' };
  const list = [];
  for (const a of value) {
    const path = String(a?.path ?? '');
    const m = PATH_RE.exec(path);
    if (!m || path.includes('..')) return { list: [], error: 'Invalid attachment.' };
    const type = String(a?.type ?? '');
    if (!ATTACH_TYPES.includes(type)) return { list: [], error: 'Only PDF, JPG, PNG or WebP attachments.' };
    const name = String(a?.name ?? '').replace(/[\r\n"\\/]/g, '').trim().slice(0, 150) || path.split('/').pop();
    if (!list.some((x) => x.path === path)) list.push({ path, name, type, size: Number(a?.size) || 0 });
  }
  return { list };
}

// proposals/<id>/… must be in the folder of one of this message's lead / customer / order ids.
// (Sends without any record use a random folder: allowed only for files uploaded in the last 7 days.)
function belongsTo(a, ids) {
  const [, kind, folder, stamp] = PATH_RE.exec(a.path);
  if (kind !== 'proposals') return false;
  if ([ids.lead_id, ids.customer_id, ids.order_id].includes(folder)) return true;
  return !ids.lead_id && !ids.customer_id && !ids.order_id && Date.now() - Number(stamp) < FRESH_MS;
}

const missingTable = (e) => e?.code === '42P01' || e?.code === 'PGRST205' || /does not exist|could not find the table/i.test(e?.message ?? '');

/* ── Plain text → email ───────────────────────────────────────── */

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Escaped text with web addresses turned into links
const linkify = (s) =>
  escapeHtml(s).replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g, (url) => `<a href="${url}" style="color:#4A5D23">${url}</a>`);

function toHtml(text, senderName) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px">${p.split('\n').map(linkify).join('<br>')}</p>`)
    .join('');
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F3EE">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #E6E2D8;border-radius:12px">
        <tr><td style="padding:28px 32px 8px;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.18em;color:#1F2219">ECOTWIST</td></tr>
        <tr><td style="padding:12px 32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1F2219">${paragraphs}</td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #EEEBE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#7A7B70">
          Ecotwist · Sustainable corporate gifting<br>
          <a href="${SITE_URL}" style="color:#4A5D23">ecotwist.in</a>${senderName ? ` · Reply to this email to reach ${escapeHtml(senderName)}` : ' · Reply to this email to reach us'}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const toText = (text) => `${text}\n\n--\nEcotwist · Sustainable corporate gifting\n${SITE_URL}`;
