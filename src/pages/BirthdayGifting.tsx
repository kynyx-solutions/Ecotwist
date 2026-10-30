import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
  AnimatePresence,
} from 'motion/react';
import type { Variants } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { siteImage } from '../lib/siteImages';
import { clients } from '../lib/clients';
import { asset } from '../lib/content';
import content from '../content/pages/birthday-gifting.json';

// Page words and photos: src/content/pages/birthday-gifting.json (admin → Pages → Birthday Gifting)
const { hero, about, categories, products, customization, why, trust, cta } = content;

function useTilt(strength = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const cfg = { stiffness: 200, damping: 22, mass: 0.6 };
  const springX = useSpring(rotateX, cfg);
  const springY = useSpring(rotateY, cfg);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    rotateY.set(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength);
    rotateX.set(-((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength);
  }, [strength, rotateX, rotateY]);
  const onMouseLeave = useCallback(() => { rotateX.set(0); rotateY.set(0); }, [rotateX, rotateY]);
  return { ref, springX, springY, onMouseMove, onMouseLeave };
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const ACCENT = '#d4856a';
const ACCENT_DARK = '#1f1410';
const ACCENT_BG = '#fdf6f3';

const vFadeUp: Variants = { hidden: { opacity: 0, y: 44 }, show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } } };
const vStagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.13 } } };
const vScaleIn: Variants = { hidden: { opacity: 0, scale: 0.6, rotateX: -55 }, show: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.95, ease: EASE } } };
const vSlideLeft: Variants = { hidden: { opacity: 0, x: -48 }, show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } } };
const vSlideRight: Variants = { hidden: { opacity: 0, x: 48 }, show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } } };

