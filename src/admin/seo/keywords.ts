// Pure logic for SEO → Keywords (no React, so it can be tested on its own).
import { PRIVATE_ROUTES, editFix, extractPageText, keywordMatch, normalizeRoute, pagesFix, type SeoFile } from './checks';
import type { PageFile } from './data';

export type Kind = 'target' | 'trending';
export type Intent = 'commercial' | 'informational' | 'navigational' | 'transactional';
export type Status = 'planned' | 'optimized' | 'ranking';

export interface Keyword {
  id: string;
  term: string;
  kind: Kind;
  intent: Intent;
  page: string;
  status: Status;
  position: number | null;
  notes: string;
}
export type NewKeyword = Omit<Keyword, 'id' | 'position' | 'notes'>;

export const ENDPOINT = '/api/admin/seo?tool=keywords';

/* ── What each page says (for the coverage check) ─────────────── */

export interface PageInfo {
  route: string;
  title: string;
  description: string;
  listed: string[]; // focus keyword + "Other keywords" in Titles & descriptions
  focus: string;
  text: string; // headline, body copy, alt text and FAQs
  fixUrl: string;
  fixLabel: string;
}

// Pages that should not be ranked for anything
const SKIP_ROUTES = new Set([...PRIVATE_ROUTES, '/product', '/privacy-policy', '/terms-of-service', '/refund-policy', '/shipping-policy']);

export const routeLabel = (r: string) => (r === '/' ? 'Home' : r.replace(/^\/occasions\//, 'Occasion: ').replace(/^\//, ''));

export type Faqs = Record<string, { q: string; a: string }[]>;

// One entry per page that should rank, with everything visitors (and Google) can read on it
// Lists shown on a page but kept in their own files
export const EXTRA_TEXT: Record<string, string> = { '/products': 'src/content/products.json', '/shop': 'src/content/store.json' };

export function buildPages(seo: SeoFile, files: PageFile[], faqs: Faqs = {}, extra: Record<string, unknown> = {}): PageInfo[] {
  const fileFor = new Map(files.filter((p) => p.route).map((p) => [normalizeRoute(p.route!), p]));
  return seo.pages
    .filter((p) => !SKIP_ROUTES.has(normalizeRoute(p.route)))
    .map((p) => {
      const route = normalizeRoute(p.route);
      const file = fileFor.get(route);
      const t = file ? extractPageText(file.content) : null;
      const faq = (faqs[route] ?? []).map((f) => `${f.q} ${f.a}`).join(' \n');
      const more = extra[route] ? extractPageText(extra[route]).body : '';
      const meta = p as typeof p & { keywords?: string[] };
      return {
        route,
        title: p.title ?? '',
        description: p.description ?? '',
        focus: p.focusKeyword ?? '',
        listed: [p.focusKeyword ?? '', ...(meta.keywords ?? [])].filter(Boolean),
        text: [t?.heading, t?.body, faq, more].filter(Boolean).join(' \n'),
        fixUrl: file ? editFix(file.path) : pagesFix(route),
        fixLabel: file ? 'Edit page' : 'Edit title',
      };
    });
}

/* ── Coverage ─────────────────────────────────────────────────── */

export type Coverage = 'strong' | 'partial' | 'missing' | 'unassigned';

export function coverageFor(k: Keyword, pages: PageInfo[]): Coverage {
  const page = pages.find((p) => p.route === k.page);
  if (!page) return 'unassigned';
  const has = (text: string) => keywordMatch(text, k.term) === 'phrase';
  const inMeta = has(page.title) || has(page.description);
  const inText = has(page.text);
  const listed = page.listed.some((x) => keywordMatch(x, k.term) === 'phrase');
  // The page's focus keyword must be in the title or description AND the page text.
  // Other phrases can't all fit a 60-character title, so for them the page text is what counts.
  if (page.focus && keywordMatch(page.focus, k.term) === 'phrase' && keywordMatch(k.term, page.focus) === 'phrase') {
    if (inMeta && inText) return 'strong';
    return inMeta || inText || listed ? 'partial' : 'missing';
  }
  if (inText) return 'strong';
  return inMeta || listed ? 'partial' : 'missing';
}

export const COVERAGE: Record<Coverage, { label: string; cls: string; hint: string }> = {
  strong: { label: 'Strong', cls: 'bg-emerald-100 text-emerald-800', hint: 'The page uses this exact phrase where Google looks for it.' },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-800', hint: 'Listed for the page, but the exact phrase is not in the page text yet. Work it into a heading or paragraph.' },
  missing: { label: 'Missing', cls: 'bg-red-100 text-red-700', hint: 'The page does not mention this phrase anywhere.' },
  unassigned: { label: 'No page', cls: 'bg-gray-100 text-gray-600', hint: 'Choose the page that should rank for this phrase.' },
};

export const guessIntent = (term: string): Intent =>
  /^(what|how|why|when|which|who|is|are|can)\b|\bideas?\b|\bvs\b/.test(term) ? 'informational'
    : /\b(buy|price|prices|cost|online|order|under \d+|cheap|quote)\b/.test(term) ? 'transactional'
      : /\becotwist\b/.test(term) ? 'navigational' : 'commercial';

/* ── Suggested starting set ───────────────────────────────────── */

// Rising searches for sustainable / corporate gifting (Nov 2026), each with the page best placed to rank
export const TRENDING: [string, string][] = [
  ['sustainable corporate gifts 2027', '/'],
  ['made in india corporate gifts', '/'],
  ['corporate gifts with company logo', '/shop'],
  ['personalised corporate gifts', '/shop'],
  ['corporate gifts under 300', '/shop'],
  ['zero waste gift hampers', '/impact'],
  ['plastic free gift packaging', '/impact'],
  ['esg friendly corporate gifts', '/solutions'],
  ['gifts for remote employees', '/solutions'],
  ['employee appreciation gifts', '/occasions/award-recognition'],
  ['new joiner welcome kit ideas', '/occasions/employee-onboarding'],
  ['eco friendly diwali gifts for employees', '/occasions/depawali-gifting'],
  ['christmas gifts for employees under 500', '/occasions/christmas-gifting'],
  ['plantable seed paper gifts', '/occasions/earth-day-gifting'],
  ['gourmet hampers for clients', '/occasions/client-appreciation'],
  ['corporate gifting trends 2027', '/blog'],
];

export function suggestedSet(seo: SeoFile | null, pages: PageInfo[]): NewKeyword[] {
  const out: NewKeyword[] = [];
  for (const p of pages) for (const term of p.listed) out.push({ term: term.toLowerCase(), kind: 'target', intent: guessIntent(term.toLowerCase()), page: p.route, status: 'optimized' });
  for (const [term, page] of TRENDING) out.push({ term, kind: 'trending', intent: guessIntent(term), page: pages.some((p) => p.route === page) ? page : '', status: 'planned' });
  const seen = new Set<string>();
  return seo ? out.filter((k) => !seen.has(k.term) && (seen.add(k.term), true)) : [];
}

