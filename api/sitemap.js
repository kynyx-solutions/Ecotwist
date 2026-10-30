// /sitemap.xml (rewritten here in vercel.json): one sitemap with every page and
// every published blog article.
//   Pages come from the SEO settings (src/content/seo.json, edited in Admin → SEO),
//   leaving out pages marked noindex or whose canonical address is another page.
//   Articles are read live from Supabase with the public key, which only returns
//   published, already-due posts, so new articles appear without a redeploy.
import fs from 'fs';
import path from 'path';

// Bundled with the function through "includeFiles" in vercel.json
function seoPages() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/content/seo.json'), 'utf8')).pages ?? [];
  } catch (err) {
    console.error('[sitemap] could not read src/content/seo.json', err);
    return [{ route: '/' }]; // still serve a valid sitemap (home + blog) rather than an error
  }
}

const BASE_URL = 'https://ecotwist.in';

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

function pageMeta(route) {
  if (route === '/') return { priority: '1.0', changefreq: 'weekly' };
  if (['/solutions', '/products', '/get-proposal'].includes(route)) return { priority: '0.9', changefreq: 'weekly' };
  if (route.startsWith('/occasions/') || route === '/blog') return { priority: '0.8', changefreq: 'weekly' };
  if (['/impact', '/contact'].includes(route)) return { priority: '0.8', changefreq: 'monthly' };
  if (route.endsWith('-policy') || route === '/terms-of-service') return { priority: '0.5', changefreq: 'yearly' };
  return { priority: '0.7', changefreq: 'monthly' };
}

async function publishedPosts() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const r = await fetch(
      `${url}/rest/v1/posts?select=slug,updated_at,published_at,cover_image,title&status=eq.published&noindex=eq.false&order=published_at.desc&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (r.ok) return await r.json();
    console.error('[sitemap] posts query failed', r.status, await r.text());
  } catch (err) {
    console.error('[sitemap] posts query failed', err);
  }
  return []; // pages are still listed if the blog can't be read
}

export default async function handler(req, res) {
  const pages = seoPages()
    .filter((p) => !p.noindex && (!p.canonical || p.canonical === p.route))
    .map((p) => p.route)
    .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));

  const pageEntries = pages.map((route) => {
    const { priority, changefreq } = pageMeta(route);
    return `  <url>
    <loc>${BASE_URL}${route === '/' ? '/' : route}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  const postEntries = (await publishedPosts()).map((p) => {
    const lastmod = (p.updated_at || p.published_at || '').slice(0, 10);
    const image = p.cover_image
      ? `\n    <image:image>\n      <image:loc>${xmlEscape(p.cover_image)}</image:loc>\n      <image:title>${xmlEscape(p.title)}</image:title>\n    </image:image>`
      : '';
    return `  <url>
    <loc>${BASE_URL}/blog/${xmlEscape(p.slug)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>${image}
  </url>`;
  });

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Cached at the edge for an hour, so a new article is listed within the hour
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[...pageEntries, ...postEntries].join('\n')}
</urlset>
`);
}
