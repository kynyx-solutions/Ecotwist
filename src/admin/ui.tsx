import { createContext, useCallback, useContext, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { LeadSource, LeadStatus, OrderStatus } from './lib/types';

/* ── Buttons & fields ─────────────────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-charcoal text-white hover:bg-black',
  secondary: 'bg-admin-muted text-brand-charcoal hover:bg-[#E5E1D6]',
  danger: 'bg-white border border-red-200 text-red-700 hover:bg-red-50',
  ghost: 'text-brand-olive hover:bg-brand-beige',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  );
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/25';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`${fieldClass} ${props.className ?? ''}`} />;

/* ── Layout pieces ────────────────────────────────────────────── */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-admin-line bg-white ${className}`}>{children}</div>;
}

// Small line above the title, e.g. "Business · 38 open leads"
export function PageHeader({ title, subtitle, eyebrow, actions }: { title: string; subtitle?: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-sm text-gray-500">{eyebrow}</p>}
        <h1 className="font-serif text-4xl font-medium leading-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Card header in the serif style: "New leads" ........ "Open pipeline →"
export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-admin-line px-5 py-4">
      <h2 className="font-serif text-2xl font-medium">{children}</h2>
      {action && <div className="text-sm font-medium">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'warn' }) {
  return (
    <Card className="h-full p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">{label}</p>
      <p className="mt-2 font-serif text-5xl font-medium leading-none">{value}</p>
      {note && <p className={`mt-2 text-sm ${tone === 'warn' ? 'text-red-700' : 'text-gray-500'}`}>{note}</p>}
    </Card>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-gray-500">{label}</p>;
}

/* ── Lead status ──────────────────────────────────────────────── */

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal sent',
  won: 'Won',
  lost: 'Lost',
  spam: 'Spam',
};

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: 'bg-[#E4E6DC] text-[#2F3A22]',
  contacted: 'bg-[#EAE6DA] text-[#4A4433]',
  qualified: 'bg-[#E9E2CF] text-[#5A4A22]',
  proposal: 'bg-[#F3E6C4] text-[#6B5114]',
  won: 'bg-[#D9E7D4] text-[#24502A]',
  lost: 'bg-gray-200 text-gray-600',
  spam: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

/* ── Lead source ──────────────────────────────────────────────── */

export const SOURCE_LABEL: Record<LeadSource, string> = {
  website: 'Website form',
  whatsapp: 'WhatsApp',
  phone: 'Phone call',
  email: 'Email',
  referral: 'Referral',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  event: 'Event',
  other: 'Other',
};

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded bg-admin-muted px-2 py-0.5 text-xs font-medium text-gray-700">{children}</span>;
}

// "Call today" / "Overdue 2 days" / "Fri" for a yyyy-mm-dd follow-up date
export function followUpLabel(date: string | null): { text: string; overdue: boolean; today: boolean } | null {
  if (!date) return null;
  const day = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  const [y, m, dd] = date.split('-').map(Number);
  const diff = day(new Date(y, m - 1, dd)) - day(new Date());
  if (diff < 0) return { text: `Overdue ${-diff} ${diff === -1 ? 'day' : 'days'}`, overdue: true, today: false };
  if (diff === 0) return { text: 'today', overdue: false, today: true };
  if (diff === 1) return { text: 'tomorrow', overdue: false, today: false };
  const when = new Date(y, m - 1, dd);
  return { text: diff < 7 ? when.toLocaleDateString('en-IN', { weekday: 'short' }) : when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), overdue: false, today: false };
}

/* ── Order status ─────────────────────────────────────────────── */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  quote: 'Quote sent',
  confirmed: 'Confirmed',
  in_production: 'In production',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  quote: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  in_production: 'bg-violet-100 text-violet-800',
  dispatched: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-200 text-gray-700',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLE[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

/* ── Toasts ───────────────────────────────────────────────────── */

type Toast = { id: number; text: string; error?: boolean };
const ToastContext = createContext<(text: string, error?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${t.error ? 'bg-red-600 text-white' : 'bg-brand-dark-olive text-brand-beige'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ── Formatting ───────────────────────────────────────────────── */

export const formatMoney = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const orderNumber = (n: number) => `ECO-${n}`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days} d ago` : formatDate(iso);
};
