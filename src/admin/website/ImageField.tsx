import { useRef, useState } from 'react';
import { ImageOff, Link2, Trash2, Upload } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Input, useToast } from '../ui';
import { draftPhotoUrl, previewUrl } from './schema';
import { formatBytes, getPhotoSettings } from '../lib/photoSettings';
import { MAX_UPLOAD, resize, toBase64 } from '../lib/image';

// A new upload isn't on the site until it's published, so show the local copy
// for the rest of the session, and the drafts-bucket copy after that.
const localPreviews = new Map<string, string>();

export function ImageField({ label, value, onChange, folder }: { label: string; value: string; onChange: (v: string) => void; folder: string }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [broken, setBroken] = useState<string[]>([]);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const settings = await getPhotoSettings();
      const { blob, ext } = await resize(file, settings);
      if (blob.size > MAX_UPLOAD) {
        throw new Error(settings.webp
          ? 'This photo is still too large after resizing. Try a smaller one.'
          : 'This photo is too large. Turn on WebP conversion in Settings, or use a smaller file.');
      }
      const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
      const res = await api<{ url: string; message: string }>('/api/admin/upload', {
        body: { folder, filename: name, dataBase64: await toBase64(blob) },
      });
      localPreviews.set(res.url, URL.createObjectURL(blob));
      onChange(res.url);
      const note = ext === 'webp' && !/\.webp$/i.test(file.name) ? `converted to WebP, ${formatBytes(file.size)} → ${formatBytes(blob.size)}` : formatBytes(blob.size);
      toast(`Photo uploaded (${note}). Save the page, then press “Publish changes” to put it live.`);
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const direct = value ? localPreviews.get(value) ?? previewUrl(value) : '';
  const draft = value.startsWith('/site/uploads/') ? draftPhotoUrl(value) : '';
  const src = [direct, draft].find((u) => u && !broken.includes(u)) ?? '';

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">{label}</span>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-contain" onError={() => setBroken((b) => [...b, src])} />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs text-gray-400">
              <ImageOff size={20} /> {value ? 'Not found yet' : 'No photo'}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
              <Upload size={15} /> {busy ? 'Uploading…' : 'Upload photo'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setLinking((l) => !l)}>
              <Link2 size={15} /> Use a link
            </Button>
            {value && (
              <Button type="button" variant="ghost" onClick={() => onChange('')}>
                <Trash2 size={15} /> Remove
              </Button>
            )}
          </div>
          {(linking || (value && !value.startsWith('/site/uploads/'))) && (
            <Input value={value} placeholder="https://… or /site/…" onChange={(e) => onChange(e.target.value.trim())} aria-label={`${label} link`} />
          )}
          {value && !linking && value.startsWith('/site/uploads/') && <p className="truncate text-xs text-gray-500">{value}</p>}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
    </div>
  );
}
