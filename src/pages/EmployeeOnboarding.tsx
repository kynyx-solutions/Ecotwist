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
import { ArrowRight, Sparkles, Package, Zap } from 'lucide-react';
import type { Variants } from 'motion/react';
import { asset } from '../lib/content';
import content from '../content/pages/employee-onboarding.json';
import { clients, type Client } from '../lib/clients';

// Page words and photos: src/content/pages/employee-onboarding.json (admin → Pages → Employee Onboarding)
const { hero, stats, philosophy, collections, products, personalization, why, cta } = content;

/* ═══════════════════════════════════════════════════════
   CONSTANTS & BRAND TOKENS
═══════════════════════════════════════════════════════ */
const BRAND = {
  olive:     '#b5a26a',
  darkOlive: '#2f3528',
  beige:     '#f7f4f0',
  offWhite:  '#faf9f7',
  charcoal:  '#1a1a18',
} as const;

const EASING = {
  smooth:  [0.22, 1, 0.36, 1] as const,
  spring:  [0.16, 1, 0.3,  1] as const,
  sharp:   [0.4,  0, 0.2,  1] as const,
} as const;

/* ═══════════════════════════════════════════════════════
   CANVAS ENGINE — Rewritten for Performance & Beauty
═══════════════════════════════════════════════════════ */

/* ── Typed interfaces ── */
interface Vec2   { x: number; y: number }
interface Ripple { x:number; y:number; r:number; maxR:number; life:number; hue:number; delay:number }
interface Bloom  { x:number; y:number; petals:number; r:number; maxR:number; life:number; hue:number; rot:number }
interface Well   { x:number; y:number; life:number; hue:number; strength:number }
interface Node   {
  x:number; y:number; vx:number; vy:number;
  ox:number; oy:number; hue:number; r:number;
  pulse:number; pulseSpd:number; excited:number; breathPhase:number;
}
interface Pulse  {
  fromIdx:number; toIdx:number; t:number; spd:number;
  hue:number; size:number; trail:Vec2[];
}
interface Particle {
  x:number; y:number; vx:number; vy:number; r:number; hue:number;
  alpha:number; pulse:number; pulseSpd:number;
  wobble:number; wobbleSpd:number; fromClick:boolean; trail:Vec2[];
  life: number;
}
interface GeoShape {
  x:number; y:number; vx:number; vy:number; size:number; rot:number;
  rotSpd:number; type:'box'|'diamond'|'plus'; hue:number; alpha:number;
  pulse:number; pulseSpd:number; wobble:number; wobbleSpd:number;
}
interface ScanLine { y:number; spd:number; alpha:number; hue:number }
interface Shockwave { x:number; y:number; r:number; life:number; hue:number }

