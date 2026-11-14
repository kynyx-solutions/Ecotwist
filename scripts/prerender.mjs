/* ============================
   Pre-render the website to static HTML (runs after `vite build`).

   1. Builds src/entry-server.tsx for Node (dist-ssr/, not deployed).
   2. Renders every indexable page in src/content/seo.json and every store
      product page, waiting for each page's code to load.
   3. Writes dist/<route>.html with that page's title, description, canonical
      and social tags, so visitors and search engines get the full page at once.
      Vercel serves /occasions/x from dist/occasions/x.html (cleanUrls).

   The browser then takes the page over (hydrateRoot in src/main.tsx).
   A page that fails to render is skipped and falls back to the normal
   client-side app, so a pre-render problem never breaks the build.
============================ */

import fs from 'fs';
import path from 'path';
import { build } from 'vite';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const SSR_OUT = path.join(ROOT, 'dist-ssr');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const seo = readJson('src/content/seo.json');
const store = readJson('src/content/store.json');
const faqs = readJson('src/content/faqs.json');
const diwaliFaq = readJson('src/content/pages/diwali-gifting.json').faq?.items ?? [];
const site = seo.site;
const BASE = site.baseUrl.replace(/\/+$/, '');
const pageUrl = (route) => BASE + (route === '/' ? '/' : route);

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const abs = (u) => (!u ? '' : /^https?:/.test(u) ? u : site.baseUrl + (u.startsWith('/') ? '' : '/') + encodeURI(u));

// Routes to render
const pages = seo.pages.filter((p) => !p.noindex && (!p.canonical || p.canonical === p.route));
const routes = pages.map((p) => ({
  route: p.route,
  name: p.title,
  title: p.route === '/' ? `${p.title} | ${site.siteName}` : site.titleTemplate.replace('%s', p.title),
  description: p.description || site.defaultDescription,
  image: abs(p.image || site.defaultImage),
  keywords: [p.focusKeyword, ...(p.keywords ?? [])].filter(Boolean),
}));
const activeProducts = store.products.filter((x) => x.active);
for (const p of activeProducts) {
  routes.push({
    route: `/shop/${p.id}`,
    name: p.name,
    title: `${p.name}: Branded Corporate Gift Kit | Ecotwist`,
    description: `${p.contents}. Custom branded with your logo, from 25 to 500+ kits${p.price != null ? `, from ₹${p.price} per kit` : ''}.`.slice(0, 300),
    image: abs(p.image),
    keywords: [`${p.name.toLowerCase()} corporate gift`, ...p.occasions.map((o) => `${o.toLowerCase()} corporate gifts`), 'customised corporate gifts with logo', 'eco-friendly corporate gifts'],
    product: p,
  });
}

/* ── Structured data (schema.org JSON-LD) in each page's HTML ──────────────
   Read by Google (rich results, AI Overviews) and by AI crawlers such as
   GPTBot, ClaudeBot and PerplexityBot, which don't run JavaScript. */
const org = site.organization;
const ORG_ID = `${BASE}/#organization`;
const organization = {
  '@type': ['Organization', 'LocalBusiness'],
  '@id': ORG_ID,
  name: org.name || site.siteName,
  legalName: 'Ecotwist Innovations Private Limited',
  url: `${BASE}/`,
  logo: abs(org.logo),
  image: abs(site.defaultImage),
  description: 'Sustainable corporate gifting company in India: eco-friendly, artisan-made corporate gifts and hampers, custom branded with your logo and delivered pan-India and internationally. 100+ clients in 5+ countries.',
  email: org.email,
  telephone: org.phone,
  priceRange: '₹199–₹3,999 per kit',
  address: { '@type': 'PostalAddress', streetAddress: 'B-Hub, 5th Floor, A Block, Mauryalok Complex', addressLocality: 'Patna', addressRegion: 'Bihar', postalCode: '800001', addressCountry: 'IN' },
  areaServed: [{ '@type': 'Country', name: 'India' }, 'Worldwide'],
  knowsAbout: ['corporate gifting', 'eco-friendly corporate gifts', 'sustainable gift hampers', 'employee welcome kits', 'Diwali corporate gifts', 'custom logo branding', 'ESG and CSR gifting'],
  contactPoint: [{ '@type': 'ContactPoint', contactType: 'sales', email: org.email, telephone: org.phone, areaServed: 'IN', availableLanguage: ['English', 'Hindi'] }],
  sameAs: (org.sameAs ?? []).filter(Boolean),
};
const website = { '@type': 'WebSite', '@id': `${BASE}/#website`, url: `${BASE}/`, name: site.siteName, description: site.defaultDescription, inLanguage: 'en-IN', publisher: { '@id': ORG_ID } };

