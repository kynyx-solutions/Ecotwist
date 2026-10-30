import { supabase } from '../lib/supabase';
import { getPhotoSettings, formatBytes } from '../lib/photoSettings';
import { resize } from '../lib/image';
import { Card } from '../ui';
import { formatDay, postState, slugify, type Post } from '../../lib/blog';

const PILL: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  scheduled: 'bg-[#F3E6C4] text-[#6B5114]',
  published: 'bg-[#D9E7D4] text-[#24502A]',
};

export function StatePill({ post }: { post: Pick<Post, 'status' | 'published_at'> }) {
  const state = postState(post);
  const label =
    state === 'draft' ? 'Draft'
    : state === 'scheduled' ? `Scheduled for ${new Date(post.published_at!).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    : `Published ${post.published_at ? formatDay(post.published_at) : ''}`.trim();
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILL[state]}`}>{label}</span>;
}

export function BlogSetupNotice() {
  return (
    <Card className="p-6">
      <h2 className="mb-2 font-serif text-2xl font-medium">The blog isn't set up yet</h2>
      <p className="text-sm text-gray-600">
        The <code className="rounded bg-admin-muted px-1">posts</code> table wasn't found. Open Supabase → SQL Editor and run{' '}
        <code className="rounded bg-admin-muted px-1">supabase/04-blog-and-messages.sql</code>, then reload this page.
      </p>
    </Card>
  );
}

const CONTENT_TYPE: Record<string, string> = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', avif: 'image/avif', gif: 'image/gif' };

// Resizes (WebP per Settings → Photo uploads) and uploads to the public "blog" bucket.
// Returns the public URL and a short note for the toast.
export async function uploadBlogImage(file: File): Promise<{ url: string; note: string }> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') throw new Error('Choose a JPG, PNG, WebP or AVIF photo.');
  const settings = await getPhotoSettings();
  const { blob, ext } = await resize(file, settings);
  const now = new Date();
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'photo';
  const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${base}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('blog').upload(path, blob, {
    contentType: blob.type || CONTENT_TYPE[ext] || 'application/octet-stream',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error('The "blog" photo bucket is missing. Run supabase/04-blog-and-messages.sql in Supabase.');
    throw new Error(`Upload failed: ${error.message}`);
  }
  const url = supabase.storage.from('blog').getPublicUrl(path).data.publicUrl;
  const note = ext === 'webp' && !/\.webp$/i.test(file.name) ? `converted to WebP, ${formatBytes(file.size)} → ${formatBytes(blob.size)}` : formatBytes(blob.size);
  return { url, note };
}
