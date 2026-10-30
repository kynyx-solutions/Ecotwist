import { WebsiteEditor } from './WebsiteEditor';
import { WebsiteHome } from './WebsiteHome';

export { WebsiteEditor, WebsiteHome };

// Mount inside <Routes>: {websiteRoutes.map((r) => <Route key={r.path} {...r} />)}
export const websiteRoutes = [
  { path: '/website', element: <WebsiteHome /> },
  { path: '/website/edit', element: <WebsiteEditor /> }, // ?path=src/content/...
];