function breadcrumbs(r) {
  if (r.route === '/') return null;
  const items = [{ name: 'Home', url: `${BASE}/` }];
  if (r.route.startsWith('/occasions/')) items.push({ name: 'Occasions', url: `${BASE}/solutions` });
  if (r.route.startsWith('/shop/')) items.push({ name: 'Shop', url: `${BASE}/shop` });
  items.push({ name: r.name, url: pageUrl(r.route) });
  return { '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })) };
}

function faqFor(route) {
  const list = route === '/occasions/depawali-gifting'
    ? diwaliFaq.map((f) => ({ q: f.question, a: [f.answer, f.email, f.answerAfterEmail].filter(Boolean).join(' ') }))
    : faqs.pages[route] ?? [];
  if (!list.length) return null;
  return { '@type': 'FAQPage', '@id': `${pageUrl(route)}#faq`, mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}

function productLd(r) {
  const p = r.product;
  const st = store.settings;
  return {
    '@type': 'Product',
    '@id': `${pageUrl(r.route)}#product`,
    name: p.name,
    description: `${p.contents}. Eco-friendly corporate gift kit, custom branded with your logo (print or engraving). Minimum order 25 kits.`,
    image: [abs(p.image)],
    sku: p.id,
    brand: { '@type': 'Brand', name: 'Ecotwist' },
    category: 'Corporate Gifts',
    ...(p.price != null ? {
      offers: {
        '@type': 'Offer',
        url: pageUrl(r.route),
        priceCurrency: 'INR',
        price: p.price,
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        eligibleQuantity: { '@type': 'QuantitativeValue', minValue: Math.min(...st.quantities), unitText: 'kits' },
        seller: { '@id': ORG_ID },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
          shippingRate: { '@type': 'MonetaryAmount', value: st.deliveryFee, currency: 'INR' },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' },
            transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' },
          },
        },
      },
    } : {}),
  };
}

function jsonLdFor(r) {
  const graph = [organization, website, {
    '@type': r.product ? 'ItemPage' : r.route.startsWith('/occasions/') ? 'CollectionPage' : 'WebPage',
    '@id': `${pageUrl(r.route)}#webpage`, url: pageUrl(r.route), name: r.title, description: r.description,
    isPartOf: { '@id': `${BASE}/#website` }, about: { '@id': ORG_ID }, inLanguage: 'en-IN',
    ...(r.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: r.image } } : {}),
  }, breadcrumbs(r), faqFor(r.route), r.product ? productLd(r) : null].filter(Boolean);
  // "<" escaped so the JSON can't close the script tag
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

