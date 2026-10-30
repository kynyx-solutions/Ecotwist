import { supabase } from './supabase';

// How photos uploaded from the admin are prepared (Settings → Photo uploads)
export interface PhotoSettings {
  webp: boolean;    // convert to WebP before uploading
  quality: number;  // 60–100
  maxWidth: number; // px; wider photos are scaled down, never up
}

export const DEFAULT_PHOTO_SETTINGS: PhotoSettings = { webp: true, quality: 85, maxWidth: 2000 };

let cached: Promise<PhotoSettings> | null = null;

export function getPhotoSettings(): Promise<PhotoSettings> {
  cached ??= Promise.resolve(
    supabase.from('settings').select('value').eq('key', 'photo_uploads').maybeSingle(),
  ).then(({ data }) => ({ ...DEFAULT_PHOTO_SETTINGS, ...(data?.value as Partial<PhotoSettings> | undefined) }));
  return cached;
}

export async function savePhotoSettings(value: PhotoSettings) {
  const { error } = await supabase.from('settings').upsert({ key: 'photo_uploads', value, updated_at: new Date().toISOString() });
  if (error) throw error;
  cached = Promise.resolve(value);
}

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
