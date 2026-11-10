// Razorpay payment link for an order, made from the admin after the customer approves the mockup.
//   POST /api/admin/payment-link { orderId, amount, description? } → { link }
// Razorpay emails and texts the link to the customer; /api/store/razorpay-webhook marks the
// order paid when they pay. Needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
import { readJson, requireStaff } from '../_lib/admin.js';

export default async function handler(req, res) {
  const ctx = await requireStaff(req, res);
  if (!ctx) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) return res.status(500).json({ error: 'Razorpay is not set up: add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel → Settings → Environment Variables.' });

  const { orderId, amount, description } = readJson(req);
  const rupees = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(rupees) || rupees < 1) return res.status(400).json({ error: 'Enter an amount of at least ₹1.' });

  const { db } = ctx;
  const { data: order } = await db.from('orders').select('*, customer:customers(name, company, email, phone)').eq('id', String(orderId ?? '')).maybeSingle();
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const orderNo = `ECO-${order.number}`;
  const contact = order.contact ?? {};
  const name = contact.name || order.customer?.name || '';
  const email = contact.email || order.customer?.email || '';
  const phone = String(contact.phone || order.customer?.phone || '').replace(/[^\d+]/g, '');

  const r = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${keyId}:${secret}`).toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(rupees * 100), // paise
      currency: 'INR',
      accept_partial: false,
      reference_id: `${orderNo}-${Date.now().toString(36)}`,
      description: String(description || `Ecotwist order ${orderNo}`).slice(0, 2048),
      customer: { name, ...(email ? { email } : {}), ...(phone ? { contact: phone } : {}) },
      notify: { email: !!email, sms: !!phone },
      reminder_enable: true,
      notes: { order_id: order.id, order_no: orderNo },
      callback_url: 'https://ecotwist.in/order-placed?paid=1&order=' + encodeURIComponent(orderNo),
      callback_method: 'get',
    }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('[admin/payment-link] razorpay', r.status, json);
    return res.status(502).json({ error: `Razorpay: ${json.error?.description ?? 'could not create the link.'}` });
  }

  const link = { id: json.id, url: json.short_url, amount: rupees, status: json.status, created_at: new Date().toISOString() };
  const patch = { payment_link: link, ...(['new', 'quote'].includes(order.status) ? { status: 'mockup_sent' } : {}) };
  const { error } = await db.from('orders').update(patch).eq('id', order.id);
  if (error) console.error('[admin/payment-link] save', error);
  return res.status(200).json({ link, status: patch.status ?? order.status });
}
