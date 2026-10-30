import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { Button, Card, Field, Input, Textarea } from '../ui';
import { ImageField } from './ImageField';
import {
  HIDDEN_KEYS, blankLike, humanize, isColorKey, isImageKey, isImageListKey, isLongText, isObject, itemImage, itemTitle, previewUrl,
  type Json, type JsonObject, type Path,
} from './schema';

// Lets a special editor change how parts of a file are edited
export type FormOptions = {
  folder: string; // upload folder for photos
  // Custom input for one value; return undefined for the default
  render?: (key: string, value: Json, onChange: (v: Json) => void, path: Path) => ReactNode | undefined;
  // Item to add to an array that is empty (otherwise the first item is copied)
  template?: (path: Path) => Json | undefined;
  // Keys an object may have but doesn't yet ("Add designs")
  optional?: (path: Path) => JsonObject | undefined;
};

type Props<T = Json> = { name: string | number; value: T; onChange: (v: T) => void; path: Path; opts: FormOptions };

/* ── Top level: one card per section ──────────────────────────── */

export function SchemaForm({ value, onChange, opts }: { value: JsonObject; onChange: (v: JsonObject) => void; opts: FormOptions }) {
  const entries = Object.entries(value).filter(([k]) => !HIDDEN_KEYS.has(k));
  const set = (k: string, v: Json) => onChange({ ...value, [k]: v });
  const loose = entries.filter(([, v]) => !isObject(v) && !Array.isArray(v));
  const sections = entries.filter(([, v]) => isObject(v) || Array.isArray(v));

  return (
    <div className="space-y-6">
      {loose.length > 0 && (
        <Card className="space-y-4 p-5">
          {loose.map(([k, v]) => <Value key={k} name={k} value={v} onChange={(nv) => set(k, nv)} path={[k]} opts={opts} />)}
        </Card>
      )}
      {sections.map(([k, v]) => (
        <Card key={k} className="p-5">
          <h2 className="mb-4 font-serif text-xl">{humanize(k)}</h2>
          {isObject(v) ? (
            <ObjectFields value={v} onChange={(nv) => set(k, nv)} path={[k]} opts={opts} />
          ) : (
            Array.isArray(v) && <ArrayField name={k} value={v} onChange={(nv) => set(k, nv)} path={[k]} opts={opts} bare />
          )}
        </Card>
      ))}
    </div>
  );
}

/* ── One value, chosen by key name and type ───────────────────── */

function Value({ name, value, onChange, path, opts }: Props) {
  const key = String(name);
  const custom = opts.render?.(key, value, onChange, path);
  if (custom !== undefined) return <>{custom}</>;
  if (HIDDEN_KEYS.has(key)) return null;

  const label = humanize(name);
  if (Array.isArray(value)) return <ArrayField name={name} value={value} onChange={onChange} path={path} opts={opts} />;
  if (isObject(value)) {
    return (
      <Collapsible title={label}>
        <ObjectFields value={value} onChange={onChange} path={path} opts={opts} />
      </Collapsible>
    );
  }
  if (typeof value === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-brand-olive" />
        {label}
      </label>
    );
  }
  if (typeof value === 'number') {
    return (
      <Field label={label}>
        <Input type="number" value={value} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
      </Field>
    );
  }
  const text = value == null ? '' : String(value);
  if (isImageKey(key)) return <ImageField label={label} value={text} onChange={onChange} folder={opts.folder} />;
  if (isColorKey(key)) return <ColorField label={label} value={text} onChange={onChange} />;
  return <TextField label={label} value={text} onChange={onChange} />;
}

