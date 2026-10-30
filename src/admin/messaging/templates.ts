import type { Customer, Lead, Order } from '../lib/types';
import { formatMoney, orderNumber } from '../ui';

// Everything a template can use, e.g. "Hi {{first_name}}"
export const PLACEHOLDERS = [
  { key: 'name', label: 'Full name', sample: 'Priya Sharma' },
  { key: 'first_name', label: 'First name', sample: 'Priya' },
  { key: 'company', label: 'Company', sample: 'Acme Technologies' },
  { key: 'occasion', label: 'Occasion', sample: 'Diwali 2026' },
  { key: 'order_number', label: 'Order number', sample: 'ECO-1042' },
  { key: 'items', label: 'Items, one per line', sample: '• 120 × Cork Diary @ ₹450 = ₹54,000\n• 120 × Bamboo Bottle @ ₹380 = ₹45,600' },
  { key: 'total', label: 'Order total (incl. GST)', sample: '₹1,17,528' },
  { key: 'advance', label: 'Advance received', sample: '₹50,000' },
  { key: 'balance', label: 'Balance due', sample: '₹67,528' },
  { key: 'delivery_date', label: 'Delivery date', sample: '25 Oct 2026' },
  { key: 'sender_name', label: 'Your name', sample: 'Rahul' },
] as const;

export type PlaceholderKey = (typeof PLACEHOLDERS)[number]['key'];
export type TemplateVars = Partial<Record<PlaceholderKey, string>>;

export const SAMPLE_VARS: TemplateVars = Object.fromEntries(PLACEHOLDERS.map((p) => [p.key, p.sample]));

const KNOWN = new Set<string>(PLACEHOLDERS.map((p) => p.key));
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// Replaces {{placeholders}} that have a value. Placeholders without a value stay visible
// ("{{company}}") so staff notice them, unless blankMissing is set (bulk sends), in which case
// known-but-empty ones are dropped and the spacing tidied. Unknown names always stay visible.
export function fillTemplate(text: string, vars: TemplateVars, { blankMissing = false } = {}): string {
  const out = text.replace(TOKEN_RE, (match, key: string) => {
    const value = (vars as Record<string, string | undefined>)[key];
    if (value != null && value !== '') return value;
    return blankMissing && KNOWN.has(key) ? '' : match;
  });
  if (!blankMissing) return out;
  return out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.!?])/g, '$1')
    .replace(/[ \t]+$/gm, '');
}

// Placeholder names still left in a text (after filling)
export const leftoverPlaceholders = (text: string) => [...new Set([...text.matchAll(TOKEN_RE)].map((m) => m[1]))];

export const isKnownPlaceholder = (key: string) => KNOWN.has(key);

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

const formatDay = (date: string) => {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const itemLines = (order: Pick<Order, 'items'>) =>
  (order.items ?? [])
    .filter((i) => i.product?.trim())
    .map((i) => {
      const qty = Number(i.quantity) || 0;
      const rate = Number(i.unit_price) || 0;
      return `• ${qty} × ${i.product.trim()} @ ${formatMoney(rate)} = ${formatMoney(qty * rate)}`;
    })
    .join('\n');

// Values for a template from whatever we know about the client
export function buildVars({
  lead, customer, order, senderName, recipientName,
}: {
  lead?: Lead | null;
  customer?: Pick<Customer, 'name' | 'company'> | null;
  order?: Order | null;
  senderName: string;
  recipientName?: string;
}): TemplateVars {
  const name = (customer?.name || lead?.name || order?.customer?.name || recipientName || '').trim();
  const vars: TemplateVars = {
    name,
    first_name: firstName(name),
    company: (customer?.company || lead?.company || order?.customer?.company || '').trim(),
    occasion: (order?.occasion || lead?.occasion || lead?.interest || '').trim(),
    sender_name: senderName.trim(),
  };
  if (order) {
    const total = Number(order.total_amount) || 0;
    const advance = Number(order.advance_paid) || 0;
    vars.order_number = orderNumber(order.number);
    vars.items = itemLines(order);
    vars.total = formatMoney(total);
    vars.advance = formatMoney(advance);
    vars.balance = formatMoney(Math.max(0, total - advance));
    if (order.delivery_date) vars.delivery_date = formatDay(order.delivery_date);
  } else if (lead && (lead.product || lead.quantity)) {
    // A lead has no priced items yet: show what they asked for
    vars.items = `• ${[lead.quantity && `${lead.quantity} ×`, lead.product || 'Gifts'].filter(Boolean).join(' ')}`;
  }
  // Drop empty values so the placeholder stays visible
  for (const k of Object.keys(vars) as PlaceholderKey[]) if (!vars[k]) delete vars[k];
  return vars;
}
