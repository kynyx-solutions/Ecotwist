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

const seo = JSON.parse(fs.readFileSync('src/content/seo.json', 'utf8'));
const store = JSON.parse(fs.readFileSync('src/content/store.json', 'utf8'));
const site = seo.site;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const abs = (u) => (!u ? '' : /^https?:/.test(u) ? u : site.baseUrl + (u.startsWith('/') ? '' : '/') + encodeURI(u));

// Routes to render
const pages = seo.pages.filter((p) => !p.noindex && (!p.canonical || p.canonical === p.route));
const routes = pages.map((p) => ({
  route: p.route,
  title: p.route === '/' ? `${p.title} | ${site.siteName}` : site.titleTemplate.replace('%s', p.title),
  description: p.description || site.defaultDescription,
  image: abs(p.image || site.defaultImage),
}));
for (const p of store.products.filter((x) => x.active)) {
  routes.push({
    route: `/shop/${p.id}`,
    title: `${p.name}: Branded Corporate Gift Kit | Ecotwist`,
    description: `${p.contents}. Custom branded with your logo, from 25 to 500+ kits${p.price != null ? `, from ₹${p.price} per kit` : ''}.`.slice(0, 300),
    image: abs(p.image),
  });
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

// The client-only fallback for routes that weren't pre-rendered (cart, admin-free 404s…)
fs.writeFileSync(path.join(DIST, 'app.html'), template);
fs.rmSync(SSR_OUT, { recursive: true, force: true });
console.log(`[prerender] ${ok}/${routes.length} pages pre-rendered`);
if (failed.length) console.warn('[prerender] skipped:\n  ' + failed.join('\n  '));
