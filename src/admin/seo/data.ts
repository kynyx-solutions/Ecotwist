// Loads seo.json and every page file through /api/admin/content, for the scores
// on the SEO dashboard and the Website → Pages list.
import { api } from '../lib/api';
import { SEO_PATH, findPageOrBlank, normalizeRoute, scorePage, type SeoFile } from './checks';

export type ContentFile = { path: string; label: string; group: string; route?: string };
export type PageFile = ContentFile & { content: unknown };

export interface SiteSeoData {
  seo: SeoFile;
  files: ContentFile[];
  pages: PageFile[]; // files under src/content/pages
  scores: Map<string, number>; // page file path → 0–100
}

let cache: { at: number; promise: Promise<SiteSeoData> } | null = null;

export function loadSiteSeo(fresh = false): Promise<SiteSeoData> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.promise;
  const promise = (async () => {
    const [files, seoFile] = await Promise.all([
      api<ContentFile[]>('/api/admin/content'),
      api<{ content: SeoFile }>(`/api/admin/content?path=${encodeURIComponent(SEO_PATH)}`),
    ]);
    const seo = { ...seoFile.content, pages: seoFile.content.pages ?? [] };
    const pageFiles = files.filter((f) => f.path.startsWith('src/content/pages/'));
    const pages = await Promise.all(
      pageFiles.map((f) =>
        api<{ content: unknown }>(`/api/admin/content?path=${encodeURIComponent(f.path)}`)
          .then((r) => ({ ...f, content: r.content }))
          .catch(() => ({ ...f, content: undefined })),
      ),
    );
    const scores = new Map<string, number>();
    for (const p of pages) {
      if (!p.route) continue;
      const page = findPageOrBlank(seo, normalizeRoute(p.route));
      scores.set(p.path, scorePage({ page, site: seo.site, pages: seo.pages, content: p.content }).score);
    }
    return { seo, files, pages, scores };
  })();
  promise.catch(() => (cache = null));
  cache = { at: Date.now(), promise };
  return promise;
}

export const clearSiteSeoCache = () => {
  cache = null;
};
