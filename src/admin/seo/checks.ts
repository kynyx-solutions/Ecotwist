// Pure SEO helpers for the admin SEO screens (no React, no network) so they're easy to test.
import { fullTitle, normalizeRoute, type SeoFile, type SeoPage, type SeoSite } from '../../lib/seo';

export { fullTitle, normalizeRoute };
export type { SeoFile, SeoPage, SeoSite };

export const SEO_PATH = 'src/content/seo.json';

// The seo.json entry for a route, or an empty one when it has none yet
export const findPageOrBlank = (seo: SeoFile, route: string): SeoPage =>
  seo.pages.find((p) => normalizeRoute(p.route) === normalizeRoute(route)) ?? { route, title: '', description: '', image: '', noindex: false, focusKeyword: '' };

/* ── Length rules ─────────────────────────────────────────────── */

export const TITLE_LIMITS = { min: 30, max: 60 };
export const DESC_LIMITS = { min: 120, max: 160 };

export type Tone = 'good' | 'ok' | 'bad';

// green inside the range, amber a little outside, red when empty or far off
export function lengthTone(len: number, { min, max }: { min: number; max: number }): Tone {
  if (len >= min && len <= max) return 'good';
  if (len === 0) return 'bad';
  if (len >= min * 0.6 && len <= max * 1.15) return 'ok';
  return 'bad';
}

export function lengthProblem(len: number, { min, max }: { min: number; max: number }, what: string): string | null {
  if (len === 0) return `No ${what}`;
  if (len < min) return `${what[0].toUpperCase()}${what.slice(1)} too short (${len} chars, aim for ${min}–${max})`;
  if (len > max) return `${what[0].toUpperCase()}${what.slice(1)} too long (${len} chars, Google cuts it off after about ${max})`;
  return null;
}

export const TONE_TEXT: Record<Tone, string> = { good: 'text-emerald-700', ok: 'text-amber-600', bad: 'text-red-600' };
export const TONE_BG: Record<Tone, string> = { good: 'bg-emerald-100 text-emerald-800', ok: 'bg-amber-100 text-amber-800', bad: 'bg-red-100 text-red-700' };
export const scoreTone = (score: number): Tone => (score >= 80 ? 'good' : score >= 50 ? 'ok' : 'bad');

// What Google roughly shows (it cuts by pixel width; characters are close enough)
export const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/* ── Reading page content (src/content/pages/*.json) ──────────── */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

export interface PageImage {
  where: string; // "hero.image"
  src: string;
  altKey: string; // "hero.imageAlt"
  alt: string;
}

export interface PageText {
  heading: string; // the hero / first headline
  body: string; // every piece of text on the page
  images: PageImage[]; // images that have an alt-text field next to them
}

const NOT_TEXT = /(^_|image|src|logo|icon|path|href|url|link$|^id$|^slug$|color|symbol|video)/i;
const IMAGE_KEY = /^(src|logo|image|.*Image)$/;
const HEADING_KEY = /^(title|heading|headline)(Line\d+|Highlight|Italic|Start|End|Accent)?$/i;

// The alt-text field that belongs to an image field: image → imageAlt, src → alt, handsImage → handsImageAlt
const altKeyFor = (key: string) => (key === 'src' ? 'alt' : `${key}Alt`);