function headFor(r) {
  const url = site.baseUrl + (r.route === '/' ? '/' : r.route);
  return [
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(r.title)}" />`,
    `<meta property="og:description" content="${esc(r.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    r.image ? `<meta property="og:image" content="${esc(r.image)}" />` : '',
    `<meta name="twitter:title" content="${esc(r.title)}" />`,
    `<meta name="twitter:description" content="${esc(r.description)}" />`,
    r.image ? `<meta name="twitter:image" content="${esc(r.image)}" />` : '',
    r.keywords?.length ? `<meta name="keywords" content="${esc([...new Set(r.keywords)].join(', '))}" />` : '',
    `<script type="application/ld+json" id="page-jsonld">${jsonLdFor(r)}</script>`,
  ].filter(Boolean).join('\n  ');
}

// The built index.html, with its default head tags removed (each page gets its own)
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const stripped = template
  .replace(/<title>[\s\S]*?<\/title>\s*/, '')
  .replace(/<meta\s+(name="description"|property="og:(title|description|url|image)"|name="twitter:(title|description|image)")[^>]*>\s*/g, '')
  .replace(/<link\s+rel="canonical"[^>]*>\s*/g, '');
if (!stripped.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty <div id="root"></div>');

console.log('[prerender] building server bundle…');
await build({
  logLevel: 'warn',
  build: { ssr: 'src/entry-server.tsx', outDir: SSR_OUT, emptyOutDir: true, copyPublicDir: false, rollupOptions: { output: { format: 'es' } } },
});

// Browser-only globals some modules touch at import time
globalThis.window ??= undefined;
const { render } = await import(path.join(SSR_OUT, 'entry-server.js'));

let ok = 0;
const failed = [];
for (const r of routes) {
  try {
    const html = await render(r.route);
    const page = stripped
      .replace('</head>', `  ${headFor(r)}\n</head>`)
      .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
    const file = r.route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, `${r.route.slice(1)}.html`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, page);
    ok++;
  } catch (e) {
    failed.push(`${r.route}: ${String(e?.message ?? e).split('\n')[0]}`);
  }
}

// llms.txt: a plain-text guide to the site for AI assistants and AI search
writeLlmsTxt();

// The client-only fallback for routes that weren't pre-rendered (cart, admin-free 404s…)
fs.writeFileSync(path.join(DIST, 'app.html'), template);
fs.rmSync(SSR_OUT, { recursive: true, force: true });
console.log(`[prerender] ${ok}/${routes.length} pages pre-rendered`);
if (failed.length) console.warn('[prerender] skipped:\n  ' + failed.join('\n  '));

/* ── llms.txt and llms-full.txt (https://llmstxt.org) ───────────────────────
   Generated from the same content as the site, so they never go out of date. */
function writeLlmsTxt() {
  const byRoute = Object.fromEntries(pages.map((p) => [p.route, p]));
  const line = (route) => byRoute[route] ? `- [${byRoute[route].title}](${pageUrl(route)}): ${byRoute[route].description}` : null;
  const occasions = pages.filter((p) => p.route.startsWith('/occasions/')).map((p) => line(p.route));
  const facts = [
    '- Company: Ecotwist Innovations Private Limited, a sustainable corporate gifting company headquartered in Patna, Bihar, India.',
    '- Clients: 100+ companies; gifts delivered across India and to 5+ countries.',
    '- Products: eco-friendly, artisan-made corporate gifts and hampers: cork diaries, bamboo bottles, recycled paper stationery, plantable seed pencils, soya wax candles and diyas, dry fruit jar boxes, jute and pinewood baskets. Plastic-free packaging.',
    `- Pricing: ${activeProducts.length} ready kits from ₹${Math.min(...activeProducts.map((p) => p.price ?? Infinity))} to ₹${Math.max(...activeProducts.map((p) => p.price ?? 0))} per kit, including standard logo branding; GST 18% extra with a GST invoice.`,
    `- Ordering: minimum 25 kits; buy 25/50/100/200/500 online at ${BASE}/shop with secure payment (UPI, cards, net banking); 500+ kits by quote.`,
    '- Branding: logo print, logo engraving or company name; live preview online and a branded mockup emailed for approval within 24 hours.',
    `- Delivery: production 3–7 business days after mockup approval; delivery 3–7 business days across India; free above ₹${store.settings.freeDeliveryAbove}, otherwise ₹${store.settings.deliveryFee}. International shipping available.`,
    `- Contact: ${org.email}, ${org.phone} (call or WhatsApp). Free proposal: ${BASE}/get-proposal`,
  ];
  const short = [
    '# Ecotwist',
    '',
    '> Ecotwist is a sustainable corporate gifting company in India. It designs eco-friendly corporate gifts, employee welcome kits and festive hampers, brands them with the client\'s logo and delivers them pan-India and internationally. Companies can buy online from 25 kits or request a free proposal.',
    '',
    '## Key facts',
    ...facts,
    '',
    '## Main pages',
    ...['/', '/shop', '/solutions', '/products', '/get-proposal', '/impact', '/contact', '/blog'].map(line).filter(Boolean),
    '',
    '## Corporate gifts by occasion',
    ...occasions,
    '',
    '## Policies',
    ...['/shipping-policy', '/refund-policy', '/terms-of-service', '/privacy-policy'].map(line).filter(Boolean),
    '',
    '## Optional',
    `- [Full product list with prices and FAQs](${BASE}/llms-full.txt)`,
    `- [Sitemap](${BASE}/sitemap.xml)`,
    '',
  ].join('\n');

  const qa = Object.entries(faqs.pages).flatMap(([route, list]) => [`### ${byRoute[route]?.title ?? route} (${pageUrl(route)})`, ...list.map((f) => `**${f.q}**\n${f.a}\n`), '']);
  const groups = {};
  for (const p of activeProducts) for (const o of p.occasions) (groups[o] ??= []).push(p);
  const catalogue = Object.entries(groups).sort().flatMap(([o, list]) => [`### ${o}`, ...list.map((p) => `- [${p.name}](${pageUrl(`/shop/${p.id}`)}): ${p.price != null ? `₹${p.price} per kit` : 'price on request'}. ${p.contents}.`), '']);
  const full = [short, '## Frequently asked questions', '', ...qa, '## Catalogue: ready kits by occasion', '', ...catalogue].join('\n');

  fs.writeFileSync(path.join(DIST, 'llms.txt'), short);
  fs.writeFileSync(path.join(DIST, 'llms-full.txt'), full);
}
