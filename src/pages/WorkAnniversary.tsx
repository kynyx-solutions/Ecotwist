import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  motion, useScroll, useTransform, useSpring, useMotionValue, useInView,
} from 'motion/react';
import type { Variants } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { clients } from '../lib/clients';
import { asset } from '../lib/content';
import content from '../content/pages/work-anniversary.json';

// Page words and photos: src/content/pages/work-anniversary.json (admin → Pages → Work Anniversary)
const { hero, about, categories, products, customization, why, trust, cta } = content;

/* ─────────────────────────────────────────────
   CELEBRATION CANVAS HOOK
   Theme: Deep burgundy, rose gold, champagne, ivory
   Elements: floating lanterns, ribbon spirals,
   trophy particles, celebration rings,
   golden confetti, click = firework burst
───────────────────────────────────────────── */
function useCelebrationCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, animId: number;
    let mx = -9999, my = -9999;
    let time = 0;

    /* ── Palette: Rose gold, champagne, burgundy, ivory ── */
    const ROSE_GOLD  = [345, 350, 355, 5, 15];
    const CHAMPAGNE  = [40, 45, 50, 55];
    const ALL_HUE    = [...ROSE_GOLD, ...CHAMPAGNE, 30, 35];
    const roseHue    = () => ROSE_GOLD[Math.floor(Math.random() * ROSE_GOLD.length)];
    const champHue   = () => CHAMPAGNE[Math.floor(Math.random() * CHAMPAGNE.length)];
    const randHue    = () => ALL_HUE[Math.floor(Math.random() * ALL_HUE.length)];

    /* ── Interfaces ── */
    interface Lantern {
      x: number; y: number; vx: number; vy: number;
      size: number; hue: number; alpha: number;
      wobble: number; wSpd: number; glow: number; glowDir: number;
      flame: number; flameSpd: number;
    }
    interface Ribbon {
      x: number; y: number; vx: number; vy: number;
      length: number; hue: number; alpha: number;
      angle: number; angleSpd: number; wave: number; waveSpd: number;
      thickness: number; points: {x:number,y:number}[];
    }
    interface Star {
      x: number; y: number; r: number; hue: number;
      alpha: number; pulse: number; pulseSpd: number;
      twinkle: number; twinkleSpd: number; layer: number;
    }
    interface Ring {
      x: number; y: number; r: number; maxR: number;
      life: number; hue: number; width: number;
    }
    interface Sparkle {
      x: number; y: number; vx: number; vy: number;
      life: number; hue: number; r: number; rot: number; rotSpd: number;
      trail: {x:number,y:number}[];
    }
    interface FireworkShell {
      x: number; y: number; vy: number;
      targetY: number; hue: number; trail: {x:number,y:number}[];
      exploded: boolean;
    }
    interface FireworkParticle {
      x: number; y: number; vx: number; vy: number;
      life: number; hue: number; r: number;
      trail: {x:number,y:number}[]; gravity: number;
      alpha: number;
    }
    interface ClickBurst {
      x: number; y: number; rings: Ring[];
      particles: FireworkParticle[]; life: number;
    }
    interface YearBadge {
      x: number; y: number; vx: number; vy: number;
      year: string; alpha: number; size: number;
      wobble: number; wSpd: number; rot: number;
    }

    /* ── Arrays ── */
    const LANTERNS:    Lantern[]          = [];
    const RIBBONS:     Ribbon[]           = [];
    const STARS:       Star[]             = [];
    const SPARKLES:    Sparkle[]          = [];
    const FW_SHELLS:   FireworkShell[]    = [];
    const FW_PARTS:    FireworkParticle[] = [];
    const CLICK_BURSTS: ClickBurst[]     = [];
    const YEAR_BADGES: YearBadge[]       = [];

    /* ══════════════ RESIZE / INIT ══════════════ */
    function initStars() {
      STARS.length = 0;
      for (let i = 0; i < 180; i++) {
        const layer = Math.floor(Math.random() * 3);
        STARS.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 0.3 + layer * 0.4 + Math.random() * 0.6,
          hue: champHue(), alpha: 0.1 + Math.random() * 0.5,
          pulse: Math.random() * Math.PI * 2,
          pulseSpd: 0.02 + Math.random() * 0.03,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpd: 0.04 + Math.random() * 0.06,
          layer,
        });
      }
    }

    function initLanterns() {
      LANTERNS.length = 0;
      for (let i = 0; i < 14; i++) spawnLantern(true);
    }

    function initRibbons() {
      RIBBONS.length = 0;
      for (let i = 0; i < 8; i++) spawnRibbon(true);
    }

    function initYearBadges() {
      YEAR_BADGES.length = 0;
      const years = ['1', '5', '10', '15', '20', '25'];
      years.forEach(y => {
        YEAR_BADGES.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(0.2 + Math.random() * 0.3),
          year: y + 'yr', alpha: 0.06 + Math.random() * 0.08,
          size: 20 + Math.random() * 22,
          wobble: Math.random() * Math.PI * 2,
          wSpd: 0.008 + Math.random() * 0.01,
          rot: (Math.random() - 0.5) * 0.3,
        });
      });
    }

    function resize() {
      W = canvas!.width  = container!.offsetWidth;
      H = canvas!.height = container!.offsetHeight;
      initStars();
      initLanterns();
      initRibbons();
      initYearBadges();
    }

    /* ══════════════ SPAWNERS ══════════════ */
    function spawnLantern(initial = false) {
      LANTERNS.push({
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + 60,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.5 + Math.random() * 0.8),
        size: 18 + Math.random() * 24,
        hue: [...ROSE_GOLD, ...CHAMPAGNE][Math.floor(Math.random() * (ROSE_GOLD.length + CHAMPAGNE.length))],
        alpha: 0.25 + Math.random() * 0.45,
        wobble: Math.random() * Math.PI * 2,
        wSpd: 0.015 + Math.random() * 0.02,
        glow: 0.4 + Math.random() * 0.6,
        glowDir: Math.random() > 0.5 ? 1 : -1,
        flame: 0, flameSpd: 0.08 + Math.random() * 0.12,
      });
    }

    function spawnRibbon(initial = false) {
      RIBBONS.push({
        x: Math.random() * W,
        y: initial ? Math.random() * H : -20,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.4 + Math.random() * 0.7,
        length: 60 + Math.random() * 80,
        hue: randHue(),
        alpha: 0.2 + Math.random() * 0.35,
        angle: Math.random() * Math.PI * 2,
        angleSpd: (Math.random() - 0.5) * 0.03,
        wave: Math.random() * Math.PI * 2,
        waveSpd: 0.04 + Math.random() * 0.05,
        thickness: 1.5 + Math.random() * 2.5,
        points: [],
      });
    }

    function spawnSparkle(x: number, y: number, hue: number) {
      SPARKLES.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: -(1 + Math.random() * 3),
        life: 1, hue,
        r: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.2,
        trail: [],
      });
    }

    function spawnFireworkShell(x: number, y: number, hue: number) {
      FW_SHELLS.push({
        x, y,
        vy: -(12 + Math.random() * 8),
        targetY: y - (200 + Math.random() * 180),
        hue, trail: [], exploded: false,
      });
    }

    function explodeFirework(shell: FireworkShell) {
      const COUNT = 60 + Math.floor(Math.random() * 30);
      for (let i = 0; i < COUNT; i++) {
        const angle  = (i / COUNT) * Math.PI * 2;
        const speed  = 2 + Math.random() * 6;
        const h2     = shell.hue + (Math.random() - 0.5) * 30;
        FW_PARTS.push({
          x: shell.x, y: shell.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1, hue: h2,
          r: 1.5 + Math.random() * 2.5,
          trail: [], gravity: 0.06 + Math.random() * 0.04,
          alpha: 1,
        });
      }
      /* Glitter ring */
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        FW_PARTS.push({
          x: shell.x, y: shell.y,
          vx: Math.cos(angle) * (1 + Math.random() * 2.5),
          vy: Math.sin(angle) * (1 + Math.random() * 2.5),
          life: 1, hue: champHue(),
          r: 1 + Math.random() * 1.5,
          trail: [], gravity: 0.02,
          alpha: 0.9,
        });
      }
    }

    /* ══════════════ CLICK HANDLER ══════════════ */
    const onClick = (e: MouseEvent) => {
      const rect = container!.getBoundingClientRect();
      const cx   = e.clientX - rect.left;
      const cy   = e.clientY - rect.top;
      const hue  = roseHue();

      /* Multiple firework shells from click point */
      for (let i = 0; i < 4; i++) {
        const ox = cx + (Math.random() - 0.5) * 80;
        const oy = cy + Math.random() * 40;
        setTimeout(() => spawnFireworkShell(ox, oy, hue + (Math.random() - 0.5) * 40), i * 120);
      }

      /* Immediate burst rings */
      const burst: ClickBurst = { x: cx, y: cy, rings: [], particles: [], life: 1 };
      for (let i = 0; i < 5; i++) {
        burst.rings.push({ x: cx, y: cy, r: i * 15, maxR: 200 + i * 40, life: 1, hue, width: 2 });
      }
      /* Burst particles */
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2;
        const spd   = 3 + Math.random() * 8;
        burst.particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 1, hue: randHue(),
          r: 2 + Math.random() * 4,
          trail: [], gravity: 0.1,
          alpha: 1,
        });
      }
      CLICK_BURSTS.push(burst);

      /* Sparkles around click */
      for (let i = 0; i < 20; i++) {
        spawnSparkle(
          cx + (Math.random() - 0.5) * 60,
          cy + (Math.random() - 0.5) * 60,
          randHue()
        );
      }

      /* Extra lanterns */
      for (let i = 0; i < 3; i++) {
        LANTERNS.push({
          x: cx + (Math.random() - 0.5) * 100,
          y: cy,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -(1.5 + Math.random() * 2),
          size: 20 + Math.random() * 18,
          hue: roseHue(),
          alpha: 0.8,
          wobble: Math.random() * Math.PI * 2,
          wSpd: 0.02,
          glow: 1, glowDir: 1,
          flame: 0, flameSpd: 0.1,
        });
      }
    };

    /* ══════════════ RESIZE & EVENTS ══════════════ */
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const onMM = (e: MouseEvent) => {
      const r = container!.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    };
    const onML = () => { mx = -9999; my = -9999; };
    container.addEventListener('mousemove', onMM);
    container.addEventListener('mouseleave', onML);
    container.addEventListener('click', onClick);

    /* ══════════════ DRAW FUNCTIONS ══════════════ */

    /* Background gradient */
    function drawBackground() {
      const bg = ctx!.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0,    '#0d0408');
      bg.addColorStop(0.3,  '#110308');
      bg.addColorStop(0.6,  '#0f0209');
      bg.addColorStop(1,    '#08020a');
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      /* Soft center warmth */
      const warm = ctx!.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, Math.max(W, H) * 0.65);
      warm.addColorStop(0,   'rgba(120, 40, 60, 0.22)');
      warm.addColorStop(0.4, 'rgba(80, 20, 30, 0.12)');
      warm.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx!.fillStyle = warm;
      ctx!.fillRect(0, 0, W, H);
    }

    /* Stars */
    function drawStars() {
      STARS.forEach(s => {
        s.pulse   += s.pulseSpd;
        s.twinkle += s.twinkleSpd;
        const a = s.alpha * (0.5 + Math.sin(s.twinkle) * 0.5);
        const r = s.r * (1 + Math.sin(s.pulse) * 0.3);

        ctx!.beginPath();
        ctx!.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${s.hue}, 70%, 90%, ${a})`;
        ctx!.fill();

        if (s.layer === 2 && a > 0.3) {
          const arm = r * 3.5;
          ctx!.beginPath();
          ctx!.moveTo(s.x - arm, s.y); ctx!.lineTo(s.x + arm, s.y);
          ctx!.moveTo(s.x, s.y - arm); ctx!.lineTo(s.x, s.y + arm);
          ctx!.strokeStyle = `hsla(${s.hue}, 80%, 90%, ${a * 0.4})`;
          ctx!.lineWidth = 0.5;
          ctx!.stroke();
        }
      });
    }

    /* Floating lanterns */
    function drawLantern(l: Lantern) {
      l.wobble += l.wSpd;
      l.flame  += l.flameSpd;
      l.glow   += l.glowDir * 0.008;
      if (l.glow > 1) { l.glow = 1; l.glowDir = -1; }
      if (l.glow < 0.3) { l.glow = 0.3; l.glowDir = 1; }

      const wx = Math.sin(l.wobble) * 3;
      const s  = l.size;

      ctx!.save();
      ctx!.translate(l.x + wx, l.y);
      ctx!.globalAlpha = l.alpha;

      /* Glow halo */
      const glowR = s * 2.2;
      const glowG = ctx!.createRadialGradient(0, 0, 0, 0, 0, glowR);
      glowG.addColorStop(0,   `hsla(${l.hue}, 90%, 75%, ${l.glow * 0.5})`);
      glowG.addColorStop(0.5, `hsla(${l.hue}, 80%, 60%, ${l.glow * 0.2})`);
      glowG.addColorStop(1,   `hsla(${l.hue}, 70%, 50%, 0)`);
      ctx!.beginPath();
      ctx!.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx!.fillStyle = glowG;
      ctx!.fill();

      /* Lantern body */
      const bodyG = ctx!.createRadialGradient(-s * 0.2, -s * 0.2, 0, 0, 0, s * 0.9);
      bodyG.addColorStop(0,   `hsla(${l.hue + 15}, 95%, 80%, 0.95)`);
      bodyG.addColorStop(0.5, `hsla(${l.hue}, 85%, 62%, 0.9)`);
      bodyG.addColorStop(1,   `hsla(${l.hue - 10}, 75%, 45%, 0.85)`);
      ctx!.beginPath();
      ctx!.ellipse(0, 0, s * 0.55, s * 0.75, 0, 0, Math.PI * 2);
      ctx!.fillStyle = bodyG;
      ctx!.fill();

      /* Lantern stripes */
      ctx!.strokeStyle = `hsla(${l.hue + 20}, 100%, 90%, 0.15)`;
      ctx!.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx!.beginPath();
        ctx!.moveTo(i * s * 0.15, -s * 0.75);
        ctx!.lineTo(i * s * 0.15, s * 0.75);
        ctx!.stroke();
      }

      /* Top cap */
      ctx!.beginPath();
      ctx!.ellipse(0, -s * 0.72, s * 0.3, s * 0.12, 0, 0, Math.PI * 2);
      ctx!.fillStyle = `hsla(${l.hue}, 70%, 55%, 0.9)`;
      ctx!.fill();

      /* Bottom cap */
      ctx!.beginPath();
      ctx!.ellipse(0, s * 0.72, s * 0.3, s * 0.12, 0, 0, Math.PI * 2);
      ctx!.fillStyle = `hsla(${l.hue}, 70%, 55%, 0.9)`;
      ctx!.fill();

      /* String */
      ctx!.beginPath();
      ctx!.moveTo(0, -s * 0.82);
      ctx!.lineTo(0, -s * 1.1);
      ctx!.strokeStyle = `hsla(${l.hue}, 50%, 70%, 0.6)`;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      /* Inner flame glow */
      const flameG = ctx!.createRadialGradient(0, 0, 0, 0, 0, s * 0.4);
      flameG.addColorStop(0,   `hsla(${l.hue + 20}, 100%, 95%, ${0.5 + Math.sin(l.flame) * 0.3})`);
      flameG.addColorStop(1,   `hsla(${l.hue}, 90%, 65%, 0)`);
      ctx!.beginPath();
      ctx!.ellipse(0, 0, s * 0.4, s * 0.55, 0, 0, Math.PI * 2);
      ctx!.fillStyle = flameG;
      ctx!.fill();

      ctx!.restore();
    }

    function updateDrawLanterns() {
      for (let i = LANTERNS.length - 1; i >= 0; i--) {
        const l = LANTERNS[i];
        l.x += l.vx;
        l.y += l.vy;
        l.alpha -= 0.0005;
        if (l.y < -80 || l.alpha <= 0) {
          LANTERNS.splice(i, 1);
          if (LANTERNS.length < 14) spawnLantern();
          continue;
        }
        drawLantern(l);
      }
    }

    /* Ribbons */
    function updateDrawRibbons() {
      for (let i = RIBBONS.length - 1; i >= 0; i--) {
        const r = RIBBONS[i];
        r.x    += r.vx;
        r.y    += r.vy;
        r.wave += r.waveSpd;
        r.angle += r.angleSpd;
        r.alpha -= 0.0008;

        if (r.y > H + 40 || r.alpha <= 0) {
          RIBBONS.splice(i, 1);
          if (RIBBONS.length < 8) spawnRibbon();
          continue;
        }
        if (r.x < -40) r.x = W + 40;
        if (r.x > W + 40) r.x = -40;

        r.points.push({ x: r.x, y: r.y });
        if (r.points.length > 20) r.points.shift();

        if (r.points.length < 2) continue;

        ctx!.save();
        ctx!.globalAlpha = r.alpha;

        for (let p = 0; p < r.points.length - 1; p++) {
          const prog = p / r.points.length;
          const wave = Math.sin(r.wave + p * 0.5) * 12;
          const p1 = r.points[p];
          const p2 = r.points[p + 1];

          const grad = ctx!.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          grad.addColorStop(0, `hsla(${r.hue}, 85%, 72%, ${prog * 0.8})`);
          grad.addColorStop(1, `hsla(${r.hue + 20}, 90%, 80%, ${(prog + 0.1) * 0.8})`);

          ctx!.beginPath();
          ctx!.moveTo(p1.x + wave, p1.y);
          ctx!.lineTo(p2.x + wave, p2.y);
          ctx!.strokeStyle = grad;
          ctx!.lineWidth = r.thickness * prog;
          ctx!.lineCap = 'round';
          ctx!.stroke();
        }
        ctx!.restore();
      }
    }

    /* Year badges */
    function updateDrawYearBadges() {
      YEAR_BADGES.forEach(b => {
        b.x     += b.vx;
        b.y     += b.vy;
        b.wobble += b.wSpd;

        if (b.y < -40) { b.y = H + 20; b.x = Math.random() * W; }
        if (b.x < -60) b.x = W + 60;
        if (b.x > W + 60) b.x = -60;

        const a = b.alpha + Math.sin(b.wobble) * (b.alpha * 0.5);

        ctx!.save();
        ctx!.translate(b.x, b.y);
        ctx!.rotate(b.rot + Math.sin(b.wobble) * 0.1);
        ctx!.globalAlpha = a;
        ctx!.font = `700 ${b.size}px Georgia, serif`;
        ctx!.fillStyle = `hsla(45, 80%, 72%, 1)`;
        ctx!.textAlign = 'center';
        ctx!.shadowColor = `hsla(345, 90%, 65%, 0.5)`;
        ctx!.shadowBlur  = 10;
        ctx!.fillText(b.year, 0, 0);
        ctx!.restore();
      });
    }

    /* Sparkles */
    function drawStarShape(x: number, y: number, r: number, rot: number, alpha: number, hue: number) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(rot);
      ctx!.globalAlpha = alpha;

      const grd = ctx!.createRadialGradient(0, 0, 0, 0, 0, r * 3);
      grd.addColorStop(0,   `hsla(${hue}, 100%, 98%, 0.9)`);
      grd.addColorStop(0.5, `hsla(${hue}, 90%, 75%, 0.4)`);
      grd.addColorStop(1,   `hsla(${hue}, 80%, 55%, 0)`);
      ctx!.beginPath();
      ctx!.arc(0, 0, r * 3, 0, Math.PI * 2);
      ctx!.fillStyle = grd;
      ctx!.fill();

      /* 4-point star */
      ctx!.beginPath();
      const pts = 4;
      for (let i = 0; i < pts * 2; i++) {
        const angle  = (i / (pts * 2)) * Math.PI * 2;
        const radius = i % 2 === 0 ? r : r * 0.3;
        const px     = Math.cos(angle) * radius;
        const py     = Math.sin(angle) * radius;
        i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
      }
      ctx!.closePath();
      ctx!.fillStyle = `hsla(${hue}, 100%, 96%, 1)`;
      ctx!.fill();
      ctx!.restore();
    }

    function updateDrawSparkles() {
      for (let i = SPARKLES.length - 1; i >= 0; i--) {
        const s = SPARKLES[i];
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 8) s.trail.shift();

        s.x   += s.vx;
        s.y   += s.vy;
        s.vy  += 0.04;
        s.vx  *= 0.97;
        s.life -= 0.018;
        s.rot  += s.rotSpd;

        if (s.life <= 0) { SPARKLES.splice(i, 1); continue; }

        /* Trail */
        for (let t = 0; t < s.trail.length - 1; t++) {
          const prog = t / s.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(s.trail[t].x, s.trail[t].y);
          ctx!.lineTo(s.trail[t + 1].x, s.trail[t + 1].y);
          ctx!.strokeStyle = `hsla(${s.hue}, 90%, 78%, ${prog * s.life * 0.5})`;
          ctx!.lineWidth   = s.r * prog * 0.4;
          ctx!.stroke();
        }

        drawStarShape(s.x, s.y, s.r * s.life, s.rot, s.life, s.hue);
      }
    }

    /* Firework shells */
    function updateDrawFireworkShells() {
      for (let i = FW_SHELLS.length - 1; i >= 0; i--) {
        const s = FW_SHELLS[i];
        if (s.exploded) { FW_SHELLS.splice(i, 1); continue; }

        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 12) s.trail.shift();

        s.y  += s.vy;
        s.vy += 0.3;

        if (s.y <= s.targetY || s.vy >= 0) {
          explodeFirework(s);
          s.exploded = true;

          /* Burst rings on explosion */
          for (let r = 0; r < 4; r++) {
            CLICK_BURSTS[CLICK_BURSTS.length] = {
              x: s.x, y: s.y, life: 1,
              rings: [{
                x: s.x, y: s.y,
                r: r * 20, maxR: 180 + r * 35,
                life: 1, hue: s.hue, width: 2,
              }],
              particles: [],
            };
          }
          continue;
        }

        /* Draw trail */
        for (let t = 0; t < s.trail.length - 1; t++) {
          const prog = t / s.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(s.trail[t].x, s.trail[t].y);
          ctx!.lineTo(s.trail[t + 1].x, s.trail[t + 1].y);
          ctx!.strokeStyle = `hsla(${s.hue}, 100%, 88%, ${prog * 0.9})`;
          ctx!.lineWidth   = 2 * prog;
          ctx!.stroke();
        }
        const headG = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, 6);
        headG.addColorStop(0, `hsla(${s.hue}, 100%, 98%, 1)`);
        headG.addColorStop(1, `hsla(${s.hue}, 90%, 70%, 0)`);
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, 6, 0, Math.PI * 2);
        ctx!.fillStyle = headG;
        ctx!.fill();
      }
    }

    /* Firework particles */
    function updateDrawFireworkParticles() {
      for (let i = FW_PARTS.length - 1; i >= 0; i--) {
        const p = FW_PARTS[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 10) p.trail.shift();

        p.x    += p.vx;
        p.y    += p.vy;
        p.vy   += p.gravity;
        p.vx   *= 0.96;
        p.vy   *= 0.97;
        p.life -= 0.014;
        p.alpha = p.life;

        if (p.life <= 0) { FW_PARTS.splice(i, 1); continue; }

        /* Trail */
        for (let t = 0; t < p.trail.length - 1; t++) {
          const prog = t / p.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(p.trail[t].x, p.trail[t].y);
          ctx!.lineTo(p.trail[t + 1].x, p.trail[t + 1].y);
          ctx!.strokeStyle = `hsla(${p.hue}, 100%, 78%, ${prog * p.alpha * 0.7})`;
          ctx!.lineWidth   = p.r * prog * 0.6;
          ctx!.stroke();
        }

        /* Glow */
        const grd = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grd.addColorStop(0,   `hsla(${p.hue}, 100%, 98%, ${p.alpha * 0.8})`);
        grd.addColorStop(0.4, `hsla(${p.hue}, 95%, 72%, ${p.alpha * 0.3})`);
        grd.addColorStop(1,   `hsla(${p.hue}, 85%, 55%, 0)`);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();

        /* Core */
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * p.alpha, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, 100%, 97%, ${p.alpha})`;
        ctx!.fill();
      }
    }

    /* Click bursts */
    function updateDrawClickBursts() {
      for (let i = CLICK_BURSTS.length - 1; i >= 0; i--) {
        const burst = CLICK_BURSTS[i];
        burst.life -= 0.012;
        if (burst.life <= 0) { CLICK_BURSTS.splice(i, 1); continue; }

        /* Rings */
        for (let r = burst.rings.length - 1; r >= 0; r--) {
          const ring = burst.rings[r];
          ring.r    += (ring.maxR - ring.r) * 0.08 + 2;
          ring.life -= 0.018;
          if (ring.life <= 0) { burst.rings.splice(r, 1); continue; }

          ctx!.beginPath();
          ctx!.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
          ctx!.strokeStyle = `hsla(${ring.hue}, 90%, 78%, ${ring.life * 0.55})`;
          ctx!.lineWidth   = ring.width * ring.life;
          ctx!.stroke();

          ctx!.beginPath();
          ctx!.arc(ring.x, ring.y, ring.r * 0.75, 0, Math.PI * 2);
          ctx!.strokeStyle = `hsla(${ring.hue + 20}, 100%, 92%, ${ring.life * 0.2})`;
          ctx!.lineWidth   = ring.width * 2 * ring.life;
          ctx!.stroke();
        }

        /* Burst particles */
        for (let p = burst.particles.length - 1; p >= 0; p--) {
          const pt = burst.particles[p];
          pt.x    += pt.vx;
          pt.y    += pt.vy;
          pt.vy   += pt.gravity;
          pt.vx   *= 0.94;
          pt.vy   *= 0.95;
          pt.life -= 0.016;
          if (pt.life <= 0) { burst.particles.splice(p, 1); continue; }

          const grd = ctx!.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r * 3);
          grd.addColorStop(0,   `hsla(${pt.hue}, 100%, 96%, ${pt.life * 0.9})`);
          grd.addColorStop(1,   `hsla(${pt.hue}, 80%, 60%, 0)`);
          ctx!.beginPath();
          ctx!.arc(pt.x, pt.y, pt.r * 3, 0, Math.PI * 2);
          ctx!.fillStyle = grd;
          ctx!.fill();

          ctx!.beginPath();
          ctx!.arc(pt.x, pt.y, pt.r * pt.life, 0, Math.PI * 2);
          ctx!.fillStyle = `hsla(${pt.hue}, 100%, 97%, ${pt.life})`;
          ctx!.fill();
        }
      }
    }

    /* Ambient glowing orbs */
    const ORBS = Array.from({ length: 6 }, (_, i) => ({
      x: 0, y: 0,
      bR: 60 + Math.random() * 90,
      ph: Math.random() * Math.PI * 2,
      pSpd: 0.003 + Math.random() * 0.004,
      hue: [...ROSE_GOLD, ...CHAMPAGNE][i % (ROSE_GOLD.length + CHAMPAGNE.length)],
      op: 0.03 + Math.random() * 0.04,
      drift: Math.random() * Math.PI * 2,
      dSpd: 0.002 + Math.random() * 0.003,
    }));

    function initOrbs() {
      ORBS.forEach((o, i) => {
        o.x = W * ((i + 0.5) / 6) + (Math.random() - 0.5) * 60;
        o.y = H * (0.15 + Math.random() * 0.7);
      });
    }

    function drawOrbs() {
      ORBS.forEach(o => {
        o.ph    += o.pSpd;
        o.drift += o.dSpd;
        const r  = o.bR * (1 + Math.sin(o.ph) * 0.2);
        const dx = Math.cos(o.drift) * 20;
        const dy = Math.sin(o.drift) * 14;
        const g  = ctx!.createRadialGradient(o.x + dx, o.y + dy, 0, o.x + dx, o.y + dy, r);
        g.addColorStop(0,   `hsla(${o.hue}, 85%, 75%, ${o.op * 3})`);
        g.addColorStop(0.5, `hsla(${o.hue}, 75%, 60%, ${o.op * 1.5})`);
        g.addColorStop(1,   `hsla(${o.hue}, 65%, 50%, 0)`);
        ctx!.beginPath();
        ctx!.arc(o.x + dx, o.y + dy, r, 0, Math.PI * 2);
        ctx!.fillStyle = g;
        ctx!.fill();
      });
    }

    /* Celebration ring at center */
    let ringAngle = 0;
    function drawCelebrationRings() {
      ringAngle += 0.003;
      const cx = W / 2, cy = H * 0.42;
      const maxR = Math.min(W, H) * 0.38;

      [0.25, 0.45, 0.65, 0.85, 1.0].forEach((scale, idx) => {
        const r   = maxR * scale;
        const rot = ringAngle * (idx % 2 === 0 ? 1 : -1) * (0.5 + idx * 0.2);
        const pts = 8 + idx * 4;
        const hue = idx % 2 === 0 ? roseHue() : champHue();

        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(rot);

        for (let p = 0; p < pts; p++) {
          const angle = (p / pts) * Math.PI * 2;
          const px    = Math.cos(angle) * r;
          const py    = Math.sin(angle) * r;
          const a     = 0.04 + idx * 0.015;

          const grd = ctx!.createRadialGradient(px, py, 0, px, py, 6);
          grd.addColorStop(0, `hsla(${ROSE_GOLD[idx % ROSE_GOLD.length]}, 90%, 80%, ${a * 2.5})`);
          grd.addColorStop(1, `hsla(${ROSE_GOLD[idx % ROSE_GOLD.length]}, 80%, 60%, 0)`);
          ctx!.beginPath();
          ctx!.arc(px, py, 6, 0, Math.PI * 2);
          ctx!.fillStyle = grd;
          ctx!.fill();
        }

        /* Connecting arc */
        ctx!.beginPath();
        ctx!.arc(0, 0, r, 0, Math.PI * 2);
        ctx!.strokeStyle = `hsla(${ROSE_GOLD[idx % ROSE_GOLD.length]}, 70%, 65%, ${0.025 + idx * 0.01})`;
        ctx!.lineWidth   = 0.5;
        ctx!.stroke();

        ctx!.restore();
      });

      /* Center glow */
      const cg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.08);
      cg.addColorStop(0, `hsla(345, 100%, 90%, 0.6)`);
      cg.addColorStop(1, `hsla(345, 90%, 65%, 0)`);
      ctx!.beginPath();
      ctx!.arc(cx, cy, maxR * 0.08, 0, Math.PI * 2);
      ctx!.fillStyle = cg;
      ctx!.fill();
    }

    /* Mouse sparkle trail */
    let mouseTrailTimer = 0;
    function spawnMouseSparkle() {
      if (mx < 0) return;
      mouseTrailTimer++;
      if (mouseTrailTimer % 4 !== 0) return;
      spawnSparkle(
        mx + (Math.random() - 0.5) * 20,
        my + (Math.random() - 0.5) * 20,
        randHue()
      );
    }

    /* Ambient sparkle timer */
    let ambientTimer = 0;
    let lanternTimer = 0;
    let ribbonTimer  = 0;
    let fwAutoTimer  = 0;

    /* ══════════════ MAIN LOOP ══════════════ */
    function loop() {
      time++;
      ctx!.clearRect(0, 0, W, H);

      drawBackground();
      drawStars();

      /* Init orbs after first resize */
      if (time === 1) initOrbs();

      drawOrbs();
      drawCelebrationRings();
      updateDrawYearBadges();
      updateDrawRibbons();
      updateDrawLanterns();

      /* Click/firework effects */
      updateDrawClickBursts();
      updateDrawFireworkShells();
      updateDrawFireworkParticles();
      updateDrawSparkles();

      /* Ambient sparkles */
      ambientTimer++;
      if (ambientTimer > 12) {
        ambientTimer = 0;
        spawnSparkle(
          Math.random() * W,
          Math.random() * H,
          randHue()
        );
      }

      /* Auto fireworks every ~5s */
      fwAutoTimer++;
      if (fwAutoTimer > 300) {
        fwAutoTimer = 0;
        spawnFireworkShell(
          W * 0.2 + Math.random() * W * 0.6,
          H * 0.6 + Math.random() * H * 0.2,
          roseHue()
        );
      }

      spawnMouseSparkle();

      animId = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener('mousemove', onMM);
      container.removeEventListener('mouseleave', onML);
      container.removeEventListener('click', onClick);
    };
  }, []);
}

