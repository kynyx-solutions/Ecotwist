import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { Card, Field, Select } from '../ui';
import { ImageField } from './ImageField';
import { SchemaForm, type FormOptions } from './SchemaForm';
import { isObject, slugify, uploadFolder, type Json, type JsonObject } from './schema';

export const PRODUCTS = 'src/content/products.json';
export const SITE_IMAGES = 'src/content/site-images.json';
export const CLIENTS = 'src/content/clients.json';
export const TESTIMONIALS = 'src/content/testimonials.json';

// Must match ICONS in src/pages/Products.tsx
const PRODUCT_ICONS = ['BookOpen', 'PenLine', 'KeyRound', 'CalendarDays', 'NotebookPen', 'Flame', 'Gift', 'Package', 'ShoppingBasket'];

type EditorProps = { path: string; value: JsonObject; onChange: (v: JsonObject) => void };

// The form for one content file
export function ContentForm({ path, value, onChange }: EditorProps) {
  const folder = uploadFolder(path);
  switch (path) {
    case SITE_IMAGES:
      return <PhotosToAdd value={value} onChange={onChange} />;
    case PRODUCTS:
      return <SchemaForm value={value} onChange={onChange} opts={{ ...catalogueOptions, folder }} />;
    case CLIENTS:
      return <SchemaForm value={value} onChange={onChange} opts={{ folder, template: () => ({ name: '', logo: '' }) }} />;
    case TESTIMONIALS:
      return (
        <>
          <Card className="mb-6 flex gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Info size={18} className="mt-0.5 shrink-0" />
            <p>Only add testimonials from real clients, in their own words, and only with their permission to show their name and company.</p>
          </Card>
          <SchemaForm value={value} onChange={onChange} opts={{ folder, template: () => ({ quote: '', name: '', role: '', company: '' }) }} />
        </>
      );
    default:
      return <SchemaForm value={value} onChange={onChange} opts={{ folder }} />;
  }
}

// Last fixes before a file is saved
export function prepareForSave(path: string, content: JsonObject): JsonObject {
  if (path !== PRODUCTS || !Array.isArray(content.products)) return content;
  // New products need a unique id (used in links and as a list key)
  const used = new Set(content.products.map((p) => (isObject(p) ? String(p.id ?? '') : '')).filter(Boolean));
  const products = content.products.map((p) => {
    if (!isObject(p) || p.id) return p;
    const base = slugify(String(p.name ?? '')) || 'product';
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return { ...p, id };
  });
  return { ...content, products };
}

/* ── Catalogue ────────────────────────────────────────────────── */

const isProduct = (path: (string | number)[]) => path[0] === 'products' && typeof path[1] === 'number';

const catalogueOptions: Omit<FormOptions, 'folder'> = {
  render: (key, value, onChange, path) => {
    if (key !== 'icon' || path.length !== 3 || !isProduct(path)) return undefined;
    return (
      <Field label="Icon" hint="Shown on a tinted panel until the product has a photo">
        <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">Gift (default)</option>
          {PRODUCT_ICONS.map((i) => <option key={i} value={i}>{i.replace(/([a-z])([A-Z])/g, '$1 $2')}</option>)}
        </Select>
      </Field>
    );
  },
  template: (path) => {
    const last = path[path.length - 1];
    if (path.length === 1 && last === 'products') {
      return { id: '', category: '', name: '', description: '', tags: [], image: '', icon: 'Gift', tint: '#d8c19c', photos: [] };
    }
    if (last === 'designs') return { sku: '', name: '', src: '' };
    if (last === 'tags' || last === 'photos') return '';
    return undefined;
  },
  optional: (path) =>
    path.length === 2 && isProduct(path)
      ? { tags: [], image: '', photos: [], designs: [], showDesignCount: false }
      : undefined,
};

/* ── Photos to add ────────────────────────────────────────────── */

type PhotoSlot = { id: string; page: string; place: string; image: string };

function PhotosToAdd({ value, onChange }: Omit<EditorProps, 'path'>) {
  const images = (Array.isArray(value.images) ? value.images : []) as unknown as PhotoSlot[];
  // Ids that were missing when the filter was switched on, so a slot doesn't vanish as soon as it's filled
  const [onlyMissing, setOnlyMissing] = useState<Set<string> | null>(null);

  const byPage = useMemo(() => {
    const groups = new Map<string, number[]>();
    images.forEach((img, i) => groups.set(img.page, [...(groups.get(img.page) ?? []), i]));
    return [...groups];
  }, [images]);

  const setImage = (i: number, image: string) =>
    onChange({ ...value, images: images.map((x, xi) => (xi === i ? { ...x, image } : x)) as unknown as Json[] });

  const missing = images.filter((x) => !x.image).length;

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <p className="text-gray-600">
          These spots on the site are waiting for a real photo. <strong>{missing}</strong> of {images.length} still missing.
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked ? new Set(images.filter((x) => !x.image).map((x) => x.id)) : null)} className="h-4 w-4 accent-brand-olive" />
          Only show missing
        </label>
      </Card>
      {byPage.map(([page, idx]) => {
        const shown = idx.filter((i) => !onlyMissing || onlyMissing.has(images[i].id));
        if (!shown.length) return null;
        return (
          <Card key={page} className="p-5">
            <h2 className="mb-4 font-serif text-xl">{page}</h2>
            <div className="divide-y divide-gray-100">
              {shown.map((i) => (
                <div key={images[i].id} className="py-4 first:pt-0 last:pb-0">
                  <ImageField label={images[i].place} value={images[i].image} onChange={(v) => setImage(i, v)} folder={slugify(page)} />
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
