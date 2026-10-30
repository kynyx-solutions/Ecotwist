// Key-name conventions that decide how a content value is edited.

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
export type Path = (string | number)[];

export const HIDDEN_KEYS = new Set(['_meta', 'id', 'photoId', 'path', 'href', 'icon', 'key']);

export const isImageKey = (key: string) => /(image|img|photo|logo|src)$/i.test(key);
export const isImageListKey = (key: string) => /(images|imgs|photos|logos|srcs)$/i.test(key);
export const isColorKey = (key: string) => /(accent|color|colour|tint)$/i.test(key);
export const isLongText = (value: string) => value.length > 90 || value.includes('\n');

export const isObject = (v: unknown): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v);

// "titleHighlight" → "Title highlight", "titleLine1" → "Title line 1"
export function humanize(key: string | number) {
  const s = String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// A new array item: same keys as the example, empty values
export function blankLike(value: Json): Json {
  if (typeof value === 'string') return '';
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return false;
  if (Array.isArray(value)) return [];
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blankLike(v)]));
  return null;
}

// A short name for an array item, e.g. its title
export function itemTitle(item: Json): string {
  if (typeof item === 'string') return item;
  if (!isObject(item)) return '';
  for (const k of ['title', 'name', 'label', 'heading', 'question', 'place', 'quote', 'text']) {
    const v = item[k];
    if (typeof v === 'string' && v.trim()) return v.length > 70 ? `${v.slice(0, 70)}…` : v;
  }
  return '';
}

// First image path in an item, for a thumbnail
export function itemImage(item: Json): string {
  if (!isObject(item)) return '';
  for (const [k, v] of Object.entries(item)) if (isImageKey(k) && typeof v === 'string' && v) return v;
  return '';
}

// Site paths contain spaces; full URLs and blob: previews pass through
export const previewUrl = (src: string) => (/^(https?:|blob:|data:)/.test(src) ? src : encodeURI(src));

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Where uploads for a content file go: pages/home.json → "home"
export const uploadFolder = (filePath: string) => filePath.replace(/^.*\//, '').replace(/\.json$/, '');
