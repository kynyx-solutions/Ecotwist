import { BlogList } from './BlogList';
import { BlogEditor } from './BlogEditor';

export { BlogList, BlogEditor };

// Mount inside <Routes>: {blogRoutes.map((r) => <Route key={r.path} {...r} />)}
// Sidebar (Website group): { to: '/blog', label: 'Journal', match: (p) => p.startsWith('/blog') }
export const blogRoutes = [
  { path: '/blog', element: <BlogList /> },
  { path: '/blog/new', element: <BlogEditor /> },
  { path: '/blog/:id', element: <BlogEditor /> },
];
