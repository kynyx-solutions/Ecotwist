import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, FileCheck2, Loader2, Lock, ShieldCheck, ShoppingBag, Trash2, Upload } from 'lucide-react';
import { asset } from '../../lib/content';
import { BRANDING, FREE_DELIVERY_ABOVE, QUANTITY_OPTIONS, cart, cartTotals, inr, productById, settings, unitPrice, useCart, type CartLine } from '../../lib/store';
import { LOGO_ACCEPT, uploadLogo } from '../../lib/logoUpload';
import { quantityLabel } from './ProductPage';
import { payWithRazorpay, type PaymentStart } from '../../lib/razorpayCheckout';

/* ============================
   Cart and checkout (/cart).
   1. /api/store/order re-prices the cart on the server, saves the order and
      creates a Razorpay order for the exact total.
   2. Razorpay Checkout opens (UPI, cards, net banking, wallets).
   3. /api/store/verify-payment checks the payment and confirms the order.
   Carts with a 500+ line are sent as a quote request instead (no payment).
============================ */

const C = { ink: '#1f2a17', olive: '#38461B', leaf: '#4A5D23', muted: '#5f6655', line: '#e6e0cf', cream: '#FAF9F6' };
const input = 'w-full rounded-xl border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2';

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium" style={{ color: C.ink }}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs" style={{ color: C.muted }}>{hint}</span>}
    </label>
  );
}

