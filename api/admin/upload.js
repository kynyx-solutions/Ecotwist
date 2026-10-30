// Photo upload for the Website editor.
//   POST /api/admin/upload { folder, filename, dataBase64 } → { url: "/site/uploads/<folder>/<name>" }
import crypto from 'crypto';
import { readJson, requireStaff } from '../_lib/admin.js';
import { StorageError, assertStorage, exists, savedMessage, writeFile } from '../_lib/storage.js';

const TYPES = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg'];
const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request limit is 4.5 MB including base64 overhead

const slug = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export default async function handler(req, res) {
  const ctx = await requireStaff(req, res);
  if (!ctx) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    assertStorage();
    const { folder, filename, dataBase64 } = readJson(req);

    const name = String(filename ?? '');
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
    if (!TYPES.includes(ext)) return res.status(400).json({ error: 'Use a PNG, JPG, WebP, AVIF or SVG image.' });

    const data = Buffer.from(String(dataBase64 ?? '').replace(/^data:[^,]*,/, ''), 'base64');
    if (!data.length) return res.status(400).json({ error: 'The file is empty.' });
    if (data.length > MAX_BYTES) return res.status(413).json({ error: 'This photo is too large (max 4 MB). Try a smaller one.' });
    if (ext === 'svg' && /<script|\son\w+\s*=|javascript:/i.test(data.toString('utf8'))) {
      return res.status(400).json({ error: 'This SVG contains scripts and cannot be used.' });
    }

    const dir = `public/site/uploads/${slug(folder) || 'misc'}`;
    const base = slug(name.slice(0, dot)) || 'photo';
    let file = `${base}.${ext}`;
    if (await exists(`${dir}/${file}`)) file = `${base}-${crypto.randomBytes(3).toString('hex')}.${ext}`;

    const who = ctx.profile.email || ctx.user.email || 'staff';
    await writeFile(`${dir}/${file}`, data, { sha: null, message: `Upload ${file} from the admin (by ${who})` });
    return res.status(200).json({ url: `${dir.replace(/^public/, '')}/${file}`, message: savedMessage() });
  } catch (err) {
    if (err instanceof StorageError) return res.status(err.status).json({ error: err.message });
    console.error('[admin/upload]', err);
    return res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
}
