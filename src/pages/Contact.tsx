import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { motion, useSpring, useMotionValue, useAnimationFrame, useInView, useTransform, animate } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { asset } from '../lib/content';
import content from '../content/pages/contact.json';
import { IoSend } from 'react-icons/io5';

/* ════════════════════════════════════════════
   TYPES
════════════════════════════════════════════ */
// Page words and photos: src/content/pages/contact.json (admin → Pages → Contact)
const { intro, gallery, quote, form, errors: errorText } = content;

type FieldId = 'name' | 'company' | 'email' | 'phone' | 'interest' | 'message';

interface ContactFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
}

type ContactFormErrors = Record<FieldId, string>;
type ContactFormTouched = Record<FieldId, boolean>;

type SubmissionStatus =
  | { state: 'idle' }
  | { state: 'loading' };

interface ApiResponse {
  success: boolean;
  message?: string;
}

/* ── HOOKS (identical to Home) ── */
function useTilt(strength = 12) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const springConfig = { stiffness: 200, damping: 22, mass: 0.6 };
  const springX = useSpring(rotateX, springConfig);
  const springY = useSpring(rotateY, springConfig);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    rotateY.set(dx * strength); rotateX.set(-dy * strength);
    glareX.set(50 + dx * 30); glareY.set(50 + dy * 30);
  }, [strength, rotateX, rotateY, glareX, glareY]);
  const onMouseLeave = useCallback(() => {
    rotateX.set(0); rotateY.set(0); glareX.set(50); glareY.set(50);
  }, [rotateX, rotateY, glareX, glareY]);
  return { ref, springX, springY, glareX, glareY, onMouseMove, onMouseLeave };
}

function useFloat(amplitude = 10, speed = 0.0008) {
  const y = useMotionValue(0);
  const rotateZ = useMotionValue(0);
  useAnimationFrame((t) => {
    y.set(Math.sin(t * speed) * amplitude);
    rotateZ.set(Math.sin(t * speed * 0.6) * 0.4);
  });
  return { y, rotateZ };
}

/* ── PARTICLE TRAIL (identical to Home) ── */
function ParticleTrail() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const idRef = useRef(0);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const id = idRef.current++;
    setParticles(prev => [...prev.slice(-18), { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 700);
  }, []);
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div key={p.id}
          initial={{ x: p.x - 4, y: p.y - 4, scale: 1, opacity: 0.55 }}
          animate={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ position: 'fixed', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#b5a26a', top: 0, left: 0 }}
        />
      ))}
    </div>
  );
}

/* ── ANIMATED COUNTER (identical to Home) ── */
function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  const [displayed, setDisplayed] = useState(0);
  const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
  const prefix = value.match(/^[^0-9]*/)?.[0] ?? '';
  const postfix = value.match(/[^0-9]*$/)?.[0] ?? '';
  useEffect(() => {
    if (!isInView) { setDisplayed(0); return; }
    const controls = animate(0, numericValue, { duration: 1.8, ease: [0.22, 1, 0.36, 1], onUpdate: v => setDisplayed(Math.floor(v)) });
    return controls.stop;
  }, [isInView, numericValue]);
  return <span ref={ref}>{prefix}{displayed.toLocaleString()}{postfix}</span>;
}

/* ── CRASH-LAND IMAGE CARD (BundleCard warp system from Home) ── */
type LandingImageCardProps = {
  src: string;
  label: string;
  tag: string;
  accent: string;
  fromLeft?: boolean;
  onClick?: () => void;
};

