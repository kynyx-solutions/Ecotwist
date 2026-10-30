import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Card, CardTitle, PageHeader, Select, Spinner } from '../ui';
import { SITE_ROUTES } from './checks';

const BASE = 'https://ecotwist.in';

const ext = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-olive hover:underline">
    {label} <ExternalLink size={12} />
  </a>
);

type SitemapUrl = { loc: string; lastmod: string };

function useText(path: string) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(path, { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${path} returned ${r.status}`))))
      .then(setText)
      .catch((e: Error) => setError(e.message));
  }, [path]);
  return { text, error };
}

const parseXml = (text: string) => new DOMParser().parseFromString(text, 'application/xml');

// Reads /sitemap.xml; when it's an index, also reads each sitemap it lists
// (pages and blog) and returns all their addresses together
function useSitemapUrls() {
  const [urls, setUrls] = useState<SitemapUrl[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const get = (path: string) =>
      fetch(path, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${path} returned ${r.status}`))));
    const entries = (doc: Document) =>
      Array.from(doc.getElementsByTagName('url')).map((u) => ({
        loc: u.getElementsByTagName('loc')[0]?.textContent ?? '',
        lastmod: u.getElementsByTagName('lastmod')[0]?.textContent ?? '',
      }));
    get('/sitemap.xml')
      .then(async (text) => {
        const doc = parseXml(text);
        const children = Array.from(doc.getElementsByTagName('sitemap')).map((n) => n.getElementsByTagName('loc')[0]?.textContent ?? '');
        if (!children.length) return entries(doc);
        // Fetch from this site (works on localhost too), not the live address in the index
        const lists = await Promise.all(children.map((loc) => get(new URL(loc).pathname).then((t) => entries(parseXml(t)))));
        return lists.flat();
      })
      .then(setUrls)
      .catch((e: Error) => setError(e.message));
  }, []);
  return { urls, error };
}

