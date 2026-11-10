import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Check, ChevronDown, ChevronRight, FileCheck2, Leaf, Loader2, Minus, PackageCheck, Plus, ShieldCheck,
  Sparkles, Truck, Upload, X,
} from 'lucide-react';
import { asset } from '../../lib/content';
import {
  BRANDING, QUANTITY_OPTIONS, QUOTE, cart, discountFor, inr, productById, productImages, products, settings, unitPrice,
  type StoreProduct,
} from '../../lib/store';
import { LOGO_ACCEPT, LOGO_MAX_MB, uploadLogo } from '../../lib/logoUpload';
import { SITE_URL, absoluteUrl, applyHead } from '../../lib/head';

/* ============================
   Product page for the online store (/shop/:id).
   Layout: photos on the left; title, price, branding, logo, quantity and
   the buy buttons on the right; details in folding sections; a sticky buy
   bar once the buttons scroll out of view.
============================ */

const C = { ink: '#1f2a17', olive: '#38461B', leaf: '#4A5D23', gold: '#C5A059', cream: '#FAF9F6', sand: '#F4F1EA', line: '#e6e0cf', muted: '#5f6655' };
const needsLogo = (b: string) => /logo/i.test(b);
const needsText = (b: string) => !/no branding/i.test(b);

export function quantityLabel(q: string) {
  return q === QUOTE ? `${QUOTE} kits (get a quote)` : `${q} kits`;
}

