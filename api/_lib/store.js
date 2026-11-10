// Store products and prices, read from src/content/store.json (the same file the
// website and admin use). The server always prices orders from this file, never
// from what the browser sends. Bundled with the functions via "includeFiles".
import fs from 'fs';
import path from 'path';

let cache;
export function storeData() {
  if (!cache) cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/content/store.json'), 'utf8'));
  return cache;
}

// Rupees per kit at a quantity, after that quantity's discount. null = quote only.
export function unitPrice(product, quantity, settings) {
  if (product.price == null) return null;
  const pct = Number(settings.discounts?.[String(quantity)] ?? 0);
  return Math.round(product.price * (1 - pct / 100));
}

// Delivery charge in rupees: free when the subtotal (before GST) is above the threshold
export function deliveryFor(subtotal, settings) {
  if (!(subtotal > 0)) return 0;
  return subtotal > Number(settings.freeDeliveryAbove ?? 0) ? 0 : Number(settings.deliveryFee ?? 0);
}

export const LOGO_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  pdf: 'application/pdf',
  ai: 'application/postscript',
  eps: 'application/postscript',
};
export const LOGO_MAX_BYTES = 10 * 1024 * 1024;

// Best-effort limit per server instance
export function rateLimiter(limit, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    return recent.length > limit;
  };
}

export const clientIp = (req) => String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
