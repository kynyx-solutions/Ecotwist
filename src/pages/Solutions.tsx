import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { siteImage } from '../lib/siteImages';
import { asset } from '../lib/content';
import content from '../content/pages/solutions.json';
/* ================================================================
   HOOK: 3D TILT + GLOW FOLLOW
   ================================================================ */
const useTilt = (intensity = 14) => {
  const [style, setStyle] = useState({});
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setGlowPos({ x: x * 100, y: y * 100 });
    setStyle({
      transform: `perspective(1100px) rotateX(${(y - 0.5) * intensity}deg) rotateY(${
        (x - 0.5) * -intensity
      }deg) scale3d(1.04,1.04,1.04)`,
      transition: 'transform 0.08s linear',
    });
  };

  const handleLeave = () => {
    setStyle({
      transform: 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
      transition: 'transform 0.65s cubic-bezier(0.23,1,0.32,1)',
    });
  };

  return { style, glowPos, handleMove, handleLeave };
};
// Page words and photos: src/content/pages/solutions.json (admin → Pages → Solutions)
const { hero, ecosystem, occasions, capabilities: capabilitySection, cta } = content;

/* ================================================================
   MAGNETIC BUTTON
   ================================================================ */
const MagneticBtn = ({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setPos({
      x: (e.clientX - r.left - r.width / 2) * 0.32,
      y: (e.clientY - r.top - r.height / 2) * 0.32,
    });
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={`relative overflow-hidden px-10 py-5 rounded-sm text-[10px] font-bold uppercase tracking-widest group ${
        dark
          ? 'bg-brand-dark-olive text-brand-beige'
          : 'border border-brand-charcoal/20 bg-transparent'
      }`}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <motion.span
          animate={{ x: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        >
          <ArrowRight size={10} />
        </motion.span>
      </span>
      <motion.span
        className={`absolute inset-0 ${dark ? 'bg-brand-olive' : 'bg-brand-beige'}`}
        initial={{ scaleX: 0 }}
        style={{ originX: 0 } as any}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.38, ease: [0.76, 0, 0.24, 1] }}
      />
    </motion.button>
  );
};

/* ================================================================
   CRASH-LAND IMAGE  —  spring physics entry from off-screen
   ================================================================ */
