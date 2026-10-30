import React, { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from "react-router-dom";
import { activeFestival } from "../config/festival";
import type { Festival } from "../config/festival";
import { testimonials } from "../lib/testimonials";
import { asset } from '../lib/content';
import pageContent from '../content/pages/get-proposal.json';

/* ─────────────────────────────────────────────
   Only animation keyframes injected globally.
   All layout/colours stay in Tailwind classes
   exactly as in the original code.
───────────────────────────────────────────── */
const ANIM_STYLES = `
  @keyframes cardLand {
    0%   { opacity:0; transform: translateY(-60px) rotateX(30deg) scale(0.88); }
    60%  { opacity:1; transform: translateY(6px)   rotateX(-3deg)  scale(1.02); }
    80%  {             transform: translateY(-3px)  rotateX(1deg)   scale(0.99); }
    100% { opacity:1; transform: translateY(0)      rotateX(0)      scale(1);   }
  }
  @keyframes headSlideUp {
    from { opacity:0; transform: translateY(32px) rotateX(14deg); }
    to   { opacity:1; transform: translateY(0)    rotateX(0);     }
  }
  @keyframes descFade {
    from { opacity:0; transform: translateY(18px); }
    to   { opacity:1; transform: translateY(0);    }
  }
  @keyframes lineGrow {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }
  @keyframes checkPop {
    from { transform: scale(0) rotate(-45deg); opacity:0; }
    to   { transform: scale(1) rotate(0);      opacity:1; }
  }
  @keyframes navFade {
    from { opacity:0; transform: translateY(12px); }
    to   { opacity:1; transform: translateY(0);    }
  }
  @keyframes img1Land {
    0%   { opacity:0; transform: translateY(-100px) translateX(-20px) rotate(-8deg) scale(0.8);  filter:blur(8px); }
    55%  { opacity:1;                                                                              filter:blur(0);   }
    72%  {            transform: translateY(8px)   translateX(4px)   rotate(1.5deg) scale(1.03); }
    88%  {            transform: translateY(-4px)  translateX(-1px)  rotate(-0.5deg) scale(0.99); }
    100% { opacity:1; transform: translateY(0)     translateX(0)     rotate(-4deg)  scale(1);    filter:blur(0);   }
  }
  @keyframes img2Land {
    0%   { opacity:0; transform: translateY(100px)  translateX(30px)  rotate(7deg)  scale(0.8);  filter:blur(8px); }
    55%  { opacity:1;                                                                              filter:blur(0);   }
    72%  {            transform: translateY(-7px)  translateX(-3px)  rotate(-1deg) scale(1.03); }
    88%  {            transform: translateY(3px)   translateX(2px)   rotate(0.8deg) scale(0.99); }
    100% { opacity:1; transform: translateY(0)     translateX(0)     rotate(5deg)  scale(1);    filter:blur(0);   }
  }
  @keyframes quoteUp {
    from { opacity:0; transform: translateY(20px) rotateX(8deg); }
    to   { opacity:1; transform: translateY(0)    rotateX(0);    }
  }
  @keyframes dotExpand {
    from { width:6px; opacity:.15; }
    to   { width:22px; opacity:1; }
  }

  /* Applied classes */
  .anim-head      { perspective:800px; animation: headSlideUp .55s cubic-bezier(.22,1,.36,1) both; }
  .anim-desc      { animation: descFade .55s .1s cubic-bezier(.22,1,.36,1) both; }
  .anim-nav       { animation: navFade  .5s  .32s cubic-bezier(.22,1,.36,1) both; }

  .anim-card      { animation: cardLand .65s cubic-bezier(.22,1,.36,1) both; transform-style:preserve-3d; }
  .anim-card:nth-child(1) { animation-delay:.04s; }
  .anim-card:nth-child(2) { animation-delay:.11s; }
  .anim-card:nth-child(3) { animation-delay:.18s; }
  .anim-card:nth-child(4) { animation-delay:.25s; }
  .anim-card:nth-child(5) { animation-delay:.32s; }

  /* Gold bottom line on selected card */
  .card-selected-line::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:3px;
    background: linear-gradient(90deg, #2C2D1E, #B8974A);
    animation: lineGrow .4s cubic-bezier(.22,1,.36,1) both;
  }

  /* Check icon pop */
  .anim-check { animation: checkPop .35s cubic-bezier(.34,1.56,.64,1) both; }

  /* 3D card tilt — applied via JS inline style */
  .card-3d { will-change:transform; }

  /* Image land */
  .anim-img1 { animation: img1Land .95s .06s cubic-bezier(.22,1,.36,1) both; }
  .anim-img2 { animation: img2Land .95s .22s cubic-bezier(.22,1,.36,1) both; }

  /* Hover: straighten + zoom */
  .anim-img1:hover { transform: rotate(-1deg) scale(1.03) translateY(-8px) !important; transition: transform .5s cubic-bezier(.22,1,.36,1), box-shadow .5s ease !important; }
  .anim-img2:hover { transform: rotate( 2deg) scale(1.03) translateY(-8px) !important; transition: transform .5s cubic-bezier(.22,1,.36,1), box-shadow .5s ease !important; }

  /* Quote */
  .anim-quote { animation: quoteUp .55s .45s cubic-bezier(.22,1,.36,1) both; }

  /* Progress dots */
  .dot-base   { width:6px; height:6px; border-radius:50%; background:#2C2D1E; opacity:.15; transition: all .4s cubic-bezier(.34,1.56,.64,1); }
  .dot-active { width:22px; border-radius:3px; opacity:1; }

  /* Continue button sweep */
  .btn-sweep { position:relative; overflow:hidden; transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease; }
  .btn-sweep::before {
    content:''; position:absolute; inset:0;
    background:#B8974A;
    transform:translateX(-101%);
    transition: transform .4s cubic-bezier(.22,1,.36,1);
  }
  .btn-sweep:hover::before { transform:translateX(0); }
  .btn-sweep:hover { transform:translateY(-2px) scale(1.02); box-shadow:0 10px 28px rgba(44,45,30,.18); }
  .btn-sweep span { position:relative; z-index:1; }
`;

// Page words and photos: src/content/pages/get-proposal.json (admin → Pages → Get Proposal form)
const { productStep, festivalOption, detailsForm, navigation, sideImages } = pageContent;

// Option titles are what the form submits (occasion / budget / quantity / branding)
const stepContent: any = Object.fromEntries(pageContent.steps.map((s, i) => [i + 1, {
  title: s.title, subtitle: s.subtitle,
  desc: s.desc,
  data: s.options,
}]));

// Regular photos beside each step; an active festival with its own images
// (src/config/festival.ts) shows those instead
const images: Record<number, [string, string]> = Object.fromEntries(
  pageContent.steps.map((s, i) => [i + 1, [asset(s.image1), asset(s.image2)]])
);

const STEPS = pageContent.steps.map((s, i) => ({ id: i + 1, label: s.stepLabel }));

/* Passed in router state by a product's "Order Now" button on the Products page.
   When present, it replaces the Occasion step and the form opens on Budget. */
export interface OrderProduct {
  name: string;
  category: string;
  image?: string;
  sku?: string;
}

const productStepContent = {
  title: productStep.title, subtitle: productStep.subtitle,
  desc: productStep.desc,
};


export const GetProposal = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const product  = (location.state as { product?: OrderProduct } | null)?.product;
  const steps    = product ? STEPS.map(s => s.id === 1 ? { ...s, label: productStep.stepLabel } : s) : STEPS;

  const [step, setStep]           = React.useState(product ? 2 : 1);

  // In-page links (e.g. a product's "Order Now") keep the previous page's scroll position
  React.useEffect(() => { window.scrollTo(0, 0); }, []);
  const [contentKey, setContentKey] = React.useState(0);   // drives re-mount of content only

  // /get-proposal?occasion=festival opens with the festival option (src/config/festival.ts) selected
  const festivalLinked = !!activeFestival && new URLSearchParams(location.search).get('occasion') === 'festival';
  const [selected, setSelected]   = React.useState<Record<number,string>>({
    1: festivalLinked ? activeFestival!.title : stepContent[1].data[0]?.title ?? '', 2: stepContent[2].data[0]?.title ?? '', 3: stepContent[3].data[1]?.title ?? '', 4: stepContent[4].data[0]?.title ?? '',
  });

  const goToStep = (s: number) => {
    if (s === step) return;
    setStep(s);
    setContentKey(k => k + 1);
  };

  const handleSelect = (value: string) =>
    setSelected(prev => ({ ...prev, [step]: value }));

  const [userDetails, setUserDetails] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    company: false,
    email: false,
    phone: false,
  });

  const validateStep5 = () => {
    const newErrors: any = {};

    if (!userDetails.name) newErrors.name = detailsForm.nameError;
    if (!userDetails.company) newErrors.company = detailsForm.companyError;

    if (!userDetails.email.includes("@"))
      newErrors.email = detailsForm.emailError;

    if (userDetails.phone.length < 10)
      newErrors.phone = detailsForm.phoneError;

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // 3-D tilt on option cards
  const onTilt = (e: React.MouseEvent, el: HTMLDivElement | null) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rotX = -((e.clientY - r.top  - r.height / 2) / r.height) * 10;
    const rotY =  ((e.clientX - r.left - r.width  / 2) / r.width)  * 10;
    el.style.transform = `translateY(-5px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.01)`;
  };
  const onTiltLeave = (el: HTMLDivElement | null, isSel: boolean) => {
    if (!el) return;
    el.style.transform = isSel ? 'translateY(-3px) scale(1.01)' : '';
  };

  const content  = step === 1 && product ? productStepContent : stepContent[step];
  // The active festival leads the Occasion options
  const options  = step === 1 && activeFestival
    ? [{ title: activeFestival.title, desc: activeFestival.desc, festival: activeFestival }, ...content.data]
    : content?.data;
  const [img1, img2] = activeFestival?.images?.[step as 1 | 2 | 3 | 4 | 5] ?? images[step];
  // A client testimonial beside each step (from the admin panel); none yet = no quote card
  const quote    = testimonials.length ? testimonials[(step - 1) % testimonials.length] : null;

  async function submitProposal(data: any) {
    const response = await fetch(
      "/api/lead",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          type: "proposal",
          submissionId: `ECO-${Date.now()}`,
          sourcePage: window.location.pathname,
        }),
      }
    );

    return await response.json();
  }
  

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ANIM_STYLES }} />

      <div className="bg-brand-beige min-h-screen mt-14">
        <main className="max-w-7xl mx-auto px-6 lg:px-10 py-6 grid lg:grid-cols-12 gap-10 lg:gap-20 items-start">

          {/* ── LEFT ── */}
          <div className="lg:col-span-7 min-w-0">

            {/* ── STEPPER — outside contentKey, NEVER re-animates ── */}
            {/* scrolls sideways on narrow screens instead of widening the page */}
            <div className="mb-8 overflow-x-auto">
              <div className="flex items-center gap-1 w-fit border border-brand-dark-olive/10 bg-brand-dark-olive/[0.03] p-1">
                {steps.map((s, i) => (
                  <React.Fragment key={s.id}>
                    {i > 0 && <div style={{ width:1, height:20, background:'rgba(44,45,30,.13)' }} />}
                    <div
                      onClick={() => goToStep(s.id)}
                      className="flex items-center gap-2 px-5 py-2.5 cursor-pointer"
                      style={{
                        background: step === s.id ? '#2C2D1E' : 'transparent',
                        opacity:    step === s.id ? 1 : 0.3,
                        transition: 'background .22s ease, opacity .22s ease',
                      }}
                    >
                      {/* Gold dot — visible only on active */}
                      <div style={{
                        width:5, height:5, borderRadius:'50%', background:'#B8974A', flexShrink:0,
                        opacity:    step === s.id ? 1 : 0,
                        transform:  step === s.id ? 'scale(1)' : 'scale(0.4)',
                        transition: 'opacity .25s ease, transform .35s cubic-bezier(.34,1.56,.64,1)',
                      }} />
                      <span
                        className="text-[9px] uppercase tracking-widest font-bold"
                        style={{ color: step === s.id ? '#F5F0E8' : '#2C2D1E', transition:'color .22s ease', whiteSpace:'nowrap' }}
                      >
                        {s.label}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ── SELECTED PRODUCT — reminder on steps 2–5 when ordering a product ── */}
            {product && step !== 1 && (
              <div className="mb-8 flex items-center gap-4 border border-brand-dark-olive/10 bg-white p-3 pr-5 w-fit max-w-full">
                {product.image && (
                  <img src={product.image} alt="" className="w-12 h-12 object-cover flex-shrink-0"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                )}
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-brand-dark-olive/50">{productStep.reminderLabel}</p>
                  <p className="font-serif text-lg leading-tight truncate">
                    {product.name}
                    {product.sku && <span className="text-sm text-brand-dark-olive/50"> · {productStep.skuLabel} {product.sku}</span>}
                  </p>
                </div>
                <button onClick={() => navigate('/products')}
                  className="ml-2 flex-shrink-0 text-[9px] uppercase tracking-widest font-bold opacity-40 hover:opacity-100 transition-opacity">
                  {productStep.changeButton}
                </button>
              </div>
            )}

            {/* ── CONTENT — keyed so it re-mounts + re-animates each step ── */}
            <div key={contentKey} className="max-w-2xl" style={{ perspective:'900px' }}>

              {/* Heading */}
              <h1 className="font-serif text-5xl md:text-7xl leading-tight mb-8 anim-head">
                {content.subtitle}<br />
                <span className="italic font-normal">{content.title}</span>.
              </h1>

              {/* Desc */}
              <p className="text-brand-dark-olive/70 text-lg md:text-xl font-light leading-relaxed mb-12 anim-desc">
                {content.desc}
              </p>

              {/* Option cards / Step UI */}
              <div
                className="mb-10"
                style={{ perspective: "1100px" }}
              >
                {step === 5 ? (
                  /* ─────────────────────────────
                    STEP 5 → YOUR DETAILS (FORM UI)
                  ───────────────────────────── */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Full Name */}
                    <div className="p-6 border border-brand-dark-olive/10 bg-white">
                      <input
                        type="text"
                        placeholder={detailsForm.namePlaceholder}
                        value={userDetails.name}
                        onChange={(e) =>
                          setUserDetails(prev => ({
                            ...prev,
                            name: e.target.value
                          }))
                        }
                        className="w-full outline-none text-brand-dark-olive placeholder:text-brand-dark-olive/40"
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500 mt-2">{errors.name}</p>
                      )}
                    </div>

                    {/* Company */}
                    <div className="p-6 border border-brand-dark-olive/10 bg-white">
                      <input
                        type="text"
                        placeholder={detailsForm.companyPlaceholder}
                        value={userDetails.company}
                        onChange={(e) =>
                          setUserDetails(prev => ({
                            ...prev,
                            company: e.target.value
                          }))
                        }
                        className="w-full outline-none text-brand-dark-olive placeholder:text-brand-dark-olive/40"
                      />
                      {errors.company && (
                        <p className="text-xs text-red-500 mt-2">{errors.company}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="p-6 border border-brand-dark-olive/10 bg-white">
                      <input
                        type="email"
                        placeholder={detailsForm.emailPlaceholder}
                        value={userDetails.email}
                        onChange={(e) =>
                          setUserDetails(prev => ({
                            ...prev,
                            email: e.target.value
                          }))
                        }
                        className="w-full outline-none text-brand-dark-olive placeholder:text-brand-dark-olive/40"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 mt-2">{errors.email}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="p-6 border border-brand-dark-olive/10 bg-white">
                      <input
                        type="tel"
                        placeholder={detailsForm.phonePlaceholder}
                        value={userDetails.phone}
                        onChange={(e) =>
                          setUserDetails(prev => ({
                            ...prev,
                            phone: e.target.value
                          }))
                        }
                        className="w-full outline-none text-brand-dark-olive placeholder:text-brand-dark-olive/40"
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-500 mt-2">{errors.phone}</p>
                      )}
                    </div>

                  </div>
                ) : step === 1 && product ? (
                  /* ─────────────────────────────
                    STEP 1 → SELECTED PRODUCT
                    (replaces Occasion when ordering a product)
                  ───────────────────────────── */
                  <div className="anim-card relative p-6 md:p-8 border-2 border-brand-dark-olive bg-white card-selected-line flex items-center gap-6">
                    <div className="absolute top-6 right-6 anim-check">
                      <CheckCircle className="text-brand-dark-olive" size={20} />
                    </div>
                    {product.image && (
                      <img src={product.image} alt={product.name} className="w-24 h-24 md:w-32 md:h-32 object-cover flex-shrink-0"
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                    <div className="min-w-0 pr-8">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-brand-dark-olive/50 mb-2">{product.category}</p>
                      <h3 className="font-serif text-2xl mb-1">{product.name}</h3>
                      {product.sku && <p className="text-sm text-brand-dark-olive/60">{productStep.skuLabel} {product.sku}</p>}
                      <button onClick={() => navigate('/products')}
                        className="mt-4 text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity">
                        {productStep.changeLink}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ─────────────────────────────
                    STEP 1–4 → OPTION CARDS
                  ───────────────────────────── */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {options?.map((item: any) => {
                      const isSel = selected[step] === item.title;
                      const fest: Festival | undefined = item.festival;

                      let ref: HTMLDivElement | null = null;

                      return (
                        <div
                          key={item.title}
                          ref={(el) => {
                            ref = el;
                          }}
                          onClick={() => handleSelect(item.title)}
                          onMouseMove={(e) => onTilt(e, ref)}
                          onMouseLeave={() => onTiltLeave(ref, isSel)}
                          className={`anim-card card-3d group relative p-8 border-2 cursor-pointer transition-colors
                            ${fest ? "md:col-span-2" : ""}
                            ${
                              isSel
                                ? "border-brand-dark-olive bg-white card-selected-line"
                                : "border-brand-dark-olive/10 bg-white/50 hover:bg-white hover:border-brand-dark-olive/30"
                            }`}
                          style={fest ? {
                            // festive gradient border around a tinted card
                            borderColor: 'transparent',
                            background: `linear-gradient(${fest.tint}, ${fest.tint}) padding-box, linear-gradient(120deg, ${fest.accent[0]}, ${fest.accent[1]}) border-box`,
                            boxShadow: isSel ? `0 18px 40px -22px ${fest.accent[1]}` : undefined,
                          } : undefined}
                        >
                          {isSel && (
                            <div className="absolute top-6 right-6 anim-check">
                              <CheckCircle
                                className="text-brand-dark-olive"
                                size={20}
                              />
                            </div>
                          )}

                          {fest && (
                            <div className="flex flex-wrap items-center gap-3 mb-4 pr-8">
                              <span
                                className="text-[9px] uppercase tracking-widest font-bold text-white px-3 py-1.5"
                                style={{ background: `linear-gradient(90deg, ${fest.accent[0]}, ${fest.accent[1]})` }}
                              >
                                {festivalOption.badge}
                              </span>
                              <span
                                className="text-base"
                                style={{ color: fest.accent[1], fontFamily: '"Tiro Devanagari Hindi", "Nirmala UI", serif' }}
                              >
                                {fest.greeting}
                              </span>
                            </div>
                          )}

                          <h3 className="font-serif text-2xl mb-3">
                            {fest && <span className="mr-2" aria-hidden>{fest.icon}</span>}
                            {item.title}
                          </h3>

                          {item.desc && (
                            <p className="text-sm text-brand-dark-olive/60 leading-relaxed">
                              {item.desc}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-2 mb-8 anim-nav">
                {[1,2,3,4,5].map(d => (
                  <div key={d} className={`dot-base ${step === d ? 'dot-active' : ''}`} />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between border-t border-brand-dark-olive/10 pt-10 anim-nav">
                <button
                  onClick={() => goToStep(Math.max(step - 1, 1))}
                  className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 opacity-40 hover:opacity-100 transition-all hover:-translate-x-1"
                >
                  <ArrowLeft size={14} /> {navigation.backButton}
                </button>

                <button
                  onClick={async () => {
                    if (step === 5) {

                      if (!validateStep5()) return;

                      const configurator = {
                        // A product order skips the Occasion step, so send the product instead
                        occasion: product ? undefined : selected[1],
                        product: product
                          ? (product.sku ? `${product.name} (SKU ${product.sku})` : product.name)
                          : undefined,
                        budget: selected[2],
                        quantity: selected[3],
                        branding: selected[4],

                        name: userDetails.name,
                        company: userDetails.company,
                        email: userDetails.email,
                        phone: userDetails.phone,
                      };

                      try {
                        const result = await submitProposal(configurator);

                        if (result.success) {
                          navigate("/thanks", {
                            state: {
                              configurator,
                            },
                          });
                        } else {
                          alert(result.message);
                        }

                      } catch (err) {
                        console.error(err);
                        alert(detailsForm.connectionError);
                      }

                    } else {
                      goToStep(step + 1);
                    }
                  }}
                  className="btn-sweep bg-brand-dark-olive text-brand-beige px-12 py-5 text-[10px] font-bold uppercase tracking-widest"
                >
                  <span>{step === 5 ? navigation.finishButton : navigation.continueButton}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT — two images landing from opposite directions ── */}
          <div className="lg:col-span-5 relative mt-12 lg:mt-0">
            <div key={`imgs-${step}`} className="relative" style={{ height: 780 }}>

              {/* Image 1 — top-left, tilted left */}
              <div
                className="anim-img1 absolute overflow-hidden shadow-2xl cursor-pointer"
                style={{ width:'78%', height:380, top:0, left:0, transform:'rotate(-4deg)', zIndex:2 }}
              >
                <span style={{
                  position:'absolute', top:12, left:12, zIndex:3,
                  background:'rgba(245,240,232,0.92)', backdropFilter:'blur(4px)',
                  fontFamily:'monospace', fontSize:8, letterSpacing:2, fontWeight:700,
                  textTransform:'uppercase', color:'#2C2D1E', padding:'5px 10px',
                }}>0{step} / {sideImages.label1}</span>

                <img
                  src={img1}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter:'grayscale(15%) contrast(1.04)', transition:'filter .9s ease, transform .8s ease' }}
                  onMouseEnter={e => { (e.target as HTMLImageElement).style.filter='grayscale(0%) contrast(1.1)'; (e.target as HTMLImageElement).style.transform='scale(1.05)'; }}
                  onMouseLeave={e => { (e.target as HTMLImageElement).style.filter='grayscale(15%) contrast(1.04)'; (e.target as HTMLImageElement).style.transform='scale(1)'; }}
                />

                {/* Corner accent */}
                <div style={{ position:'absolute', bottom:12, right:12, width:34, height:34,
                  borderRight:'2px solid rgba(245,240,232,0.6)', borderBottom:'2px solid rgba(245,240,232,0.6)' }} />
              </div>

              {/* Image 2 — bottom-right, tilted right */}
              <div
                className="anim-img2 absolute overflow-hidden shadow-2xl cursor-pointer"
                style={{ width:'66%', height:300, bottom:80, right:0, transform:'rotate(5deg)', zIndex:1 }}
              >
                <span style={{
                  position:'absolute', top:12, left:12, zIndex:3,
                  background:'rgba(245,240,232,0.92)', backdropFilter:'blur(4px)',
                  fontFamily:'monospace', fontSize:8, letterSpacing:2, fontWeight:700,
                  textTransform:'uppercase', color:'#2C2D1E', padding:'5px 10px',
                }}>{sideImages.label2}</span>

                <img
                  src={img2}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter:'grayscale(15%) contrast(1.04)', transition:'filter .9s ease, transform .8s ease' }}
                  onMouseEnter={e => { (e.target as HTMLImageElement).style.filter='grayscale(0%) contrast(1.1)'; (e.target as HTMLImageElement).style.transform='scale(1.05)'; }}
                  onMouseLeave={e => { (e.target as HTMLImageElement).style.filter='grayscale(15%) contrast(1.04)'; (e.target as HTMLImageElement).style.transform='scale(1)'; }}
                />

                <div style={{ position:'absolute', bottom:12, right:12, width:34, height:34,
                  borderRight:'2px solid rgba(245,240,232,0.6)', borderBottom:'2px solid rgba(245,240,232,0.6)' }} />
              </div>

              {/* Quote card */}
              {quote && (
              <div
                key={`q-${step}`}
                className="anim-quote absolute bg-brand-dark-olive text-brand-beige"
                style={{ bottom:0, left:-16, right:24, zIndex:5, padding:'28px 32px' }}
              >
                <div style={{ width:28, height:2, background:'#B8974A', marginBottom:14 }} />
                <p className="font-serif text-xl italic mb-3">"{quote.quote}"</p>
                <span className="text-[9px] uppercase tracking-widest font-bold opacity-50">— {[quote.name, quote.role, quote.company].filter(Boolean).join(", ")}</span>
              </div>
              )}

            </div>
          </div>

        </main>
      </div>
    </>
  );
};

export default GetProposal;