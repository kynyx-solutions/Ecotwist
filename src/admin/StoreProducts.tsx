import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import { api } from './lib/api';
import { ImageField } from './website/ImageField';
import { previewUrl } from './website/schema';
import { Button, Card, Field, Input, PageHeader, Spinner, Textarea, formatMoney, useToast } from './ui';

/* ============================
   Store → Products & prices (/admin/store).
   Edits src/content/store.json, the one file the website shop, the order API
   and the catalogue all read. Saving keeps a draft; "Publish changes" in the
   sidebar puts it live. The server prices every order from the live file.
============================ */

const PATH = 'src/content/store.json';

interface Product {
  id: string; name: string; contents: string; image: string; images?: string[];
  price: number | null; occasions: string[]; active: boolean; featured: boolean;
}
interface StoreFile {
  _meta: unknown;
  settings: { quantities: number[]; quoteOnlyLabel: string; discounts: Record<string, number>; gstRate: number; freeDeliveryAbove: number; deliveryFee: number; brandingOptions: string[]; note: string };
  products: Product[];
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export function StoreProducts() {
  const toast = useToast();
  const [sha, setSha] = useState('');
  const [data, setData] = useState<StoreFile | null>(null);
  const [saved, setSaved] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ content: StoreFile; sha: string }>(`/api/admin/content?path=${encodeURIComponent(PATH)}`)
      .then((f) => { setData(f.content); setSha(f.sha); setSaved(JSON.stringify(f.content)); })
      .catch((e: Error) => toast(e.message, true));
  }, [toast]);

  const dirty = data !== null && JSON.stringify(data) !== saved;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.products ?? []).filter((p) => !t || `${p.name} ${p.occasions.join(' ')}`.toLowerCase().includes(t));
  }, [data, q]);

  if (!data) return <Spinner />;

  const setProduct = (id: string, patch: Partial<Product>) =>
    setData({ ...data, products: data.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const setSettings = (patch: Partial<StoreFile['settings']>) => setData({ ...data, settings: { ...data.settings, ...patch } });

  const add = () => {
    let id = 'new-kit', n = 2;
    while (data.products.some((p) => p.id === id)) id = `new-kit-${n++}`;
    setData({ ...data, products: [{ id, name: 'New kit', contents: '', image: '', price: null, occasions: [], active: false, featured: false }, ...data.products] });
    setOpen(id); setQ('');
  };

  const remove = (p: Product) => {
    if (!confirm(`Remove ${p.name} from the store? Old orders keep their details.`)) return;
    setData({ ...data, products: data.products.filter((x) => x.id !== p.id) });
  };

  const save = async () => {
    const names = new Set<string>();
    for (const p of data.products) {
      if (!p.name.trim()) return toast('Every product needs a name', true);
      if (names.has(p.id)) return toast(`Two products share the link "${p.id}"`, true);
      names.add(p.id);
      if (p.price != null && !(p.price > 0)) return toast(`${p.name}: price must be above ₹0, or empty for "on request"`, true);
    }
    setSaving(true);
    try {
      const res = await api<{ sha: string; message: string }>('/api/admin/content', { method: 'PUT', body: { path: PATH, content: data, sha, message: 'Update store products & prices from the admin' } });
      setSha(res.sha); setSaved(JSON.stringify(data));
      toast(`Saved. ${res.message}`);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const s = data.settings;
  const priced = data.products.filter((p) => p.price != null).length;

  return (
    <>
      <PageHeader
        eyebrow="Store"
        title="Products & prices"
        subtitle={`${data.products.length} products · ${priced} priced · ${data.products.filter((p) => p.active).length} on sale`}
        actions={<>
          <a href="/shop" target="_blank" rel="noopener noreferrer"><Button variant="secondary"><ExternalLink size={16} /> View shop</Button></a>
          <Button onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</Button>
        </>}
      />

      <Card className="mb-6 grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 className="font-semibold">Bulk discounts</h2>
          <p className="mt-1 text-sm text-gray-500">Percent off the base price at each quantity. 0 means the base price. {s.quoteOnlyLabel} is always a quote.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {s.quantities.map((qty) => (
              <label key={qty} className="w-24 text-sm">
                <span className="text-gray-600">{qty} kits</span>
                <div className="relative mt-1">
                  <Input type="number" min={0} max={60} value={s.discounts[String(qty)] ?? 0}
                    onChange={(e) => setSettings({ discounts: { ...s.discounts, [String(qty)]: Math.max(0, Math.min(60, Number(e.target.value) || 0)) } })} className="!pr-7" />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
        <label className="w-36 text-sm">
          <span className="font-semibold">Free delivery above</span>
          <Input type="number" min={0} value={s.freeDeliveryAbove} onChange={(e) => setSettings({ freeDeliveryAbove: Math.max(0, Number(e.target.value) || 0) })} className="mt-1" aria-label="Free delivery above (₹)" />
        </label>
        <label className="w-28 text-sm">
          <span className="font-semibold">Delivery fee ₹</span>
          <Input type="number" min={0} value={s.deliveryFee} onChange={(e) => setSettings({ deliveryFee: Math.max(0, Number(e.target.value) || 0) })} className="mt-1" aria-label="Delivery fee (₹)" />
        </label>
        <label className="w-28 text-sm">
          <span className="font-semibold">GST</span>
          <div className="relative mt-1">
            <Input type="number" min={0} max={28} value={s.gstRate} onChange={(e) => setSettings({ gstRate: Number(e.target.value) || 0 })} className="!pr-7" />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">%</span>
          </div>
        </label>
        </div>
      </Card>

      <div className="mb-3 flex flex-wrap gap-3">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search products or occasions" value={q} onChange={(e) => setQ(e.target.value)} className="!pl-9" />
        </label>
        <Button variant="secondary" onClick={add}><Plus size={16} /> Add product</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-off-white text-left text-xs uppercase tracking-wide text-gray-500">
            <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3 w-40">Price per kit (₹)</th><th className="px-4 py-3 w-24">On sale</th><th className="px-4 py-3 w-28">Bestseller</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((p) => (
              <FragmentRow key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)}
                onChange={(patch) => setProduct(p.id, patch)} onRemove={() => remove(p)} discounts={s.discounts} quantities={s.quantities} />
            ))}
          </tbody>
        </table>
      </Card>
      {dirty && <div className="sticky bottom-4 mt-4 flex justify-end"><Button onClick={save} disabled={saving} className="shadow-lg">{saving ? 'Saving…' : 'Save changes'}</Button></div>}
    </>
  );
}

function FragmentRow({ p, open, onToggle, onChange, onRemove, discounts, quantities }: {
  p: Product; open: boolean; onToggle: () => void; onChange: (patch: Partial<Product>) => void; onRemove: () => void;
  discounts: Record<string, number>; quantities: number[];
}) {
  return (
    <>
      <tr className={open ? 'bg-brand-off-white' : 'hover:bg-brand-off-white'}>
        <td className="px-4 py-2.5">
          <button type="button" onClick={onToggle} className="flex items-center gap-3 text-left">
            {p.image ? <img src={previewUrl(p.image)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="h-11 w-11 shrink-0 rounded-lg bg-gray-100" />}
            <span>
              <span className="font-medium hover:underline">{p.name}</span>
              <span className="block text-xs text-gray-500">{p.occasions.join(' · ') || 'No occasion'}</span>
            </span>
          </button>
        </td>
        <td className="px-4 py-2.5">
          <Input type="number" min={1} placeholder="On request" value={p.price ?? ''} aria-label={`${p.name} price`}
            onChange={(e) => onChange({ price: e.target.value === '' ? null : Math.round(Number(e.target.value)) })} />
        </td>
        <td className="px-4 py-2.5"><input type="checkbox" checked={p.active} onChange={(e) => onChange({ active: e.target.checked })} aria-label="On sale" className="h-4 w-4 accent-[#4A5D23]" /></td>
        <td className="px-4 py-2.5"><input type="checkbox" checked={p.featured} onChange={(e) => onChange({ featured: e.target.checked })} aria-label="Bestseller" className="h-4 w-4 accent-[#4A5D23]" /></td>
      </tr>
      {open && (
        <tr className="bg-brand-off-white">
          <td colSpan={4} className="px-4 pb-5">
            <div className="grid gap-4 rounded-xl bg-white p-4 md:grid-cols-2">
              <Field label="Name"><Input value={p.name} onChange={(e) => onChange({ name: e.target.value })} /></Field>
              <Field label="Link" hint={`ecotwist.in/shop/${p.id}`}><Input value={p.id} onChange={(e) => onChange({ id: slug(e.target.value) })} /></Field>
              <div className="md:col-span-2"><Field label="What's inside"><Textarea rows={2} value={p.contents} onChange={(e) => onChange({ contents: e.target.value })} /></Field></div>
              <Field label="Occasions" hint="Comma separated, e.g. Onboarding, New Year">
                <Input value={p.occasions.join(', ')} onChange={(e) => onChange({ occasions: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
              </Field>
              <div className="text-sm">
                <span className="font-medium">Price by quantity</span>
                <p className="mt-1 text-gray-600">
                  {p.price == null ? 'On request' : quantities.map((qty) => `${qty}: ${formatMoney(Math.round(p.price! * (1 - (discounts[String(qty)] ?? 0) / 100)))}`).join(' · ')}
                </p>
              </div>
              <ImageField label="Main photo" value={p.image} onChange={(v) => onChange({ image: v })} folder="store" />
              <div className="flex items-end justify-end">
                <Button type="button" variant="danger" onClick={onRemove}><Trash2 size={16} /> Remove product</Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