export function SeoTools() {
  const [route, setRoute] = useState('/');
  const sitemap = useSitemapUrls();
  const robots = useText('/robots.txt');
  const pageUrl = `${BASE}${route}`;

  const urls = sitemap.urls ?? [];

  return (
    <>
      <PageHeader eyebrow="SEO" title="Search tools" subtitle="Connect the site to Google and Bing, and test pages with their tools." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle action={ext('https://search.google.com/search-console', 'Open')}>Google Search Console</CardTitle>
          <div className="space-y-3 p-5 text-sm">
            <p className="text-gray-600">Shows which searches bring people to the site, and any pages Google can't index. Set it up once:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Open {ext('https://search.google.com/search-console', 'Search Console')} and click <strong>Add property</strong>.</li>
              <li>Choose <strong>URL prefix</strong> and enter <code className="rounded bg-admin-muted px-1">{BASE}/</code>.</li>
              <li>Under <strong>Other verification methods</strong>, pick <strong>HTML tag</strong>. Copy only the code inside <code className="rounded bg-admin-muted px-1">content="…"</code>.</li>
              <li>Paste it in <Link to="/seo/pages" className="font-semibold text-brand-olive hover:underline">SEO → Pages → Site settings → Google verification code</Link> and save.</li>
              <li>Wait about 2 minutes for the site to update, then click <strong>Verify</strong> in Search Console.</li>
              <li>Then submit the sitemap (below).</li>
            </ol>
            <p className="text-xs text-gray-500">If the domain is already verified with a DNS record (e.g. in your domain provider), you can skip the code.</p>
          </div>
        </Card>

        <Card>
          <CardTitle action={ext('https://www.bing.com/webmasters', 'Open')}>Bing Webmaster Tools</CardTitle>
          <div className="space-y-3 p-5 text-sm">
            <p className="text-gray-600">Bing also feeds DuckDuckGo, Yahoo and ChatGPT search.</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Open {ext('https://www.bing.com/webmasters', 'Bing Webmaster Tools')} and sign in.</li>
              <li>Choose <strong>Import from Google Search Console</strong> (easiest, once Google is verified), or add <code className="rounded bg-admin-muted px-1">{BASE}</code> by hand.</li>
              <li>Submit the sitemap under <strong>Sitemaps</strong>.</li>
            </ol>
          </div>
        </Card>

        <Card>
          <CardTitle>Test a page</CardTitle>
          <div className="space-y-4 p-5 text-sm">
            <Select value={route} onChange={(e) => setRoute(e.target.value)}>
              {SITE_ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <ul className="space-y-2">
              <li>{ext(`https://search.google.com/test/rich-results?url=${encodeURIComponent(pageUrl)}`, 'Rich Results Test')} <span className="text-gray-500">: checks the structured data (organization, articles).</span></li>
              <li>{ext(`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(pageUrl)}&form_factor=mobile`, 'Mobile-friendliness (PageSpeed / Lighthouse)')} <span className="text-gray-500">: Google retired its separate Mobile-Friendly Test; this replaces it.</span></li>
              <li><Link to="/seo/speed" className="font-semibold text-brand-olive hover:underline">Page speed here in the admin</Link></li>
              <li>{ext(`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(`${BASE}/`)}&id=${encodeURIComponent(pageUrl)}`, 'URL Inspection in Search Console')} <span className="text-gray-500">: ask Google to (re)index the page after a big change.</span></li>
              <li>{ext(`https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(pageUrl)}`, 'LinkedIn Post Inspector')} · {ext(`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(pageUrl)}`, 'Facebook Sharing Debugger')} <span className="text-gray-500">: refresh share previews.</span></li>
              <li>{ext(`https://www.google.com/search?q=${encodeURIComponent(`site:${pageUrl.replace(/^https?:\/\//, '')}`)}`, 'Is it on Google?')} <span className="text-gray-500">: a site: search for this page.</span></li>
            </ul>
          </div>
        </Card>

        <Card>
          <CardTitle>Submit the sitemap</CardTitle>
          <div className="space-y-3 p-5 text-sm">
            <p className="text-gray-600">The sitemap lists every page and blog article so search engines find new ones quickly. Pages are rebuilt on every deploy; articles are added within an hour of publishing.</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>In Search Console, open <strong>Indexing → Sitemaps</strong>.</li>
              <li>Enter <code className="rounded bg-admin-muted px-1">sitemap.xml</code> and click <strong>Submit</strong>.</li>
              <li>Do the same in Bing Webmaster Tools. You only need to do this once.</li>
            </ol>
            <p>{ext(`${BASE}/sitemap.xml`, 'Live sitemap.xml')} · {ext(`${BASE}/robots.txt`, 'Live robots.txt')}</p>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CardTitle action={<span className="text-gray-500">{urls.length} pages</span>}>sitemap.xml</CardTitle>
          {sitemap.error ? <p className="p-5 text-sm text-red-700">{sitemap.error}</p> : !sitemap.urls ? <Spinner /> : (
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-[0.1em] text-gray-600">
                  <tr className="border-b border-admin-line"><th className="px-5 py-2 font-semibold">Address</th><th className="px-5 py-2 font-semibold">Last changed</th></tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {urls.map((u) => (
                    <tr key={u.loc}>
                      <td className="px-5 py-2"><a href={u.loc} target="_blank" rel="noreferrer" className="break-all hover:underline">{u.loc.replace(BASE, '') || '/'}</a></td>
                      <td className="whitespace-nowrap px-5 py-2 text-gray-600">{u.lastmod || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="h-fit overflow-hidden">
          <CardTitle>robots.txt</CardTitle>
          {robots.error ? <p className="p-5 text-sm text-red-700">{robots.error}</p> : robots.text === null ? <Spinner /> : (
            <pre className="overflow-auto whitespace-pre-wrap bg-admin-bg p-5 text-xs leading-relaxed">{robots.text}</pre>
          )}
          <p className="border-t border-admin-line px-5 py-3 text-xs text-gray-500">Tells search engines what not to crawl (the admin and thank-you page). Changed by the developer only.</p>
        </Card>
      </div>
    </>
  );
}
