import { useState } from 'react';
import { CheckCircle2, ChevronDown, CircleAlert, CircleX, ImageOff, Upload } from 'lucide-react';
import { Card, CardTitle, Field, Input, Textarea, Button, useToast } from '../ui';
import type { CheckStatus, SeoResult } from './seoScore';
import { uploadBlogImage } from './shared';

export const SITE_HOST = 'ecotwist.in';
const SEO_TITLE_MAX = 60;
const SEO_DESC_MAX = 160;

export interface SeoFields {
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string;
  focus_keyword: string;
  seo_title: string;
  seo_description: string;
  og_image: string;
  noindex: boolean;
}

const TONE: Record<CheckStatus, { text: string; bg: string; ring: string; label: string }> = {
  good: { text: 'text-[#24502A]', bg: 'bg-[#3E7D47]', ring: 'stroke-[#3E7D47]', label: 'Good' },
  ok: { text: 'text-[#8A5A0B]', bg: 'bg-[#D69A2D]', ring: 'stroke-[#D69A2D]', label: 'Needs work' },
  bad: { text: 'text-red-700', bg: 'bg-red-600', ring: 'stroke-red-600', label: 'Poor' },
};

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text);

function Ring({ value, status, size = 64 }: { value: number; status: CheckStatus; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-admin-muted" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={`${TONE[status].ring} transition-[stroke-dashoffset] duration-300`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-brand-charcoal font-sans text-[17px] font-semibold">{value}</text>
    </svg>
  );
}

const ICON = { good: CheckCircle2, ok: CircleAlert, bad: CircleX };

