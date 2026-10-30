import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Gauge, Info, RefreshCw, Wrench } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Card, CardTitle, PageHeader, Spinner, StatCard } from '../ui';
import {
  SITE_ROUTES, altIssues, blogIssues, editFix, findPageOrBlank, healthScore, missingPages, normalizeRoute, pageMetaIssues, scorePage,
  type BlogPostSeo, type SeoIssue, type Severity,
} from './checks';
import { loadSiteSeo } from './data';
import { ScoreBadge, ScoreRing } from './shared';
import { lastSpeedResult } from './SeoSpeed';

interface DashData {
  health: number;
  goodPages: number;
  totalPages: number;
  issues: SeoIssue[];
  blog: { needWork: number; total: number } | null; // null: posts table not set up
  pageRows: { route: string; label: string; score: number; path?: string }[];
}

const SEVERITY: Record<Severity, { label: string; icon: typeof Info; color: string }> = {
  error: { label: 'Fix first', icon: AlertCircle, color: 'text-red-600' },
  warning: { label: 'Should fix', icon: AlertTriangle, color: 'text-amber-600' },
  info: { label: 'Good to know', icon: Info, color: 'text-sky-700' },
};

async function loadDashboard(fresh: boolean): Promise<DashData> {
  const { seo, files, pages } = await loadSiteSeo(fresh);
  const issues: SeoIssue[] = [...missingPages(seo, SITE_ROUTES), ...pageMetaIssues(seo)];

  // Alt texts in every page file
  for (const p of pages) if (p.content) issues.push(...altIssues(p.path, p.label, p.content));

  // Photos still on placeholder, clients without logo
  const [images, clients] = await Promise.all(
    ['src/content/site-images.json', 'src/content/clients.json'].map((path) =>
      files.some((f) => f.path === path)
        ? api<{ content: Record<string, unknown> }>(`/api/admin/content?path=${encodeURIComponent(path)}`).then((r) => r.content).catch(() => null)
        : Promise.resolve(null),
    ),
  );
  const photoList = (images?.images as { image?: string }[] | undefined) ?? [];
  const placeholders = photoList.filter((i) => !i.image).length;
  if (placeholders) issues.push({ severity: 'warning', text: `${placeholders} photo spot${placeholders === 1 ? '' : 's'} still show a placeholder`, detail: 'Real photos help image search and make pages look finished.', fix: editFix('src/content/site-images.json') });
  const clientList = (clients?.clients as { name: string; logo?: string }[] | undefined) ?? [];
  const noLogo = clientList.filter((c) => !c.logo);
  if (noLogo.length) issues.push({ severity: 'info', text: `${noLogo.length} client${noLogo.length === 1 ? '' : 's'} without a logo`, detail: noLogo.map((c) => c.name).join(', '), fix: editFix('src/content/clients.json') });

  // Blog articles (the posts table may not exist yet)
  let blog: DashData['blog'] = null;
  const { data: posts, error } = await supabase.from('posts').select('id, title, seo_score, seo_description, focus_keyword').eq('status', 'published');
  if (!error && posts) {
    const postIssues = blogIssues(posts as BlogPostSeo[]);
    issues.push(...postIssues);
    blog = { needWork: postIssues.length, total: posts.length };
  }

  // Score each route of the site (with its page text when there's a page file for it)
  const fileFor = new Map(pages.filter((p) => p.route).map((p) => [normalizeRoute(p.route!), p]));
  const routes = Array.from(new Set([...SITE_ROUTES, ...seo.pages.map((p) => normalizeRoute(p.route))]));
  const pageRows = routes.map((route) => {
    const file = fileFor.get(route);
    const page = findPageOrBlank(seo, route);
    return { route, label: file?.label ?? route, path: file?.path, score: scorePage({ page, site: seo.site, pages: seo.pages, content: file?.content }).score, noindex: page.noindex };
  });
  const indexable = pageRows.filter((r) => !r.noindex);
  const pageScores = indexable.map((r) => r.score);
  const siteIssues = issues.filter((i) => !i.fix?.startsWith('/seo/pages'));

  return {
    health: healthScore(pageScores, siteIssues),
    goodPages: indexable.filter((r) => r.score >= 80).length,
    totalPages: indexable.length,
    issues,
    blog,
    pageRows: pageRows.sort((a, b) => a.score - b.score),
  };
}

