import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, ExternalLink, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Button, Card, CardTitle, Field, Input, PageHeader, Spinner, Textarea } from '../ui';
import { ImageField } from '../website/ImageField';
import { DESC_LIMITS, SITE_ROUTES, TITLE_LIMITS, TONE_TEXT, editFix, fullTitle, lengthTone, normalizeRoute, scorePage, type SeoFile, type SeoSite } from './checks';
import { loadSiteSeo, type PageFile } from './data';
import { PageSeoFields } from './PageSeoPanel';
import { CharCount, CheckList, GooglePreview, ScoreBadge, SocialPreview, useSeoFile, withPage } from './shared';

// Ask before closing the tab with unsaved changes
function useUnloadWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);
}

function SiteSettings({ seo, onChange }: { seo: SeoFile; onChange: (site: SeoSite) => void }) {
  const site = seo.site;
  const org = site.organization;
  const set = (patch: Partial<SeoSite>) => onChange({ ...site, ...patch });
  const setOrg = (patch: Partial<SeoSite['organization']>) => set({ organization: { ...org, ...patch } });
  const defTitleLen = site.defaultTitle.trim().length;

  return (
    <div className="grid gap-5 p-5 md:grid-cols-2">
      <Field label="Site name"><Input value={site.siteName} onChange={(e) => set({ siteName: e.target.value })} /></Field>
      <Field label="Title template" hint="%s is replaced by the page title. Titles that already contain the site name are used as they are.">
        <Input value={site.titleTemplate} onChange={(e) => set({ titleTemplate: e.target.value })} />
      </Field>
      <div>
        <div className="mb-1.5 flex justify-between"><span className="text-sm font-semibold">Default title</span><CharCount len={defTitleLen} limits={TITLE_LIMITS} /></div>
        <Input value={site.defaultTitle} onChange={(e) => set({ defaultTitle: e.target.value })} />
      </div>
      <Field label="Website address" hint="Used for canonical links and share previews."><Input value={site.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} /></Field>
      <div className="md:col-span-2">
        <div className="mb-1.5 flex justify-between"><span className="text-sm font-semibold">Default description</span><CharCount len={site.defaultDescription.trim().length} limits={DESC_LIMITS} /></div>
        <Textarea rows={2} value={site.defaultDescription} onChange={(e) => set({ defaultDescription: e.target.value })} />
      </div>
      <ImageField label="Default share image (1200×630)" value={site.defaultImage} onChange={(defaultImage) => set({ defaultImage })} folder="seo" />
      <div className="space-y-5">
        <Field label="Google verification code" hint="From Search Console → HTML tag: only the part inside content=&quot;…&quot;. See SEO → Tools.">
          <Input value={site.googleSiteVerification} onChange={(e) => set({ googleSiteVerification: e.target.value.replace(/^.*content="([^"]+)".*$/, '$1').trim() })} placeholder="e.g. a1B2c3D4…" />
        </Field>
        <Field label="Business name (for Google)"><Input value={org.name} onChange={(e) => setOrg({ name: e.target.value })} /></Field>
      </div>
      <Field label="Business email"><Input type="email" value={org.email} onChange={(e) => setOrg({ email: e.target.value })} /></Field>
      <Field label="Business phone"><Input value={org.phone} onChange={(e) => setOrg({ phone: e.target.value })} /></Field>
      <ImageField label="Logo (square)" value={org.logo} onChange={(logo) => setOrg({ logo })} folder="seo" />
      <Field label="Social profiles" hint="One address per line. Helps Google connect them to the business.">
        <Textarea rows={4} value={org.sameAs.join('\n')} onChange={(e) => setOrg({ sameAs: e.target.value.split('\n').map((s) => s.trim()) })}
          onBlur={() => setOrg({ sameAs: org.sameAs.filter(Boolean) })} />
      </Field>
    </div>
  );
}

export function SeoPages() {
  const [params, setParams] = useSearchParams();
  const { seo, setSeo, dirty, save, saving, load, error, conflict } = useSeoFile();
  const [files, setFiles] = useState<PageFile[]>([]);
  const [showSite, setShowSite] = useState(false);
  const [newRoute, setNewRoute] = useState('');
  const open = params.get('route');
  useUnloadWarning(dirty);

  // Page text for the content checks in each score
  useEffect(() => {
    loadSiteSeo().then((d) => setFiles(d.pages)).catch(() => {});
  }, []);
  const fileFor = useMemo(() => new Map(files.filter((f) => f.route).map((f) => [normalizeRoute(f.route!), f])), [files]);

  // Scroll to the page opened from a "Fix" link
  useEffect(() => {
    if (open && seo) document.getElementById(`seo-${open}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [open, !!seo]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (route: string) => setParams(open === route ? {} : { route }, { replace: true });

  const header = (
    <PageHeader eyebrow="SEO" title="Titles & descriptions" subtitle="What Google and share previews show for each page. Saved changes go live in a couple of minutes."
      actions={<Button onClick={() => save()} disabled={!dirty || saving}><Save size={16} /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</Button>} />
  );

  if (error) return <>{header}<Card className="p-5 text-sm text-red-700">{error}</Card></>;
  if (!seo) return <>{header}<Spinner /></>;

  const missing = SITE_ROUTES.filter((r) => !seo.pages.some((p) => normalizeRoute(p.route) === r));

  const addPage = (route: string) => {
    const r = normalizeRoute(route.trim().startsWith('/') ? route.trim() : `/${route.trim()}`);
    if (seo.pages.some((p) => normalizeRoute(p.route) === r)) return toggle(r);
    setSeo(withPage(seo, r, {}));
    setNewRoute('');
    setParams({ route: r }, { replace: true });
  };

  return (
    <div className="pb-10">
      {header}

      {conflict && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>Someone else saved the SEO settings while you were editing. Copy anything you need, then reload to see their changes.</p>
          <Button variant="danger" onClick={() => load()}><RotateCcw size={16} /> Reload</Button>
        </Card>
      )}

      <Card className="mb-6 overflow-hidden">
        <button type="button" onClick={() => setShowSite(!showSite)} className="flex w-full items-center justify-between gap-3 border-b border-admin-line px-5 py-4 text-left">
          <span>
            <span className="block font-serif text-2xl font-medium">Site settings</span>
            <span className="text-xs text-gray-500">Defaults, title template, Google verification, business details for search results.</span>
          </span>
          {showSite ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        {showSite && <SiteSettings seo={seo} onChange={(site) => setSeo({ ...seo, site })} />}
      </Card>

      <Card className="overflow-hidden">
        <CardTitle action={<span className="text-gray-500">{seo.pages.length} pages</span>}>Pages</CardTitle>
        <ul className="divide-y divide-admin-line">
          {seo.pages.map((page) => {
            const file = fileFor.get(normalizeRoute(page.route));
            const result = scorePage({ page, site: seo.site, pages: seo.pages, content: file?.content });
            const isOpen = open === page.route;
            const tLen = page.title.trim() ? fullTitle(seo.site, page.title).length : 0;
            const dLen = page.description.trim().length;
            return (
              <li key={page.route} id={`seo-${page.route}`} className="scroll-mt-6">
                <button type="button" onClick={() => toggle(page.route)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3 text-left hover:bg-admin-bg">
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {page.route}{page.noindex && <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">noindex</span>}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      <span className={TONE_TEXT[lengthTone(tLen, TITLE_LIMITS)]}>{tLen}</span> · <span className={TONE_TEXT[lengthTone(dLen, DESC_LIMITS)]}>{dLen}</span> · {page.title || 'No title'}
                    </span>
                  </span>
                  <ScoreBadge score={result.score} />
                </button>
                {isOpen && (
                  <div className="grid gap-6 border-t border-admin-line bg-admin-bg/50 p-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-4">
                      <PageSeoFields site={seo.site} page={page} onChange={(patch) => setSeo(withPage(seo, page.route, patch))} />
                      <Field label="Canonical page (optional)" hint="Only if this page is a copy of another one, e.g. /product → /products.">
                        <Input value={page.canonical ?? ''} placeholder="Leave empty" onChange={(e) => setSeo(withPage(seo, page.route, { canonical: e.target.value.trim() || undefined }))} />
                      </Field>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <a href={page.route} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-olive hover:underline">View page <ExternalLink size={12} /></a>
                        {file && <Link to={`${editFix(file.path)}`} className="text-brand-olive hover:underline">Edit page text</Link>}
                        <Button variant="ghost" className="ml-auto !px-2 !py-1 text-red-700" onClick={() => {
                          if (confirm(`Remove the SEO entry for ${page.route}? The site defaults will be used.`)) setSeo({ ...seo, pages: seo.pages.filter((p) => p.route !== page.route) });
                        }}><Trash2 size={14} /> Remove</Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <GooglePreview site={seo.site} page={page} />
                      <SocialPreview site={seo.site} page={page} />
                      <Card className="p-4">
                        <p className="mb-3 flex items-center justify-between font-serif text-xl">Score <ScoreBadge score={result.score} /></p>
                        <CheckList checks={result.checks} />
                        {!file && <p className="mt-3 text-xs text-gray-500">This page has no editable text file, so heading, text and alt checks are skipped.</p>}
                      </Card>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2 border-t border-admin-line px-5 py-4">
          {missing.map((r) => <Button key={r} variant="secondary" className="!py-1.5" onClick={() => addPage(r)}><Plus size={14} /> {r}</Button>)}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newRoute.trim()) addPage(newRoute); }}>
            <Input value={newRoute} onChange={(e) => setNewRoute(e.target.value)} placeholder="/new-page" className="!w-48 !py-1.5" />
            <Button type="submit" variant="secondary" className="!py-1.5"><Plus size={14} /> Add page</Button>
          </form>
        </div>
      </Card>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <p className="text-sm text-gray-500">You have unsaved SEO changes.</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => confirm('Throw away your changes?') && load()} disabled={saving}>Discard</Button>
              <Button onClick={() => save()} disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