/* ── Hue palette ── */
const HUE_GROUPS = {
  gold:  [38, 42, 44, 46, 50],
  olive: [78, 80, 82, 85, 88, 92],
  cream: [42, 44, 46, 48, 50],
  warm:  [32, 35, 38, 40, 45],
} as const;
type HueGroup = keyof typeof HUE_GROUPS;
const ALL_HUES = [...HUE_GROUPS.gold, ...HUE_GROUPS.olive, ...HUE_GROUPS.cream];
const randH = (g?: HueGroup) => {
  const arr = g ? HUE_GROUPS[g] : ALL_HUES;
  return arr[Math.floor(Math.random() * arr.length)];
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function useOnboardingCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0, animId: number;
    let mx = -9999, my = -9999;
    let frame = 0, time = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* ── Collections ── */
    const RIPPLES:    Ripple[]    = [];
    const BLOOMS:     Bloom[]     = [];
    const WELLS:      Well[]      = [];
    const SHOCKWAVES: Shockwave[] = [];
    const NODES:      Node[]      = [];
    const PULSES:     Pulse[]     = [];
    const PARTICLES:  Particle[]  = [];
    const GEOS:       GeoShape[]  = [];
    const SCAN_LINES: ScanLine[]  = [
      { y: 0.15, spd: 0.00038, alpha: 0.05, hue: 42 },
      { y: 0.45, spd: 0.00052, alpha: 0.04, hue: 82 },
      { y: 0.72, spd: 0.00042, alpha: 0.04, hue: 44 },
      { y: 0.30, spd: 0.00068, alpha: 0.03, hue: 78 },
    ];

    /* ── DPR-aware resize ── */
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = container!.offsetWidth;
      H = container!.offsetHeight;
      canvas!.width  = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width  = W + 'px';
      canvas!.style.height = H + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (NODES.length === 0) initNodes();
      if (GEOS.length   === 0) initGeos();
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    /* ── Mouse ── */
    const toLocal = (e: MouseEvent): Vec2 => {
      const r = container!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMouseMove  = (e: MouseEvent) => { const p = toLocal(e); mx = p.x; my = p.y; };
    const onMouseLeave = () => { mx = -9999; my = -9999; };
    container.addEventListener('mousemove',  onMouseMove,  { passive: true });
    container.addEventListener('mouseleave', onMouseLeave, { passive: true });

    /* ── Click ── */
    const onClick = (e: MouseEvent) => {
      const { x: cx, y: cy } = toLocal(e);
      const hue = randH('gold');

      /* Staggered ripple rings */
      for (let i = 0; i < 5; i++)
        RIPPLES.push({ x: cx, y: cy, r: i * 18, maxR: 160 + i * 55, life: 1, hue, delay: i * 3 });

      /* Bloom */
      BLOOMS.push({
        x: cx, y: cy, petals: 7 + Math.floor(Math.random() * 5),
        r: 0, maxR: 65 + Math.random() * 35, life: 1, hue, rot: Math.PI / 4,
      });

      /* Shockwave */
      SHOCKWAVES.push({ x: cx, y: cy, r: 0, life: 1, hue });

      /* Gravity well */
      WELLS.push({ x: cx, y: cy, life: 1, hue, strength: 3 });

      /* Excite nearby nodes */
      NODES.forEach((n, idx) => {
        const d = Math.hypot(n.x - cx, n.y - cy);
        if (d < 220) {
          n.excited = Math.min(1, n.excited + (1 - d / 220) * 0.9);
          if (Math.random() > 0.4) spawnPulse(idx);
        }
      });

      /* Burst particles */
      for (let i = 0; i < 22; i++) spawnParticle(cx, cy, true);
    };
    container.addEventListener('click', onClick, { passive: true });

    /* ══════════════════════════════════════════
       NODE NETWORK
    ══════════════════════════════════════════ */
    function initNodes() {
      NODES.length = 0;
      const count = Math.min(70, Math.floor((W * H) / 14000));
      for (let i = 0; i < count; i++) {
        const x = Math.random() * (W || 800);
        const y = Math.random() * (H || 600);
        NODES.push({
          x, y, ox: x, oy: y,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          hue:        randH(Math.random() > 0.4 ? 'gold' : 'olive'),
          r:          1.4 + Math.random() * 1.8,
          pulse:      Math.random() * Math.PI * 2,
          pulseSpd:   0.014 + Math.random() * 0.018,
          excited:    0,
          breathPhase: Math.random() * Math.PI * 2,
        });
      }
    }

    function spawnPulse(fromIdx?: number) {
      const fi = fromIdx ?? Math.floor(Math.random() * NODES.length);
      let best = -1, bestD = 99999;
      for (let j = 0; j < NODES.length; j++) {
        if (j === fi) continue;
        const d = Math.hypot(NODES[fi].x - NODES[j].x, NODES[fi].y - NODES[j].y);
        if (d < 155 && d < bestD && Math.random() > 0.28) { best = j; bestD = d; }
      }
      if (best === -1) return;
      PULSES.push({
        fromIdx: fi, toIdx: best,
        t: 0, spd: 0.008 + Math.random() * 0.012,
        hue: NODES[fi].hue,
        size: 1.6 + Math.random() * 1.6,
        trail: [],
      });
    }

    let pulseTimer = 0;
    function updateDrawNetwork() {
      const LINK_DIST = 130;
      ctx!.save();

      NODES.forEach(n => {
        n.pulse       += n.pulseSpd;
        n.breathPhase += 0.006;
        n.excited      = Math.max(0, n.excited - 0.012);

        /* Home force */
        n.vx += (n.ox - n.x) * 0.00030;
        n.vy += (n.oy - n.y) * 0.00030;

        /* Mouse repel */
        if (mx > -999) {
          const dx = n.x - mx, dy = n.y - my;
          const d  = Math.hypot(dx, dy);
          if (d < 140 && d > 0) {
            const f = (140 - d) / 140;
            n.vx += (dx / d) * f * f * 0.9;
            n.vy += (dy / d) * f * f * 0.9;
          }
        }

        /* Gravity wells */
        WELLS.forEach(w => {
          const dx = w.x - n.x, dy = w.y - n.y;
          const d  = Math.hypot(dx, dy);
          if (d < 200 && d > 0) {
            const f = (1 - d / 200) * w.strength * w.life;
            n.vx += (dx / d) * f * 0.4;
            n.vy += (dy / d) * f * 0.4;
          }
        });

        n.vx *= 0.93; n.vy *= 0.93;
        n.x  += n.vx;  n.y  += n.vy;

        /* Boundary bounce */
        if (n.x < 0)  { n.x = 0;  n.vx *= -0.5; }
        if (n.x > W)  { n.x = W;  n.vx *= -0.5; }
        if (n.y < 0)  { n.y = 0;  n.vy *= -0.5; }
        if (n.y > H)  { n.y = H;  n.vy *= -0.5; }
      });

      /* ── Links ── */
      for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
          const a = NODES[i], b = NODES[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK_DIST * LINK_DIST) continue;
          const d   = Math.sqrt(d2);
          const t   = 1 - d / LINK_DIST;
          const exc = (a.excited + b.excited) * 0.5;
          const alpha = t * 0.20 + exc * 0.22;

          const grad = ctx!.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, `hsla(${a.hue},55%,72%,${alpha})`);
          grad.addColorStop(1, `hsla(${b.hue},55%,72%,${alpha})`);
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y);
          ctx!.strokeStyle = grad;
          ctx!.lineWidth   = 0.6 + exc * 0.9;
          ctx!.stroke();
        }
      }

      /* ── Pulses ── */
      for (let i = PULSES.length - 1; i >= 0; i--) {
        const p = PULSES[i];
        p.t += p.spd;
        if (p.t >= 1) {
          NODES[p.toIdx].excited = Math.min(1, NODES[p.toIdx].excited + 0.8);
          if (Math.random() > 0.30) spawnPulse(p.toIdx);
          PULSES.splice(i, 1); continue;
        }
        const na = NODES[p.fromIdx], nb = NODES[p.toIdx];
        const px = na.x + (nb.x - na.x) * p.t;
        const py = na.y + (nb.y - na.y) * p.t;

        p.trail.push({ x: px, y: py });
        if (p.trail.length > 8) p.trail.shift();

        /* Trail */
        for (let t = 0; t < p.trail.length - 1; t++) {
          const prog = t / p.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(p.trail[t].x, p.trail[t].y);
          ctx!.lineTo(p.trail[t + 1].x, p.trail[t + 1].y);
          ctx!.strokeStyle = `hsla(${p.hue},78%,82%,${prog * 0.55})`;
          ctx!.lineWidth   = p.size * prog * 0.7;
          ctx!.stroke();
        }

        /* Glow */
        const gr = ctx!.createRadialGradient(px, py, 0, px, py, p.size * 5);
        gr.addColorStop(0, `hsla(${p.hue},85%,90%,0.72)`);
        gr.addColorStop(1, `hsla(${p.hue},65%,65%,0)`);
        ctx!.beginPath(); ctx!.arc(px, py, p.size * 5, 0, Math.PI * 2);
        ctx!.fillStyle = gr; ctx!.fill();

        /* Core dot */
        ctx!.beginPath(); ctx!.arc(px, py, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue},92%,94%,0.95)`; ctx!.fill();
      }

      /* ── Nodes ── */
      NODES.forEach(n => {
        const breath = 1 + Math.sin(n.breathPhase) * 0.28;
        const pr     = n.r * breath + n.excited * 2.2;
        const base   = 0.12 + n.excited * 0.52 + Math.sin(n.pulse) * 0.05;

        /* Halo glow */
        const gr = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, pr * 5.5);
        gr.addColorStop(0,   `hsla(${n.hue},72%,84%,${base + 0.24})`);
        gr.addColorStop(0.4, `hsla(${n.hue},62%,64%,${base * 0.30})`);
        gr.addColorStop(1,   `hsla(${n.hue},50%,50%,0)`);
        ctx!.beginPath(); ctx!.arc(n.x, n.y, pr * 5.5, 0, Math.PI * 2);
        ctx!.fillStyle = gr; ctx!.fill();

        /* Core */
        ctx!.beginPath(); ctx!.arc(n.x, n.y, pr, 0, Math.PI * 2);
        ctx!.fillStyle = `hsl(${n.hue},68%,${76 + n.excited * 16}%)`;
        ctx!.fill();
      });

      pulseTimer++;
      if (pulseTimer > 10) { pulseTimer = 0; spawnPulse(); }
      ctx!.restore();
    }

    /* ══════════════════════════════════════════
       PARTICLES
    ══════════════════════════════════════════ */
    function spawnParticle(ex?: number, ey?: number, click = false) {
      const isClick = click && ex !== undefined;
      const angle   = isClick
        ? Math.random() * Math.PI * 2
        : -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      const spd = isClick ? 1.4 + Math.random() * 2.5 : 0.28 + Math.random() * 0.65;
      PARTICLES.push({
        x:         ex ?? Math.random() * W,
        y:         ey ?? H + 8,
        vx:        Math.cos(angle) * spd,
        vy:        Math.sin(angle) * spd,
        r:         isClick ? 1.8 + Math.random() * 3.8 : 1.2 + Math.random() * 2.8,
        hue:       randH(Math.random() > 0.3 ? 'gold' : 'cream'),
        alpha:     0.38 + Math.random() * 0.48,
        pulse:     Math.random() * Math.PI * 2,
        pulseSpd:  0.02 + Math.random() * 0.03,
        wobble:    Math.random() * Math.PI * 2,
        wobbleSpd: 0.025 + Math.random() * 0.035,
        fromClick: isClick,
        trail:     [],
        life:      1,
      });
    }

    let particleTimer = 0;
    function updateDrawParticles() {
      for (let i = PARTICLES.length - 1; i >= 0; i--) {
        const p = PARTICLES[i];
        p.pulse  += p.pulseSpd;
        p.wobble += p.wobbleSpd;
        p.x      += p.vx + Math.sin(p.wobble) * 0.40;
        p.y      += p.vy;
        p.vy     -= 0.009;
        p.alpha  -= p.fromClick ? 0.009 : 0.0028;
        p.life    = Math.max(0, p.life - 0.012);

        WELLS.forEach(w => {
          const dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy);
          if (d < 170 && d > 0) { p.x += (dx / d) * w.life * 1.0; p.y += (dy / d) * w.life * 1.0; }
        });

        if (p.alpha <= 0 || p.y < -20) { PARTICLES.splice(i, 1); continue; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 7) p.trail.shift();

        /* Trail */
        for (let t = 0; t < p.trail.length - 1; t++) {
          const prog = t / p.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(p.trail[t].x, p.trail[t].y);
          ctx!.lineTo(p.trail[t + 1].x, p.trail[t + 1].y);
          ctx!.strokeStyle = `hsla(${p.hue},72%,76%,${prog * p.alpha * 0.32})`;
          ctx!.lineWidth   = p.r * prog * 0.45;
          ctx!.stroke();
        }

        /* Glow */
        const glowR = p.r * (2.6 + Math.sin(p.pulse) * 0.85);
        const gr    = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        gr.addColorStop(0, `hsla(${p.hue},82%,90%,${p.alpha * 0.72})`);
        gr.addColorStop(1, `hsla(${p.hue},65%,65%,0)`);
        ctx!.beginPath(); ctx!.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx!.fillStyle = gr; ctx!.fill();

        /* Core */
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue},78%,90%,${p.alpha})`;
        ctx!.fill();
      }

      particleTimer++;
      if (particleTimer > 13) { particleTimer = 0; spawnParticle(); }
    }

    /* ══════════════════════════════════════════
       GEOMETRIC SHAPES
    ══════════════════════════════════════════ */
    function initGeos() {
      GEOS.length = 0;
      for (let i = 0; i < 20; i++) GEOS.push(makeGeo(true));
    }

    function makeGeo(initial: boolean): GeoShape {
      const types: GeoShape['type'][] = ['box', 'diamond', 'plus'];
      return {
        x: Math.random() * (W || 800),
        y: initial ? Math.random() * (H || 600) : (H || 600) + 20,
        vx: (Math.random() - 0.5) * 0.20,
        vy: -(0.14 + Math.random() * 0.38),
        size: 4 + Math.random() * 11,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.013,
        type:  types[Math.floor(Math.random() * 3)],
        hue:   randH(Math.random() > 0.5 ? 'gold' : 'olive'),
        alpha: 0.10 + Math.random() * 0.20,
        pulse: Math.random() * Math.PI * 2,
        pulseSpd:  0.016 + Math.random() * 0.024,
        wobble:    Math.random() * Math.PI * 2,
        wobbleSpd: 0.018 + Math.random() * 0.026,
      };
    }

    function pathGeo(g: GeoShape, scale = 1) {
      const s = g.size * scale;
      ctx!.beginPath();
      if (g.type === 'box') {
        ctx!.rect(-s, -s, s * 2, s * 2);
      } else if (g.type === 'diamond') {
        ctx!.moveTo(0, -s); ctx!.lineTo(s, 0);
        ctx!.lineTo(0, s);  ctx!.lineTo(-s, 0); ctx!.closePath();
      } else {
        const t = s * 0.32;
        ctx!.moveTo(-t, -s); ctx!.lineTo(t, -s); ctx!.lineTo(t, -t);
        ctx!.lineTo(s, -t);  ctx!.lineTo(s, t);  ctx!.lineTo(t, t);
        ctx!.lineTo(t, s);   ctx!.lineTo(-t, s); ctx!.lineTo(-t, t);
        ctx!.lineTo(-s, t);  ctx!.lineTo(-s, -t); ctx!.lineTo(-t, -t);
        ctx!.closePath();
      }
    }

    function updateDrawGeos() {
      GEOS.forEach((g, idx) => {
        g.pulse   += g.pulseSpd;
        g.wobble  += g.wobbleSpd;
        g.rot     += g.rotSpd;
        g.x       += g.vx + Math.sin(g.wobble) * 0.24;
        g.y       += g.vy;

        WELLS.forEach(w => {
          const dx = w.x - g.x, dy = w.y - g.y, d = Math.hypot(dx, dy);
          if (d < 160 && d > 0) { g.x += (dx / d) * w.life * 0.9; g.y += (dy / d) * w.life * 0.9; }
        });

        if (g.y < -35) GEOS[idx] = makeGeo(false);
        if (g.x < -25) g.x = W + 25;
        if (g.x > W + 25) g.x = -25;

        const a = g.alpha * (0.78 + Math.sin(g.pulse) * 0.22);

        ctx!.save();
        ctx!.translate(g.x, g.y); ctx!.rotate(g.rot);

        /* Glow */
        const gr = ctx!.createRadialGradient(0, 0, 0, 0, 0, g.size * 3.5);
        gr.addColorStop(0, `hsla(${g.hue},72%,82%,${a * 0.55})`);
        gr.addColorStop(1, `hsla(${g.hue},55%,60%,0)`);
        pathGeo(g, 1.6); ctx!.fillStyle = gr; ctx!.fill();

        /* Outline */
        pathGeo(g, 1);
        ctx!.strokeStyle = `hsla(${g.hue},66%,80%,${a})`;
        ctx!.lineWidth   = 0.85; ctx!.stroke();

        ctx!.restore();
      });
    }

    /* ══════════════════════════════════════════
       AURORA BANDS
    ══════════════════════════════════════════ */
    function drawAurora() {
      SCAN_LINES.forEach(b => {
        const yc = H * (b.y + Math.sin(time * b.spd + b.y * 6) * 0.055);
        const h  = 100;
        const g  = ctx!.createLinearGradient(0, yc - h, 0, yc + h);
        g.addColorStop(0,   `hsla(${b.hue},55%,60%,0)`);
        g.addColorStop(0.38,`hsla(${b.hue},60%,68%,${b.alpha * 0.55})`);
        g.addColorStop(0.5, `hsla(${b.hue},65%,72%,${b.alpha})`);
        g.addColorStop(0.62,`hsla(${b.hue},60%,68%,${b.alpha * 0.55})`);
        g.addColorStop(1,   `hsla(${b.hue},55%,60%,0)`);
        ctx!.fillStyle = g; ctx!.fillRect(0, yc - h, W, h * 2);
      });
    }

    /* ══════════════════════════════════════════
       MANDALA — brand centrepiece
    ══════════════════════════════════════════ */
    function drawMandala() {
      const cx = W / 2, cy = H * 0.47;
      const maxR = Math.min(W, H) * 0.28;
      const rot  = time * 0.00020;

      ctx!.save(); ctx!.translate(cx, cy);

      const rings = [
        { r: maxR * 0.10, pts: 6,  hue: 44, a: 0.10 },
        { r: maxR * 0.20, pts: 8,  hue: 42, a: 0.08 },
        { r: maxR * 0.33, pts: 12, hue: 82, a: 0.06 },
        { r: maxR * 0.48, pts: 16, hue: 44, a: 0.045 },
        { r: maxR * 0.63, pts: 20, hue: 80, a: 0.028 },
      ];

      rings.forEach((ring, ri) => {
        ctx!.save(); ctx!.rotate(rot * (ri % 2 === 0 ? 1 : -1.3) * (ri + 1));
        for (let p = 0; p < ring.pts; p++) {
          const angle = (p / ring.pts) * Math.PI * 2;
          const px    = Math.cos(angle) * ring.r;
          const py    = Math.sin(angle) * ring.r;

          /* Diamond node */
          ctx!.save(); ctx!.translate(px, py); ctx!.rotate(angle + Math.PI / 4);
          const s = 3 + ri * 0.55;
          const gr = ctx!.createRadialGradient(0, 0, 0, 0, 0, s * 2.8);
          gr.addColorStop(0, `hsla(${ring.hue},74%,84%,${ring.a * 2.4})`);
          gr.addColorStop(1, `hsla(${ring.hue},60%,60%,0)`);
          ctx!.beginPath();
          ctx!.moveTo(0, -s); ctx!.lineTo(s, 0); ctx!.lineTo(0, s); ctx!.lineTo(-s, 0);
          ctx!.closePath(); ctx!.fillStyle = gr; ctx!.fill();
          ctx!.restore();

          /* Spoke */
          ctx!.beginPath(); ctx!.moveTo(0, 0); ctx!.lineTo(px, py);
          ctx!.strokeStyle = `hsla(${ring.hue},55%,70%,${ring.a * 0.40})`;
          ctx!.lineWidth   = 0.4; ctx!.stroke();
        }
        ctx!.restore();
      });

      /* Centre jewel */
      const cg = ctx!.createRadialGradient(0, 0, 0, 0, 0, maxR * 0.060);
      cg.addColorStop(0,   `hsla(44,88%,92%,0.78)`);
      cg.addColorStop(0.5, `hsla(42,76%,74%,0.36)`);
      cg.addColorStop(1,   `hsla(42,65%,56%,0)`);
      ctx!.beginPath(); ctx!.arc(0, 0, maxR * 0.060, 0, Math.PI * 2);
      ctx!.fillStyle = cg; ctx!.fill();

      ctx!.restore();
    }

    /* ══════════════════════════════════════════
       CLICK EFFECTS
    ══════════════════════════════════════════ */
    function updateDrawRipples() {
      for (let i = RIPPLES.length - 1; i >= 0; i--) {
        const rp = RIPPLES[i];
        if (rp.delay > 0) { rp.delay--; continue; }
        rp.r    += (rp.maxR - rp.r) * 0.06 + 1.2;
        rp.life -= 0.015;
        if (rp.life <= 0) { RIPPLES.splice(i, 1); continue; }

        /* Main ring */
        ctx!.beginPath(); ctx!.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx!.strokeStyle = `hsla(${rp.hue},66%,74%,${rp.life * 0.44})`;
        ctx!.lineWidth   = 1.8 * rp.life; ctx!.stroke();

        /* Rotated diamond outline */
        const dr = rp.r * 0.68;
        ctx!.save(); ctx!.translate(rp.x, rp.y); ctx!.rotate(Math.PI / 4 + rp.life * 0.5);
        ctx!.beginPath();
        ctx!.moveTo(0, -dr); ctx!.lineTo(dr, 0); ctx!.lineTo(0, dr); ctx!.lineTo(-dr, 0);
        ctx!.closePath();
        ctx!.strokeStyle = `hsla(${rp.hue},72%,82%,${rp.life * 0.22})`;
        ctx!.lineWidth   = 0.9 * rp.life; ctx!.stroke();
        ctx!.restore();
      }
    }

    function updateDrawBlooms() {
      for (let i = BLOOMS.length - 1; i >= 0; i--) {
        const bl = BLOOMS[i];
        bl.r    += (bl.maxR - bl.r) * 0.068;
        bl.life -= 0.009;
        bl.rot  += 0.010;
        if (bl.life <= 0) { BLOOMS.splice(i, 1); continue; }

        ctx!.save(); ctx!.translate(bl.x, bl.y);
        ctx!.globalAlpha = bl.life * 0.58;

        for (let p = 0; p < bl.petals; p++) {
          const angle = (p / bl.petals) * Math.PI * 2 + bl.rot;
          const px    = Math.cos(angle) * bl.r, py = Math.sin(angle) * bl.r;
          ctx!.save(); ctx!.translate(px, py); ctx!.rotate(angle + Math.PI / 4);
          const ps = 8 + bl.r * 0.16;
          const gr = ctx!.createRadialGradient(0, 0, 0, 0, 0, ps * 1.6);
          gr.addColorStop(0, `hsla(${bl.hue},82%,90%,0.90)`);
          gr.addColorStop(1, `hsla(${bl.hue},65%,66%,0)`);
          ctx!.beginPath();
          ctx!.moveTo(0, -ps); ctx!.lineTo(ps * 0.72, 0);
          ctx!.lineTo(0, ps);  ctx!.lineTo(-ps * 0.72, 0);
          ctx!.closePath(); ctx!.fillStyle = gr; ctx!.fill();
          ctx!.restore();
        }

        /* Centre jewel */
        const cg = ctx!.createRadialGradient(0, 0, 0, 0, 0, 10);
        cg.addColorStop(0, `hsla(${bl.hue + 8},92%,96%,0.96)`);
        cg.addColorStop(1, `hsla(${bl.hue},70%,70%,0)`);
        ctx!.beginPath(); ctx!.arc(0, 0, 10, 0, Math.PI * 2);
        ctx!.fillStyle = cg; ctx!.fill();
        ctx!.restore();
      }
    }

    function updateDrawShockwaves() {
      for (let i = SHOCKWAVES.length - 1; i >= 0; i--) {
        const sw = SHOCKWAVES[i];
        sw.r    += 17; sw.life -= 0.034;
        if (sw.life <= 0) { SHOCKWAVES.splice(i, 1); continue; }

        const gr = ctx!.createRadialGradient(sw.x, sw.y, sw.r - 10, sw.x, sw.y, sw.r + 10);
        gr.addColorStop(0,   `hsla(${sw.hue},72%,80%,0)`);
        gr.addColorStop(0.5, `hsla(${sw.hue},78%,77%,${sw.life * 0.36})`);
        gr.addColorStop(1,   `hsla(${sw.hue},72%,80%,0)`);
        ctx!.beginPath(); ctx!.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx!.fillStyle = gr; ctx!.fill();
      }
    }

    function updateDrawWells() {
      for (let i = WELLS.length - 1; i >= 0; i--) {
        const w = WELLS[i];
        w.life -= 0.005;
        if (w.life <= 0) { WELLS.splice(i, 1); continue; }

        const gr = ctx!.createRadialGradient(w.x, w.y, 0, w.x, w.y, 80 * w.life);
        gr.addColorStop(0, `hsla(${w.hue},70%,82%,${w.life * 0.10})`);
        gr.addColorStop(1, `hsla(${w.hue},55%,66%,0)`);
        ctx!.beginPath(); ctx!.arc(w.x, w.y, 80 * w.life, 0, Math.PI * 2);
        ctx!.fillStyle = gr; ctx!.fill();
      }
    }

    /* ══════════════════════════════════════════
       CORNER ORNAMENTS — with animated micro-details
    ══════════════════════════════════════════ */
    function drawCornerOrnaments() {
      const s    = 34, pad = 22;
      const wave = 0.5 + Math.sin(time * 0.012) * 0.5;
      const corners: [number, number, number][] = [
        [pad,     pad,     0],
        [W - pad, pad,     Math.PI / 2],
        [W - pad, H - pad, Math.PI],
        [pad,     H - pad, Math.PI * 1.5],
      ];

      corners.forEach(([cx, cy, rot]) => {
        ctx!.save(); ctx!.translate(cx, cy); ctx!.rotate(rot);
        ctx!.globalAlpha = 0.16 + wave * 0.10;

        /* L-bracket */
        ctx!.strokeStyle = `hsla(42,66%,76%,1)`;
        ctx!.lineWidth   = 0.85;
        ctx!.beginPath(); ctx!.moveTo(0, s); ctx!.lineTo(0, 0); ctx!.lineTo(s, 0);
        ctx!.stroke();

        /* Tick marks */
        [s * 0.35, s * 0.65].forEach(p => {
          ctx!.beginPath(); ctx!.moveTo(0, p); ctx!.lineTo(3, p); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(p, 0); ctx!.lineTo(p, 3); ctx!.stroke();
        });

        /* Corner diamond */
        const ds = 4.5;
        ctx!.beginPath();
        ctx!.moveTo(0, -ds); ctx!.lineTo(ds, 0); ctx!.lineTo(0, ds); ctx!.lineTo(-ds, 0);
        ctx!.closePath();
        ctx!.fillStyle = `hsla(42,74%,82%,${0.52 + wave * 0.44})`;
        ctx!.fill();

        ctx!.restore();
      });
    }

    /* ══════════════════════════════════════════
       MOUSE SPARKLE — proximity effect
    ══════════════════════════════════════════ */
    let sparkTimer = 0;
    function updateMouseSparkle() {
      sparkTimer++;
      if (mx > -999 && sparkTimer > 28) {
        sparkTimer = 0;
        spawnParticle(
          mx + (Math.random() - 0.5) * 36,
          my + (Math.random() - 0.5) * 36,
          false
        );
      }
    }

    /* ══════════════════════════════════════════
       MAIN LOOP
    ══════════════════════════════════════════ */
    function loop() {
      frame++; time++;
      ctx!.clearRect(0, 0, W, H);

      drawAurora();
      updateDrawNetwork();
      drawMandala();
      updateDrawGeos();
      updateMouseSparkle();
      updateDrawParticles();
      updateDrawWells();
      updateDrawShockwaves();
      updateDrawBlooms();
      updateDrawRipples();
      drawCornerOrnaments();

      animId = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener('mousemove',  onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('click',      onClick);
    };
  }, []);
}