function LandingImageCard({
  src,
  label,
  tag,
  accent,
  fromLeft = true,
  onClick,
}: LandingImageCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(cardRef, { once: false, amount: 0.25 });
  const [phase, setPhase] = useState<'hidden' | 'warping' | 'landed' | 'settled'>('hidden');
  const [shockwave, setShockwave] = useState(false);
  const [scanLine, setScanLine] = useState(false);
  const { ref: tiltRef, springX, springY, onMouseMove, onMouseLeave } = useTilt(6);

  useEffect(() => {
    if (isInView && phase === 'hidden') {
      setPhase('warping');
      const t1 = setTimeout(() => { setShockwave(true); setScanLine(true); setPhase('landed'); }, 820);
      const t2 = setTimeout(() => setShockwave(false), 1220);
      const t3 = setTimeout(() => { setScanLine(false); setPhase('settled'); }, 1500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    if (!isInView) { setPhase('hidden'); setShockwave(false); setScanLine(false); }
  }, [isInView]);

  const isVisible = phase !== 'hidden';

  return (
    <div ref={cardRef} style={{ perspective: '1400px', position: 'relative' }}>
      {shockwave && (<>
        <motion.div initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 3.2, opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, borderRadius: 4, zIndex: 40, pointerEvents: 'none', border: '2.5px solid rgba(181,162,106,0.7)' }} />
        <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, borderRadius: 4, zIndex: 39, pointerEvents: 'none', border: '1.5px solid rgba(181,162,106,0.5)' }} />
      </>)}
      {phase === 'warping' && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
          {[...Array(8)].map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0.7, scaleX: 0.3 }} animate={{ opacity: 0, scaleX: 4 }}
              transition={{ duration: 0.5, delay: i * 0.035, ease: 'easeIn' }}
              style={{ position: 'absolute', top: `${8 + i * 11}%`, left: fromLeft ? '10%' : '50%', width: '40%', height: 1.5, background: `rgba(181,162,106,${0.7 - i * 0.07})`, transformOrigin: fromLeft ? 'left center' : 'right center' }} />
          ))}
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, x: fromLeft ? -200 : 200, y: -120, rotateX: 55, rotateY: fromLeft ? -45 : 45, rotateZ: fromLeft ? -12 : 12, scale: 0.35, filter: 'blur(14px) brightness(2)' }}
        animate={isVisible
          ? { opacity: 1, x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, filter: 'blur(0px) brightness(1)' }
          : { opacity: 0, x: fromLeft ? -200 : 200, y: -120, rotateX: 55, rotateY: fromLeft ? -45 : 45, rotateZ: fromLeft ? -12 : 12, scale: 0.35, filter: 'blur(14px) brightness(2)' }}
        transition={{ duration: 0.85, ease: [0.12, 0.88, 0.26, 1.05], opacity: { duration: 0.38 }, filter: { duration: 0.5 } }}
        style={{ transformStyle: 'preserve-3d', willChange: 'transform, filter' }}
      >
        <motion.div
          animate={(phase === 'landed' || phase === 'settled') ? { y: [0, -10, 4, -2, 0], rotateZ: [0, fromLeft ? 1.2 : -1.2, fromLeft ? -0.5 : 0.5, 0] } : {}}
          transition={{ duration: 0.55, delay: 0.05, ease: 'easeOut' }}>
          <motion.div initial={{ opacity: 0 }} animate={isVisible ? { opacity: [0, 0.6, 0] } : { opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            style={{ position: 'absolute', inset: -24, borderRadius: 8, zIndex: -1, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(181,162,106,0.45) 0%, transparent 70%)' }} />
          <motion.div
            ref={tiltRef}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            style={{
              rotateX: springX,
              rotateY: springY,
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
            whileHover={{
              scale: 1.02,
              transition: {
                type: "spring",
                stiffness: 200,
                damping: 22,
              },
            }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden rounded-sm shadow-lg bg-white border border-gray-100 group cursor-pointer"
          >
            <motion.div className="absolute inset-0 pointer-events-none z-10"
              style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.15) 0%,transparent 50%)' }}
              whileHover={{ opacity: 1 }} initial={{ opacity: 0 }} transition={{ duration: 0.3 }} />
            <div className="aspect-[4/3] overflow-hidden relative">
              <motion.div className="absolute inset-0 pointer-events-none z-10"
                style={{ boxShadow: 'inset 0 0 40px rgba(181,162,106,0.15)' }}
                whileHover={{ boxShadow: 'inset 0 0 60px rgba(181,162,106,0.32)' }} transition={{ duration: 0.4 }} />
              <motion.img src={src} alt={label} className="w-full h-full object-cover"
                whileHover={{ scale: 1.07 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ willChange: 'transform' }} />
              {scanLine && (
                <motion.div initial={{ y: '-100%' }} animate={{ y: '200%' }} transition={{ duration: 0.45, ease: 'linear' }}
                  style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom,transparent 0%,rgba(181,162,106,0.35) 50%,transparent 100%)' }} />
              )}
              <motion.span animate={{ y: phase === 'settled' ? 0 : -28, opacity: phase === 'settled' ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="absolute top-4 left-4 text-[9px] uppercase tracking-[0.18em] font-bold text-white px-3 py-1 rounded-sm"
                style={{ backgroundColor: accent }}>{tag}</motion.span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
            </div>
            <motion.div className="p-5 relative overflow-hidden">
              <motion.div className="absolute bottom-0 left-0 h-[3px]" style={{ backgroundColor: accent }}
                animate={{ width: phase === 'settled' ? '100%' : '0%' }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
              <motion.div initial={{ scaleX: 0 }} animate={phase === 'settled' ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.5 }} style={{ position: 'absolute', top: 0, left: 0, width: '28%', height: 2, background: accent, transformOrigin: 'left' }} />
              <motion.p initial={{ opacity: 0, x: fromLeft ? -18 : 18 }} animate={phase === 'settled' ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.12 }} className="font-bold text-base leading-snug mb-2">{label}</motion.p>
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand-olive flex items-center gap-1.5">
                <motion.span whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>{gallery.linkText}</motion.span>
                <motion.span whileHover={{ rotate: 45, x: 2 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }} style={{ display: 'inline-flex' }}><ArrowRight size={11} /></motion.span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ── FORM FIELD — floating label + animated underline + validation ── */
interface FormFieldProps {
  label: string;
  id: FieldId;
  type?: string;
  placeholder?: string;
  children?: React.ReactNode;
  rows?: number | null;
  value: string;
  onChange: (id: FieldId, value: string) => void;
  onBlur: (id: FieldId) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

function FormField({
  label,
  id,
  type = 'text',
  placeholder = '',
  children = null,
  rows = null,
  value,
  onChange,
  onBlur,
  error = '',
  required = false,
  disabled = false,
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  const filled = !!value;
  const active = focused || filled;
  const hasError = !!error;
  const isValid = !hasError && filled;

  const base: any = {
    ref: inputRef,
    id,
    value,
    disabled,
    onFocus: () => setFocused(true),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(id, e.target.value),
    onBlur: () => { setFocused(false); onBlur(id); },
    className: 'w-full bg-transparent pt-7 pb-3 px-4 text-base focus:outline-none resize-none appearance-none disabled:opacity-60 disabled:cursor-not-allowed',
    style: { fontFamily: 'inherit' },
    'aria-invalid': hasError,
  };

  const borderColor = hasError
    ? '#dc2626'
    : (focused || isValid)
      ? '#22a355'
      : filled
        ? 'rgba(34,163,85,0.35)'
        : 'rgba(0,0,0,0.15)';

  const boxShadow = hasError
    ? '0 0 0 3px rgba(220,38,38,0.12)'
    : (focused || isValid)
      ? '0 0 0 3px rgba(34,163,85,0.12)'
      : '0 0 0 0px rgba(34,163,85,0)';

  return (
    <div className="relative" style={{ paddingTop: 20 }}>
      <motion.label
        htmlFor={id}
        onClick={() => inputRef.current?.focus()}
        animate={{
          y: active ? 4 : 30,
          scale: active ? 1 : 1.15,
          color: hasError ? '#dc2626' : focused ? '#22a355' : '#999',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 12,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          cursor: 'text',
          transformOrigin: 'left',
          zIndex: 2,
          userSelect: 'none',
          pointerEvents: active ? 'none' : 'all',
        }}
      >{label}{required ? ' *' : ''}</motion.label>

      <motion.div
        animate={{ borderColor, boxShadow }}
        transition={{ duration: 0.25 }}
        style={{ borderWidth: 1, borderStyle: 'solid', borderRadius: 6, overflow: 'hidden', backgroundColor: focused ? 'rgba(34,163,85,0.02)' : 'transparent' }}
      >
        {children
          ? <select {...base}>{children}</select>
          : rows
            ? <textarea {...base} rows={rows} placeholder={active ? placeholder : ''} />
            : <input {...base} type={type} placeholder={active ? placeholder : ''} />
        }
      </motion.div>

      {hasError && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#dc2626',
            marginTop: 6,
            marginLeft: 4,
          }}
        >{error}</motion.p>
      )}
    </div>
  );
}

/* ── VALIDATION ── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(id: FieldId, value: string): string {
  const v = value.trim();
  switch (id) {
    case 'name':
      if (!v) return errorText.nameRequired;
      if (v.length < 2) return errorText.nameShort;
      return '';
    case 'company':
      if (!v) return errorText.companyRequired;
      return '';
    case 'email':
      if (!v) return errorText.emailRequired;
      if (!EMAIL_RE.test(v)) return errorText.emailInvalid;
      return '';
    case 'phone': {
      if (!v) return errorText.phoneRequired;
      const digits = v.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) return errorText.phoneInvalid;
      return '';
    }
    case 'interest':
      if (!v) return errorText.interestRequired;
      return '';
    case 'message':
      if (!v) return errorText.messageRequired;
      if (v.length < 10) return errorText.messageShort;
      return '';
    default:
      return '';
  }
}

const FIELD_IDS: FieldId[] = ['name', 'company', 'email', 'phone', 'interest', 'message'];

const EMPTY_FORM_DATA: ContactFormData = { name: '', company: '', email: '', phone: '', interest: '', message: '' };
const EMPTY_ERRORS: ContactFormErrors = { name: '', company: '', email: '', phone: '', interest: '', message: '' };
const EMPTY_TOUCHED: ContactFormTouched = { name: false, company: false, email: false, phone: false, interest: false, message: false };

/* ── API CALL — local persistence (unchanged) ── */
async function submitContactForm(data: ContactFormData): Promise<ApiResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s safety timeout

    const response = await fetch("/api/lead", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        ...data,
        type: "contact",
        submissionId: `ECO-${Date.now()}`,
        sourcePage: window.location.pathname,
      }),
    });

    clearTimeout(timeout);

    // handle non-200 responses
    if (!response.ok) {
      return {
        success: false,
        message: `Server Error: ${response.status}`,
      };
    }

    // safe JSON parsing
    const result = (await response.json()) as ApiResponse;

    return {
      success: result?.success ?? false,
      message: result?.message ?? "No response message from server",
    };

  } catch (error: any) {
    console.error("submitContactForm error:", error);

    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Request timed out. Please try again."
          : "Network error. Please check your server.",
    };
  }
}

