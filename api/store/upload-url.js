// One-time upload link for a customer's logo (the browser uploads straight to Supabase Storage).
//   POST /api/store/upload-url { filename, size } → { path, token }
// Files land in the private "order-logos" bucket under pending/; only staff can open them.
import crypto from 'crypto';
import { serviceClient } from '../_lib/admin.js';
import { LOGO_MAX_BYTES, LOGO_TYPES, clientIp, rateLimiter } from '../_lib/store.js';

const limited = rateLimiter(20, 10 * 60 * 1000); // 20 uploads per IP per 10 minutes

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (limited(clientIp(req))) return res.status(429).json({ error: 'Too many uploads. Please try again in a few minutes.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  const name = String(body.filename ?? '');
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (!LOGO_TYPES[ext]) return res.status(400).json({ error: 'Please upload a PNG, JPG, SVG, WebP, PDF, AI or EPS file.' });
  const size = Number(body.size);
  if (!Number.isFinite(size) || size <= 0) return res.status(400).json({ error: 'The file is empty.' });
  if (size > LOGO_MAX_BYTES) return res.status(413).json({ error: 'The logo is larger than 10 MB. Please upload a smaller file.' });

  try {
    const db = serviceClient();
    const path = `pending/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await db.storage.from('order-logos').createSignedUploadUrl(path);
    if (error) throw error;
    return res.status(200).json({ path, token: data.token, contentType: LOGO_TYPES[ext] });
  } catch (err) {
    console.error('[store/upload-url]', err);
    return res.status(500).json({ error: 'Uploads are not available right now. You can email your logo to info@ecotwist.in instead.' });
  }
}
