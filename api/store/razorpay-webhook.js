// Razorpay → "payment_link.paid": records the payment on the order and moves it to Confirmed.
//   Razorpay Dashboard → Settings → Webhooks → URL https://ecotwist.in/api/store/razorpay-webhook,
//   event payment_link.paid, and a secret saved here as RAZORPAY_WEBHOOK_SECRET.
// The signature is checked on the raw body, so a forged request can't mark an order paid.
import crypto from 'crypto';
import { serviceClient } from '../_lib/admin.js';

export const config = { api: { bodyParser: false } };

// Read the request stream before touching req.body: Vercel parses req.body lazily,
// and parsing consumes the stream (the signature needs the exact original bytes).
async function rawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'RAZORPAY_WEBHOOK_SECRET is not set' });

  const body = await rawBody(req);
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const given = String(req.headers['x-razorpay-signature'] ?? '');
  const ok = given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: 'Bad signature' });

  const event = JSON.parse(body);
  if (event.event !== 'payment_link.paid') return res.status(200).json({ ignored: event.event });

  const link = event.payload?.payment_link?.entity ?? {};
  const payment = event.payload?.payment?.entity ?? {};
  const orderId = link.notes?.order_id;
  if (!orderId || !payment.id) return res.status(200).json({ ignored: 'no order' });

  const db = serviceClient();
  const { data: order } = await db.from('orders').select('id, status, advance_paid, payments, payment_link').eq('id', orderId).maybeSingle();
  if (!order) return res.status(200).json({ ignored: 'order not found' });

  const payments = Array.isArray(order.payments) ? order.payments : [];
  if (payments.some((p) => p.id === payment.id)) return res.status(200).json({ duplicate: true });

  const amount = Number(payment.amount ?? link.amount_paid ?? 0) / 100;
  const update = {
    payments: [...payments, { id: payment.id, amount, method: payment.method ?? '', paid_at: new Date((payment.created_at ?? Date.now() / 1000) * 1000).toISOString(), link_id: link.id }],
    advance_paid: Math.round((Number(order.advance_paid) + amount) * 100) / 100,
    ...(order.payment_link?.id === link.id ? { payment_link: { ...order.payment_link, status: 'paid' } } : {}),
    ...(['new', 'quote', 'mockup_sent'].includes(order.status) ? { status: 'confirmed' } : {}),
  };
  const { error } = await db.from('orders').update(update).eq('id', order.id);
  if (error) {
    console.error('[razorpay-webhook] update failed', error);
    return res.status(500).json({ error: 'save failed' }); // Razorpay retries
  }
  return res.status(200).json({ ok: true });
}
