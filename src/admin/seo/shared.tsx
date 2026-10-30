import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../ui';
import { absoluteUrl } from '../../lib/seo';
import { clearSiteSeoCache } from './data';
import { SEO_PATH, TONE_BG, TONE_TEXT, clip, fullTitle, lengthTone, scoreTone, type SeoCheck, type SeoFile, type SeoPage, type SeoSite } from './checks';

/* ── Loading and saving src/content/seo.json ──────────────────── */

type Loaded = { path: string; content: SeoFile; sha: string };
const CONFLICT = 'Someone else saved';

export function useSeoFile() {
  const toast = useToast();
  const [seo, setSeo] = useState<SeoFile | null>(null);
  const [saved, setSaved] = useState('');
  const [sha, setSha] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError('');
    setConflict(false);
    return api<Loaded>(`/api/admin/content?path=${encodeURIComponent(SEO_PATH)}`)
      .then((f) => {
        const content = { ...f.content, pages: f.content.pages ?? [] };
        setSeo(content);
        setSaved(JSON.stringify(content));
        setSha(f.sha);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = seo !== null && JSON.stringify(seo) !== saved;

  // Returns true when saved
  const save = useCallback(async (next?: SeoFile) => {
    const content = next ?? seo;
    if (!content) return false;
    setSaving(true);
    try {
      const res = await api<{ sha: string; message: string }>('/api/admin/content', {
        method: 'PUT',
        body: { path: SEO_PATH, content, sha, message: 'Update SEO settings from the admin' },
      });
      setSha(res.sha);
      clearSiteSeoCache();
      setSeo(content);
      setSaved(JSON.stringify(content));
      toast(`SEO saved. ${res.message}`);
      return true;
    } catch (err) {
      const message = (err as Error).message;
      if (message.startsWith(CONFLICT)) setConflict(true);
      toast(message, true);
      return false;
    } finally {
      setSaving(false);
    }
  }, [seo, sha, toast]);

  return { seo, setSeo, dirty, save, saving, load, error, conflict };
}

// Updates one page entry (creates it when the route has none yet)
export function withPage(seo: SeoFile, route: string, patch: Partial<SeoPage>): SeoFile {
  const exists = seo.pages.some((p) => p.route === route);
  const pages = exists
    ? seo.pages.map((p) => (p.route === route ? { ...p, ...patch } : p))
    : [...seo.pages, { route, title: '', description: '', image: '', noindex: false, focusKeyword: '', ...patch }];
  return { ...seo, pages };
}


/* ── Small pieces ─────────────────────────────────────────────── */

export function CharCount({ len, limits }: { len: number; limits: { min: number; max: number } }) {
  const tone = lengthTone(len, limits);
  return (
    <span className={`text-xs font-semibold tabular-nums ${TONE_TEXT[tone]}`}>
      {len} / {limits.min}–{limits.max}
    </span>
  );
}

export function ScoreBadge({ score, className = '' }: { score: number; className?: string }) {
  return (
    <span title="SEO score" className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${TONE_BG[scoreTone(score)]} ${className}`}>
      {score}
    </span>
  );
}

const RING: Record<string, string> = { good: '#1F7A43', ok: '#C98A0B', bad: '#C2362B' };

export function ScoreRing({ score, size = 96, label }: { score: number | null; size?: number; label?: string }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const s = score ?? 0;
  const color = score === null ? '#C9C5B8' : RING[scoreTone(s)];
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? 'Score'}: ${score ?? 'not run'}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ECE9E0" strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={`${(c * s) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="font-serif" fontSize={size * 0.3} fill={color}>
          {score ?? '–'}
        </text>
      </svg>
      {label && <span className="text-center text-xs font-semibold uppercase tracking-[0.1em] text-gray-600">{label}</span>}
    </div>
  );
}

export function CheckList({ checks }: { checks: SeoCheck[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((c) => {
        const Icon = c.status === 'pass' ? CheckCircle2 : c.status === 'warn' ? AlertTriangle : XCircle;
        const color = c.status === 'pass' ? 'text-emerald-700' : c.status === 'warn' ? 'text-amber-600' : 'text-red-600';
        return (
          <li key={c.id} className="flex gap-2 text-sm">
            <Icon size={16} className={`mt-0.5 shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-brand-charcoal">{c.label}</p>
              {c.fix && <p className="text-xs text-gray-500">{c.fix}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Previews ─────────────────────────────────────────────────── */

const displayUrl = (site: SeoSite, route: string) => {
  const host = site.baseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return route === '/' ? host : `${host} › ${route.replace(/^\//, '').split('/').join(' › ')}`;
};

export function GooglePreview({ site, page }: { site: SeoSite; page: SeoPage }) {
  const title = fullTitle(site, page.title);
  const desc = page.description || site.defaultDescription;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 font-[arial,sans-serif]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">Google result</p>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
          <img src={site.organization.logo || '/site/navigation/logo.png'} alt="" className="h-5 w-5 rounded-full object-contain" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm text-[#202124]">{site.siteName}</p>
          <p className="truncate text-xs text-[#4d5156]">{displayUrl(site, page.route)}</p>
        </div>
      </div>
      <p className="mt-1.5 text-xl leading-snug text-[#1a0dab]">{clip(title, 62)}</p>
      <p className="mt-0.5 text-sm leading-snug text-[#4d5156]">{clip(desc, 160)}</p>
      {page.noindex && <p className="mt-2 text-xs font-semibold text-red-600">Hidden from Google: this page won't appear in results.</p>}
    </div>
  );
}

export function SocialPreview({ site, page }: { site: SeoSite; page: SeoPage }) {
  const img = page.image || site.defaultImage;
  const src = img ? (/^https?:/.test(img) ? img : img.replace(/ /g, '%20')) : '';
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">WhatsApp / LinkedIn / Facebook share</p>
      <div className="m-3 overflow-hidden rounded-md border border-gray-200">
        <div className="aspect-[1.91/1] bg-admin-muted">
          {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-gray-500">No image</div>}
        </div>
        <div className="bg-[#F2F3F5] px-3 py-2">
          <p className="truncate text-[11px] uppercase text-gray-500">{absoluteUrl(site, '/').replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
          <p className="truncate text-sm font-semibold text-[#1d2129]">{fullTitle(site, page.title)}</p>
          <p className="line-clamp-2 text-xs text-gray-600">{page.description || site.defaultDescription}</p>
        </div>
      </div>
      {!page.image && <p className="px-4 pb-3 text-xs text-gray-500">Using the site's default share image.</p>}
    </div>
  );
}