/* ═══════════════════════════════════════════════════════
   TILT HOOK — Improved with natural feel
═══════════════════════════════════════════════════════ */
function useTilt(strength = 10) {
  const ref      = useRef<HTMLDivElement>(null);
  const rotateX  = useMotionValue(0);
  const rotateY  = useMotionValue(0);
  const cfg      = { stiffness: 180, damping: 24, mass: 0.7 };
  const springX  = useSpring(rotateX, cfg);
  const springY  = useSpring(rotateY, cfg);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
    const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
    rotateY.set(dx * strength);
    rotateX.set(-dy * strength);
  }, [strength, rotateX, rotateY]);

  const onMouseLeave = useCallback(() => {
    rotateX.set(0); rotateY.set(0);
  }, [rotateX, rotateY]);

  return { ref, springX, springY, onMouseMove, onMouseLeave };
}

/* ═══════════════════════════════════════════════════════
   MOTION VARIANTS
═══════════════════════════════════════════════════════ */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 44 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASING.smooth } },
};
const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.13 } },
};
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASING.smooth } },
};

/* ═══════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════ */
const CATEGORIES = collections.items.map(c => ({
  name: c.name, desc: c.text, tag: c.tag, accent: c.accent, img: asset(c.image),
}));

const PRODUCTS = products.items.map(p => ({ name: p.name, sub: p.subtitle, img: asset(p.image) }));

