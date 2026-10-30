import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './lib/auth';
import siteImages from '../content/site-images.json';
import { seoNavItems } from './seo/routes';

const PHOTOS_MISSING = siteImages.images.filter((i) => !i.image).length;

const edit = (file: string) => `/website/edit?path=${encodeURIComponent(file)}`;

type Item = { to: string; label: string; badge?: 'leads' | 'photos'; match: (path: string, search: string) => boolean };

const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [{ to: '/', label: 'Dashboard', match: (p) => p === '/' }] },
  {
    title: 'Business',
    items: [
      { to: '/leads', label: 'Leads', badge: 'leads', match: (p) => p.startsWith('/leads') },
      { to: '/customers', label: 'Customers', match: (p) => p.startsWith('/customers') },
      { to: '/orders', label: 'Orders', match: (p) => p.startsWith('/orders') },
    ],
  },
  {
    title: 'Messages',
    items: [
      { to: '/messages', label: 'Sent messages', match: (p) => p === '/messages' },
      { to: '/messages/send', label: 'Send wishes', match: (p) => p === '/messages/send' },
      { to: '/messages/templates', label: 'Templates', match: (p) => p === '/messages/templates' },
    ],
  },
  {
    title: 'Website',
    items: [
      { to: '/blog', label: 'Blog', match: (p) => p.startsWith('/blog') },
      { to: '/website', label: 'Pages', match: (p, s) => p === '/website' || (p === '/website/edit' && s.includes('pages')) },
      { to: edit('src/content/products.json'), label: 'Catalogue', match: (_, s) => s.includes('products.json') },
      { to: edit('src/content/site-images.json'), label: 'Photos to add', badge: 'photos', match: (_, s) => s.includes('site-images') },
      { to: edit('src/content/clients.json'), label: 'Clients', match: (_, s) => s.includes('clients.json') },
      { to: edit('src/content/testimonials.json'), label: 'Testimonials', match: (_, s) => s.includes('testimonials.json') },
    ],
  },
  { title: 'SEO', items: seoNavItems },
  {
    title: 'Settings',
    items: [
      { to: '/staff', label: 'Users & roles', match: (p) => p.startsWith('/staff') },
      { to: '/settings', label: 'Settings', match: (p) => p.startsWith('/settings') },
    ],
  },
];

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

export function Layout({ children }: { children: ReactNode }) {
  const { profile, session } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [newLeads, setNewLeads] = useState(0);

  // Refresh the "new" badge whenever the page changes (e.g. after working a lead)
  useEffect(() => {
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new').neq('type', 'newsletter')
      .then(({ count }) => setNewLeads(count ?? 0));
  }, [location.pathname]);

  const name = profile?.full_name || session?.user.email || '';
  const badge = (b?: Item['badge']) =>
    b === 'leads' && newLeads ? `${newLeads} new` : b === 'photos' && PHOTOS_MISSING ? String(PHOTOS_MISSING) : null;

  const sidebar = (
    <nav className="flex h-full flex-col bg-admin-sidebar text-[#E8E4D8]">
      <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-3 px-6 pb-4 pt-6">
        <img src="/site/navigation/logo.png" alt="" className="h-9 w-9 rounded-full bg-white object-contain p-1" />
        <div>
          <p className="font-serif text-xl tracking-[0.2em]">ECOTWIST</p>
          <p className="text-[10px] font-semibold tracking-[0.25em] text-brand-gold">ADMIN</p>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {GROUPS.map((g) => (
          <div key={g.title} className="mt-4">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8F9283]">{g.title}</p>
            {g.items.map((item) => {
              const active = item.match(location.pathname, location.search);
              const b = badge(item.badge);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`mb-0.5 flex items-center justify-between rounded-md border-l-2 px-3 py-2 text-[15px] transition ${
                    active ? 'border-brand-gold bg-white/[0.06] text-white' : 'border-transparent text-[#D9D6CB] hover:bg-white/[0.04]'
                  }`}
                >
                  {item.label}
                  {b && <span className="text-xs text-brand-gold">{b}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mx-4 border-t border-white/10 px-2 py-4 text-sm">
        <a href="/" target="_blank" rel="noreferrer" className="mb-3 block text-[#D9D6CB] hover:text-white">View website ↗</a>
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold/20 text-xs font-semibold text-brand-gold">{initials(name)}</span>
          <div className="min-w-0">
            <p className="truncate text-white">{name}</p>
            <p className="text-xs capitalize text-[#8F9283]">{profile?.role}</p>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-[#D9D6CB] hover:text-white">Sign out</button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* Phone: top bar + slide-in menu */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-admin-line bg-admin-bg px-4 py-3 lg:hidden">
        <span className="font-serif text-xl tracking-[0.15em]">ECOTWIST</span>
        <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-6 z-10 text-[#E8E4D8]" aria-label="Close menu"><X /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-10">{children}</main>
    </div>
  );
}