/* ═══════════════════════════════════════════════════════
   BIRTHDAY CANVAS
═══════════════════════════════════════════════════════ */
const BirthdayCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;

    const onResize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    window.addEventListener('resize', onResize);

    const section = canvas.parentElement!;
    const onMove = (e: MouseEvent) => { const r = section.getBoundingClientRect(); mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseleave', onLeave);

    const CORAL = ['#d4856a', '#e8a088', '#f0b8a0', '#c4735d', '#b85c48'];
    const GOLD  = ['#FFD700', '#FFC84B', '#E8C882', '#C9A96E', '#FFB347'];
    const PINK  = ['#f9a8d4', '#fb7185', '#fda4af', '#f472b6', '#ff90b0'];
    const BLUE  = ['#6aa6ff', '#7bc4ff', '#5fa2ff', '#8cd3ff'];
    const PURP  = ['#b388ff', '#c59cff', '#9f7aea'];
    const ALL   = [...CORAL, ...GOLD, ...PINK, ...BLUE, ...PURP];

    const rand = (a: number, b: number) => Math.random() * (b - a) + a;
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const REPULSE   = 165;
    const REPULSE_F = 1.45;
    const MAX_BALLOONS = 18;

    /* ── helpers ── */
    function applyRepulse<T extends { x: number; y: number; vx: number; vy: number }>(o: T, mx: number, my: number, f = 1) {
      const dx = o.x - mx, dy = o.y - my, d = Math.hypot(dx, dy);
      if (d < REPULSE && d > 0) { const frc = (REPULSE - d) / REPULSE; o.vx += (dx / d) * frc * REPULSE_F * f; o.vy += (dy / d) * frc * REPULSE_F * f; }
    }
    function wrapEdge<T extends { x: number; y: number }>(o: T, m = 20) {
      if (o.x < -m) o.x = W + m; if (o.x > W + m) o.x = -m;
      if (o.y < -m) o.y = H + m; if (o.y > H + m) o.y = -m;
    }
    type Drifter = { x: number; y: number; vx: number; vy: number; driftX: number; driftY: number; rot: number; rotSpd: number; pulse: number };
    function movObj(o: Drifter, mx: number, my: number, maxSpd = 2.5) {
      o.pulse += 0.03; o.rot += o.rotSpd;
      applyRepulse(o, mx, my, 0.7);
      o.vx += (o.driftX - o.vx) * 0.04; o.vy += (o.driftY - o.vy) * 0.04;
      const s = Math.hypot(o.vx, o.vy); if (s > maxSpd) { o.vx = (o.vx / s) * maxSpd; o.vy = (o.vy / s) * maxSpd; }
      o.x += o.vx; o.y += o.vy; wrapEdge(o);
    }

    /* ─── interfaces ─── */
    type SpawnSide = 'top' | 'right' | 'bottom' | 'left';

    interface Balloon { id: number; x: number; y: number; vx: number; vy: number; driftX: number; driftY: number; rx: number; ry: number; rot: number; rotSpd: number; col: string; pulse: number; alpha: number; stringPhase: number; stringLen: number; side: SpawnSide; hover: number; scale: number; }
    interface BlastParticle { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number; shape: 'circle' | 'star' | 'heart' | 'confetti'; rot: number; rotSpd: number; }
    interface BlastRing { x: number; y: number; r: number; maxR: number; life: number; col: string; }
    interface Spark { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number; }
    interface Star4 { x: number; y: number; vx: number; vy: number; driftX: number; driftY: number; r: number; rot: number; rotSpd: number; col: string; pulse: number; twinkle: number; twSpd: number; }
    interface GiftBox extends Drifter { size: number; bodyCol: string; lidCol: string; ribbonCol: string; bowCol: string; alpha: number; }
    interface Heart extends Drifter { size: number; col: string; alpha: number; }
    interface Ribbon extends Drifter { size: number; col: string; alpha: number; }
    interface Cake extends Drifter { size: number; col: string; frostCol: string; alpha: number; candleFlicker: number; }
    interface NetPt { x: number; y: number; vx: number; vy: number; driftX: number; driftY: number; pulse: number; col: string; }
    interface ConfettiP { x: number; y: number; vx: number; vy: number; size: number; col: string; rot: number; rotSpd: number; isCircle: boolean; alpha: number; wobble: number; wobbleSpd: number; }

    /* ─── collections ─── */
    const BALLOONS:    Balloon[]     = [];
    const BLASTS:      BlastParticle[] = [];
    const BLAST_RINGS: BlastRing[]   = [];
    const SPARKS:      Spark[]       = [];

    const mk = (spd = 0.25) => { const a = rand(0, Math.PI * 2), s = rand(0.05, spd); return { vx: Math.cos(a) * s, vy: Math.sin(a) * s, driftX: Math.cos(a) * s, driftY: Math.sin(a) * s }; };

    const STARS: Star4[] = Array.from({ length: 24 }, () => {
      const d = mk(0.35); return { x: rand(0, W), y: rand(0, H), ...d, r: rand(4, 12), rot: rand(0, Math.PI * 2), rotSpd: rand(-0.015, 0.015), col: pick([...GOLD, ...CORAL, ...PINK, '#fff']), pulse: rand(0, Math.PI * 2), twinkle: rand(0, Math.PI * 2), twSpd: rand(0.03, 0.09) };
    });

    const BOXES: GiftBox[] = Array.from({ length: 8 }, () => {
      const d = mk(0.25); return { x: rand(0, W), y: rand(0, H), ...d, rot: rand(0, Math.PI * 2), rotSpd: rand(-0.006, 0.006), pulse: rand(0, Math.PI * 2), size: rand(18, 36), bodyCol: pick(CORAL), lidCol: pick(GOLD), ribbonCol: pick(PINK), bowCol: pick(GOLD), alpha: rand(0.24, 0.55) };
    });

    const HEARTS: Heart[] = Array.from({ length: 12 }, () => {
      const d = mk(0.4); return { x: rand(0, W), y: rand(0, H), ...d, rot: rand(-0.3, 0.3), rotSpd: rand(-0.008, 0.008), pulse: rand(0, Math.PI * 2), size: rand(8, 20), col: pick(PINK), alpha: rand(0.3, 0.7) };
    });

    const RIBBONS: Ribbon[] = Array.from({ length: 12 }, () => {
      const d = mk(0.35); return { x: rand(0, W), y: rand(0, H), ...d, rot: rand(0, Math.PI * 2), rotSpd: rand(-0.01, 0.01), pulse: rand(0, Math.PI * 2), size: rand(12, 28), col: pick([...PINK, ...CORAL]), alpha: rand(0.3, 0.65) };
    });

    const CAKES: Cake[] = Array.from({ length: 6 }, () => {
      const d = mk(0.3); return { x: rand(0, W), y: rand(0, H), ...d, rot: rand(-0.15, 0.15), rotSpd: rand(-0.005, 0.005), pulse: rand(0, Math.PI * 2), size: rand(16, 32), col: pick(CORAL), frostCol: pick(GOLD), alpha: rand(0.35, 0.7), candleFlicker: rand(0, Math.PI * 2) };
    });

    const NETS: NetPt[] = Array.from({ length: 55 }, () => {
      const d = mk(0.35); return { x: rand(0, W), y: rand(0, H), ...d, pulse: rand(0, Math.PI * 2), col: pick([...CORAL, ...GOLD]) };
    });

    const CONFETTI: ConfettiP[] = Array.from({ length: 45 }, () => ({
      x: rand(0, W), y: rand(-600, 0), vx: rand(-0.5, 0.5), vy: rand(0.4, 1.2),
      size: rand(4, 8), col: pick(ALL), rot: rand(0, Math.PI * 2), rotSpd: rand(-0.08, 0.08),
      isCircle: Math.random() > 0.5, alpha: rand(0.25, 0.5), wobble: rand(0, Math.PI * 2), wobbleSpd: rand(0.02, 0.04),
    }));

    const SILK = Array.from({ length: 7 }, (_, i) => ({ yBase: 0.08 + i * 0.14, phase: rand(0, Math.PI * 2), speed: rand(0.004, 0.012), amp: rand(10, 28), freq: rand(0.008, 0.018), col: pick(ALL), width: rand(0.5, 1.6), alpha: rand(0.025, 0.07) }));

    let balloonId = 0, spawnTimer = 0, sparkTimer = 0, flash = 0, frame = 0;

    /* ─── spawn helpers ─── */
    function getSpawnSide(): SpawnSide {
      const r = Math.random();
      if (r < 0.36) return 'bottom';
      if (r < 0.58) return 'left';
      if (r < 0.80) return 'right';
      return 'top';
    }

    function createBalloon(side: SpawnSide = getSpawnSide(), seedInside = false): Balloon {
      const rx = rand(16, 30), ry = rand(20, 38);
      const col = pick([...PINK, ...CORAL, ...GOLD, ...BLUE, ...PURP]);
      let x = 0, y = 0, vx = 0, vy = 0;
      if (seedInside) {
        x = rand(60, W - 60); y = rand(60, H - 80); vx = rand(-0.25, 0.25); vy = rand(-0.2, 0.2);
      } else if (side === 'top') {
        x = rand(40, W - 40); y = -ry * 3; vx = rand(-0.25, 0.25); vy = rand(0.18, 0.55);
      } else if (side === 'bottom') {
        x = rand(40, W - 40); y = H + ry * 3; vx = rand(-0.25, 0.25); vy = -rand(0.35, 0.9);
      } else if (side === 'left') {
        x = -rx * 3; y = rand(60, H - 60); vx = rand(0.35, 0.95); vy = rand(-0.18, 0.18);
      } else {
        x = W + rx * 3; y = rand(60, H - 60); vx = -rand(0.35, 0.95); vy = rand(-0.18, 0.18);
      }
      return { id: balloonId++, x, y, vx, vy, driftX: vx * 0.65, driftY: vy * 0.65, rx, ry, rot: rand(-0.2, 0.2), rotSpd: rand(-0.004, 0.004), col, pulse: rand(0, Math.PI * 2), alpha: rand(0.5, 0.88), stringPhase: rand(0, Math.PI * 2), stringLen: rand(28, 48), side, hover: 0, scale: 1 };
    }

    function seedBalloons() {
      BALLOONS.length = 0;
      for (let i = 0; i < 12; i++) BALLOONS.push(createBalloon(getSpawnSide(), true));
      for (let i = 0; i < 4; i++)  BALLOONS.push(createBalloon(getSpawnSide(), false));
    }
    seedBalloons();

    function spawnSpark(sx: number, sy: number, count = 6) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3.5;
        SPARKS.push({ x: sx, y: sy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col: pick(ALL), r: 1.5 + Math.random() * 2.5 });
      }
    }

    function spawnBlast(x: number, y: number, col: string) {
      for (let i = 0; i < 42; i++) {
        const ang = rand(0, Math.PI * 2), spd = rand(1.8, 6.2);
        const shapes: BlastParticle['shape'][] = ['circle', 'star', 'heart', 'confetti'];
        BLASTS.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - rand(0.8, 2.4), life: 1, col: Math.random() > 0.45 ? col : pick(ALL), r: rand(2, 7), shape: pick(shapes), rot: rand(0, Math.PI * 2), rotSpd: rand(-0.18, 0.18) });
      }
      for (let i = 0; i < 4; i++) BLAST_RINGS.push({ x, y, r: i * 10, maxR: 65 + i * 32, life: 1, col });
      flash = 0.55;
    }

    function hitTestBalloon(b: Balloon, px: number, py: number) {
      const dx = px - b.x, dy = py - b.y;
      const cos = Math.cos(-b.rot), sin = Math.sin(-b.rot);
      const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
      const rx = b.rx * b.scale * 1.1, ry = b.ry * b.scale * 1.1;
      return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1;
    }

    /* ─── draw functions ─── */
    function drawStar4(s: Star4, mx: number, my: number) {
      const near = mx > -999 && Math.hypot(s.x - mx, s.y - my) < 150;
      const r = s.r * (0.85 + Math.sin(s.pulse) * 0.18);
      const al = near ? 1 : (0.3 + Math.sin(s.twinkle) * 0.55);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 18; ctx.shadowColor = s.col; }
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rad = i % 2 === 0 ? r : r * 0.35; i === 0 ? ctx.moveTo(rad * Math.cos(a), rad * Math.sin(a)) : ctx.lineTo(rad * Math.cos(a), rad * Math.sin(a)); }
      ctx.closePath(); ctx.fillStyle = near ? '#fff' : s.col; ctx.fill();
      ctx.globalAlpha = al * 0.6; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawBox(b: GiftBox, mx: number, my: number) {
      const s = b.size * (0.9 + Math.sin(b.pulse) * 0.08);
      const near = mx > -999 && Math.hypot(b.x - mx, b.y - my) < 160;
      const al = near ? Math.min(1, b.alpha * 1.7) : b.alpha;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.globalAlpha = al;
      ctx.fillStyle = b.bodyCol; ctx.beginPath(); ctx.roundRect(-s / 2, 0, s, s * 0.72, 4); ctx.fill();
      ctx.fillStyle = b.lidCol; ctx.beginPath(); ctx.roundRect(-s / 2 - 3, -s * 0.2, s + 6, s * 0.24, 3); ctx.fill();
      ctx.fillStyle = b.ribbonCol; ctx.fillRect(-s * 0.1, -s * 0.2, s * 0.2, s * 0.92); ctx.fillRect(-s / 2, s * 0.18, s, s * 0.18);
      ctx.strokeStyle = b.bowCol; ctx.lineWidth = near ? 2.5 : 1.5;
      ctx.beginPath(); ctx.ellipse(-s * 0.28, -s * 0.28, s * 0.22, s * 0.14, -0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * 0.28, -s * 0.28, s * 0.22, s * 0.14, 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = b.bowCol; ctx.beginPath(); ctx.arc(0, -s * 0.22, s * 0.07, 0, Math.PI * 2); ctx.fill();
      if (near) { ctx.shadowBlur = 22; ctx.shadowColor = b.bodyCol; ctx.strokeStyle = b.bodyCol; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(-s / 2 - 3, -s * 0.2, s + 6, s * 0.92, 4); ctx.stroke(); ctx.shadowBlur = 0; }
      ctx.restore();
    }

    function drawHeart(h: Heart, mx: number, my: number) {
      const s = h.size * (0.88 + Math.sin(h.pulse) * 0.14);
      const near = mx > -999 && Math.hypot(h.x - mx, h.y - my) < 150;
      const al = near ? Math.min(1, h.alpha * 1.9) : h.alpha;
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 16; ctx.shadowColor = h.col; }
      ctx.fillStyle = near ? '#ff90b0' : h.col; ctx.beginPath();
      ctx.moveTo(0, s * 0.3); ctx.bezierCurveTo(-s * 0.5, -s * 0.1, -s, -s * 0.3, 0, s * 1.0);
      ctx.bezierCurveTo(s, -s * 0.3, s * 0.5, -s * 0.1, 0, s * 0.3); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = al * 0.35; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-s * 0.22, -s * 0.08, s * 0.14, s * 0.08, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawRibbon(rb: Ribbon, mx: number, my: number) {
      const s = rb.size * (0.9 + Math.sin(rb.pulse) * 0.1);
      const near = mx > -999 && Math.hypot(rb.x - mx, rb.y - my) < 150;
      const al = near ? Math.min(1, rb.alpha * 1.8) : rb.alpha;
      ctx.save(); ctx.translate(rb.x, rb.y); ctx.rotate(rb.rot); ctx.globalAlpha = al;
      ctx.strokeStyle = rb.col; ctx.lineWidth = near ? 2 : 1.2;
      if (near) { ctx.shadowBlur = 14; ctx.shadowColor = rb.col; }
      ctx.beginPath(); ctx.ellipse(-s * 0.55, -s * 0.15, s * 0.5, s * 0.28, -0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * 0.55, -s * 0.15, s * 0.5, s * 0.28, 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.1, 0); ctx.lineTo(-s * 0.55, s * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.1, 0); ctx.lineTo(s * 0.55, s * 0.7); ctx.stroke();
      ctx.fillStyle = rb.col; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.16, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawCake(c: Cake, mx: number, my: number) {
      const s = c.size * (0.9 + Math.sin(c.pulse) * 0.08);
      const near = mx > -999 && Math.hypot(c.x - mx, c.y - my) < 150;
      const al = near ? Math.min(1, c.alpha * 1.7) : c.alpha;
      c.candleFlicker += 0.12;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 18; ctx.shadowColor = c.col; }
      ctx.fillStyle = c.col; ctx.beginPath();
      ctx.moveTo(-s * 0.5, 0); ctx.lineTo(-s * 0.35, s * 0.7); ctx.lineTo(s * 0.35, s * 0.7); ctx.lineTo(s * 0.5, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.frostCol; ctx.beginPath();
      ctx.moveTo(-s * 0.55, 0); ctx.quadraticCurveTo(-s * 0.3, -s * 0.4, 0, -s * 0.35); ctx.quadraticCurveTo(s * 0.3, -s * 0.3, s * 0.55, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-1.5, -s * 0.35, 3, -s * 0.25);
      const fx = Math.sin(c.candleFlicker) * 1.5, fy = -s * 0.6;
      ctx.fillStyle = 'rgba(255,200,80,0.8)'; ctx.beginPath();
      ctx.moveTo(fx, fy - s * 0.12); ctx.bezierCurveTo(fx - 3, fy - s * 0.05, fx - 3, fy + s * 0.04, fx, fy + s * 0.05);
      ctx.bezierCurveTo(fx + 3, fy + s * 0.04, fx + 3, fy - s * 0.05, fx, fy - s * 0.12); ctx.fill();
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, s * 0.15);
      fg.addColorStop(0, 'rgba(255,220,100,0.9)'); fg.addColorStop(1, 'transparent');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx, fy, s * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawBalloon(b: Balloon, mx: number, my: number) {
      applyRepulse(b, mx, my, 0.55);
      b.pulse += 0.028; b.stringPhase += 0.028; b.rot += b.rotSpd;
      b.vx += (b.driftX - b.vx) * 0.012; b.vy += (b.driftY - b.vy) * 0.012;
      const spd = Math.hypot(b.vx, b.vy); if (spd > 1.8) { b.vx = (b.vx / spd) * 1.8; b.vy = (b.vy / spd) * 1.8; }
      b.x += b.vx + Math.sin(b.stringPhase) * 0.22;
      b.y += b.vy + Math.cos(b.stringPhase * 0.8) * 0.08;
      if (b.x < -140 || b.x > W + 140 || b.y < -140 || b.y > H + 140) Object.assign(b, createBalloon(getSpawnSide(), false));
      const near = mx > -999 && hitTestBalloon(b, mx, my);
      b.hover += ((near ? 1 : 0) - b.hover) * 0.14;
      b.scale = 1 + Math.sin(b.pulse) * 0.04 + b.hover * 0.08;
      const al = Math.min(1, b.alpha + b.hover * 0.25);
      const rx = b.rx * b.scale, ry = b.ry * b.scale;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 24; ctx.shadowColor = b.col; }
      ctx.strokeStyle = `${b.col}88`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(Math.sin(b.stringPhase) * 8, ry + 20, 0, ry + b.stringLen); ctx.stroke();
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry) * 1.8);
      glow.addColorStop(0, `${b.col}22`); glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, Math.max(rx, ry) * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = al * 0.42; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-rx * 0.26, -ry * 0.28, rx * 0.28, ry * 0.18, -0.45, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = al; ctx.fillStyle = b.col;
      ctx.beginPath(); ctx.ellipse(0, ry, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawBlastEffects() {
      for (let i = BLAST_RINGS.length - 1; i >= 0; i--) {
        const br = BLAST_RINGS[i]; br.r += (br.maxR - br.r) * 0.08 + 1.4; br.life -= 0.024;
        if (br.life <= 0) { BLAST_RINGS.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(255,255,255,${br.life * 0.42})`; ctx.lineWidth = 2.6 * br.life;
        ctx.beginPath(); ctx.arc(br.x, br.y, br.r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = br.life * 0.18; ctx.strokeStyle = br.col; ctx.lineWidth = 1.4 * br.life;
        ctx.beginPath(); ctx.arc(br.x, br.y, br.r * 0.68, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      for (let i = BLASTS.length - 1; i >= 0; i--) {
        const p = BLASTS[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.11; p.vx *= 0.985; p.rot += p.rotSpd; p.life -= 0.02;
        if (p.life <= 0) { BLASTS.splice(i, 1); continue; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.life;
        const s = p.r * p.life;
        if (p.shape === 'circle') { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); }
        else if (p.shape === 'star') {
          ctx.fillStyle = p.col; ctx.beginPath();
          for (let j = 0; j < 10; j++) { const a = (j * Math.PI) / 5 - Math.PI / 2, rr = j % 2 === 0 ? s : s * 0.42; j === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          ctx.closePath(); ctx.fill();
        } else if (p.shape === 'heart') {
          ctx.fillStyle = p.col; ctx.beginPath();
          ctx.moveTo(0, s * 0.22); ctx.bezierCurveTo(-s * 0.45, -s * 0.08, -s * 0.85, -s * 0.25, 0, s * 0.85);
          ctx.bezierCurveTo(s * 0.85, -s * 0.25, s * 0.45, -s * 0.08, 0, s * 0.22); ctx.closePath(); ctx.fill();
        } else {
          ctx.fillStyle = p.col; ctx.fillRect(-s * 0.7, -s * 0.35, s * 1.4, s * 0.7);
          ctx.globalAlpha = p.life * 0.28; ctx.fillStyle = '#fff'; ctx.fillRect(-s * 0.7, -s * 0.35, s * 0.35, s * 0.7);
        }
        if (p.life > 0.55) {
          const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.4);
          glow.addColorStop(0, `${p.col}55`); glow.addColorStop(1, 'transparent');
          ctx.globalAlpha = (p.life - 0.55) * 1.8; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, s * 2.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }

    /* ─── click handler ─── */
    const onClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      for (let i = BALLOONS.length - 1; i >= 0; i--) {
        const b = BALLOONS[i];
        if (hitTestBalloon(b, cx, cy)) {
          spawnBlast(b.x, b.y, b.col);
          BALLOONS.splice(i, 1);
          while (BALLOONS.length < MAX_BALLOONS) BALLOONS.push(createBalloon(getSpawnSide(), false));
          return;
        }
      }
      spawnSpark(cx, cy, 6);
    };
    canvas.addEventListener('click', onClick);

    /* ─── main loop ─── */
    function loop() {
      const { x: mx, y: my } = mouseRef.current;
      frame++;
      ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1;

      const bg = ctx.createLinearGradient(0, 0, W * 0.5, H);
      bg.addColorStop(0, '#1a0e08'); bg.addColorStop(0.45, '#2d1a10'); bg.addColorStop(1, '#1a0a04');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      const cg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.55);
      cg.addColorStop(0, 'rgba(212,133,106,0.08)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

      if (flash > 0) { ctx.fillStyle = `rgba(255,240,220,${flash})`; ctx.fillRect(0, 0, W, H); flash -= 0.03; }

      // Silk
      SILK.forEach(r => {
        r.phase += r.speed; ctx.save(); ctx.globalAlpha = r.alpha; ctx.beginPath();
        for (let x = 0; x <= W; x += 4) { const y = r.yBase * H + r.amp * Math.sin(x * r.freq + r.phase) + r.amp * 0.4 * Math.sin(x * r.freq * 2 + r.phase * 1.3); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.strokeStyle = r.col; ctx.lineWidth = r.width * 2.5; ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = r.width * 0.35; ctx.globalAlpha = r.alpha * 0.35; ctx.stroke(); ctx.restore();
      });

      // Network
      NETS.forEach(n => {
        n.pulse += 0.03;
        if (mx > -999) { const dx = n.x - mx, dy = n.y - my, d = Math.hypot(dx, dy); if (d < 140 && d > 0) { const f = (140 - d) / 140; n.vx += (dx / d) * f * 1.5; n.vy += (dy / d) * f * 1.5; } }
        n.vx += (n.driftX - n.vx) * 0.04; n.vy += (n.driftY - n.vy) * 0.04;
        const spd = Math.hypot(n.vx, n.vy); if (spd > 3) { n.vx = (n.vx / spd) * 3; n.vy = (n.vy / spd) * 3; }
        n.x += n.vx; n.y += n.vy;
        if (n.x < -10) n.x = W + 10; if (n.x > W + 10) n.x = -10;
        if (n.y < -10) n.y = H + 10; if (n.y > H + 10) n.y = -10;
      });
      for (let i = 0; i < NETS.length; i++) for (let j = i + 1; j < NETS.length; j++) {
        const a = NETS[i], b = NETS[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 100) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(212,133,106,${(1 - d / 100) * 0.15})`; ctx.lineWidth = 0.5; ctx.stroke(); }
      }
      NETS.forEach(n => { const pr = 2 + Math.sin(n.pulse) * 0.5; ctx.beginPath(); ctx.arc(n.x, n.y, pr, 0, Math.PI * 2); ctx.fillStyle = n.col; ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1; });

      // Shapes
      BOXES.forEach(b => { movObj(b, mx, my, 2); drawBox(b, mx, my); });

      // Balloons — spawn continuously
      spawnTimer++;
      if (BALLOONS.length < MAX_BALLOONS && spawnTimer > 12) { spawnTimer = 0; BALLOONS.push(createBalloon(getSpawnSide(), false)); }
      let hovered = false;
      BALLOONS.forEach(b => { drawBalloon(b, mx, my); if (!hovered && mx > -999 && hitTestBalloon(b, mx, my)) hovered = true; });
      if (canvas) canvas.style.cursor = hovered ? 'pointer' : 'default';

      STARS.forEach(s => {
        s.pulse += 0.04; s.twinkle += s.twSpd; s.rot += s.rotSpd;
        applyRepulse(s, mx, my, 0.8);
        s.vx += (s.driftX - s.vx) * 0.04; s.vy += (s.driftY - s.vy) * 0.04;
        const spd = Math.hypot(s.vx, s.vy); if (spd > 3) { s.vx = (s.vx / spd) * 3; s.vy = (s.vy / spd) * 3; }
        s.x += s.vx; s.y += s.vy; wrapEdge(s); drawStar4(s, mx, my);
      });

      RIBBONS.forEach(r => { movObj(r, mx, my, 2); drawRibbon(r, mx, my); });
      HEARTS.forEach(h => { movObj(h, mx, my, 2); drawHeart(h, mx, my); });
      CAKES.forEach(c => { movObj(c, mx, my, 1.5); drawCake(c, mx, my); });

      // Confetti
      CONFETTI.forEach(c => {
        c.wobble += c.wobbleSpd; c.x += c.vx + Math.sin(c.wobble) * 0.5; c.y += c.vy; c.vy += 0.012; c.vx *= 0.99; c.rot += c.rotSpd; c.alpha -= 0.0005;
        if (c.alpha <= 0 || c.y > H + 20) { c.x = rand(0, W); c.y = -15; c.vy = rand(0.4, 1.2); c.alpha = rand(0.25, 0.5); c.col = pick(ALL); }
        ctx.save(); ctx.globalAlpha = c.alpha; ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.fillStyle = c.col;
        if (c.isCircle) { ctx.beginPath(); ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillRect(-c.size * 0.7, -c.size * 0.35, c.size * 1.4, c.size * 0.7); }
        ctx.restore();
      });

      // Blast effects
      drawBlastEffects();

      // Sparks
      sparkTimer++;
      if (sparkTimer > 55 + Math.floor(Math.random() * 30)) { sparkTimer = 0; spawnSpark(Math.random() * W, Math.random() * H, 8); }
      if (mx > -999 && frame % 8 === 0) spawnSpark(mx, my, 4);
      ctx.save();
      for (let i = SPARKS.length - 1; i >= 0; i--) {
        const s = SPARKS[i]; s.x += s.vx; s.y += s.vy; s.vy -= 0.05; s.life -= 0.07;
        if (s.life <= 0) { SPARKS.splice(i, 1); continue; }
        ctx.globalAlpha = s.life; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2); ctx.fillStyle = s.col; ctx.fill();
      }
      ctx.restore();

      // Mouse glow
      if (mx > -9999) {
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 130);
        mg.addColorStop(0, 'rgba(212,133,106,0.12)'); mg.addColorStop(0.5, 'rgba(255,200,120,0.05)'); mg.addColorStop(1, 'transparent');
        ctx.globalAlpha = 1; ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
      }

      animRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      section.removeEventListener('mousemove', onMove);
      section.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', zIndex: 1, pointerEvents: 'auto' }}
    />
  );
};

