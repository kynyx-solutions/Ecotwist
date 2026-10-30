/* ============================
   Yoast-style SEO + readability scoring for a blog article.
   Pure: no DOM, no React, no network — safe to reuse on an SEO dashboard
   (e.g. scoreArticle({ ...post, bodyHtml: post.body })) or in tests.
============================ */

export type CheckStatus = 'good' | 'ok' | 'bad';

export interface SeoCheck {
  id: string;
  status: CheckStatus;
  message: string; // what we found
  fix: string;     // how to improve it ('' when good)
}

export interface Readability {
  score: number;        // Flesch reading ease, 0–100 (higher = easier)
  label: string;        // "Easy", "Fairly difficult", …
  status: CheckStatus;
  words: number;
  sentences: number;
  avgSentenceWords: number;
}

export interface SeoInput {
  title: string;
  slug: string;
  bodyHtml: string;
  focusKeyword?: string;
  seoTitle?: string;        // falls back to title
  seoDescription?: string;  // falls back to excerpt
  excerpt?: string;
  coverImage?: string;
  siteHost?: string;        // for internal-link detection, default "ecotwist.in"
}

export interface SeoResult {
  score: number; // 0–100
  status: CheckStatus;
  checks: SeoCheck[];
  readability: Readability;
}

/* ── Text helpers ────────────────────────────────────────────── */

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k in ENTITIES) return ENTITIES[k];
    if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16) || 32);
    if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10) || 32);
    return m;
  });

const stripTags = (html: string) => decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

export const normalize = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const wordsOf = (text: string) => normalize(text).split(' ').filter(Boolean);

const countPhrase = (text: string, phrase: string) => {
  const t = ` ${normalize(text)} `;
  const p = ` ${normalize(phrase)} `;
  if (p.trim() === '') return 0;
  let n = 0;
  for (let i = t.indexOf(p); i !== -1; i = t.indexOf(p, i + p.length - 1)) n++;
  return n;
};

const has = (text: string, phrase: string) => countPhrase(text, phrase) > 0;

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null;
};

const sentencesOf = (text: string) =>
  text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter((s) => wordsOf(s).length > 0);

const syllables = (word: string) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
};

/* ── HTML structure ──────────────────────────────────────────── */

interface Parsed {
  text: string;
  headings: { level: number; text: string }[];
  paragraphs: string[];
  images: { src: string; alt: string }[];
  links: string[];
}

export function parseArticleHtml(html: string): Parsed {
  const src = html ?? '';
  const headings = [...src.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: stripTags(m[2]) }));
  const paragraphs = [...src.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => stripTags(m[2])).filter(Boolean);
  const images = [...src.matchAll(/<img\b[^>]*>/gi)].map((m) => ({ src: attr(m[0], 'src') ?? '', alt: (attr(m[0], 'alt') ?? '').trim() }));
  const links = [...src.matchAll(/<a\b[^>]*>/gi)].map((m) => attr(m[0], 'href') ?? '').filter(Boolean);
  // Block ends become sentence breaks so headings/list items don't merge into one sentence
  const text = decode(src.replace(/<\/(p|h[1-6]|li|blockquote|td|th|div)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .trim();
  return { text, headings, paragraphs, images, links };
}

/* ── Readability ─────────────────────────────────────────────── */

export function readabilityOf(text: string): Readability {
  const sentences = sentencesOf(text);
  const words = sentences.flatMap((s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)));
  const nWords = words.length;
  const nSent = Math.max(1, sentences.length);
  const syl = words.reduce((sum, w) => sum + syllables(w), 0);
  const raw = nWords ? 206.835 - 1.015 * (nWords / nSent) - 84.6 * (syl / nWords) : 0;
  const score = Math.round(Math.min(100, Math.max(0, raw)));
  const label =
    !nWords ? 'No text yet'
    : score >= 80 ? 'Easy'
    : score >= 70 ? 'Fairly easy'
    : score >= 60 ? 'Plain English'
    : score >= 50 ? 'Fairly difficult'
    : score >= 30 ? 'Difficult'
    : 'Very difficult';
  return {
    score,
    label,
    status: !nWords ? 'bad' : score >= 60 ? 'good' : score >= 50 ? 'ok' : 'bad',
    words: nWords,
    sentences: sentences.length,
    avgSentenceWords: Math.round((nWords / nSent) * 10) / 10,
  };
}

