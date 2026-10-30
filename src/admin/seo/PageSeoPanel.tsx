import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Save } from 'lucide-react';
import { Button, Card, CardTitle, Field, Input, Spinner, Textarea } from '../ui';
import { ImageField } from '../website/ImageField';
import { DESC_LIMITS, TITLE_LIMITS, findPageOrBlank, fullTitle, scorePage, type SeoPage, type SeoSite } from './checks';
import { CharCount, CheckList, GooglePreview, ScoreRing, SocialPreview, useSeoFile, withPage } from './shared';

// Title / description / keyword / image / noindex inputs for one page
export function PageSeoFields({ site, page, onChange }: { site: SeoSite; page: SeoPage; onChange: (patch: Partial<SeoPage>) => void }) {
  const titleLen = page.title.trim() ? fullTitle(site, page.title).length : 0;
  return (
    <div className="space-y-4">
      <Field label="Focus keyword" hint="The search phrase this page should rank for, e.g. “diwali corporate gifts”.">
        <Input value={page.focusKeyword ?? ''} onChange={(e) => onChange({ focusKeyword: e.target.value })} placeholder="e.g. employee onboarding kits" />
      </Field>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-brand-charcoal">SEO title</span>
          <CharCount len={titleLen} limits={TITLE_LIMITS} />
        </div>
        <Input value={page.title} onChange={(e) => onChange({ title: e.target.value })} placeholder={site.defaultTitle} />
        <p className="mt-1 text-xs text-gray-500">Shown as: “{fullTitle(site, page.title)}”. The count includes “{site.titleTemplate.replace('%s', '').trim()}”.</p>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-brand-charcoal">Meta description</span>
          <CharCount len={page.description.trim().length} limits={DESC_LIMITS} />
        </div>
        <Textarea rows={3} value={page.description} onChange={(e) => onChange({ description: e.target.value })} placeholder={site.defaultDescription} />
      </div>
      <ImageField label="Share image (1200×630 JPG/PNG)" value={page.image} onChange={(image) => onChange({ image })} folder="seo" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-olive" checked={page.noindex} onChange={(e) => onChange({ noindex: e.target.checked })} />
        <span>
          <span className="font-semibold">Hide from Google (noindex)</span>
          <span className="block text-xs text-gray-500">Only for pages like the thank-you page that shouldn't show up in search.</span>
        </span>
      </label>
    </div>
  );
}

/**
 * SEO for one page of the site, used inside the Website → Pages editor.
 * Loads and saves src/content/seo.json itself (its own "Save SEO" button).
 * `content` is the page JSON being edited, so the score updates as they type.
 */
export function PageSeoPanel({ route, content, onDirtyChange, onScore }: {
  route: string;
  content?: unknown;
  onDirtyChange?: (dirty: boolean) => void;
  onScore?: (score: number) => void;
}) {
  const { seo, setSeo, dirty, save, saving, load, error, conflict } = useSeoFile();
  const page = seo ? findPageOrBlank(seo, route) : null;
  const result = useMemo(() => (seo && page ? scorePage({ page, site: seo.site, pages: seo.pages, content }) : null), [seo, page, content]);

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    if (result) onScore?.(result.score);
  }, [result, onScore]);

  if (error) return <Card className="p-5 text-sm text-red-700">SEO settings couldn't be loaded: {error}</Card>;
  if (!seo || !page || !result) return <Spinner label="Loading SEO…" />;

  return (
    <div className="space-y-6">
      {conflict && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>Someone else saved the SEO settings while you were editing. Copy what you need, then reload.</p>
          <Button variant="danger" onClick={load}><RotateCcw size={16} /> Reload SEO</Button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardTitle action={<Link to={`/seo/pages?route=${encodeURIComponent(route)}`} className="hover:underline">All pages →</Link>}>Search & sharing</CardTitle>
          <div className="space-y-6 p-5">
            <PageSeoFields site={seo.site} page={page} onChange={(patch) => setSeo(withPage(seo, route, patch))} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-line pt-4">
              <p className="text-sm text-gray-500">{dirty ? 'SEO changes not saved yet.' : 'SEO saved.'} SEO is saved separately from the page text.</p>
              <Button onClick={() => save()} disabled={!dirty || saving}><Save size={16} /> {saving ? 'Saving…' : 'Save SEO'}</Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <ScoreRing score={result.score} size={84} />
              <div>
                <p className="font-serif text-2xl leading-tight">Page SEO score</p>
                <p className="text-xs text-gray-500">Updates as you type: page text, headings and alt texts count too.</p>
              </div>
            </div>
            <div className="mt-4"><CheckList checks={result.checks} /></div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GooglePreview site={seo.site} page={page} />
        <SocialPreview site={seo.site} page={page} />
      </div>
    </div>
  );
}
