import type { PhotoSettings } from './photoSettings';

export const MAX_UPLOAD = 3.2 * 1024 * 1024; // keeps the base64 request under Vercel's 4.5 MB limit

// Prepares a photo as set in Settings → Photo uploads: scaled down to the max width
// and converted to WebP, or kept in its own format when conversion is off.
export async function resize(file: File, settings: PhotoSettings): Promise<{ blob: Blob; ext: string }> {
  if (file.type === 'image/svg+xml') return { blob: file, ext: 'svg' };
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, settings.maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, settings.quality / 100));
  if (settings.webp) {
    const webp = await encode('image/webp');
    if (webp?.type === 'image/webp') return { blob: webp, ext: 'webp' };
  } else if (scale === 1 && file.size <= MAX_UPLOAD) {
    // Conversion off and already small enough: upload the file exactly as it is
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    return { blob: file, ext };
  }
  // Browsers without a WebP encoder (older Safari): keep PNG for transparency, else JPEG
  const keepPng = file.type === 'image/png';
  const fallback = await encode(keepPng ? 'image/png' : 'image/jpeg');
  if (!fallback) throw new Error("This photo couldn't be read. Try another file.");
  return { blob: fallback, ext: keepPng ? 'png' : 'jpg' };
}

export const toBase64 = (blob: Blob) =>
  new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => fail(r.error);
    r.readAsDataURL(blob);
  });
