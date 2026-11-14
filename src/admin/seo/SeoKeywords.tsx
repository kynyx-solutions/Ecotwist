import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { DownloadCloud, Lightbulb, Plus, Search, Trash2, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, CardTitle, Input, PageHeader, Select, Spinner, StatCard, useToast } from '../ui';
import type { SeoFile } from './checks';
import { loadSiteSeo } from './data';
import { COVERAGE, ENDPOINT, EXTRA_TEXT, TRENDING, buildPages, coverageFor, guessIntent, routeLabel, suggestedSet, type Faqs, type Keyword, type Kind, type NewKeyword, type PageInfo, type Status } from './keywords';

/* ============================
   SEO → Keywords
   The target and trending phrases Ecotwist wants to rank for, the page each
   one should rank on, and whether that page actually uses the phrase.
   Stored in Supabase (supabase/08-keywords.sql) through /api/admin/seo.
   Tracking a keyword changes nothing on the website by itself.
============================ */

function usePages() {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [seo, setSeo] = useState<SeoFile | null>(null);
  useEffect(() => {
    const read = <T,>(path: string) => api<{ content: T }>(`/api/admin/content?path=${encodeURIComponent(path)}`).then((r) => r.content).catch(() => null);
    const extraRoutes = Object.keys(EXTRA_TEXT);
    Promise.all([loadSiteSeo(), read<{ pages?: Faqs }>('src/content/faqs.json'), Promise.all(extraRoutes.map((r) => read<unknown>(EXTRA_TEXT[r])))])
      .then(([d, faqs, extras]) => {
        setSeo(d.seo);
        setPages(buildPages(d.seo, d.pages, faqs?.pages, Object.fromEntries(extraRoutes.map((r, i) => [r, extras[i]]))));
      })
      .catch(() => {});
  }, []);
  return { pages, seo };
}

/* ── Screen ───────────────────────────────────────────────────── */

const Pill = ({ children, className }: { children: string; className: string }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>
);

