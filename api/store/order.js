// Website store checkout → a new order in the admin and a Razorpay order to pay it.
// Carts with a 500+ line are saved as quote requests instead (no online payment).
//
// POST /api/store/order {
//   items: [{ id, quantity: 25|50|100|200|500|"500+", branding, brandText, logoPath, notes }],
//   contact: { name, company, email, phone, gstin, address, city, pincode, deliveryDate, notes },
//   website  // hidden honeypot: people leave it empty
// }
// Prices are worked out here from src/content/store.json; any price sent by the browser is ignored.
// Needs VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_ID/SECRET; RESEND_API_KEY for emails.
// Emails for paid orders go out once the payment is verified (/api/store/verify-payment).
import { serviceClient } from '../_lib/admin.js';
import { clientIp, deliveryFor, rateLimiter, storeData, unitPrice } from '../_lib/store.js';
import { razorpay, razorpayKeys } from '../_lib/razorpay.js';
import { sendOrderEmails } from '../_lib/order-emails.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;
const LOGO_PATH_RE = /^pending\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.[a-z]{2,4}$/;
const MAX_ITEMS = 30;

const CONTACT = { name: 120, company: 160, email: 200, phone: 30, gstin: 15, address: 600, city: 80, pincode: 6, deliveryDate: 10, notes: 2000 };
const REQUIRED = ['name', 'company', 'email', 'phone', 'address', 'city', 'pincode'];

const limited = rateLimiter(5, 10 * 60 * 1000); // 5 orders per IP per 10 minutes

// Razorpay prefills the mobile only in +<country><number> form; 10-digit numbers are Indian
const phoneE164 = (p) => {
  const d = String(p ?? '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  if (/^0?[6-9]\d{9}$/.test(d)) return '+91' + d.slice(-10);
  if (/^91[6-9]\d{9}$/.test(d)) return '+' + d;
  return d;
};

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
  // Delivery: free above the threshold (on the subtotal before GST), otherwise a flat fee; quotes are priced later
  const deliveryFee = items.some((i) => i.quote_only) ? 0 : deliveryFor(subtotal, settings);
  const total = Math.round(subtotal * (1 + gstRate / 100)) + deliveryFee;

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

  // Priced orders are paid now through Razorpay; carts with a 500+ line are quote requests
  const quoteRequest = items.some((i) => i.quote_only);
  // Above the Razorpay per-payment limit: save it and send a GST invoice for bank transfer instead
  const maxOnline = Number(settings.maxOnlinePayment ?? 0);
  let invoiceRequest = !quoteRequest && maxOnline > 0 && total > maxOnline;
  const offline = () => quoteRequest || invoiceRequest;
  if (!offline() && !razorpayKeys()) return fail(res, 500, 'Online payment is not set up yet. Please email info@ecotwist.in.');
  if (!offline() && total < 1) return fail(res, 400, 'Your order total is zero.');

  const { data: order, error } = await db.from('orders').insert({
    customer_id: customerId,
    source: 'store',
    status: offline() ? 'new' : 'awaiting_payment',
    occasion: quoteRequest ? 'Website quote request' : invoiceRequest ? 'Website order (invoice / bank transfer)' : 'Website store',
    items,
    gst_rate: gstRate,
    delivery_fee: deliveryFee,
    total_amount: total,
    delivery_date: contact.deliveryDate || null,
    delivery_address: `${contact.address}\n${contact.city} ${contact.pincode}`,
    notes: contact.notes,
    contact: { ...contact, userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300) },
  }).select('*').single();

  if (error) {
    console.error('[store/order] order insert failed', error);
    return fail(res, 500, 'Could not place your order. Please try again.');
  }
  const orderNo = `ECO-${order.number}`;

  const offlineReply = async (row) => {
    await sendOrderEmails(db, row, { paid: false, invoice: invoiceRequest }).catch((e) => console.error('[store/order] email failed', e));
    return res.status(200).json({ success: true, order: orderNo, quote: quoteRequest, invoice: invoiceRequest });
  };
  if (offline()) return offlineReply(order);

  // Razorpay order for the exact total (in paise); the browser opens Checkout with it
  try {
    const rzp = await razorpay('/orders', {
      method: 'POST',
      body: { amount: Math.round(total * 100), currency: 'INR', receipt: orderNo, notes: { order_id: order.id, order_no: orderNo, company: contact.company.slice(0, 200) } },
    });
    await db.from('orders').update({ razorpay_order_id: rzp.id }).eq('id', order.id);
    return res.status(200).json({
      success: true,
      order: orderNo,
      payment: {
        orderId: order.id,
        key: razorpayKeys().id,
        razorpayOrderId: rzp.id,
        amount: rzp.amount,
        currency: rzp.currency,
        prefill: { name: contact.name, email: contact.email, contact: phoneE164(contact.phone) },
      },
    });
  } catch (e) {
    console.error('[store/order] razorpay order failed', e);
    // Razorpay's own per-payment limit can be lower than our setting: fall back to an invoice
    if (/maximum amount/i.test(e.message)) {
      invoiceRequest = true;
      const { data: row } = await db.from('orders').update({ status: 'new', occasion: 'Website order (invoice / bank transfer)' }).eq('id', order.id).select('*').single();
      return offlineReply(row ?? order);
    }
    await db.from('orders').update({ status: 'cancelled', notes: `${contact.notes}\n[Payment could not start: ${e.message}]`.trim() }).eq('id', order.id);
    return fail(res, 502, 'Online payment could not start. Please try again in a minute or email info@ecotwist.in.');
  }
}
