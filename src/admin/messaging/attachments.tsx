import { useEffect, useRef, useState, type DragEvent } from 'react';
import { FileText, Image as ImageIcon, Paperclip, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatBytes, getPhotoSettings } from '../lib/photoSettings';
import { resize } from '../lib/image';
import { useToast } from '../ui';
import { ATTACHMENT_BUCKET as BUCKET, signedUrl } from './data';
import type { Attachment } from './types';

export const MAX_FILE = 10 * 1024 * 1024; // bucket limit
export const MAX_TOTAL = 25 * 1024 * 1024; // per message
const TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';

const typeOf = (f: File) => {
  if (TYPES.includes(f.type)) return f.type;
  const ext = f.name.split('.').pop()?.toLowerCase();
  return ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : '';
};

const safeName = (name: string) =>
  name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80) || 'file';

// Folder for a send: "proposals/<order|lead|customer id>" or "campaigns/<id>"
export const attachmentFolder = (kind: 'proposals' | 'campaigns', id: string | null | undefined) =>
  `${kind}/${(id || crypto.randomUUID()).replace(/[^a-zA-Z0-9-]/g, '')}`;

// Upload with progress (supabase-js doesn't report progress, so this talks to the Storage REST API)
async function uploadWithProgress(path: string, blob: Blob, type: string, onProgress: (pct: number) => void) {
  const { data } = await supabase.auth.getSession();
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`);
    xhr.setRequestHeader('Authorization', `Bearer ${data.session?.access_token ?? key}`);
    xhr.setRequestHeader('apikey', key);
    xhr.setRequestHeader('Content-Type', type);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = xhr.responseText;
      try {
        const j = JSON.parse(xhr.responseText);
        msg = j.message || j.error || msg;
      } catch { /* not JSON */ }
      if (/bucket not found/i.test(msg)) msg = 'The attachments storage isn’t set up yet. Run supabase/04-blog-and-messages.sql in Supabase.';
      else if (/row-level security|unauthorized/i.test(msg)) msg = 'You don’t have permission to upload attachments.';
      else if (/maximum allowed size|too large|payload/i.test(msg)) msg = 'File is larger than 10 MB.';
      reject(new Error(msg || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed: check your connection.'));
    xhr.send(blob);
  });
}

export const removeAttachments = (list: Attachment[]) =>
  list.length ? supabase.storage.from(BUCKET).remove(list.map((a) => a.path)).then(() => undefined) : Promise.resolve();

/* ── Picker ───────────────────────────────────────────────────── */

type Item = { key: string; name: string; size: number; type: string; progress: number; error?: string; attachment?: Attachment };

// Drag & drop / file picker. Files upload straight away into `folder`; onChange gets the uploaded ones,
// onBusy tells the parent whether something is still uploading.
export function AttachmentPicker({ folder, onChange, onBusy, disabled, note }: {
  folder: string;
  onChange: (list: Attachment[]) => void;
  onBusy?: (busy: boolean) => void;
  disabled?: boolean;
  note?: string;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);

  const patch = (key: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  useEffect(() => {
    onChange(items.flatMap((i) => (i.attachment ? [i.attachment] : [])));
    onBusy?.(items.some((i) => !i.attachment && !i.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const add = async (files: File[]) => {
    let total = items.reduce((s, i) => s + (i.error ? 0 : i.size), 0);
    for (const file of files) {
      const type = typeOf(file);
      if (!type) {
        toast(`${file.name}: only PDF, JPG, PNG or WebP files`, true);
        continue;
      }
      const key = `${Date.now()}-${Math.random()}`;
      setItems((l) => [...l, { key, name: file.name, size: file.size, type, progress: 0 }]);
      try {
        let blob: Blob = file;
        let outType = type;
        let name = file.name;
        if (type.startsWith('image/')) {
          // Same settings as website photos; keep the original if that's smaller
          const { blob: small, ext } = await resize(file, await getPhotoSettings());
          if (small.size < file.size) {
            blob = small;
            outType = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
            name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
          }
        }
        if (blob.size > MAX_FILE) throw new Error('larger than 10 MB');
        if (total + blob.size > MAX_TOTAL) throw new Error('attachments would exceed 25 MB in total');
        total += blob.size;
        patch(key, { name, size: blob.size, type: outType });
        const path = `${folder}/${Date.now()}-${safeName(name)}`;
        await uploadWithProgress(path, blob, outType, (progress) => patch(key, { progress }));
        patch(key, { progress: 100, attachment: { path, name, type: outType, size: blob.size } });
      } catch (e) {
        patch(key, { error: (e as Error).message });
      }
    }
  };

  const remove = (item: Item) => {
    setItems((l) => l.filter((i) => i.key !== item.key));
    if (item.attachment) removeAttachments([item.attachment]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) add([...e.dataTransfer.files]);
  };

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">Attachments</span>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border border-dashed px-4 py-3 text-sm transition ${over ? 'border-brand-gold bg-brand-beige' : 'border-gray-300 bg-brand-off-white'}`}
      >
        <div className="flex flex-wrap items-center gap-2 text-gray-600">
          <button type="button" disabled={disabled} onClick={() => input.current?.click()}
            className="inline-flex items-center gap-1.5 font-semibold text-brand-olive hover:underline disabled:opacity-50">
            <Upload size={15} /> Attach files
          </button>
          <span className="text-xs text-gray-500">or drop them here · PDF, JPG, PNG, WebP · up to 10 MB each, 25 MB total</span>
        </div>
        <input ref={input} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = ''; }} />
        {items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {items.map((i) => (
              <li key={i.key} className="rounded-md bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  {i.type === 'application/pdf' ? <FileText size={16} className="shrink-0 text-red-700" /> : <ImageIcon size={16} className="shrink-0 text-brand-olive" />}
                  <span className="min-w-0 flex-1 truncate">{i.name}</span>
                  <span className="shrink-0 text-xs text-gray-500">{formatBytes(i.size)}</span>
                  <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-600" aria-label={`Remove ${i.name}`}><X size={16} /></button>
                </div>
                {i.error ? (
                  <p className="mt-1 text-xs text-red-700">{i.error}</p>
                ) : !i.attachment && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded bg-admin-muted">
                    <div className="h-full bg-brand-olive transition-all" style={{ width: `${i.progress}%` }} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

/* ── Display in history / log ─────────────────────────────────── */

export function AttachmentLinks({ list }: { list: Attachment[] | null | undefined }) {
  const toast = useToast();
  if (!list?.length) return null;
  const open = async (a: Attachment) => {
    const tab = window.open('', '_blank'); // open now so the browser doesn't block it
    try {
      const url = await signedUrl(a.path, 1 / 24);
      if (tab) tab.location.href = url;
      else window.open(url, '_blank');
    } catch (e) {
      tab?.close();
      toast((e as Error).message, true);
    }
  };
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {list.map((a) => (
        <button key={a.path} type="button" onClick={(e) => { e.stopPropagation(); open(a); }}
          className="inline-flex max-w-full items-center gap-1 text-xs text-brand-olive hover:underline" title={`${a.name} · ${formatBytes(a.size)}`}>
          <Paperclip size={12} className="shrink-0" /> <span className="truncate">{a.name}</span>
        </button>
      ))}
    </span>
  );
}