/* ─────────────────────────────────────────────
   TILT HOOK
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   VARIANTS
───────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const vFadeUp:    Variants = { hidden: { opacity: 0, y: 44 },           show: { opacity: 1, y: 0,    transition: { duration: 0.75, ease: EASE } } };
const vStagger:   Variants = { hidden: {},                               show: { transition: { staggerChildren: 0.13 } } };
const vScaleIn:   Variants = { hidden: { opacity: 0, scale: 0.6, rotateX: -55 }, show: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.95, ease: EASE } } };
const vSlideLeft: Variants = { hidden: { opacity: 0, x: -48 },          show: { opacity: 1, x: 0,    transition: { duration: 0.8, ease: EASE } } };
const vSlideRight:Variants = { hidden: { opacity: 0, x: 48 },           show: { opacity: 1, x: 0,    transition: { duration: 0.8, ease: EASE } } };

const ACCENT      = '#7a9e7e';
const ACCENT_DARK = '#0f1f11';

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const PRODUCTS = products.items;
const CATEGORIES = categories.items;
const CUSTOM_ITEMS = customization.items;
const WHY = why.items;

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function CategoryCard({ item }: { item: typeof CATEGORIES[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { ref, springX, springY, onMouseMove, onMouseLeave } = useTilt(12);
  return (
    <motion.div variants={vScaleIn} style={{ perspective: '1400px', transformStyle: 'preserve-3d' }} className="cursor-pointer">
      <motion.div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={() => { onMouseLeave(); setHovered(false); }}
        onMouseEnter={() => setHovered(true)}
        style={{
          rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', willChange: 'transform',
          boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.12)' : '0 2px 10px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.4s', borderRadius: 16, overflow: 'hidden', background: 'white',
        }}
      >
        <div style={{ height: 280, overflow: 'hidden', position: 'relative' }}>
          <motion.img src={asset(item.img)} alt={item.name} className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.07 : 1 }} transition={{ duration: 0.75, ease: EASE }} style={{ willChange: 'transform' }} />
          <motion.div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: item.accent }}
            animate={{ opacity: hovered ? 0.16 : 0 }} transition={{ duration: 0.4 }} />
          <motion.span
            animate={{ y: hovered ? 0 : -24, opacity: hovered ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="absolute top-4 left-4 text-[9px] uppercase tracking-[0.18em] font-bold text-white px-3 py-1 rounded-sm"
            style={{ backgroundColor: item.accent }}
          >{item.tag}</motion.span>
        </div>
        <div className="p-7 relative overflow-hidden">
          <motion.div className="absolute bottom-0 left-0 h-[3px]" style={{ backgroundColor: item.accent }}
            animate={{ width: hovered ? '100%' : '0%' }} transition={{ duration: 0.45, ease: EASE }} />
          <h3 className="font-serif text-2xl mb-2" style={{ color: ACCENT_DARK }}>{item.name}</h3>
          <p className="text-sm font-light leading-relaxed mb-5" style={{ color: '#73736e' }}>{item.desc}</p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT_DARK }}>
            <motion.span animate={{ x: hovered ? 3 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>{categories.linkText}</motion.span>
            <motion.span animate={{ rotate: hovered ? 45 : 0, x: hovered ? 2 : 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }} style={{ display: 'inline-flex' }}>
              <ArrowRight size={11} />
            </motion.span>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)', borderRadius: 16 }} />
      </motion.div>
    </motion.div>
  );
}

function ProductCard({ item, index }: { item: typeof PRODUCTS[0]; index: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 44 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 44 }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: EASE }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="cursor-pointer"
      style={{ minWidth: 360, scrollSnapAlign: 'start' }}
    >
      <div className="relative overflow-hidden mb-4" style={{ aspectRatio: '1', borderRadius: 16 }}>
        <motion.img src={asset(item.img)} alt={item.name} className="w-full h-full object-cover"
          animate={{ scale: hovered ? 1.06 : 1 }} transition={{ duration: 0.65, ease: EASE }} style={{ willChange: 'transform' }} />
        <span className="absolute top-4 left-4 text-[10px] font-bold uppercase text-white px-4 py-1 rounded-full"
          style={{ background: 'rgba(90,138,110,0.85)', backdropFilter: 'blur(6px)', letterSpacing: 2 }}>{item.tag}</span>
      </div>
      <h4 className="font-serif text-xl mb-1" style={{ color: ACCENT_DARK }}>{item.name}</h4>
    </motion.div>
  );
}

function WhyCard({ item, index }: { item: typeof WHY[0]; index: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.3 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: EASE }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="text-center p-6 cursor-pointer"
    >
      <motion.div
        className="flex items-center justify-center mx-auto mb-5 rounded-full text-3xl"
        style={{ width: 64, height: 64 }}
        animate={{ background: hovered ? ACCENT : '#eaf2eb', color: hovered ? 'white' : ACCENT_DARK }}
        transition={{ duration: 0.3 }}
      >{item.symbol}</motion.div>
      <h4 className="font-bold text-xs uppercase tracking-widest mb-2">{item.title}</h4>
      <p className="text-xs font-light leading-relaxed" style={{ color: '#73736e' }}>{item.desc}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function WorkAnniversary() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef   = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const textY       = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const springTxt   = useSpring(textY, { stiffness: 80, damping: 25 });

  useCelebrationCanvas(canvasRef, heroRef);

  const { ref: aRef, springX: aX, springY: aY, onMouseMove: aMM, onMouseLeave: aML } = useTilt(6);

  const aboutRef = useRef<HTMLElement>(null);
  const catRef   = useRef<HTMLElement>(null);
  const custRef  = useRef<HTMLElement>(null);
  const ctaRef   = useRef<HTMLElement>(null);

  const aboutInView = useInView(aboutRef, { once: false, amount: 0.2 });
  const catInView   = useInView(catRef,   { once: false, amount: 0.15 });
  const custInView  = useInView(custRef,  { once: false, amount: 0.15 });
  const ctaInView   = useInView(ctaRef,   { once: false, amount: 0.3 });

  return (
    <div className="overflow-x-hidden" style={{ background: '#f5f9f5', fontFamily: 'inherit' }}>

      {/* ══ HERO ══════════════════════════════════ */}
      <section ref={heroRef} className="relative flex items-center overflow-hidden" style={{ minHeight: '100vh' }}>

        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />

        {/* Gradient overlays */}
        <div className="absolute bottom-0 left-0 right-0 h-56 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(8,2,6,0.7) 0%, transparent 100%)', zIndex: 1 }} />
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(8,2,6,0.5) 0%, transparent 100%)', zIndex: 1 }} />

        {/* Click hint */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5, duration: 1 }}
          className="absolute top-6 right-8 z-10 pointer-events-none flex items-center gap-2"
          style={{ color: 'rgba(255,180,180,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}
        >
          <motion.span animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>{hero.clickHintSymbol}</motion.span>
          {hero.clickHint}
        </motion.div>

        {/* Hero text */}
        <motion.div
          style={{ y: springTxt, opacity: heroOpacity, willChange: 'transform' }}
          className="absolute bottom-20 left-8 md:left-20 z-10 max-w-3xl px-4"
        >
          <motion.p
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[10px] uppercase tracking-[0.32em] font-bold mb-5 flex items-center gap-3"
            style={{ color: 'rgba(255,180,160,0.7)' }}
          >
            <span className="w-10 h-px inline-block" style={{ background: 'rgba(255,180,160,0.6)' }} />
            {hero.eyebrow}
          </motion.p>

          <h1 className="font-serif text-white" style={{ fontSize: 'clamp(3rem,7vw,6rem)', lineHeight: 1.08 }}>
            {[hero.titleLine1, hero.titleLine2].map((word, i) => (
              <motion.span
                key={word}
                initial={{ rotateX: -90, opacity: 0, y: 40 }}
                animate={{ rotateX: 0, opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.15, ease: EASE }}
                style={{ display: 'block', transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}
              >{word}</motion.span>
            ))}
            <motion.span
              initial={{ rotateX: -90, opacity: 0, y: 40 }}
              animate={{ rotateX: 0, opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
              style={{
                display: 'block', fontStyle: 'italic', fontWeight: 400,
                transformOrigin: 'bottom center', transformStyle: 'preserve-3d',
                color: 'rgba(255,200,190,0.9)',
              }}
            >{hero.titleHighlight}</motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.8 }}
            className="text-white/75 mt-6 max-w-md text-lg font-light leading-relaxed"
          >
            {hero.intro}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 1.05 }}
            className="flex gap-4 mt-10 flex-wrap"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2, boxShadow: '0 12px 32px rgba(180,80,100,0.45)' }}
              whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full"
              style={{ background: 'linear-gradient(135deg, #b85068, #8a3048)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 30px rgba(180,80,100,0.4)' }}
            >{hero.primaryButton}</motion.button>

            <motion.button
              whileHover={{ scale: 1.04, y: -2, background: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              onClick={() => window.location.href = '/contact'}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full"
              style={{ background: 'transparent', border: '1px solid rgba(255,180,180,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}
            >{hero.secondaryButton}</motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        >
          <span className="text-white/35 text-[9px] uppercase tracking-[0.3em] font-bold">{hero.scrollLabel}</span>
          <motion.div
            animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 28, background: 'linear-gradient(to bottom, rgba(255,180,160,0.8), transparent)' }}
          />
        </motion.div>
      </section>

      {/* ══ ABOUT ═════════════════════════════════ */}
      <section ref={aboutRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#f5f9f5' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vStagger} initial="hidden" animate={aboutInView ? 'show' : 'hidden'}>
            <motion.div variants={vFadeUp}>
              <motion.div
                initial={{ scaleX: 0 }} animate={aboutInView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                style={{ originX: 0, height: 3, width: 80, background: ACCENT, marginBottom: 24 }}
              />
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-4" style={{ color: ACCENT }}>{about.eyebrow}</p>
            </motion.div>
            <motion.h2 variants={vFadeUp} className="text-5xl font-serif leading-tight mb-8" style={{ color: ACCENT_DARK }}>
              {about.titleLine1}<br />{about.titleLine2}
            </motion.h2>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-5" style={{ color: '#73736e' }}>
              {about.paragraph1}
            </motion.p>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-10" style={{ color: '#73736e' }}>
              {about.paragraph2}
            </motion.p>
            <motion.div variants={vFadeUp} className="flex items-center gap-4 pt-8" style={{ borderTop: '1px solid #d0e4d2' }}>
              <div className="flex items-center justify-center rounded-full text-2xl flex-shrink-0"
                style={{ width: 48, height: 48, background: '#daeedd' }}>{about.badgeSymbol}</div>
              <p className="font-semibold text-sm" style={{ color: ACCENT }}>{about.badgeText}</p>
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} animate={aboutInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.85, ease: EASE }} style={{ perspective: '1200px' }}
          >
            <motion.div ref={aRef} onMouseMove={aMM} onMouseLeave={aML}
              style={{ rotateX: aX, rotateY: aY, transformStyle: 'preserve-3d', willChange: 'transform' }}>
              <img
                src={asset(about.image)}
                alt={about.imageAlt} className="w-full rounded-2xl shadow-2xl"
                style={{ aspectRatio: '4/5', objectFit: 'cover' }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ CATEGORIES ════════════════════════════ */}
      <section ref={catRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#ebf3ec' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={catInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }} className="text-center mb-14"
          >
            <h2 className="text-5xl font-serif mb-4" style={{ color: ACCENT_DARK }}>{categories.title}</h2>
            <p className="font-light text-sm max-w-lg mx-auto" style={{ color: '#73736e' }}>
              {categories.intro}
            </p>
          </motion.div>
          <motion.div
            variants={vStagger} initial="hidden" animate={catInView ? 'show' : 'hidden'}
            className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ perspective: '1600px' }}
          >
            {CATEGORIES.map((item, i) => <CategoryCard key={item.name} item={item} index={i} />)}
          </motion.div>
        </div>
      </section>

      {/* ══ PRODUCTS ══════════════════════════════ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#f5f9f5' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.6 }}
            className="flex justify-between items-end mb-12"
          >
            <div>
              <h2 className="text-5xl font-serif mb-2" style={{ color: ACCENT_DARK }}>{products.title}</h2>
              <p className="font-light" style={{ color: '#73736e' }}>{products.intro}</p>
            </div>
            <motion.a whileHover={{ y: -1 }}
              className="font-bold text-xs uppercase tracking-widest border-b-2 pb-1 cursor-pointer"
              style={{ borderColor: ACCENT, color: ACCENT_DARK }}>{products.viewAllText}</motion.a>
          </motion.div>
          <div className="flex gap-6 overflow-x-auto pb-4"
            style={{ scrollSnapType: 'x mandatory', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {PRODUCTS.map((p, i) => <ProductCard key={p.name} item={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ CUSTOMIZATION ═════════════════════════ */}
      <section ref={custRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: ACCENT_DARK }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vSlideLeft} initial="hidden" animate={custInView ? 'show' : 'hidden'}>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/60 mb-4">{customization.eyebrow}</p>
            <h2 className="text-5xl font-serif text-white leading-tight mb-6">
              {customization.title}<br />
              <span style={{ color: '#a8d5ad', fontStyle: 'italic', fontWeight: 400 }}>{customization.titleHighlight}</span>
            </h2>
            <p className="text-lg font-light leading-relaxed mb-12" style={{ color: 'rgba(212,212,212,0.7)' }}>
              {customization.intro}
            </p>
            <motion.div variants={vStagger} initial="hidden" animate={custInView ? 'show' : 'hidden'} className="grid grid-cols-2 gap-8">
              {CUSTOM_ITEMS.map(item => (
                <motion.div key={item.title} variants={vFadeUp} className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center text-lg rounded-lg"
                    style={{ width: 40, height: 40, border: '1px solid rgba(168,213,173,0.3)', color: '#a8d5ad' }}>{item.symbol}</div>
                  <div>
                    <h5 className="font-semibold text-white text-sm mb-1">{item.title}</h5>
                    <p className="text-xs font-light leading-relaxed" style={{ color: 'rgba(212,212,212,0.6)' }}>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div variants={vSlideRight} initial="hidden" animate={custInView ? 'show' : 'hidden'} style={{ position: 'relative' }}>
            <div className="absolute inset-0 rounded-3xl opacity-40"
              style={{ background: ACCENT, transform: 'rotate(3deg) scale(0.95)' }} />
            <div className="relative rounded-3xl overflow-hidden p-6" style={{ background: '#ebf3ec' }}>
              <img src={asset(customization.image)}
                className="w-full rounded-2xl shadow-xl" style={{ aspectRatio: '1', objectFit: 'cover' }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ WHY ═══════════════════════════════════ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-serif" style={{ color: ACCENT_DARK }}>{why.title}</h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {WHY.map((item, i) => <WhyCard key={item.title} item={item} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ TRUST ═════════════════════════════════ */}
      {clients.length > 0 && (
      <section className="py-14 px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            className="text-center text-[9px] uppercase tracking-[0.3em] font-bold mb-10"
            style={{ color: '#a6a6a1' }}
          >{trust.title}</motion.p>
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 0.6 }}
            viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.6 }}
            className="flex flex-wrap justify-center gap-16"
          >
            {clients.map(c => c.logo
              ? <img key={c.name} src={c.logo} alt={c.name} style={{ height: 32, objectFit: 'contain' }} />
              : <span key={c.name} className="font-serif text-xl font-bold" style={{ color: '#4d4941', letterSpacing: -0.5 }}>{c.name}</span>)}
          </motion.div>
        </div>
      </section>
      )}

      {/* ══ CTA ═══════════════════════════════════ */}
      <section ref={ctaRef} className="py-12 px-8 text-center" style={{ background: '#ebf3ec' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, letterSpacing: '-0.05em', y: 20 }}
            animate={ctaInView ? { opacity: 1, letterSpacing: '-0.01em', y: 0 } : { opacity: 0, letterSpacing: '-0.05em', y: 20 }}
            transition={{ duration: 0.85, ease: EASE }}
            className="font-serif text-5xl md:text-6xl leading-tight mb-6" style={{ color: ACCENT_DARK }}
          >
            {cta.titleLine1}<br /><span className="italic font-normal">{cta.titleHighlight}</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-xl font-light leading-relaxed mb-12" style={{ color: '#73736e' }}
          >
            {cta.intro}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="flex flex-col sm:flex-row justify-center gap-6"
          >
            <motion.button
              whileHover={{ scale: 1.06, y: -3, boxShadow: '0 18px 40px rgba(122,158,126,0.35)' }}
              whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              onClick={() => window.location.href = '/get-proposal'}
              className="text-white font-bold uppercase tracking-[0.2em] text-xs px-14 py-6 rounded-full shadow-xl"
              style={{ background: ACCENT, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >{cta.primaryButton}</motion.button>

            <motion.button
              whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="font-bold uppercase tracking-[0.2em] text-xs pb-1"
              onClick={() => window.location.href = '/contact'}
              style={{
                background: 'transparent', border: 'none',
                borderBottom: '2px solid rgba(122,158,126,0.3)',
                cursor: 'pointer', fontFamily: 'inherit', color: ACCENT_DARK,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderBottomColor = ACCENT)}
              onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'rgba(122,158,126,0.3)')}
            >{cta.secondaryButton}</motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}