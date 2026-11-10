import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';

/* Shown after checkout: /order-placed?order=ECO-1234&email=…&paid=1 (or &quote=1).
   &pending=1 means the payment went through but our check hadn't finished;
   the Razorpay webhook confirms it within minutes. */

const C = { ink: '#1f2a17', olive: '#38461B', muted: '#5f6655', cream: '#FAF9F6' };

export default function OrderPlaced() {
  const [params] = useSearchParams();
  const order = params.get('order') ?? '';
  const email = params.get('email') ?? '';
  const quote = params.get('quote') === '1';
  const pending = params.get('pending') === '1';
  const Icon = pending ? Clock : CheckCircle2;
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 pb-20 pt-32 text-center" style={{ background: C.cream }}>
      <Icon size={48} style={{ color: C.olive }} />
      <h1 className="mt-5 font-serif text-4xl sm:text-5xl" style={{ color: C.ink }}>
        {quote ? 'Quote request received' : pending ? 'Payment received, confirming…' : 'Payment successful'}
      </h1>
      {order && <p className="mt-3 text-lg" style={{ color: C.ink }}>Order <b>{order}</b></p>}
      <p className="mt-4 max-w-lg leading-7" style={{ color: C.muted }}>
        {email ? <>{quote || !pending ? 'A confirmation is on its way to ' : 'You will get a confirmation at '}<b>{email}</b>. </> : null}
        {quote
          ? 'Within 2 working days we will email you a quote and a branded mockup.'
          : pending
            ? 'Your bank confirmed the payment and we are finishing the check. This usually takes a few minutes; there is no need to pay again.'
            : 'Within 2 working days we will email a branded mockup for your approval, then produce and deliver your gifts with a GST invoice.'}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/shop" className="rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white" style={{ background: C.olive }}>Continue shopping</Link>
        <a href="https://wa.me/917091323777" target="_blank" rel="noopener noreferrer" className="rounded-full border-2 px-8 py-3 text-sm font-bold uppercase tracking-[0.14em]" style={{ borderColor: C.olive, color: C.olive }}>WhatsApp us</a>
      </div>
    </div>
  );
}
