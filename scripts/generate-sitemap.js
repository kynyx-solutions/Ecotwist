import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const BASE_URL = 'https://ecotwist.in';
// sitemap.xml is an index pointing at the page list (built here) and the blog
// list (served live by api/sitemap-blog.js, so new articles appear at once)
const INDEX_PATH = path.join(rootDir, 'public', 'sitemap.xml');
const PAGES_PATH = path.join(rootDir, 'public', 'sitemap-pages.xml');
const SEO_PATH = path.join(rootDir, 'src', 'content', 'seo.json');
const APP_PATH = path.join(rootDir, 'src', 'App.tsx');
const PUBLIC_DIR = path.join(rootDir, 'public');

/**
 * Determine SEO priority and change frequency based on the route
 */
function getRouteMetadata(route) {
  if (route === '/') {
    return { priority: '1.0', changefreq: 'weekly' };
  }
  if (['/solutions', '/products', '/get-proposal'].includes(route)) {
    return { priority: '0.9', changefreq: 'weekly' };
  }
  if (route.startsWith('/occasions/')) {
    return { priority: '0.8', changefreq: 'weekly' };
  }
  if (['/impact', '/contact'].includes(route)) {
    return { priority: '0.8', changefreq: 'monthly' };
  }
  if (['/privacy-policy', '/terms-of-service', '/refund-policy', '/shipping-policy'].includes(route)) {
    return { priority: '0.5', changefreq: 'yearly' };
  }
  if (route.endsWith('.pdf') || route.includes('/catalogue') || route.includes('/catalog')) {
    return { priority: '0.8', changefreq: 'monthly' };
  }
  return { priority: '0.7', changefreq: 'monthly' };
}

/**
 * Extract all active routes from src/App.tsx
 */
function extractRoutesFromApp() {
  if (!fs.existsSync(APP_PATH)) {
    console.warn(`[sitemap] App.tsx not found at ${APP_PATH}`);
    return [];
  }

  const content = fs.readFileSync(APP_PATH, 'utf-8');
  const routeRegex = /<Route\s+[^>]*path=["']([^"']+)["']/g;
  const routes = new Set();
  let match;

  // Non-indexable or private paths to exclude
  // '/configurator' is the old address of /get-proposal and only redirects
  const excludedPaths = new Set(['/thanks', '/configurator', '*', '/*']);

  while ((match = routeRegex.exec(content)) !== null) {
    const rawPath = match[1].trim();
    if (!excludedPaths.has(rawPath) && !rawPath.includes(':')) {
      // Normalize path
      const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      routes.add(normalizedPath);
    }
  }

  // Ensure root exists
  routes.add('/');
  return Array.from(routes);
}

/**
 * Scan public folder for catalog PDFs and downloadable catalog files
 */
function extractCataloguesFromPublic() {
  const catalogues = [];

  function scanDir(dir, relativePath = '') {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const rel = path.join(relativePath, item.name).replace(/\\/g, '/');

      if (item.isDirectory()) {
        // Skip hidden or build directories
        if (!item.name.startsWith('.')) {
          scanDir(fullPath, rel);
        }
      } else if (item.isFile()) {
        const lower = item.name.toLowerCase();
        // Index PDFs or files placed in catalog/catalogue folders
        if (
          lower.endsWith('.pdf') ||
          rel.toLowerCase().includes('catalog') ||
          rel.toLowerCase().includes('catalogue')
        ) {
          // If it's a PDF, add to sitemap
          if (lower.endsWith('.pdf')) {
            catalogues.push(`/${encodeURI(rel)}`);
          }
        }
      }
    }
  }

  scanDir(PUBLIC_DIR);
  return catalogues;
}

/**
 * Generate full sitemap XML string
 */
export function generateSitemapXml() {
  const currentDate = new Date().toISOString().split('T')[0];

  const routes = extractRoutesFromApp();
  const catalogues = extractCataloguesFromPublic();

  // Leave out pages marked noindex in the SEO settings, and pages whose
  // canonical address is another page (e.g. /product → /products)
  const seoPages = fs.existsSync(SEO_PATH) ? JSON.parse(fs.readFileSync(SEO_PATH, 'utf-8')).pages ?? [] : [];
  const hidden = new Set(seoPages.filter((p) => p.noindex || (p.canonical && p.canonical !== p.route)).map((p) => p.route));

  // Combine unique URLs
  const allUrls = Array.from(new Set([...routes, ...catalogues])).filter((u) => !hidden.has(u));

  // Sort URLs logically (home first, then priority)
  allUrls.sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });

  const urlEntries = allUrls.map((urlPath) => {
    const { priority, changefreq } = getRouteMetadata(urlPath);
    const loc = urlPath === '/' ? `${BASE_URL}/` : `${BASE_URL}${urlPath}`;

    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>
`;
}

export function generateSitemapIndex() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-pages.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-blog.xml</loc>
  </sitemap>
</sitemapindex>
`;
}

/**
 * Write public/sitemap.xml (index) and public/sitemap-pages.xml
 */
export function writeSitemap() {
  fs.writeFileSync(PAGES_PATH, generateSitemapXml(), 'utf-8');
  fs.writeFileSync(INDEX_PATH, generateSitemapIndex(), 'utf-8');
  console.log(`[sitemap] Wrote ${INDEX_PATH} and ${PAGES_PATH}`);
}

// Run when called directly (npm run generate:sitemap), not when imported by vite.config.ts
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  writeSitemap();
}
