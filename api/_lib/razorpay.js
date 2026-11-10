// Razorpay API and "mark this order paid", shared by checkout verification and the webhook.
import crypto from 'crypto';
import { sendOrderEmails } from './order-emails.js';

export function razorpayKeys() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return id && secret ? { id, secret } : null;
}

export async function razorpay(path, { method = 'GET', body } = {}) {
  const keys = razorpayKeys();
  if (!keys) throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set');
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${keys.id}:${keys.secret}`).toString('base64'),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Razorpay ${r.status}: ${json.error?.description ?? 'request failed'}`);
  return json;
}

// Checkout signature: HMAC-SHA256 of "<razorpay_order_id>|<razorpay_payment_id>" with the key secret
export function validCheckoutSignature(orderId, paymentId, signature) {
  const keys = razorpayKeys();
  if (!keys || !orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac('sha256', keys.secret).update(`${orderId}|${paymentId}`).digest('hex');
  const given = String(signature);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Records a captured payment on the order once (safe to call twice for the same payment),
 * moves it to Confirmed and sends the order emails the first time it is paid.
 * Returns the updated order row.
 */
export async function markOrderPaid(db, order, payment) {
  const payments = Array.isArray(order.payments) ? order.payments : [];
  if (payments.some((p) => p.id === payment.id)) return order;

  const amount = Number(payment.amount ?? 0) / 100;
  const firstPayment = order.status === 'awaiting_payment';
  const patch = {
    payments: [...payments, {
      id: payment.id, amount, method: payment.method ?? '',
      paid_at: new Date((payment.created_at ?? Date.now() / 1000) * 1000).toISOString(),
      link_id: payment.order_id ?? '',
    }],
    advance_paid: Math.round((Number(order.advance_paid) + amount) * 100) / 100,
    ...(firstPayment ? { status: 'confirmed' } : {}),
  };
  const { data, error } = await db.from('orders').update(patch).eq('id', order.id).select('*').single();
  if (error) throw error;
  if (firstPayment) await sendOrderEmails(db, data, { paid: true }).catch((e) => console.error('[store] email failed', e));
  return data;
}

/** Fetches the payment from Razorpay and captures it if it is only authorised. */
export async function capturedPayment(paymentId, expectedAmountPaise) {
  let p = await razorpay(`/payments/${encodeURIComponent(paymentId)}`);
  if (p.status === 'authorized') {
    p = await razorpay(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: 'POST', body: { amount: p.amount, currency: p.currency } });
  }
  if (p.status !== 'captured') throw new Error(`Payment is ${p.status}`);
  if (expectedAmountPaise != null && Number(p.amount) !== Number(expectedAmountPaise)) throw new Error('Paid amount does not match the order');
  return p;
}
