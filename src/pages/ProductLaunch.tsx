import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  motion, useScroll, useTransform, useSpring, useMotionValue, useInView,
} from 'motion/react';
import type { Variants } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { clients } from '../lib/clients';
import { asset } from '../lib/content';
import content from '../content/pages/product-launch.json';

// Page words and photos: src/content/pages/product-launch.json (admin → Pages → Product Launch)
const { hero, about, categories, products, customization, why, trust, cta } = content;

/* ═══════════════════════════════════════════════════════
   TILT HOOK
═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   CONSTANTS & VARIANTS
═══════════════════════════════════════════════════════ */
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const vFadeUp: Variants = { hidden: { opacity: 0, y: 44 }, show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } } };
const vStagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.13 } } };
const vScaleIn: Variants = { hidden: { opacity: 0, scale: 0.6, rotateX: -55 }, show: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.95, ease: EASE } } };
const vSlideLeft: Variants = { hidden: { opacity: 0, x: -48 }, show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } } };
const vSlideRight: Variants = { hidden: { opacity: 0, x: 48 }, show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } } };

const ACCENT = '#5b8fa8';
const ACCENT_DARK = '#0a1520';

/* ═══════════════════════════════════════════════════════
   PRODUCT LAUNCH CANVAS
═══════════════════════════════════════════════════════ */
const LaunchCanvas: React.FC = () => {
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

    /* ── palette ── */
    const BLUE = ['#5b8fa8', '#7bb8d4', '#3a6b82', '#93c5d8', '#2e5571'];
    const GOLD = ['#FFD700', '#FFC84B', '#E8C882', '#C9A96E', '#FFB347'];
    const WHITE = ['#ffffff', '#e8f0f5', '#d0e4ef'];
    const CYAN = ['#60ece0', '#38d9cc', '#80f0e8'];
    const ALL = [...BLUE, ...GOLD, ...WHITE, ...CYAN];

    function rnd(a: number, b: number) { return Math.random() * (b - a) + a; }
    function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

    const REPULSE = 160, REPULSE_F = 1.4;
    function applyRepulse<T extends { x: number; y: number; vx: number; vy: number }>(o: T, mx: number, my: number, f = 1) {
      const dx = o.x - mx, dy = o.y - my, d = Math.hypot(dx, dy);
      if (d < REPULSE && d > 0) { const frc = (REPULSE - d) / REPULSE; o.vx += (dx / d) * frc * REPULSE_F * f; o.vy += (dy / d) * frc * REPULSE_F * f; }
    }
    function wrapEdge<T extends { x: number; y: number }>(o: T, m = 25) {
      if (o.x < -m) o.x = W + m; if (o.x > W + m) o.x = -m;
      if (o.y < -m) o.y = H + m; if (o.y > H + m) o.y = -m;
    }

    /* ════════════════════════════════════════
       1. ROCKET PARTICLES
    ════════════════════════════════════════ */
    interface Rocket {
      x: number; y: number; vx: number; vy: number;
      size: number; col: string; alpha: number;
      trail: { x: number; y: number }[];
      exhaust: number;
    }

    // function makeRocket(): Rocket {
    //   return {
    //     x: rnd(W * 0.2, W * 0.8), y: H + 20,
    //     vx: rnd(-0.3, 0.3), vy: -(1.5 + rnd(0, 2.5)),
    //     size: rnd(7, 11), col: pick([...BLUE, ...CYAN]),
    //     alpha: rnd(0.5, 0.9), trail: [], exhaust: rnd(0, Math.PI * 2),
    //   };
    // }
   function makeRocket(): Rocket {
  const angle = -Math.PI / 2 + rnd(-0.8, 0.8);

  return {
    x: rnd(W * 0.2, W * 0.8),
    y: H + 20,  
    vx: Math.cos(angle) * rnd(1, 3),
    vy: Math.sin(angle) * rnd(1, 3),
    size: rnd(7, 12),
    col: pick([...BLUE, ...CYAN]),
    alpha: rnd(0.5, 0.9),
    trail: [],
    exhaust: rnd(0, Math.PI * 2),
  };
}

    const ROCKETS: Rocket[] = Array.from({ length: 30 }, makeRocket);

    function drawRocket(r: Rocket, mx: number, my: number) {
      r.exhaust += 0.15;
      r.x += r.vx; r.y += r.vy;
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 20) r.trail.shift();
      if (r.y < -40) { Object.assign(r, makeRocket()); return; }

      const near = mx > -999 && Math.hypot(r.x - mx, r.y - my) < 140;

      // Exhaust trail
      for (let i = 0; i < r.trail.length - 1; i++) {
        const prog = i / r.trail.length;
        ctx.beginPath();
        ctx.moveTo(r.trail[i].x, r.trail[i].y);
        ctx.lineTo(r.trail[i + 1].x, r.trail[i + 1].y);
        ctx.strokeStyle = `rgba(255,200,80,${prog * r.alpha * 0.4})`;
        ctx.lineWidth = r.size * prog * 0.6;
        ctx.stroke();
      }

      // Exhaust glow
      const eg = ctx.createRadialGradient(r.x, r.y + r.size, 0, r.x, r.y + r.size * 2, r.size * 3);
      eg.addColorStop(0, `rgba(255,180,60,${r.alpha * 0.5 + Math.sin(r.exhaust) * 0.15})`);
      eg.addColorStop(1, 'transparent');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.arc(r.x, r.y + r.size, r.size * 3, 0, Math.PI * 2); ctx.fill();

      // Rocket body (arrow shape)
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.globalAlpha = r.alpha * (near ? 1.3 : 1);

      if (near) { ctx.shadowBlur = 20; ctx.shadowColor = r.col; }

      // Body
      ctx.fillStyle = r.col;
      ctx.beginPath();
      ctx.moveTo(0, -r.size * 1.5);
      ctx.lineTo(-r.size * 0.5, r.size * 0.5);
      ctx.lineTo(r.size * 0.5, r.size * 0.5);
      ctx.closePath();
      ctx.fill();

      // Fins
      ctx.fillStyle = pick(GOLD);
      ctx.beginPath();
      ctx.moveTo(-r.size * 0.5, r.size * 0.3);
      ctx.lineTo(-r.size * 0.9, r.size * 0.8);
      ctx.lineTo(-r.size * 0.3, r.size * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r.size * 0.5, r.size * 0.3);
      ctx.lineTo(r.size * 0.9, r.size * 0.8);
      ctx.lineTo(r.size * 0.3, r.size * 0.5);
      ctx.closePath(); ctx.fill();

      // Window
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = r.alpha * 0.7;
      ctx.beginPath(); ctx.arc(0, -r.size * 0.3, r.size * 0.2, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    /* ════════════════════════════════════════
       2. FLOATING PRODUCT BOXES
    ════════════════════════════════════════ */
    interface PBox {
      x: number; y: number; vx: number; vy: number;
      driftX: number; driftY: number;
      size: number; rot: number; rotSpd: number;
      col: string; lidCol: string;
      pulse: number; alpha: number;
    }

    function makeBox(): PBox {
      const ang = rnd(0, Math.PI * 2), spd = rnd(0.12, 0.35);
      return {
        x: rnd(0, W), y: rnd(0, H),
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        driftX: Math.cos(ang) * spd, driftY: Math.sin(ang) * spd,
        size: rnd(16, 38), rot: rnd(0, Math.PI * 2), rotSpd: rnd(-0.006, 0.006),
        col: pick(BLUE), lidCol: pick(GOLD),
        pulse: rnd(0, Math.PI * 2), alpha: rnd(0.3, 0.65),
      };
    }

    const BOXES: PBox[] = Array.from({ length: 10 }, makeBox);

    function drawBox(b: PBox, mx: number, my: number) {
      b.pulse += 0.03; b.rot += b.rotSpd;
      applyRepulse(b, mx, my, 0.7);
      b.vx += (b.driftX - b.vx) * 0.04; b.vy += (b.driftY - b.vy) * 0.04;
      const spd = Math.hypot(b.vx, b.vy); if (spd > 2) { b.vx = (b.vx / spd) * 2; b.vy = (b.vy / spd) * 2; }
      b.x += b.vx; b.y += b.vy; wrapEdge(b);

      const s = b.size * (0.92 + Math.sin(b.pulse) * 0.08);
      const near = mx > -999 && Math.hypot(b.x - mx, b.y - my) < 150;
      const al = near ? Math.min(1, b.alpha * 1.7) : b.alpha;

      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.globalAlpha = al;
      if (near) { ctx.shadowBlur = 22; ctx.shadowColor = b.col; }

      // Box body
      ctx.fillStyle = b.col;
      ctx.beginPath(); ctx.roundRect(-s / 2, 0, s, s * 0.7, 3); ctx.fill();
      // Lid
      ctx.fillStyle = b.lidCol;
      ctx.beginPath(); ctx.roundRect(-s / 2 - 2, -s * 0.18, s + 4, s * 0.22, 2); ctx.fill();
      // Ribbon vertical
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = al * 0.4;
      ctx.fillRect(-s * 0.08, -s * 0.18, s * 0.16, s * 0.88);
      // Star badge
      ctx.globalAlpha = al * 0.8;
      ctx.fillStyle = pick(GOLD);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const r2 = i % 2 === 0 ? s * 0.14 : s * 0.06;
        i === 0 ? ctx.moveTo(r2 * Math.cos(a), s * 0.35 + r2 * Math.sin(a))
          : ctx.lineTo(r2 * Math.cos(a), s * 0.35 + r2 * Math.sin(a));
      }
      ctx.closePath(); ctx.fill();

      ctx.restore();
    }

    /* ════════════════════════════════════════
       3. LAUNCH STREAK LINES (speed lines)
    ════════════════════════════════════════ */
    interface Streak {
      x: number; y: number; len: number; speed: number;
      col: string; alpha: number; angle: number;
    }

    const STREAKS: Streak[] = Array.from({ length: 25 }, () => ({
      x: rnd(0, W), y: rnd(0, H),
      len: rnd(30, 100), speed: rnd(2, 6),
      col: pick([...BLUE, ...CYAN, '#fff']),
      alpha: rnd(0.03, 0.12),
      angle: -Math.PI / 2 + rnd(-0.3, 0.3),
    }));

    function drawStreaks() {
      STREAKS.forEach(s => {
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        if (s.y < -s.len) { s.y = H + s.len; s.x = rnd(0, W); }

        ctx.save(); ctx.globalAlpha = s.alpha;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x + Math.cos(s.angle) * s.len, s.y + Math.sin(s.angle) * s.len);
        grad.addColorStop(0, s.col);
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len);
        ctx.stroke();
        ctx.restore();
      });
    }

    /* ════════════════════════════════════════
       4. PULSE RINGS (countdown-style)
    ════════════════════════════════════════ */
    interface PulseRing {
      x: number; y: number; r: number; maxR: number;
      life: number; col: string; speed: number;
    }

    const PULSE_RINGS: PulseRing[] = [];
    let pulseSpawnTimer = 0;

    function spawnPulseRing(x?: number, y?: number) {
      PULSE_RINGS.push({
        x: x ?? rnd(W * 0.2, W * 0.8),
        y: y ?? rnd(H * 0.2, H * 0.8),
        r: 0, maxR: rnd(60, 140),
        life: 1, col: pick([...BLUE, ...CYAN]),
        speed: rnd(0.008, 0.018),
      });
    }

    /* ════════════════════════════════════════
       5. SPOTLIGHT BEAMS
    ════════════════════════════════════════ */
    interface Spotlight {
      originX: number; phase: number; speed: number;
      spread: number; hue: string; intensity: number;
    }

    const SPOTLIGHTS: Spotlight[] = [
      { originX: 0.15, phase: 0, speed: 0.0008, spread: 0.2, hue: '#5b8fa8', intensity: 0.12 },
      { originX: 0.5, phase: 2, speed: 0.0012, spread: 0.15, hue: '#FFD700', intensity: 0.08 },
      { originX: 0.85, phase: 4, speed: 0.0007, spread: 0.22, hue: '#60ece0', intensity: 0.10 },
    ];

    function drawSpotlights() {
      SPOTLIGHTS.forEach(sl => {
        sl.phase += sl.speed;
        const angle = Math.PI / 2 + Math.sin(sl.phase) * sl.spread;
        const ox = W * sl.originX, oy = -10;
        const len = H * 1.3;
        const spr = 0.12;
        const lx = ox + Math.cos(angle - spr) * len;
        const ly = oy + Math.sin(angle - spr) * len;
        const rx = ox + Math.cos(angle + spr) * len;
        const ry = oy + Math.sin(angle + spr) * len;
        const cx = ox + Math.cos(angle) * len;
        const cy = oy + Math.sin(angle) * len;

        const grad = ctx.createRadialGradient(ox, oy, 0, cx, cy, len * 0.7);
        grad.addColorStop(0, `rgba(91,143,168,${sl.intensity * 1.5})`);
        grad.addColorStop(0.4, `rgba(91,143,168,${sl.intensity * 0.6})`);
        grad.addColorStop(1, 'transparent');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(lx, ly);
        ctx.quadraticCurveTo(cx, cy, rx, ry);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Source dot
        const sg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 20);
        sg.addColorStop(0, `rgba(255,255,255,0.4)`);
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(ox, oy, 20, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }

    /* ════════════════════════════════════════
       6. NETWORK NODES
    ════════════════════════════════════════ */
    interface NetNode {
      x: number; y: number; vx: number; vy: number;
      driftX: number; driftY: number;
      pulse: number; col: string; r: number;
    }

    const NODES: NetNode[] = Array.from({ length: 50 }, () => {
      const ang = rnd(0, Math.PI * 2), spd = rnd(0.1, 0.3);
      return {
        x: rnd(0, W), y: rnd(0, H),
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        driftX: Math.cos(ang) * spd, driftY: Math.sin(ang) * spd,
        pulse: rnd(0, Math.PI * 2), col: pick([...BLUE, ...GOLD]),
        r: rnd(1.5, 3),
      };
    });

    function drawNetwork(mx: number, my: number) {
      const LINK = 110;
      NODES.forEach(n => {
        n.pulse += 0.025;
        if (mx > -999) {
          const dx = n.x - mx, dy = n.y - my, d = Math.hypot(dx, dy);
          if (d < 140 && d > 0) { const f = (140 - d) / 140; n.vx += (dx / d) * f * 1.2; n.vy += (dy / d) * f * 1.2; }
        }
        n.vx += (n.driftX - n.vx) * 0.04; n.vy += (n.driftY - n.vy) * 0.04;
        const spd = Math.hypot(n.vx, n.vy); if (spd > 2.5) { n.vx = (n.vx / spd) * 2.5; n.vy = (n.vy / spd) * 2.5; }
        n.x += n.vx; n.y += n.vy;
        if (n.x < -10) n.x = W + 10; if (n.x > W + 10) n.x = -10;
        if (n.y < -10) n.y = H + 10; if (n.y > H + 10) n.y = -10;
      });

      // Links
      for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
          const a = NODES[i], b = NODES[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(91,143,168,${(1 - d / LINK) * 0.14})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }

      // Nodes
      NODES.forEach(n => {
        const pr = n.r + Math.sin(n.pulse) * 0.5;
        ctx.beginPath(); ctx.arc(n.x, n.y, pr, 0, Math.PI * 2);
        ctx.fillStyle = n.col; ctx.globalAlpha = 0.45; ctx.fill();
        ctx.globalAlpha = 1;
      });
    }

    /* ════════════════════════════════════════
       7. 4-POINT STARS (twinkling)
    ════════════════════════════════════════ */
    interface Star4 {
      x: number; y: number; vx: number; vy: number;
      driftX: number; driftY: number;
      r: number; rot: number; rotSpd: number;
      col: string; pulse: number; twinkle: number; twSpd: number;
    }

    const STARS: Star4[] = Array.from({ length: 22 }, () => {
      const ang = rnd(0, Math.PI * 2), spd = rnd(0.08, 0.4);
      return {
        x: rnd(0, W), y: rnd(0, H),
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        driftX: Math.cos(ang) * spd, driftY: Math.sin(ang) * spd,
        r: rnd(3, 12), rot: rnd(0, Math.PI * 2), rotSpd: rnd(-0.018, 0.018),
        col: pick([...GOLD, ...CYAN, '#fff']),
        pulse: rnd(0, Math.PI * 2), twinkle: rnd(0, Math.PI * 2), twSpd: rnd(0.03, 0.08),
      };
    });

    function drawStars(mx: number, my: number) {
      STARS.forEach(s => {
        s.pulse += 0.04; s.twinkle += s.twSpd; s.rot += s.rotSpd;
        applyRepulse(s, mx, my, 0.6);
        s.vx += (s.driftX - s.vx) * 0.04; s.vy += (s.driftY - s.vy) * 0.04;
        const spd = Math.hypot(s.vx, s.vy); if (spd > 2.5) { s.vx = (s.vx / spd) * 2.5; s.vy = (s.vy / spd) * 2.5; }
        s.x += s.vx; s.y += s.vy; wrapEdge(s);

        const near = mx > -999 && Math.hypot(s.x - mx, s.y - my) < 140;
        const r = s.r * (0.85 + Math.sin(s.pulse) * 0.18);
        const al = near ? 1 : (0.3 + Math.sin(s.twinkle) * 0.55);

        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = al;
        if (near) { ctx.shadowBlur = 16; ctx.shadowColor = s.col; }
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const rad = i % 2 === 0 ? r : r * 0.35;
          i === 0 ? ctx.moveTo(rad * Math.cos(a), rad * Math.sin(a)) : ctx.lineTo(rad * Math.cos(a), rad * Math.sin(a));
        }
        ctx.closePath();
        ctx.fillStyle = near ? '#fff' : s.col; ctx.fill();
        ctx.globalAlpha = al * 0.5; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }

    /* ════════════════════════════════════════
       8. SPARKS
    ════════════════════════════════════════ */
    interface Spark { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number; }
    const SPARKS: Spark[] = [];
    let sparkTimer = 0;

    function spawnSpark(sx: number, sy: number, count = 6) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3.5;
        SPARKS.push({ x: sx, y: sy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col: pick(ALL), r: 1.5 + Math.random() * 2.5 });
      }
    }

    /* ════════════════════════════════════════
       9. SILK RIBBON WAVES
    ════════════════════════════════════════ */
    interface SilkRibbon { yBase: number; phase: number; speed: number; amp: number; freq: number; col: string; width: number; alpha: number; }
    const SILK: SilkRibbon[] = Array.from({ length: 5 }, (_, i) => ({
      yBase: 0.12 + i * 0.2, phase: rnd(0, Math.PI * 2), speed: rnd(0.004, 0.01),
      amp: rnd(8, 28), freq: rnd(0.008, 0.016), col: pick([...BLUE, ...CYAN]),
      width: rnd(0.4, 1.5), alpha: rnd(0.025, 0.065),
    }));

    let frame = 0;

    /* ════════════════════════════════════════
       MAIN LOOP
    ════════════════════════════════════════ */
    function loop() {
      const { x: mx, y: my } = mouseRef.current;
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // Background
      const bg = ctx.createLinearGradient(0, 0, W * 0.5, H);
      bg.addColorStop(0, '#040a12');
      bg.addColorStop(0.45, '#0a1822');
      bg.addColorStop(1, '#061018');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Center glow
      const cg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.5);
      cg.addColorStop(0, 'rgba(91,143,168,0.06)');
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

      // Silk waves
      SILK.forEach(r => {
        r.phase += r.speed;
        ctx.save(); ctx.globalAlpha = r.alpha;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const y = r.yBase * H + r.amp * Math.sin(x * r.freq + r.phase) + r.amp * 0.4 * Math.sin(x * r.freq * 2 + r.phase * 1.3);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = r.col; ctx.lineWidth = r.width * 2; ctx.stroke();
        ctx.restore();
      });

      // Spotlights
      drawSpotlights();

      // Streak lines
      drawStreaks();

      // Network
      drawNetwork(mx, my);

      // Product boxes
      BOXES.forEach(b => drawBox(b, mx, my));

      // Rockets
      ROCKETS.forEach(r => drawRocket(r, mx, my));

      // Stars
      drawStars(mx, my);

      // Pulse rings
      pulseSpawnTimer++;
      if (pulseSpawnTimer > 80 + Math.floor(Math.random() * 60)) {
        pulseSpawnTimer = 0;
        spawnPulseRing();
      }
      for (let i = PULSE_RINGS.length - 1; i >= 0; i--) {
        const pr = PULSE_RINGS[i];
        pr.r += (pr.maxR - pr.r) * pr.speed + 0.8;
        pr.life -= 0.012;
        if (pr.life <= 0) { PULSE_RINGS.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(91,143,168,${pr.life * 0.35})`;
        ctx.lineWidth = 2 * pr.life;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2); ctx.stroke();
        // Inner ring
        ctx.strokeStyle = `rgba(255,255,255,${pr.life * 0.12})`;
        ctx.lineWidth = 0.8 * pr.life;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 0.6, 0, Math.PI * 2); ctx.stroke();
      }

      // Sparks
      sparkTimer++;
      if (sparkTimer > 50 + Math.floor(Math.random() * 30)) {
        sparkTimer = 0;
        spawnSpark(rnd(0, W), rnd(0, H), 6);
      }
      if (mx > -999 && frame % 8 === 0) spawnSpark(mx, my, 4);

      ctx.save();
      for (let i = SPARKS.length - 1; i >= 0; i--) {
        const s = SPARKS[i];
        s.x += s.vx; s.y += s.vy; s.vy -= 0.04; s.life -= 0.06;
        if (s.life <= 0) { SPARKS.splice(i, 1); continue; }
        ctx.globalAlpha = s.life;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
        ctx.fillStyle = s.col; ctx.fill();
        // Cross glint
        ctx.beginPath();
        ctx.moveTo(s.x - 5 * s.life, s.y); ctx.lineTo(s.x + 5 * s.life, s.y);
        ctx.moveTo(s.x, s.y - 5 * s.life); ctx.lineTo(s.x, s.y + 5 * s.life);
        ctx.strokeStyle = s.col; ctx.lineWidth = 0.6; ctx.globalAlpha = s.life * 0.5; ctx.stroke();
      }
      ctx.restore();

      // Mouse glow
      if (mx > -9999) {
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 120);
        mg.addColorStop(0, 'rgba(91,143,168,0.12)');
        mg.addColorStop(0.5, 'rgba(96,236,224,0.04)');
        mg.addColorStop(1, 'transparent');
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
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      display: 'block', zIndex: 0, pointerEvents: 'none',
    }} />
  );
};

/* ═══════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════ */
const PRODUCTS = products.items;

const CATEGORIES = categories.items;

const CUSTOM_ITEMS = customization.items;

const WHY = why.items;

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════ */
function CategoryCard({ item, index }: { item: typeof CATEGORIES[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { ref, springX, springY, onMouseMove, onMouseLeave } = useTilt(12);
  return (
    <motion.div variants={vScaleIn} style={{ perspective: '1400px', transformStyle: 'preserve-3d' }} className="cursor-pointer">
      <motion.div ref={ref} onMouseMove={onMouseMove} onMouseLeave={() => { onMouseLeave(); setHovered(false); }} onMouseEnter={() => setHovered(true)}
        style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', willChange: 'transform', boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.12)' : '0 2px 10px rgba(0,0,0,0.06)', transition: 'box-shadow 0.4s', borderRadius: 16, overflow: 'hidden', background: 'white' }}>
        <div style={{ height: 280, overflow: 'hidden', position: 'relative' }}>
          <motion.img src={asset(item.img)} alt={item.name} className="w-full h-full object-cover" animate={{ scale: hovered ? 1.07 : 1 }} transition={{ duration: 0.75, ease: EASE }} style={{ willChange: 'transform' }} />
          <motion.div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: item.accent }} animate={{ opacity: hovered ? 0.18 : 0 }} transition={{ duration: 0.4 }} />
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
        <motion.img src={asset(item.img)} alt={item.name} className="w-full h-full object-cover" animate={{ scale: hovered ? 1.06 : 1 }} transition={{ duration: 0.65, ease: EASE }} style={{ willChange: 'transform' }} />
        <span className="absolute top-4 left-4 text-[10px] font-bold uppercase text-white px-4 py-1 rounded-full" style={{ background: 'rgba(58,107,130,0.88)', backdropFilter: 'blur(6px)', letterSpacing: 2 }}>{item.tag}</span>
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
      <motion.div className="flex items-center justify-center mx-auto mb-5 rounded-full text-3xl" style={{ width: 64, height: 64 }} animate={{ background: hovered ? ACCENT : '#e8f0f5', color: hovered ? 'white' : ACCENT_DARK }} transition={{ duration: 0.3 }}>{item.symbol}</motion.div>
      <h4 className="font-bold text-xs uppercase tracking-widest mb-2">{item.title}</h4>
      <p className="text-xs font-light leading-relaxed" style={{ color: '#73736e' }}>{item.desc}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function ProductLaunch() {
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
    <div className="overflow-x-hidden" style={{ background: '#f2f6f9', fontFamily: 'inherit' }}>

      {/* ══ HERO ══ */}
      <section ref={heroRef} className="relative flex items-center overflow-hidden" style={{ minHeight: '100vh', perspective: '1400px' }}>
        {/* Background image with parallax */}
        <motion.div style={{ y: springImg, willChange: 'transform' }} className="absolute inset-0">
          <img src={asset(hero.backgroundImage)} alt={hero.backgroundImageAlt}
            className="w-full h-full object-cover" style={{ minHeight: '120%', filter: 'brightness(0.35)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg,rgba(0,0,0,0.65) 0%,rgba(0,0,0,0.28) 55%,rgba(0,0,0,0.08) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-28" style={{ background: 'linear-gradient(to top,rgba(91,143,168,0.12) 0%,transparent 100%)' }} />
        </motion.div>

        {/* ★ CANVAS ★ */}
        <LaunchCanvas />

        {/* Diagonal accent lines */}
        {[...Array(5)].map((_, i) => (
          <motion.div key={i} style={{
            position: 'absolute', width: '100%', height: 1,
            top: `${18 + i * 15}%`, transform: `rotate(${-14 + i * 1.8}deg)`,
            background: 'linear-gradient(90deg,transparent,rgba(91,143,168,0.12),transparent)',
            zIndex: 2, pointerEvents: 'none',
          }} initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 + i * 0.12 }} />
        ))}

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 18%, rgba(4,10,18,0.70) 100%)',
          zIndex: 3, pointerEvents: 'none',
        }} />

        {/* Hero text */}
        <motion.div style={{ y: springTxt, opacity: heroOpacity, willChange: 'transform' }}
          className="absolute bottom-20 left-8 md:left-20 z-10 max-w-3xl px-4">
          <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[10px] uppercase tracking-[0.32em] font-bold text-white/60 mb-5 flex items-center gap-3">
            <span className="w-10 h-px inline-block" style={{ background: ACCENT }} />{hero.eyebrow}
          </motion.p>
          <h1 className="font-serif text-white" style={{ fontSize: 'clamp(3rem,7vw,6rem)', lineHeight: 1.08 }}>
            {[hero.titleLine1, hero.titleLine2].map((word, i) => (
              <motion.span key={word} initial={{ rotateX: -90, opacity: 0, y: 40 }} animate={{ rotateX: 0, opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.15, ease: EASE }}
                style={{ display: 'block', transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>{word}</motion.span>
            ))}
            <motion.span initial={{ rotateX: -90, opacity: 0, y: 40 }} animate={{ rotateX: 0, opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
              style={{ display: 'block', fontStyle: 'italic', fontWeight: 400, color: ACCENT, transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>
              {hero.titleHighlight}
            </motion.span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.8 }}
            className="text-white/80 mt-6 max-w-md text-lg font-light leading-relaxed">
            {hero.intro}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 1.05 }}
            className="flex gap-4 mt-10 flex-wrap">
            <motion.button whileHover={{ scale: 1.05, y: -2, boxShadow: '0 12px 32px rgba(91,143,168,0.45)' }}
              whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full"
              style={{ background: ACCENT, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 30px rgba(91,143,168,0.4)' }}>
              {hero.primaryButton}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, y: -2, background: 'white', color: ACCENT_DARK }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              onClick={() => (window.location.href = '/contact')}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {hero.secondaryButton}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold">{hero.scrollLabel}</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 28, background: `linear-gradient(to bottom,${ACCENT},transparent)` }} />
        </motion.div>
      </section>

      {/* ══ ABOUT ══ */}
      <section ref={aboutRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#f2f6f9' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vStagger} initial="hidden" animate={aboutInView ? 'show' : 'hidden'}>
            <motion.div variants={vFadeUp}>
              <motion.div initial={{ scaleX: 0 }} animate={aboutInView ? { scaleX: 1 } : { scaleX: 0 }} transition={{ duration: 0.55, ease: EASE }} style={{ originX: 0, height: 3, width: 80, background: ACCENT, marginBottom: 24 }} />
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-4" style={{ color: ACCENT }}>{about.eyebrow}</p>
            </motion.div>
            <motion.h2 variants={vFadeUp} className="text-5xl font-serif leading-tight mb-8" style={{ color: ACCENT_DARK }}>{about.titleLine1}<br />{about.titleLine2}</motion.h2>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-5" style={{ color: '#73736e' }}>{about.paragraph1}</motion.p>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-10" style={{ color: '#73736e' }}>{about.paragraph2}</motion.p>
            <motion.div variants={vFadeUp} className="flex items-center gap-4 pt-8" style={{ borderTop: '1px solid #c8dce6' }}>
              <div className="flex items-center justify-center rounded-full text-2xl flex-shrink-0" style={{ width: 48, height: 48, background: '#d9eaf2' }}>{about.badgeSymbol}</div>
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
      <section ref={catRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#e4eef4' }}>
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
      <section className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#f2f6f9' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.6 }} className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-5xl font-serif mb-2" style={{ color: ACCENT_DARK }}>{products.title}</h2>
              <p className="font-light" style={{ color: '#73736e' }}>{products.intro}</p>
            </div>
            <motion.a whileHover={{ y: -1 }} className="font-bold text-xs uppercase tracking-widest border-b-2 pb-1 cursor-pointer" style={{ borderColor: ACCENT, color: ACCENT_DARK }}>{products.viewAllText}</motion.a>
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
            <h2 className="text-5xl font-serif text-white leading-tight mb-6">{customization.title}<br /><span style={{ color: '#93c5d8', fontStyle: 'italic', fontWeight: 400 }}>{customization.titleHighlight}</span></h2>
            <p className="text-lg font-light leading-relaxed mb-12" style={{ color: 'rgba(212,212,212,0.7)' }}>{customization.intro}</p>
            <motion.div variants={vStagger} initial="hidden" animate={custInView ? 'show' : 'hidden'} className="grid grid-cols-2 gap-8">
              {CUSTOM_ITEMS.map(item => (
                <motion.div key={item.title} variants={vFadeUp} className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center text-lg rounded-lg" style={{ width: 40, height: 40, border: '1px solid rgba(147,197,216,0.3)', color: '#93c5d8' }}>{item.symbol}</div>
                  <div>
                    <h5 className="font-semibold text-white text-sm mb-1">{item.title}</h5>
                    <p className="text-xs font-light leading-relaxed" style={{ color: 'rgba(212,212,212,0.6)' }}>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div variants={vSlideRight} initial="hidden" animate={custInView ? 'show' : 'hidden'} style={{ position: 'relative' }}>
            <div className="absolute inset-0 rounded-3xl opacity-40" style={{ background: ACCENT, transform: 'rotate(3deg) scale(0.95)' }} />
            <div className="relative rounded-3xl overflow-hidden p-6" style={{ background: '#e4eef4' }}>
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
      <section ref={ctaRef} className="py-32 px-8 text-center" style={{ background: '#e4eef4' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity: 0, letterSpacing: '-0.05em', y: 20 }} animate={ctaInView ? { opacity: 1, letterSpacing: '-0.01em', y: 0 } : { opacity: 0, letterSpacing: '-0.05em', y: 20 }} transition={{ duration: 0.85, ease: EASE }} className="font-serif text-5xl md:text-6xl leading-tight mb-6" style={{ color: ACCENT_DARK }}>
            {cta.titleLine1}<br /><span className="italic font-normal">{cta.titleHighlight}</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.6, delay: 0.15 }} className="text-xl font-light leading-relaxed mb-12" style={{ color: '#73736e' }}>{cta.intro}</motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.6, delay: 0.28 }} className="flex flex-col sm:flex-row justify-center gap-6">
            <motion.button whileHover={{ scale: 1.06, y: -3, boxShadow: '0 18px 40px rgba(91,143,168,0.35)' }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} onClick={() => (window.location.href = '/get-proposal')} className="text-white font-bold uppercase tracking-[0.2em] text-xs px-14 py-6 rounded-full shadow-xl" style={{ background: ACCENT, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{cta.primaryButton}</motion.button>
            <motion.button whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} className="font-bold uppercase tracking-[0.2em] text-xs pb-1" onClick={() => (window.location.href = '/contact')} style={{ background: 'transparent', border: 'none', borderBottom: '2px solid rgba(91,143,168,0.3)', cursor: 'pointer', fontFamily: 'inherit', color: ACCENT_DARK }} onMouseEnter={e => (e.currentTarget.style.borderBottomColor = ACCENT)} onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'rgba(91,143,168,0.3)')}>{cta.secondaryButton}</motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}