function Line({ line }: { line: CartLine }) {
  const p = productById(line.id)!;
  const unit = unitPrice(p, line.quantity);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const logoBranding = /logo/i.test(line.branding);

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true); setErr('');
    try { cart.update(line.key, { logoPath: await uploadLogo(file), logoName: file.name }); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex gap-4 border-b py-5" style={{ borderColor: C.line }}>
      <Link to={`/shop/${p.id}`} className="shrink-0"><img src={asset(p.image)} alt={p.name} className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28" /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/shop/${p.id}`} className="font-serif text-lg leading-snug hover:underline" style={{ color: C.ink }}>{p.name}</Link>
          <button type="button" onClick={() => cart.remove(line.key)} aria-label={`Remove ${p.name}`} style={{ color: C.muted }}><Trash2 size={17} /></button>
        </div>
        <p className="mt-0.5 text-sm" style={{ color: C.muted }}>{unit == null ? 'Quote' : `${inr(unit)} per kit`}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="relative">
            <select value={line.quantity} onChange={(e) => cart.update(line.key, { quantity: e.target.value })} aria-label="Quantity"
              className="w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-8 text-sm" style={{ borderColor: C.line }}>
              {QUANTITY_OPTIONS.map((q) => <option key={q} value={q}>{quantityLabel(q)}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
          </div>
          <div className="relative">
            <select value={line.branding} onChange={(e) => cart.update(line.key, { branding: e.target.value })} aria-label="Branding"
              className="w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-8 text-sm" style={{ borderColor: C.line }}>
              {BRANDING.map((b) => <option key={b}>{b}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
          </div>
        </div>
        {!/no branding/i.test(line.branding) && (
          <input value={line.brandText} onChange={(e) => cart.update(line.key, { brandText: e.target.value })} maxLength={120}
            placeholder="Company name or text to print" className="mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm" style={{ borderColor: C.line }} />
        )}
        {logoBranding && (
          <div className="mt-2 text-sm">
            {line.logoPath ? (
              <span className="inline-flex items-center gap-1.5" style={{ color: C.leaf }}><FileCheck2 size={15} /> {line.logoName || 'Logo uploaded'}</span>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold underline" style={{ color: C.olive }}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {busy ? 'Uploading…' : 'Upload logo (or send it later)'}
                <input type="file" accept={LOGO_ACCEPT} className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            )}
            {err && <p className="mt-1 text-red-700">{err}</p>}
          </div>
        )}
      </div>
      <p className="hidden w-28 shrink-0 text-right font-semibold sm:block" style={{ color: C.ink }}>{unit == null ? 'Quote' : inr(unit * Number(line.quantity))}</p>
    </div>
  );
}

export default function Cart() {
  const lines = useCart();
  const navigate = useNavigate();
  const totals = cartTotals(lines);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', gstin: '', address: '', city: '', pincode: '', deliveryDate: '', notes: '', website: '' });
  const [step, setStep] = useState<'idle' | 'saving' | 'paying' | 'verifying'>('idle');
  const [error, setError] = useState('');
  // An order already created whose payment window was closed: "Pay now" reopens it
  const [pending, setPending] = useState<{ orderNo: string; payment: PaymentStart; cartKey: string } | null>(null);
  const cartKey = JSON.stringify(lines.map((l) => [l.id, l.quantity, l.branding, l.brandText, l.logoPath]));
  useEffect(() => { if (pending && pending.cartKey !== cartKey) setPending(null); }, [cartKey, pending]);
  const quoteOnly = totals.quoteItems > 0;
  // Above the online payment limit: the order is placed and paid by bank transfer against a GST invoice
  const invoiceOnly = !quoteOnly && settings.maxOnlinePayment > 0 && totals.total > settings.maxOnlinePayment;
  const offline = quoteOnly || invoiceOnly;
  const busy = step !== 'idle';
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const pay = async (orderNo: string, payment: PaymentStart) => {
    setStep('paying');
    const result = await payWithRazorpay(payment, orderNo).catch((e: Error) => { setError(e.message); return null; });
    if (!result) {
      setStep('idle');
      setPending({ orderNo, payment, cartKey });
      return;
    }
    setStep('verifying');
    const res = await fetch('/api/store/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: payment.orderId, ...result }),
    });
    const json = await res.json().catch(() => ({}));
    cart.clear();
    // Paid either way; if the check failed, the webhook confirms it within minutes
    navigate(`/order-placed?order=${encodeURIComponent(orderNo)}&email=${encodeURIComponent(form.email)}&paid=1${res.ok ? '' : `&pending=1&msg=${encodeURIComponent(json.error ?? '')}`}`);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (pending) return pay(pending.orderNo, pending.payment);
    setStep('saving');
    try {
      const { website, ...contact } = form;
      const res = await fetch('/api/store/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website,
          contact,
          items: lines.map((l) => ({ id: l.id, quantity: l.quantity, branding: l.branding, brandText: l.brandText, logoPath: l.logoPath, notes: l.notes })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Could not place your order. Please try again or email info@ecotwist.in.');
      if (json.quote || json.invoice) {
        cart.clear();
        return navigate(`/order-placed?order=${encodeURIComponent(json.order)}&email=${encodeURIComponent(form.email)}&${json.quote ? 'quote' : 'invoice'}=1`);
      }
      await pay(json.order, json.payment);
    } catch (err) {
      setError((err as Error).message);
      setStep('idle');
    }
  };

  if (!lines.length) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 pb-20 pt-32 text-center" style={{ background: C.cream }}>
        <ShoppingBag size={40} style={{ color: C.leaf }} />
        <h1 className="mt-4 font-serif text-4xl" style={{ color: C.ink }}>Your cart is empty</h1>
        <p className="mt-3 max-w-md" style={{ color: C.muted }}>Browse kits for every occasion, add your logo and choose a quantity.</p>
        <Link to="/shop" className="mt-7 rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white" style={{ background: C.olive }}>Shop gifts</Link>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-28" style={{ background: C.cream }}>
      <form onSubmit={submit} className="mx-auto grid max-w-[1280px] gap-10 px-4 sm:px-8 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <h1 className="font-serif text-4xl" style={{ color: C.ink }}>Your cart</h1>
          <div className="mt-4 border-t" style={{ borderColor: C.line }}>{lines.map((l) => <Line key={l.key} line={l} />)}</div>
          <Link to="/shop" className="mt-5 inline-block text-sm font-semibold underline" style={{ color: C.olive }}>← Continue shopping</Link>

          <h2 className="mt-12 font-serif text-3xl" style={{ color: C.ink }}>Delivery & billing details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Your name *"><input required value={form.name} onChange={set('name')} autoComplete="name" className={input} style={{ borderColor: C.line }} /></Field>
            <Field label="Company *"><input required value={form.company} onChange={set('company')} autoComplete="organization" className={input} style={{ borderColor: C.line }} /></Field>
            <Field label="Work email *"><input required type="email" value={form.email} onChange={set('email')} autoComplete="email" className={input} style={{ borderColor: C.line }} /></Field>
            <Field label="Phone / WhatsApp *"><input required type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" className={input} style={{ borderColor: C.line }} /></Field>
            <Field label="GST number" hint="Optional, for a GST invoice"><input value={form.gstin} onChange={set('gstin')} maxLength={15} placeholder="e.g. 10ABCDE1234F1Z5" className={`${input} uppercase`} style={{ borderColor: C.line }} /></Field>
            <Field label="Needed by" hint="Optional"><input type="date" value={form.deliveryDate} onChange={set('deliveryDate')} min={new Date().toISOString().slice(0, 10)} className={input} style={{ borderColor: C.line }} /></Field>
            <div className="sm:col-span-2"><Field label="Delivery address *"><textarea required rows={3} value={form.address} onChange={set('address')} autoComplete="street-address" className={input} style={{ borderColor: C.line }} /></Field></div>
            <Field label="City *"><input required value={form.city} onChange={set('city')} autoComplete="address-level2" className={input} style={{ borderColor: C.line }} /></Field>
            <Field label="PIN code *"><input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={form.pincode} onChange={set('pincode')} autoComplete="postal-code" className={input} style={{ borderColor: C.line }} /></Field>
            <div className="sm:col-span-2"><Field label="Notes" hint="Multiple delivery addresses, a custom mix, or anything else we should know"><textarea rows={3} value={form.notes} onChange={set('notes')} className={input} style={{ borderColor: C.line }} /></Field></div>
            {/* Honeypot: hidden from people, bots fill it in */}
            <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} className="hidden" aria-hidden="true" />
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: C.line }}>
            <h2 className="font-serif text-2xl" style={{ color: C.ink }}>Order summary</h2>
            <dl className="mt-5 space-y-2.5 text-[15px]" style={{ color: C.ink }}>
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>GST {settings.gstRate}%</dt><dd>{inr(totals.gst)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt>
                <dd>{quoteOnly ? <span style={{ color: C.muted }}>Quoted with your order</span> : totals.delivery ? inr(totals.delivery) : <span className="font-semibold" style={{ color: C.leaf }}>Free</span>}</dd></div>
              {!quoteOnly && totals.delivery > 0 && (
                <p className="text-xs" style={{ color: C.muted }}>Add {inr(FREE_DELIVERY_ABOVE - totals.subtotal + 1)} more for free delivery (orders above {inr(FREE_DELIVERY_ABOVE)}).</p>
              )}
              <div className="flex justify-between border-t pt-3 text-lg font-semibold" style={{ borderColor: C.line }}><dt>{quoteOnly ? 'Estimated total' : 'Total payable'}</dt><dd>{inr(totals.total)}</dd></div>
              {totals.quoteItems > 0 && <p className="text-sm" style={{ color: C.muted }}>Plus {totals.quoteItems} {totals.quoteItems === 1 ? 'item' : 'items'} we will quote for.</p>}
            </dl>
            {pending && !busy && (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Payment not completed. Your order <b>{pending.orderNo}</b> is saved. Pay now to confirm it.
              </p>
            )}
            {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <button type="submit" disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-bold uppercase tracking-[0.12em] text-white transition hover:opacity-90 disabled:opacity-60" style={{ background: C.olive }}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : offline ? null : <Lock size={16} />}
              {step === 'saving' ? 'Saving your order…' : step === 'paying' ? 'Waiting for payment…' : step === 'verifying' ? 'Confirming payment…'
                : quoteOnly ? 'Request quote' : invoiceOnly ? 'Place order · pay by invoice' : `Pay ${inr(totals.total)} securely`}
            </button>
            {quoteOnly ? (
              <p className="mt-3 text-center text-xs" style={{ color: C.muted }}>Your cart has a 500+ item, so we will email a quote instead of taking payment now.</p>
            ) : invoiceOnly ? (
              <p className="mt-3 text-center text-xs" style={{ color: C.muted }}>Orders above {inr(settings.maxOnlinePayment)} are paid by bank transfer. We email a GST invoice within 1 working day.</p>
            ) : (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: C.muted }}>
                <ShieldCheck size={14} style={{ color: C.leaf }} /> Secured by Razorpay · UPI, cards, net banking, wallets
              </div>
            )}
            <ol className="mt-6 space-y-2 border-t pt-5 text-sm leading-6" style={{ color: C.muted, borderColor: C.line }}>
              {(quoteOnly
                ? ['We email your quote and a branded mockup within 2 working days.', 'You approve and pay; we start production.', 'We deliver, with a GST invoice.']
                : invoiceOnly
                  ? ['We email a GST invoice with bank details within 1 working day.', 'Once paid, we send your branded mockup.', 'You approve it, and we produce and deliver.']
                  : ['Pay now; your order is confirmed instantly.', 'We email a branded mockup within 24 hrs.', 'You approve it, and we produce and deliver with a GST invoice.']
              ).map((t, i) => <li key={i}><b style={{ color: C.ink }}>{i + 1}.</b> {t}</li>)}
            </ol>
          </div>
        </aside>
      </form>
    </div>
  );
}
