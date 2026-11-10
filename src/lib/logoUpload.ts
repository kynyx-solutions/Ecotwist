import { supabasePublic } from './supabasePublic';

/* ============================
   Customer logo upload for store orders.
   The server hands out a one-time signed link; the file goes straight to the
   private "order-logos" bucket, which only Ecotwist staff can open.
============================ */

export const LOGO_ACCEPT = '.png,.jpg,.jpeg,.svg,.webp,.pdf,.ai,.eps';
export const LOGO_MAX_MB = 10;

export async function uploadLogo(file: File): Promise<string> {
  if (file.size > LOGO_MAX_MB * 1024 * 1024) throw new Error(`The logo is larger than ${LOGO_MAX_MB} MB. Please upload a smaller file.`);
  const res = await fetch('/api/store/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, size: file.size }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'Uploads are not available right now. You can email your logo to info@ecotwist.in instead.');
  const { error } = await supabasePublic.storage
    .from('order-logos')
    .uploadToSignedUrl(json.path, json.token, file, { contentType: json.contentType });
  if (error) throw new Error('The upload did not finish. Please try again.');
  return json.path as string;
}
