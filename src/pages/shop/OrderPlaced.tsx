import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

/* Shown after a store order is placed (/order-placed?order=ECO-1234&email=…). */

const C = { ink: '#1f2a17', olive: '#38461B', muted: '#5f6655', cream: '#FAF9F6' };

export default function OrderPlaced() {
  const [params] = useSearchParams();
  const order = params.get('order') ?? '';
  const email = params.get('email') ?? '';
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 pb-20 pt-32 text-center" style={{ background: C.cream }}>
      <CheckCircle2 size={48} style={{ color: C.olive }} />
      <h1 className="mt-5 font-serif text-4xl sm:text-5xl" style={{ color: C.ink }}>Thank you for your order</h1>
      {order && <p className="mt-3 text-lg" style={{ color: C.ink }}>Order <b>{order}</b></p>}
      <p className="mt-4 max-w-lg leading-7" style={{ color: C.muted }}>
        {email ? <>A confirmation is on its way to <b>{email}</b>. </> : null}
        Within 2 working days we will send you a branded mockup. Once you approve it, we share a secure payment link and start production.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/shop" className="rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white" style={{ background: C.olive }}>Continue shopping</Link>
        <a href="https://wa.me/917091323777" target="_blank" rel="noopener noreferrer" className="rounded-full border-2 px-8 py-3 text-sm font-bold uppercase tracking-[0.14em]" style={{ borderColor: C.olive, color: C.olive }}>WhatsApp us</a>
      </div>
    </div>
  );
}
