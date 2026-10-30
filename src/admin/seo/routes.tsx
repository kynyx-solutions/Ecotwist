import { SeoDashboard } from './SeoDashboard';
import { SeoPages } from './SeoPages';
import { SeoSpeed } from './SeoSpeed';
import { SeoTools } from './SeoTools';

export { SeoDashboard, SeoPages, SeoSpeed, SeoTools };
export { PageSeoPanel } from './PageSeoPanel';

// Mount inside <Routes>: {seoRoutes.map((r) => <Route key={r.path} {...r} />)}
export const seoRoutes = [
  { path: '/seo', element: <SeoDashboard /> },
  { path: '/seo/pages', element: <SeoPages /> }, // ?route=/occasions/... opens that page
  { path: '/seo/speed', element: <SeoSpeed /> },
  { path: '/seo/tools', element: <SeoTools /> },
];

// Sidebar items, same shape as GROUPS in src/admin/Layout.tsx
export const seoNavItems = [
  { to: '/seo', label: 'SEO health', match: (p: string) => p === '/seo' },
  { to: '/seo/pages', label: 'Titles & descriptions', match: (p: string) => p.startsWith('/seo/pages') },
  { to: '/seo/speed', label: 'Page speed', match: (p: string) => p.startsWith('/seo/speed') },
  { to: '/seo/tools', label: 'Search tools', match: (p: string) => p.startsWith('/seo/tools') },
];