/* ═══════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════ */
const PRODUCTS = products.items.map(p => ({ name: p.name, sub: p.sub, tag: p.tag, img: asset(p.image) }));
// An uploaded photo wins; otherwise the photo set under "Photos to add"
const CATEGORIES = categories.items.map(c => ({ name: c.name, desc: c.desc, accent: c.accent, tag: c.tag, img: c.image ? asset(c.image) : siteImage(c.photoId ?? '') }));
const CUSTOM_ITEMS = customization.items.map(c => ({ icon: c.symbol, title: c.title, desc: c.desc }));
const WHY = why.items.map(w => ({ icon: w.symbol, title: w.title, desc: w.desc }));

function useNavigateTo() { return useCallback((path: string) => { window.location.href = path; }, []); }

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════ */
function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.6, ease: EASE }} className="flex flex-col">
      <span className="font-serif text-white" style={{ fontSize: 'clamp(1.4rem,2.2vw,2rem)', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</span>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, marginTop: 4 }}>{label}</span>
    </motion.div>
  );
}

function CategoryCard({ item }: { item: typeof CATEGORIES[0] }) {
  const [hovered, setHovered] = useState(false);
  const { ref, springX, springY, onMouseMove, onMouseLeave } = useTilt(12);
  return (
    <motion.div variants={vScaleIn} style={{ perspective: '1400px', transformStyle: 'preserve-3d' }} className="cursor-pointer">
      <motion.div ref={ref} onMouseMove={onMouseMove} onMouseLeave={() => { onMouseLeave(); setHovered(false); }} onMouseEnter={() => setHovered(true)}
        style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', willChange: 'transform', boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.12)' : '0 2px 10px rgba(0,0,0,0.06)', transition: 'box-shadow 0.4s', borderRadius: 16, overflow: 'hidden', background: 'white' }}>
        <div style={{ height: 280, overflow: 'hidden', position: 'relative' }}>
          <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover" animate={{ scale: hovered ? 1.07 : 1 }} transition={{ duration: 0.75, ease: EASE }} style={{ willChange: 'transform' }} />
          <motion.div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: item.accent }} animate={{ opacity: hovered ? 0.16 : 0 }} transition={{ duration: 0.4 }} />
          <motion.span animate={{ y: hovered ? 0 : -24, opacity: hovered ? 1 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }} className="absolute top-4 left-4 text-[9px] uppercase tracking-[0.18em] font-bold text-white px-3 py-1 rounded-sm" style={{ backgroundColor: item.accent }}>{item.tag}</motion.span>
        </div>
        <div className="p-7 relative overflow-hidden">
          <motion.div className="absolute bottom-0 left-0 h-[3px]" style={{ backgroundColor: item.accent }} animate={{ width: hovered ? '100%' : '0%' }} transition={{ duration: 0.45, ease: EASE }} />
          <h3 className="font-serif text-2xl mb-2" style={{ color: ACCENT_DARK }}>{item.name}</h3>
          <p className="text-sm font-light leading-relaxed mb-5" style={{ color: '#73736e' }}>{item.desc}</p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT_DARK }}>
            <motion.span animate={{ x: hovered ? 3 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>{categories.linkText}</motion.span>
            <motion.span animate={{ rotate: hovered ? 45 : 0, x: hovered ? 2 : 0 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }} style={{ display: 'inline-flex' }}><ArrowRight size={11} /></motion.span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductCard({ item, index }: { item: typeof PRODUCTS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 44 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 44 }} transition={{ duration: 0.7, delay: index * 0.12, ease: EASE }} onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)} className="cursor-pointer" style={{ minWidth: 360, scrollSnapAlign: 'start' }}>
      <div className="relative overflow-hidden mb-4" style={{ aspectRatio: '1', borderRadius: 16 }}>
        <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover" animate={{ scale: hovered ? 1.06 : 1 }} transition={{ duration: 0.65, ease: EASE }} style={{ willChange: 'transform' }} />
        <span className="absolute top-4 left-4 text-[10px] font-bold uppercase text-white px-4 py-1 rounded-full" style={{ background: 'rgba(212,133,106,0.85)', backdropFilter: 'blur(6px)', letterSpacing: 2 }}>{item.tag}</span>
      </div>
      <h4 className="font-serif text-xl mb-1" style={{ color: ACCENT_DARK }}>{item.name}</h4>
      <p className="text-sm font-light" style={{ color: ACCENT }}>{item.sub}</p>
    </motion.div>
  );
}