// Live SEO score, checklist, previews and SEO fields
export function SeoPanel({ fields, set, result }: {
  fields: SeoFields;
  set: <K extends keyof SeoFields>(key: K, value: SeoFields[K]) => void;
  result: SeoResult;
}) {
  const [showGood, setShowGood] = useState(false);
  const order: Record<CheckStatus, number> = { bad: 0, ok: 1, good: 2 };
  const checks = [...result.checks].sort((a, b) => order[a.status] - order[b.status]);
  const problems = checks.filter((c) => c.status !== 'good');
  const good = checks.filter((c) => c.status === 'good');
  const r = result.readability;

  return (
    <Card>
      <CardTitle>SEO</CardTitle>
      <div className="space-y-5 p-5">
        {/* Scores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3">
            <Ring value={result.score} status={result.status} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">SEO score</p>
              <p className={`text-sm font-semibold ${TONE[result.status].text}`}>{TONE[result.status].label}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Ring value={r.score} status={r.status} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">Readability</p>
              <p className={`text-sm font-semibold ${TONE[r.status].text}`}>{r.label}</p>
            </div>
          </div>
        </div>
        <p className="-mt-2 text-xs text-gray-500">
          Readability is the Flesch reading ease (60+ is easy for most readers). {r.sentences} sentences, {r.avgSentenceWords} words per sentence on average.
        </p>

        <Field label="Focus keyword" hint="The main phrase people would search for, e.g. “sustainable diwali gifts”.">
          <Input value={fields.focus_keyword} onChange={(e) => set('focus_keyword', e.target.value)} placeholder="Focus keyword" />
        </Field>

        {/* Checklist */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">
            {problems.length ? `${problems.length} to improve` : 'All checks pass'}
          </p>
          <ul className="space-y-2.5">
            {problems.map((c) => {
              const Icon = ICON[c.status];
              return (
                <li key={c.id} className="flex gap-2 text-sm">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${TONE[c.status].text}`} aria-label={TONE[c.status].label} />
                  <div>
                    <p className="text-brand-charcoal">{c.message}</p>
                    {c.fix && <p className="text-xs text-gray-500">{c.fix}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          {good.length > 0 && (
            <>
              <button type="button" onClick={() => setShowGood((s) => !s)} className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-olive hover:underline">
                <ChevronDown size={14} className={`transition ${showGood ? 'rotate-180' : ''}`} /> {good.length} passed
              </button>
              {showGood && (
                <ul className="mt-2 space-y-1.5">
                  {good.map((c) => (
                    <li key={c.id} className="flex gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${TONE.good.text}`} aria-label="Good" /> {c.message}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="border-t border-admin-line pt-5">
          <GooglePreview fields={fields} />
        </div>

        <div>
          <Field label="SEO title">
            <Input value={fields.seo_title} onChange={(e) => set('seo_title', e.target.value)} placeholder={fields.title || 'Defaults to the article title'} />
          </Field>
          <Counter text="Leave empty to use the title. 30–60 characters." n={(fields.seo_title || fields.title).length} min={30} max={SEO_TITLE_MAX} />
        </div>
        <div>
          <Field label="Meta description">
            <Textarea rows={3} value={fields.seo_description} onChange={(e) => set('seo_description', e.target.value)} placeholder={fields.excerpt || 'Defaults to the excerpt'} />
          </Field>
          <Counter text="Leave empty to use the excerpt. 120–160 characters." n={(fields.seo_description || fields.excerpt).length} min={120} max={SEO_DESC_MAX} />
        </div>

        <div className="border-t border-admin-line pt-5">
          <SocialPreview fields={fields} />
        </div>
        <OgImageField value={fields.og_image} onChange={(v) => set('og_image', v)} />

        <label className="flex items-start gap-2 border-t border-admin-line pt-4 text-sm">
          <input type="checkbox" checked={fields.noindex} onChange={(e) => set('noindex', e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-semibold">Hide from search engines</span> (noindex)
            <span className="block text-xs text-gray-500">The article stays on the blog, but Google won't list it.</span>
          </span>
        </label>
      </div>
    </Card>
  );
}

function Counter({ text, n, min, max }: { text: string; n: number; min: number; max: number }) {
  const tone = n > max ? 'text-red-700 font-semibold' : n < min ? 'text-amber-700 font-semibold' : 'text-[#24502A] font-semibold';
  return (
    <p className="mt-1 flex justify-between gap-3 text-xs text-gray-500">
      <span>{text}</span>
      <span className={tone}>{n}/{max}</span>
    </p>
  );
}

function GooglePreview({ fields }: { fields: SeoFields }) {
  const title = fields.seo_title || fields.title || 'Article title';
  const desc = fields.seo_description || fields.excerpt || 'The description Google shows under the title. Add an excerpt or a meta description.';
  return (
    <div aria-label="Google preview">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">Google preview</p>
      <div className="rounded-lg border border-admin-line bg-white p-4 font-[arial,sans-serif]">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F3F4]"><img src="/site/navigation/logo.png" alt="" className="h-5 w-5 object-contain" /></span>
          <div className="min-w-0 leading-tight">
            <p className="text-[13px] text-[#202124]">Ecotwist</p>
            <p className="truncate text-xs text-[#4d5156]">https://{SITE_HOST} › blog › {fields.slug || '…'}</p>
          </div>
        </div>
        <p className="text-[19px] leading-snug text-[#1a0dab] hover:underline">{clip(title, SEO_TITLE_MAX)}</p>
        <p className="mt-1 text-[13px] leading-snug text-[#4d5156]">{clip(desc, SEO_DESC_MAX)}</p>
      </div>
    </div>
  );
}

function SocialPreview({ fields }: { fields: SeoFields }) {
  const image = fields.og_image || fields.cover_image;
  const title = fields.seo_title || fields.title || 'Article title';
  const desc = fields.seo_description || fields.excerpt;
  return (
    <div aria-label="Social share preview">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">Share preview (WhatsApp, LinkedIn)</p>
      <div className="overflow-hidden rounded-lg border border-admin-line bg-[#F3F2EF]">
        <div className="flex aspect-[1.91/1] items-center justify-center bg-admin-muted">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-xs text-gray-400"><ImageOff size={20} /> No image: add a cover</span>}
        </div>
        <div className="space-y-0.5 bg-white px-3 py-2.5">
          <p className="text-[11px] uppercase text-gray-500">{SITE_HOST}</p>
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#1d2129]">{title}</p>
          {desc && <p className="line-clamp-2 text-xs text-gray-600">{desc}</p>}
        </div>
      </div>
    </div>
  );
}

function OgImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const res = await uploadBlogImage(file);
      onChange(res.url);
      toast(`Share image uploaded (${res.note}).`);
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">Share image</span>
      <div className="flex flex-wrap gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-admin-muted px-3 py-2 text-sm font-semibold hover:bg-[#E5E1D6] ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          <Upload size={14} /> {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />
        </label>
        {value && <Button type="button" variant="ghost" className="!py-2" onClick={() => onChange('')}>Use cover instead</Button>}
      </div>
      <Input className="mt-2" value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="…or paste a link. Empty = cover photo" aria-label="Share image link" />
      <p className="mt-1 text-xs text-gray-500">Best at 1200 × 630. Leave empty to use the cover photo.</p>
    </div>
  );
}
