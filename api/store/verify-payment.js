// Called by the checkout page right after Razorpay reports success.
//   POST /api/store/verify-payment { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Checks Razorpay's signature, confirms the payment is captured for the full amount,
// then marks the order paid (status → Confirmed) and sends the order emails.
import { serviceClient } from '../_lib/admin.js';
import { capturedPayment, markOrderPaid, validCheckoutSignature } from '../_lib/razorpay.js';
import { clientIp, rateLimiter } from '../_lib/store.js';

const limited = rateLimiter(20, 10 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (limited(clientIp(req))) return res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  const { orderId, razorpay_order_id: rzpOrder, razorpay_payment_id: paymentId, razorpay_signature: signature } = b;

  if (!validCheckoutSignature(rzpOrder, paymentId, signature)) {
    return res.status(400).json({ error: 'We could not verify this payment. If money was taken, it will be confirmed automatically within a few minutes.' });
  }

  try {
    const db = serviceClient();
    const { data: order } = await db.from('orders').select('*').eq('id', String(orderId ?? '')).eq('razorpay_order_id', String(rzpOrder)).maybeSingle();
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const payment = await capturedPayment(paymentId, Math.round(Number(order.total_amount) * 100));
    const paid = await markOrderPaid(db, order, payment);
    return res.status(200).json({ success: true, order: `ECO-${paid.number}` });
  } catch (e) {
    console.error('[store/verify-payment]', e);
    return res.status(502).json({ error: 'Your payment went through but we could not confirm it yet. It will be confirmed automatically within a few minutes, and you will get an email.' });
  }
}
