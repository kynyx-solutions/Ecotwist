/* ============================
   Sets the page <title>, meta description, canonical, Open Graph / Twitter
   tags and Organization JSON-LD on every route change, from
   src/content/seo.json (edited in /admin → SEO → Pages).
   Mount once inside the <Router>. Blog posts (/blog/<slug>) set their own tags.
============================ */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import seoData from '../content/seo.json';
import { absoluteUrl, canonicalUrl, findSeoPage, fullTitle, normalizeRoute, siteJsonLd, type SeoFile } from '../lib/seo';

const seo = seoData as SeoFile;

// <meta name|property="key" content="value">; removes the tag when value is empty
function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!value) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(data: unknown) {
  let el = document.head.querySelector<HTMLScriptElement>('script#seo-jsonld');
  if (!el) {
    el = document.createElement('script');
    el.id = 'seo-jsonld';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

// A single blog post: its page sets its own title and tags
const isBlogPost = (path: string) => /^\/blog\/[^/]+/.test(path);

export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = normalizeRoute(pathname);
    if (isBlogPost(path)) return;

    const { site } = seo;
    const page = findSeoPage(seo, path);
    const title = page ? fullTitle(site, page.title) : site.defaultTitle;
    const description = page?.description || site.defaultDescription;
    const image = absoluteUrl(site, page?.image || site.defaultImage);
    const url = canonicalUrl(site, page, path);

    document.title = title;
    setMeta('name', 'description', description);
    setCanonical(url);

    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', site.siteName);
    setMeta('property', 'og:locale', 'en_IN');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', image);

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    setMeta('name', 'robots', page?.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
    setMeta('name', 'google-site-verification', site.googleSiteVerification.trim());

    setJsonLd(siteJsonLd(site));
  }, [pathname]);

  return null;
}

export default SeoManager;
