import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, ChevronDown, ArrowRight,
  Users, Gift, Sparkles, CalendarDays, HeartPulse, Leaf,
  Cake, Award, Rocket, Trophy, GraduationCap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { asset } from '../lib/content';
import content from '../content/pages/navigation.json';

/* ─────────────────────────────────────────────
   OCCASIONS  — 10 pages, each with icon + desc 
───────────────────────────────────────────── */
const ICONS = {
  Gift, Users, Sparkles, CalendarDays, HeartPulse, Cake, Award, Rocket, Trophy, GraduationCap,
};

const { header, megaMenu, toggle, mobile } = content;

const OCCASIONS = content.occasions.map((o) => ({
  ...o,
  icon: ICONS[o.icon as keyof typeof ICONS] ?? Gift,
}));

/* How many occasions to show before "View All" overflow */
const VISIBLE_COUNT = 10;

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ─────────────────────────────────────────────
   SINGLE OCCASION ROW
───────────────────────────────────────────── */
function OccasionRow({
  item,
  index,
  onClose,
}: {
  item: (typeof OCCASIONS)[0];
  index: number;
  onClose: () => void;
}) {
  const Icon = item.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.04, ease: EASE }}
    >
      <Link
        to={item.path}
        onClick={onClose}
        style={{ textDecoration: 'none', display: 'block' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          animate={{ background: hovered ? '#f5f4f0' : 'transparent' }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg"
          style={{
            border: '1px solid transparent',
            borderColor: hovered ? 'rgba(181,162,106,0.18)' : 'transparent',
          }}
        >
          <motion.div
            animate={{ background: hovered ? item.accent : `${item.accent}1a` }}
            transition={{ duration: 0.22 }}
            className="flex-shrink-0 flex items-center justify-center rounded-full"
            style={{ width: 36, height: 36 }}
          >
            <Icon size={15} color={hovered ? '#fff' : item.accent} strokeWidth={1.7} />
          </motion.div>

          <div className="min-w-0">
            <p
              className="font-semibold text-xs leading-snug truncate"
              style={{ color: '#1a1a18' }}
            >
              {item.label}
            </p>
            <p
              className="text-[11px] font-light mt-0.5 truncate"
              style={{ color: '#888782' }}
            >
              {item.desc}
            </p>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   VIEW ALL OVERFLOW ROW — expands to show hidden
───────────────────────────────────────────── */
function ViewAllRow({
  expanded,
  onToggle,
  hiddenCount,
}: {
  expanded: boolean;
  onToggle: () => void;
  hiddenCount: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.32, ease: EASE }}
      className="col-span-2"
    >
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <motion.div
          animate={{
            background: hovered ? 'rgba(181,162,106,0.07)' : 'rgba(181,162,106,0.03)',
          }}
          transition={{ duration: 0.18 }}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg mx-1"
          style={{ border: '1px dashed rgba(181,162,106,0.3)' }}
        >
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{ display: 'inline-flex' }}
          >
            <ChevronDown size={12} color="#b5a26a" strokeWidth={2.5} />
          </motion.span>
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: '#b5a26a' }}
          >
            {expanded ? toggle.showLess : `${toggle.viewAll} (+${hiddenCount} ${toggle.moreSuffix})`}
          </span>
        </motion.div>
      </button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   FULL-WIDTH MEGA MENU
