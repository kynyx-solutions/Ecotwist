import DOMPurify from 'dompurify';

/* ============================
   Blog helpers shared by the website (/blog) and the admin editor.
   Table: public.posts (supabase/04-blog-and-messages.sql). Body is HTML from the
   admin's rich-text editor (TipTap); always sanitise it before showing it.
============================ */

export interface Post {
  id: string;
  created_at: string;
  updated_at: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string; // HTML
  cover_image: string;
  cover_alt: string;
  tags: string[];
  status: 'draft' | 'published';
  published_at: string | null; // a future date = scheduled
  seo_title: string;
  seo_description: string;
  author_id: string | null;
  author_name: string;
  focus_keyword: string;
  seo_score: number;
  og_image: string;  // social share image; cover when empty
  noindex: boolean;
}

// Columns for lists and cards (everything but the body)
export const POST_CARD_COLUMNS = 'id, slug, title, excerpt, cover_image, cover_alt, tags, status, published_at, author_name, updated_at, created_at';

export type PostCard = Pick<Post, 'id' | 'slug' | 'title' | 'excerpt' | 'cover_image' | 'cover_alt' | 'tags' | 'status' | 'published_at' | 'author_name' | 'updated_at' | 'created_at'>;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// "Hello, World — 2026!" → "hello-world-2026"
export const slugify = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

export type PostState = 'draft' | 'scheduled' | 'published';

export const postState = (p: Pick<Post, 'status' | 'published_at'>, now = Date.now()): PostState =>
  p.status !== 'published' ? 'draft' : p.published_at && new Date(p.published_at).getTime() > now ? 'scheduled' : 'published';

export const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

// Plain text of an article body (HTML), for word counts and fallbacks
export const htmlToText = (html: string) =>
  (html ?? '')
    .replace(/<\/(p|h[1-6]|li|blockquote|td|th)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

export const wordCount = (html: string) => htmlToText(html).split(' ').filter(Boolean).length;

export const readingMinutes = (html: string) => Math.max(1, Math.round(wordCount(html) / 200));

// The posts table hasn't been created yet (script not run in Supabase)
export const isMissingTable = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === 'PGRST205' || error.code === '42P01' || /relation .*posts.* does not exist|could not find the table/i.test(error.message ?? ''));

// CSS the editor produces (colour, highlight, font size, alignment, table column widths)
const ALLOWED_STYLES = new Set(['color', 'background-color', 'font-size', 'font-family', 'text-align', 'min-width', 'width']);

const cleanStyle = (style: string) =>
  style
    .split(';')
    .map((d) => d.trim())
    .filter((d) => {
      const [prop, ...rest] = d.split(':');
      const value = rest.join(':').toLowerCase();
      return prop && ALLOWED_STYLES.has(prop.trim().toLowerCase()) && !/url\(|expression|javascript:|[<>]/.test(value);
    })
    .join('; ');

let hooked = false;
function addHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element;
    if (!el.getAttribute) return;
    const style = el.getAttribute('style');
    if (style !== null) {
      const clean = cleanStyle(style);
      if (clean) el.setAttribute('style', clean);
      else el.removeAttribute('style');
    }
    if (el.tagName === 'A') {
      const rel = new Set((el.getAttribute('rel') ?? '').split(/\s+/).filter((r) => ['nofollow', 'noopener', 'noreferrer', 'sponsored', 'ugc'].includes(r)));
      const target = el.getAttribute('target');
      if (target && target !== '_blank') el.removeAttribute('target');
      if (target === '_blank') {
        rel.add('noopener');
        rel.add('noreferrer');
      }
      if (rel.size) el.setAttribute('rel', [...rel].join(' '));
      else el.removeAttribute('rel');
    }
    if (el.tagName === 'IMG') {
      el.setAttribute('loading', 'lazy');
      el.setAttribute('decoding', 'async');
    }
  });
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Article HTML → sanitised HTML (safe for dangerouslySetInnerHTML).
// Allows what the editor produces: headings, lists, quotes, links (target/rel),
// images (alt), tables, <mark>, <u>, <s>, inline colour/size/alignment styles.
export function sanitizeArticleHtml(html: string): string {
  addHooks();
  let src = html ?? '';
  // Plain text (no tags at all): turn blank-line-separated blocks into paragraphs
  if (src.trim() && !/<[a-z][\s\S]*>/i.test(src)) {
    src = src.split(/\n{2,}/).map((b) => `<p>${escapeHtml(b.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  }
  return DOMPurify.sanitize(src, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel', 'colspan', 'rowspan', 'colwidth', 'data-color', 'style'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'button', 'textarea', 'select', 'object', 'embed'],
  });
}
