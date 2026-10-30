// Website content editor: list, read and save the JSON files in src/content.
//   GET  /api/admin/content            → [{ path, label, group, route? }]
//   GET  /api/admin/content?path=...   → { path, content, sha }
//   PUT  /api/admin/content            { path, content, sha, message? } → { sha, message }
import { readJson, requireStaff } from '../_lib/admin.js';
import { StorageError, assertStorage, cleanPath, listDir, readFile, savedMessage, writeFile } from '../_lib/storage.js';

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

    if (req.method === 'GET') {
      if (!req.query?.path) return res.status(200).json(await listFiles());
      const p = checkPath(req.query.path);
      const file = await readFile(p);
      if (!file) return res.status(404).json({ error: 'This file no longer exists.' });
      return res.status(200).json({ path: p, content: parse(file, p), sha: file.sha });
    }

    if (req.method === 'PUT') {
      const { path: rawPath, content, sha, message } = readJson(req);
      const p = checkPath(rawPath);
      if (!content || typeof content !== 'object') return res.status(400).json({ error: 'Nothing to save.' });
      if (!sha) return res.status(400).json({ error: 'Missing version (sha). Reload the page and try again.' });

      const current = await readFile(p);
      if (!current) return res.status(404).json({ error: 'This file no longer exists.' });
      if (current.sha !== sha) throw new StorageError(409, 'Someone else saved this page; reload to see their changes.');

      const label = content._meta?.label ?? SPECIAL.find((s) => s.path === p)?.label ?? p;
      const who = ctx.profile.email || ctx.user.email || 'staff';
      const commit = String(message || '').trim() || `Update ${label} from the admin (by ${who})`;
      const newSha = await writeFile(p, Buffer.from(JSON.stringify(content, null, 2) + '\n'), { sha, message: commit });
      return res.status(200).json({ sha: newSha, message: savedMessage() });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof StorageError) return res.status(err.status).json({ error: err.message });
    console.error('[admin/content]', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