/* ════════════════════════════════════════════
   CONTACT — MAIN
   Success/error messaging now matches Sumedha's form:
     - Validation failure → inline field errors only, no alert
     - Successful submission → alert(result.message) then reset form
     - Network/server failure → alert("Something went wrong")
════════════════════════════════════════════ */
export const Contact = () => {
  const { ref: tiltRef, springX, springY, glareX, glareY, onMouseMove, onMouseLeave } = useTilt(5);
  const { y: floatY, rotateZ: floatRotZ } = useFloat(6, 0.0007);
  const glareStyle = useTransform([glareX, glareY], ([gx, gy]) => `radial-gradient(ellipse 60% 50% at ${gx}% ${gy}%, rgba(255,255,255,0.18) 0%, transparent 70%)`);

  const navigate = useNavigate();

  const [formData, setFormData] = useState<ContactFormData>(EMPTY_FORM_DATA);
  const [errors, setErrors] = useState<ContactFormErrors>(EMPTY_ERRORS);
  const [touched, setTouched] = useState<ContactFormTouched>(EMPTY_TOUCHED);
  const [status, setStatus] = useState<SubmissionStatus>({ state: 'idle' });

  const handleFieldChange = (id: FieldId, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    setTouched(prevTouched => {
      if (prevTouched[id]) {
        setErrors(prevErrors => ({ ...prevErrors, [id]: validateField(id, value) }));
      }
      return prevTouched;
    });
  };

  const handleFieldBlur = (id: FieldId) => {
    setTouched(prev => ({ ...prev, [id]: true }));
    setErrors(prev => ({ ...prev, [id]: validateField(id, formData[id]) }));
  };

  const runValidation = (): boolean => {
    const newErrors = { ...EMPTY_ERRORS };
    let hasError = false;
    FIELD_IDS.forEach((id) => {
      const err = validateField(id, formData[id]);
      newErrors[id] = err;
      if (err) hasError = true;
    });
    setErrors(newErrors);
    setTouched({ name: true, company: true, email: true, phone: true, interest: true, message: true });
    return !hasError;
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM_DATA);
    setTouched(EMPTY_TOUCHED);
    setErrors(EMPTY_ERRORS);
  };

  // Sumedha-style flow: validate → stay silent on failure (inline errors show) → submit → alert
  const submit = async () => {
    if (status.state === 'loading') return; // guard against double-submits

    const ok = runValidation();
    if (!ok) return;

    setStatus({ state: 'loading' });
    try {
      const result = await submitContactForm(formData);
      setStatus({ state: 'idle' });
      alert(result.message);
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      setStatus({ state: 'idle' });
      alert(form.errorAlert);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const isLoading = status.state === 'loading';

  return (
    <div className="bg-brand-off-white overflow-x-hidden">
      <ParticleTrail />

      <section className="py-20 sm:py-24 lg:py-32 px-6 sm:px-8 md:px-20 lg:px-15" style={{ perspective: '1400px' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* ════ LEFT COLUMN ════ */}
          <div className="lg:col-span-5 z-10">

            {/* LABEL */}
            <motion.span
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-brand-olive font-medium tracking-[0.3em] uppercase text-xs mb-4 block"
            >
              {intro.eyebrow}
            </motion.span>

            {/* HEADING */}
            <h2 className="text-4xl sm:text-5xl md:text-7xl leading-[1.1] mb-6 font-serif">
              <div className="flex flex-wrap gap-x-4">
                {intro.titleLine1.split(' ').map((word) => (
                  <motion.span key={word}>{word}</motion.span>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 italic font-normal">
                <motion.span>{intro.titleLine2}</motion.span>
              </div>
            </h2>

            {/* DESCRIPTION */}
            <motion.p className="max-w-md text-base sm:text-lg text-gray-600 leading-relaxed mb-8">
              {intro.text}
            </motion.p>

            {/* CONTACT INFO */}
            <div className="space-y-5 mb-10">
              {intro.contacts.map((item) => (
                <motion.a
                  key={item.tag}
                  href="#"
                  className="flex items-start gap-4 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm bg-[#5c7a3e]">
                    {item.symbol}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-brand-olive mb-1 block">
                      {item.tag}
                    </span>
                    <p className="font-serif text-base sm:text-lg">{item.value}</p>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* STATS */}
            <div className="py-5 border-y border-gray-200 grid grid-cols-3 gap-3 mb-10">
              {intro.stats.map((stat) => (
                <motion.div key={stat.label}>
                  <h4 className="text-lg sm:text-xl font-bold font-serif text-brand-olive">
                    {stat.value}
                  </h4>
                  <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mt-1">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* ✅ IMAGE SECTION — NO CHANGE */}
            <div className="grid grid-cols-2 gap-4">
              <LandingImageCard
                src={asset(gallery.cards[0].image)}
                label={gallery.cards[0].label}
                tag={gallery.cards[0].tag}
                accent={gallery.cards[0].accent}
                fromLeft
                onClick={() => navigate(gallery.cards[0].path)}
              />

              <LandingImageCard
                src={asset(gallery.cards[1].image)}
                label={gallery.cards[1].label}
                tag={gallery.cards[1].tag}
                accent={gallery.cards[1].accent}
                fromLeft={false}
                onClick={() => navigate(gallery.cards[1].path)}
              />
            </div>

            {/* QUOTE */}
            <motion.div className="mt-8 pt-6 border-t border-gray-200">
              <p className="italic font-serif text-base sm:text-lg text-brand-dark-olive mb-3">
                {quote.text}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-6 h-px bg-brand-olive" />
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
                  {quote.author}
                </p>
              </div>
            </motion.div>

          </div>

          {/* ════ RIGHT COLUMN — Form ════ */}
          <motion.div
            initial={{ opacity: 0, x: 80, rotateY: 25 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 relative mt-12 lg:mt-0"
            style={{ perspective: '1400px' }}
          >
            {/* Float — same as Hero image.
                Click-through: when the card below tilts, half of it dips behind this
                layer in 3D, which would otherwise swallow clicks on the form. */}
            <motion.div style={{ y: floatY, rotateZ: floatRotZ, rotateX: 1, transformStyle: 'preserve-3d', willChange: 'transform', pointerEvents: 'none' }}>

              {/* Sweep-reveal mask — identical to Hero image (decorative, so clicks pass through) */}
              <motion.div
                initial={{ scaleX: 1 }} animate={{ scaleX: 0 }}
                transition={{ duration: 0.9, delay: 0.55, ease: [0.76, 0, 0.24, 1] }}
                style={{ position: 'absolute', inset: 0, backgroundColor: '#b5a26a', transformOrigin: 'right', zIndex: 30, borderRadius: 2, pointerEvents: 'none' }}
              />

              {/* 3D tilt + live glare (the form card itself takes clicks again) */}
              <motion.div ref={tiltRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
                style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', willChange: 'transform', pointerEvents: 'auto' }}
                className="bg-white rounded-sm shadow-2xl border border-gray-100 overflow-visible relative"
              >
                <motion.div className="absolute inset-0 pointer-events-none z-10" style={{ background: glareStyle }} />

                {/* Corner accent lines — BundleCard settled */}
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ position: 'absolute', top: 0, left: 0, width: '28%', height: 3, background: '#b5a26a', transformOrigin: 'left', zIndex: 20 }} />
                <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ duration: 0.7, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '18%', background: '#b5a26a', transformOrigin: 'top', zIndex: 20 }} />

                <div className="p-6 sm:p-10 md:p-16">
                  <motion.span
                    initial={{ opacity: 0, y: 12, letterSpacing: '0.1em' }}
                    animate={{ opacity: 1, y: 0, letterSpacing: '0.22em' }}
                    transition={{ duration: 0.5, delay: 1.0 }}
                    className="text-[10px] uppercase tracking-widest font-bold text-brand-olive mb-3 block"
                  >{form.eyebrow}</motion.span>

                  <motion.h3
                    initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    className="text-2xl sm:text-3xl font-serif mb-10"
                  >{form.title}</motion.h3>

                  <form className="space-y-8" onSubmit={handleSubmit} noValidate>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField
                        label={form.nameLabel} id="name" placeholder={form.namePlaceholder} required
                        value={formData.name} onChange={handleFieldChange} onBlur={handleFieldBlur}
                        error={touched.name ? errors.name : ''} disabled={isLoading}
                      />
                      <FormField
                        label={form.companyLabel} id="company" placeholder={form.companyPlaceholder} required
                        value={formData.company} onChange={handleFieldChange} onBlur={handleFieldBlur}
                        error={touched.company ? errors.company : ''} disabled={isLoading}
                      />
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.28 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField
                        label={form.emailLabel} id="email" type="email" placeholder={form.emailPlaceholder} required
                        value={formData.email} onChange={handleFieldChange} onBlur={handleFieldBlur}
                        error={touched.email ? errors.email : ''} disabled={isLoading}
                      />
                      <FormField
                        label={form.phoneLabel} id="phone" type="tel" placeholder={form.phonePlaceholder} required
                        value={formData.phone} onChange={handleFieldChange} onBlur={handleFieldBlur}
                        error={touched.phone ? errors.phone : ''} disabled={isLoading}
                      />
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35 }}>
                      <FormField
                        label={form.interestLabel} id="interest" required
                        value={formData.interest} onChange={handleFieldChange} onBlur={handleFieldBlur}
                        error={touched.interest ? errors.interest : ''} disabled={isLoading}
                      >
                        <option value="">{form.interestPlaceholder}</option>
                        {form.interestOptions.map((option) => (
                          <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                      </FormField>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.42 }}>
                      <FormField
                        label={form.messageLabel} id="message" rows={4} placeholder={form.messagePlaceholder} required
                        value={formData.message} onChange={handleFieldChange} onBlur={handleFieldBlur}
                        error={touched.message ? errors.message : ''} disabled={isLoading}
                      />
                    </motion.div>

                    {/* Submit */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 1.5 }}
                      className="pt-4"
                    >
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full sm:w-auto px-10 py-4 bg-brand-olive text-white font-semibold rounded-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                            <span>{form.submittingText}</span>
                          </div>
                        ) : (
                          form.submitButton
                        )}
                      </button>
                    </motion.div>
                  </form>
                </div>

                {/* Floating badge — same as Hero image */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.4, rotate: 15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 6 }}
                  transition={{ duration: 0.8, delay: 1.6, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ rotate: 0, scale: 1.06 }}
                  style={{ position: 'absolute', bottom: -16, right: 16, background: '#fff', border: '1px solid rgba(181,162,106,0.3)', borderRadius: 4, padding: '10px 16px', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', zIndex: 25 }}
                >
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b5a26a', margin: 0 }}>{form.badgeLabel}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: '2px 0 0', color: '#333' }}>{form.badgeText}</p>
                </motion.div>

              </motion.div>
            </motion.div>

            {/* Watermark — same as Hero "Studio Edition" */}
            <div className="absolute -bottom-36 -left-4 overflow-visible hidden lg:block pointer-events-none">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 1.5, duration: 0.8 }}
                className="font-serif italic text-6xl text-[#e5d3a1] opacity-50">{form.watermark}</motion.p>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
};

export default Contact;