───────────────────────────────────────────── */
function MegaMenu({
  onClose,
  isTransparent,
}: {
  onClose: () => void;
  isTransparent: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleOccasions = expanded ? OCCASIONS : OCCASIONS.slice(0, VISIBLE_COUNT);
  const hiddenCount = OCCASIONS.length - VISIBLE_COUNT;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: EASE }}
      style={{
        position: 'fixed',
        top: 64,
        left: 0,
        right: 0,
        width: '100vw',
        zIndex: 49,
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 12px 60px rgba(0,0,0,0.13)',
        borderTop: '1px solid rgba(181,162,106,0.15)',
        borderBottom: '1px solid rgba(181,162,106,0.1)',
      }}
    >
      <div className="mx-auto flex" style={{ maxWidth: 1400, minHeight: 180 }}>

        {/* ── LEFT PANEL ──────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col justify-center px-8 py-5"
          style={{
            width: 250,
            borderRight: '1px solid rgba(181,162,106,0.12)',
            background: 'rgba(250,248,243,0.7)',
          }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2 self-start"
            style={{
              background: 'rgba(181,162,106,0.12)',
              border: '1px solid rgba(181,162,106,0.25)',
            }}
          >
            <Leaf size={11} color="#b5a26a" strokeWidth={2} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: '#b5a26a' }}
            >
              {megaMenu.eyebrow}
            </span>
          </div>

          <h3
            className="font-serif leading-snug mb-2"
            style={{ fontSize: 20, color: '#1a1a18', fontWeight: 700 }}
          >
            {megaMenu.title}{' '}
            <span style={{ color: '#b5a26a', fontStyle: 'italic', fontWeight: 400 }}>
              {megaMenu.titleHighlight}
            </span>
          </h3>

          <p
            className="text-xs font-light leading-relaxed mb-3"
            style={{ color: '#73736e', maxWidth: 220 }}
          >
            {megaMenu.tagline}
          </p>

          {/* Occasion count badge */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4 self-start"
            style={{ background: 'rgba(90,138,110,0.1)', border: '1px solid rgba(90,138,110,0.2)' }}
          >
            <span className="text-[10px] font-bold" style={{ color: '#5a8a6e' }}>
              {OCCASIONS.length} {megaMenu.countSuffix}
            </span>
          </div>

          <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
            <Link
              to="/solutions"
              onClick={onClose}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              style={{ color: '#b5a26a', textDecoration: 'none' }}
            >
              {megaMenu.viewAllLink} <ArrowRight size={12} />
            </Link>
          </motion.div>    
        </div>

        {/* ── CENTER GRID ─────────────────────── */}
        <div
          className="flex-1 px-2 py-3"
          style={{ alignContent: 'start' }}
        >
          <motion.div
            className="grid grid-cols-2 gap-x-1 gap-y-0"
            layout
            transition={{ duration: 0.35, ease: EASE }}
          >
            {visibleOccasions.map((item, i) => (
              <OccasionRow key={item.path} item={item} index={i} onClose={onClose} />
            ))}

            {/* View All / Show Less toggle — always spans full 2 cols */}
            <ViewAllRow
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
              hiddenCount={hiddenCount}
            />
          </motion.div>
        </div>

        {/* ── RIGHT CTA CARD ──────────────────── */}
        <div
          className="flex-shrink-0 flex items-center px-5 py-5"
          style={{
            width: 240,
            borderLeft: '1px solid rgba(181,162,106,0.12)',
          }}
        >
          <div className="w-full rounded-xl p-4" style={{ background: '#1c1f17' }}>
            <div
              className="flex items-center justify-center rounded-lg mb-3"
              style={{ width: 36, height: 36, background: '#b5a26a' }}
            >
              <Sparkles size={16} color="#fff" strokeWidth={1.6} />
            </div>

            <p className="font-bold text-sm leading-snug mb-1" style={{ color: '#fff' }}>
              {megaMenu.ctaTitle}
            </p>
            <p
              className="text-[11px] font-light leading-relaxed mb-4"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {megaMenu.ctaText}
            </p>

            <motion.div whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
              <Link
                to="/get-proposal"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-sm font-bold"
                style={{ color: '#b5a26a', textDecoration: 'none' }}
              >
                {megaMenu.ctaButton} <ArrowRight size={13} />
              </Link>
            </motion.div>

            <div
              className="mt-3 pt-3 space-y-1.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              {megaMenu.badges.map((b) => (
                <div key={b.text} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: b.dotColor }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    {b.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
export const Navbar = () => {
  const [isOpen, setIsOpen]               = useState(false);
  const [isScrolled, setIsScrolled]       = useState(false);
  const [occasionsOpen, setOccasionsOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location   = useLocation();
  const isHome     = location.pathname === '/';

  React.useEffect(() => {
    if (!isHome) { setIsScrolled(true); return; }
    const fn = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, [isHome]);

  const isTransparent = isHome && !isScrolled;

  const openDD  = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setOccasionsOpen(true); };
  const closeDD = () => { closeTimer.current = setTimeout(() => setOccasionsOpen(false), 130); };

  const handleClose = () => {
    setOccasionsOpen(false);
    setIsOpen(false);
    setMobileExpanded(false);
    window.scrollTo(0, 0);
  };

  const NAV_LINKS = header.links;

  const linkColor = (path: string) =>
    location.pathname === path
      ? '#b5a26a'
      : isTransparent
      ? 'rgba(255,255,255,0.88)'
      : 'rgba(38,38,36,0.68)';

  const mobileVisible = mobileExpanded ? OCCASIONS : OCCASIONS.slice(0, VISIBLE_COUNT);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: isTransparent ? 'transparent' : 'rgba(250,248,243,0.96)',
          backdropFilter:  isTransparent ? 'none'        : 'blur(12px)',
          boxShadow:       isTransparent ? 'none'        : '0 2px 20px rgba(0,0,0,0.08)',
          borderBottom:    isTransparent ? 'none'        : '1px solid rgba(181,162,106,0.15)',
        }}
      >
        <div className="w-full px-10 h-16 flex items-center justify-between" style={{ maxWidth: 1400, margin: '0 auto' }}>

          {/* LOGO */}
          <Link to="/" onClick={handleClose} className="flex items-center flex-shrink-0">
            <img src={asset(header.logo)} alt={header.logoAlt} className="h-12" />
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden lg:flex items-center gap-9">

            {/* ── Occasions trigger ── */}
            <div className="relative" onMouseEnter={openDD} onMouseLeave={closeDD}>
              <button
                onClick={() => setOccasionsOpen((v) => !v)}
                className="flex items-center gap-1 text-[14px] uppercase tracking-[0.2em] font-semibold bg-transparent border-none cursor-pointer transition-colors duration-200"
                style={{ color: occasionsOpen ? '#b5a26a' : linkColor('/') }}
              >
                {header.occasionsLabel}
                <motion.span
                  animate={{ rotate: occasionsOpen ? 180 : 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  style={{ display: 'inline-flex', marginTop: 1 }}
                >
                  <ChevronDown size={13} strokeWidth={2.5} />
                </motion.span>
              </button>

              {occasionsOpen && (
                <div
                  style={{ position: 'absolute', top: '100%', left: -40, right: -40, height: 16 }}
                  onMouseEnter={openDD}
                />
              )}
            </div>

            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={handleClose}
                className="text-[14px] uppercase tracking-[0.2em] font-semibold whitespace-nowrap transition-colors duration-200"
                style={{ textDecoration: 'none', color: linkColor(link.path) }}
                onMouseEnter={e => (e.currentTarget.style.color = '#b5a26a')}
                onMouseLeave={e => (e.currentTarget.style.color = linkColor(link.path))}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* RIGHT — CTA + hamburger */}
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              className="hidden sm:block"
            >
              <Link
                to="/get-proposal"
                onClick={handleClose}
                className="px-6 py-2.5 text-[13px] font-bold uppercase tracking-widest transition-all duration-300"
                style={{
                  background:     isTransparent ? 'rgba(255,255,255,0.92)' : '#444f36',
                  color:          isTransparent ? '#1c1917'                 : 'white',
                  textDecoration: 'none',
                  display:        'block',
                  borderRadius:   2,
                }}
              >
                {header.proposalButton}
              </Link>
            </motion.div>

            <button
              onClick={() => setIsOpen((v) => !v)}
              className="lg:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: isTransparent ? 'white' : '#262624' }}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MEGA MENU ── */}
      <AnimatePresence>
        {occasionsOpen && (
          <div onMouseEnter={openDD} onMouseLeave={closeDD}>
            <MegaMenu onClose={handleClose} isTransparent={isTransparent} />
          </div>
        )}
      </AnimatePresence>

      {/* ── MOBILE MENU ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y:   0  }}
            exit={  { opacity: 0, y: -14 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="fixed top-16 left-0 w-full bg-white z-40 overflow-y-auto"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.12)', maxHeight: 'calc(100vh - 64px)' }}
          >
            <nav className="flex flex-col p-6 gap-2">

              {/* Occasions header */}
              <div className="flex items-center gap-2 px-3 mb-1">
                <Leaf size={10} color="#b5a26a" />
                <span className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: '#b5a26a' }}>
                  {mobile.occasionsLabel}
                </span>
                <span
                  className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(181,162,106,0.12)', color: '#b5a26a' }}
                >
                  {OCCASIONS.length} {mobile.totalSuffix}
                </span>
              </div>

              {/* Mobile occasion rows */}
              <AnimatePresence initial={false}>
                {mobileVisible.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: EASE }}
                    >
                      <Link
                        to={item.path}
                        onClick={handleClose}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors"
                        style={{ textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f5f4f0')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div
                          className="flex items-center justify-center rounded-full flex-shrink-0"
                          style={{ width: 38, height: 38, background: `${item.accent}18` }}
                        >
                          <Icon size={16} color={item.accent} strokeWidth={1.7} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#1a1a18' }}>{item.label}</p>
                          <p className="text-xs font-light" style={{ color: '#888782' }}>{item.desc}</p>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Mobile View All toggle */}
              <button
                onClick={() => setMobileExpanded((v) => !v)}
                className="flex items-center justify-center gap-2 mx-3 py-2.5 rounded-lg"
                style={{
                  background: 'none',
                  border: '1px dashed rgba(181,162,106,0.35)',
                  cursor: 'pointer',
                }}
              >
                <motion.span
                  animate={{ rotate: mobileExpanded ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  style={{ display: 'inline-flex' }}
                >
                  <ChevronDown size={12} color="#b5a26a" strokeWidth={2.5} />
                </motion.span>
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: '#b5a26a' }}
                >
                  {mobileExpanded
                    ? toggle.showLess
                    : `${toggle.viewAll} (+${OCCASIONS.length - VISIBLE_COUNT} ${toggle.moreSuffix})`}
                </span>
              </button>

              <div className="my-3" style={{ borderTop: '1px solid rgba(181,162,106,0.15)' }} />

              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={handleClose}
                  className="px-3 py-2.5 text-sm font-semibold uppercase tracking-widest rounded-lg transition-colors"
                  style={{ color: '#73736e', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f4f0')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {link.name}
                </Link>
              ))}

              <Link
                to="/get-proposal"
                onClick={handleClose}
                className="mt-2 px-6 py-3.5 text-center text-xs font-bold uppercase tracking-widest rounded-sm"
                style={{ background: '#444f36', color: 'white', textDecoration: 'none' }}
              >
                {mobile.proposalButton}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};