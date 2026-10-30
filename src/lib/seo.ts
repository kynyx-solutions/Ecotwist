/* ============================
   SEO settings from src/content/seo.json (edited in /admin → SEO).
   Shared by the site (<SeoManager />) and the admin SEO screens.
============================ */

export interface SeoOrganization {
  name: string;
  logo: string;
  email: string;
  phone: string;
  sameAs: string[];
}

export interface SeoSite {
  siteName: string;
  titleTemplate: string; // "%s | Ecotwist"
  defaultTitle: string;
  defaultDescription: string;
  defaultImage: string;
  baseUrl: string;
  googleSiteVerification: string;
  organization: SeoOrganization;
}

export interface SeoPage {
  route: string;
  title: string;
  description: string;
  image: string;
  noindex: boolean;
  focusKeyword?: string;
  canonical?: string; // another route this page duplicates, e.g. "/products"
}

export interface SeoFile {
  _meta?: { label?: string };
  site: SeoSite;
  pages: SeoPage[];
}

// "/occasions/x/" → "/occasions/x"
export const normalizeRoute = (path: string) => {
  const p = (path.split(/[?#]/)[0] || '/').replace(/\/+$/, '');
  return p === '' ? '/' : p;
};

export const findSeoPage = (seo: SeoFile, path: string) => {
  const route = normalizeRoute(path);
  return seo.pages.find((p) => normalizeRoute(p.route) === route);
};

// The <title> as Google sees it. Titles that already name the site skip the template.
export function fullTitle(site: SeoSite, title: string | undefined) {
  const t = (title ?? '').trim();
  if (!t) return site.defaultTitle;
  const name = site.siteName.trim().toLowerCase();
  if (name && t.toLowerCase().includes(name)) return t;
  return (site.titleTemplate || '%s').replace('%s', t);
}

// Absolute URL for a share image or link ("/site/x.png" → "https://ecotwist.in/site/x.png")
export function absoluteUrl(site: SeoSite, src: string) {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  const base = site.baseUrl.replace(/\/+$/, '');
  return `${base}${src.startsWith('/') ? '' : '/'}${src.replace(/ /g, '%20')}`;
}

export const canonicalUrl = (site: SeoSite, page: SeoPage | undefined, path: string) => {
  const route = normalizeRoute(page?.canonical || path);
  return route === '/' ? `${site.baseUrl.replace(/\/+$/, '')}/` : absoluteUrl(site, route);
};

// Organization + WebSite structured data (one JSON-LD graph)
export function siteJsonLd(site: SeoSite) {
  const base = site.baseUrl.replace(/\/+$/, '');
  const org = site.organization;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: org.name || site.siteName,
        url: `${base}/`,
        ...(org.logo ? { logo: absoluteUrl(site, org.logo) } : {}),
        ...(org.email ? { email: org.email } : {}),
        ...(org.phone ? { telephone: org.phone } : {}),
        ...(org.email || org.phone
          ? { contactPoint: [{ '@type': 'ContactPoint', contactType: 'sales', areaServed: 'IN', ...(org.email ? { email: org.email } : {}), ...(org.phone ? { telephone: org.phone } : {}) }] }
          : {}),
        ...(org.sameAs?.filter(Boolean).length ? { sameAs: org.sameAs.filter(Boolean) } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: `${base}/`,
        name: site.siteName,
        description: site.defaultDescription,
        inLanguage: 'en-IN',
        publisher: { '@id': `${base}/#organization` },
      },
    ],
  };
}