export function extractPageText(content: unknown): PageText {
  const body: string[] = [];
  const images: PageImage[] = [];

  const walk = (v: unknown, at: string, key: string) => {
    if (typeof v === 'string') {
      if (!NOT_TEXT.test(key) && !/^(\/|https?:)/.test(v)) body.push(v);
      return;
    }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${at}[${i}]`, key));
    if (!isObj(v)) return;
    for (const [k, x] of Object.entries(v)) {
      if (k === '_meta') continue;
      const here = at ? `${at}.${k}` : k;
      if (typeof x === 'string' && IMAGE_KEY.test(k) && altKeyFor(k) in v) {
        const altKey = altKeyFor(k);
        images.push({ where: here, src: x, altKey: at ? `${at}.${altKey}` : altKey, alt: String(v[altKey] ?? '') });
      }
      if (/alt$/i.test(k) && typeof x === 'string') {
        body.push(x);
        continue;
      }
      walk(x, here, k);
    }
  };
  walk(content, '', '');

  // Main heading: title fields of "hero", else of the first section that has any
  const headingOf = (o: unknown) =>
    isObj(o) ? Object.entries(o).filter(([k, x]) => HEADING_KEY.test(k) && typeof x === 'string').map(([, x]) => x as string).join(' ') : '';
  let heading = '';
  if (isObj(content)) {
    heading = headingOf(content.hero) || headingOf(content.header);
    if (!heading) {
      for (const [k, section] of Object.entries(content)) {
        if (k === '_meta') continue;
        heading = headingOf(section);
        if (heading) break;
      }
    }
  }
  return { heading: heading.replace(/\s+/g, ' ').trim(), body: body.join(' \n'), images };
}

// Alt text that says nothing useful ("Hero", "About", "Image")
export const isGenericAlt = (alt: string) => alt.trim().split(/\s+/).filter(Boolean).length < 2 || /^(image|photo|picture|img)\b/i.test(alt.trim());

/* ── Keyword matching ─────────────────────────────────────────── */

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, ' ').trim()} `;

// 'phrase' = the exact phrase appears, 'words' = every word appears somewhere, 'none' otherwise
export function keywordMatch(text: string, keyword: string): 'phrase' | 'words' | 'none' {
  const kw = norm(keyword).trim();
  if (!kw) return 'none';
  const t = norm(text);
  if (t.includes(` ${kw} `)) return 'phrase';
  // allow simple plurals: "gift" matches "gifts"
  const stem = (w: string) => w.replace(/(es|s)$/, '');
  const words = kw.split(' ');
  const tWords = new Set(t.trim().split(' ').map(stem));
  if (t.includes(` ${words.map(stem).join(' ')}`)) return 'phrase';
  return words.every((w) => tWords.has(stem(w))) ? 'words' : 'none';
}

export const countKeyword = (text: string, keyword: string) => {
  const kw = norm(keyword).trim();
  if (!kw) return 0;
  return norm(text).split(` ${kw}`).length - 1;
};

/* ── One page's score ─────────────────────────────────────────── */

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  points: number; // earned
  max: number;
  fix?: string; // how to fix (when not passing)
}

export interface PageScore {
  score: number; // 0–100
  checks: SeoCheck[];
}

const check = (id: string, label: string, max: number, earned: number, fix?: string): SeoCheck => ({
  id,
  label,
  max,
  points: Math.max(0, Math.min(max, earned)),
  status: earned >= max ? 'pass' : earned > 0 ? 'warn' : 'fail',
  fix: earned >= max ? undefined : fix,
});

export function scorePage({ page, site, pages, content }: { page: SeoPage; site: SeoSite; pages: SeoPage[]; content?: unknown }): PageScore {
  const checks: SeoCheck[] = [];
  const title = fullTitle(site, page.title);
  const tLen = page.title.trim() ? title.length : 0;
  const dLen = page.description.trim().length;
  const kw = (page.focusKeyword ?? '').trim();
  const text = content === undefined ? null : extractPageText(content);

  // Title
  const tTone = lengthTone(tLen, TITLE_LIMITS);
  checks.push(check('title', `Title length: ${tLen} characters (${TITLE_LIMITS.min}–${TITLE_LIMITS.max})`, 15, tTone === 'good' ? 15 : tTone === 'ok' ? 8 : 0,
    tLen === 0 ? 'Write a title: the page topic first, e.g. "Diwali Corporate Gifts & Hampers".' : tLen < TITLE_LIMITS.min ? 'Add a few descriptive words (what, for whom, where).' : 'Shorten it so Google shows the whole title; keep the key words at the start.'));

  // Description
  const dTone = lengthTone(dLen, DESC_LIMITS);
  checks.push(check('description', `Description length: ${dLen} characters (${DESC_LIMITS.min}–${DESC_LIMITS.max})`, 15, dTone === 'good' ? 15 : dTone === 'ok' ? 8 : 0,
    dLen === 0 ? 'Write 1–2 sentences that sell the page and end with a reason to click.' : dLen < DESC_LIMITS.min ? 'Add a benefit or detail (custom branding, pan-India delivery…).' : 'Trim it so it is not cut off in Google results.'));

  // Focus keyword
  const noKw = 'Set a focus keyword: the search phrase you want this page to rank for.';
  const kwPoints = (m: 'phrase' | 'words' | 'none', max: number) => (m === 'phrase' ? max : m === 'words' ? Math.round(max / 2) : 0);
  checks.push(check('kw-title', kw ? `Focus keyword "${kw}" in the title` : 'Focus keyword in the title', 10, kw ? kwPoints(keywordMatch(page.title, kw), 10) : 0,
    kw ? 'Use the keyword in the title, ideally near the start.' : noKw));
  checks.push(check('kw-desc', 'Focus keyword in the description', 10, kw ? kwPoints(keywordMatch(page.description, kw), 10) : 0,
    kw ? 'Mention the keyword naturally in the description; Google bolds it in results.' : noKw));
  if (text) {
    checks.push(check('kw-heading', 'Focus keyword in the main heading', 10, kw ? kwPoints(keywordMatch(text.heading, kw), 10) : 0,
      kw ? `Work the keyword (or its words) into the hero heading${text.heading ? ` (now: "${clip(text.heading, 60)}")` : ''}.` : noKw));
    const n = kw ? countKeyword(text.body, kw) : 0;
    const bodyMatch = kw ? keywordMatch(text.body, kw) : 'none';
    checks.push(check('kw-body', kw ? `Focus keyword in the page text (${n}×)` : 'Focus keyword in the page text', 10, !kw ? 0 : n >= 2 ? 10 : n === 1 || bodyMatch !== 'none' ? 5 : 0,
      kw ? 'Use the exact keyword at least twice in the page text (intro, a section title).' : noKw));

    // Alt texts
    const imgs = text.images.filter((i) => i.src);
    const missing = imgs.filter((i) => !i.alt.trim());
    const generic = imgs.filter((i) => i.alt.trim() && isGenericAlt(i.alt));
    const altPts = imgs.length ? Math.round(10 * ((imgs.length - missing.length - generic.length * 0.5) / imgs.length)) : 10;
    checks.push(check('alts', imgs.length ? `Image alt texts: ${imgs.length - missing.length}/${imgs.length} filled${generic.length ? `, ${generic.length} too vague` : ''}` : 'Image alt texts', 10, altPts,
      `${missing.length ? `Fill in the alt text for: ${missing.map((i) => i.altKey).join(', ')}. ` : ''}${generic.length ? `Describe what the photo shows instead of one word (e.g. "${generic[0].alt}" → "Bamboo gift box with a branded journal").` : ''}`.trim()));
  }

  // Share image
  checks.push(check('image', page.image ? 'Share image set' : 'Share image (using the site default)', 5, page.image ? 5 : site.defaultImage ? 3 : 0,
    'Pick a share image for this page (1200×630 JPG or PNG works best on WhatsApp, LinkedIn and Facebook).'));

  // Indexable
  checks.push(check('index', page.noindex ? 'Hidden from Google (noindex)' : 'Visible to Google', 5, page.noindex ? 0 : 5,
    'Fine if intended (e.g. a thank-you page). Otherwise untick "Hide from Google".'));

  // Unique title & description
  const others = pages.filter((p) => normalizeRoute(p.route) !== normalizeRoute(page.route) && !p.canonical && !page.canonical);
  const dupTitle = !!page.title.trim() && others.some((p) => fullTitle(site, p.title).toLowerCase() === title.toLowerCase());
  const dupDesc = !!page.description.trim() && others.some((p) => p.description.trim().toLowerCase() === page.description.trim().toLowerCase());
  checks.push(check('unique', dupTitle || dupDesc ? `Same ${dupTitle && dupDesc ? 'title and description' : dupTitle ? 'title' : 'description'} as another page` : 'Unique title and description', 10,
    10 - (dupTitle ? 5 : 0) - (dupDesc ? 5 : 0), 'Each page needs its own title and description so Google knows which page to show.'));

  const max = checks.reduce((s, c) => s + c.max, 0);
  const got = checks.reduce((s, c) => s + c.points, 0);
  return { score: Math.round((got / max) * 100), checks };
}

/* ── Site-wide issues (dashboard) ─────────────────────────────── */

export type Severity = 'error' | 'warning' | 'info';

export interface SeoIssue {
  severity: Severity;
  text: string;
  detail?: string;
  fix?: string; // admin route to fix it
}

export const pagesFix = (route?: string) => `/seo/pages${route ? `?route=${encodeURIComponent(route)}` : ''}`;
export const editFix = (path: string) => `/website/edit?path=${encodeURIComponent(path)}`;

// Title/description/noindex/image/duplicate problems across the pages in seo.json
export function pageMetaIssues(seo: SeoFile): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const { site, pages } = seo;
  const byTitle = new Map<string, string[]>();
  const byDesc = new Map<string, string[]>();

  for (const p of pages) {
    const fix = pagesFix(p.route);
    const tLen = p.title.trim() ? fullTitle(site, p.title).length : 0;
    const tProb = lengthProblem(tLen, TITLE_LIMITS, 'title');
    if (tProb) issues.push({ severity: tLen === 0 ? 'error' : 'warning', text: `${p.route}: ${tProb}`, fix });
    const dLen = p.description.trim().length;
    const dProb = lengthProblem(dLen, DESC_LIMITS, 'description');
    if (dProb) issues.push({ severity: dLen === 0 ? 'error' : 'warning', text: `${p.route}: ${dProb}`, fix });
    if (p.noindex) issues.push({ severity: 'info', text: `${p.route} is hidden from Google (noindex)`, detail: 'Fine for thank-you or private pages.', fix });
    if (!p.image) issues.push({ severity: 'info', text: `${p.route} has no share image`, detail: site.defaultImage ? 'The site default image is used instead.' : 'No default image either.', fix });
    if (!p.canonical) {
      if (p.title.trim()) byTitle.set(fullTitle(site, p.title).toLowerCase(), [...(byTitle.get(fullTitle(site, p.title).toLowerCase()) ?? []), p.route]);
      if (p.description.trim()) byDesc.set(p.description.trim().toLowerCase(), [...(byDesc.get(p.description.trim().toLowerCase()) ?? []), p.route]);
    }
  }
  for (const routes of byTitle.values()) if (routes.length > 1) issues.push({ severity: 'error', text: `Duplicate title on ${routes.join(', ')}`, fix: pagesFix(routes[0]) });
  for (const routes of byDesc.values()) if (routes.length > 1) issues.push({ severity: 'warning', text: `Duplicate description on ${routes.join(', ')}`, fix: pagesFix(routes[0]) });

  if (!site.defaultImage) issues.push({ severity: 'warning', text: 'No default share image', fix: pagesFix() });
  if (!site.googleSiteVerification.trim()) issues.push({ severity: 'info', text: 'Google Search Console not verified yet', detail: 'Add the verification code to see search traffic and indexing problems.', fix: '/seo/tools' });
  return issues;
}