export function SeoKeywords() {
  const toast = useToast();
  const { pages, seo } = usePages();
  const [items, setItems] = useState<Keyword[] | null>(null);
  const [error, setError] = useState('');
  const [kind, setKind] = useState('');
  const [cov, setCov] = useState('');
  const [q, setQ] = useState('');
  const [importing, setImporting] = useState(false);
  const [draft, setDraft] = useState<{ term: string; kind: Kind; page: string }>({ term: '', kind: 'target', page: '' });

  const load = useCallback(() => {
    api<{ items: Keyword[] }>(ENDPOINT)
      .then((r) => { setItems(r.items); setError(''); })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const suggested = useMemo(() => suggestedSet(seo, pages), [seo, pages]);
  const tracked = useMemo(() => new Set((items ?? []).map((k) => k.term.toLowerCase())), [items]);
  const untracked = suggested.filter((k) => !tracked.has(k.term)).length;

  const rows = useMemo(
    () =>
      (items ?? [])
        .map((k) => ({ k, coverage: coverageFor(k, pages) }))
        .filter((r) => !kind || r.k.kind === kind)
        .filter((r) => !cov || r.coverage === cov)
        .filter((r) => !q.trim() || r.k.term.includes(q.trim().toLowerCase()) || r.k.page.includes(q.trim().toLowerCase())),
    [items, pages, kind, cov, q],
  );

  const stats = useMemo(() => {
    const all = (items ?? []).map((k) => coverageFor(k, pages));
    return {
      total: all.length,
      strong: all.filter((c) => c === 'strong').length,
      gaps: all.filter((c) => c !== 'strong').length,
      top10: (items ?? []).filter((k) => k.position != null && k.position <= 10).length,
    };
  }, [items, pages]);

  async function add(list: NewKeyword[], quiet = false) {
    const r = await api<{ created: number; skipped: number }>(ENDPOINT, { method: 'POST', body: { items: list } });
    if (!quiet) toast(r.created ? `Added ${r.created} keyword${r.created > 1 ? 's' : ''}${r.skipped ? ` (${r.skipped} already tracked)` : ''}.` : 'Already tracked.');
    load();
    return r;
  }

  async function importSuggested() {
    setImporting(true);
    try {
      await add(suggested);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setImporting(false);
    }
  }

  async function track(term: string, kindValue: Kind = 'trending', page = '') {
    const t = term.trim().toLowerCase();
    if (t.length < 2) return;
    try {
      await add([{ term: t, kind: kindValue, intent: guessIntent(t), page, status: 'planned' }]);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function update(k: Keyword, patch: Partial<Keyword>) {
    const next = { ...k, ...patch };
    setItems((list) => list?.map((x) => (x.id === k.id ? next : x)) ?? null);
    try {
      await api(`${ENDPOINT}&id=${k.id}`, { method: 'PUT', body: next });
    } catch (e) {
      toast((e as Error).message, true);
      load();
    }
  }

  async function remove(k: Keyword) {
    if (!confirm(`Stop tracking “${k.term}”? Nothing on the website changes.`)) return;
    setItems((list) => list?.filter((x) => x.id !== k.id) ?? null);
    try {
      await api(`${ENDPOINT}&id=${k.id}`, { method: 'DELETE' });
    } catch (e) {
      toast((e as Error).message, true);
      load();
    }
  }

  const submitNew = async (e: FormEvent) => {
    e.preventDefault();
    await track(draft.term, draft.kind, draft.page);
    setDraft((d) => ({ ...d, term: '' }));
  };

  const pageOptions = pages.map((p) => <option key={p.route} value={p.route}>{routeLabel(p.route)}</option>);

  return (
    <>
      <PageHeader
        eyebrow="SEO"
        title="Keywords"
        subtitle="Target and trending searches, the page each one should rank on, and whether that page actually uses the phrase."
        actions={
          <Button variant="secondary" onClick={importSuggested} disabled={importing || !seo || untracked === 0}>
            <DownloadCloud size={16} /> {importing ? 'Adding…' : untracked ? `Add suggested (${untracked})` : 'Suggested set added'}
          </Button>
        }
      />

      {error && <Card className="mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tracked" value={stats.total} />
        <StatCard label="Well covered" value={stats.strong} />
        <StatCard label="Need work" value={stats.gaps} tone={stats.gaps ? 'warn' : undefined} note={stats.gaps ? 'Partial, missing or no page' : undefined} />
        <StatCard label="On Google page 1" value={stats.top10} note="Position 1–10, from Search Console" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <form onSubmit={submitNew} className="grid gap-2 sm:grid-cols-[1fr_130px_200px_auto]">
              <Input value={draft.term} onChange={(e) => setDraft({ ...draft, term: e.target.value })} placeholder="Add a keyword, e.g. eco friendly gifts for employees" aria-label="New keyword" />
              <Select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })} aria-label="Type">
                <option value="target">Target</option>
                <option value="trending">Trending</option>
              </Select>
              <Select value={draft.page} onChange={(e) => setDraft({ ...draft, page: e.target.value })} aria-label="Page">
                <option value="">Choose page later</option>
                {pageOptions}
              </Select>
              <Button type="submit" disabled={draft.term.trim().length < 2}><Plus size={16} /> Add</Button>
            </form>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search keywords or pages" className="pl-9" aria-label="Search keywords" />
            </div>
            <Select value={kind} onChange={(e) => setKind(e.target.value)} className="!w-36" aria-label="Type">
              <option value="">All types</option>
              <option value="target">Target</option>
              <option value="trending">Trending</option>
            </Select>
            <Select value={cov} onChange={(e) => setCov(e.target.value)} className="!w-40" aria-label="Coverage">
              <option value="">Any coverage</option>
              {Object.entries(COVERAGE).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </Select>
            {(kind || cov || q) && <span className="text-sm text-gray-500">{rows.length} shown</span>}
          </div>

          <Card className="overflow-hidden">
            {!items && !error && <Spinner />}
            {items && items.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="font-serif text-2xl">No keywords tracked yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                  Start with the suggested set: every page's focus keyword and other keywords from Titles &amp; descriptions, plus {TRENDING.length} trending gifting searches.
                </p>
                <Button className="mt-5" onClick={importSuggested} disabled={importing || !seo}><DownloadCloud size={16} /> Add suggested keywords</Button>
              </div>
            )}
            {items && items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-sm">
                  <thead className="border-b border-admin-line bg-admin-muted/50 text-left text-xs uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Keyword</th>
                      <th className="px-3 py-3 font-semibold">Page</th>
                      <th className="px-3 py-3 font-semibold">On the page</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold" title="Average Google position, from Search Console → Performance">Google pos.</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-line">
                    {rows.map(({ k, coverage }) => {
                      const page = pages.find((p) => p.route === k.page);
                      return (
                        <tr key={k.id} className="align-middle hover:bg-admin-muted/30">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-brand-charcoal">{k.term}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                              {k.kind === 'trending' ? <Pill className="bg-brand-gold/20 text-[#7a5a1e]">Trending</Pill> : <Pill className="bg-brand-beige text-brand-olive">Target</Pill>}
                              <span className="capitalize">{k.intent}</span>
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <Select value={k.page} onChange={(e) => update(k, { page: e.target.value })} className="!w-52 !py-1.5 text-xs" aria-label={`Page for ${k.term}`}>
                              <option value="">No page yet</option>
                              {pageOptions}
                              {k.page && !page && <option value={k.page}>{k.page}</option>}
                            </Select>
                          </td>
                          <td className="px-3 py-2.5">
                            <span title={COVERAGE[coverage].hint}><Pill className={COVERAGE[coverage].cls}>{COVERAGE[coverage].label}</Pill></span>
                            {page && coverage !== 'strong' && (
                              <Link to={page.fixUrl} className="ml-2 text-xs font-semibold text-brand-olive hover:underline">{page.fixLabel}</Link>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <Select value={k.status} onChange={(e) => update(k, { status: e.target.value as Status })} className="!w-32 !py-1.5 text-xs" aria-label={`Status for ${k.term}`}>
                              <option value="planned">Planned</option>
                              <option value="optimized">Optimised</option>
                              <option value="ranking">Ranking</option>
                            </Select>
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              key={`${k.id}-${k.position}`}
                              type="number"
                              min={1}
                              max={1000}
                              defaultValue={k.position ?? ''}
                              onBlur={(e) => {
                                const v = e.target.value ? Math.round(Number(e.target.value)) : null;
                                if (v !== k.position) void update(k, { position: v, status: v && v <= 20 ? 'ranking' : k.status });
                              }}
                              className="!w-20 !py-1.5 text-xs"
                              aria-label={`Google position for ${k.term}`}
                            />
                          </td>
                          <td className="px-2">
                            <button type="button" onClick={() => remove(k)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Stop tracking ${k.term}`}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No keywords match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <p className="text-xs text-gray-500">
            “On the page” checks the page's title, description, headline, text, alt text and FAQs for the exact phrase. Google positions come from{' '}
            <a href="https://search.google.com/search-console/performance/search-analytics" target="_blank" rel="noreferrer" className="font-semibold text-brand-olive hover:underline">Search Console → Performance</a>; type them in once a month.
          </p>
        </div>

        <IdeasPanel tracked={tracked} onTrack={(t) => track(t)} />
      </div>
    </>
  );
}

/* ── Trending ideas from Google Autocomplete ──────────────────── */

const COUNTRIES = [['in', 'India'], ['ae', 'UAE'], ['us', 'United States'], ['gb', 'United Kingdom'], ['sg', 'Singapore'], ['au', 'Australia'], ['ca', 'Canada']];

interface Ideas { seed: string; groups: { label: string; ideas: string[] }[]; total: number }

function IdeasPanel({ tracked, onTrack }: { tracked: Set<string>; onTrack: (term: string) => void }) {
  const [seed, setSeed] = useState('corporate gifts');
  const [gl, setGl] = useState('in');
  const [deep, setDeep] = useState(false);
  const [data, setData] = useState<Ideas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      setData(await api<Ideas>(`/api/admin/seo?tool=ideas&q=${encodeURIComponent(seed)}&gl=${gl}${deep ? '&deep=1' : ''}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="self-start">
      <CardTitle><span className="flex items-center gap-2"><TrendingUp size={18} className="text-brand-gold" /> Trending ideas</span></CardTitle>
      <div className="p-5">
        <form onSubmit={run} className="space-y-3">
          <Input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="A topic, e.g. diwali gifts for employees" aria-label="Topic" />
          <div className="flex flex-wrap items-center gap-3">
            <Select value={gl} onChange={(e) => setGl(e.target.value)} className="!w-40 !py-2 text-xs" aria-label="Country">
              {COUNTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} className="accent-brand-olive" /> Long tail (a–z)
            </label>
          </div>
          <Button type="submit" disabled={loading || seed.trim().length < 2} className="w-full"><Lightbulb size={16} /> {loading ? 'Searching…' : 'Find ideas'}</Button>
        </form>
        <p className="mt-3 text-xs text-gray-500">
          From Google Autocomplete: real searches people type right now. It shows demand, not search volume; check volume in Google Keyword Planner or Search Console.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {data && (
          <div className="mt-4 max-h-[560px] space-y-4 overflow-y-auto pr-1">
            {data.groups.length === 0 && <p className="text-sm text-gray-500">No suggestions. Try a broader topic.</p>}
            {data.groups.map((g) => (
              <div key={g.label}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">{g.label}</p>
                <ul className="space-y-0.5">
                  {g.ideas.map((idea) => (
                    <li key={idea} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-admin-muted/60">
                      <span className="min-w-0 truncate" title={idea}>{idea}</span>
                      {tracked.has(idea) ? (
                        <span className="shrink-0 text-xs font-semibold text-emerald-700">Tracked</span>
                      ) : (
                        <button type="button" onClick={() => onTrack(idea)} className="shrink-0 text-xs font-semibold text-brand-olive hover:underline">+ Track</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