const WHY = why.items.map(w => ({ icon: w.symbol, title: w.title, desc: w.text }));

const CUSTOM_ITEMS = personalization.items.map(c => ({ icon: c.symbol, title: c.title, desc: c.text }));

const STAT_ITEMS = stats.items.map(s => ({ value: s.value, label: s.label }));

/* ═══════════════════════════════════════════════════════
   ANIMATED COUNTER
═══════════════════════════════════════════════════════ */
function AnimatedStat({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.5 });
  return (
    <motion.div ref={ref} className="text-center"
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, delay, ease: EASING.smooth }}>
      <motion.p className="font-serif text-4xl md:text-5xl text-brand-olive mb-2"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.55, delay: delay + 0.1, ease: EASING.spring }}>
        {value}
      </motion.p>
      <p className="text-xs uppercase tracking-[0.22em] font-bold text-gray-500">{label}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAGNETIC BUTTON — pulls toward cursor
═══════════════════════════════════════════════════════ */
function MagneticButton({
  children, className, style, onClick,
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  const ref  = useRef<HTMLButtonElement>(null);
  const tx   = useMotionValue(0);
  const ty   = useMotionValue(0);
  const stx  = useSpring(tx, { stiffness: 260, damping: 20 });
  const sty  = useSpring(ty, { stiffness: 260, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width  / 2);
    const dy = e.clientY - (r.top  + r.height / 2);
    tx.set(dx * 0.28); ty.set(dy * 0.28);
  };
  const onLeave = () => { tx.set(0); ty.set(0); };

  return (
    <motion.button ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      style={{ x: stx, y: sty, ...style }}
      whileTap={{ scale: 0.95 }}
      className={className}>
      {children}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════
   SHIMMERING TEXT
═══════════════════════════════════════════════════════ */
function ShimmerText({ text, className }: { text: string; className?: string }) {
  return (
    <motion.span className={`relative inline-block ${className ?? ''}`}
      initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.5 }}>
      {text.split('').map((char, i) => (
        <motion.span key={i} className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 12, rotateX: -60 },
            show:   { opacity: 1, y: 0,  rotateX: 0,
              transition: { duration: 0.5, delay: i * 0.032, ease: EASING.smooth } },
          }}
          style={{ display: char === ' ' ? 'inline' : 'inline-block' }}>
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ═══════════════════════════════════════════════════════
   CATEGORY CARD — 3-D flip-in + tilt + parallax layers
═══════════════════════════════════════════════════════ */
function CategoryCard({ item, index }: { item: typeof CATEGORIES[number]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { ref, springX, springY, onMouseMove, onMouseLeave } = useTilt(10);
  const imgRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.55, rotateX: -52, rotateY: index % 2 === 0 ? -22 : 22, y: 90 }}
      whileInView={{ opacity: 1, scale: 1, rotateX: 0, rotateY: 0, y: 0 }}
      viewport={{ once: false, amount: 0.12 }}
      transition={{ duration: 1.0, delay: index * 0.15, ease: EASING.spring }}
      style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
      className="cursor-pointer">

      <motion.div ref={ref} onMouseMove={onMouseMove}
        onMouseLeave={() => { onMouseLeave(); setHovered(false); }}
        onMouseEnter={() => setHovered(true)}
        style={{
          rotateX: springX, rotateY: springY,
          transformStyle: 'preserve-3d', willChange: 'transform',
          boxShadow: hovered
            ? '0 28px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)'
            : '0 4px 18px rgba(0,0,0,0.07)',
          transition: 'box-shadow 0.45s ease',
        }}
        className="bg-white rounded-sm overflow-hidden border border-gray-100 relative">

        {/* Image container with parallax inner layer */}
        <div ref={imgRef} className="overflow-hidden relative" style={{ aspectRatio: '3/4' }}>
          <motion.img src={item.img} alt={item.name}
            className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.09 : 1 }}
            transition={{ duration: 0.8, ease: EASING.smooth }}
            style={{ willChange: 'transform' }} />

          {/* Colour overlay */}
          <motion.div className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: item.accent }}
            animate={{ opacity: hovered ? 0.15 : 0 }}
            transition={{ duration: 0.4 }} />

          {/* Shimmer sweep on hover */}
          <motion.div className="absolute inset-0 pointer-events-none"
            initial={false}
            animate={{ x: hovered ? '100%' : '-100%', opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.65, ease: EASING.smooth }}
            style={{
              background: 'linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.18) 50%,transparent 70%)',
            }} />

          {/* Tag badge */}
          <motion.span
            animate={{ y: hovered ? 0 : -28, opacity: hovered ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            className="absolute top-4 left-4 text-[9px] uppercase tracking-[0.18em] font-bold text-white px-3 py-1 rounded-sm"
            style={{ backgroundColor: item.accent }}>
            {item.tag}
          </motion.span>

          {/* Corner diamond detail */}
          <motion.div className="absolute bottom-4 right-4 pointer-events-none"
            animate={{ opacity: hovered ? 1 : 0, rotate: hovered ? 0 : -45, scale: hovered ? 1 : 0.5 }}
            transition={{ duration: 0.4, ease: EASING.smooth }}>
            <div style={{
              width: 10, height: 10,
              background: item.accent,
              transform: 'rotate(45deg)',
              opacity: 0.8,
            }} />
          </motion.div>
        </div>

        {/* Card body */}
        <div className="p-6 relative overflow-hidden">
          {/* Bottom bar sweep */}
          <motion.div className="absolute bottom-0 left-0 h-[2.5px]"
            style={{ backgroundColor: item.accent }}
            animate={{ width: hovered ? '100%' : '0%' }}
            transition={{ duration: 0.48, ease: EASING.smooth }} />

          <h4 className="font-bold text-base mb-1.5 font-serif leading-snug text-gray-900">{item.name}</h4>
          <p className="text-gray-500 text-xs leading-relaxed mb-4">{item.desc}</p>

          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: item.accent }}>
            <motion.span animate={{ x: hovered ? 4 : 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}>
              {collections.linkText}
            </motion.span>
            <motion.span
              animate={{ rotate: hovered ? 45 : 0, x: hovered ? 3 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{ display: 'inline-flex' }}>
              <ArrowRight size={11} />
            </motion.span>
          </div>
        </div>

        {/* Inner border */}
        <div className="absolute inset-0 rounded-sm pointer-events-none"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.055)' }} />
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   PRODUCT CARD — with stacked-card hover
═══════════════════════════════════════════════════════ */
function ProductCard({ item, index }: { item: typeof PRODUCTS[number]; index: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 54 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.18 }}
      transition={{ duration: 0.72, delay: index * 0.1, ease: EASING.smooth }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
      className="cursor-pointer flex-shrink-0 group" style={{ minWidth: 288, maxWidth: 320 }}>

      {/* Stacked shadow cards */}
      <div className="relative mb-5">
        <motion.div className="absolute inset-0 rounded-sm"
          animate={{ x: hovered ? 8 : 4, y: hovered ? 8 : 4 }}
          transition={{ duration: 0.4, ease: EASING.smooth }}
          style={{ background: '#e8e0d2', zIndex: 0 }} />
        <motion.div className="absolute inset-0 rounded-sm"
          animate={{ x: hovered ? 4 : 2, y: hovered ? 4 : 2 }}
          transition={{ duration: 0.35, ease: EASING.smooth }}
          style={{ background: '#d4c9b4', zIndex: 1 }} />

        <div className="overflow-hidden rounded-sm relative" style={{ aspectRatio: '1', background: '#f5f5f4', zIndex: 2 }}>
          <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.07 : 1 }}
            transition={{ duration: 0.68, ease: EASING.smooth }}
            style={{ willChange: 'transform' }} />

          {/* Hover overlay with product label */}
          <motion.div className="absolute inset-0 flex items-end p-5"
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 60%)' }}>
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/80">{item.sub}</p>
          </motion.div>
        </div>
      </div>

      <h4 className="font-serif font-bold text-lg text-gray-900 mb-1">{item.name}</h4>
      <motion.div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: BRAND.olive }}
        animate={{ x: hovered ? 4 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 20 }}>
        <span>{products.linkText}</span>
        <ArrowRight size={10} />
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   WHY ITEM — slide-in bars + animated border
═══════════════════════════════════════════════════════ */
function WhyItem({ item, index }: { item: typeof WHY[number]; index: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.3 });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 38 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 38 }}
      transition={{ duration: 0.72, delay: index * 0.12, ease: EASING.smooth }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 280, damping: 20 } }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
      style={{
        background: '#fff', border: '1px solid rgba(181,162,106,0.18)',
        borderRadius: 4, padding: '36px 28px',
        boxShadow: hovered
          ? '0 12px 40px rgba(181,162,106,0.15), 0 4px 16px rgba(0,0,0,0.06)'
          : '0 2px 16px rgba(0,0,0,0.04)',
        position: 'relative', transition: 'box-shadow 0.4s ease',
      }}>

      {/* Top accent bar */}
      <motion.div initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.55, delay: index * 0.12 + 0.30, ease: EASING.smooth }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: BRAND.olive, borderRadius: '4px 4px 0 0', transformOrigin: 'left',
        }} />

      {/* Icon with pulse ring */}
      <div className="relative inline-block mb-5">
        <motion.div className="absolute inset-0 rounded-full"
          animate={hovered
            ? { scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }
            : { scale: 1, opacity: 0 }}
          transition={{ duration: 1.4, repeat: hovered ? Infinity : 0 }}
          style={{ background: BRAND.olive, borderRadius: '50%' }} />
        <span style={{ fontSize: 28, color: BRAND.olive, display: 'block', position: 'relative' }}>
          {item.icon}
        </span>
      </div>

      <h5 className="font-serif font-bold text-lg text-gray-900 mb-2">{item.title}</h5>
      <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   HORIZONTAL MARQUEE — brand social proof