function WhyCard({ item, index }: { item: typeof WHY[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.3 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 36 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }} transition={{ duration: 0.7, delay: index * 0.1, ease: EASE }} onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)} className="text-center p-6 cursor-pointer">
      <motion.div className="flex items-center justify-center mx-auto mb-5 rounded-full text-3xl" style={{ width: 64, height: 64 }} animate={{ background: hovered ? ACCENT : '#f3ede9', color: hovered ? 'white' : ACCENT_DARK }} transition={{ duration: 0.3 }}>{item.icon}</motion.div>
      <h4 className="font-bold text-xs uppercase tracking-widest mb-2">{item.title}</h4>
      <p className="text-xs font-light leading-relaxed" style={{ color: '#73736e' }}>{item.desc}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function BirthdayGifting() {
  const navigateTo = useNavigateTo();
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const springTxt = useSpring(textY, { stiffness: 80, damping: 25 });

  const { ref: aRef, springX: aX, springY: aY, onMouseMove: aMM, onMouseLeave: aML } = useTilt(6);
  const aboutRef = useRef<HTMLElement>(null);
  const catRef = useRef<HTMLElement>(null);
  const custRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const aboutInView = useInView(aboutRef, { once: false, amount: 0.2 });
  const catInView = useInView(catRef, { once: false, amount: 0.15 });
  const custInView = useInView(custRef, { once: false, amount: 0.15 });
  const ctaInView = useInView(ctaRef, { once: false, amount: 0.3 });
  const [ctaHovered, setCtaHovered] = useState(false);

  const words = hero.rotatingWords;
  const [wIdx, setWIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setWIdx(p => (p + 1) % words.length), 2600); return () => clearInterval(t); }, []);

  return (
    <div className="overflow-x-hidden" style={{ background: ACCENT_BG, fontFamily: 'inherit' }}>

      {/* ══ HERO ══ */}
      <section ref={heroRef} className="relative overflow-hidden" style={{ minHeight: '100vh', background: '#1a0e08' }}>

        {/* ✅ BirthdayCanvas component — canvasRef is INSIDE the component */}
        <BirthdayCanvas />

        {[...Array(5)].map((_, i) => (
          <motion.div key={i} style={{ position: 'absolute', width: '100%', height: 1, top: `${18 + i * 15}%`, transform: `rotate(${-14 + i * 1.8}deg)`, background: 'linear-gradient(90deg,transparent,rgba(212,133,106,0.14),transparent)', zIndex: 2, pointerEvents: 'none' }}
            initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 2, delay: 0.5 + i * 0.12 }} />
        ))}

        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(100deg, rgba(15,8,4,0.82) 0%, rgba(15,8,4,0.55) 35%, rgba(15,8,4,0.12) 60%, transparent 100%)', zIndex: 3 }} />
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 160, background: 'linear-gradient(to top, rgba(31,20,16,0.65) 0%, transparent 100%)', zIndex: 3 }} />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6, duration: 1.2 }} className="absolute top-7 right-10 pointer-events-none flex items-center gap-2" style={{ zIndex: 10 }}>
          <motion.span animate={{ scale: [1, 1.4, 1], opacity: [0.35, 1, 0.35] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: '0.9rem' }}>🎈</motion.span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 700 }}>{hero.popHint}</span>
        </motion.div>

        <motion.div style={{ y: springTxt, opacity: heroOpacity, willChange: 'transform', position: 'relative', zIndex: 10 }} className="w-full pointer-events-none">
          <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 pt-28 md:pt-32 pb-16 min-h-screen flex flex-col justify-center">
            <div className="max-w-xl lg:max-w-2xl">

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.08, ease: EASE }} className="flex items-center gap-3 mb-7">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(212,133,106,0.15)', border: '1px solid rgba(212,133,106,0.35)', borderRadius: 100, padding: '5px 14px 5px 10px', backdropFilter: 'blur(8px)' }}>
                  <motion.span animate={{ rotate: [0, 12, -7, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: '0.78rem' }}>🎂</motion.span>
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: 'rgba(255,255,255,0.60)' }}>{hero.eyebrow}</span>
                </span>
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.45, ease: EASE }} style={{ height: 1, flex: 1, maxWidth: 48, background: 'linear-gradient(to right,#b5a26a,transparent)', originX: 0 }} />
              </motion.div>

              <div style={{ height: 22, overflow: 'hidden', marginBottom: 12 }}>
                <AnimatePresence mode="wait">
                  <motion.p key={wIdx} initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -22, opacity: 0 }} transition={{ duration: 0.42, ease: EASE }} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.44em', fontWeight: 800, color: ACCENT }}>— {words[wIdx]} {hero.rotatingSuffix} —</motion.p>
                </AnimatePresence>
              </div>

              <h1 className="font-serif text-white" style={{ fontSize: 'clamp(2.8rem,5.5vw,5rem)', lineHeight: 1.06, marginBottom: 0 }}>
                <motion.span style={{ display: 'block' }} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.042, delayChildren: 0.28 } } }}>
                  {hero.titleLine1.split('').map((ch, i) => (
                    <motion.span key={i} variants={{ hidden: { opacity: 0, y: 36, rotateX: -55 }, show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.52, ease: EASE } } }} style={{ display: 'inline-block', transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>{ch}</motion.span>
                  ))}
                </motion.span>
                <motion.span style={{ display: 'block' }} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.048, delayChildren: 0.55 } } }}>
                  {hero.titleLine2.split('').map((ch, i) => (
                    <motion.span key={i} variants={{ hidden: { opacity: 0, y: 36, rotateX: -55 }, show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.52, ease: EASE } } }} style={{ display: 'inline-block', transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>{ch}</motion.span>
                  ))}
                </motion.span>
                <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 1.0, ease: EASE }} style={{ display: 'block', fontStyle: 'italic', fontWeight: 400, color: ACCENT }}>{hero.titleHighlight}</motion.span>
              </h1>

              <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.55, delay: 1.25, ease: EASE }} style={{ height: 1.5, width: 100, background: `linear-gradient(to right,${ACCENT},transparent)`, originX: 0, marginTop: 22, marginBottom: 18 }} />

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.62, delay: 1.35, ease: EASE }} className="font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'clamp(0.95rem,1.4vw,1.15rem)', maxWidth: 420 }}>
                {hero.intro}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.58, delay: 1.55, ease: EASE }} className="flex items-stretch gap-8 mt-9 mb-10" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
                <AnimatedStat value={hero.stats[0].value} label={hero.stats[0].label} delay={1.65} />
                <div style={{ width: 1, background: 'rgba(255,255,255,0.10)', alignSelf: 'stretch' }} />
                <AnimatedStat value={hero.stats[1].value} label={hero.stats[1].label} delay={1.78} />
                <div style={{ width: 1, background: 'rgba(255,255,255,0.10)', alignSelf: 'stretch' }} />
                <AnimatedStat value={hero.stats[2].value} label={hero.stats[2].label} delay={1.90} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 1.80, ease: EASE }} className="flex gap-4 flex-wrap" style={{ pointerEvents: 'all' }}>
                <motion.button whileHover={{ scale: 1.05, y: -2, boxShadow: `0 16px 38px rgba(212,133,106,0.52)` }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="flex items-center gap-2 font-bold uppercase tracking-widest text-white" style={{ fontSize: 10, padding: '14px 30px', background: ACCENT, border: 'none', borderRadius: 100, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 8px 28px rgba(212,133,106,0.38)`, letterSpacing: '0.16em' }}>
                  <motion.span animate={{ rotate: [0, 14, -7, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: '0.9rem' }}>🎁</motion.span>
                  {hero.primaryButton}
                </motion.button>
                <motion.button whileHover={{ scale: 1.04, y: -2, background: 'rgba(255,255,255,0.07)' }} whileTap={{ scale: 0.96 }} onClick={() => navigateTo('/contact')} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="font-bold uppercase tracking-widest text-white" style={{ fontSize: 10, padding: '14px 28px', background: 'transparent', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 100, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.16em' }}>{hero.secondaryButton}</motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.9 }} className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" style={{ zIndex: 10 }}>
          <motion.span animate={{ opacity: [0.3, 0.75, 0.3] }} transition={{ duration: 2.2, repeat: Infinity }} style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{hero.scrollLabel}</motion.span>
          <motion.div animate={{ y: [0, 9, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 1, height: 30, background: `linear-gradient(to bottom,${ACCENT},transparent)` }} />
        </motion.div>
      </section>

      {/* ══ ABOUT ══ */}
      <section ref={aboutRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: ACCENT_BG }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vStagger} initial="hidden" animate={aboutInView ? 'show' : 'hidden'}>
            <motion.div variants={vFadeUp}>
              <motion.div initial={{ scaleX: 0 }} animate={aboutInView ? { scaleX: 1 } : { scaleX: 0 }} transition={{ duration: 0.55, ease: EASE }} style={{ originX: 0, height: 3, width: 80, background: ACCENT, marginBottom: 24 }} />
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-4" style={{ color: ACCENT }}>{about.eyebrow}</p>
            </motion.div>
            <motion.h2 variants={vFadeUp} className="text-5xl font-serif leading-tight mb-8" style={{ color: ACCENT_DARK }}>{about.titleLine1}<br />{about.titleLine2}</motion.h2>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-5" style={{ color: '#73736e' }}>{about.paragraph1}</motion.p>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-10" style={{ color: '#73736e' }}>{about.paragraph2}</motion.p>
            <motion.div variants={vFadeUp} className="flex items-center gap-4 pt-8" style={{ borderTop: '1px solid #f0d8cf' }}>
              <div className="flex items-center justify-center rounded-full text-2xl flex-shrink-0" style={{ width: 48, height: 48, background: '#f5ddd5' }}>{about.badgeSymbol}</div>
              <p className="font-semibold text-sm" style={{ color: ACCENT }}>{about.badgeText}</p>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={aboutInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }} transition={{ duration: 0.85, ease: EASE }} style={{ perspective: '1200px' }}>
            <motion.div ref={aRef} onMouseMove={aMM} onMouseLeave={aML} style={{ rotateX: aX, rotateY: aY, transformStyle: 'preserve-3d', willChange: 'transform' }}>
              <img src={asset(about.image)} alt={about.imageAlt} className="w-full rounded-2xl shadow-2xl" style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ CATEGORIES ══ */}
      <section ref={catRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#f5ede9' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={catInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.6 }} className="text-center mb-14">
            <h2 className="text-5xl font-serif mb-4" style={{ color: ACCENT_DARK }}>{categories.title}</h2>
            <p className="font-light text-sm max-w-lg mx-auto" style={{ color: '#73736e' }}>{categories.intro}</p>
          </motion.div>
          <motion.div variants={vStagger} initial="hidden" animate={catInView ? 'show' : 'hidden'} className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ perspective: '1600px' }}>
            {CATEGORIES.map(item => <CategoryCard key={item.name} item={item} />)}
          </motion.div>
        </div>
      </section>

      {/* ══ PRODUCTS ══ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: ACCENT_BG }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.6 }} className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-5xl font-serif mb-2" style={{ color: ACCENT_DARK }}>{products.title}</h2>
              <p className="font-light" style={{ color: '#73736e' }}>{products.intro}</p>
            </div>
            <motion.a whileHover={{ y: -1 }} className="font-bold text-xs uppercase tracking-widest border-b-2 pb-1 cursor-pointer" style={{ borderColor: ACCENT, color: ACCENT_DARK }}>{products.viewAll}</motion.a>
          </motion.div>
          <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' } as React.CSSProperties}>
            {PRODUCTS.map((p, i) => <ProductCard key={p.name} item={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ CUSTOMIZATION ══ */}
      <section ref={custRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#1f1410' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vSlideLeft} initial="hidden" animate={custInView ? 'show' : 'hidden'}>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/60 mb-4">{customization.eyebrow}</p>
            <h2 className="text-5xl font-serif text-white leading-tight mb-6">{customization.title}<br /><span style={{ color: '#f0a891', fontStyle: 'italic', fontWeight: 400 }}>{customization.titleHighlight}</span></h2>
            <p className="text-lg font-light leading-relaxed mb-12" style={{ color: 'rgba(212,212,212,0.7)' }}>{customization.intro}</p>
            <motion.div variants={vStagger} initial="hidden" animate={custInView ? 'show' : 'hidden'} className="grid grid-cols-2 gap-8">
              {CUSTOM_ITEMS.map(item => (
                <motion.div key={item.title} variants={vFadeUp} className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center text-lg rounded-lg" style={{ width: 40, height: 40, border: '1px solid rgba(240,168,145,0.3)', color: '#f0a891' }}>{item.icon}</div>
                  <div><h5 className="font-semibold text-white text-sm mb-1">{item.title}</h5><p className="text-xs font-light leading-relaxed" style={{ color: 'rgba(212,212,212,0.6)' }}>{item.desc}</p></div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div variants={vSlideRight} initial="hidden" animate={custInView ? 'show' : 'hidden'} style={{ position: 'relative' }}>
            <div className="absolute inset-0 rounded-3xl opacity-50" style={{ background: ACCENT, transform: 'rotate(3deg) scale(0.95)' }} />
            <div className="relative rounded-3xl overflow-hidden p-6" style={{ background: '#f5ede9' }}>
              <img src={asset(customization.image)} alt={customization.imageAlt} className="w-full rounded-2xl shadow-xl" style={{ aspectRatio: '1', objectFit: 'cover' }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ WHY ══ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <h2 className="text-5xl font-serif" style={{ color: ACCENT_DARK }}>{why.title}</h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {WHY.map((item, i) => <WhyCard key={item.title} item={item} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ TRUST ══ */}
      {clients.length > 0 && (
      <section className="py-14 px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false, amount: 0.5 }} className="text-center text-[9px] uppercase tracking-[0.3em] font-bold mb-10" style={{ color: '#a6a6a1' }}>{trust.title}</motion.p>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 0.6 }} viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.6 }} className="flex flex-wrap justify-center gap-16">
            {clients.map(c => c.logo
              ? <img key={c.name} src={c.logo} alt={c.name} style={{ height: 32, objectFit: 'contain' }} />
              : <span key={c.name} className="font-serif text-xl font-bold" style={{ color: '#4d4941', letterSpacing: -0.5 }}>{c.name}</span>)}
          </motion.div>
        </div>
      </section>
      )}

      {/* ══ CTA ══ */}
      <section ref={ctaRef} className="py-32 px-8 text-center" style={{ background: '#f5ede9' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity: 0, letterSpacing: '-0.05em', y: 20 }} animate={ctaInView ? { opacity: 1, letterSpacing: '-0.01em', y: 0 } : { opacity: 0, letterSpacing: '-0.05em', y: 20 }} transition={{ duration: 0.85, ease: EASE }} className="font-serif text-5xl md:text-6xl leading-tight mb-6" style={{ color: ACCENT_DARK }}>
            {cta.titleLine1}<br /><span className="italic font-normal">{cta.titleHighlight}</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.6, delay: 0.15 }} className="text-xl font-light leading-relaxed mb-12" style={{ color: '#73736e' }}>{cta.text}</motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.6, delay: 0.28 }} className="flex flex-col sm:flex-row justify-center gap-6">
            <motion.button whileHover={{ scale: 1.06, y: -3, boxShadow: `0 18px 40px rgba(212,133,106,0.35)` }} onClick={() => navigateTo('/get-proposal')} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="text-white font-bold uppercase tracking-[0.2em] text-xs px-14 py-6 rounded-full shadow-xl" style={{ background: ACCENT, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{cta.primaryButton}</motion.button>
            <motion.button whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} onClick={() => navigateTo('/contact')} onMouseEnter={() => setCtaHovered(true)} onMouseLeave={() => setCtaHovered(false)} className="font-bold uppercase tracking-[0.2em] text-xs pb-1" style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${ctaHovered ? ACCENT : 'rgba(212,133,106,0.3)'}`, cursor: 'pointer', fontFamily: 'inherit', color: ACCENT_DARK, transition: 'border-bottom-color 0.25s' }}>{cta.secondaryButton}</motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}