function ObjectFields({ value, onChange, path, opts }: Omit<Props<JsonObject>, 'name'>) {
  const missing = Object.entries(opts.optional?.(path) ?? {}).filter(([k]) => !(k in value));
  return (
    <div className="space-y-4">
      {Object.entries(value).map(([k, v]) => (
        <Value key={k} name={k} value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} path={[...path, k]} opts={opts} />
      ))}
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missing.map(([k, v]) => (
            <Button key={k} type="button" variant="ghost" onClick={() => onChange({ ...value, [k]: v })}>
              <Plus size={15} /> Add {humanize(k).toLowerCase()}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Inputs ───────────────────────────────────────────────────── */

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  // Decided once, so the field doesn't swap (and lose focus) while typing
  const [long] = useState(() => isLongText(value));
  return (
    <Field label={label}>
      {long ? (
        <Textarea value={value} rows={Math.min(10, Math.max(3, Math.ceil(value.length / 90) + value.split('\n').length - 1))} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
        <Input value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="#b5a26a" className="max-w-36 font-mono" />
      </div>
    </Field>
  );
}

function Collapsible({ title, thumb, defaultOpen = false, actions, children }: { title: ReactNode; thumb?: string; defaultOpen?: boolean; actions?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm font-semibold">
          <ChevronRight size={16} className={`shrink-0 text-gray-400 transition ${open ? 'rotate-90' : ''}`} />
          {thumb && <img src={previewUrl(thumb)} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />}
          <span className="truncate">{title}</span>
        </button>
        {actions}
      </div>
      {open && <div className="border-t border-gray-100 p-4">{children}</div>}
    </div>
  );
}

/* ── Arrays ───────────────────────────────────────────────────── */

let nextKey = 0;

// Stable React keys for array items, so open/closed cards follow their item when moved
function useItemKeys(length: number) {
  const [keys, setKeys] = useState(() => Array.from({ length }, () => nextKey++));
  const synced = keys.length === length ? keys : Array.from({ length }, (_, i) => keys[i] ?? nextKey++);
  if (synced !== keys) setKeys(synced);
  return [synced, setKeys] as const;
}

function ArrayField({ name, value, onChange, path, opts, bare }: Props<Json[]> & { bare?: boolean }) {
  const key = String(name);
  const [keys, setKeys] = useItemKeys(value.length);
  const [added, setAdded] = useState<number | null>(null);

  const template = value.length ? blankLike(value[0]) : opts.template?.(path) ?? (isImageListKey(key) ? '' : undefined);
  const objects = template !== undefined ? isObject(template) : value.some(isObject);
  const images = isImageListKey(key);

  const move = (i: number, j: number) => {
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    const k = [...keys];
    [k[i], k[j]] = [k[j], k[i]];
    setKeys(k);
    onChange(next);
  };
  const remove = (i: number) => {
    if (objects && !confirm(`Remove ${itemTitle(value[i]) || `item ${i + 1}`}?`)) return;
    setKeys(keys.filter((_, x) => x !== i));
    onChange(value.filter((_, x) => x !== i));
  };
  const add = () => {
    const k = nextKey++;
    setKeys([...keys, k]);
    setAdded(k);
    onChange([...value, template as Json]);
  };
  const setAt = (i: number, v: Json) => onChange(value.map((x, xi) => (xi === i ? v : x)));

  const controls = (i: number) => (
    <div className="flex shrink-0 items-center">
      <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={15} /></IconButton>
      <IconButton label="Move down" disabled={i === value.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={15} /></IconButton>
      <IconButton label="Remove" onClick={() => remove(i)}>{objects ? <Trash2 size={15} /> : <X size={15} />}</IconButton>
    </div>
  );

  const list = (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-sm text-gray-500">Nothing here yet.</p>}
      {value.map((item, i) =>
        objects ? (
          <Collapsible
            key={keys[i]}
            title={<>{i + 1}. {itemTitle(item) || <span className="font-normal text-gray-400">Untitled</span>}</>}
            thumb={itemImage(item)}
            defaultOpen={keys[i] === added || value.length <= 2}
            actions={controls(i)}
          >
            {isObject(item) ? (
              <ObjectFields value={item} onChange={(v) => setAt(i, v)} path={[...path, i]} opts={opts} />
            ) : (
              <Value name={i} value={item} onChange={(v) => setAt(i, v)} path={[...path, i]} opts={opts} />
            )}
          </Collapsible>
        ) : (
          <div key={keys[i]} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {images ? (
                <ImageField label={`Photo ${i + 1}`} value={String(item ?? '')} onChange={(v) => setAt(i, v)} folder={opts.folder} />
              ) : (
                <Input value={String(item ?? '')} onChange={(e) => setAt(i, e.target.value)} aria-label={`${humanize(name)} ${i + 1}`} />
              )}
            </div>
            {controls(i)}
          </div>
        ),
      )}
      {template !== undefined && (
        <Button type="button" variant="secondary" onClick={add}>
          <Plus size={15} /> Add {objects ? 'item' : images ? 'photo' : 'line'}
        </Button>
      )}
    </div>
  );

  if (bare) return list;
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">{humanize(name)}</span>
      {list}
    </div>
  );
}

function IconButton({ label, children, ...props }: { label: string; children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" title={label} aria-label={label} {...props} className="rounded-md p-1.5 text-gray-500 transition hover:bg-brand-beige hover:text-brand-charcoal disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}
