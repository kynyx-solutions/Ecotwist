import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  motion, useScroll, useTransform, useSpring, useMotionValue, useInView,
} from 'motion/react';
import type { Variants } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { hasSiteImage, siteImage } from '../lib/siteImages';
import { clients } from '../lib/clients';
import { asset } from '../lib/content';
import content from '../content/pages/retirement-gifting.json';

// Page words and photos: src/content/pages/retirement-gifting.json (admin → Pages → Retirement Gifting)
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
const vFadeUp: Variants = { hidden: { opacity: 0, y: 44 }, show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } } };
const vStagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.13 } } };
const vScaleIn: Variants = { hidden: { opacity: 0, scale: 0.6, rotateX: -55 }, show: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.95, ease: EASE } } };
const vSlideLeft: Variants = { hidden: { opacity: 0, x: -48 }, show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } } };
const vSlideRight: Variants = { hidden: { opacity: 0, x: 48 }, show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } } };

const ACCENT = '#9c7bb5';
const ACCENT_DARK = '#160e20';

/* ═══════════════════════════════════════════════════════
   RETIREMENT CANVAS — DENSE & RICH
═══════════════════════════════════════════════════════ */
const RetirementCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = (canvas.width = canvas.offsetWidth);
    let H = (canvas.height = canvas.offsetHeight);
    const onResize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    window.addEventListener('resize', onResize);
    const section = canvas.parentElement!;
    const onMove = (e: MouseEvent) => { const r = section.getBoundingClientRect(); mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseleave', onLeave);

    const PURPLE = ['#9c7bb5', '#c4a8d8', '#7a5ea0', '#b08ec8', '#5e4a80'];
    const GOLD = ['#FFD700', '#FFC84B', '#E8C882', '#C9A96E', '#d4a853'];
    const SUNSET = ['#ff9966', '#ffb088', '#e8a070', '#ffc499'];
    const WARM = ['#f5e6d0', '#ede5f5', '#fff8ee'];
    const ALL = [...PURPLE, ...GOLD, ...SUNSET, ...WARM];

    function rnd(a: number, b: number) { return Math.random() * (b - a) + a; }
    function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

    const REP = 150, REP_F = 1.3;
    function repulse<T extends { x: number; y: number; vx: number; vy: number }>(o: T, mx: number, my: number, f = 1) {
      const dx = o.x - mx, dy = o.y - my, d = Math.hypot(dx, dy);
      if (d < REP && d > 0) { const fc = (REP - d) / REP; o.vx += (dx / d) * fc * REP_F * f; o.vy += (dy / d) * fc * REP_F * f; }
    }
    function wrap<T extends { x: number; y: number }>(o: T, m = 25) {
      if (o.x < -m) o.x = W + m; if (o.x > W + m) o.x = -m;
      if (o.y < -m) o.y = H + m; if (o.y > H + m) o.y = -m;
    }
    type Movable = { x: number; y: number; vx: number; vy: number; driftX: number; driftY: number; rot: number; rotSpd: number; pulse: number };
    function mov(o: Movable, mx: number, my: number, max = 2) {
      o.pulse += 0.025; o.rot += o.rotSpd;
      repulse(o, mx, my, 0.6);
      o.vx += (o.driftX - o.vx) * 0.035; o.vy += (o.driftY - o.vy) * 0.035;
      const s = Math.hypot(o.vx, o.vy); if (s > max) { o.vx = (o.vx / s) * max; o.vy = (o.vy / s) * max; }
      o.x += o.vx; o.y += o.vy; wrap(o);
    }
    function drift() { const a = rnd(0, Math.PI * 2), s = rnd(0.08, 0.3); return { dx: Math.cos(a) * s, dy: Math.sin(a) * s }; }

    /* ═══ LAUREL LEAVES ═══ */
    interface Leaf extends Movable { size: number; col: string; alpha: number; wobble: number; wobSpd: number; }
    function mkLeaf(): Leaf { const d = drift(); return { x: rnd(0, W), y: rnd(0, H), vx: d.dx, vy: d.dy, driftX: d.dx, driftY: d.dy, size: rnd(10, 24), rot: rnd(0, Math.PI * 2), rotSpd: rnd(-0.008, 0.008), col: pick([...GOLD, '#8B7355', '#a0926c']), pulse: rnd(0, Math.PI * 2), alpha: rnd(0.3, 0.7), wobble: rnd(0, Math.PI * 2), wobSpd: rnd(0.015, 0.03) }; }
    function drawLeaf(l: Leaf, mx: number, my: number) {
      l.wobble += l.wobSpd; mov(l, mx, my); l.x += Math.sin(l.wobble) * 0.3;
      const near = mx > -999 && Math.hypot(l.x - mx, l.y - my) < 130;
      const al = near ? Math.min(1, l.alpha * 1.8) : l.alpha;
      const s = l.size * (0.9 + Math.sin(l.pulse) * 0.1);
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 16; ctx.shadowColor = l.col; }
      ctx.fillStyle = l.col; ctx.beginPath();
      ctx.moveTo(0, -s * 0.8); ctx.bezierCurveTo(s * 0.5, -s * 0.5, s * 0.4, s * 0.2, 0, s * 0.8);
      ctx.bezierCurveTo(-s * 0.4, s * 0.2, -s * 0.5, -s * 0.5, 0, -s * 0.8); ctx.fill();
      ctx.strokeStyle = `${l.col}88`; ctx.lineWidth = 0.5; ctx.globalAlpha = al * 0.5;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.6); ctx.lineTo(0, s * 0.6); ctx.stroke();
      ctx.restore();
    }
    const LEAVES: Leaf[] = Array.from({ length: 20 }, mkLeaf);

    /* ═══ CLOCKS & HOURGLASSES ═══ */
    interface Clock extends Movable { size: number; col: string; alpha: number; type: 'c' | 'h'; }
    function mkClock(): Clock { const d = drift(); return { x: rnd(0, W), y: rnd(0, H), vx: d.dx, vy: d.dy, driftX: d.dx, driftY: d.dy, size: rnd(14, 26), rot: rnd(0, Math.PI * 2), rotSpd: rnd(-0.005, 0.005), col: pick(GOLD), pulse: rnd(0, Math.PI * 2), alpha: rnd(0.25, 0.55), type: Math.random() > 0.5 ? 'c' : 'h' }; }
    function drawClock(c: Clock, mx: number, my: number) {
      mov(c, mx, my);
      const near = mx > -999 && Math.hypot(c.x - mx, c.y - my) < 130;
      const al = near ? Math.min(1, c.alpha * 1.8) : c.alpha;
      const s = c.size * (0.92 + Math.sin(c.pulse) * 0.08);
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 14; ctx.shadowColor = c.col; }
      ctx.strokeStyle = c.col; ctx.lineWidth = near ? 1.5 : 1;
      if (c.type === 'c') {
        ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.38, Math.sin(a) * s * 0.38); ctx.lineTo(Math.cos(a) * s * 0.46, Math.sin(a) * s * 0.46); ctx.stroke(); }
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(c.pulse * 0.5) * s * 0.25, Math.sin(c.pulse * 0.5) * s * 0.25); ctx.stroke();
        ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(c.pulse * 3) * s * 0.35, Math.sin(c.pulse * 3) * s * 0.35); ctx.stroke();
        ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = c.col; ctx.globalAlpha = al * 0.25;
        ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.5); ctx.lineTo(s * 0.3, -s * 0.5); ctx.lineTo(s * 0.05, 0); ctx.lineTo(s * 0.3, s * 0.5); ctx.lineTo(-s * 0.3, s * 0.5); ctx.lineTo(-s * 0.05, 0); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = al; ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.5); ctx.lineTo(s * 0.3, -s * 0.5); ctx.lineTo(s * 0.05, 0); ctx.lineTo(s * 0.3, s * 0.5); ctx.lineTo(-s * 0.3, s * 0.5); ctx.lineTo(-s * 0.05, 0); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = c.col; ctx.globalAlpha = al * 0.5;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(rnd(-s * 0.08, s * 0.08), s * 0.15 + i * s * 0.07, 0.8, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    }
    const CLOCKS: Clock[] = Array.from({ length: 12 }, mkClock);

    /* ═══ PHOTO FRAMES ═══ */
    interface Frame extends Movable { size: number; col: string; alpha: number; }
    function mkFrame(): Frame { const d = drift(); return { x: rnd(0, W), y: rnd(0, H), vx: d.dx, vy: d.dy, driftX: d.dx, driftY: d.dy, size: rnd(20, 38), rot: rnd(-0.2, 0.2), rotSpd: rnd(-0.004, 0.004), col: pick([...PURPLE, ...GOLD]), pulse: rnd(0, Math.PI * 2), alpha: rnd(0.25, 0.55) }; }
    function drawFrame(f: Frame, mx: number, my: number) {
      mov(f, mx, my);
      const near = mx > -999 && Math.hypot(f.x - mx, f.y - my) < 130;
      const al = near ? Math.min(1, f.alpha * 1.8) : f.alpha;
      const s = f.size * (0.93 + Math.sin(f.pulse) * 0.07);
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 18; ctx.shadowColor = f.col; }
      ctx.strokeStyle = f.col; ctx.lineWidth = near ? 2 : 1.2;
      ctx.beginPath(); ctx.roundRect(-s * 0.5, -s * 0.6, s, s * 1.2, 3); ctx.stroke();
      ctx.fillStyle = f.col; ctx.globalAlpha = al * 0.1;
      ctx.beginPath(); ctx.roundRect(-s * 0.38, -s * 0.48, s * 0.76, s * 0.96, 2); ctx.fill();
      ctx.globalAlpha = al * 0.25; ctx.fillStyle = f.col;
      ctx.beginPath(); ctx.moveTo(-s * 0.38, s * 0.3); ctx.lineTo(-s * 0.12, -s * 0.08); ctx.lineTo(0, s * 0.05); ctx.lineTo(s * 0.15, -s * 0.18); ctx.lineTo(s * 0.38, s * 0.3); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = al * 0.35; ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.25, s * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const FRAMES: Frame[] = Array.from({ length: 10 }, mkFrame);

    /* ═══ GIFT BOXES ═══ */
    interface GBox extends Movable { size: number; col: string; ribCol: string; alpha: number; }
    function mkBox(): GBox { const d = drift(); return { x: rnd(0, W), y: rnd(0, H), vx: d.dx, vy: d.dy, driftX: d.dx, driftY: d.dy, size: rnd(18, 40), rot: rnd(0, Math.PI * 2), rotSpd: rnd(-0.006, 0.006), col: pick(PURPLE), ribCol: pick(GOLD), pulse: rnd(0, Math.PI * 2), alpha: rnd(0.3, 0.65) }; }
    function drawBox(b: GBox, mx: number, my: number) {
      mov(b, mx, my);
      const s = b.size * (0.92 + Math.sin(b.pulse) * 0.08);
      const near = mx > -999 && Math.hypot(b.x - mx, b.y - my) < 150;
      const al = near ? Math.min(1, b.alpha * 1.7) : b.alpha;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 20; ctx.shadowColor = b.col; }
      ctx.fillStyle = b.col; ctx.beginPath(); ctx.roundRect(-s / 2, 0, s, s * 0.7, 3); ctx.fill();
      ctx.fillStyle = b.ribCol; ctx.beginPath(); ctx.roundRect(-s / 2 - 2, -s * 0.16, s + 4, s * 0.2, 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.globalAlpha = al * 0.3; ctx.fillRect(-s * 0.07, -s * 0.16, s * 0.14, s * 0.86);
      ctx.globalAlpha = al; ctx.strokeStyle = b.ribCol; ctx.lineWidth = near ? 2 : 1.2;
      ctx.beginPath(); ctx.ellipse(-s * 0.22, -s * 0.24, s * 0.18, s * 0.1, -0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * 0.22, -s * 0.24, s * 0.18, s * 0.1, 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const GBOXES: GBox[] = Array.from({ length: 10 }, mkBox);

    /* ═══ WISDOM STARS ═══ */
    interface WStar { x: number; y: number; vx: number; vy: number; driftX: number; driftY: number; r: number; rot: number; rotSpd: number; col: string; pulse: number; tw: number; twSpd: number; }
    const WSTARS: WStar[] = Array.from({ length: 35 }, () => { const d = drift(); return { x: rnd(0, W), y: rnd(0, H), vx: d.dx, vy: d.dy, driftX: d.dx, driftY: d.dy, r: rnd(3, 14), rot: rnd(0, Math.PI * 2), rotSpd: rnd(-0.015, 0.015), col: pick([...GOLD, ...SUNSET, '#fff']), pulse: rnd(0, Math.PI * 2), tw: rnd(0, Math.PI * 2), twSpd: rnd(0.025, 0.07) }; });
    function drawWStars(mx: number, my: number) {
      WSTARS.forEach(s => {
        s.pulse += 0.035; s.tw += s.twSpd; s.rot += s.rotSpd;
        repulse(s, mx, my, 0.5);
        s.vx += (s.driftX - s.vx) * 0.03; s.vy += (s.driftY - s.vy) * 0.03;
        s.x += s.vx; s.y += s.vy; wrap(s);
        const near = mx > -999 && Math.hypot(s.x - mx, s.y - my) < 120;
        const r = s.r * (0.85 + Math.sin(s.pulse) * 0.18);
        const al = near ? 1 : (0.25 + Math.sin(s.tw) * 0.5);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = al;
        if (near) { ctx.shadowBlur = 14; ctx.shadowColor = s.col; }
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rad = i % 2 === 0 ? r : r * 0.35; i === 0 ? ctx.moveTo(rad * Math.cos(a), rad * Math.sin(a)) : ctx.lineTo(rad * Math.cos(a), rad * Math.sin(a)); }
        ctx.closePath(); ctx.fillStyle = near ? '#fff' : s.col; ctx.fill();
        ctx.globalAlpha = al * 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }

    /* ═══ FLOATING HEARTS ═══ */
    interface Heart extends Movable { size: number; col: string; alpha: number; }
    function mkHeart(): Heart { const d = drift(); return { x: rnd(0, W), y: rnd(0, H), vx: d.dx, vy: d.dy, driftX: d.dx, driftY: d.dy, size: rnd(8, 18), rot: rnd(-0.3, 0.3), rotSpd: rnd(-0.006, 0.006), col: pick([...SUNSET, '#ff90b0', '#c4a8d8']), pulse: rnd(0, Math.PI * 2), alpha: rnd(0.2, 0.55) }; }
    function drawHeart(h: Heart, mx: number, my: number) {
      mov(h, mx, my);
      const near = mx > -999 && Math.hypot(h.x - mx, h.y - my) < 120;
      const al = near ? Math.min(1, h.alpha * 1.9) : h.alpha;
      const s = h.size * (0.88 + Math.sin(h.pulse) * 0.14);
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 14; ctx.shadowColor = h.col; }
      ctx.fillStyle = h.col; ctx.beginPath();
      ctx.moveTo(0, s * 0.3); ctx.bezierCurveTo(-s * 0.5, -s * 0.1, -s, -s * 0.3, 0, s);
      ctx.bezierCurveTo(s, -s * 0.3, s * 0.5, -s * 0.1, 0, s * 0.3); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = al * 0.3; ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.05, s * 0.12, s * 0.07, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const HEARTS: Heart[] = Array.from({ length: 10 }, mkHeart);

    /* ═══ RIBBON BOWS ═══ */
    interface Bow extends Movable { size: number; col: string; alpha: number; }
    function mkBow(): Bow { const d = drift(); return { x: rnd(0, W), y: rnd(0, H), vx: d.dx, vy: d.dy, driftX: d.dx, driftY: d.dy, size: rnd(12, 26), rot: rnd(0, Math.PI * 2), rotSpd: rnd(-0.008, 0.008), col: pick([...GOLD, ...PURPLE]), pulse: rnd(0, Math.PI * 2), alpha: rnd(0.25, 0.55) }; }
    function drawBow(b: Bow, mx: number, my: number) {
      mov(b, mx, my);
      const near = mx > -999 && Math.hypot(b.x - mx, b.y - my) < 120;
      const al = near ? Math.min(1, b.alpha * 1.8) : b.alpha;
      const s = b.size * (0.9 + Math.sin(b.pulse) * 0.1);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 12; ctx.shadowColor = b.col; }
      ctx.strokeStyle = b.col; ctx.lineWidth = near ? 1.8 : 1;
      ctx.beginPath(); ctx.ellipse(-s * 0.5, -s * 0.12, s * 0.45, s * 0.25, -0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * 0.5, -s * 0.12, s * 0.45, s * 0.25, 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.08, 0); ctx.lineTo(-s * 0.45, s * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.08, 0); ctx.lineTo(s * 0.45, s * 0.6); ctx.stroke();
      ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.14, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const BOWS: Bow[] = Array.from({ length: 8 }, mkBow);

    /* ═══ NETWORK NODES ═══ */
    interface NetN { x: number; y: number; vx: number; vy: number; driftX: number; driftY: number; pulse: number; col: string; r: number; }
    const NODES: NetN[] = Array.from({ length: 55 }, () => { const d = drift(); return { x: rnd(0, W), y: rnd(0, H), vx: d.dx, vy: d.dy, driftX: d.dx, driftY: d.dy, pulse: rnd(0, Math.PI * 2), col: pick([...PURPLE, ...GOLD]), r: rnd(1.5, 3) }; });
    function drawNetwork(mx: number, my: number) {
      const L = 100;
      NODES.forEach(n => {
        n.pulse += 0.02;
        if (mx > -999) { const dx = n.x - mx, dy = n.y - my, d = Math.hypot(dx, dy); if (d < 120 && d > 0) { const f = (120 - d) / 120; n.vx += (dx / d) * f; n.vy += (dy / d) * f; } }
        n.vx += (n.driftX - n.vx) * 0.03; n.vy += (n.driftY - n.vy) * 0.03;
        n.x += n.vx; n.y += n.vy;
        if (n.x < -10) n.x = W + 10; if (n.x > W + 10) n.x = -10;
        if (n.y < -10) n.y = H + 10; if (n.y > H + 10) n.y = -10;
      });
      for (let i = 0; i < NODES.length; i++) for (let j = i + 1; j < NODES.length; j++) {
        const a = NODES[i], b = NODES[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < L) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(156,123,181,${(1 - d / L) * 0.14})`; ctx.lineWidth = 0.5; ctx.stroke(); }
      }
      NODES.forEach(n => { const pr = n.r + Math.sin(n.pulse) * 0.4; ctx.beginPath(); ctx.arc(n.x, n.y, pr, 0, Math.PI * 2); ctx.fillStyle = n.col; ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1; });
    }

    /* ═══ SILK RIBBONS ═══ */
    interface SilkR { yBase: number; phase: number; speed: number; amp: number; freq: number; col: string; width: number; alpha: number; }
    const SILK: SilkR[] = Array.from({ length: 7 }, (_, i) => ({ yBase: 0.08 + i * 0.14, phase: rnd(0, Math.PI * 2), speed: rnd(0.003, 0.009), amp: rnd(8, 28), freq: rnd(0.006, 0.015), col: pick(ALL), width: rnd(0.4, 1.5), alpha: rnd(0.025, 0.065) }));

    /* ═══ SPOTLIGHTS ═══ */
    interface Spot { ox: number; phase: number; speed: number; spread: number; col: string; intensity: number; }
    const SPOTS: Spot[] = [
      { ox: 0.15, phase: 0, speed: 0.0006, spread: 0.18, col: 'rgba(255,153,102,', intensity: 0.09 },
      { ox: 0.45, phase: 2, speed: 0.001, spread: 0.14, col: 'rgba(156,123,181,', intensity: 0.07 },
      { ox: 0.75, phase: 4, speed: 0.0007, spread: 0.2, col: 'rgba(255,215,0,', intensity: 0.08 },
      { ox: 0.92, phase: 5.5, speed: 0.0008, spread: 0.16, col: 'rgba(196,168,216,', intensity: 0.06 },
    ];
    function drawSpots() {
      SPOTS.forEach(sl => {
        sl.phase += sl.speed;
        const angle = Math.PI / 2 + Math.sin(sl.phase) * sl.spread;
        const ox = W * sl.ox, oy = -10, len = H * 1.3, spr = 0.12;
        const lx = ox + Math.cos(angle - spr) * len, ly = oy + Math.sin(angle - spr) * len;
        const rx = ox + Math.cos(angle + spr) * len, ry = oy + Math.sin(angle + spr) * len;
        const cx = ox + Math.cos(angle) * len, cy = oy + Math.sin(angle) * len;
        const grad = ctx.createRadialGradient(ox, oy, 0, cx, cy, len * 0.65);
        grad.addColorStop(0, `${sl.col}${sl.intensity * 1.5})`); grad.addColorStop(0.5, `${sl.col}${sl.intensity * 0.4})`); grad.addColorStop(1, 'transparent');
        ctx.save(); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(lx, ly); ctx.quadraticCurveTo(cx, cy, rx, ry); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
        const sg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 16); sg.addColorStop(0, `${sl.col}0.3)`); sg.addColorStop(1, 'transparent'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(ox, oy, 16, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }

    /* ═══ LEGACY RINGS ═══ */
    interface LR { x: number; y: number; r: number; maxR: number; life: number; col: string; }
    const LRINGS: LR[] = [];
    let ringT = 0;

    /* ═══ SPARKS ═══ */
    interface Spark { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number; }
    const SPARKS: Spark[] = [];
    let sparkT = 0;
    function spawnSpark(sx: number, sy: number, c = 5) { for (let i = 0; i < c; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2.5; SPARKS.push({ x: sx, y: sy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col: pick(ALL), r: 1 + Math.random() * 2 }); } }

    /* ═══ CONFETTI ═══ */
    interface Conf { x: number; y: number; vx: number; vy: number; size: number; col: string; rot: number; rotSpd: number; isCircle: boolean; alpha: number; wobble: number; wobSpd: number; }
    const CONF: Conf[] = Array.from({ length: 40 }, () => ({ x: rnd(0, W), y: rnd(-600, 0), vx: rnd(-0.4, 0.4), vy: rnd(0.3, 1), size: rnd(3, 7), col: pick(ALL), rot: rnd(0, Math.PI * 2), rotSpd: rnd(-0.06, 0.06), isCircle: Math.random() > 0.5, alpha: rnd(0.2, 0.45), wobble: rnd(0, Math.PI * 2), wobSpd: rnd(0.015, 0.035) }));

    let frame = 0;

    /* ═══ MAIN LOOP ═══ */
    function loop() {
      const { x: mx, y: my } = mouseRef.current;
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // BG — deep purple-brown
      const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
      bg.addColorStop(0, '#0e0818'); bg.addColorStop(0.5, '#1a1025'); bg.addColorStop(1, '#120a1a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Sunset glow bottom
      const sg2 = ctx.createRadialGradient(W * 0.7, H * 0.85, 0, W * 0.7, H * 0.85, W * 0.55);
      sg2.addColorStop(0, 'rgba(255,153,102,0.08)'); sg2.addColorStop(1, 'transparent');
      ctx.fillStyle = sg2; ctx.fillRect(0, 0, W, H);

      // Purple glow center
      const pg = ctx.createRadialGradient(W * 0.35, H * 0.4, 0, W * 0.35, H * 0.4, W * 0.4);
      pg.addColorStop(0, 'rgba(156,123,181,0.06)'); pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);

      // Gold glow right
      const gg = ctx.createRadialGradient(W * 0.8, H * 0.3, 0, W * 0.8, H * 0.3, W * 0.3);
      gg.addColorStop(0, 'rgba(255,215,0,0.04)'); gg.addColorStop(1, 'transparent');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);

      // Silk ribbons
      SILK.forEach(r => { r.phase += r.speed; ctx.save(); ctx.globalAlpha = r.alpha; ctx.beginPath(); for (let x = 0; x <= W; x += 4) { const y = r.yBase * H + r.amp * Math.sin(x * r.freq + r.phase) + r.amp * 0.35 * Math.sin(x * r.freq * 2 + r.phase * 1.3); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.strokeStyle = r.col; ctx.lineWidth = r.width * 2; ctx.stroke(); ctx.restore(); });

      // Spotlights
      drawSpots();

      // Network
      drawNetwork(mx, my);

      // All themed shapes
      GBOXES.forEach(b => drawBox(b, mx, my));
      FRAMES.forEach(f => drawFrame(f, mx, my));
      CLOCKS.forEach(c => drawClock(c, mx, my));
      LEAVES.forEach(l => drawLeaf(l, mx, my));
      HEARTS.forEach(h => drawHeart(h, mx, my));
      BOWS.forEach(b => drawBow(b, mx, my));
      drawWStars(mx, my);

      // Confetti
      CONF.forEach(c => {
        c.wobble += c.wobSpd; c.x += c.vx + Math.sin(c.wobble) * 0.4; c.y += c.vy; c.vy += 0.01; c.rot += c.rotSpd; c.alpha -= 0.0004;
        if (c.alpha <= 0 || c.y > H + 20) { c.x = rnd(0, W); c.y = -15; c.vy = rnd(0.3, 1); c.alpha = rnd(0.2, 0.45); c.col = pick(ALL); }
        ctx.save(); ctx.globalAlpha = c.alpha; ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.fillStyle = c.col;
        if (c.isCircle) { ctx.beginPath(); ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillRect(-c.size * 0.6, -c.size * 0.3, c.size * 1.2, c.size * 0.6); }
        ctx.restore();
      });

      // Legacy rings
      ringT++;
      if (ringT > 80 + Math.floor(Math.random() * 60)) { ringT = 0; LRINGS.push({ x: rnd(W * 0.15, W * 0.85), y: rnd(H * 0.15, H * 0.85), r: 0, maxR: rnd(50, 130), life: 1, col: pick([...PURPLE, ...GOLD]) }); }
      for (let i = LRINGS.length - 1; i >= 0; i--) {
        const lr = LRINGS[i]; lr.r += (lr.maxR - lr.r) * 0.012 + 0.6; lr.life -= 0.01;
        if (lr.life <= 0) { LRINGS.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(156,123,181,${lr.life * 0.3})`; ctx.lineWidth = 1.8 * lr.life; ctx.beginPath(); ctx.arc(lr.x, lr.y, lr.r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,215,0,${lr.life * 0.12})`; ctx.lineWidth = 0.6 * lr.life; ctx.beginPath(); ctx.arc(lr.x, lr.y, lr.r * 0.6, 0, Math.PI * 2); ctx.stroke();
      }

      // Sparks
      sparkT++;
      if (sparkT > 45 + Math.floor(Math.random() * 25)) { sparkT = 0; spawnSpark(rnd(0, W), rnd(0, H), 5); }
      if (mx > -999 && frame % 7 === 0) spawnSpark(mx, my, 4);
      ctx.save();
      for (let i = SPARKS.length - 1; i >= 0; i--) {
        const s = SPARKS[i]; s.x += s.vx; s.y += s.vy; s.vy -= 0.03; s.life -= 0.05;
        if (s.life <= 0) { SPARKS.splice(i, 1); continue; }
        ctx.globalAlpha = s.life; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2); ctx.fillStyle = s.col; ctx.fill();
        ctx.beginPath(); ctx.moveTo(s.x - 4 * s.life, s.y); ctx.lineTo(s.x + 4 * s.life, s.y); ctx.moveTo(s.x, s.y - 4 * s.life); ctx.lineTo(s.x, s.y + 4 * s.life);
        ctx.strokeStyle = s.col; ctx.lineWidth = 0.5; ctx.globalAlpha = s.life * 0.4; ctx.stroke();
      }
      ctx.restore();

      // Mouse glow
      if (mx > -9999) {
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 130);
        mg.addColorStop(0, 'rgba(255,215,0,0.10)'); mg.addColorStop(0.4, 'rgba(156,123,181,0.05)'); mg.addColorStop(1, 'transparent');
        ctx.globalAlpha = 1; ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
      }

      animRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', onResize); section.removeEventListener('mousemove', onMove); section.removeEventListener('mouseleave', onLeave); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 2, pointerEvents: 'none' }} />;
};

/* ═══════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════ */
// An uploaded photo wins; otherwise the photo set under "Photos to add"
const PRODUCTS = products.items.map(p => ({ name: p.name, sub: p.sub, tag: p.tag, img: p.image ? asset(p.image) : siteImage(p.photoId ?? '') }));
const CATEGORIES = categories.items.map(c => ({ name: c.name, desc: c.desc, accent: c.accent, tag: c.tag, img: c.image ? asset(c.image) : siteImage(c.photoId ?? '') }));
const CUSTOM_ITEMS = customization.items.map(c => ({ icon: c.symbol, title: c.title, desc: c.desc }));
const WHY = why.items.map(w => ({ icon: w.symbol, title: w.title, desc: w.desc }));

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════ */
function CategoryCard({ item, index }: { item: typeof CATEGORIES[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { ref, springX, springY, onMouseMove, onMouseLeave } = useTilt(12);
  return (
    <motion.div variants={vScaleIn} style={{ perspective: '1400px', transformStyle: 'preserve-3d' }} className="cursor-pointer">
      <motion.div ref={ref} onMouseMove={onMouseMove} onMouseLeave={() => { onMouseLeave(); setHovered(false); }} onMouseEnter={() => setHovered(true)} style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', willChange: 'transform', boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.12)' : '0 2px 10px rgba(0,0,0,0.06)', transition: 'box-shadow 0.4s', borderRadius: 16, overflow: 'hidden', background: 'white' }}>
        <div style={{ height: 280, overflow: 'hidden', position: 'relative' }}>
          <motion.img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', willChange: 'transform' }} animate={{ scale: hovered ? 1.07 : 1 }} transition={{ duration: 0.75, ease: EASE }} />
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
      <div className="relative overflow-hidden mb-4" style={{ width: '100%', aspectRatio: '1/1', borderRadius: 16, background: '#ede5f5' }}>
        <motion.img src={item.img} alt={item.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', willChange: 'transform' }} animate={{ scale: hovered ? 1.06 : 1 }} transition={{ duration: 0.65, ease: EASE }} />
        <span className="absolute top-4 left-4 text-[10px] font-bold uppercase text-white px-4 py-1 rounded-full" style={{ background: 'rgba(122,94,160,0.88)', backdropFilter: 'blur(6px)', letterSpacing: 2 }}>{item.tag}</span>
      </div>
      <h4 className="font-serif text-xl mb-1" style={{ color: ACCENT_DARK }}>{item.name}</h4>
    </motion.div>
  );
}

function WhyCard({ item, index }: { item: typeof WHY[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.3 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 36 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }} transition={{ duration: 0.7, delay: index * 0.1, ease: EASE }} onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)} className="text-center p-6 cursor-pointer">
      <motion.div className="flex items-center justify-center mx-auto mb-5 rounded-full text-3xl" style={{ width: 64, height: 64 }} animate={{ background: hovered ? ACCENT : '#ede5f5', color: hovered ? 'white' : ACCENT_DARK }} transition={{ duration: 0.3 }}>{item.icon}</motion.div>
      <h4 className="font-bold text-xs uppercase tracking-widest mb-2">{item.title}</h4>
      <p className="text-xs font-light leading-relaxed" style={{ color: '#73736e' }}>{item.desc}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function RetirementGifting() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const springImg = useSpring(useTransform(scrollYProgress, [0, 1], ['0%', '32%']), { stiffness: 60, damping: 22 });
  const springTxt = useSpring(useTransform(scrollYProgress, [0, 1], ['0%', '18%']), { stiffness: 80, damping: 25 });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const { ref: aRef, springX: aX, springY: aY, onMouseMove: aMM, onMouseLeave: aML } = useTilt(6);
  const aboutRef = useRef<HTMLElement>(null);
  const catRef = useRef<HTMLElement>(null);
  const custRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const aboutInView = useInView(aboutRef, { once: false, amount: 0.2 });
  const catInView = useInView(catRef, { once: false, amount: 0.15 });
  const custInView = useInView(custRef, { once: false, amount: 0.15 });
  const ctaInView = useInView(ctaRef, { once: false, amount: 0.3 });

  return (
    <div className="overflow-x-hidden" style={{ background: '#f7f3fb', fontFamily: 'inherit' }}>

      {/* ══ HERO ══ */}
      <section ref={heroRef} className="relative flex items-center overflow-hidden" style={{ minHeight: '100vh', perspective: '1400px' }}>
        {/* Background image — z-index: 0 */}
        <motion.div style={{ y: springImg, willChange: 'transform' }} className="absolute inset-0" >
          {(hero.backgroundImage || hasSiteImage(hero.photoId)) && <img src={hero.backgroundImage ? asset(hero.backgroundImage) : siteImage(hero.photoId)} alt={hero.imageAlt} className="w-full h-full object-cover" style={{ minHeight: '120%', filter: 'brightness(0.30)' }} />}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg,rgba(0,0,0,0.70) 0%,rgba(0,0,0,0.30) 55%,rgba(0,0,0,0.08) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-36" style={{ background: 'linear-gradient(to top,rgba(156,123,181,0.18) 0%,transparent 100%)' }} />
        </motion.div>

        {/* ★ CANVAS — z-index: 2 (ABOVE image, BELOW text) ★ */}
        <RetirementCanvas />

        {/* Diagonal lines — z-index: 3 */}
        {[...Array(5)].map((_, i) => (
          <motion.div key={i} style={{ position: 'absolute', width: '100%', height: 1, top: `${18 + i * 15}%`, transform: `rotate(${-14 + i * 1.8}deg)`, background: 'linear-gradient(90deg,transparent,rgba(156,123,181,0.12),transparent)', zIndex: 3, pointerEvents: 'none' }}
            initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 2, delay: 0.5 + i * 0.12 }} />
        ))}

        {/* Vignette — z-index: 4 */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center,transparent 15%,rgba(14,8,24,0.75) 100%)', zIndex: 4, pointerEvents: 'none' }} />

        {/* Hero text — z-index: 10 */}
        <motion.div style={{ y: springTxt, opacity: heroOpacity, willChange: 'transform' }} className="absolute bottom-20 left-8 md:left-20 z-10 max-w-3xl px-4">
          <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-[10px] uppercase tracking-[0.32em] font-bold text-white/60 mb-5 flex items-center gap-3">
            <span className="w-10 h-px inline-block" style={{ background: '#b5a26a' }} />{hero.eyebrow}
          </motion.p>
          <h1 className="font-serif text-white" style={{ fontSize: 'clamp(3rem,7vw,6rem)', lineHeight: 1.08 }}>
            {[hero.titleLine1, hero.titleLine2].map((word, i) => (
              <motion.span key={word} initial={{ rotateX: -90, opacity: 0, y: 40 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 + i * 0.15, ease: EASE }} style={{ display: 'block', transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>{word}</motion.span>
            ))}
            <motion.span initial={{ rotateX: -90, opacity: 0, y: 40 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.55, ease: EASE }} style={{ display: 'block', fontStyle: 'italic', fontWeight: 400, color: ACCENT, transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>{hero.titleHighlight}</motion.span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.8 }} className="text-white/80 mt-6 max-w-md text-lg font-light leading-relaxed">
            {hero.intro}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 1.05 }} className="flex gap-4 mt-10 flex-wrap">
            <motion.button whileHover={{ scale: 1.05, y: -2, boxShadow: '0 12px 32px rgba(156,123,181,0.45)' }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full" style={{ background: ACCENT, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 30px rgba(156,123,181,0.4)' }}>{hero.primaryButton}</motion.button>
            <motion.button whileHover={{ scale: 1.04, y: -2, background: 'white', color: ACCENT_DARK }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} onClick={() => (window.location.href = '/contact')} className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit' }}>{hero.secondaryButton}</motion.button>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.8 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold">{hero.scrollLabel}</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 1, height: 28, background: `linear-gradient(to bottom,${ACCENT},transparent)` }} />
        </motion.div>
      </section>

      {/* ══ ABOUT ══ */}
      <section ref={aboutRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#f7f3fb' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vStagger} initial="hidden" animate={aboutInView ? 'show' : 'hidden'}>
            <motion.div variants={vFadeUp}>
              <motion.div initial={{ scaleX: 0 }} animate={aboutInView ? { scaleX: 1 } : { scaleX: 0 }} transition={{ duration: 0.55, ease: EASE }} style={{ originX: 0, height: 3, width: 80, background: ACCENT, marginBottom: 24 }} />
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-4" style={{ color: ACCENT }}>{about.eyebrow}</p>
            </motion.div>
            <motion.h2 variants={vFadeUp} className="text-5xl font-serif leading-tight mb-8" style={{ color: ACCENT_DARK }}>{about.titleLine1}<br />{about.titleLine2}</motion.h2>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-5" style={{ color: '#73736e' }}>{about.paragraph1}</motion.p>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-10" style={{ color: '#73736e' }}>{about.paragraph2}</motion.p>
            <motion.div variants={vFadeUp} className="flex items-center gap-4 pt-8" style={{ borderTop: '1px solid #d8c8eb' }}>
              <div className="flex items-center justify-center rounded-full text-2xl flex-shrink-0" style={{ width: 48, height: 48, background: '#ede5f5' }}>{about.badgeSymbol}</div>
              <p className="font-semibold text-sm" style={{ color: ACCENT }}>{about.badgeText}</p>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={aboutInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }} transition={{ duration: 0.85, ease: EASE }} style={{ perspective: '1200px' }}>
            <motion.div ref={aRef} onMouseMove={aMM} onMouseLeave={aML} style={{ rotateX: aX, rotateY: aY, transformStyle: 'preserve-3d', willChange: 'transform' }}>
              <img src={asset(about.image)} alt={about.imageAlt} className="w-full rounded-2xl shadow-2xl" style={{ aspectRatio: '4/5', objectFit: 'cover', objectPosition: 'center' }} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ CATEGORIES ══ */}
      <section ref={catRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#ede5f5' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={catInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.6 }} className="text-center mb-14">
            <h2 className="text-5xl font-serif mb-4" style={{ color: ACCENT_DARK }}>{categories.title}</h2>
            <p className="font-light text-sm max-w-lg mx-auto" style={{ color: '#73736e' }}>{categories.intro}</p>
          </motion.div>
          <motion.div variants={vStagger} initial="hidden" animate={catInView ? 'show' : 'hidden'} className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ perspective: '1600px' }}>
            {CATEGORIES.map((item, i) => <CategoryCard key={item.name} item={item} index={i} />)}
          </motion.div>
        </div>
      </section>

      {/* ══ PRODUCTS ══ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#f7f3fb' }}>
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
      <section ref={custRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: ACCENT_DARK }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vSlideLeft} initial="hidden" animate={custInView ? 'show' : 'hidden'}>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/60 mb-4">{customization.eyebrow}</p>
            <h2 className="text-5xl font-serif text-white leading-tight mb-6">{customization.title}<br /><span style={{ color: '#c4a8d8', fontStyle: 'italic', fontWeight: 400 }}>{customization.titleHighlight}</span></h2>
            <p className="text-lg font-light leading-relaxed mb-12" style={{ color: 'rgba(212,212,212,0.7)' }}>{customization.intro}</p>
            <motion.div variants={vStagger} initial="hidden" animate={custInView ? 'show' : 'hidden'} className="grid grid-cols-2 gap-8">
              {CUSTOM_ITEMS.map(item => (
                <motion.div key={item.title} variants={vFadeUp} className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center text-lg rounded-lg" style={{ width: 40, height: 40, border: '1px solid rgba(196,168,216,0.3)', color: '#c4a8d8' }}>{item.icon}</div>
                  <div><h5 className="font-semibold text-white text-sm mb-1">{item.title}</h5><p className="text-xs font-light leading-relaxed" style={{ color: 'rgba(212,212,212,0.6)' }}>{item.desc}</p></div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div variants={vSlideRight} initial="hidden" animate={custInView ? 'show' : 'hidden'} style={{ position: 'relative' }}>
            <div className="absolute inset-0 rounded-3xl opacity-40" style={{ background: ACCENT, transform: 'rotate(3deg) scale(0.95)' }} />
            <div className="relative rounded-3xl overflow-hidden p-6" style={{ background: '#ede5f5' }}>
              <img src={asset(customization.image)} alt={customization.imageAlt} className="w-full rounded-2xl shadow-xl" style={{ aspectRatio: '1/1', objectFit: 'cover', objectPosition: 'center' }} />
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
      <section ref={ctaRef} className="py-32 px-8 text-center" style={{ background: '#ede5f5' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity: 0, letterSpacing: '-0.05em', y: 20 }} animate={ctaInView ? { opacity: 1, letterSpacing: '-0.01em', y: 0 } : { opacity: 0, letterSpacing: '-0.05em', y: 20 }} transition={{ duration: 0.85, ease: EASE }} className="font-serif text-5xl md:text-6xl leading-tight mb-6" style={{ color: ACCENT_DARK }}>
            {cta.titleLine1}<br /><span className="italic font-normal">{cta.titleHighlight}</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.6, delay: 0.15 }} className="text-xl font-light leading-relaxed mb-12" style={{ color: '#73736e' }}>{cta.text}</motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.6, delay: 0.28 }} className="flex flex-col sm:flex-row justify-center gap-6">
            <motion.button whileHover={{ scale: 1.06, y: -3, boxShadow: '0 18px 40px rgba(156,123,181,0.35)' }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} onClick={() => (window.location.href = '/contact')} className="text-white font-bold uppercase tracking-[0.2em] text-xs px-14 py-6 rounded-full shadow-xl" style={{ background: ACCENT, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{cta.primaryButton}</motion.button>
            <motion.button whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} onClick={() => (window.location.href = '/contact')} className="font-bold uppercase tracking-[0.2em] text-xs pb-1" style={{ background: 'transparent', border: 'none', borderBottom: `2px solid rgba(156,123,181,0.3)`, cursor: 'pointer', fontFamily: 'inherit', color: ACCENT_DARK }} onMouseEnter={e => (e.currentTarget.style.borderBottomColor = ACCENT)} onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'rgba(156,123,181,0.3)')}>{cta.secondaryButton}</motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}