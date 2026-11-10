// Razorpay webhook: confirms orders even when the customer closes the browser right after paying.
//   Razorpay Dashboard → Account & Settings → Webhooks → URL https://ecotwist.in/api/store/razorpay-webhook,
//   events "order.paid" and "payment.captured", with a secret saved here as RAZORPAY_WEBHOOK_SECRET.
// The signature is checked on the raw body, so a forged request can't mark an order paid.
import crypto from 'crypto';
import { serviceClient } from '../_lib/admin.js';
import { markOrderPaid } from '../_lib/razorpay.js';

export const config = { api: { bodyParser: false } };

// Read the request stream before touching req.body: Vercel parses req.body lazily,
// and parsing consumes the stream (the signature needs the exact original bytes).
async function rawBody(req) {
  if (typeof req.rawBody === 'string') return req.rawBody; // dev server (scripts/vite-plugin-api.js) already read it
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
  if (!['order.paid', 'payment.captured'].includes(event.event)) return res.status(200).json({ ignored: event.event });

  const payment = event.payload?.payment?.entity ?? {};
  const rzpOrderId = payment.order_id ?? event.payload?.order?.entity?.id;
  if (!payment.id || !rzpOrderId || payment.status !== 'captured') return res.status(200).json({ ignored: 'not a captured order payment' });

  const db = serviceClient();
  const { data: order } = await db.from('orders').select('*').eq('razorpay_order_id', rzpOrderId).maybeSingle();
  if (!order) return res.status(200).json({ ignored: 'order not found' });
  if (Number(payment.amount) !== Math.round(Number(order.total_amount) * 100)) {
    console.error('[razorpay-webhook] amount mismatch', order.number, payment.amount, order.total_amount);
    return res.status(200).json({ ignored: 'amount mismatch' });
  }

  try {
    await markOrderPaid(db, order, payment);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[razorpay-webhook] update failed', e);
    return res.status(500).json({ error: 'save failed' }); // Razorpay retries
  }
}
