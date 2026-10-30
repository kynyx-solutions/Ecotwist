import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RotateCcw, Save } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, PageHeader, Spinner, useToast } from '../ui';
import { ContentForm, PRODUCTS, SITE_IMAGES, CLIENTS, TESTIMONIALS, prepareForSave } from './editors';
import type { JsonObject } from './schema';
import { PageSeoPanel } from '../seo/PageSeoPanel';
import { ScoreBadge } from '../seo/shared';

type Loaded = { path: string; content: JsonObject; sha: string };

const TITLES: Record<string, string> = {
  [PRODUCTS]: 'Product catalogue',
  [SITE_IMAGES]: 'Photos to add',
  [CLIENTS]: 'Client logos',
  [TESTIMONIALS]: 'Testimonials',
};

const CONFLICT = 'Someone else saved';

// Ask before leaving with unsaved changes: closing the tab, or clicking any link in the admin
function useLeaveWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const msg = 'You have unsaved changes. Leave without saving?';
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
      if (!confirm(msg)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
}

export function WebsiteEditor() {
  const [params] = useSearchParams();
  const path = params.get('path') ?? '';
  const toast = useToast();

  const [file, setFile] = useState<Loaded | null>(null);
  const [content, setContent] = useState<JsonObject | null>(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'content' | 'seo'>(params.get('tab') === 'seo' ? 'seo' : 'content');
  const [seoDirty, setSeoDirty] = useState(false);
  const [seoScore, setSeoScore] = useState<number | null>(null);

  const load = useCallback(() => {
    setFile(null);
    setError('');
    setConflict(false);
    api<Loaded>(`/api/admin/content?path=${encodeURIComponent(path)}`)
      .then((f) => {
        setFile(f);
        setContent(f.content);
        setSaved(JSON.stringify(f.content));
      })
      .catch((err: Error) => setError(err.message));
  }, [path]);

  useEffect(() => {
    if (path) load();
  }, [path, load]);

  const dirty = content !== null && JSON.stringify(content) !== saved;
  useLeaveWarning(dirty || seoDirty);

  const save = async () => {
    if (!file || !content) return;
    setSaving(true);
    try {
      const next = prepareForSave(path, content);
      const res = await api<{ sha: string; message: string }>('/api/admin/content', {
        method: 'PUT',
        body: { path, content: next, sha: file.sha },
      });
      setFile({ ...file, sha: res.sha });
      setContent(next);
      setSaved(JSON.stringify(next));
      toast(`Saved. ${res.message}`);
    } catch (err) {
      const message = (err as Error).message;
      if (message.startsWith(CONFLICT)) setConflict(true);
      toast(message, true);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (confirm('Throw away your changes and reload this page?')) load();
  };

  const back = (
    <Link to="/website" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-olive hover:underline">
      <ArrowLeft size={14} /> Website
    </Link>
  );

  if (!path) return <>{back}<p className="text-sm text-gray-500">No page chosen.</p></>;
  if (error) return <>{back}<Card className="p-5 text-sm text-red-700">{error}</Card></>;
  if (!file || !content) return <Spinner />;

  const meta = (content._meta ?? {}) as { label?: string; route?: string };
  const route = meta.route ?? (path === PRODUCTS ? '/products' : undefined);

  return (
    <>
      {back}
      <PageHeader
        title={meta.label ?? TITLES[path] ?? path}
        subtitle={path}
        actions={
          route && (
            <a href={route} target="_blank" rel="noreferrer">
              <Button variant="secondary"><ExternalLink size={16} /> View on site</Button>
            </a>
          )
        }
      />

      {conflict && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>Someone else saved this page while you were editing. Copy anything you need, then reload to see their changes.</p>
          <Button variant="danger" onClick={load}><RotateCcw size={16} /> Reload</Button>
        </Card>
      )}

      {/* Pages of the site also get an SEO tab (title, description, share image: saved to src/content/seo.json) */}
      {meta.route && path.startsWith('src/content/pages/') && (
        <div className="mb-6 flex gap-1 border-b border-admin-line" role="tablist">
          {(['content', 'seo'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === t ? 'border-brand-charcoal text-brand-charcoal' : 'border-transparent text-gray-500 hover:text-brand-charcoal'}`}>
              {t === 'content' ? 'Page content' : 'SEO'}
              {t === 'seo' && seoScore !== null && <ScoreBadge score={seoScore} />}
              {((t === 'content' && dirty) || (t === 'seo' && seoDirty)) && <span className="h-2 w-2 rounded-full bg-brand-gold" title="Unsaved changes" />}
            </button>
          ))}
        </div>
      )}

      <div className={`pb-24 ${tab === 'seo' && meta.route ? 'hidden' : ''}`}>
        <ContentForm path={path} value={content} onChange={setContent} />
      </div>
      {meta.route && path.startsWith('src/content/pages/') && (
        <div className={`pb-24 ${tab === 'seo' ? '' : 'hidden'}`}>
          <PageSeoPanel route={meta.route} content={content} onDirtyChange={setSeoDirty} onScore={setSeoScore} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <p className="text-sm text-gray-500">{dirty ? 'You have unsaved page changes.' : 'All page changes saved.'}{seoDirty ? ' SEO changes: use “Save SEO” on the SEO tab.' : ''}</p>
          <div className="flex gap-2">
            {dirty && <Button variant="ghost" onClick={discard} disabled={saving}>Discard</Button>}
            <Button onClick={save} disabled={!dirty || saving}>
              <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
