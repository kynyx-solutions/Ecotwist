import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import React from "react";
import { createPortal } from "react-dom";
import type { OrderProduct } from "./GetProposal";
import { BookOpen, PenLine, KeyRound, CalendarDays, NotebookPen, Flame, Gift, Package, ShoppingBasket, ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import catalogue from "../content/products.json";
import { testimonials } from "../lib/testimonials";
import { asset } from "../lib/content";
import content from "../content/pages/products.json";

// Page words: src/content/pages/products.json (admin → Pages → Products page).
// The catalogue itself is the separate products.json collection.
const { intro, hero, navbar, banners, productGrid, productCard, gallery: galleryText, reviews, cta } = content;

// Testimonials shown here come from the admin panel; the section is hidden until there is one
const clientStories = testimonials.map(t => ({
  quote: t.quote,
  author: t.name,
  role: [t.role, t.company].filter(Boolean).join(", "),
  avatar: t.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase(),
}));

// ── Signature Range ──────────────────────────────────────────────────────────
// The catalogue lives in src/content/products.json and is edited from the admin
// panel (/admin). Photos live in /public/Products and /public/catalogue.
interface Design {
  name: string;
  src: string;
  sku?: string;
}

interface SignatureItem {
  id: string;
  category: string;
  name: string;
  description: string;
  tags: string[];
  image: string;          // card cover
  icon: LucideIcon;       // shown on a tinted panel until a photo is added
  tint: string;
  photos?: string[];      // extra angles of a single product (opens Quick View)
  designs?: Design[];     // a range of designs to choose from (opens the design gallery)
}

// One product as stored in products.json
interface CatalogueEntry {
  id: string;
  category: string;
  name: string;
  description: string;
  showDesignCount?: boolean; // adds an "N designs" tag
  tags?: string[];
  image?: string;            // falls back to the first design or photo
  icon: string;              // a key of ICONS
  tint: string;
  photos?: string[];
  designs?: Design[];
}

const ICONS: Record<string, LucideIcon> = { BookOpen, PenLine, KeyRound, CalendarDays, NotebookPen, Flame, Gift, Package, ShoppingBasket };

// File names contain spaces, so encode them for the URL. Keep "+" out of file names:
// the live site (Vercel) reads it as a space, while the dev server doesn't decode %2B.
const photoUrl = (path: string) => encodeURI(path);

// Several photos of one design share a name, so count names rather than photos
const designCount = (designs: Design[]) => new Set(designs.map(d => d.name)).size;

const signatureRange: SignatureItem[] = (catalogue.products as CatalogueEntry[]).map(p => {
  const designs = p.designs?.length ? p.designs.map(d => ({ ...d, src: photoUrl(d.src) })) : undefined;
  const photos = p.photos?.length ? p.photos.map(photoUrl) : undefined;
  const tags = p.tags ?? [];
  return {
    id: p.id,
    category: p.category,
    name: p.name,
    description: p.description,
    tags: designs && p.showDesignCount ? [`${designCount(designs)} designs`, ...tags] : tags,
    image: p.image ? photoUrl(p.image) : designs?.[0].src ?? photos?.[0] ?? "",
    icon: ICONS[p.icon] ?? Gift,
    tint: p.tint,
    photos,
    designs,
  };
});

// Tabs follow the categories that actually have products
const categories = ["All", ...new Set(signatureRange.map(i => i.category))];

const productImage = (id: string) => signatureRange.find(i => i.id === id)?.image ?? "";

const heroPicks = ["cork-pen", "soy-wax-candles", "bamboo-bottle", "gift-box-2-jar"]
  .map(id => signatureRange.find(i => i.id === id))
  .filter((i): i is SignatureItem => !!i);

// ── Scroll-Reveal Hook ─────────────────────────────────────────────────────
function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Animated Counter ──────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useScrollReveal<HTMLSpanElement>();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1400;
    const step = 16;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// ── Magnetic Button ───────────────────────────────────────────────────────
function MagneticBtn({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const handleMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
  }, []);
  const handleLeave = useCallback(() => {
    if (btnRef.current) btnRef.current.style.transform = "translate(0,0)";
  }, []);
  return (
    <button ref={btnRef} className={className} onClick={onClick}
      onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ transition: "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94), background 0.3s, color 0.3s, border-color 0.3s" }}>
      {children}
    </button>
  );
}

// ── Custom Cursor ─────────────────────────────────────────────────────────
function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
    };
    const lerp = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.12;
      ring.current.y += (pos.current.y - ring.current.y) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px)`;
      }
      raf.current = requestAnimationFrame(lerp);
    };
    const onEnter = () => {
      if (ringRef.current) { ringRef.current.style.width = "56px"; ringRef.current.style.height = "56px"; ringRef.current.style.opacity = "0.6"; }
    };
    const onLeave = () => {
      if (ringRef.current) { ringRef.current.style.width = "36px"; ringRef.current.style.height = "36px"; ringRef.current.style.opacity = "0.35"; }
    };
    document.querySelectorAll("a, button, [data-hover]").forEach(el => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });
    window.addEventListener("mousemove", move);
    raf.current = requestAnimationFrame(lerp);
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      {/* <div ref={dotRef} style={{
        position: "fixed", top: 0, left: 0, width: "6px", height: "6px",
        background: "#c8a96e", borderRadius: "50%", pointerEvents: "none",
        zIndex: 9999, marginLeft: "-3px", marginTop: "-3px", mixBlendMode: "multiply",
        transition: "width 0.2s, height 0.2s",
      }} /> */}
      {/* <div ref={ringRef} style={{
        position: "fixed", top: 0, left: 0, width: "36px", height: "36px",
        border: "1.5px solid #c8a96e", borderRadius: "50%", pointerEvents: "none",
        zIndex: 9998, marginLeft: "-18px", marginTop: "-18px", opacity: 0.35,
        transition: "width 0.35s cubic-bezier(0.25,0.46,0.45,0.94), height 0.35s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.3s",
      }} /> */}
    </>
  );
}

// ── Particle Canvas ───────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    type Particle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string; };
    const colors = ["#c8a96e", "#7a9e7e", "#e8e4dd", "#b87355"];
    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.4 - 0.1,
      size: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let frame: number;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < -5 || p.x > W + 5) p.vx *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(tick);
    };
    tick();

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }} />;
}

// ── Parallax Image ────────────────────────────────────────────────────────
function ParallaxImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift = center * 0.12;
      const img = el.querySelector("img") as HTMLImageElement;
      if (img) img.style.transform = `scale(1.12) translateY(${shift}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" style={{ transition: "transform 0.1s linear" }} />
    </div>
  );
}

