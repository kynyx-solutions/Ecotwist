// Website store checkout → a new order in the admin, plus emails to the team and the customer.
//
// POST /api/store/order {
//   items: [{ id, quantity: 25|50|100|200|500|"500+", branding, brandText, logoPath, notes }],
//   contact: { name, company, email, phone, gstin, address, city, pincode, deliveryDate, notes },
//   website  // hidden honeypot: people leave it empty
// }
// Prices are worked out here from src/content/store.json; any price sent by the browser is ignored.
// Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; RESEND_API_KEY / ALERT_FROM_EMAIL for emails.
import { serviceClient } from '../_lib/admin.js';
import { clientIp, rateLimiter, storeData, unitPrice } from '../_lib/store.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;
const LOGO_PATH_RE = /^pending\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.[a-z]{2,4}$/;
const MAX_ITEMS = 30;

const CONTACT = { name: 120, company: 160, email: 200, phone: 30, gstin: 15, address: 600, city: 80, pincode: 6, deliveryDate: 10, notes: 2000 };
const REQUIRED = ['name', 'company', 'email', 'phone', 'address', 'city', 'pincode'];

const limited = rateLimiter(5, 10 * 60 * 1000); // 5 orders per IP per 10 minutes

const fail = (res, status, error) => res.status(status).json({ success: false, error });
const str = (v, max) => {
  const s = v == null ? '' : String(v).trim();
  return s.length > max ? null : s;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  if (body.website) return res.status(200).json({ success: true, order: 'ECO-0000' }); // bot
  if (limited(clientIp(req))) return fail(res, 429, 'Too many orders from this connection. Please try again in a few minutes.');

  // ── Contact ──
  const contact = {};
  for (const [field, max] of Object.entries(CONTACT)) {
    const v = str(body.contact?.[field], max);
    if (v === null) return fail(res, 400, `${field} is too long.`);
    contact[field] = v;
  }
  for (const f of REQUIRED) if (!contact[f]) return fail(res, 400, `Please fill in ${f === 'pincode' ? 'the PIN code' : f}.`);
  if (!EMAIL_RE.test(contact.email)) return fail(res, 400, 'Please enter a valid email address.');
  contact.gstin = contact.gstin.toUpperCase();
  if (contact.gstin && !GSTIN_RE.test(contact.gstin)) return fail(res, 400, 'Please check the GST number (15 characters, e.g. 10ABCDE1234F1Z5).');
  if (!PINCODE_RE.test(contact.pincode)) return fail(res, 400, 'Please enter a valid 6-digit PIN code.');
  if (contact.deliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(contact.deliveryDate)) contact.deliveryDate = '';

  // ── Items, priced from store.json ──
  const { products, settings } = storeData();
  const byId = new Map(products.filter((p) => p.active).map((p) => [p.id, p]));
  const allowedQty = new Set(settings.quantities.map(String));
  const raw = Array.isArray(body.items) ? body.items : [];
  if (!raw.length) return fail(res, 400, 'Your cart is empty.');
  if (raw.length > MAX_ITEMS) return fail(res, 400, `Please order at most ${MAX_ITEMS} different items at a time.`);

  const items = [];
  for (const it of raw) {
    const product = byId.get(String(it?.id ?? ''));
    if (!product) return fail(res, 400, 'One of the items is no longer available. Please remove it from your cart.');
    const qtyRaw = String(it.quantity ?? '');
    const quoteOnly = qtyRaw === settings.quoteOnlyLabel;
    if (!quoteOnly && !allowedQty.has(qtyRaw)) return fail(res, 400, `Please choose a quantity for ${product.name}.`);
    const branding = settings.brandingOptions.includes(it.branding) ? it.branding : settings.brandingOptions[0];
    const brandText = str(it.brandText, 120);
    const notes = str(it.notes, 500);
    if (brandText === null || notes === null) return fail(res, 400, 'Branding text or notes are too long.');
    const logoPath = it.logoPath ? String(it.logoPath) : '';
    if (logoPath && !LOGO_PATH_RE.test(logoPath)) return fail(res, 400, 'The logo upload is invalid. Please upload it again.');

    const quantity = quoteOnly ? Number(settings.quantities.at(-1)) : Number(qtyRaw);
    const price = quoteOnly ? null : unitPrice(product, quantity, settings);
    items.push({
      product: product.name,
      product_id: product.id,
      quantity,
      quantity_label: quoteOnly ? settings.quoteOnlyLabel : qtyRaw,
      unit_price: price ?? 0,
      quote_only: quoteOnly || price == null,
      branding,
      brand_text: brandText,
      logo_path: logoPath,
      notes,
    });
  }

  let db;
  try {
    db = serviceClient();
  } catch {
    return fail(res, 500, 'The store is not set up yet. Please email info@ecotwist.in.');
  }

  // Logos must really have been uploaded through our link
  for (const item of items.filter((i) => i.logo_path)) {
    const dir = item.logo_path.slice(0, item.logo_path.lastIndexOf('/'));
    const file = item.logo_path.slice(dir.length + 1);
    const { data } = await db.storage.from('order-logos').list(dir, { search: file, limit: 1 });
    if (!data?.length) return fail(res, 400, `The logo for ${item.product} did not finish uploading. Please upload it again.`);
  }

  const gstRate = Number(settings.gstRate ?? 18);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.round(subtotal * (1 + gstRate / 100));

  // ── Customer: match by email, otherwise create ──
  let customerId;
  const { data: existing } = await db.from('customers').select('id').ilike('email', contact.email).limit(1).maybeSingle();
  if (existing) customerId = existing.id;
  else {
    const { data: created, error } = await db.from('customers').insert({
      name: contact.name, company: contact.company, email: contact.email, phone: contact.phone,
      gstin: contact.gstin, address: `${contact.address}, ${contact.city} ${contact.pincode}`, city: contact.city,
      notes: 'Created from a website store order',
    }).select('id').single();
    if (error) {
      console.error('[store/order] customer insert failed', error);
      return fail(res, 500, 'Could not place your order. Please try again.');
    }
    customerId = created.id;
  }

  const { data: order, error } = await db.from('orders').insert({
    customer_id: customerId,
    source: 'store',
    status: 'new',
    occasion: 'Website store',
    items,
    gst_rate: gstRate,
    total_amount: total,
    delivery_date: contact.deliveryDate || null,
    delivery_address: `${contact.address}\n${contact.city} ${contact.pincode}`,
    notes: contact.notes,
    contact: { ...contact, userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300) },
  }).select('id, number').single();

  if (error) {
    console.error('[store/order] order insert failed', error);
    return fail(res, 500, 'Could not place your order. Please try again.');
  }

  const orderNo = `ECO-${order.number}`;
  await sendEmails(db, orderNo, order.id, contact, items, subtotal, gstRate, total).catch((e) => console.error('[store/order] email failed', e));
  return res.status(200).json({ success: true, order: orderNo, total, quoteOnly: items.some((i) => i.quote_only) });
}

