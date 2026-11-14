// Website content editor: list, read and save the JSON files in src/content.
// Saving keeps a draft (public.content_drafts); nothing goes live until
// someone presses "Publish changes" (api/admin/publish.js).
//   GET    /api/admin/content            → [{ path, label, group, route?, draft? }]
//   GET    /api/admin/content?path=...   → { path, content, sha, draft }   (the draft when there is one)
//   PUT    /api/admin/content            { path, content, sha } → { sha, message }
//   DELETE /api/admin/content?path=...   → throw the draft away (back to the live version)
import { readJson, requireStaff } from '../_lib/admin.js';
import { StorageError, assertStorage, cleanPath, listDir, readFile } from '../_lib/storage.js';
import { deleteDraft, draftVersion, getDraft, listDrafts, saveDraft } from '../_lib/drafts.js';

const OTHER_LABELS = { 'src/content/store.json': 'Store products & prices' };
const CONFLICT = 'Someone else saved this page; reload to see their changes.';
const NOT_LIVE = 'Not live yet: press "Publish changes" when you are done.';

const PAGES_DIR = 'src/content/pages';

const SPECIAL = [
  { path: 'src/content/products.json', label: 'Product catalogue', group: 'Catalogue', route: '/products' },
  { path: 'src/content/site-images.json', label: 'Photos to add', group: 'Photos to add' },
  { path: 'src/content/clients.json', label: 'Client logos', group: 'Clients' },
  { path: 'src/content/testimonials.json', label: 'Testimonials', group: 'Testimonials' },
  { path: 'src/content/seo.json', label: 'SEO: titles & descriptions', group: 'SEO' },
];

function checkPath(p) {
  p = cleanPath(p);
  if (!/^src\/content\/[a-z0-9_\-/]+\.json$/i.test(p)) throw new StorageError(400, 'Only files in src/content can be edited here.');
  return p;
}

const parse = (file, p) => {
  try {
    return JSON.parse(file.buffer.toString('utf8'));
  } catch {
    throw new StorageError(500, `${p} is not valid JSON. Ask the developer to fix it.`);
  }
};

async function listFiles() {
  const names = (await listDir(PAGES_DIR)).filter((n) => n.endsWith('.json'));
  const pages = await Promise.all(
    names.map(async (name) => {
      const p = `${PAGES_DIR}/${name}`;
      const file = await readFile(p);
      const meta = file ? (parse(file, p)._meta ?? {}) : {};
      return { path: p, label: meta.label || name.replace(/\.json$/, ''), group: 'Pages', ...(meta.route ? { route: meta.route } : {}) };
    }),
  );
  pages.sort((a, b) => a.label.localeCompare(b.label));
  return [...pages, ...SPECIAL];
}

export default async function handler(req, res) {
  const ctx = await requireStaff(req, res);
  if (!ctx) return;

  try {
    assertStorage();

    const { db } = ctx;

    if (req.method === 'GET') {
      if (!req.query?.path) {
        const [files, drafts] = await Promise.all([listFiles(), listDrafts(db)]);
        const pending = new Set(drafts.map((d) => d.path));
        return res.status(200).json(files.map((f) => (pending.has(f.path) ? { ...f, draft: true } : f)));
      }
      const p = checkPath(req.query.path);
      const draft = await getDraft(db, p);
      if (draft) return res.status(200).json({ path: p, content: draft.content, sha: draftVersion(draft), draft: true });
      const file = await readFile(p);
      if (!file) return res.status(404).json({ error: 'This file no longer exists.' });
      return res.status(200).json({ path: p, content: parse(file, p), sha: file.sha, draft: false });
    }

    if (req.method === 'DELETE') {
      await deleteDraft(db, checkPath(req.query?.path));
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const { path: rawPath, content, sha } = readJson(req);
      const p = checkPath(rawPath);
      if (!content || typeof content !== 'object') return res.status(400).json({ error: 'Nothing to save.' });
      if (!sha) return res.status(400).json({ error: 'Missing version (sha). Reload the page and try again.' });

      const [draft, live] = await Promise.all([getDraft(db, p), readFile(p)]);
      if (!live) return res.status(404).json({ error: 'This file no longer exists.' });
      if (sha !== (draft ? draftVersion(draft) : live.sha)) throw new StorageError(409, CONFLICT);

      // Saved back to exactly what's live: no draft needed
      if (JSON.stringify(content) === JSON.stringify(parse(live, p))) {
        if (draft) await deleteDraft(db, p);
        return res.status(200).json({ sha: live.sha, message: 'This matches the live site, so there is nothing to publish.' });
      }

      const label = content._meta?.label ?? SPECIAL.find((s) => s.path === p)?.label ?? OTHER_LABELS[p] ?? p;
      const who = ctx.profile.email || ctx.user.email || 'staff';
      const saved = await saveDraft(db, { path: p, kind: 'json', label, content, base_sha: draft?.base_sha ?? live.sha, updated_by: who });
      return res.status(200).json({ sha: draftVersion(saved), message: NOT_LIVE });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof StorageError) return res.status(err.status).json({ error: err.message });
    console.error('[admin/content]', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