═══════════════════════════════════════════════════════ */
// Client names and logos from the admin panel (admin → Clients)
function Marquee({ items }: { items: readonly Client[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden relative py-10 border-y border-gray-200 bg-white">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right,#fff,transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left,#fff,transparent)' }} />

      <motion.div className="flex gap-16 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>
        {doubled.map((client, i) => client.logo ? (
          <img key={i} src={client.logo} alt={client.name} className="opacity-30" style={{ height: 32, objectFit: 'contain' }} />
        ) : (
          <span key={i} className="font-serif text-xl text-gray-800 tracking-widest font-bold opacity-30">
            {client.name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SCROLL PROGRESS BAR
═══════════════════════════════════════════════════════ */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div className="fixed top-0 left-0 right-0 z-50 h-[2px]"
      style={{ scaleX, transformOrigin: 'left', background: BRAND.olive }} />
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function EmployeeOnboarding() {
  /* Refs */
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const heroRef    = useRef<HTMLElement>(null);
  const aboutRef   = useRef<HTMLElement>(null);
  const catRef     = useRef<HTMLElement>(null);
  const prodRef    = useRef<HTMLElement>(null);
  const custRef    = useRef<HTMLElement>(null);
  const ctaRef     = useRef<HTMLElement>(null);

  /* Parallax */
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const imgY    = useTransform(scrollYProgress, [0, 1], ['0%', '32%']);
  const textY   = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const springImg = useSpring(imgY,  { stiffness: 55, damping: 20 });
  const springTxt = useSpring(textY, { stiffness: 75, damping: 24 });

  /* Canvas */
  useOnboardingCanvas(canvasRef, heroRef);

  /* About tilt */
  const { ref: aboutTiltRef, springX: atX, springY: atY, onMouseMove: atMM, onMouseLeave: atML } = useTilt(6);

  /* InView */
  const aboutInView = useInView(aboutRef, { once: false, amount: 0.18 });
  const catInView   = useInView(catRef,   { once: false, amount: 0.12 });
  const prodInView  = useInView(prodRef,  { once: false, amount: 0.12 });
  const custInView  = useInView(custRef,  { once: false, amount: 0.12 });
  const ctaInView   = useInView(ctaRef,   { once: false, amount: 0.25 });

  return (
    <div className="overflow-x-hidden bg-brand-beige" style={{ fontFamily: 'inherit' }}>
      <ScrollProgress />

      {/* ══ HERO ══ */}
      <section ref={heroRef} className="relative flex items-center overflow-hidden"
        style={{ minHeight: '100vh', perspective: '1600px' }}>

        {/* Parallax photo */}
        <motion.div style={{ y: springImg, willChange: 'transform' }} className="absolute inset-0">
          <img
            src={asset(hero.image)}
            alt={hero.imageAlt} className="w-full h-full object-cover"
            style={{ minHeight: '120%', filter: 'brightness(0.44)' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(112deg,rgba(0,0,0,0.62) 0%,rgba(0,0,0,0.22) 55%,rgba(0,0,0,0.06) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-40"
            style={{ background: 'linear-gradient(to top,rgba(181,162,106,0.14) 0%,transparent 100%)' }} />
        </motion.div>

        {/* Canvas */}
        <canvas ref={canvasRef} style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', zIndex: 1,
          pointerEvents: 'all',
        }} />

        {/* Fades */}
        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to top,rgba(247,244,240,0.70) 0%,transparent 100%)', zIndex: 2 }} />
        <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.46) 0%,transparent 100%)', zIndex: 2 }} />

        {/* Click hint */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 1.2 }}
          className="absolute top-6 right-8 z-10 pointer-events-none flex items-center gap-2"
          style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700 }}>
          <motion.span animate={{ scale: [1, 1.5, 1], opacity: [0.28, 1, 0.28] }}
            transition={{ duration: 2.8, repeat: Infinity }}>{hero.clickHintSymbol}</motion.span>
          {hero.clickHint}
        </motion.div>

        {/* Hero text */}
        <motion.div style={{ y: springTxt, opacity, willChange: 'transform' }}
          className="absolute bottom-24 left-8 md:left-20 z-10 max-w-3xl px-4">

          <motion.p initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="text-[10px] uppercase tracking-[0.32em] font-bold text-white/55 mb-6 flex items-center gap-3">
            <motion.span className="inline-block" style={{ width: 40, height: 1, background: BRAND.olive }}
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }} />
            {hero.eyebrow}
          </motion.p>

          <h1 className="font-serif text-white" style={{ fontSize: 'clamp(3rem,7vw,6rem)', lineHeight: 1.07 }}>
            {[hero.titleLine1, hero.titleLine2].map((word, i) => (
              <motion.span key={word}
                initial={{ clipPath: 'inset(0 0 100% 0)', y: 30, opacity: 0 }}
                animate={{ clipPath: 'inset(0 0 0% 0)', y: 0, opacity: 1 }}
                transition={{ duration: 0.75, delay: 0.28 + i * 0.18, ease: EASING.smooth }}
                style={{ display: 'block' }}>
                {word}
              </motion.span>
            ))}
            <motion.span
              initial={{ clipPath: 'inset(0 0 100% 0)', y: 30, opacity: 0 }}
              animate={{ clipPath: 'inset(0 0 0% 0)', y: 0, opacity: 1 }}
              transition={{ duration: 0.75, delay: 0.64, ease: EASING.smooth }}
              style={{ display: 'block', fontStyle: 'italic', fontWeight: 400 }}>
              {hero.titleHighlight}
            </motion.span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.68, delay: 0.85 }}
            className="text-white/78 mt-7 max-w-md text-lg font-light leading-relaxed">
            {hero.intro}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, delay: 1.10 }}
            className="flex gap-5 mt-11 flex-wrap items-center">

            <MagneticButton
              className="bg-brand-dark-olive text-white px-9 py-4 rounded-sm font-bold uppercase tracking-widest text-xs flex items-center gap-2">
              {hero.primaryButton} <ArrowRight size={12} />
            </MagneticButton>

            <MagneticButton onClick={() => window.location.href = '/contact'}
              className="border border-white/38 text-white px-9 py-4 rounded-sm font-bold uppercase tracking-widest text-xs backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.07)' }}>
              {hero.secondaryButton}
            </MagneticButton>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.9, duration: 0.9 }}
          className="absolute bottom-9 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-white/38 text-[9px] uppercase tracking-[0.3em] font-bold">{hero.scrollLabel}</span>
          <motion.div animate={{ scaleY: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 30, background: `linear-gradient(to bottom,${BRAND.olive},transparent)` }} />
        </motion.div>
      </section>

      {/* ══ STATS STRIP ══ */}
      <section className="py-16 px-8 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {STAT_ITEMS.map((s, i) => <AnimatedStat key={s.label} {...s} delay={i * 0.1} />)}
        </div>
      </section>

      {/* ══ PHILOSOPHY ══ */}
      <section ref={aboutRef} className="py-36 px-8 md:px-20 lg:px-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">

          {/* Image block */}
          <motion.div initial={{ opacity: 0, scale: 0.80, rotateY: -18 }}
            animate={aboutInView ? { opacity: 1, scale: 1, rotateY: 0 } : { opacity: 0, scale: 0.80, rotateY: -18 }}
            transition={{ duration: 0.92, ease: EASING.spring }}
            style={{ perspective: '1200px' }}>

            <motion.div ref={aboutTiltRef} onMouseMove={atMM} onMouseLeave={atML}
              style={{ rotateX: atX, rotateY: atY, transformStyle: 'preserve-3d', willChange: 'transform' }}
              className="relative">
              <img
                src={asset(philosophy.image)}
                alt={philosophy.imageAlt} className="w-full rounded-sm shadow-2xl"
                style={{ aspectRatio: '4/5', objectFit: 'cover' }} />

              {/* Floating quote card */}
              <motion.div initial={{ opacity: 0, y: 28, x: 12 }}
                animate={aboutInView ? { opacity: 1, y: 0, x: 0 } : { opacity: 0, y: 28, x: 12 }}
                transition={{ duration: 0.68, delay: 0.44 }}
                whileHover={{ y: -5, boxShadow: '0 22px 52px rgba(0,0,0,0.16)' }}
                className="absolute -bottom-10 -right-7 bg-white p-7 shadow-xl"
                style={{ maxWidth: 225, willChange: 'transform' }}>

                {/* Decorative top stripe */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-sm"
                  style={{ background: BRAND.olive }} />
                <p className="italic font-serif text-sm text-brand-dark-olive leading-snug mb-4">
                  {philosophy.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-px" style={{ background: BRAND.olive }} />
                  <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">{philosophy.quoteAuthor}</span>
                </div>
              </motion.div>

              {/* Floating accent diamond */}
              <motion.div
                animate={{ rotate: [0, 360] }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-5 -left-5"
                style={{ width: 22, height: 22, background: BRAND.olive, transform: 'rotate(45deg)', opacity: 0.75 }} />
            </motion.div>
          </motion.div>

          {/* Text block */}
          <div>
            <motion.div initial={{ scaleX: 0 }} animate={aboutInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.58, ease: EASING.smooth }}
              style={{ originX: 0 }} className="w-20 h-1 bg-brand-olive mb-7" />

            <motion.p initial={{ opacity: 0, x: -18 }}
              animate={aboutInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -18 }}
              transition={{ duration: 0.52, delay: 0.08 }}
              className="text-[10px] uppercase tracking-[0.28em] font-bold text-brand-olive mb-5">
              {philosophy.eyebrow}
            </motion.p>

            <motion.h2 initial={{ opacity: 0, y: 30 }}
              animate={aboutInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.68, delay: 0.14, ease: EASING.smooth }}
              className="text-5xl font-serif leading-tight mb-8">
              {philosophy.titleLine1}<br />{philosophy.titleLine2}
            </motion.h2>

            {philosophy.paragraphs.map((text, i) => (
              <motion.p key={i} initial={{ opacity: 0 }}
                animate={aboutInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.62, delay: 0.28 + i * 0.12 }}
                className="text-gray-600 text-lg leading-relaxed mb-6">
                {text}
              </motion.p>
            ))}

            <motion.button initial={{ opacity: 0, y: 14 }}
              animate={aboutInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.52, delay: 0.52 }}
              whileHover={{ x: 6, transition: { type: 'spring', stiffness: 360, damping: 22 } }}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border-b-2 border-brand-charcoal/18 hover:border-brand-olive pb-1 transition-colors">
              {philosophy.linkText} <ArrowRight size={13} />
            </motion.button>
          </div>
        </div>
      </section>

      {/* ══ CATEGORIES ══ */}
      <section ref={catRef} className="py-36 px-8 md:px-20 lg:px-32 bg-brand-beige overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 32 }}
            animate={catInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
            transition={{ duration: 0.65 }}
            className="mb-18 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <motion.div initial={{ scaleX: 0 }} animate={catInView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.55, ease: EASING.smooth }}
                style={{ originX: 0 }} className="w-20 h-1 bg-brand-olive mb-5" />
              <h2 className="text-5xl font-serif leading-tight">{collections.title}</h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-brand-olive/65 flex items-center gap-2">
              <span className="w-8 h-px bg-brand-olive/38 inline-block" />
              {CATEGORIES.length} {collections.countLabel}
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" style={{ perspective: '1700px' }}>
            {CATEGORIES.map((item, i) => <CategoryCard key={item.name} item={item} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ SIGNATURE PRODUCTS ══ */}
      <section ref={prodRef} className="py-36 px-8 md:px-20 lg:px-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 26 }}
            animate={prodInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }}
            transition={{ duration: 0.62 }} className="flex justify-between items-end mb-16">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-brand-olive mb-3">{products.eyebrow}</p>
              <h2 className="text-5xl font-serif">{products.title}</h2>
            </div>
            <motion.a whileHover={{ y: -1 }}
              className="font-bold text-xs uppercase tracking-widest border-b-2 border-brand-olive pb-1 cursor-pointer">
              {products.viewAllText}
            </motion.a>
          </motion.div>

          <div className="flex gap-10 overflow-x-auto pb-8"
            style={{ scrollSnapType: 'x mandatory', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {PRODUCTS.map((item, i) => <ProductCard key={item.name} item={item} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ CUSTOMIZATION ══ */}
      <section ref={custRef} className="py-36 px-8 md:px-20 lg:px-32 overflow-hidden"
        style={{ background: BRAND.darkOlive }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div>
            <motion.p initial={{ opacity: 0, x: -18 }}
              animate={custInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -18 }}
              transition={{ duration: 0.52 }}
              className="text-[10px] uppercase tracking-[0.28em] font-bold text-brand-olive/68 mb-4">
              {personalization.eyebrow}
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 30 }}
              animate={custInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.68, delay: 0.1, ease: EASING.smooth }}
              className="text-5xl font-serif text-white leading-tight mb-16">
              {personalization.titleLine1}<br />
              <span className="italic font-normal" style={{ color: BRAND.olive }}>{personalization.titleHighlight}</span>
            </motion.h2>

            <motion.div variants={stagger} initial="hidden"
              animate={custInView ? 'show' : 'hidden'} className="space-y-12">
              {CUSTOM_ITEMS.map(item => (
                <motion.div key={item.title} variants={fadeUp} className="flex gap-7">
                  <div className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: 50, height: 50, borderRadius: '50%',
                      border: `1.5px solid rgba(181,162,106,0.30)`,
                      background: 'rgba(181,162,106,0.08)',
                      color: BRAND.olive, fontSize: 20,
                    }}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-serif text-xl text-white mb-2">{item.title}</h4>
                    <p className="text-white/52 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Image */}
          <motion.div initial={{ opacity: 0, x: 65, rotateY: -22 }}
            animate={custInView ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: 65, rotateY: -22 }}
            transition={{ duration: 0.95, ease: EASING.spring }}
            style={{ perspective: '1000px', position: 'relative' }}>
            <img
              src={asset(personalization.image)}
              alt={personalization.imageAlt} className="w-full shadow-2xl rounded-sm"
              style={{ aspectRatio: '1', objectFit: 'cover' }} />

            {/* Quote */}
            <motion.div initial={{ opacity: 0, y: 22, x: -12 }}
              animate={custInView ? { opacity: 1, y: 0, x: 0 } : { opacity: 0, y: 22, x: -12 }}
              transition={{ duration: 0.65, delay: 0.58 }}
              className="absolute -bottom-9 -left-9 bg-white p-7 shadow-2xl" style={{ maxWidth: 248 }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-sm"
                style={{ background: BRAND.olive }} />
              <p className="italic font-serif text-sm text-brand-dark-olive leading-snug mb-4">
                {personalization.quote}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-5 h-px" style={{ background: BRAND.olive }} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                  {personalization.quoteAuthor}
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ WHY ECOTWIST ══ */}
      <section className="py-36 px-8 md:px-20 lg:px-32 bg-brand-beige">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.35 }} transition={{ duration: 0.62 }} className="mb-16">
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
              viewport={{ once: false, amount: 0.35 }}
              transition={{ duration: 0.55, ease: EASING.smooth }}
              style={{ originX: 0 }} className="w-20 h-1 bg-brand-olive mb-5" />
            <h2 className="text-5xl font-serif">{why.title}</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
            {WHY.map((item, i) => <WhyItem key={item.title} item={item} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ MARQUEE ══ */}
      {clients.length > 0 && <Marquee items={clients} />}

      {/* ══ FINAL CTA ══ */}
      <section ref={ctaRef} className="py-36 px-8 text-center bg-brand-off-white relative overflow-hidden">
        {/* Decorative rotating diamond */}
        <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          animate={{ rotate: [0, 360] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          style={{ width: 520, height: 520, border: `1px solid rgba(181,162,106,0.08)`, borderRadius: 0, transform: 'rotate(45deg)' }} />
        <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          animate={{ rotate: [0, -360] }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          style={{ width: 380, height: 380, border: `1px solid rgba(181,162,106,0.06)`, transform: 'rotate(45deg)' }} />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.h2 initial={{ opacity: 0, y: 24 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.88, ease: EASING.smooth }}
            className="font-serif text-5xl md:text-7xl mb-9 leading-tight">
            {cta.titleStart}{' '}
            <em className="font-normal not-italic" style={{ color: BRAND.olive }}>{cta.titleHighlight}</em> {cta.titleEnd}
          </motion.h2>

          <motion.p initial={{ opacity: 0, y: 18 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.62, delay: 0.15 }}
            className="text-xl text-gray-600 mb-12 max-w-xl mx-auto leading-relaxed">
            {cta.text}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 18 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.62, delay: 0.30 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-7">

            <MagneticButton onClick={() => window.location.href = '/get-proposal'}
              className="bg-brand-dark-olive text-white px-14 py-6 rounded-sm uppercase tracking-[0.2em] text-xs font-bold shadow-xl">
              {cta.primaryButton}
            </MagneticButton>

            <motion.button whileHover={{ y: -2 }}
              onClick={() => window.location.href = '/contact'}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="text-brand-charcoal uppercase tracking-[0.2em] text-xs font-bold border-b-2 border-brand-charcoal/18 hover:border-brand-olive transition-colors pb-1">
              {cta.secondaryButton}
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}