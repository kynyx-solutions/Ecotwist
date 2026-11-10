import { useSyncExternalStore } from 'react';
import data from '../content/store.json';

/* ============================
   Online store: products, prices and the cart.
   Products and prices come from src/content/store.json (admin → Store → Products).
   The server re-prices every order from the same file, so the numbers here are
   for display only.
============================ */

export interface StoreProduct {
  id: string;
  name: string;
  contents: string;
  image: string;
  images?: string[];
  price: number | null; // rupees per kit at the base quantity; null = quote only
  occasions: string[];
  active: boolean;
  featured: boolean;
}

export const settings = data.settings;
export const products = (data.products as StoreProduct[]).filter((p) => p.active);
export const productById = (id: string) => products.find((p) => p.id === id);
export const QUOTE = settings.quoteOnlyLabel; // "500+"
export const QUANTITY_OPTIONS = [...settings.quantities.map(String), QUOTE];
export const BRANDING = settings.brandingOptions;

export const occasions = [...new Set(products.flatMap((p) => p.occasions))].sort();

export const discountFor = (qty: string) => Number((settings.discounts as Record<string, number>)[qty] ?? 0);

/** Rupees per kit at a quantity, or null when it's quote only. */
export function unitPrice(p: StoreProduct, qty: string): number | null {
  if (p.price == null || qty === QUOTE) return null;
  return Math.round(p.price * (1 - discountFor(qty) / 100));
}

/** Delivery in rupees: free above the threshold (subtotal before GST), otherwise a flat fee. */
export function deliveryFor(subtotal: number) {
  if (!(subtotal > 0)) return 0;
  return subtotal > settings.freeDeliveryAbove ? 0 : settings.deliveryFee;
}
export const FREE_DELIVERY_ABOVE = settings.freeDeliveryAbove;

export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export const productImages = (p: StoreProduct) => [p.image, ...(p.images ?? [])].filter(Boolean);

/* ── Cart (this browser only) ────────────────────────────────── */

export interface CartLine {
  key: string; // one line per product + branding choice
  id: string;
  quantity: string; // "25" … "500" or "500+"
  branding: string;
  brandText: string;
  logoPath: string; // private storage path once uploaded
  logoName: string;
  notes: string;
}

const KEY = 'ecotwist-cart';
const listeners = new Set<() => void>();
let lines: CartLine[] = read();

function read(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((l) => productById(l.id)) : [];
  } catch {
    return [];
  }
}

function write(next: CartLine[]) {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the cart lasts for this visit only */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      lines = read();
      listeners.forEach((l) => l());
    }
  });
}

export const cart = {
  add(line: Omit<CartLine, 'key'>) {
    const key = `${line.id}:${Date.now().toString(36)}`;
    write([...lines, { ...line, key }]);
  },
  update(key: string, patch: Partial<CartLine>) {
    write(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  },
  remove(key: string) {
    write(lines.filter((l) => l.key !== key));
  },
  clear() {
    write([]);
  },
};

export function useCart() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => lines,
    () => lines,
  );
}

export function cartTotals(cartLines: CartLine[]) {
  let subtotal = 0;
  let quoteItems = 0;
  for (const l of cartLines) {
    const p = productById(l.id);
    const u = p ? unitPrice(p, l.quantity) : null;
    if (u == null) quoteItems++;
    else subtotal += u * Number(l.quantity);
  }
  const gst = Math.round((subtotal * settings.gstRate) / 100);
  const delivery = quoteItems ? 0 : deliveryFor(subtotal);
  return { subtotal, gst, delivery, total: subtotal + gst + delivery, quoteItems };
}