// Pages from the site's routes that have no entry in seo.json
export function missingPages(seo: SeoFile, routes: string[]): SeoIssue[] {
  const have = new Set(seo.pages.map((p) => normalizeRoute(p.route)));
  return routes.filter((r) => !have.has(normalizeRoute(r))).map((r) => ({ severity: 'error' as const, text: `${r} has no SEO title or description`, detail: 'The site default is used.', fix: pagesFix() }));
}

// Empty or vague alt texts in one page file
export function altIssues(path: string, label: string, content: unknown): SeoIssue[] {
  const { images } = extractPageText(content);
  const issues: SeoIssue[] = [];
  const empty = images.filter((i) => !i.alt.trim());
  const vague = images.filter((i) => i.alt.trim() && isGenericAlt(i.alt));
  if (empty.length) issues.push({ severity: 'warning', text: `${label}: ${empty.length} image${empty.length === 1 ? '' : 's'} without alt text`, detail: empty.map((i) => i.altKey).join(', '), fix: editFix(path) });
  if (vague.length) issues.push({ severity: 'info', text: `${label}: ${vague.length} vague alt text${vague.length === 1 ? '' : 's'}`, detail: vague.map((i) => `"${i.alt}"`).join(', '), fix: editFix(path) });
  return issues;
}