/* ── Scoring ─────────────────────────────────────────────────── */

const WEIGHTS: Record<string, number> = {
  keyword: 3, 'keyword-title': 3, 'keyword-title-start': 1, 'keyword-description': 2, 'keyword-slug': 2, 'keyword-intro': 2,
  'keyword-subheading': 2, 'keyword-density': 2, 'title-length': 2, 'description-length': 2, 'content-length': 3,
  'single-h1': 1, 'heading-order': 1, 'image-alt': 2, 'keyword-alt': 1, 'internal-link': 2, 'external-link': 1,
  'paragraph-length': 1, 'sentence-length': 1, cover: 1,
};

const POINTS: Record<CheckStatus, number> = { good: 1, ok: 0.5, bad: 0 };

export function scoreArticle(input: SeoInput): SeoResult {
  const host = (input.siteHost ?? 'ecotwist.in').toLowerCase();
  const kw = (input.focusKeyword ?? '').trim();
  const nkw = normalize(kw);
  const title = (input.title ?? '').trim();
  const seoTitle = (input.seoTitle ?? '').trim() || title;
  const desc = (input.seoDescription ?? '').trim() || (input.excerpt ?? '').trim();
  const doc = parseArticleHtml(input.bodyHtml);
  const bodyWords = wordsOf(doc.text);
  const wordCount = bodyWords.length;
  const readability = readabilityOf(doc.text);

  const checks: SeoCheck[] = [];
  const add = (id: string, status: CheckStatus, message: string, fix = '') => checks.push({ id, status, message, fix: status === 'good' ? '' : fix });
  const needKw = 'Set a focus keyword first.';

  // Focus keyword
  if (!nkw) add('keyword', 'bad', 'No focus keyword set.', 'Enter the phrase people would search for to find this article, e.g. "sustainable diwali gifts".');
  else add('keyword', 'good', `Focus keyword: “${kw}”.`);

  // Keyword in SEO title, ideally at the start
  if (!nkw) {
    add('keyword-title', 'bad', 'Keyword in SEO title: no keyword to check.', needKw);
  } else if (has(seoTitle, kw)) {
    add('keyword-title', 'good', 'The focus keyword appears in the SEO title.');
    const startsWith = normalize(seoTitle).startsWith(nkw);
    add('keyword-title-start', startsWith ? 'good' : 'ok',
      startsWith ? 'The SEO title starts with the focus keyword.' : 'The focus keyword is in the SEO title, but not at the start.',
      'Move the keyword towards the beginning of the SEO title. Words at the start carry more weight.');
  } else {
    add('keyword-title', 'bad', 'The focus keyword is missing from the SEO title.', `Rewrite the SEO title (or article title) to include “${kw}”, ideally at the start.`);
  }

  // Keyword in meta description
  if (!nkw) add('keyword-description', 'bad', 'Keyword in meta description: no keyword to check.', needKw);
  else if (!desc) add('keyword-description', 'bad', 'There is no meta description.', `Write an SEO description (or excerpt) of 120–160 characters that includes “${kw}”.`);
  else if (has(desc, kw)) add('keyword-description', 'good', 'The meta description contains the focus keyword.');
  else add('keyword-description', 'bad', 'The meta description does not contain the focus keyword.', `Mention “${kw}” naturally in the SEO description.`);

  // Keyword in slug
  if (!nkw) add('keyword-slug', 'bad', 'Keyword in web address: no keyword to check.', needKw);
  else {
    const slugWords = ` ${(input.slug ?? '').toLowerCase().split('-').join(' ')} `;
    const ok = slugWords.includes(` ${nkw} `) || nkw.split(' ').every((w) => slugWords.includes(` ${w} `));
    add('keyword-slug', ok ? 'good' : 'bad', ok ? 'The web address contains the focus keyword.' : 'The web address (slug) does not contain the focus keyword.',
      `Change the slug to include the keyword, e.g. /blog/${nkw.split(' ').join('-')}.`);
  }

  // Keyword in the first paragraph
  const intro = doc.paragraphs[0] ?? '';
  if (!nkw) add('keyword-intro', 'bad', 'Keyword in introduction: no keyword to check.', needKw);
  else if (!intro) add('keyword-intro', 'bad', 'The article has no opening paragraph yet.', `Start the article with a paragraph that mentions “${kw}”.`);
  else add('keyword-intro', has(intro, kw) ? 'good' : 'bad',
    has(intro, kw) ? 'The focus keyword appears in the first paragraph.' : 'The focus keyword is not in the first paragraph.',
    `Mention “${kw}” in the opening paragraph so readers and Google know straight away what the article is about.`);

  // Keyword in an H2/H3
  const subheads = doc.headings.filter((h) => h.level === 2 || h.level === 3);
  if (!nkw) add('keyword-subheading', 'bad', 'Keyword in subheadings: no keyword to check.', needKw);
  else if (!subheads.length) add('keyword-subheading', 'bad', 'The article has no H2/H3 subheadings.', `Break the text into sections with Heading 2 / Heading 3, and use “${kw}” in at least one.`);
  else {
    const hit = subheads.some((h) => has(h.text, kw));
    add('keyword-subheading', hit ? 'good' : 'ok', hit ? 'A subheading (H2/H3) contains the focus keyword.' : 'None of the H2/H3 subheadings contain the focus keyword.',
      `Rephrase one subheading to include “${kw}” (or a close variation).`);
  }

  // Keyword density 0.5–2.5 %
  if (!nkw) add('keyword-density', 'bad', 'Keyword density: no keyword to check.', needKw);
  else if (!wordCount) add('keyword-density', 'bad', 'Keyword density: no text yet.', 'Write the article first.');
  else {
    const hits = countPhrase(doc.text, kw);
    const density = (hits * nkw.split(' ').length * 100) / wordCount;
    const d = density.toFixed(1);
    if (density < 0.5) add('keyword-density', hits ? 'ok' : 'bad', `Keyword density is ${d}% (${hits}×). Aim for 0.5–2.5%.`, `Use “${kw}” a few more times where it reads naturally.`);
    else if (density > 2.5) add('keyword-density', 'bad', `Keyword density is ${d}% (${hits}×), which looks like keyword stuffing.`, 'Replace some mentions with synonyms or pronouns. Aim for 0.5–2.5%.');
    else add('keyword-density', 'good', `Keyword density is ${d}% (${hits}×). Nicely balanced.`);
  }

  // SEO title length
  const tl = seoTitle.length;
  if (!tl) add('title-length', 'bad', 'There is no title.', 'Add a title of 30–60 characters.');
  else if (tl < 30) add('title-length', 'ok', `The SEO title is short (${tl} characters).`, 'Use 30–60 characters to make the most of the space in search results.');
  else if (tl > 60) add('title-length', 'bad', `The SEO title is too long (${tl} characters) and will be cut off in Google.`, 'Shorten it to 60 characters or fewer (set a separate SEO title if the article title should stay long).');
  else add('title-length', 'good', `The SEO title length is good (${tl} characters).`);

  // Meta description length
  const dl = desc.length;
  if (!dl) add('description-length', 'bad', 'There is no meta description; Google will pick random text.', 'Write an SEO description (or excerpt) of 120–160 characters.');
  else if (dl < 120) add('description-length', 'ok', `The meta description is short (${dl} characters).`, 'Expand it to 120–160 characters with a clear reason to click.');
  else if (dl > 160) add('description-length', 'bad', `The meta description is too long (${dl} characters) and will be cut off.`, 'Trim it to 160 characters or fewer.');
  else add('description-length', 'good', `The meta description length is good (${dl} characters).`);

  // Content length
  if (wordCount >= 600) add('content-length', 'good', `The article has ${wordCount} words. Good depth.`);
  else if (wordCount >= 300) add('content-length', 'ok', `The article has ${wordCount} words.`, 'Articles of 600+ words tend to rank better. Add examples, tips or a FAQ section.');
  else add('content-length', 'bad', `The article has only ${wordCount} words.`, 'Write at least 300 words, ideally 600 or more.');

  if (wordCount) {
    // H1: the title is the page's H1, so the body should not have one
    const h1s = doc.headings.filter((h) => h.level === 1).length;
    add('single-h1', h1s ? 'bad' : 'good',
      h1s ? `The text contains ${h1s} Heading 1${h1s > 1 ? 's' : ''}; the article title is already the page's H1.` : 'One H1 on the page (the article title).',
      'Change Heading 1 in the text to Heading 2.');

    // Heading levels shouldn't skip (H2 → H4)
    let skip: string | null = null;
    let prev = 1; // the title
    for (const h of doc.headings) {
      if (h.level > prev + 1) { skip = `H${prev} → H${h.level} (“${h.text.slice(0, 40)}”)`; break; }
      prev = h.level;
    }
    add('heading-order', skip ? 'ok' : 'good', skip ? `Heading levels skip a step: ${skip}.` : 'Heading levels are in order.',
      'Use headings in order: Heading 2 for sections, Heading 3 inside them.');
  }

  // Image alt text
  if (!doc.images.length) {
    add('image-alt', 'ok', 'The text has no images.', 'Add at least one relevant photo (with a description) to break up the text.');
  } else {
    const missing = doc.images.filter((i) => !i.alt).length;
    add('image-alt', missing ? 'bad' : 'good',
      missing ? `${missing} of ${doc.images.length} image${doc.images.length > 1 ? 's' : ''} ha${missing > 1 ? 've' : 's'} no alt text.` : 'Every image has alt text.',
      'Click the image and use “Alt text” in the toolbar to describe it.');
  }
  if (nkw && doc.images.length) {
    const hit = doc.images.some((i) => has(i.alt, kw));
    add('keyword-alt', hit ? 'good' : 'ok', hit ? 'An image alt text contains the focus keyword.' : 'No image alt text contains the focus keyword.',
      `Where it fits, describe one image using “${kw}”.`);
  }

  // Links
  const isInternal = (href: string) =>
    href.startsWith('/') || href.startsWith('#') || new RegExp(`^https?://([a-z0-9-]+\\.)*${host.replace(/\./g, '\\.')}(/|$)`, 'i').test(href);
  const internal = doc.links.filter((l) => isInternal(l) && !l.startsWith('#')).length;
  const external = doc.links.filter((l) => /^https?:\/\//i.test(l) && !isInternal(l)).length;
  add('internal-link', internal ? 'good' : 'bad', internal ? `${internal} link${internal > 1 ? 's' : ''} to other Ecotwist pages.` : 'No links to other Ecotwist pages.',
    'Link to a related page, e.g. /solutions, /get-proposal or another article.');
  add('external-link', external ? 'good' : 'ok', external ? `${external} link${external > 1 ? 's' : ''} to other websites.` : 'No links to other websites.',
    'Link to a trustworthy source (a study, a supplier, a news article) to back up your points.');

  if (wordCount) {
    // Paragraph length
    const longParas = doc.paragraphs.filter((p) => wordsOf(p).length > 150).length;
    add('paragraph-length', longParas ? 'ok' : 'good', longParas ? `${longParas} paragraph${longParas > 1 ? 's are' : ' is'} longer than 150 words.` : 'Paragraphs are a comfortable length.',
      'Split long paragraphs. Short paragraphs are easier to read, especially on phones.');
  }

  // Sentence length
  const sentences = sentencesOf(doc.text);
  if (sentences.length) {
    const long = sentences.filter((s) => wordsOf(s).length > 25).length;
    const share = Math.round((long / sentences.length) * 100);
    add('sentence-length', share < 25 ? 'good' : share < 35 ? 'ok' : 'bad',
      `${share}% of sentences are longer than 25 words${share < 25 ? '. Good.' : '.'}`,
      'Keep it under 25%: split long sentences in two or cut filler words.');
  } else {
    add('sentence-length', 'ok', 'No sentences to check yet.', 'Write the article first.');
  }

  // Cover image
  add('cover', input.coverImage?.trim() ? 'good' : 'bad', input.coverImage?.trim() ? 'A cover photo is set.' : 'No cover photo.',
    'Add a cover photo: it is shown on the blog page and when the article is shared.');

  let total = 0;
  let got = 0;
  for (const c of checks) {
    const w = WEIGHTS[c.id] ?? 1;
    total += w;
    got += w * POINTS[c.status];
  }
  const score = total ? Math.round((got / total) * 100) : 0;
  return { score, status: score >= 70 ? 'good' : score >= 45 ? 'ok' : 'bad', checks, readability };
}
