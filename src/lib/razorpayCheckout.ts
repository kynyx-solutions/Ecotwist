/* ============================
   Razorpay Checkout (the payment window: UPI, cards, net banking, wallets).
   The script is loaded only when a customer pays, so it never slows the site down.
============================ */

export interface PaymentStart {
  orderId: string; // our order id
  key: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  prefill: { name: string; email: string; contact: string };
}

export interface PaymentSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void }
declare global { interface Window { Razorpay?: new (options: object) => RazorpayInstance } }

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error('Could not load the payment window. Check your connection and try again.')); };
    document.body.appendChild(s);
  });
  return loading;
}

/**
 * Opens the payment window. Resolves with Razorpay's success response,
 * or null if the customer closes it without paying (failed attempts can be retried inside the window).
 */
export async function payWithRazorpay(p: PaymentStart, orderNo: string): Promise<PaymentSuccess | null> {
  await loadScript();
  return new Promise((resolve) => {
    let settled = false;
    const rzp = new window.Razorpay!({
      key: p.key,
      order_id: p.razorpayOrderId,
      amount: p.amount,
      currency: p.currency,
      name: 'Ecotwist',
      description: `Order ${orderNo}`,
      // Razorpay fetches the logo itself, so it must be a public address (not localhost)
      image: 'https://ecotwist.in/site/navigation/logo.png',
      prefill: p.prefill,
      notes: { order_no: orderNo },
      theme: { color: '#38461B' },
      retry: { enabled: true, max_count: 3 },
      handler: (r: PaymentSuccess) => { settled = true; resolve(r); },
      modal: { confirm_close: true, ondismiss: () => { if (!settled) resolve(null); } },
    });
    rzp.on('payment.failed', (r) => {
      // Razorpay keeps the window open for a retry; only report if the customer gives up
      console.warn('[razorpay] payment failed', r.error?.description);
    });
    rzp.open();
  });
}