export function SeoDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const speed = lastSpeedResult();

  const load = (fresh = false) => {
    setLoading(true);
    setError('');
    loadDashboard(fresh).then(setData).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => load(), []);

  const header = (
    <PageHeader
      eyebrow="SEO"
      title="Search health"
      subtitle="How ready the site is for Google, and what to fix next."
      actions={
        <>
          <Link to="/seo/pages"><Button variant="secondary"><Wrench size={16} /> Edit titles & descriptions</Button></Link>
          <Button variant="ghost" onClick={() => load(true)} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Recheck</Button>
        </>
      }
    />
  );

  if (error) return <>{header}<Card className="p-5 text-sm text-red-700">{error}</Card></>;
  if (!data) return <>{header}<Spinner label="Checking every page…" /></>;

  const counts = { error: 0, warning: 0, info: 0 } as Record<Severity, number>;
  for (const i of data.issues) counts[i.severity]++;

  return (
    <>
      {header}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="flex flex-col items-center justify-center p-5">
          <ScoreRing score={data.health} size={140} label="SEO health" />
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/seo/pages"><StatCard label="Pages with good meta" value={`${data.goodPages}/${data.totalPages}`} note="Score 80 or more" /></Link>
          <a href="#issues"><StatCard label="Issues found" value={counts.error + counts.warning} note={`${counts.error} to fix first · ${counts.info} notes`} tone={counts.error ? 'warn' : undefined} /></a>
          <Link to="/blog"><StatCard label="Articles needing work" value={data.blog ? data.blog.needWork : '—'}
            note={data.blog ? `Of ${data.blog.total} published` : 'Blog not set up yet'} tone={data.blog?.needWork ? 'warn' : undefined} /></Link>
          <Link to="/seo/speed"><StatCard label="PageSpeed (mobile)" value={speed?.scores.performance ?? '—'}
            note={speed ? `${speed.route} · ${new Date(speed.fetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Not run yet'}
            tone={speed && (speed.scores.performance ?? 100) < 50 ? 'warn' : undefined} /></Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <div id="issues" className="scroll-mt-6" />
          <CardTitle>Issues</CardTitle>
          {data.issues.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500">No issues found. Nice work.</p>
          ) : (
            (['error', 'warning', 'info'] as Severity[]).map((sev) => {
              const rows = data.issues.filter((i) => i.severity === sev);
              if (!rows.length) return null;
              const { label, icon: Icon, color } = SEVERITY[sev];
              return (
                <div key={sev}>
                  <p className={`flex items-center gap-2 border-b border-admin-line bg-admin-bg px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${color}`}>
                    <Icon size={14} /> {label} · {rows.length}
                  </p>
                  <ul className="divide-y divide-admin-line">
                    {rows.map((i, n) => (
                      <li key={`${sev}-${n}`} className="flex items-start justify-between gap-4 px-5 py-3">
                        <div className="min-w-0">
                          <p className="text-sm">{i.text}</p>
                          {i.detail && <p className="truncate text-xs text-gray-500" title={i.detail}>{i.detail}</p>}
                        </div>
                        {i.fix && <Link to={i.fix} className="shrink-0 text-sm font-semibold text-brand-olive hover:underline">Fix →</Link>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </Card>

        <Card className="h-fit overflow-hidden">
          <CardTitle action={<Link to="/seo/pages" className="hover:underline">Edit →</Link>}>Page scores</CardTitle>
          <ul className="divide-y divide-admin-line">
            {data.pageRows.map((r) => (
              <li key={r.route}>
                <Link to={r.path ? `${editFix(r.path)}&tab=seo` : `/seo/pages?route=${encodeURIComponent(r.route)}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-admin-bg">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.label}</p>
                    <p className="truncate text-xs text-gray-500">{r.route}</p>
                  </div>
                  <ScoreBadge score={r.score} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-admin-line px-5 py-3">
            <Link to="/seo/speed" className="inline-flex items-center gap-1 text-sm text-brand-olive hover:underline"><Gauge size={14} /> Test page speed</Link>
          </div>
        </Card>
      </div>
    </>
  );
}
