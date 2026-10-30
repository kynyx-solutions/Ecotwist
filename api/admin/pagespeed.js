// Google PageSpeed Insights for the admin SEO → Speed screen.
//   GET /api/admin/pagespeed?url=https://ecotwist.in/...&strategy=mobile|desktop
// Returns a trimmed report: scores, Core Web Vitals, top opportunities, failed SEO audits.
// PAGESPEED_API_KEY (optional) raises Google's rate limit; without it the shared quota is used.
import { requireStaff } from '../_lib/admin.js';

// PageSpeed often takes 20–40 s
export const config = { maxDuration: 60 };

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATEGORIES = ['performance', 'seo', 'accessibility', 'best-practices'];
const VITALS = [
  ['largest-contentful-paint', 'LCP', 'Largest Contentful Paint'],
  ['cumulative-layout-shift', 'CLS', 'Cumulative Layout Shift'],
  ['total-blocking-time', 'TBT', 'Total Blocking Time'],
  ['first-contentful-paint', 'FCP', 'First Contentful Paint'],
  ['speed-index', 'SI', 'Speed Index'],
];

const stripLinks = (s = '') => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();

export default async function handler(req, res) {
  const ctx = await requireStaff(req, res);
  if (!ctx) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = String(req.query?.url ?? '').trim();
  const strategy = req.query?.strategy === 'desktop' ? 'desktop' : 'mobile';
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Enter a full web address, e.g. https://ecotwist.in/' });
  }
  if (!/^https?:$/.test(parsed.protocol) || /^(localhost|127\.|0\.|10\.|192\.168\.)/.test(parsed.hostname)) {
    return res.status(400).json({ error: 'PageSpeed can only test public web addresses (not localhost).' });
  }

  const qs = new URLSearchParams({ url: parsed.toString(), strategy });
  for (const c of CATEGORIES) qs.append('category', c);
  if (process.env.PAGESPEED_API_KEY) qs.set('key', process.env.PAGESPEED_API_KEY);

  try {
    const r = await fetch(`${ENDPOINT}?${qs}`, { signal: AbortSignal.timeout(55_000) });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = json?.error?.message ?? `PageSpeed returned ${r.status}`;
      const status = r.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: r.status === 429 ? 'Google PageSpeed is rate-limiting us. Wait a minute, or add PAGESPEED_API_KEY in Vercel.' : `PageSpeed couldn't test this page: ${msg}`,
      });
    }

    const lh = json.lighthouseResult ?? {};
    const audits = lh.audits ?? {};
    const cats = lh.categories ?? {};
    const score = (c) => (cats[c]?.score == null ? null : Math.round(cats[c].score * 100));
    const field = json.loadingExperience?.metrics ?? {};

    const vitals = VITALS.filter(([id]) => audits[id]).map(([id, short, name]) => ({
      id, short, name, value: audits[id].displayValue ?? '', score: audits[id].score,
    }));
    // Real-user INP when Google has field data for the page (most small sites don't)
    const inp = field.INTERACTION_TO_NEXT_PAINT;
    if (inp) vitals.splice(2, 0, { id: 'inp', short: 'INP', name: 'Interaction to Next Paint (real users)', value: `${inp.percentile} ms`, score: inp.category === 'FAST' ? 1 : inp.category === 'AVERAGE' ? 0.5 : 0 });

    const perfRefs = cats.performance?.auditRefs ?? [];
    // Lighthouse 12+ reports savings as metricSavings (ms of LCP/FCP); older versions as details.overallSavingsMs
    const savingsMs = (a) => a.details?.overallSavingsMs ?? Math.max(0, a.metricSavings?.LCP ?? 0, a.metricSavings?.FCP ?? 0);
    const opportunities = Array.from(new Set([...perfRefs.map((r) => r.id), ...Object.keys(audits)]))
      .map((id) => audits[id])
      .filter((a) => a && savingsMs(a) > 0 && (a.score ?? 1) < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable')
      .sort((a, b) => savingsMs(b) - savingsMs(a))
      .slice(0, 5)
      .map((a) => ({ id: a.id, title: a.title, description: stripLinks(a.description), savings: a.displayValue || `Save about ${Math.round(savingsMs(a))} ms` }));

    const failedSeo = (cats.seo?.auditRefs ?? [])
      .map((ref) => audits[ref.id])
      .filter((a) => a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'manual')
      .map((a) => ({ id: a.id, title: a.title, description: stripLinks(a.description) }));

    return res.status(200).json({
      url: lh.finalDisplayedUrl ?? lh.finalUrl ?? parsed.toString(),
      strategy,
      fetchedAt: lh.fetchTime ?? new Date().toISOString(),
      scores: { performance: score('performance'), seo: score('seo'), accessibility: score('accessibility'), bestPractices: score('best-practices') },
      vitals,
      opportunities,
      failedSeo,
    });
  } catch (err) {
    console.error('[admin/pagespeed]', err);
    const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return res.status(504).json({ error: timeout ? 'PageSpeed took too long. Try again.' : 'Could not reach Google PageSpeed. Try again.' });
  }
}
