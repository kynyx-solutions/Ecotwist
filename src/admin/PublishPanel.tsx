import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, CircleAlert, ImageIcon, FileText, Loader2, Rocket, X } from 'lucide-react';
import { api, DRAFTS_CHANGED } from './lib/api';
import { Button, timeAgo, useToast } from './ui';

/* ============================
   "Publish changes" in the admin sidebar.
   Saving a page, SEO or the store prices keeps a draft; new photos wait too.
   This shows how many are waiting and publishes them all at once: one
   GitHub commit, so Vercel redeploys the site once (api/admin/publish.js).
============================ */

type Draft = { path: string; kind: 'json' | 'file'; label: string | null; updated_by: string | null; updated_at: string };
type Last = { commit_sha: string; commit_url: string | null; files: { path: string; label: string | null }[]; published_by: string | null; created_at: string; status: 'building' | 'live' | 'failed' | 'unknown' };

const STATUS = {
  building: { text: 'Going live… (about 2 minutes)', icon: Loader2, cls: 'text-brand-gold', spin: true },
  live: { text: 'Live on the website', icon: CheckCircle2, cls: 'text-[#9fc27a]', spin: false },
  failed: { text: 'The site update failed: ask the developer', icon: CircleAlert, cls: 'text-red-300', spin: false },
  unknown: { text: 'Published', icon: CheckCircle2, cls: 'text-[#9fc27a]', spin: false },
};

export function PublishPanel() {
  const toast = useToast();
  const location = useLocation();
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [last, setLast] = useState<Last | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const poll = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(() => {
    api<{ drafts: Draft[]; last: Last | null }>('/api/admin/publish')
      .then((d) => { setDrafts(d.drafts); setLast(d.last); setError(''); })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh, location.pathname]);
  useEffect(() => {
    window.addEventListener(DRAFTS_CHANGED, refresh);
    return () => window.removeEventListener(DRAFTS_CHANGED, refresh);
  }, [refresh]);

  // While the site is building, check again every 15 seconds
  useEffect(() => {
    clearTimeout(poll.current);
    if (last?.status === 'building') poll.current = setTimeout(refresh, 15000);
    return () => clearTimeout(poll.current);
  }, [last, refresh]);

  const publish = async () => {
    setPublishing(true);
    try {
      const res = await api<{ message: string }>('/api/admin/publish', { method: 'POST' });
      toast(res.message);
      setOpen(false);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setPublishing(false);
      refresh();
    }
  };

  const discard = async (d: Draft) => {
    if (!confirm(`Throw away the unpublished changes to "${d.label ?? d.path}"? The live version stays as it is.`)) return;
    try {
      await api(`/api/admin/content?path=${encodeURIComponent(d.path)}`, { method: 'DELETE' });
      toast('Draft discarded.');
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const count = drafts?.length ?? 0;
  const status = last && STATUS[last.status];

  return (
    <div className="mx-4 mb-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
      {error ? (
        <p className="text-xs text-red-300">{error}</p>
      ) : count > 0 ? (
        <>
          <p className="mb-2 text-[#E8E4D8]">
            <span className="font-semibold text-brand-gold">{count}</span> change{count > 1 ? 's' : ''} waiting to go live
          </p>
          <button
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-gold px-3 py-2 font-semibold text-brand-charcoal transition hover:brightness-105"
          >
            <Rocket size={15} /> Publish changes
          </button>
        </>
      ) : drafts ? (
        <p className="text-xs text-[#8F9283]">No unpublished changes.</p>
      ) : (
        <p className="text-xs text-[#8F9283]">Checking for changes…</p>
      )}
      {status && (
        <p className={`mt-2 flex items-center gap-1.5 text-xs ${status.cls}`} title={last.commit_url ?? undefined}>
          <status.icon size={13} className={status.spin ? 'animate-spin' : ''} />
          {last.status === 'building' || last.status === 'failed' ? status.text : `Last published ${timeAgo(last.created_at)}`}
        </p>
      )}

      {open && drafts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-brand-charcoal" onClick={() => !publishing && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="publish-title" className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 id="publish-title" className="font-serif text-2xl">Publish changes</h2>
                <p className="mt-1 text-sm text-gray-500">These go live together. The website updates about 2 minutes after you publish.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <ul className="max-h-[50vh] divide-y divide-gray-100 overflow-y-auto">
              {drafts.map((d) => {
                const Icon = d.kind === 'file' ? ImageIcon : FileText;
                return (
                  <li key={d.path} className="flex items-center gap-3 px-5 py-3">
                    <Icon size={16} className="shrink-0 text-brand-olive" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.kind === 'file' ? `New photo: ${d.label}` : d.label ?? d.path}</p>
                      <p className="truncate text-xs text-gray-500">{d.updated_by ?? 'staff'} · {timeAgo(d.updated_at)}</p>
                    </div>
                    <button onClick={() => discard(d)} disabled={publishing} className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600" aria-label={`Discard ${d.label ?? d.path}`} title="Discard this change">
                      <X size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={publishing}>Not yet</Button>
              <Button onClick={publish} disabled={publishing}>
                <Rocket size={16} /> {publishing ? 'Publishing…' : `Publish ${drafts.length} change${drafts.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
