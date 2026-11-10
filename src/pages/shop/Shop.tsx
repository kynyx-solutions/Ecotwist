import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { occasions, products } from '../../lib/store';
import { ProductCard } from './ProductPage';

/* ============================
   Online store listing (/shop): filter by occasion and budget, search, sort.
   Filters live in the URL so links like /shop?occasion=Onboarding work.
============================ */

const C = { ink: '#1f2a17', olive: '#38461B', muted: '#5f6655', line: '#e6e0cf', cream: '#FAF9F6' };

const BUDGETS = [
  { key: '', label: 'Any budget', test: () => true },
  { key: 'u500', label: 'Under ₹500', test: (p: number | null) => p != null && p < 500 },
  { key: '500-1000', label: '₹500–1,000', test: (p: number | null) => p != null && p >= 500 && p <= 1000 },
  { key: '1000-2000', label: '₹1,000–2,000', test: (p: number | null) => p != null && p > 1000 && p <= 2000 },
  { key: '2000', label: '₹2,000+', test: (p: number | null) => p != null && p > 2000 },
  { key: 'quote', label: 'On request', test: (p: number | null) => p == null },
];

const SORTS = [
  { key: '', label: 'Featured' },
  { key: 'low', label: 'Price: low to high' },
  { key: 'high', label: 'Price: high to low' },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const occasion = params.get('occasion') ?? '';
  const budget = params.get('budget') ?? '';
  const sort = params.get('sort') ?? '';
  const q = params.get('q') ?? '';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    const b = BUDGETS.find((x) => x.key === budget) ?? BUDGETS[0];
    const term = q.trim().toLowerCase();
    const rows = products.filter((p) =>
      (!occasion || p.occasions.includes(occasion)) && b.test(p.price) &&
      (!term || `${p.name} ${p.contents} ${p.occasions.join(' ')}`.toLowerCase().includes(term)));
    const price = (p: (typeof rows)[number]) => p.price ?? Infinity;
    if (sort === 'low') rows.sort((a, z) => price(a) - price(z));
    else if (sort === 'high') rows.sort((a, z) => (z.price ?? -1) - (a.price ?? -1));
    else rows.sort((a, z) => Number(z.featured) - Number(a.featured));
    return rows;
  }, [occasion, budget, sort, q]);

  const chip = (active: boolean) => (active
    ? { background: C.olive, color: '#fff', borderColor: C.olive }
    : { background: '#fff', color: C.ink, borderColor: C.line });

  return (
    <div className="pb-24 pt-28" style={{ background: C.cream }}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: '#8a6f2e' }}>Ecotwist store</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl" style={{ color: C.ink }}>Shop sustainable corporate gifts</h1>
          <p className="mt-4 text-base leading-7" style={{ color: C.muted }}>
            Choose a kit, add your logo and pick a quantity from 25 to 500+. Pay securely online, and we send a free branded mockup for your approval before production.
          </p>
        </header>

        {/* Filters */}
        <div className="mt-10 flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: C.line }}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
              <input value={q} onChange={(e) => set('q', e.target.value)} placeholder="Search kits, e.g. cork diary, candles, dry fruits"
                className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none focus:ring-2" style={{ borderColor: C.line }} aria-label="Search" />
            </label>
            <select value={occasion} onChange={(e) => set('occasion', e.target.value)} className="rounded-xl border bg-white px-3 py-3 text-sm" style={{ borderColor: C.line }} aria-label="Occasion">
              <option value="">All occasions</option>
              {occasions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={sort} onChange={(e) => set('sort', e.target.value)} className="rounded-xl border bg-white px-3 py-3 text-sm" style={{ borderColor: C.line }} aria-label="Sort">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <button key={b.key} type="button" onClick={() => set('budget', b.key)} className="rounded-full border px-3.5 py-1.5 text-[13px] font-semibold" style={chip(budget === b.key)}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-sm" style={{ color: C.muted }}>{list.length} {list.length === 1 ? 'kit' : 'kits'}{occasion ? ` for ${occasion}` : ''}</p>

        {list.length ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {list.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border bg-white p-10 text-center" style={{ borderColor: C.line }}>
            <p className="font-serif text-2xl" style={{ color: C.ink }}>No kits match these filters</p>
            <button type="button" onClick={() => setParams({})} className="mt-4 text-sm font-semibold underline" style={{ color: C.olive }}>Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
}
