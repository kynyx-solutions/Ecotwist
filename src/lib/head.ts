/* ============================
   Sets <title>, meta tags, canonical link and JSON-LD for a page, and puts
   everything back as it was when the page unmounts. Used by the blog pages.
============================ */

export const SITE_URL = 'https://ecotwist.in';

export interface HeadSpec {
  title: string;
  description?: string;
  canonical?: string;           // absolute URL
  noindex?: boolean;
  og?: Record<string, string>;  // { 'og:title': '…', 'og:type': 'article', … }
  twitter?: Record<string, string>;
  jsonLd?: object;
}

export const absoluteUrl = (url: string) => (!url ? '' : /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);

export function applyHead(spec: HeadSpec): () => void {
  const undo: (() => void)[] = [];

  const prevTitle = document.title;
  document.title = spec.title;
  undo.push(() => { document.title = prevTitle; });

  const meta = (attr: 'name' | 'property', key: string, content: string | undefined) => {
    if (content === undefined) return;
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (el) {
      const prev = el.getAttribute('content');
      el.setAttribute('content', content);
      const target = el;
      undo.push(() => (prev === null ? target.removeAttribute('content') : target.setAttribute('content', prev)));
    } else {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      el.setAttribute('content', content);
      document.head.appendChild(el);
      const created = el;
      undo.push(() => created.remove());
    }
  };

  meta('name', 'description', spec.description);
  if (spec.noindex) meta('name', 'robots', 'noindex, follow');
  for (const [k, v] of Object.entries(spec.og ?? {})) if (v) meta('property', k, v);
  for (const [k, v] of Object.entries(spec.twitter ?? {})) if (v) meta('name', k, v);

  if (spec.canonical) {
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (link) {
      const prev = link.href;
      link.href = spec.canonical;
      const target = link;
      undo.push(() => { target.href = prev; });
    } else {
      link = document.createElement('link');
      link.rel = 'canonical';
      link.href = spec.canonical;
      document.head.appendChild(link);
      const created = link;
      undo.push(() => created.remove());
    }
  }

  if (spec.jsonLd) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    // Escape "<" so text can never close the script tag
    script.textContent = JSON.stringify(spec.jsonLd).replace(/</g, '\\u003c');
    document.head.appendChild(script);
    undo.push(() => script.remove());
  }

  return () => undo.reverse().forEach((fn) => fn());
}