function Accordion({ title, icon, children, open: initial = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <div className="border-b" style={{ borderColor: C.line }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 py-4 text-left" aria-expanded={open}>
        <span style={{ color: C.leaf }}>{icon}</span>
        <span className="flex-1 text-[15px] font-semibold" style={{ color: C.ink }}>{title}</span>
        {open ? <Minus size={16} /> : <Plus size={16} />}
      </button>
      {open && <div className="pb-5 text-[15px] leading-7" style={{ color: C.muted }}>{children}</div>}
    </div>
  );
}

export function ProductCard({ p }: { p: StoreProduct }) {
  return (
    <Link to={`/shop/${p.id}`} className="group flex flex-col overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(0,0,0,.35)]" style={{ borderColor: C.line }}>
      <div className="relative aspect-[4/3.4] overflow-hidden" style={{ background: C.sand }}>
        <img src={asset(p.image)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        {p.featured && <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white" style={{ background: C.olive }}>Bestseller</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.gold }}>{p.occasions[0]}</p>
        <h3 className="mt-1 font-serif text-lg leading-snug" style={{ color: C.ink }}>{p.name}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-[13px] leading-5" style={{ color: C.muted }}>{p.contents}</p>
        <p className="mt-3 font-semibold" style={{ color: C.ink }}>
          {p.price == null ? 'Price on request' : <>From {inr(p.price)} <span className="text-xs font-normal" style={{ color: C.muted }}>/ kit</span></>}
        </p>
      </div>
    </Link>
  );
}

export default function ProductPage() {
  const { id = '' } = useParams();
  const product = productById(id);
  const navigate = useNavigate();

  const images = product ? productImages(product) : [];
  const [active, setActive] = useState(0);
  const [branding, setBranding] = useState(BRANDING[0]);
  const [brandText, setBrandText] = useState('');
  const [quantity, setQuantity] = useState(QUANTITY_OPTIONS[0]);
  const [logo, setLogo] = useState<{ name: string; path: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActive(0); setLogo(null); setBrandText(''); setAdded(false); setUploadError('');
    window.scrollTo(0, 0);
  }, [id]);

  // Title, description and Google product data for this page
  useEffect(() => {
    if (!product) return;
    const url = `${SITE_URL}/shop/${product.id}`;
    const title = `${product.name}: Branded Corporate Gift Kit | Ecotwist`;
    const description = `${product.contents}. Custom branded with your logo, from 25 to 500+ kits${product.price != null ? `, from ₹${product.price} per kit` : ''}. Free mockup before you pay.`.slice(0, 300);
    const image = absoluteUrl(encodeURI(product.image));
    return applyHead({
      title, description, canonical: url,
      og: { 'og:type': 'product', 'og:title': title, 'og:description': description, 'og:url': url, 'og:image': image, 'og:site_name': 'Ecotwist' },
      twitter: { 'twitter:card': 'summary_large_image', 'twitter:title': title, 'twitter:description': description, 'twitter:image': image },
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.contents, image, sku: product.id,
        brand: { '@type': 'Brand', name: 'Ecotwist' },
        ...(product.price != null ? { offers: { '@type': 'Offer', priceCurrency: 'INR', price: product.price, availability: 'https://schema.org/InStock', url } } : {}),
      },
    });
  }, [product]);

  // Sticky bar once the buy buttons have scrolled out of view
  useEffect(() => {
    const check = () => {
      const el = buyRef.current;
      setShowBar(!!el && el.getBoundingClientRect().bottom < 64); // 64px = navbar height
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [id]);

  const related = useMemo(() => {
    if (!product) return [];
    const same = products.filter((p) => p.id !== product.id && p.occasions.some((o) => product.occasions.includes(o)));
    return (same.length >= 4 ? same : [...same, ...products.filter((p) => p.featured && p.id !== product.id)]).slice(0, 4);
  }, [product]);

  if (!product) return <Navigate to="/shop" replace />;

  const unit = unitPrice(product, quantity);
  const lineTotal = unit == null ? null : unit * Number(quantity);
  const discountTiers = settings.quantities.filter((q) => discountFor(String(q)) > 0);

  const onFile = async (file?: File) => {
    if (!file) return;
    setUploadError(''); setUploading(true);
    try {
      const path = await uploadLogo(file);
      setLogo({ name: file.name, path });
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const addToCart = (goToCart = false) => {
    cart.add({
      id: product.id, quantity, branding, brandText: needsText(branding) ? brandText.trim() : '',
      logoPath: needsLogo(branding) ? logo?.path ?? '' : '', logoName: needsLogo(branding) ? logo?.name ?? '' : '', notes: '',
    });
    if (goToCart) navigate('/cart');
    else { setAdded(true); setTimeout(() => setAdded(false), 2500); }
  };

  const priceBlock = (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {unit == null ? (
        <span className="font-serif text-3xl" style={{ color: C.ink }}>{product.price == null ? 'Price on request' : 'Quote for 500+'}</span>
      ) : (
        <>
          <span className="font-serif text-3xl" style={{ color: C.ink }}>{inr(unit)}</span>
          <span className="text-sm" style={{ color: C.muted }}>per kit · + GST</span>
          {discountFor(quantity) > 0 && product.price != null && (
            <>
              <span className="text-sm line-through" style={{ color: C.muted }}>{inr(product.price)}</span>
              <span className="rounded-md px-2 py-0.5 text-sm font-semibold" style={{ background: '#eef3e4', color: C.leaf }}>{discountFor(quantity)}% OFF</span>
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="pb-28 pt-24" style={{ background: C.cream }}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-[13px]" style={{ color: C.muted }} aria-label="Breadcrumb">
          <Link to="/shop" className="hover:underline">Shop</Link>
          <ChevronRight size={14} />
          <Link to={`/shop?occasion=${encodeURIComponent(product.occasions[0])}`} className="hover:underline">{product.occasions[0]}</Link>
          <ChevronRight size={14} />
          <span style={{ color: C.ink }}>{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.08fr_1fr] lg:gap-14">
          {/* ── Photos ── */}
          <div className={`flex min-w-0 flex-col-reverse gap-3 ${images.length > 1 ? 'sm:flex-row' : ''} lg:sticky lg:top-24 lg:self-start`}>
            {images.length > 1 && (
              <div className="flex gap-3 sm:w-20 sm:flex-col">
                {images.map((src, i) => (
                  <button key={src} onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`}
                    className="aspect-[4/5] w-16 overflow-hidden rounded-xl border-2 sm:w-full"
                    style={{ borderColor: i === active ? C.olive : 'transparent', opacity: i === active ? 1 : 0.7 }}>
                    <img src={asset(src)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 overflow-hidden rounded-2xl" style={{ background: C.sand }}>
              <img src={asset(images[active])} alt={product.name} className="aspect-[4/4.4] w-full object-cover" fetchPriority="high" />
              {product.featured && (
                <span className="absolute left-4 top-4 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white" style={{ background: C.olive }}>Bestseller</span>
              )}
            </div>
          </div>

          {/* ── Details ── */}
          <div className="min-w-0">
            <h1 className="font-serif text-[2rem] leading-tight sm:text-[2.5rem]" style={{ color: C.ink }}>{product.name}</h1>
            <p className="mt-2 text-sm" style={{ color: C.muted }}>{product.occasions.join(' · ')}</p>
            <div className="mt-5">{priceBlock}</div>

            <ul className="mt-6 space-y-2.5 border-t pt-6" style={{ borderColor: C.line }}>
              {[`Inside: ${product.contents}`, 'Branded with your logo or company name', 'Plastic-free, gift-ready packaging', 'Free branded mockup before you pay'].map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-6" style={{ color: C.ink }}>
                  <Leaf size={16} className="mt-1 shrink-0" style={{ color: C.leaf }} /> {t}
                </li>
              ))}
            </ul>

            {/* Branding */}
            <p className="mb-3 mt-7 text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.ink }}>Branding</p>
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Branding">
              {BRANDING.map((b) => (
                <button key={b} type="button" role="radio" aria-checked={b === branding} onClick={() => setBranding(b)}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
                  style={b === branding ? { background: C.olive, color: '#fff', borderColor: C.olive } : { background: '#fff', color: C.ink, borderColor: C.line }}>
                  {b}
                </button>
              ))}
            </div>

            {needsText(branding) && (
              <label className="mt-5 block">
                <span className="text-sm font-medium" style={{ color: C.ink }}>Company name or text to print</span>
                <input value={brandText} onChange={(e) => setBrandText(e.target.value)} maxLength={120} placeholder="e.g. Acme Technologies"
                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2" style={{ borderColor: C.line }} />
              </label>
            )}

            {needsLogo(branding) && (
              <div className="mt-5">
                <span className="text-sm font-medium" style={{ color: C.ink }}>Your logo</span>
                {logo ? (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border bg-white px-4 py-3" style={{ borderColor: C.line }}>
                    <FileCheck2 size={18} style={{ color: C.leaf }} />
                    <span className="flex-1 truncate text-sm" style={{ color: C.ink }}>{logo.name}</span>
                    <button type="button" onClick={() => setLogo(null)} aria-label="Remove logo" style={{ color: C.muted }}><X size={16} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
                    className="mt-2 flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed bg-white px-4 py-6 text-center transition hover:bg-[#fbfaf5]" style={{ borderColor: C.line }}>
                    {uploading ? <Loader2 size={20} className="animate-spin" style={{ color: C.leaf }} /> : <Upload size={20} style={{ color: C.leaf }} />}
                    <span className="text-sm font-semibold" style={{ color: C.ink }}>{uploading ? 'Uploading…' : 'Upload logo'}</span>
                    <span className="text-xs" style={{ color: C.muted }}>PNG, JPG, SVG, PDF, AI or EPS · up to {LOGO_MAX_MB} MB · or drop it here</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept={LOGO_ACCEPT} className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
                {uploadError && <p className="mt-2 text-sm text-red-700">{uploadError} You can still add to cart and send the logo later.</p>}
                {!logo && !uploadError && <p className="mt-2 text-xs" style={{ color: C.muted }}>No logo handy? Add to cart now and send it after ordering.</p>}
              </div>
            )}

            {/* Quantity */}
            <label className="mt-6 block">
              <span className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.ink }}>Quantity</span>
              <div className="relative mt-3">
                <select value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="w-full appearance-none rounded-xl border bg-white px-4 py-3.5 pr-10 text-[15px] font-medium outline-none focus:ring-2" style={{ borderColor: C.line, color: C.ink }}>
                  {QUANTITY_OPTIONS.map((q) => <option key={q} value={q}>{quantityLabel(q)}</option>)}
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
              </div>
            </label>
            <p className="mt-3 text-sm" style={{ color: C.muted }}>
              {lineTotal != null
                ? <>{quantity} kits × {inr(unit!)} = <b style={{ color: C.ink }}>{inr(lineTotal)}</b> + GST {settings.gstRate}%</>
                : 'We will send you a quote with your branded mockup.'}
            </p>

            {/* Buy buttons */}
            <div ref={buyRef} className="mt-6 grid gap-3">
              <button type="button" onClick={() => addToCart(false)}
                className="flex items-center justify-center gap-2 rounded-full py-4 text-[15px] font-bold uppercase tracking-[0.14em] text-white transition hover:opacity-90" style={{ background: C.olive }}>
                {added ? <><Check size={18} /> Added to cart</> : 'Add to cart'}
              </button>
              <button type="button" onClick={() => addToCart(true)}
                className="rounded-full border-2 py-3.5 text-[15px] font-bold uppercase tracking-[0.14em] transition hover:bg-white" style={{ borderColor: C.olive, color: C.olive }}>
                {unit == null ? 'Request a quote' : 'Buy it now'}
              </button>
              {added && <Link to="/cart" className="text-center text-sm font-semibold underline" style={{ color: C.leaf }}>View cart →</Link>}
            </div>

            {/* Offers */}
            <div className="mt-8">
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.ink }}>{discountTiers.length ? 'Bulk pricing' : 'Included with every order'}</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {(discountTiers.length
                  ? discountTiers.map((q) => ({ t: `${q}+ kits: ${discountFor(String(q))}% off`, s: product.price != null ? `${inr(Math.round(product.price * (1 - discountFor(String(q)) / 100)))} per kit` : 'Applied at checkout' }))
                  : [{ t: 'Free branded mockup', s: 'See your logo on the gift first' }, { t: 'Pay after approval', s: 'Nothing is charged at checkout' }, { t: 'GST invoice', s: 'With every order' }]
                ).map((o) => (
                  <div key={o.t} className="min-w-[200px] flex-1 rounded-xl border bg-white p-4" style={{ borderColor: C.line }}>
                    <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}><Sparkles size={15} style={{ color: C.gold }} /> {o.t}</p>
                    <p className="mt-1 text-xs" style={{ color: C.muted }}>{o.s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery */}
            <div className="mt-5 rounded-xl p-5" style={{ background: '#eef1e8' }}>
              <p className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: C.ink }}><Truck size={18} style={{ color: C.leaf }} /> Delivery across India and 5+ countries</p>
              <p className="mt-1.5 text-sm leading-6" style={{ color: C.muted }}>Ship to one office or many addresses. Branded orders are usually dispatched within 7–10 working days of mockup approval.</p>
            </div>

            {/* Details */}
            <div className="mt-6 border-t" style={{ borderColor: C.line }}>
              <Accordion title="What's inside" icon={<PackageCheck size={18} />} open>
                <p>{product.contents}.</p>
                <p className="mt-2">Every kit is packed in plastic-free, gift-ready packaging. Need a different item or a custom mix? Tell us in the order notes and we will source it.</p>
              </Accordion>
              <Accordion title="Branding & artwork" icon={<Sparkles size={18} />}>
                <p>Choose logo print, logo engraving or your company name. Upload your logo in a high-resolution file (vector AI, EPS, SVG or PDF is best). We send a free mockup showing exactly how it will look, and nothing is produced until you approve it.</p>
              </Accordion>
              <Accordion title="Shipping & delivery" icon={<Truck size={18} />}>
                <p>We deliver pan-India and to 5+ countries, to a single office or to every employee's address. Delivery charges are quoted with your mockup. Need it by a date? Add it at checkout.</p>
              </Accordion>
              <Accordion title="Payment & invoicing" icon={<ShieldCheck size={18} />}>
                <p>After you approve the mockup we send a secure payment link (UPI, cards, net banking) or bank details. A GST invoice comes with every order. See our <Link to="/refund-policy" className="underline">refund policy</Link>.</p>
              </Accordion>
            </div>

            {/* Trust strip */}
            <div className="mt-7 grid grid-cols-3 gap-2 rounded-xl border px-3 py-4 text-center" style={{ borderColor: '#d8cfae', background: '#fbf8ef' }}>
              {[[Leaf, 'Plastic-free packaging'], [ShieldCheck, 'Secure payments'], [FileCheck2, 'GST invoice']].map(([Icon, t]) => {
                const I = Icon as typeof Leaf;
                return <div key={t as string} className="flex flex-col items-center gap-1.5 text-[13px] font-semibold" style={{ color: C.olive }}><I size={20} />{t as string}</div>;
              })}
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="text-center font-serif text-3xl sm:text-4xl" style={{ color: C.ink }}>You may also like</h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </section>
        )}
      </div>

      {/* Sticky buy bar (in <body>: the page-transition wrapper is transformed, which breaks position: fixed) */}
      {createPortal(<div className={`fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur transition-transform duration-300 ${showBar ? 'translate-y-0' : 'translate-y-full'}`} style={{ borderColor: C.line }}>
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 sm:px-8">
          <img src={asset(product.image)} alt="" className="hidden h-12 w-12 rounded-lg object-cover sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>{product.name}</p>
            <p className="text-sm font-semibold" style={{ color: C.leaf }}>{unit == null ? 'Quote' : `${inr(unit)} / kit`}</p>
          </div>
          <select value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-label="Quantity"
            className="rounded-lg border bg-white px-2 py-2 text-sm" style={{ borderColor: C.line }}>
            {QUANTITY_OPTIONS.map((q) => <option key={q} value={q}>{q === QUOTE ? QUOTE : q} kits</option>)}
          </select>
          <button type="button" onClick={() => addToCart(false)} className="rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white sm:px-8" style={{ background: C.olive }}>
            {added ? 'Added ✓' : 'Add to cart'}
          </button>
        </div>
      </div>, document.body)}
    </div>
  );
}