// ── Splitting Text Reveal ─────────────────────────────────────────────────
function SplitTextReveal({ text, className, visible, baseDelay = 0, stagger = 30 }: {
  text: string; className?: string; visible: boolean; baseDelay?: number; stagger?: number;
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <span key={i} aria-hidden="true" style={{
          display: "inline-block",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) rotateX(0deg)" : "translateY(30px) rotateX(-60deg)",
          transition: `opacity 0.5s ease ${baseDelay + i * stagger}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${baseDelay + i * stagger}ms`,
          transformStyle: "preserve-3d",
          whiteSpace: char === " " ? "pre" : "normal",
        }}>{char}</span>
      ))}
    </span>
  );
}

// ── Tilt Card ─────────────────────────────────────────────────────────────
const TiltCard = React.forwardRef<HTMLDivElement, {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}>(function TiltCard({ children, className, style, onMouseEnter: extEnter, onMouseLeave: extLeave }, forwardedRef) {
  const innerRef = useRef<HTMLDivElement>(null);
  // Support both the forwarded ref and the internal one
  const setRef = (el: HTMLDivElement | null) => {
    (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = innerRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateZ(4px)`;
  };
  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (innerRef.current) innerRef.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0)";
    extLeave?.(e);
  };
  const handleEnter = (e: React.MouseEvent<HTMLDivElement>) => { extEnter?.(e); };
  return (
    <div ref={setRef} className={className} style={{ ...style, transition: "transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.3s ease" }}
      onMouseMove={handleMove} onMouseLeave={handleLeave} onMouseEnter={handleEnter}>
      {children}
    </div>
  );
});

// ── Ripple Button ─────────────────────────────────────────────────────────
function RippleBtn({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current; if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,0.25);left:${x - size / 2}px;top:${y - size / 2}px;transform:scale(0);animation:rippleAnim 0.6s ease-out forwards;pointer-events:none;`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
    onClick?.();
  };
  return (
    <button ref={btnRef} className={className} onClick={handleClick}
      style={{ position: "relative", overflow: "hidden", transition: "background 0.3s, color 0.3s, transform 0.2s, box-shadow 0.3s" }}>
      {children}
    </button>
  );
}

// ── Body Portal ───────────────────────────────────────────────────────────
// The route's PageWrapper animates transform/filter, which makes `position: fixed`
// relative to the page instead of the viewport — so overlays render into <body>.
function BodyPortal({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div style={{ fontFamily: "'Jost', system-ui, sans-serif" }}>{children}</div>,
    document.body
  );
}

// ── Signature Card ────────────────────────────────────────────────────────
function SignatureCard({ item, index, onOpenGallery, onOrder }: {
  item: SignatureItem; index: number;
  onOpenGallery: (item: SignatureItem) => void;
  onOrder: (item: SignatureItem) => void;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>(0.1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const delay = (index % 8) * 80;
  const Icon = item.icon;
  // Ranges open the design gallery; single products order directly, with a Quick View of their photos
  const order = () => (item.designs ? onOpenGallery(item) : onOrder(item));
  const orderLabel = item.designs ? productCard.viewDesigns : productCard.orderNow;
  const preview = () => (item.designs || item.photos ? onOpenGallery(item) : onOrder(item));
  const previewLabel = item.designs ? productCard.viewDesigns : item.photos ? productCard.quickView : productCard.orderNow;

  return (
    <TiltCard
      ref={ref}
      className="bg-white border border-[#e8e4dd] rounded-sm overflow-hidden group flex flex-col"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.95)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        boxShadow: hovered ? "0 24px 48px rgba(28,43,30,0.14), 0 8px 16px rgba(28,43,30,0.08)" : "0 2px 8px rgba(28,43,30,0.04)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image — falls back to a tinted icon panel until the photo is added */}
      <div className="relative overflow-hidden h-56"
        style={{ background: imgFailed ? `linear-gradient(135deg, ${item.tint} 0%, #f5f0e8 100%)` : "#f5f0e8" }}>
        {imgFailed ? (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundImage: "radial-gradient(rgba(28,43,30,0.07) 1px, transparent 1px)", backgroundSize: "10px 10px" }}>
            <Icon size={46} strokeWidth={1} color="#1c2b1e"
              style={{ opacity: 0.55, transform: hovered ? "scale(1.1) rotate(-4deg)" : "scale(1)", transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)" }} />
          </div>
        ) : (
          <>
            <img src={item.image} alt={item.name} loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
              style={{
                transform: hovered ? "scale(1.06)" : "scale(1)",
                transition: "transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.4s ease",
                opacity: imgLoaded ? 1 : 0,
              }} />
            {!imgLoaded && <div className="absolute inset-0 shimmer" />}
          </>
        )}

        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(28,43,30,0.1) 0%, transparent 60%)" }} />

        {item.designs && (
          <span className="absolute bottom-3 right-3 font-body text-[9px] tracking-widest uppercase bg-[#1c2b1e] text-white px-2.5 py-1">
            {designCount(item.designs)} {productCard.designsBadge}
          </span>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: hovered ? "rgba(28,43,30,0.55)" : "rgba(28,43,30,0)", transition: "background 0.4s ease" }}>
          <button onClick={preview}
            className="bg-white text-[#1c2b1e] font-body text-[10px] tracking-widest uppercase px-4 py-2.5 hover:bg-[#c8a96e] hover:text-white"
            style={{
              opacity: hovered ? 1 : 0,
              transform: hovered ? "translateY(0) scale(1)" : "translateY(14px) scale(0.9)",
              transition: "opacity 0.3s ease 0.05s, transform 0.35s cubic-bezier(0.22,1,0.36,1) 0.05s, background 0.2s",
            }}>
            {previewLabel}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <p className="font-body text-[10px] tracking-widest uppercase text-[#7a9e7e] mb-1">{item.category}</p>
        <h3 className="font-display text-[17px] font-light text-[#1c2b1e] leading-snug mb-1">{item.name}</h3>
        <p className="font-body text-xs text-[#8c8880] leading-relaxed mb-3">{item.description}</p>
        <p className="font-body text-[10px] tracking-widest uppercase text-[#c8a96e] mb-4">{item.tags.join(" · ")}</p>
        <div className="mt-auto flex justify-end">
          <RippleBtn
            onClick={order}
            className="font-body text-[10px] tracking-widest uppercase bg-[#1c2b1e] text-white px-3 py-2 hover:bg-[#c8a96e]">
            {orderLabel}
          </RippleBtn>
        </div>
      </div>
    </TiltCard>
  );
}

// ── Design Gallery (also the Quick View for single products with photos) ──
function DesignGallery({ item, onClose, onOrder }: {
  item: SignatureItem; onClose: () => void; onOrder: (design: Design) => void;
}) {
  const designs: Design[] = item.designs ?? (item.photos ?? []).map(src => ({ name: item.name, src }));
  const [active, setActive] = useState(0);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const go = useCallback((dir: number) => {
    setActive(i => (i + dir + designs.length) % designs.length);
  }, [designs.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Keep the active thumbnail in view
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[active] as HTMLElement | undefined;
    if (strip && thumb) {
      strip.scrollTo({ left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2, behavior: "smooth" });
    }
  }, [active]);

  if (designs.length === 0) return null;
  const current = designs[active];

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm"
        style={{ animation: "heroFade 0.25s ease both" }}
        onClick={onClose}>
        <div className="scale-in bg-[#faf8f4] max-w-5xl w-full rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
          onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-5 md:px-7 pt-5 pb-4 border-b border-[#e8e4dd]">
            <div>
              <p className="font-body text-[10px] tracking-widest uppercase text-[#7a9e7e] mb-1">{item.category}</p>
              <h3 className="font-display text-2xl md:text-3xl font-light text-[#1c2b1e] leading-tight">{item.name}</h3>
            </div>
            <div className="flex items-center gap-4">
              {designs.length > 1 && (
                <span className="font-body text-xs text-[#8c8880] whitespace-nowrap">{active + 1} / {designs.length}</span>
              )}
              <button onClick={onClose} aria-label={galleryText.closeLabel}
                className="text-[#8c8880] hover:text-[#1c2b1e] text-3xl leading-none"
                style={{ transition: "transform 0.25s ease, color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "rotate(90deg) scale(1.2)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "rotate(0deg) scale(1)")}>×</button>
            </div>
          </div>

          {/* Main image */}
          <div className="relative bg-[#ebe6e0] flex items-center justify-center min-h-0 flex-1">
            <img key={current.src} src={current.src} alt={current.name}
              className="w-full h-full object-contain max-h-[58vh]"
              style={{ animation: "heroFade 0.35s ease both" }} />
            {designs.length > 1 && (
              <>
                <button onClick={() => go(-1)} aria-label={galleryText.previousLabel}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#1c2b1e] flex items-center justify-center shadow-md hover:bg-[#c8a96e] hover:text-white transition-colors">
                  <ChevronLeft size={20} strokeWidth={1.5} />
                </button>
                <button onClick={() => go(1)} aria-label={galleryText.nextLabel}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#1c2b1e] flex items-center justify-center shadow-md hover:bg-[#c8a96e] hover:text-white transition-colors">
                  <ChevronRight size={20} strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>

          {/* Caption */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 md:px-7 py-4 border-t border-[#e8e4dd]">
            <div>
              {item.designs ? (
                <>
                  <p className="font-display text-xl font-light text-[#1c2b1e] leading-snug">{current.name}</p>
                  {current.sku && <p className="font-body text-[10px] tracking-widest uppercase text-[#8c8880] mt-0.5">{galleryText.skuLabel} {current.sku}</p>}
                </>
              ) : (
                <>
                  <p className="font-body text-sm text-[#555] leading-relaxed max-w-xl">{item.description}</p>
                  <p className="font-body text-[10px] tracking-widest uppercase text-[#c8a96e] mt-1">{item.tags.join(" · ")}</p>
                </>
              )}
            </div>
            <RippleBtn onClick={() => onOrder(current)}
              className="font-body text-[10px] tracking-widest uppercase bg-[#1c2b1e] text-white px-6 py-3 hover:bg-[#c8a96e] whitespace-nowrap">
              {item.designs ? galleryText.orderDesign : galleryText.orderNow}
            </RippleBtn>
          </div>

          {/* Thumbnails */}
          {designs.length > 1 && (
            <div ref={thumbsRef} className="flex gap-2 overflow-x-auto px-5 md:px-7 pt-1.5 pb-5 relative">
              {designs.map((d, i) => (
                <button key={d.src} onClick={() => setActive(i)} aria-label={d.name}
                  className="flex-shrink-0 w-20 h-[62px] overflow-hidden rounded-sm bg-[#ebe6e0]"
                  style={{
                    outline: i === active ? "2px solid #c8a96e" : "1px solid #e8e4dd",
                    outlineOffset: i === active ? "2px" : "0",
                    opacity: i === active ? 1 : 0.6,
                    transition: "opacity 0.2s, outline-color 0.2s",
                  }}>
                  <img src={d.src} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ExecutiveGiftPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // A link such as /products?category=Candles opens the page on that tab
  const linkedCategory = new URLSearchParams(location.search).get("category");
  const [activeCategory, setActiveCategory] = useState(() =>
    linkedCategory && categories.includes(linkedCategory) ? linkedCategory : "All");
  const [gallery, setGallery] = useState<SignatureItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [introPhase, setIntroPhase] = useState(0); // 0=curtain, 1=reveal, 2=done
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroScrollY, setHeroScrollY] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(false);

  // Intro animation sequence
  useEffect(() => {
    const t1 = setTimeout(() => setIntroPhase(1), 300);
    const t2 = setTimeout(() => setIntroPhase(2), 1600);
    const t3 = setTimeout(() => { setHeroVisible(true); setCursorVisible(true); }, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // ...and scrolls to the product grid once the intro has played, keeping the
  // tabs clear of the site navbar and this page's sticky bar (64px each)
  useEffect(() => {
    if (!linkedCategory) return;
    const t = setTimeout(() => {
      const grid = document.getElementById("products");
      if (grid) window.scrollTo({ top: grid.getBoundingClientRect().top + window.scrollY - 128, behavior: "smooth" });
    }, 1700);
    return () => clearTimeout(t);
  }, [linkedCategory]);

  // Scroll watcher
  useEffect(() => {
    const onScroll = () => {
      const heroEl = heroRef.current;
      const heroBottom = heroEl ? heroEl.getBoundingClientRect().bottom : 0;
      setNavScrolled(heroBottom <= 64);
      setHeroScrollY(window.scrollY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = gallery ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [gallery]);

  // Order buttons open the proposal form with this product pre-selected
  const orderProduct = (product: OrderProduct) => navigate("/get-proposal", { state: { product } });

  const filtered = signatureRange
    .filter(i => activeCategory === "All" || i.category === activeCategory)
    .filter(i => searchQuery === "" ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase()));


  const { ref: statsRef, visible: statsVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: bannersRef, visible: bannersVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: testimonialsRef, visible: testimonialsVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: ctaRef, visible: ctaVisible } = useScrollReveal<HTMLDivElement>();

  // Hero parallax offset
  const heroParallax = heroScrollY * 0.35;

  return (
    <div className="min-h-screen bg-[#faf8f4]" style={{ fontFamily: "'Jost', system-ui, sans-serif" }}>

      {/* ══════════ GLOBAL STYLES ══════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap');
        .font-display { font-family: 'Cormorant Garamond', Georgia, serif; }
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Core Keyframes ── */
        @keyframes heroLine     { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes heroFade     { from{opacity:0} to{opacity:1} }
        @keyframes slideRight   { from{opacity:0;transform:translateX(48px)} to{opacity:1;transform:translateX(0)} }
        @keyframes toastPop     { from{opacity:0;transform:translateY(14px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes scaleIn      { from{opacity:0;transform:scale(0.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes badgePop     { from{opacity:0;transform:scale(0.7) rotate(-6deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
        @keyframes shimmer      { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes float        { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse-ring   { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
        @keyframes spinSlow     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes rippleAnim   { to{transform:scale(1);opacity:0} }
        @keyframes countUp      { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        /* ── NEW TOP-CLASS ANIMATIONS ── */

        /* 1. Cinematic intro curtain - dual panels split from center */
        @keyframes curtainLeft  {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        @keyframes curtainRight {
          0%   { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        .curtain-left  { animation: curtainLeft  1s cubic-bezier(0.87,0,0.13,1) forwards; }
        .curtain-right { animation: curtainRight 1s cubic-bezier(0.87,0,0.13,1) forwards; }

        /* 2. Morphing gradient orbs behind hero */
        @keyframes orbDrift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(40px,-30px) scale(1.15); }
          66%      { transform: translate(-20px,20px) scale(0.9); }
        }
        @keyframes orbDrift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(-35px,25px) scale(1.1); }
          66%      { transform: translate(25px,-15px) scale(0.95); }
        }
        @keyframes orbDrift3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(20px,40px) scale(1.2); }
        }

        /* 3. Logo reveal: mask wipe */
        @keyframes logoReveal {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0% 0 0); }
        }
        .logo-reveal { animation: logoReveal 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both; }

        /* 4. Text scramble on hover (CSS-only approximation with clip-path) */
        @keyframes textClipReveal {
          from { clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%); }
          to   { clip-path: polygon(0 0%, 100% 0%, 100% 100%, 0 100%); }
        }

        /* 5. Hero line stagger with blur */
        @keyframes heroLineBlur {
          from { opacity:0; transform:translateY(20px); filter:blur(8px); }
          to   { opacity:1; transform:translateY(0); filter:blur(0); }
        }

        /* 6. Nav items cascade */
        @keyframes navCascade {
          from { opacity:0; transform:translateY(-12px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* 7. Category banner perspective flip-in */
        @keyframes flipIn {
          from { opacity:0; transform:perspective(600px) rotateX(-25deg) translateY(20px); }
          to   { opacity:1; transform:perspective(600px) rotateX(0deg) translateY(0); }
        }

        /* 8. Testimonial card morph */
        @keyframes cardMorph {
          from { opacity:0; transform:translateY(32px) scale(0.93) rotate(-1deg); }
          to   { opacity:1; transform:translateY(0) scale(1) rotate(0deg); }
        }

        /* 9. Stats digit flip */
        @keyframes digitFlip {
          from { opacity:0; transform:rotateX(-90deg) scale(0.8); }
          to   { opacity:1; transform:rotateX(0deg) scale(1); }
        }

        /* 10. Glitch effect for badges */
        @keyframes glitchAnim {
          0%   { clip-path:inset(20% 0 60% 0); transform:translate(-2px, 0); }
          20%  { clip-path:inset(60% 0 10% 0); transform:translate(2px, 0); }
          40%  { clip-path:inset(10% 0 70% 0); transform:translate(-1px, 0); }
          60%  { clip-path:inset(70% 0 5% 0);  transform:translate(1px, 0); }
          80%  { clip-path:inset(5% 0 80% 0);  transform:translate(-2px, 0); }
          100% { clip-path:inset(0); transform:translate(0); }
        }

        /* 11. CTA section floating text */
        @keyframes ctaFloat {
          0%,100% { transform:translateY(0) rotate(-0.5deg); }
          50%      { transform:translateY(-12px) rotate(0.5deg); }
        }

        /* 12. Cart item slide-stack */
        @keyframes stackIn {
          from { opacity:0; transform:translateX(24px) scale(0.95); }
          to   { opacity:1; transform:translateX(0) scale(1); }
        }

        /* 13. Gold shimmer sweep on price */
        @keyframes goldSweep {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        /* 14. Underline draw for nav */
        @keyframes underlineDraw {
          from { transform:scaleX(0); transform-origin:left; }
          to   { transform:scaleX(1); transform-origin:left; }
        }

        /* 15. Scroll indicator bounce */
        @keyframes scrollBounce {
          0%,100% { transform:translateY(0) translateX(-50%); opacity:1; }
          50%      { transform:translateY(10px) translateX(-50%); opacity:0.5; }
        }

        /* 16. Page progress bar */
        @keyframes progressFill { from{width:0} to{width:var(--progress)} }

        /* 17. Hero image mosaic stagger with 3D depth */
        @keyframes mosaicReveal {
          from { opacity:0; transform:perspective(600px) translateZ(-40px) translateY(20px); }
          to   { opacity:1; transform:perspective(600px) translateZ(0) translateY(0); }
        }

        /* 18. Section heading with ink bleed */
        @keyframes inkBleed {
          from { letter-spacing:0.4em; opacity:0; }
          to   { letter-spacing:normal; opacity:1; }
        }

        /* ── Utility Classes ── */
        .slide-right  { animation: slideRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .scale-in     { animation: scaleIn 0.4s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .toast-in     { animation: toastPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
        .hero-line    { animation: heroLineBlur 0.75s cubic-bezier(0.22,1,0.36,1) both; }

        /* Shimmer skeleton */
        .shimmer {
          background: linear-gradient(90deg,#f0ebe3 25%,#faf8f4 50%,#f0ebe3 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }

        /* Nav underline hover */
        .nav-link { position: relative; }
        .nav-link::after {
          content: ""; position: absolute; left: 0; bottom: -2px;
          width: 0; height: 1px; background: #1c2b1e;
          transition: width 0.3s ease;
        }
        .nav-link:hover::after { width: 100%; }

        /* Category tab ink wipe */
        .cat-btn { position: relative; overflow: hidden; }
        .cat-btn::before {
          content: ""; position: absolute; inset: 0;
          background: #1c2b1e; transform: scaleX(0); transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94);
          z-index: 0;
        }
        .cat-btn:hover::before, .cat-btn.active::before { transform: scaleX(1); }
        .cat-btn span { position: relative; z-index: 1; }

        /* Float variants */
        .float-1 { animation: float 4s ease-in-out infinite; }
        .float-2 { animation: float 5.5s ease-in-out infinite 1s; }
        .float-3 { animation: float 3.8s ease-in-out infinite 0.5s; }

        /* Gold price shimmer */
        .price-shimmer {
          background: linear-gradient(90deg, #1c2b1e 30%, #c8a96e 50%, #1c2b1e 70%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: goldSweep 3s linear infinite;
        }

        /* Testimonial hover */
        .testimonial-card {
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
        }
        .testimonial-card:hover {
          transform: translateY(-6px) rotate(0.3deg);
          box-shadow: 0 20px 48px rgba(28,43,30,0.12);
        }

        /* Magnetic orbs */
        .orb-1 { animation: orbDrift1 8s ease-in-out infinite; }
        .orb-2 { animation: orbDrift2 11s ease-in-out infinite 2s; }
        .orb-3 { animation: orbDrift3 9s ease-in-out infinite 4s; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c8a96e; border-radius: 2px; }

        /* Cursor override for custom cursor */
      

        /* CTA float */
        .cta-float { animation: ctaFloat 6s ease-in-out infinite; }
      `}</style>

      {/* ══════════ CUSTOM CURSOR ══════════ */}
      {cursorVisible && <CustomCursor />}

      {/* ══════════ INTRO CURTAIN ══════════ */}
      {introPhase < 2 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", pointerEvents: "none" }}>
          <div style={{
            width: "50%", height: "100%", background: "#1c2b1e",
            ...(introPhase === 1 ? { animation: "curtainLeft 1s cubic-bezier(0.87,0,0.13,1) 0.1s forwards" } : {}),
          }} />
          <div style={{
            width: "50%", height: "100%", background: "#1c2b1e",
            ...(introPhase === 1 ? { animation: "curtainRight 1s cubic-bezier(0.87,0,0.13,1) 0.1s forwards" } : {}),
          }} />
          {/* Centered logo during curtain */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: introPhase === 0 ? 1 : 0, transition: "opacity 0.5s ease",
            zIndex: 1,
          }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem,5vw,3.5rem)", color: "#c8a96e", fontWeight: 300, letterSpacing: "0.3em" }}>{intro.brandName}</p>
              <div style={{ width: "40px", height: "1px", background: "#c8a96e", margin: "12px auto", animation: "shimmer 1s ease infinite" }} />
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "10px", color: "#7a9e7e", letterSpacing: "0.4em", textTransform: "uppercase" }}>{intro.brandTagline}</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ SCROLL PROGRESS BAR ══════════ */}
      <ScrollProgressBar />

      {/* ══════════ DESIGN GALLERY ══════════ */}
      {gallery && (
        <DesignGallery item={gallery}
          onClose={() => setGallery(null)}
          onOrder={d => orderProduct({ name: d.name, category: gallery.category, image: d.src, sku: d.sku })} />
      )}

      {/* ══════════ HERO ══════════ */}
      <section ref={heroRef} className="relative overflow-hidden bg-[#1c2b1e] text-white" style={{ minHeight: "90vh" }}>
        {/* Morphing gradient orbs */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="orb-1 absolute" style={{
            width: "500px", height: "500px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(122,158,126,0.18) 0%, transparent 70%)",
            top: "-100px", right: "10%",
          }} />
          <div className="orb-2 absolute" style={{
            width: "400px", height: "400px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,169,110,0.12) 0%, transparent 70%)",
            bottom: "0", left: "5%",
          }} />
          <div className="orb-3 absolute" style={{
            width: "300px", height: "300px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(184,115,85,0.1) 0%, transparent 70%)",
            top: "30%", left: "30%",
          }} />
        </div>

        {/* BG image with parallax */}
        <div className="absolute inset-0" style={{
          backgroundImage: `url('${asset(hero.backgroundImage)}')`,
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: heroVisible ? 0.2 : 0,
          transform: `translateY(${heroParallax}px) scale(1.1)`,
          transition: "opacity 1.2s ease",
        }} />

        {/* Particle canvas */}
        <ParticleCanvas />

        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, rgba(28,43,30,0.7) 0%, rgba(28,43,30,0.3) 60%, rgba(28,43,30,0.6) 100%)",
          zIndex: 2,
        }} />

        {/* Noise texture overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          zIndex: 2, opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center" style={{ zIndex: 3 }}>
          {/* Text Column */}
          <div>
            <p className="font-body text-xs tracking-[0.5em] uppercase text-[#7a9e7e] mb-5"
              style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s" }}>
              {hero.eyebrow}
            </p>

            {/* 3D split text headline */}
            <div className="mb-2" style={{ perspective: "600px" }}>
              <div className="overflow-hidden">
                <h1 className="font-display font-light leading-[1.1]"
                  style={{ fontSize: "clamp(2.5rem,5.5vw,4.5rem)", animation: heroVisible ? "heroLineBlur 0.8s ease 0.3s both" : "none" }}>
                  {hero.titleLine1}
                </h1>
              </div>
              <div className="overflow-hidden">
                <h1 className="font-display font-light leading-[1.05] italic text-[#c8a96e]"
                  style={{ fontSize: "clamp(3rem,7vw,5.5rem)", animation: heroVisible ? "heroLineBlur 0.8s ease 0.45s both" : "none" }}>
                  {hero.titleHighlight}
                </h1>
              </div>
              <div className="overflow-hidden">
                <h1 className="font-display font-light leading-[1.1]"
                  style={{ fontSize: "clamp(2.5rem,5.5vw,4.5rem)", animation: heroVisible ? "heroLineBlur 0.8s ease 0.6s both" : "none" }}>
                  {hero.titleLine2}
                </h1>
              </div>
            </div>

            {/* Animated divider line */}
            <div style={{
              height: "1px", background: "linear-gradient(90deg, #c8a96e, transparent)",
              width: heroVisible ? "120px" : "0px",
              transition: "width 0.8s cubic-bezier(0.22,1,0.36,1) 0.8s",
              marginBottom: "20px",
            }} />

            <p className="font-body text-[#c8c4bb] text-base leading-relaxed max-w-md mb-10 font-light"
              style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.7s ease 0.85s, transform 0.7s ease 0.85s" }}>
              {hero.intro}
            </p>

            <div className="flex flex-wrap gap-4"
              style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.6s ease 1s, transform 0.6s ease 1s" }}>
              <a href="#products"
                className="font-body text-xs tracking-widest uppercase bg-white text-[#1c2b1e] px-8 py-4"
                style={{ transition: "background 0.3s, color 0.3s, transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.02)"; e.currentTarget.style.background = "#c8a96e"; e.currentTarget.style.color = "white"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(200,169,110,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#1c2b1e"; e.currentTarget.style.boxShadow = "none"; }}>
                {hero.primaryButton}
              </a>
              <a href="#products" onClick={() => setActiveCategory("Gift Boxes")}
                className="font-body text-xs tracking-widest uppercase border border-white/30 text-white px-8 py-4"
                style={{ transition: "border-color 0.3s, background 0.3s, transform 0.3s cubic-bezier(0.22,1,0.36,1)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "transparent"; }}>
                {hero.secondaryButton}
              </a>
            </div>
          </div>

          {/* Hero image mosaic with 3D depth stagger */}
          <div className="hidden md:grid grid-cols-2 gap-3">
            {heroPicks.map((p, i) => (
              <div key={p.id}
                className={`overflow-hidden rounded-sm ${i === 0 ? "col-span-2 h-40" : "h-32"}`}
                style={{
                  animation: heroVisible ? `mosaicReveal 0.8s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.12}s both` : "none",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03) translateY(-3px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover opacity-80 hover:opacity-100"
                  style={{ transition: "opacity 0.4s ease, transform 0.7s ease, transform 0.7s ease" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div ref={statsRef} className="relative border-t border-white/10" style={{ zIndex: 3 }}>
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {hero.stats.map(st => [st.value, st.suffix, st.label]).map(([n, s, l], i) => (
              <div key={l} style={{
                opacity: statsVisible ? 1 : 0,
                transform: statsVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
                transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 120}ms`,
                animation: statsVisible ? `digitFlip 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 120}ms both` : "none",
              }}>
                <p className="font-display text-3xl font-light text-[#c8a96e]">
                  {statsVisible ? <AnimatedCounter target={parseInt(n)} suffix={s} /> : "0"}
                </p>
                <p className="font-body text-[10px] tracking-widest uppercase text-[#8c8880] mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: "32px", left: "50%",
          animation: "scrollBounce 2s ease-in-out infinite",
          zIndex: 3, opacity: heroVisible ? 1 : 0, transition: "opacity 0.5s ease 1.5s",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "9px", letterSpacing: "0.4em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{hero.scrollLabel}</span>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
              <rect x="5.5" y="0.5" width="5" height="10" rx="2.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <rect x="7" y="2" width="2" height="3" rx="1" fill="rgba(200,169,110,0.7)" style={{ animation: "scrollBounce 2s ease-in-out infinite" }} />
              <path d="M8 16l-3 4h6l-3-4z" fill="rgba(255,255,255,0.3)" />
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════ NAVBAR ══════════ */}
      <nav style={{
        position: "sticky", top: "64px", zIndex: 30,
        background: navScrolled ? "rgba(250,248,244,0.98)" : "rgba(250,248,244,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e8e4dd",
        boxShadow: navScrolled ? "0 2px 24px rgba(28,43,30,0.06)" : "none",
        transition: "background 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease",
      }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex-shrink-0 logo-reveal">
            <span className="font-display text-xl tracking-widest text-[#1c2b1e]">{navbar.brandName}</span>
            <span className="font-body text-xs tracking-[0.3em] text-[#8c8880] ml-2 uppercase hidden sm:inline">{navbar.brandTagline}</span>
          </div>
          {/* Search */}
          <div className="flex-1 max-w-xs hidden md:flex items-center border border-[#e8e4dd] bg-white px-4 py-2 gap-2"
            style={{ animation: "navCascade 0.5s ease 0.9s both", transition: "border-color 0.2s, box-shadow 0.2s" }}
            onFocus={e => (e.currentTarget.style.boxShadow = "0 0 0 2px rgba(200,169,110,0.25)")}
            onBlur={e => (e.currentTarget.style.boxShadow = "none")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8c8880" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input type="text" placeholder={navbar.searchPlaceholder} value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 font-body text-xs text-[#1c2b1e] bg-transparent outline-none placeholder-[#8c8880]" />
          </div>
          {/* Links */}
          <div className="flex items-center gap-5">
            <div className="hidden md:flex gap-5 font-body text-xs tracking-widest uppercase text-[#8c8880]">
              {(clientStories.length ? [navbar.shopLink, navbar.reviewsLink] : [navbar.shopLink]).map((link, i) => (
                <a key={link} href={link === navbar.shopLink ? "#products" : "#testimonials"}
                  className="nav-link hover:text-[#1c2b1e] transition-colors"
                  style={{ animation: `navCascade 0.5s ease ${0.7 + i * 0.1}s both` }}>
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════ CATEGORY BANNERS ══════════ */}
      <section ref={bannersRef} className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-5 gap-4">
        {banners.items.map((b, i) => ({ title: b.title, cat: b.category, img: productImage(b.key), span: i === 0 ? "md:col-span-2" : "md:col-span-1" })).map((b, i) => (
          <button key={b.title}
            onClick={() => { setActiveCategory(b.cat); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}
            className={`relative overflow-hidden rounded-sm group text-left h-40 ${b.span}`}
            style={{
              animation: bannersVisible ? `flipIn 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms both` : "none",
              transition: "box-shadow 0.3s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1)",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 20px 48px rgba(28,43,30,0.18)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <ParallaxImage src={b.img} alt={b.title} className="w-full h-full" />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to top, rgba(28,43,30,0.85) 0%, transparent 60%)",
              transition: "opacity 0.3s",
            }} />
            <div className="absolute bottom-4 left-4">
              <p className="font-display text-white text-lg font-light" style={{ animation: bannersVisible ? `inkBleed 0.5s ease ${i * 80 + 200}ms both` : "none" }}>{b.title}</p>
              <p className="font-body text-[10px] text-[#c8a96e] tracking-widest uppercase mt-0.5 group-hover:underline"
                style={{ transition: "letter-spacing 0.3s ease" }}
                onMouseEnter={e => (e.currentTarget.style.letterSpacing = "0.2em")}
                onMouseLeave={e => (e.currentTarget.style.letterSpacing = "0.05em")}>{banners.linkText}</p>
            </div>
            {/* Shimmer on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-500"
              style={{ background: "linear-gradient(105deg, transparent 40%, white 50%, transparent 60%)", backgroundSize: "200% 100%", animation: "shimmer 0.8s ease" }} />
          </button>
        ))}
      </section>

      {/* ══════════ PRODUCTS SECTION ══════════ */}
      <section id="products" className="max-w-7xl mx-auto px-6 pb-20">
        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`cat-btn font-body text-[10px] tracking-widest uppercase px-4 py-2 border transition-colors duration-200 ${activeCategory === cat ? "active bg-[#1c2b1e] text-white border-[#1c2b1e]" : "text-[#8c8880] border-[#e8e4dd] hover:text-white"
                  }`}
                style={{ transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)", transitionDelay: `${i * 30}ms` }}>
                <span>{cat === "All" ? productGrid.allTab : cat}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-body text-xs text-[#8c8880]">{filtered.length} {productGrid.countLabel}</span>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="flex md:hidden items-center border border-[#e8e4dd] bg-white px-4 py-2.5 gap-2 mb-6">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8c8880" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder={productGrid.searchPlaceholder} value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 font-body text-xs text-[#1c2b1e] bg-transparent outline-none placeholder-[#8c8880]" />
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24" style={{ animation: "heroLine 0.5s ease both" }}>
            <p className="text-5xl mb-4" style={{ animation: "float 3s ease-in-out infinite" }}>{productGrid.noResultsSymbol}</p>
            <p className="font-body text-[#8c8880]">{productGrid.noResultsText} "{searchQuery}"</p>
            <button onClick={() => setSearchQuery("")}
              className="mt-4 font-body text-xs tracking-widest uppercase border border-[#e8e4dd] px-5 py-2.5 text-[#8c8880] hover:text-[#1c2b1e] hover:border-[#1c2b1e] transition-colors">
              {productGrid.clearSearch}
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item, idx) => (
              <SignatureCard key={item.id} item={item} index={idx}
                onOpenGallery={setGallery}
                onOrder={i => orderProduct({ name: i.name, category: i.category, image: i.image })} />
            ))}
          </div>
        )}
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      {clientStories.length > 0 && (
      <section id="testimonials" ref={testimonialsRef} className="bg-[#f5f0e8] py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14"
            style={{
              opacity: testimonialsVisible ? 1 : 0,
              transform: testimonialsVisible ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}>
            <p className="font-body text-xs tracking-[0.4em] uppercase text-[#7a9e7e] mb-3"
              style={{ animation: testimonialsVisible ? "inkBleed 0.6s ease both" : "none" }}>{reviews.eyebrow}</p>
            <h2 className="font-display text-4xl font-light text-[#1c2b1e]"
              style={{ animation: testimonialsVisible ? "heroLineBlur 0.7s ease 0.1s both" : "none" }}>{reviews.title}</h2>
            <div className="mx-auto mt-4 h-px bg-[#c8a96e]"
              style={{ width: testimonialsVisible ? "48px" : "0px", transition: "width 0.8s cubic-bezier(0.25,0.46,0.45,0.94) 0.3s" }} />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {clientStories.map((t, i) => (
              <div key={i} className="testimonial-card bg-white border border-[#e8e4dd] p-7 rounded-sm"
                style={{
                  animation: testimonialsVisible ? `cardMorph 0.65s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms both` : "none",
                  boxShadow: "0 2px 8px rgba(28,43,30,0.04)",
                }}>
                <p className="font-display text-4xl text-[#c8a96e] leading-none mb-3"
                  style={{ animation: `float ${3 + i * 0.4}s ease-in-out infinite` }}>"</p>
                <p className="font-display text-base font-light italic text-[#1c2b1e] leading-relaxed mb-5">{t.quote}</p>
                <div className="border-t border-[#e8e4dd] pt-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1c2b1e] flex items-center justify-center font-body text-[10px] text-white font-medium flex-shrink-0"
                    style={{ transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1), background 0.3s ease" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.2) rotate(8deg)"; e.currentTarget.style.background = "#7a9e7e"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1) rotate(0)"; e.currentTarget.style.background = "#1c2b1e"; }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-body text-xs font-medium text-[#1c2b1e]">{t.author}</p>
                    <p className="font-body text-[10px] text-[#8c8880]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ══════════ CORPORATE CTA ══════════ */}
      <section ref={ctaRef} className="bg-[#1c2b1e] text-white py-20 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04 }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(45deg, #c8a96e 0, #c8a96e 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
            animation: "shimmer 8s linear infinite",
            backgroundPosition: ctaVisible ? "0 0" : "-100px -100px",
            transition: "background-position 0s",
          }} />
        </div>

        {/* Floating orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="orb-2" style={{ position: "absolute", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,169,110,0.08) 0%, transparent 70%)", top: "-50px", right: "10%" }} />
          <div className="orb-3" style={{ position: "absolute", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(122,158,126,0.08) 0%, transparent 70%)", bottom: "-30px", left: "5%" }} />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="font-body text-xs tracking-[0.5em] uppercase text-[#7a9e7e] mb-5"
            style={{ opacity: ctaVisible ? 1 : 0, animation: ctaVisible ? "inkBleed 0.6s ease 0.1s both" : "none" }}>
            {cta.eyebrow}
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-light italic leading-snug mb-6 cta-float"
            style={{
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.7s ease 0.2s, transform 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s",
            }}>
            {cta.titleLine1}<br />
            <span className="font-display text-4xl md:text-5xl font-light italic leading-snug mb-6 cta-float" >{cta.titleLine2}</span>
          </h2>
          <p className="font-body text-[#c8c4bb] text-sm leading-relaxed mb-10 max-w-lg mx-auto font-light"
            style={{ opacity: ctaVisible ? 1 : 0, transition: "opacity 0.6s ease 0.35s" }}>
            {cta.text}
          </p>
          <div className="flex flex-wrap gap-4 justify-center"
            style={{ opacity: ctaVisible ? 1 : 0, transform: ctaVisible ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.6s ease 0.45s, transform 0.6s cubic-bezier(0.22,1,0.36,1) 0.45s" }}>
            <RippleBtn onClick={() => navigate("/get-proposal")}
              className="font-body text-xs tracking-widest uppercase bg-[#c8a96e] text-[#1c2b1e] px-10 py-4 hover:bg-[#b89558] font-medium">
              {cta.primaryButton}
            </RippleBtn>
            <RippleBtn onClick={() => navigate("/contact")}
              className="font-body text-xs tracking-widest uppercase border border-white/30 text-white px-10 py-4 hover:border-white hover:bg-white/10">
              {cta.secondaryButton}
            </RippleBtn>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Scroll Progress Bar ────────────────────────────────────────────────────
function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "2px", zIndex: 100, background: "transparent" }}>
      <div style={{
        height: "100%",
        width: `${progress}%`,
        background: "linear-gradient(90deg, #7a9e7e, #c8a96e, #b87355)",
        transition: "width 0.1s linear",
        boxShadow: "0 0 8px rgba(200,169,110,0.6)",
      }} />
    </div>
  );
}