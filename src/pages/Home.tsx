
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useAnimationFrame,
  useInView,
  animate,
} from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import heroVideo from '../assests/hero1.mp4';
import OurClients from '../components/client';
import { asset } from '../lib/content';
import content from '../content/pages/home.json';
import EcotwistComingSoon from '../components/Coming';
/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type OccasionItem = {
  title: string;
  img: string;
  accent: string;
  tag: string;
  path: string;
};

type ProcessStepItem = {
  step: string;
  title: string;
  desc: string;
  tag: string;
  icon: 'Discovery' | 'Design' | 'Delivery'| 'Support';
  detail: string;
};

type Bundle = {
  title: string;
  tier: string;
  price: string;
  desc: string;
  img: string;
  x: number;
};

type Particle = {
  id: number;
  x: number;
  y: number;
};

/* ─────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────── */
function useTilt(strength = 12) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const springConfig = { stiffness: 200, damping: 22, mass: 0.6 };
  const springX = useSpring(rotateX, springConfig);
  const springY = useSpring(rotateY, springConfig);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      rotateY.set(dx * strength);
      rotateX.set(-dy * strength);
      glareX.set(50 + dx * 30);
      glareY.set(50 + dy * 30);
    },
    [strength, rotateX, rotateY, glareX, glareY]
  );

  const onMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
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

function useMagnetic(strength = 0.35) {
  const ref = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 350, damping: 28 });
  const springY = useSpring(y, { stiffness: 350, damping: 28 });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
      y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
    },
    [strength, x, y]
  );

  const onMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { ref, springX, springY, onMouseMove, onMouseLeave };
}

export function useNavbarTransparency(heroRef: React.RefObject<HTMLElement | null>) {
  const [isTransparent, setIsTransparent] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const heroBottom = heroRef.current.getBoundingClientRect().bottom;
      setIsTransparent(heroBottom > 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [heroRef]);

  return isTransparent;
}

function useOccasionSliderConfig() {
  const [config, setConfig] = useState({ visibleCount: 2, gap: 10 });

  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;

      if (width >= 1280) {
        setConfig({ visibleCount: 5, gap: 24 });
      } else if (width >= 1024) {
        setConfig({ visibleCount: 5, gap: 20 });
      } else if (width >= 768) {
        setConfig({ visibleCount: 4, gap: 16 });
      } else if (width >= 640) {
        setConfig({ visibleCount: 3, gap: 16 });
      } else {
        setConfig({ visibleCount: 2, gap: 10 });
      }
    };

    updateConfig();
    window.addEventListener('resize', updateConfig);
    return () => window.removeEventListener('resize', updateConfig);
  }, []);

  return config;
}

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
// Page words and photos: src/content/pages/home.json (admin → Pages → Home (regular))
const { hero, occasions, process, curated, impact: impactSection, impactStats, cta } = content;

export const occasionData: OccasionItem[] = occasions.cards.map((item) => ({
  title: item.title,
  img: asset(item.image),
  accent: item.accent,
  tag: item.tag,
  path: item.path,
}));

const processSteps: ProcessStepItem[] = process.steps.map((item) => ({
  step: item.step,
  title: item.title,
  desc: item.text,
  tag: item.tag,
  icon: item.icon as ProcessStepItem['icon'],
  detail: item.detail,
}));

