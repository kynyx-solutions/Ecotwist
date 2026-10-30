import { useState, type FormEvent } from 'react';
import { ExternalLink, Gauge, Info } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, CardTitle, Field, Input, PageHeader, Select, Spinner, useToast } from '../ui';
import { SITE_ROUTES } from './checks';
import { ScoreRing } from './shared';

type Strategy = 'mobile' | 'desktop';

export interface SpeedReport {
  url: string;
  strategy: Strategy;
  fetchedAt: string;
  scores: { performance: number | null; seo: number | null; accessibility: number | null; bestPractices: number | null };
  vitals: { id: string; short: string; name: string; value: string; score: number | null }[];
  opportunities: { id: string; title: string; description: string; savings: string }[];
  failedSeo: { id: string; title: string; description: string }[];
}

const BASE = 'https://ecotwist.in';
const STORE = 'ecotwist-admin:pagespeed';

// Last mobile result, for the SEO dashboard
export function lastSpeedResult(): (SpeedReport & { route: string }) | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function remember(r: SpeedReport) {
  try {
    const route = r.url.replace(/^https?:\/\/[^/]+/, '') || '/';
    localStorage.setItem(STORE, JSON.stringify({ ...r, route }));
  } catch {
    /* storage blocked: fine */
  }
}

const vitalColor = (score: number | null) => (score === null ? 'text-gray-600' : score >= 0.9 ? 'text-emerald-700' : score >= 0.5 ? 'text-amber-600' : 'text-red-600');

function Report({ report }: { report: SpeedReport }) {
  const s = report.scores;
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl capitalize">{report.strategy}</h2>
          <p className="text-xs text-gray-500">{new Date(report.fetchedAt).toLocaleString('en-IN')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ScoreRing score={s.performance} label="Performance" />
          <ScoreRing score={s.seo} label="SEO" />
          <ScoreRing score={s.accessibility} label="Accessibility" />
          <ScoreRing score={s.bestPractices} label="Best practices" />
        </div>
      </Card>

      <Card>
        <CardTitle>Core Web Vitals</CardTitle>
        <div className="grid gap-px bg-admin-line sm:grid-cols-2 xl:grid-cols-3">
          {report.vitals.map((v) => (
            <div key={v.id} className="bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">{v.short} · {v.name}</p>
              <p className={`mt-1 font-serif text-3xl ${vitalColor(v.score)}`}>{v.value || '—'}</p>
            </div>
          ))}
        </div>
        <p className="border-t border-admin-line px-5 py-3 text-xs text-gray-500">
          INP needs real-visitor data from Chrome, which Google only has for busier pages; TBT (lab) stands in for it.
        </p>
      </Card>

      <Card>
        <CardTitle>Top opportunities</CardTitle>
        {report.opportunities.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No big speed wins left on this page.</p>
        ) : (
          <ul className="divide-y divide-admin-line">
            {report.opportunities.map((o) => (
              <li key={o.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{o.title}</p>
                  <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{o.savings}</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{o.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Failed SEO checks</CardTitle>
        {report.failedSeo.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">All of Google's automatic SEO checks pass.</p>
        ) : (
          <ul className="divide-y divide-admin-line">
            {report.failedSeo.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <p className="text-sm font-semibold text-red-700">{a.title}</p>
                <p className="mt-1 text-xs text-gray-600">{a.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function SeoSpeed() {
  const toast = useToast();
  const [route, setRoute] = useState('/');
  const [custom, setCustom] = useState('');
  const [running, setRunning] = useState(false);
  const [reports, setReports] = useState<Partial<Record<Strategy, SpeedReport>>>({});
  const [errors, setErrors] = useState<Partial<Record<Strategy, string>>>({});
  const [view, setView] = useState<Strategy>('mobile');

  const url = route === 'custom' ? custom.trim() : `${BASE}${route}`;

  const run = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^https?:\/\//.test(url)) return toast('Enter a full web address starting with https://', true);
    setRunning(true);
    setReports({});
    setErrors({});
    // Both at once: each takes 15–40 seconds
    await Promise.all((['mobile', 'desktop'] as Strategy[]).map(async (strategy) => {
      try {
        const r = await api<SpeedReport>(`/api/admin/pagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`);
        setReports((prev) => ({ ...prev, [strategy]: r }));
        if (strategy === 'mobile') remember(r);
      } catch (err) {
        setErrors((prev) => ({ ...prev, [strategy]: (err as Error).message }));
      }
    }));
    setRunning(false);
  };

  const report = reports[view];

  return (
    <>
      <PageHeader eyebrow="SEO" title="Page speed" subtitle="Google PageSpeed Insights for any page of the site, on mobile and desktop." />

      <Card className="mb-6 flex gap-3 border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <Info size={18} className="mt-0.5 shrink-0" />
        <p>Results are for the <strong>live site</strong> ({BASE}). Changes you save show up here after they go live (about 2 minutes). Scores vary a few points between runs.</p>
      </Card>

      <Card className="mb-6 p-5">
        <form onSubmit={run} className="grid items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Field label="Page">
            <Select value={route} onChange={(e) => setRoute(e.target.value)}>
              {SITE_ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="custom">Other address…</option>
            </Select>
          </Field>
          {route === 'custom' ? (
            <Field label="Web address">
              <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="https://ecotwist.in/blog/..." />
            </Field>
          ) : (
            <div className="truncate pb-3 text-sm text-gray-500">
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{url} <ExternalLink size={12} /></a>
            </div>
          )}
          <Button type="submit" disabled={running}><Gauge size={16} /> {running ? 'Testing…' : 'Run test'}</Button>
        </form>
      </Card>

      {(running || Object.keys(reports).length > 0 || Object.keys(errors).length > 0) && (
        <>
          <div className="mb-4 flex gap-1 border-b border-admin-line">
            {(['mobile', 'desktop'] as Strategy[]).map((s) => (
              <button key={s} type="button" onClick={() => setView(s)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold capitalize ${view === s ? 'border-brand-charcoal' : 'border-transparent text-gray-500 hover:text-brand-charcoal'}`}>
                {s} {reports[s]?.scores.performance != null && <span className="ml-1 text-xs text-gray-500">{reports[s]!.scores.performance}</span>}
              </button>
            ))}
          </div>
          {report ? <Report report={report} /> : errors[view] ? <Card className="p-5 text-sm text-red-700">{errors[view]}</Card> : <Spinner label="Google is loading the page… this takes up to a minute." />}
        </>
      )}
    </>
  );
}
