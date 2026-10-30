// /sitemap-blog.xml (rewritten here in vercel.json): every published blog article,
// read live from Supabase so new articles appear without a redeploy (within the hour, see cache below).
// Uses the public anon key: the database only returns published, already-due posts.

const BASE_URL = 'https://ecotwist.in';

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  let posts = [];

  if (url && key) {
    try {
      const r = await fetch(
        `${url}/rest/v1/posts?select=slug,updated_at,published_at,cover_image,title&status=eq.published&noindex=eq.false&order=published_at.desc&limit=5000`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      if (r.ok) posts = await r.json();
      else console.error('[sitemap-blog] posts query failed', r.status, await r.text());
    } catch (err) {
      console.error('[sitemap-blog] posts query failed', err);
    }
  }

  const entries = posts.map((p) => {
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
  // Cached at the edge for an hour; a new article shows up within the hour at most
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>
`);
}