const LandingImage = ({
  src,
  delay = 0,
  fromX = '0%',
  fromY = '-180%',
  fromRotate = -10,
  className = '',
}: {
  src: string;
  delay?: number;
  fromX?: string | number;
  fromY?: string | number;
  fromRotate?: number;
  className?: string;
}) => {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-sm shadow-2xl ${className}`}
      initial={{ x: fromX, y: fromY, rotate: fromRotate * 1.8, scale: 0.55, opacity: 0 }}
      whileInView={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
      viewport={{ once: false, margin: '-80px' }}
      transition={{
        delay,
        duration: 1.25,
        type: 'spring',
        stiffness: 72,
        damping: 17,
        mass: 1.1,
      }}
    >
      {/* impact shimmer */}
      <motion.div
        className="absolute inset-0 z-10 bg-gradient-to-br from-white/35 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: [0, 0.7, 0] }}
        viewport={{ once: false }}
        transition={{ delay: delay + 1.0, duration: 0.45 }}
      />
      <img src={src} className="w-full h-full object-cover" alt="" />
    </motion.div>
  );
};

/* ================================================================
   SOLUTION CARD  —  3D tilt + glow + scroll-in
   ================================================================ */
const SolutionCard = ({
  item,
  i,
}: {
  item: {
    category: string;
    title: string;
    desc: string;
    img: any;
    path: string;
  };
  i: number;
}) => {
  const tilt = useTilt(8); // subtle tilt
  const navigate = useNavigate();

  return (
    <motion.div
      onClick={() => navigate(item.path)}
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }} // Ensures scroll animation works
      transition={{
        duration: 0.6,
        delay: i * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -8 }}
      onMouseMove={tilt.handleMove}
      onMouseLeave={tilt.handleLeave}
      style={{ ...tilt.style, transformStyle: "preserve-3d" }}
      className="group cursor-pointer relative w-[auto] sm:w-[230px] md:w-[240px]"
    >
      {/* Image */}
      <div className="relative overflow-hidden rounded-lg shadow-md">
        <motion.img
          src={item.img}
          alt={item.title}
          className="w-full h-[260px] object-cover"
          initial={{ scale: 1.1 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-brand-dark-olive shadow">
          {item.category}
        </div>

        {/* Bottom Text (Static) */}
        <div className="absolute bottom-0 left-0 w-full p-3 text-white">
          <h3 className="text-sm font-semibold leading-tight">
            {item.title}
          </h3>
          <p className="text-[11px] opacity-90 line-clamp-2">
            {item.desc}
          </p>
        </div>
      </div>

      {/* Explore Link */}
      <div className="flex items-center gap-1 mt-2 text-[10px] uppercase tracking-widest font-bold text-brand-dark-olive">
        {occasions.linkText} <ArrowRight size={12} />
      </div>
    </motion.div>
  );
};

/* ================================================================
   CAPABILITY ROW  —  alternate left/right slide + rotateY
   ================================================================ */
const CapRow = ({
  cap,
  i,
}: {
  cap: { id: string; title: string; sub: string; desc: string };
  i: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: i % 2 === 0 ? -90 : 90, rotateY: i % 2 === 0 ? -28 : 28 }}
      whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
      viewport={{ once: false, margin: '-60px' }}
      transition={{ duration: 0.85, delay: i * 0.11, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex gap-8 items-start group border-b border-brand-beige/10 pb-12"
    >
      <span className="font-serif text-3xl text-brand-olive/40 group-hover:text-brand-olive transition-colors duration-300 min-w-[3rem]">
        {cap.id}
      </span>
      <div className="flex-1">
        <h4 className="text-[10px] uppercase tracking-widest font-bold mb-4 text-brand-beige/60">
          {cap.title}
        </h4>
        <p className="text-2xl font-serif leading-snug mb-4">{cap.sub}</p>
        <p className="text-sm opacity-50 font-light max-w-sm leading-relaxed">{cap.desc}</p>
      </div>
      <motion.div
        className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
        whileHover={{ rotate: 45 }}
        transition={{ duration: 0.22 }}
      >
        <ArrowUpRight size={18} className="text-brand-olive" />
      </motion.div>
    </motion.div>
  );
};

/* ================================================================
   FLOATING PARTICLES
   ================================================================ */
const Particles = ({ light = false }: { light?: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 16 }).map((_, i) => (
      <motion.div
        key={i}
        className={`absolute rounded-full ${
          light ? 'bg-brand-olive/15' : 'bg-brand-beige/10'
        }`}
        style={{
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -28, 0],
          x: [0, (Math.random() - 0.5) * 18, 0],
          opacity: [0, 1, 0],
          scale: [0, 1.4, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 4 + Math.random() * 4,
          delay: Math.random() * 5,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

/* ================================================================
   MAIN EXPORT
   ================================================================ */
export const Solutions = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  // An uploaded photo wins; otherwise the photo set under "Photos to add"
  const cards = occasions.cards.map((item) => ({
    category: item.tag,
    title: item.title,
    desc: occasions.cardText,
    img: item.image ? asset(item.image) : siteImage(item.photoId ?? ''),
    path: item.path,
  }));

  const capabilities = capabilitySection.items.map((item) => ({
    id: item.number,
    title: item.title,
    sub: item.subtitle,
    desc: item.text,
  }));

  return (
    <div
      className="bg-brand-off-white min-h-screen overflow-x-hidden"
      style={{ perspective: '1500px', transformStyle: 'preserve-3d' }}
    >

      {/* ==================== HERO ==================== */}
      <section
        ref={heroRef}
        className=" relative min-h-[100vh] flex items-center px-6 lg:px-24 py-20 overflow-hidden"
      >
        <Particles light />

        {/* subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#2c3320 1px,transparent 1px),linear-gradient(90deg,#2c3320 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center w-full"
        >

          {/* TEXT */}
          <motion.div
            initial={{ opacity: 0, x: -50, rotateX: 10 }}
            animate={{ opacity: 1, x: 0, rotateX: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 z-10"
          >
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[10px] uppercase tracking-widest text-brand-olive font-bold mb-6 flex items-center gap-3"
            >
              <span className="block w-8 h-px bg-brand-olive" />
              {hero.eyebrow}
            </motion.p>

            {/* staggered headline */}
            <div style={{ perspective: '700px' }}>
              {[
                { text: hero.titleLine1, italic: false },
                { text: hero.titleLine2, italic: true },
              ].map((w, i) => (
                <motion.div
                  key={w.text}
                  initial={{ opacity: 0, y: 55, rotateX: -25 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    delay: 0.1 + i * 0.14,
                    duration: 0.75,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className={`text-6xl md:text-8xl font-serif leading-tight ${
                    w.italic ? 'italic font-normal' : ''
                  }`}
                >
                  {w.text}
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="text-xl text-gray-600 max-w-xl mb-12 mt-8 leading-relaxed font-light"
            >
              {hero.intro}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.55 }}
              className="flex flex-wrap gap-6"
            >
              <MagneticBtn dark>{hero.primaryButton}</MagneticBtn>
              <MagneticBtn>{hero.secondaryButton}</MagneticBtn>
            </motion.div>
          </motion.div>

          {/* HERO IMAGE — crash lands from top-right */}
          <motion.div
            initial={{ opacity: 0, x: 50, rotateY: 20 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 relative"
          >
            {/* main image */}
            <motion.div
              initial={{ y: '-170%', x: '25%', rotate: 14, scale: 0.5, opacity: 0 }}
              animate={{ y: 0, x: 0, rotate: 0, scale: 1, opacity: 1 }}
              transition={{
                delay: 0.2,
                duration: 1.35,
                type: 'spring',
                stiffness: 62,
                damping: 17,
              }}
              className="relative z-10 rounded-tr-[40px] rounded-sm overflow-hidden shadow-[0_40px_100px_rgba(44,51,32,0.22)]"
            >
              {/* land flash */}
              <motion.div
                className="absolute inset-0 z-20 bg-white pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.45, 0] }}
                transition={{ delay: 1.45, duration: 0.38 }}
              />
              <motion.img
                src={asset(hero.image)}
                className="w-full aspect-[4/5] object-cover"
                animate={{
                  y: [0, -15, 0],
                  rotateY: [0, 5, 0],
                  rotateX: [0, 3, 0],
                }}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 2 }}
              />
            </motion.div>

            {/* 100% badge — rises from below */}
            <motion.div
              initial={{ y: 70, opacity: 0, scale: 0.8, rotate: -6 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 1.55, duration: 0.85, type: 'spring', stiffness: 85 }}
              className="absolute -bottom-8 -left-8 z-20 bg-brand-dark-olive text-brand-beige p-8 rounded-sm shadow-2xl max-w-[220px]"
            >
              <motion.span
                className="block text-4xl font-bold font-serif mb-2 italic"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ delay: 2.3, duration: 0.38 }}
              >
                {hero.badgeValue}
              </motion.span>
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-80 leading-tight block">
                {hero.badgeText}
              </span>
            </motion.div>

            {/* decorative ring */}
            <motion.div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full border border-brand-olive/25"
              initial={{ scale: 0, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 1.75, duration: 0.7, ease: 'backOut' }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ==================== ECOSYSTEM IN ACTION ==================== */}
      <section className="py-24 px-6 lg:px-24 bg-brand-beige/60 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">

          {/* Section Header — full width top */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-brand-charcoal/10 pb-10">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 mb-4"
              >
                <span className="w-10 h-px bg-brand-olive" />
                <span className="text-[10px] uppercase tracking-widest text-brand-olive font-bold">
                  {ecosystem.eyebrow}
                </span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: 0.1, duration: 0.65 }}
                className="font-serif text-4xl md:text-5xl leading-tight"
              >
                {ecosystem.title} <span className="italic font-normal text-brand-olive">{ecosystem.titleHighlight}</span>
              </motion.h2>
            </div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-gray-500 font-light text-sm leading-relaxed max-w-sm"
            >
              {ecosystem.intro}
            </motion.p>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-10 items-start">

            {/* ===== LEFT COLUMN ===== */}
            <div className="flex flex-col gap-8">

              {/* Image — lands from top-left */}
              <LandingImage
                src={asset(ecosystem.leftImage)}
                delay={0}
                fromX="-55%"
                fromY="-130%"
                fromRotate={-13}
                className="aspect-[4/3] w-full"
              />

              {/* Stats row — 3 impact numbers */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="grid grid-cols-3 divide-x divide-brand-charcoal/10 border border-brand-charcoal/10 rounded-sm"
              >
                {ecosystem.stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.55 }}
                    className="p-6 text-center group hover:bg-brand-dark-olive hover:text-brand-beige transition-colors duration-300"
                  >
                    <p className="font-serif text-3xl font-bold mb-1 text-brand-dark-olive group-hover:text-brand-beige transition-colors duration-300">
                      {stat.value}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-gray-400 group-hover:text-brand-beige/60 transition-colors duration-300">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Process pills */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: false }}
                transition={{ delay: 0.75, duration: 0.6 }}
                className="flex flex-col gap-3"
              >
                <p className="text-[10px] uppercase tracking-widest font-bold text-brand-charcoal/40 mb-1">
                  {ecosystem.processTitle}
                </p>
                {ecosystem.process.map((p, i) => (
                  <motion.div
                    key={p.step}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: 0.85 + i * 0.08, duration: 0.5 }}
                    whileHover={{ x: 6 }}
                    className="flex items-center gap-4 p-4 border border-brand-charcoal/8 rounded-sm hover:border-brand-olive/40 hover:bg-white/50 transition-all duration-300 cursor-pointer group"
                  >
                    <span className="text-brand-olive text-base group-hover:scale-125 transition-transform duration-200">
                      {p.symbol}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-brand-charcoal/30 min-w-[2rem]">
                      {p.step}
                    </span>
                    <span className="text-sm font-medium text-brand-charcoal">{p.text}</span>
                    <ArrowRight size={12} className="ml-auto text-brand-olive opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="flex flex-col gap-8">

              {/* Image — lands from top-right */}
              <LandingImage
                src={asset(ecosystem.rightImage)}
                delay={0.28}
                fromX="55%"
                fromY="-110%"
                fromRotate={11}
                className="aspect-[4/3] w-full"
              />

              {/* Quote card */}
              <motion.div
                initial={{ opacity: 0, y: 55, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false }}
                transition={{ delay: 0.9, duration: 0.72, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="bg-brand-dark-olive text-brand-beige p-10 rounded-sm shadow-2xl"
              >
                <p className="text-[10px] uppercase tracking-widest text-brand-olive font-bold mb-4">
                  {ecosystem.quoteLabel}
                </p>
                <p className="font-serif text-2xl leading-relaxed mb-6">
                  "{ecosystem.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-olive flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {ecosystem.quoteInitials}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{ecosystem.quoteAuthor}</p>
                    <p className="text-[10px] opacity-50 uppercase tracking-widest">
                      {ecosystem.quoteRole}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Certifications / trust badges */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: 1.1, duration: 0.65 }}
                className="border border-brand-charcoal/10 rounded-sm p-6"
              >
                <p className="text-[10px] uppercase tracking-widest font-bold text-brand-charcoal/40 mb-5">
                  {ecosystem.certificationsTitle}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {ecosystem.certifications.map((cert, i) => (
                    <motion.div
                      key={cert.tag}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: false }}
                      transition={{ delay: 1.2 + i * 0.07, duration: 0.4 }}
                      className="flex items-center gap-3 p-3 bg-brand-beige/60 rounded-sm group hover:bg-brand-dark-olive hover:text-brand-beige transition-all duration-300"
                    >
                      <span className="text-[10px] font-bold bg-brand-olive text-white px-2 py-1 rounded-sm group-hover:bg-brand-beige group-hover:text-brand-dark-olive transition-colors duration-300">
                        {cert.tag}
                      </span>
                      <span className="text-[10px] font-medium leading-tight">{cert.label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>

      {/* ==================== CARDS ==================== */}
      <section className="py-20 bg-brand-beige/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.7 }}
            className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <h2 className="font-serif text-4xl md:text-6xl leading-tight">
              {occasions.title}{' '}
              <span className="italic font-normal text-brand-olive">{occasions.titleHighlight}</span>
              <br />{occasions.titleEnd}
            </h2>
            
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-12">
            {cards.map((item, i) => (
              <SolutionCard key={item.title} item={item} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CAPABILITIES ==================== */}
      <section className="py-32 bg-brand-dark-olive text-brand-beige relative overflow-hidden">
        <Particles />

        {/* ghost watermark */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[190px] font-serif text-brand-beige/[0.03] leading-none select-none pointer-events-none">
          {capabilitySection.watermark}
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="border-l border-brand-beige/20 pl-10 md:pl-20">

            <motion.h2
              initial={{ opacity: 0, x: -60, rotateY: -20 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="font-serif text-5xl md:text-7xl mb-24"
            >
              {capabilitySection.title}{' '}
              <span className="italic font-normal text-brand-olive">{capabilitySection.titleHighlight}</span>
            </motion.h2>

            <div className="grid md:grid-cols-2 gap-y-12 gap-x-20">
              {capabilities.map((cap, i) => (
                <CapRow key={cap.id} cap={cap} i={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA BAND ==================== */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false }}
        transition={{ duration: 0.8 }}
        className="py-24 bg-brand-olive text-brand-beige text-center relative overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 opacity-10 pointer-events-none"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ repeat: Infinity, repeatType: 'mirror', duration: 12 }}
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative z-10">
          <motion.h3
            initial={{ y: 32, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: false }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="font-serif text-4xl md:text-6xl mb-8"
          >
            {cta.title}{' '}
            <span className="italic font-normal">{cta.titleHighlight}</span>
          </motion.h3>
          <motion.div
            initial={{ y: 22, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            onClick={() => window.location.href = '/get-proposal'}
            viewport={{ once: false }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <MagneticBtn dark>{cta.button}</MagneticBtn>
          </motion.div>
        </div>
      </motion.section>

    </div>
  );
};