/* ── Emails ───────────────────────────────────────────────────── */

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function itemRows(items) {
  return items.map((i) => `<tr>
    <td style="padding:8px 12px 8px 0;border-bottom:1px solid #eee"><b>${esc(i.product)}</b><br><span style="color:#666;font-size:13px">${esc(i.branding)}${i.brand_text ? ` · "${esc(i.brand_text)}"` : ''}${i.logo_path ? ' · logo uploaded' : ''}</span></td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${esc(i.quantity_label)}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${i.quote_only ? 'Quote' : inr(i.quantity * i.unit_price)}</td></tr>`).join('');
}

async function send(apiKey, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

async function sendEmails(db, orderNo, orderId, contact, items, subtotal, gstRate, total) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const quote = items.some((i) => i.quote_only);
  const table = `<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%;max-width:560px">
    <tr><th align="left" style="padding-bottom:6px">Item</th><th align="right" style="padding:0 12px 6px">Qty</th><th align="right" style="padding-bottom:6px">Amount</th></tr>
    ${itemRows(items)}
    <tr><td colspan="2" style="padding:8px 12px 0 0;text-align:right">Subtotal</td><td style="padding-top:8px;text-align:right">${inr(subtotal)}</td></tr>
    <tr><td colspan="2" style="padding:4px 12px 0 0;text-align:right">GST ${gstRate}%</td><td style="padding-top:4px;text-align:right">${inr(total - subtotal)}</td></tr>
    <tr><td colspan="2" style="padding:4px 12px 0 0;text-align:right"><b>Total${quote ? ' (excl. quoted items)' : ''}</b></td><td style="padding-top:4px;text-align:right"><b>${inr(total)}</b></td></tr></table>`;

  const { data } = await db.from('settings').select('value').eq('key', 'lead_alert_emails').maybeSingle();
  const team = Array.isArray(data?.value) ? data.value.filter((e) => EMAIL_RE.test(e)) : [];
  if (team.length) {
    await send(apiKey, {
      from: process.env.ALERT_FROM_EMAIL || 'Ecotwist <onboarding@resend.dev>',
      to: team,
      reply_to: contact.email,
      subject: `New store order ${orderNo}: ${contact.company} (${inr(total)})`,
      html: `<h2 style="font-family:sans-serif">New website order ${orderNo}</h2>
        <p style="font-family:sans-serif">${esc(contact.name)} · ${esc(contact.company)} · ${esc(contact.email)} · ${esc(contact.phone)}${contact.gstin ? ` · GST ${esc(contact.gstin)}` : ''}</p>
        ${table}
        <p style="font-family:sans-serif"><a href="https://ecotwist.in/admin/orders/${orderId}">Open the order in admin</a> to download logos and send the mockup.</p>`,
    });
  }

  await send(apiKey, {
    from: process.env.MAIL_FROM || process.env.ALERT_FROM_EMAIL || 'Ecotwist <onboarding@resend.dev>',
    to: [contact.email],
    reply_to: team[0],
    subject: `We've received your order ${orderNo}`,
    html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;max-width:560px">
      <h2>Thank you, ${esc(contact.name.split(' ')[0])}!</h2>
      <p>We've received order <b>${orderNo}</b> for ${esc(contact.company)}. Here's what happens next:</p>
      <ol><li>Within 2 working days we send you a mockup with your branding${quote ? ' and a quote for the 500+ items' : ''}.</li>
      <li>You approve it, and we send a secure payment link (UPI, cards, net banking or bank transfer).</li>
      <li>We produce and deliver your gifts, with a GST invoice.</li></ol>
      ${table}
      <p>Nothing is charged until you approve the mockup. Questions? Just reply to this email or WhatsApp +91 70913 23777.</p>
      <p>Team Ecotwist</p></div>`,
  });
}