export interface BlogPostSeo {
  id: string;
  title: string;
  seo_score: number | null;
  seo_description: string | null;
  focus_keyword: string | null;
}

export function blogIssues(posts: BlogPostSeo[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  for (const p of posts) {
    const problems = [
      (p.seo_score ?? 0) < 60 && `SEO score ${p.seo_score ?? 0}`,
      !p.seo_description?.trim() && 'no SEO description',
      !p.focus_keyword?.trim() && 'no focus keyword',
    ].filter(Boolean) as string[];
    if (problems.length) issues.push({ severity: (p.seo_score ?? 0) < 40 ? 'error' : 'warning', text: `Article "${p.title || 'Untitled'}": ${problems.join(', ')}`, fix: `/blog/${p.id}` });
  }
  return issues;
}

// 0–100: average page score, minus a little for each site-wide problem
export function healthScore(pageScores: number[], issues: SeoIssue[]) {
  const avg = pageScores.length ? pageScores.reduce((a, b) => a + b, 0) / pageScores.length : 0;
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const site = Math.max(0, 100 - errors * 8 - warnings * 2);
  return Math.round(avg * 0.7 + site * 0.3);
}

/* ── Routes of the public site ────────────────────────────────── */

// Keep in sync with src/App.tsx (used for the PageSpeed / tools dropdowns)
export const SITE_ROUTES = [
  '/', '/solutions', '/products', '/get-proposal', '/impact', '/contact', '/blog',
  '/occasions/client-appreciation', '/occasions/employee-onboarding', '/occasions/festive-gifting', '/occasions/events-conferences',
  '/occasions/employee-wellness', '/occasions/birthday-gifting', '/occasions/work-anniversary', '/occasions/product-launch',
  '/occasions/award-recognition', '/occasions/retirement-gifting', '/occasions/depawali-gifting',
  '/privacy-policy', '/terms-of-service', '/refund-policy', '/shipping-policy',
];