/* ─────────────────────────────────────────────
   PARTICLE TRAIL
   Disabled on touch devices (phones/tablets)
───────────────────────────────────────────── */
function ParticleTrail() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const id = idRef.current++;
    setParticles((prev) => [...prev.slice(-18), { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setParticles((prev) => prev.filter((p) => p.id !== id)), 700);
  }, []);

  useEffect(() => {
    if (isTouch) return;
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove, isTouch]);

  if (isTouch) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: p.x - 4, y: p.y - 4, scale: 1, opacity: 0.55 }}
          animate={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ position: 'fixed', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#b5a26a', top: 0, left: 0 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   OCCASION CARD
───────────────────────────────────────────── */
function OccasionCard({ item, index }: { item: OccasionItem; index: number }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const { ref, springX, springY, glareX, glareY, onMouseMove, onMouseLeave } = useTilt(13);

  const shadowX = useTransform(springY, [-13, 13], [-16, 16]);
  const shadowY = useTransform(springX, [-13, 13], [16, -16]);
  const boxShadow = useTransform(
    [shadowX, shadowY],
    ([sx, sy]) => hovered
      ? `${sx}px ${sy}px 40px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.07)`
      : '0 4px 16px rgba(0,0,0,0.07)'
  );
  const glareStyle = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(ellipse 60% 50% at ${gx}% ${gy}%, rgba(255,255,255,0.22) 0%, transparent 70%)`
  );

  const handleClick = useCallback(() => navigate(item.path), [navigate, item.path]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.65, rotateX: -40, rotateY: index % 2 === 0 ? -16 : 16, y: 50 }}
      whileInView={{ opacity: 1, scale: 1, rotateX: 0, rotateY: 0, y: 0 }}
      viewport={{ once: false, amount: 0.08 }}
      transition={{
        duration: 0.85,
        delay: Math.min(index * 0.07, 0.45),
        ease: [0.16, 1, 0.3, 1],
        opacity: { duration: 0.45, delay: Math.min(index * 0.07, 0.45) },
      }}
      style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
      className="group cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Explore ${item.title}`}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <motion.div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={() => { onMouseLeave(); setHovered(false); }}
        onMouseEnter={() => setHovered(true)}
        style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', willChange: 'transform', boxShadow }}
        className="relative rounded-2xl overflow-hidden bg-white border border-gray-100"
      >
        <motion.div
          className="absolute inset-0 pointer-events-none z-20"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.08) 100%)' }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        <div className="aspect-[3/4] overflow-hidden relative">
          <motion.img
            src={item.img}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            style={{ willChange: 'transform' }}
            animate={{ scale: hovered ? 1.08 : 1 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: item.accent }}
            animate={{ opacity: hovered ? 0.18 : 0 }}
            transition={{ duration: 0.4 }}
          />
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: glareStyle }}
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.span
            animate={{ y: hovered ? 0 : -28, opacity: hovered ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[8px] sm:text-[9px] uppercase tracking-[0.16em] font-bold text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-sm"
            style={{ backgroundColor: item.accent }}
          >
            {item.tag}
          </motion.span>
          <motion.div
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 10 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-[8px] sm:text-[9px] uppercase tracking-[0.15em] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-sm flex items-center gap-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          >
            {occasions.viewLabel} <ArrowRight size={8} />
          </motion.div>
        </div>

        <motion.div className="p-2.5 sm:p-3 lg:p-4 relative overflow-hidden">
          <motion.div
            className="absolute bottom-0 left-0 h-[3px]"
            style={{ backgroundColor: item.accent }}
            animate={{ width: hovered ? '100%' : '0%' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
          <h4 className="font-bold text-xs sm:text-sm lg:text-base mb-1 sm:mb-1.5 leading-snug">{item.title}</h4>
          <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-brand-olive flex items-center gap-1">
            <motion.span animate={{ x: hovered ? 3 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
              {occasions.exploreLabel}
            </motion.span>
            <motion.span
              animate={{ rotate: hovered ? 45 : 0, x: hovered ? 2 : 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              style={{ display: 'inline-flex' }}
            >
              <ArrowRight size={9} />
            </motion.span>
          </div>
        </motion.div>

        <div className="absolute inset-0 rounded-sm pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }} />
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   OCCASIONS SLIDER
   Infinite loop + left/right buttons
───────────────────────────────────────────── */
function OccasionSlider({ items }: { items: OccasionItem[] }) {
  const total = items.length;
  const { visibleCount, gap } = useOccasionSliderConfig();
  const [index, setIndex] = useState(total);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const duplicatedItems = [...items, ...items, ...items];
  const slideWidth = `calc((100% - ${(visibleCount - 1) * gap}px) / ${visibleCount})`;
  const translateX = `calc(-${index} * ((100% - ${(visibleCount - 1) * gap}px) / ${visibleCount} + ${gap}px))`;

  const goNext = useCallback(() => setIndex((prev) => prev + 1), []);
  const goPrev = useCallback(() => setIndex((prev) => prev - 1), []);

  // Resize: animation band karo, index normalize karo, phir re-enable karo
  useEffect(() => {
    setIsAnimating(false);
    setIndex((prev) => total + ((((prev - total) % total) + total) % total));
  }, [visibleCount, total]);

  useEffect(() => {
    if (isAnimating) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsAnimating(true)); // double RAF for paint flush
    });
    return () => cancelAnimationFrame(raf);
  }, [isAnimating]);


   useEffect(() => {
    if (isHovered) return;
    const interval = window.setInterval(() => {
      setIndex((prev) => prev + 1);
    }, 2800);

    return () => window.clearInterval(interval);
  }, [isHovered]);

  // motion.div ki jagah plain div + native transitionend
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const handleTransitionEnd = (e: TransitionEvent) => {
      // sirf transform transition pe react karo
      if (e.propertyName !== 'transform') return;

      const normalizedIndex = ((index % total) + total) % total;
      if (index >= total * 2 || index < total) {
        setIsAnimating(false);
        setIndex(total + normalizedIndex);
      }
    };

    el.addEventListener('transitionend', handleTransitionEnd);
    return () => el.removeEventListener('transitionend', handleTransitionEnd);
  }, [index, total]);

  // Auto-play (uncomment karna ho toh)
  // useEffect(() => {
  //   if (isHovered) return;
  //   const id = window.setInterval(() => setIndex((p) => p + 1), 2800);
  //   return () => clearInterval(id);
  // }, [isHovered]);

  return (
    <div className="relative">
      <motion.button
        type="button"
        aria-label="Previous occasions"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={goPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 lg:h-12 lg:w-12 rounded-full bg-white/95 border border-gray-200 shadow-lg flex items-center justify-center text-brand-dark-olive hover:bg-brand-dark-olive hover:text-white transition-all"
      >
        <ChevronLeft size={18} />
      </motion.button>

      <div
        className="mx-10 sm:mx-12 lg:mx-14 overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* motion.div → plain div, ref attach kiya */}
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            gap: `${gap}px`,
            transform: `translateX(${translateX})`,
            transition: isAnimating ? 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            willChange: 'transform',
          }}
        >
          {duplicatedItems.map((item, i) => (
            <div
              key={`${item.title}-${i}`}
              style={{ flex: `0 0 ${slideWidth}`, minWidth: slideWidth }}
            >
              <OccasionCard item={item} index={i % total} />
            </div>
          ))}
        </div>
      </div>

      <motion.button
        type="button"
        aria-label="Next occasions"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={goNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 lg:h-12 lg:w-12 rounded-full bg-white/95 border border-gray-200 shadow-lg flex items-center justify-center text-brand-dark-olive hover:bg-brand-dark-olive hover:text-white transition-all"
      >
        <ChevronRight size={18} />
      </motion.button>
    </div>
  );
}
/* ─────────────────────────────────────────────
   BUNDLE CARD
───────────────────────────────────────────── */
function BundleCard({ bundle }: { bundle: Bundle }) {
  const { ref: tiltRef, springX, springY, onMouseMove, onMouseLeave } = useTilt(5);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(cardRef, { once: false, amount: 0.12 });
  const [phase, setPhase] = useState('hidden');
  const [shockwave, setShockwave] = useState(false);
  const [scanLine, setScanLine] = useState(false);
  const isLeft = bundle.x < 0;

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
      {shockwave && (
        <>
          <motion.div initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 3.2, opacity: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} style={{ position: 'absolute', inset: 0, borderRadius: 4, zIndex: 40, pointerEvents: 'none', border: '2.5px solid rgba(181,162,106,0.7)' }} />
          <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }} style={{ position: 'absolute', inset: 0, borderRadius: 4, zIndex: 39, pointerEvents: 'none', border: '1.5px solid rgba(181,162,106,0.5)' }} />
        </>
      )}

      {phase === 'warping' && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
          {[...Array(8)].map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0.7, scaleX: 0.3 }} animate={{ opacity: 0, scaleX: 4 }} transition={{ duration: 0.5, delay: i * 0.035, ease: 'easeIn' }}
              style={{ position: 'absolute', top: `${8 + i * 11}%`, left: isLeft ? '10%' : '50%', width: '40%', height: 1.5, background: `rgba(181,162,106,${0.7 - i * 0.07})`, transformOrigin: isLeft ? 'left center' : 'right center' }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, x: isLeft ? -100 : 100, y: -60, rotateX: 35, rotateY: isLeft ? -25 : 25, scale: 0.55, filter: 'blur(10px) brightness(2)' }}
        animate={isVisible ? { opacity: 1, x: 0, y: 0, rotateX: 0, rotateY: 0, scale: 1, filter: 'blur(0px) brightness(1)' } : { opacity: 0, x: isLeft ? -100 : 100, y: -60, rotateX: 35, rotateY: isLeft ? -25 : 25, scale: 0.55, filter: 'blur(10px) brightness(2)' }}
        transition={{ duration: 0.85, ease: [0.12, 0.88, 0.26, 1.05], opacity: { duration: 0.38 }, filter: { duration: 0.5 }, scale: { duration: 0.85 } }}
        style={{ transformStyle: 'preserve-3d', willChange: 'transform, filter' }}
      >
        <motion.div animate={phase === 'landed' || phase === 'settled' ? { y: [0, -8, 3, -1, 0], rotateZ: [0, isLeft ? 1 : -1, isLeft ? -0.4 : 0.4, 0] } : {}} transition={{ duration: 0.55, delay: 0.05, ease: 'easeOut' }}>
          <motion.div initial={{ opacity: 0 }} animate={isVisible ? { opacity: [0, 0.6, 0] } : { opacity: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }} style={{ position: 'absolute', inset: -24, borderRadius: 8, zIndex: -1, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(181,162,106,0.45) 0%, transparent 70%)' }} />
          <motion.div
            ref={tiltRef}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', willChange: 'transform' }}
            whileHover={{ scale: 1.015, transition: { type: 'spring', stiffness: 200, damping: 22 } }}
            className="bg-white rounded-sm overflow-hidden shadow-lg flex flex-col md:flex-row border border-gray-100 relative"
          >
            <motion.div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)' }} whileHover={{ opacity: 1 }} initial={{ opacity: 0 }} transition={{ duration: 0.3 }} />

            <div className="w-full md:w-1/2 h-52 sm:h-60 md:h-auto overflow-hidden relative">
              <motion.div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: 'inset 0 0 40px rgba(181,162,106,0.15)' }} whileHover={{ boxShadow: 'inset 0 0 60px rgba(181,162,106,0.32)' }} transition={{ duration: 0.4 }} />
              <motion.img src={bundle.img} alt={bundle.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" whileHover={{ scale: 1.07 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ willChange: 'transform' }} />
              {scanLine && (
                <motion.div initial={{ y: '-100%' }} animate={{ y: '200%' }} transition={{ duration: 0.45, ease: 'linear' }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, transparent 0%, rgba(181,162,106,0.35) 50%, transparent 100%)' }} />
              )}
            </div>

            <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
              <motion.div initial={{ scaleX: 0 }} animate={phase === 'settled' ? { scaleX: 1 } : { scaleX: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ position: 'absolute', top: 0, left: 0, width: '28%', height: 2, background: '#b5a26a', transformOrigin: 'left' }} />
              <motion.div initial={{ scaleY: 0 }} animate={phase === 'settled' ? { scaleY: 1 } : { scaleY: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ position: 'absolute', top: 0, left: 0, width: 2, height: '22%', background: '#b5a26a', transformOrigin: 'top' }} />
              <div>
                <motion.span initial={{ opacity: 0, y: 12 }} animate={phase === 'settled' ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.05 }} className="text-[10px] uppercase tracking-widest font-bold text-brand-olive mb-3 block">{bundle.tier}</motion.span>
                <motion.h3 initial={{ opacity: 0, x: isLeft ? -18 : 18 }} animate={phase === 'settled' ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }} className="text-xl sm:text-2xl font-bold font-serif mb-3 sm:mb-4">{bundle.title}</motion.h3>
                <motion.p initial={{ opacity: 0 }} animate={phase === 'settled' ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.22 }} className="text-gray-600 text-sm leading-relaxed mb-5 sm:mb-6">{bundle.desc}</motion.p>
              </div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={phase === 'settled' ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.45, delay: 0.32 }} className="flex items-center">
                <motion.button
                  whileHover={{ scale: 1.15, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
                  whileTap={{ scale: 0.88 }}
                  style={{ willChange: 'transform' }}
                  onClick={() => window.location.href = '/products'}
                  className="h-10 px-6 bg-brand-olive text-white flex items-center justify-center hover:bg-brand-dark-olive transition-colors text-sm font-bold"
                >{curated.buttonLabel}</motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROCESS STEP ICONS
───────────────────────────────────────────── */
const ProcessIcons: Record<ProcessStepItem['icon'], React.ReactNode> = {
  Discovery: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b5a26a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Design: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b5a26a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  Delivery: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b5a26a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
   Support: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b5a26a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V5a2 2 0 0 1 2-2h12a4 4 0 0 1 4 4z"/>
    </svg>
  ),
};

/* ─────────────────────────────────────────────
   PROCESS STEP
───────────────────────────────────────────── */
function ProcessStep({ item, index }: { item: ProcessStepItem; index: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: false, amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
      className="relative flex flex-col"
      style={{ background: '#fff', borderRadius: 4, padding:'clamp(12px, 2vw, 20px) clamp(10px, 2vw, 18px)', border: '1px solid rgba(181,162,106,0.18)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
    >
      <motion.div initial={{ scaleX: 0 }} animate={isInView ? { scaleX: 1 } : { scaleX: 0 }} transition={{ duration: 0.55, delay: index * 0.12 + 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#b5a26a', borderRadius: '4px 4px 0 0', transformOrigin: 'left' }} />
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -20 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: index * 0.12 + 0.25 }}
          style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(181,162,106,0.08)', border: '1.5px solid rgba(181,162,106,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >{ProcessIcons[item.icon]}</motion.div>
        <span className="font-serif leading-none select-none" style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)', color: 'transparent', WebkitTextStroke: '1.5px rgba(181,162,106,0.25)', lineHeight: 1 }}>{item.step}</span>
      </div>
      <span className="text-[9px] uppercase tracking-[0.2em] font-bold mb-2.5 sm:mb-3 inline-block" style={{ background: 'rgba(181,162,106,0.1)', color: '#b5a26a', padding: '3px 8px', borderRadius: 2, alignSelf: 'flex-start' }}>{item.tag}</span>
      <h3 className="text-sm sm:text-base lg:text-lg font-serif font-bold mb-1.5 sm:mb-2 leading-snug text-gray-900">{item.title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed flex-1">{item.desc}</p>
      <div className="flex items-center gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4" style={{ borderTop: '1px solid rgba(181,162,106,0.15)' }}>
        <div style={{ width: 16, height: 1, background: '#b5a26a', opacity: 0.5 }} />
        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{item.detail}</span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────── */
function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  const [displayed, setDisplayed] = useState(0);
  const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
  const prefix = value.match(/^[^0-9]*/)?.[0] ?? '';
  const postfix = value.match(/[^0-9]*$/)?.[0] ?? '';

  useEffect(() => {
    if (!isInView) { setDisplayed(0); return; }
    const controls = animate(0, numericValue, { duration: 1.8, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDisplayed(Math.floor(v)) });
    return controls.stop;
  }, [isInView, numericValue]);

  return <span ref={ref}>{prefix}{displayed.toLocaleString()}{postfix}</span>;
}

/* ─────────────────────────────────────────────
   HOME
───────────────────────────────────────────── */
export const Home = () => {
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroTextY = useTransform(heroScroll, [0, 1], ['0%', '20%']);
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0]);
  const { y: floatY, rotateZ: floatRotZ } = useFloat(9, 0.00075);
  void floatY; void floatRotZ;
  const springHeroTextY = useSpring(heroTextY, { stiffness: 80, damping: 25 });

  const impactRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: impactScroll } = useScroll({ target: impactRef, offset: ['start end', 'end start'] });
  const impactImgY = useTransform(impactScroll, [0, 1], ['-8%', '8%']);
  const springImpactY = useSpring(impactImgY, { stiffness: 70, damping: 20 });

  const { ref: magnetRef, springX: magX, springY: magY, onMouseMove: magMove, onMouseLeave: magLeave } = useMagnetic(0.28);

  const isNavTransparent = useNavbarTransparency(heroRef);
  useEffect(() => {
    document.body.setAttribute('data-nav-transparent', isNavTransparent ? 'true' : 'false');
  }, [isNavTransparent]);

  const titleWords = hero.titleLine1.split(' ');
  const subtitleWords = hero.titleLine2.split(' ');

  return (
    <div className="overflow-x-hidden">
      <ParticleTrail />

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] flex items-end
          pb-14 sm:pb-18 md:pb-20
          px-5 sm:px-8 md:px-14 lg:px-16 xl:px-20 2xl:px-28"
        style={{ perspective: '1400px' }}
      >
        <div className="absolute inset-0 overflow-hidden z-0">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover" style={{ filter: 'brightness(0.42)' }}>
            <source src={heroVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 55%, rgba(0,0,0,0.08) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to top, rgba(181,162,106,0.12) 0%, transparent 100%)' }} />
        </div>

        <motion.div
          style={{ y: springHeroTextY, opacity: heroOpacity, willChange: 'transform' }}
          className="relative z-10 w-full flex flex-col gap-7 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-[90vw] sm:max-w-sm md:max-w-lg lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
            <h1 className="
              text-[2.4rem] leading-[1.05]
              sm:text-5xl
              md:text-6xl
              lg:text-7xl
              xl:text-8xl
              2xl:text-9xl
              font-serif text-white
            ">
              <div className="flex flex-wrap gap-x-3 sm:gap-x-4 lg:gap-x-5">
                {titleWords.map((word, i) => (
                  <motion.span key={word} initial={{ rotateX: -90, opacity: 0, y: 40 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }} style={{ display: 'inline-block', transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>{word}</motion.span>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 sm:gap-x-4 italic font-normal">
                {subtitleWords.map((word, i) => (
                  <motion.span key={word} initial={{ rotateX: -90, opacity: 0, y: 40 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 + i * 0.14, ease: [0.22, 1, 0.36, 1] }} style={{ display: 'inline-block', transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>{word}</motion.span>
                ))}
              </div>
            </h1>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.0 }} className="flex-shrink-0">
            <motion.div ref={magnetRef} style={{ x: magX, y: magY }} onMouseMove={magMove} onMouseLeave={magLeave}>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', y: -2 }}
                whileTap={{ scale: 0.95, y: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                style={{ willChange: 'transform' }}
                className="w-full md:w-auto bg-brand-dark-olive text-white px-7 sm:px-8 py-4 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-brand-olive transition-all"
                onClick={() => document.querySelector('#occasions')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {hero.button}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }} className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center gap-2">
          <span className="text-white/50 text-[9px] uppercase tracking-[0.3em] font-bold">{hero.scrollLabel}</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 1, height: 28, background: 'linear-gradient(to bottom, rgba(181,162,106,0.8), transparent)' }} />
        </motion.div>
      </section>

      {/* OCCASIONS SLIDER */}
      <section
        id="occasions"
        className="
          py-0 sm:py-4 md:py-6 lg:py-8 xl:py-10 2xl:py-12
          px-0 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-10
          bg-white overflow-hidden
        "
      >
        <div className="max-w-[1700px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.15 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="mb-8 sm:mb-12 lg:mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-6">
            <div>
              <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} style={{ originX: 0 }} className="w-14 sm:w-20 lg:w-24 h-1 bg-brand-olive mb-4 sm:mb-5 lg:mb-6" />
              <h2 className="text-2xl sm:text-4xl md:text-5xl xl:text-6xl font-serif leading-tight">
                {occasions.title}
              </h2>
            </div>
            {/* <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-bold text-brand-olive/70 flex-shrink-0">
              <span className="w-6 sm:w-8 h-px bg-brand-olive/40 inline-block" />
              {occasionData.length} Occasions
            </motion.div> */}
          </motion.div>

          <OccasionSlider items={occasionData} />
        </div>
      </section>
      <div>
      <OurClients />
    </div>
      {/* PROCESS */}
      <section className="bg-brand-beige py-14 sm:py-20 md:py-24 lg:py-28 xl:py-32 px-4 sm:px-8 md:px-14 lg:px-16 xl:px-20 2xl:px-28 overflow-hidden">
        <div className="max-w-[1700px] mx-auto">
          <div className="mb-8 sm:mb-12 lg:mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6">
            <div>
              <motion.p initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.6 }} className="text-xs uppercase font-bold tracking-[0.3em] text-brand-olive mb-4 sm:mb-5 flex items-center gap-3">
                <span className="w-8 sm:w-10 h-px bg-brand-olive inline-block" />{process.eyebrow}
              </motion.p>
              <motion.h2 initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif leading-[1.08]">
                {process.title}<br /><span className="italic font-normal text-brand-olive">{process.titleHighlight}</span> {process.titleEnd}
              </motion.h2>
            </div>
          </div>

          <div className="relative hidden md:block mb-0">
            <div style={{ position: 'absolute', top: 72, left: '16.666%', right: '16.666%', height: 1, background: 'rgba(181,162,106,0.18)', zIndex: 0 }}>
              <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: false, amount: 0.5 }} transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }} style={{ height: '100%', background: '#b5a26a', transformOrigin: 'left' }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 relative z-10">
            {processSteps.map((item, i) => <ProcessStep key={item.step} item={item} index={i} />)}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pt-8 sm:pt-10" style={{ borderTop: '1px solid rgba(181,162,106,0.2)' }}>
            <p className="text-sm text-gray-500 max-w-xl leading-relaxed">{process.note}</p>
            <motion.button whileHover={{ x: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 340, damping: 22 }} onClick={() => window.location.href = '/contact'} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-brand-dark-olive text-white px-6 sm:px-7 py-3.5 rounded-sm text-xs font-bold uppercase tracking-widest">
              {process.button} <ArrowRight size={14} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* CURATED EXPERIENCES */}
      <section className="bg-brand-beige py-10 sm:py-14 md:py-16 lg:py-20 px-4 sm:px-8 md:px-14 lg:px-16 xl:px-20 2xl:px-28 overflow-hidden">        <div className="max-w-[1700px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.15 }} transition={{ duration: 0.6 }} className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8 sm:mb-12 lg:mb-16">
            <div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif mb-2 sm:mb-4">{curated.title}</h2>
              <p className="text-gray-600 text-sm sm:text-base">{curated.intro}</p>
            </div>
            <motion.div className="self-start sm:self-auto font-bold text-xs uppercase tracking-widest border-b-2 border-brand-olive pb-1 hover:text-brand-olive transition-all cursor-pointer flex-shrink-0" whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>{curated.viewAllLabel}</motion.div>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 lg:gap-10">
            {curated.bundles.map((item, i) => ({ title: item.title, tier: item.tier, price: item.price, desc: item.text, img: asset(item.image), x: i % 2 === 0 ? -60 : 60 })).map((bundle) => <BundleCard key={bundle.title} bundle={bundle} />)}
          </div>
        </div>
      </section>

      {/* IMPACT NARRATIVE */}
      <section ref={impactRef} className="bg-brand-beige py-14 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-8 md:px-14 lg:px-16 xl:px-20 2xl:px-28 overflow-hidden">
        <div className="max-w-[1700px] mx-auto grid grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 sm:gap-14 lg:gap-20 items-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.15 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="relative">
            <div className="aspect-square rounded-full overflow-hidden border-[6px] sm:border-[8px] lg:border-[10px] border-white shadow-2xl max-w-[220px] sm:max-w-xs md:max-w-sm lg:max-w-md mx-auto lg:mx-0">
              <motion.img src={asset(impactSection.image)} alt={impactSection.imageAlt} style={{ y: springImpactY, scale: 1.03, willChange: 'transform' }} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.15 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              whileHover={{ y: -4, boxShadow: '0 20px 48px rgba(0,0,0,0.13)' }}
              className="
                mt-5 lg:mt-0
                lg:absolute lg:-bottom-6 lg:right-0 xl:-right-2
                bg-white p-4 sm:p-5 md:p-6 rounded-sm shadow-lg
                max-w-full sm:max-w-sm
              "
              style={{ willChange: 'transform' }}
            >
              <p className="italic font-serif text-base sm:text-lg text-brand-dark-olive mb-3 sm:mb-4">
                "{impactSection.quote}"
              </p>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-6 sm:w-8 h-px bg-brand-olive flex-shrink-0" />
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">{impactSection.quoteAuthor}</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.15 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="lg:pl-8 xl:pl-10 pt-2 lg:pt-12">
            <p className="text-xs uppercase tracking-[0.3em] font-bold text-brand-olive mb-4 sm:mb-6">{impactSection.eyebrow}</p>
            <h2 className="text-2xl sm:text-4xl md:text-5xl xl:text-6xl font-serif mb-5 sm:mb-8 leading-tight">
              {impactSection.title}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-12 leading-relaxed">
              {impactSection.text}
            </p>
            <div className="grid grid-cols-2 gap-6 sm:gap-10">
              {impactSection.stats.map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 + i * 0.15 }} whileHover={{ scale: 1.06 }}>
                  <h4 className="text-2xl sm:text-3xl font-bold font-serif text-brand-olive"><AnimatedCounter value={stat.value} /></h4>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1.5 sm:mt-2">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* IMPACT STATS BAR */}
      <section className="bg-brand-beige py-14 sm:py-14 px-8 sm:px-10 md:px-16 border-y border-gray-200">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row justify-center sm:justify-between gap-6 sm:gap-8 text-center">
          {impactStats.stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: i * 0.12 }} whileHover={{ scale: 1.07, y: -3 }} className="flex-1 min-w-[120px] sm:min-w-[160px]" style={{ willChange: 'transform' }}>
              <h3 className="text-2xl sm:text-3xl font-bold font-serif text-brand-olive"><AnimatedCounter value={stat.value} /></h3>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1.5 sm:mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-18 text-center bg-brand-off-white px-0 sm:px-6">
        <div className="max-w-[320px] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl 2xl:max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, letterSpacing: '-0.05em', y: 20 }}
            whileInView={{ opacity: 1, letterSpacing: '-0.01em', y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-[1.25rem] sm:text-5xl md:text-6xl lg:text-7xl mb-5 sm:mb-8 leading-tight"
          >
            {cta.titleLine1} <br /><span className="italic font-normal">{cta.titleHighlight}</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.6, delay: 0.15 }} className="text-sm sm:text-xl text-gray-600 mb-7 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
            {cta.text}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.6, delay: 0.25 }} className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-4 sm:gap-8">
            <motion.button
              whileHover={{ scale: 1.06, y: -3, boxShadow: '0 18px 40px rgba(0,0,0,0.2)' }}
              whileTap={{ scale: 0.95, y: 1 }}
              onClick={() => window.location.href = '/contact'}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              style={{ willChange: 'transform' }}
              className="bg-brand-dark-olive text-white px-8 sm:px-12 lg:px-14 py-4 sm:py-5 lg:py-6 rounded-sm uppercase tracking-[0.2em] text-xs font-bold hover:bg-brand-olive transition-all shadow-2xl"
            >
              {cta.primaryButton}
            </motion.button>
            <motion.button
              whileHover={{ y: -3 }}
              onClick={() => window.location.href = '/get-proposal'}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="text-brand-charcoal uppercase tracking-[0.2em] text-xs font-bold border-b-2 border-brand-charcoal/20 hover:border-brand-olive transition-all pb-1 self-center"
            >
              {cta.secondaryButton}
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};