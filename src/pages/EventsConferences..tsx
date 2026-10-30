import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
} from 'motion/react';
import type { Variants } from 'motion/react';
import { clients } from '../lib/clients';
import { asset } from '../lib/content';
import content from '../content/pages/events-conferences.json';

// Page words and photos: src/content/pages/events-conferences.json (admin → Pages → Events & Conferences)
const { hero, about, collections, products, customization, why, trust, cta } = content;

/* BRAND TOKENS */
const BRAND = {
  deepOlive: '#444f36',
  sage: '#708156',
  sageLight: '#b3bea0',
  gold: '#b5a26a',
  warmBeige: '#f8f7f5',
  taupe: '#3d3a34',
} as const;

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ═════════════════════════════════════════════════════════
   EVENTS & CONFERENCES CANVAS — Full Themed Design
   
   ● 4 rotating stage spotlights sweeping from top
   ● Crowd-biased glowing node network with neon pulses
   ● Ambient confetti rain (ribbons + squares)
   ● Stage floor uplights (3 colored pools)
   ● Mouse cursor spotlight follow
   ● Click → starburst + confetti explosion + ripples + ticker tape
   ● Corner diamond ornaments with breathing pulse
   ● Horizontal scanning laser lines
   ● Floating event badge sparkle particles
═════════════════════════════════════════════════════════ */
function useEventsCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rawCtx = canvas.getContext('2d', { alpha: true });
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;

    let W = 0, H = 0, animId: number;
    let mx = -9999, my = -9999;
    let frame = 0, time = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* ── Interfaces ── */
    interface Node {
      x: number; y: number; vx: number; vy: number;
      ox: number; oy: number; hue: number; r: number;
      excited: number; pulsePhase: number;
    }
    interface Pulse {
      from: number; to: number; t: number;
      hue: number; speed: number;
    }
    interface Confetti {
      x: number; y: number; vx: number; vy: number;
      w: number; h: number; rot: number; rotV: number;
      hue: number; alpha: number; life: number; ribbon: boolean;
      wobble: number; wobbleSpeed: number;
    }
    interface Spotlight {
      angle: number; speed: number; spread: number;
      hue: number; phase: number; originX: number; intensity: number;
    }
    interface StarBurst {
      x: number; y: number; life: number; maxLife: number;
      rays: number; hue: number; scale: number;
    }
    interface Ripple {
      x: number; y: number; r: number; maxR: number;
      life: number; hue: number; delay: number;
    }
    interface Ticker {
      x: number; y: number; vx: number; vy: number;
      alpha: number; life: number; hue: number; size: number;
    }
    interface LaserLine {
      y: number; speed: number; hue: number;
      alpha: number; direction: number;
    }
    interface BadgeSparkle {
      x: number; y: number; vx: number; vy: number;
      size: number; hue: number; alpha: number;
      life: number; twinkleSpeed: number;
    }

    /* ── Collections ── */
    const NODES: Node[] = [];
    const PULSES: Pulse[] = [];
    const CONFETTI: Confetti[] = [];
    const SPOTLIGHTS: Spotlight[] = [];
    const STARBURSTS: StarBurst[] = [];
    const RIPPLES: Ripple[] = [];
    const TICKERS: Ticker[] = [];
    const LASERS: LaserLine[] = [];
    const SPARKLES: BadgeSparkle[] = [];

    /* ── Resize ── */
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = container.offsetWidth;
      H = container.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (NODES.length === 0) initNodes();
      if (SPOTLIGHTS.length === 0) initSpotlights();
      if (LASERS.length === 0) initLasers();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    /* ── Mouse ── */
    const getPos = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMouseMove = (e: MouseEvent) => {
      const p = getPos(e);
      mx = p.x;
      my = p.y;
    };
    const onMouseLeave = () => {
      mx = -9999;
      my = -9999;
    };
    container.addEventListener('mousemove', onMouseMove, { passive: true });
    container.addEventListener('mouseleave', onMouseLeave, { passive: true });

    /* ── Click Handler ── */
    const onClick = (e: MouseEvent) => {
      const { x: cx, y: cy } = getPos(e);
      const hue = [42, 78, 200, 280, 340][Math.floor(Math.random() * 5)];

      // Starburst
      STARBURSTS.push({
        x: cx, y: cy, life: 1, maxLife: 1,
        rays: 12, hue, scale: 0,
      });

      // Ripples
      for (let i = 0; i < 5; i++) {
        RIPPLES.push({
          x: cx, y: cy, r: i * 15,
          maxR: 160 + i * 40, life: 1,
          hue, delay: i * 4,
        });
      }

      // Confetti explosion
      for (let i = 0; i < 55; i++) {
        const angle = Math.random() * Math.PI * 2;
        const vel = 2.5 + Math.random() * 5.5;
        const isRibbon = Math.random() > 0.6;
        CONFETTI.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * vel,
          vy: Math.sin(angle) * vel - 3,
          w: isRibbon ? 2 + Math.random() * 2 : 5 + Math.random() * 6,
          h: isRibbon ? 14 + Math.random() * 10 : 5 + Math.random() * 6,
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random() - 0.5) * 0.25,
          hue: [42, 78, 200, 340, 55][Math.floor(Math.random() * 5)],
          alpha: 1, life: 1, ribbon: isRibbon,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.04 + Math.random() * 0.06,
        });
      }

      // Ticker tape
      for (let i = 0; i < 20; i++) {
        TICKERS.push({
          x: cx + (Math.random() - 0.5) * 60, y: cy,
          vx: (Math.random() - 0.5) * 3,
          vy: -3 - Math.random() * 4,
          alpha: 1, life: 1,
          hue: [42, 78, 200][Math.floor(Math.random() * 3)],
          size: 1 + Math.random() * 2,
        });
      }

      // Badge sparkles burst
      for (let i = 0; i < 15; i++) {
        const a = Math.random() * Math.PI * 2;
        SPARKLES.push({
          x: cx, y: cy,
          vx: Math.cos(a) * (1 + Math.random() * 3),
          vy: Math.sin(a) * (1 + Math.random() * 3) - 1.5,
          size: 2 + Math.random() * 3,
          hue: [42, 78][Math.floor(Math.random() * 2)],
          alpha: 1, life: 1,
          twinkleSpeed: 0.1 + Math.random() * 0.15,
        });
      }

      // Excite nearby nodes
      NODES.forEach(n => {
        const d = Math.hypot(n.x - cx, n.y - cy);
        if (d < 260) n.excited = Math.min(1, n.excited + (1 - d / 260) * 0.9);
      });
    };
    container.addEventListener('click', onClick, { passive: true });

    /* ═══════════════════════════════════════════════
       1. STAGE SPOTLIGHTS — sweeping cones from top
    ═══════════════════════════════════════════════ */
    function initSpotlights() {
      SPOTLIGHTS.length = 0;
      [
        { originX: 0.12, hue: 42,  speed: 0.0008, spread: 0.20, phase: 0,   intensity: 0.90 },
        { originX: 0.35, hue: 78,  speed: 0.0013, spread: 0.15, phase: 1.8, intensity: 0.75 },
        { originX: 0.65, hue: 200, speed: 0.0010, spread: 0.17, phase: 3.2, intensity: 0.78 },
        { originX: 0.88, hue: 340, speed: 0.0007, spread: 0.22, phase: 5.0, intensity: 0.85 },
      ].forEach(c =>
        SPOTLIGHTS.push({
          angle: 0, speed: c.speed, spread: c.spread,
          hue: c.hue, phase: c.phase, originX: c.originX, intensity: c.intensity,
        })
      );
    }

    function drawSpotlights() {
      SPOTLIGHTS.forEach(sl => {
        sl.phase += sl.speed;
        const baseAngle = Math.PI / 2;
        sl.angle = baseAngle + Math.sin(sl.phase) * sl.spread;

        const ox = W * sl.originX;
        const oy = -10;
        const length = H * 1.4;
        const spreadRad = 0.14;

        const leftAngle = sl.angle - spreadRad;
        const rightAngle = sl.angle + spreadRad;
        const lx = ox + Math.cos(leftAngle) * length;
        const ly = oy + Math.sin(leftAngle) * length;
        const rx = ox + Math.cos(rightAngle) * length;
        const ry = oy + Math.sin(rightAngle) * length;
        const cx2 = ox + Math.cos(sl.angle) * length;
        const cy2 = oy + Math.sin(sl.angle) * length;

        // Mouse proximity boost
        let boost = 1;
        if (mx > -9999) {
          const dx = mx - ox, dy = my - oy;
          const mAngle = Math.atan2(dy, dx);
          const diff = Math.abs(mAngle - sl.angle);
          if (diff < 0.35) boost = 1 + (0.35 - diff) / 0.35 * 0.9;
        }

        const alpha = sl.intensity * 0.14 * boost;

        // Cone
        const grad = ctx.createRadialGradient(ox, oy, 0, cx2, cy2, length * 0.7);
        grad.addColorStop(0, `hsla(${sl.hue}, 75%, 92%, ${alpha * 1.7})`);
        grad.addColorStop(0.3, `hsla(${sl.hue}, 68%, 85%, ${alpha * 1.0})`);
        grad.addColorStop(0.65, `hsla(${sl.hue}, 60%, 80%, ${alpha * 0.4})`);
        grad.addColorStop(1, 'transparent');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(lx, ly);
        ctx.quadraticCurveTo(cx2, cy2, rx, ry);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Source glow
        const srcGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, 32);
        srcGrad.addColorStop(0, `hsla(${sl.hue}, 95%, 98%, ${0.6 * boost})`);
        srcGrad.addColorStop(0.5, `hsla(${sl.hue}, 85%, 88%, ${0.22 * boost})`);
        srcGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(ox, oy, 32, 0, Math.PI * 2);
        ctx.fillStyle = srcGrad;
        ctx.fill();

        // Lens flare streak
        ctx.globalAlpha = 0.08 * boost;
        ctx.strokeStyle = `hsl(${sl.hue}, 80%, 90%)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox - 50, oy);
        ctx.lineTo(ox + 50, oy);
        ctx.stroke();

        ctx.restore();
      });
    }

    /* ═══════════════════════════════════════════════
       2. LASER SCAN LINES
    ═══════════════════════════════════════════════ */
    function initLasers() {
      LASERS.length = 0;
      for (let i = 0; i < 3; i++) {
        LASERS.push({
          y: Math.random() * H,
          speed: 0.3 + Math.random() * 0.5,
          hue: [42, 78, 200][i],
          alpha: 0.06 + Math.random() * 0.04,
          direction: Math.random() > 0.5 ? 1 : -1,
        });
      }
    }

    function drawLasers() {
      LASERS.forEach(laser => {
        laser.y += laser.speed * laser.direction;
        if (laser.y > H + 20) { laser.y = -20; laser.direction = 1; }
        if (laser.y < -20) { laser.y = H + 20; laser.direction = -1; }

        // Horizontal scanning line
        const grad = ctx.createLinearGradient(0, laser.y, W, laser.y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.2, `hsla(${laser.hue}, 90%, 80%, ${laser.alpha})`);
        grad.addColorStop(0.5, `hsla(${laser.hue}, 95%, 90%, ${laser.alpha * 1.5})`);
        grad.addColorStop(0.8, `hsla(${laser.hue}, 90%, 80%, ${laser.alpha})`);
        grad.addColorStop(1, 'transparent');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, laser.y);
        ctx.lineTo(W, laser.y);
        ctx.stroke();

        // Soft glow band
        const bandGrad = ctx.createLinearGradient(0, laser.y - 15, 0, laser.y + 15);
        bandGrad.addColorStop(0, 'transparent');
        bandGrad.addColorStop(0.5, `hsla(${laser.hue}, 80%, 85%, ${laser.alpha * 0.5})`);
        bandGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bandGrad;
        ctx.fillRect(0, laser.y - 15, W, 30);
      });
    }

    /* ═══════════════════════════════════════════════
       3. CROWD NODE NETWORK
    ═══════════════════════════════════════════════ */
    function initNodes() {
      NODES.length = 0;
      const count = Math.floor((W * H) / 13000) + 48;
      for (let i = 0; i < count; i++) {
        const yBias = Math.pow(Math.random(), 0.55);
        const x = Math.random() * W;
        const y = H * 0.22 + yBias * H * 0.68;
        NODES.push({
          x, y, ox: x, oy: y,
          vx: (Math.random() - 0.5) * 0.32,
          vy: (Math.random() - 0.5) * 0.22,
          hue: [42, 78, 200, 280, 340][Math.floor(Math.random() * 5)],
          r: 1.8 + Math.random() * 2.0,
          excited: 0,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    }

    function spawnPulse(fromIdx: number) {
      let best = -1, bestD = 9999;
      for (let j = 0; j < NODES.length; j++) {
        if (j === fromIdx) continue;
        const d = Math.hypot(NODES[fromIdx].x - NODES[j].x, NODES[fromIdx].y - NODES[j].y);
        if (d < 175 && d < bestD) { best = j; bestD = d; }
      }
      if (best === -1) return;
      PULSES.push({
        from: fromIdx, to: best, t: 0,
        hue: NODES[fromIdx].hue,
        speed: 0.013 + Math.random() * 0.013,
      });
    }

    let pulseTimer = 0;

    function updateNetwork() {
      const LINK_DIST = 145;

      // Update nodes
      NODES.forEach(n => {
        n.excited = Math.max(0, n.excited - 0.013);
        n.pulsePhase += 0.024;

        // Home spring
        n.vx += (n.ox - n.x) * 0.0005;
        n.vy += (n.oy - n.y) * 0.0005;

        // Mouse repulsion
        if (mx > -9999) {
          const dx = n.x - mx, dy = n.y - my;
          const d = Math.hypot(dx, dy);
          if (d < 190 && d > 0) {
            const f = (190 - d) / 190;
            n.vx += (dx / d) * f * f * 0.75;
            n.vy += (dy / d) * f * f * 0.75;
          }
        }

        n.vx *= 0.89; n.vy *= 0.89;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) { n.x = 0; n.vx *= -0.5; }
        if (n.x > W) { n.x = W; n.vx *= -0.5; }
        if (n.y < 0) { n.y = 0; n.vy *= -0.5; }
        if (n.y > H) { n.y = H; n.vy *= -0.5; }
      });

      // Draw connections
      ctx.save();
      for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
          const a = NODES[i], b = NODES[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK_DIST * LINK_DIST) continue;
          const d = Math.sqrt(d2);
          const t = 1 - d / LINK_DIST;
          const exc = (a.excited + b.excited) * 0.5;
          const alpha = t * 0.16 + exc * 0.38;
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, `hsla(${a.hue}, 92%, 75%, ${alpha})`);
          grad.addColorStop(1, `hsla(${b.hue}, 92%, 75%, ${alpha})`);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.6 + exc * 1.3;
          ctx.stroke();
        }
      }
      ctx.restore();

      // Pulse orbs
      for (let i = PULSES.length - 1; i >= 0; i--) {
        const p = PULSES[i];
        p.t = Math.min(1, p.t + p.speed);
        if (p.t >= 1) {
          NODES[p.to].excited = Math.min(1, NODES[p.to].excited + 0.8);
          PULSES.splice(i, 1);
          continue;
        }
        const a = NODES[p.from], b = NODES[p.to];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;

        // Neon glow trail
        const trailGrad = ctx.createRadialGradient(x, y, 0, x, y, 12);
        trailGrad.addColorStop(0, `hsla(${p.hue}, 100%, 95%, 0.9)`);
        trailGrad.addColorStop(0.3, `hsla(${p.hue}, 95%, 82%, 0.5)`);
        trailGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = trailGrad;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();

        // Hot white core
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.fill();
      }

      // Draw nodes
      NODES.forEach(n => {
        const pulse = Math.sin(n.pulsePhase) * 0.5 + 0.5;
        const size = n.r + n.excited * 3.8 + pulse * 0.9;
        const brightness = 68 + n.excited * 27;

        // Outer neon glow
        const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, size * 4.5);
        gr.addColorStop(0, `hsla(${n.hue}, 92%, ${brightness}%, ${0.28 + n.excited * 0.55 + pulse * 0.12})`);
        gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(n.x, n.y, size * 4.5, 0, Math.PI * 2); ctx.fill();

        // Core
        ctx.fillStyle = `hsl(${n.hue}, 88%, ${brightness}%)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, size, 0, Math.PI * 2); ctx.fill();

        // White hot center when excited
        if (n.excited > 0.25) {
          ctx.fillStyle = `rgba(255,255,255,${n.excited * 0.75})`;
          ctx.beginPath(); ctx.arc(n.x, n.y, size * 0.5, 0, Math.PI * 2); ctx.fill();
        }
      });

      pulseTimer++;
      if (pulseTimer > 9) {
        pulseTimer = 0;
        if (NODES.length) spawnPulse(Math.floor(Math.random() * NODES.length));
      }
    }

    /* ═══════════════════════════════════════════════
       4. CONFETTI RAIN
    ═══════════════════════════════════════════════ */
    function spawnAmbientConfetti() {
      const isRibbon = Math.random() > 0.5;
      CONFETTI.push({
        x: Math.random() * W, y: -15,
        vx: (Math.random() - 0.5) * 1.3,
        vy: 0.7 + Math.random() * 1.8,
        w: isRibbon ? 2 + Math.random() * 2.5 : 5 + Math.random() * 7,
        h: isRibbon ? 12 + Math.random() * 16 : 5 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2,
        hue: [42, 78, 200, 340, 55, 280][Math.floor(Math.random() * 6)],
        alpha: 0, life: 1, ribbon: isRibbon,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.05,
      });
    }

    function updateConfetti() {
      for (let i = CONFETTI.length - 1; i >= 0; i--) {
        const c = CONFETTI[i];
        c.wobble += c.wobbleSpeed;
        c.x += c.vx + Math.sin(c.wobble) * 0.9;
        c.y += c.vy;
        c.vy = Math.min(c.vy + 0.035, 3.5);
        c.rot += c.rotV;
        c.life -= 0.007;
        c.alpha = Math.min(1, c.life * 3) * (c.life > 0.2 ? 1 : c.life / 0.2);
        if (c.life <= 0 || c.y > H + 30) { CONFETTI.splice(i, 1); continue; }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.globalAlpha = c.alpha * 0.85;

        if (c.ribbon) {
          ctx.fillStyle = `hsl(${c.hue}, 72%, 72%)`;
          ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
          ctx.fillStyle = 'rgba(255,255,255,0.38)';
          ctx.fillRect(-c.w / 2, -c.h / 2, c.w * 0.35, c.h);
        } else {
          ctx.fillStyle = `hsl(${c.hue}, 78%, 67%)`;
          ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
          ctx.fillStyle = `hsla(${c.hue}, 88%, 92%, 0.5)`;
          ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * 0.35);
        }
        ctx.restore();
      }
    }

    /* ═══════════════════════════════════════════════
       5. TICKER TAPE
    ═══════════════════════════════════════════════ */
    function updateTickers() {
      for (let i = TICKERS.length - 1; i >= 0; i--) {
        const t = TICKERS[i];
        t.x += t.vx; t.y += t.vy;
        t.vy += 0.06; t.vx *= 0.98;
        t.life -= 0.011;
        t.alpha = Math.max(0, t.life);
        if (t.life <= 0) { TICKERS.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = t.alpha * 0.78;
        ctx.strokeStyle = `hsl(${t.hue}, 72%, 74%)`;
        ctx.lineWidth = t.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x - t.vx * 5, t.y - t.vy * 5);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* ═══════════════════════════════════════════════
       6. BADGE SPARKLES
    ═══════════════════════════════════════════════ */
    function spawnAmbientSparkle() {
      SPARKLES.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.85,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.4,
        size: 1.5 + Math.random() * 2.5,
        hue: [42, 78][Math.floor(Math.random() * 2)],
        alpha: 0,
        life: 1,
        twinkleSpeed: 0.06 + Math.random() * 0.1,
      });
    }

    function updateSparkles() {
      for (let i = SPARKLES.length - 1; i >= 0; i--) {
        const s = SPARKLES[i];
        s.x += s.vx; s.y += s.vy;
        s.life -= 0.01;
        const twinkle = Math.abs(Math.sin(time * s.twinkleSpeed * 60 + i));
        s.alpha = Math.min(1, s.life * 4) * (s.life > 0.15 ? 1 : s.life / 0.15) * twinkle;
        if (s.life <= 0) { SPARKLES.splice(i, 1); continue; }

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.globalAlpha = s.alpha * 0.9;

        // 4-point star shape
        const sz = s.size;
        ctx.fillStyle = `hsl(${s.hue}, 85%, 90%)`;
        ctx.beginPath();
        ctx.moveTo(0, -sz * 1.5);
        ctx.lineTo(sz * 0.35, -sz * 0.35);
        ctx.lineTo(sz * 1.5, 0);
        ctx.lineTo(sz * 0.35, sz * 0.35);
        ctx.lineTo(0, sz * 1.5);
        ctx.lineTo(-sz * 0.35, sz * 0.35);
        ctx.lineTo(-sz * 1.5, 0);
        ctx.lineTo(-sz * 0.35, -sz * 0.35);
        ctx.closePath();
        ctx.fill();

        // Center dot
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    /* ═══════════════════════════════════════════════
       7. STARBURSTS (click)
    ═══════════════════════════════════════════════ */
    function updateStarBursts() {
      for (let i = STARBURSTS.length - 1; i >= 0; i--) {
        const sb = STARBURSTS[i];
        sb.life -= 0.02;
        sb.scale += (4.0 - sb.scale) * 0.09;
        if (sb.life <= 0) { STARBURSTS.splice(i, 1); continue; }

        ctx.save();
        ctx.translate(sb.x, sb.y);
        ctx.globalAlpha = sb.life * 0.92;

        for (let r = 0; r < sb.rays; r++) {
          const angle = (r / sb.rays) * Math.PI * 2 + time * 0.7;
          const len = sb.scale * (20 + (r % 3 === 0 ? 14 : r % 2 === 0 ? 8 : 0));
          const width = sb.scale * (r % 3 === 0 ? 3 : 1.8);
          const ex = Math.cos(angle) * len;
          const ey = Math.sin(angle) * len;
          const grad = ctx.createLinearGradient(0, 0, ex, ey);
          grad.addColorStop(0, `hsla(${sb.hue}, 100%, 97%, 1)`);
          grad.addColorStop(0.4, `hsla(${sb.hue}, 92%, 82%, 0.65)`);
          grad.addColorStop(1, 'transparent');

          ctx.save();
          ctx.rotate(angle);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(-width / 2, 0);
          ctx.lineTo(0, -width / 2);
          ctx.lineTo(width / 2, 0);
          ctx.lineTo(0, len);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Centre flash
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, sb.scale * 16);
        cg.addColorStop(0, `hsla(${sb.hue}, 100%, 99%, 1)`);
        cg.addColorStop(0.35, `hsla(${sb.hue}, 92%, 92%, 0.65)`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(0, 0, sb.scale * 16, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
      }
    }

    /* ═══════════════════════════════════════════════
       8. RIPPLES
    ═══════════════════════════════════════════════ */
    function updateRipples() {
      for (let i = RIPPLES.length - 1; i >= 0; i--) {
        const rp = RIPPLES[i];
        if (rp.delay > 0) { rp.delay--; continue; }
        rp.r += (rp.maxR - rp.r) * 0.06;
        rp.life -= 0.015;
        if (rp.life <= 0) { RIPPLES.splice(i, 1); continue; }

        ctx.strokeStyle = `hsla(${rp.hue}, 82%, 82%, ${rp.life * 0.52})`;
        ctx.lineWidth = 2.8 * rp.life;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();

        // Inner diamond
        ctx.save();
        ctx.translate(rp.x, rp.y);
        ctx.rotate(Math.PI / 4 + rp.life * 0.5);
        const dr = rp.r * 0.65;
        ctx.strokeStyle = `hsla(${rp.hue}, 78%, 88%, ${rp.life * 0.25})`;
        ctx.lineWidth = 1.2 * rp.life;
        ctx.beginPath();
        ctx.moveTo(0, -dr); ctx.lineTo(dr, 0); ctx.lineTo(0, dr); ctx.lineTo(-dr, 0);
        ctx.closePath(); ctx.stroke();
        ctx.restore();
      }
    }

    /* ═══════════════════════════════════════════════
       9. MOUSE SPOTLIGHT
    ═══════════════════════════════════════════════ */
    function drawMouseSpotlight() {
      if (mx < 0) return;
      const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 180);
      grad.addColorStop(0, 'rgba(255,248,220,0.08)');
      grad.addColorStop(0.4, 'rgba(255,248,220,0.04)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(mx, my, 180, 0, Math.PI * 2); ctx.fill();

      // Soft ring
      ctx.strokeStyle = 'rgba(255,248,220,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mx, my, 90, 0, Math.PI * 2); ctx.stroke();
    }

    /* ═══════════════════════════════════════════════
       10. STAGE FLOOR GLOW
    ═══════════════════════════════════════════════ */
    function drawStageFloor() {
      const y = H * 0.80;
      [
        { offset: 0.15, hue: 42 },
        { offset: 0.50, hue: 78 },
        { offset: 0.85, hue: 200 },
      ].forEach(c => {
        const cx2 = W * c.offset;
        const gr = ctx.createRadialGradient(cx2, y, 0, cx2, y, W * 0.30);
        gr.addColorStop(0, `hsla(${c.hue}, 72%, 82%, 0.10)`);
        gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr;
        ctx.fillRect(0, H * 0.55, W, H * 0.45);
      });
    }

    /* ═══════════════════════════════════════════════
       11. CORNER ORNAMENTS
    ═══════════════════════════════════════════════ */
    function drawCornerOrnaments() {
      const pulse = 0.5 + Math.sin(time * 0.018) * 0.5;
      const corners: [number, number, number][] = [
        [30, 30, 0],
        [W - 30, 30, Math.PI / 2],
        [W - 30, H - 30, Math.PI],
        [30, H - 30, Math.PI * 1.5],
      ];
      corners.forEach(([x, y, rot]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.15 + pulse * 0.08;

        // L-bracket
        ctx.strokeStyle = 'hsl(42, 68%, 78%)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, 30); ctx.lineTo(0, 0); ctx.lineTo(30, 0);
        ctx.stroke();

        // Diamond
        const ds = 4;
        ctx.beginPath();
        ctx.moveTo(0, -ds); ctx.lineTo(ds, 0); ctx.lineTo(0, ds); ctx.lineTo(-ds, 0);
        ctx.closePath();
        ctx.fillStyle = `hsla(42, 78%, 82%, ${0.55 + pulse * 0.4})`;
        ctx.fill();

        // Inner dot
        ctx.fillStyle = `rgba(255,255,255,${0.3 + pulse * 0.3})`;
        ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
      });
    }

    /* ═══════════════════════════════════════════════
       12. AMBIENT HAZE
    ═══════════════════════════════════════════════ */
    function drawAmbientHaze() {
      const t1 = Math.sin(time * 0.005) * 0.5 + 0.5;
      const t2 = Math.cos(time * 0.007) * 0.5 + 0.5;

      // Left haze
      const h1 = ctx.createRadialGradient(
        W * 0.15, H * 0.5, 0,
        W * 0.15, H * 0.5, W * 0.4
      );
      h1.addColorStop(0, `hsla(42, 50%, 80%, ${0.03 + t1 * 0.02})`);
      h1.addColorStop(1, 'transparent');
      ctx.fillStyle = h1;
      ctx.fillRect(0, 0, W, H);

      // Right haze
      const h2 = ctx.createRadialGradient(
        W * 0.85, H * 0.4, 0,
        W * 0.85, H * 0.4, W * 0.35
      );
      h2.addColorStop(0, `hsla(200, 50%, 80%, ${0.02 + t2 * 0.02})`);
      h2.addColorStop(1, 'transparent');
      ctx.fillStyle = h2;
      ctx.fillRect(0, 0, W, H);
    }

    /* ═══════════════════════════════════════════════
       MAIN RENDER LOOP
    ═══════════════════════════════════════════════ */
    let confettiTimer = 0;
    let sparkleTimer = 0;

    function loop() {
      frame++;
      time += 0.016;
      ctx.clearRect(0, 0, W, H);

      // Layer order: back → front
      drawAmbientHaze();
      drawSpotlights();
      drawLasers();
      drawStageFloor();
      drawMouseSpotlight();
      updateNetwork();
      updateConfetti();
      updateTickers();
      updateSparkles();
      updateRipples();
      updateStarBursts();
      drawCornerOrnaments();

      // Ambient spawners
      confettiTimer++;
      if (confettiTimer > 16) { confettiTimer = 0; spawnAmbientConfetti(); }

      sparkleTimer++;
      if (sparkleTimer > 22) { sparkleTimer = 0; spawnAmbientSparkle(); }

      // Mouse proximity sparkles
      if (mx > -9999 && frame % 14 === 0) {
        SPARKLES.push({
          x: mx + (Math.random() - 0.5) * 80,
          y: my + (Math.random() - 0.5) * 80,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.3 - Math.random() * 0.5,
          size: 2 + Math.random() * 3,
          hue: [42, 78][Math.floor(Math.random() * 2)],
          alpha: 1, life: 1,
          twinkleSpeed: 0.08 + Math.random() * 0.12,
        });
      }

      animId = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('click', onClick);
    };
  }, [canvasRef, containerRef]);
}

/* ═════════════════════════════════════════════════════════
   TILT HOOK
═════════════════════════════════════════════════════════ */
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
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    rotateY.set(dx * strength);
    rotateX.set(-dy * strength);
  }, [strength, rotateX, rotateY]);
  const onMouseLeave = useCallback(() => {
    rotateX.set(0); rotateY.set(0);
  }, [rotateX, rotateY]);
  return { ref, springX, springY, onMouseMove, onMouseLeave };
}

/* ═════════════════════════════════════════════════════════
   VARIANTS
═════════════════════════════════════════════════════════ */
const vFadeUp: Variants = {
  hidden: { opacity: 0, y: 44 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};
const vStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13 } },
};
const vSlideLeft: Variants = {
  hidden: { opacity: 0, x: -48 },
  show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};
const vSlideRight: Variants = {
  hidden: { opacity: 0, x: 48 },
  show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};

/* ═════════════════════════════════════════════════════════
   DATA
═════════════════════════════════════════════════════════ */
const PRODUCTS = products.items.map(p => ({ name: p.name, sub: p.subtitle, img: asset(p.image) }));

// Grid placement per card (design, not content); cards added in the admin get the small tile
const BENTO_LAYOUT: Record<string, { col: string; row: string; large: boolean }> = {
  vip: { col: 'span 2', row: 'span 2', large: true },
  swag: { col: 'span 2', row: 'span 1', large: false },
  speaker: { col: 'span 1', row: 'span 1', large: false },
  team: { col: 'span 1', row: 'span 1', large: false },
};
const BENTO_DEFAULT = { col: 'span 1', row: 'span 1', large: false };

const BENTO_CARDS = collections.cards.map(c => ({
  key: c.key, label: c.label, desc: c.desc,
  ...(BENTO_LAYOUT[c.key] ?? BENTO_DEFAULT),
  img: asset(c.image),
}));

const CUSTOM_ITEMS = customization.items.map(i => ({ icon: i.symbol, title: i.title, desc: i.desc }));

const WHY = why.items.map(i => ({ icon: i.symbol, title: i.title, desc: i.desc }));

/* ═════════════════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════════════════ */
function BentoCard({ card, index }: { card: typeof BENTO_CARDS[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 32 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: false, amount: 0.15 }}
      transition={{ duration: 0.75, delay: index * 0.1, ease: EASE }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative overflow-hidden cursor-pointer rounded-lg"
      style={{ gridColumn: card.col, gridRow: card.row }}
    >
      <motion.img
        src={card.img} alt={card.label}
        className="w-full h-full object-cover"
        animate={{ scale: hovered ? 1.06 : 1 }}
        transition={{ duration: 0.75, ease: EASE }}
        style={{ willChange: 'transform' }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)', opacity: card.large ? 0.85 : 0.6 }} />
      {!card.large && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: 'rgba(61,58,52,0.55)' }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35 }}
        >
          <h3 className="font-serif text-2xl text-white mb-4">{card.label}</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="px-6 py-2 bg-white text-gray-800 text-[10px] font-bold uppercase tracking-widest border-none cursor-pointer"
          >
            {collections.buttonText}
          </motion.button>
        </motion.div>
      )}
      <div className="absolute bottom-0 left-0 p-6 md:p-9">
        {card.large ? (
          <>
            <h3 className="font-serif text-3xl text-white mb-2">{card.label}</h3>
            <p className="text-white/70 text-sm font-light leading-relaxed mb-5 max-w-sm">{card.desc}</p>
            <button className="text-white text-[10px] font-bold uppercase tracking-widest border-b border-white pb-0.5 bg-transparent cursor-pointer">{collections.buttonText}</button>
          </>
        ) : (
          <motion.h3 className="font-serif text-lg text-white" animate={{ opacity: hovered ? 0 : 1 }} transition={{ duration: 0.25 }}>{card.label}</motion.h3>
        )}
      </div>
    </motion.div>
  );
}

function ProductCard({ item, index }: { item: typeof PRODUCTS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 44 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 44 }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: EASE }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="cursor-pointer group"
    >
      <div className="relative overflow-hidden mb-4 rounded-lg" style={{ aspectRatio: '3/4', background: '#f1f0ed' }}>
        <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover" animate={{ scale: hovered ? 1.06 : 1 }} transition={{ duration: 0.65, ease: EASE }} style={{ willChange: 'transform' }} />
        <motion.button animate={{ y: hovered ? 0 : 60, opacity: hovered ? 1 : 0 }} transition={{ duration: 0.35, ease: EASE }} className="absolute bottom-4 left-4 right-4 py-3 text-[10px] font-bold uppercase tracking-widest border-none cursor-pointer rounded" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', color: '#3d3a34' }}>{products.buttonText}</motion.button>
      </div>
      <h4 className="font-medium text-gray-800 mb-1">{item.name}</h4>
    </motion.div>
  );
}

function WhyCard({ item, index }: { item: typeof WHY[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
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
      className="text-center px-4"
    >
      <motion.div className="flex items-center justify-center mx-auto mb-4 text-2xl rounded-full" style={{ width: 64, height: 64, color: '#645e53' }} animate={{ background: hovered ? '#d3d9c5' : '#f1f0ed' }} transition={{ duration: 0.3 }}>{item.icon}</motion.div>
      <h5 className="font-serif text-lg mb-2" style={{ color: '#3d3a34' }}>{item.title}</h5>
      <p className="text-xs font-light leading-relaxed" style={{ color: '#968f80' }}>{item.desc}</p>
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═════════════════════════════════════════════════════════ */
export default function EventsConferences() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const springImg = useSpring(imgY, { stiffness: 60, damping: 22 });
  const springTxt = useSpring(textY, { stiffness: 80, damping: 25 });

  useEventsCanvas(canvasRef, heroRef);

  const { ref: aRef, springX: aX, springY: aY, onMouseMove: aMM, onMouseLeave: aML } = useTilt(6);

  const aboutRef = useRef<HTMLElement>(null);
  const catRef = useRef<HTMLElement>(null);
  const prodRef = useRef<HTMLElement>(null);
  const custRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  const aboutInView = useInView(aboutRef, { once: false, amount: 0.2 });
  const catInView = useInView(catRef, { once: false, amount: 0.15 });
  const prodInView = useInView(prodRef, { once: false, amount: 0.15 });
  const custInView = useInView(custRef, { once: false, amount: 0.15 });
  const ctaInView = useInView(ctaRef, { once: false, amount: 0.3 });

  return (
    <div className="overflow-x-hidden" style={{ background: '#f8f7f5', fontFamily: 'inherit' }}>

      {/* ══════════════════════════════════════════
          HERO SECTION — Full Events Canvas
      ══════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative flex items-center overflow-hidden"
        style={{ minHeight: '100vh', perspective: '1400px' }}
      >
        {/* Parallax Background */}
        <motion.div style={{ y: springImg, willChange: 'transform' }} className="absolute inset-0">
          <img
            src={asset(hero.image)}
            alt={hero.imageAlt}
            className="w-full h-full object-cover"
            style={{ minHeight: '120%', filter: 'brightness(0.42)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg,rgba(0,0,0,0.62) 0%,rgba(0,0,0,0.26) 55%,rgba(0,0,0,0.08) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: 'linear-gradient(to top,rgba(68,79,54,0.20) 0%,transparent 100%)' }} />
        </motion.div>

        {/* ★ Interactive Canvas ★ */}
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'all' }}
        />

        {/* Hero Text Content */}
        <motion.div
          style={{ y: springTxt, opacity: heroOpacity, willChange: 'transform' }}
          className="absolute bottom-20 left-8 md:left-20 z-10 max-w-3xl px-4"
        >
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[10px] uppercase tracking-[0.32em] font-bold text-white/60 mb-5 flex items-center gap-3"
          >
            <span className="w-10 h-px inline-block" style={{ background: '#b5a26a' }} />
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
              >
                {word}
              </motion.span>
            ))}
            <motion.span
              initial={{ rotateX: -90, opacity: 0, y: 40 }}
              animate={{ rotateX: 0, opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
              style={{ display: 'block', fontStyle: 'italic', fontWeight: 400, transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}
            >
              {hero.titleItalic}
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.8 }}
            className="text-white/80 mt-6 max-w-md text-lg font-light leading-relaxed"
          >
            {hero.intro}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 1.05 }}
            className="flex gap-4 mt-10 flex-wrap"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2, boxShadow: '0 12px 32px rgba(68,79,54,0.4)' }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-lg"
              style={{ background: '#444f36', border: 'none', cursor: 'pointer' }}
            >
              {hero.primaryButton}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              onClick={() => (window.location.href = '/contact')}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 backdrop-blur-sm rounded-lg"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}
            >
              {hero.secondaryButton}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        >
          <span className="text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold">{hero.scrollLabel}</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 28, background: 'linear-gradient(to bottom,rgba(181,162,106,0.85),transparent)' }}
          />
        </motion.div>
      </section>

      {/* ══ ABOUT ══ */}
      <section ref={aboutRef} className="py-32 px-8 md:px-20 lg:px-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vStagger} initial="hidden" animate={aboutInView ? 'show' : 'hidden'}>
            <motion.div variants={vFadeUp}>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={aboutInView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                style={{ originX: 0, height: 3, width: 80, background: '#708156', marginBottom: 24 }}
              />
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-4" style={{ color: '#708156' }}>{about.eyebrow}</p>
            </motion.div>
            <motion.h2 variants={vFadeUp} className="text-5xl font-serif leading-tight mb-7" style={{ color: '#3d3a34' }}>
              {about.titleLine1}<br />{about.titleLine2}
            </motion.h2>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-10" style={{ color: '#7b7466' }}>
              {about.text}
            </motion.p>
            <motion.div variants={vFadeUp} style={{ width: 80, height: 1, background: '#d1cdc5' }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={aboutInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.85, ease: EASE }}
            style={{ perspective: '1200px', position: 'relative' }}
          >
            <motion.div ref={aRef} onMouseMove={aMM} onMouseLeave={aML} style={{ rotateX: aX, rotateY: aY, transformStyle: 'preserve-3d', willChange: 'transform', position: 'relative' }}>
              <motion.div className="absolute -inset-1 border border-gray-300" style={{ transform: 'translate(16px,16px)', zIndex: 0 }} whileHover={{ x: 8, y: 8 } as any} />
              <img
                src={asset(about.image)}
                alt={about.imageAlt} className="relative w-full shadow-2xl rounded-lg" style={{ aspectRatio: '4/5', objectFit: 'cover', zIndex: 1 }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ BENTO GRID ══ */}
      <section
        ref={catRef}
        className="py-20 sm:py-24 md:py-32 px-4 sm:px-8 md:px-20 lg:px-32 overflow-hidden"
        style={{ background: '#f1f0ed' }}
      >
        <div className="max-w-7xl mx-auto">

          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={catInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-14"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif mb-4" style={{ color: '#3d3a34' }}>
              {collections.title}
            </h2>

            <p className="font-light max-w-lg mx-auto text-xs sm:text-sm" style={{ color: '#968f80' }}>
              {collections.intro}
            </p>
          </motion.div>

          {/* GRID */}
          <div
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          >
            {BENTO_CARDS.map((card, i) => (
              <BentoCard key={card.key} card={card} index={i} />
            ))}
          </div>

        </div>
      </section>

      {/* ══ PRODUCTS ══ */}
      <section ref={prodRef} className="py-32 px-8 md:px-20 lg:px-32 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={prodInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }} transition={{ duration: 0.6 }} className="flex justify-between items-end mb-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-3" style={{ color: '#708156' }}>{products.eyebrow}</p>
              <h2 className="text-4xl font-serif" style={{ color: '#3d3a34' }}>{products.title}</h2>
            </div>
            <motion.a whileHover={{ y: -1 }} className="font-bold text-xs uppercase tracking-widest border-b-2 pb-1 cursor-pointer" style={{ borderColor: '#708156', color: '#3d3a34' }}>{products.viewAll}</motion.a>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {PRODUCTS.map((p, i) => <ProductCard key={p.name} item={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ CUSTOMIZATION ══ */}
      <section ref={custRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#444f36' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vSlideLeft} initial="hidden" animate={custInView ? 'show' : 'hidden'} style={{ position: 'relative' }}>
            <div className="absolute -top-12 -left-12 rounded-full opacity-50" style={{ width: 256, height: 256, background: '#363f2c', filter: 'blur(60px)' }} />
            <img src={asset(customization.image)} alt={customization.imageAlt} className="relative w-full rounded-lg shadow-2xl" style={{ zIndex: 1 }} />
          </motion.div>
          <motion.div variants={vSlideRight} initial="hidden" animate={custInView ? 'show' : 'hidden'}>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/60 mb-4">{customization.eyebrow}</p>
            <h2 className="text-5xl font-serif text-white leading-tight mb-12">{customization.titleLine1}<br /><span style={{ color: '#b3bea0', fontStyle: 'italic', fontWeight: 400 }}>{customization.titleHighlight}</span></h2>
            <motion.div variants={vStagger} initial="hidden" animate={custInView ? 'show' : 'hidden'} className="grid grid-cols-2 gap-8">
              {CUSTOM_ITEMS.map(item => (
                <motion.div key={item.title} variants={vFadeUp}>
                  <span className="text-3xl block mb-3" style={{ color: '#b3bea0' }}>{item.icon}</span>
                  <h4 className="font-serif text-xl text-white mb-2">{item.title}</h4>
                  <p className="text-sm font-light leading-relaxed" style={{ color: 'rgba(227,233,214,0.7)' }}>{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ WHY ECOTWIST ══ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.6 }} className="text-center mb-14">
            <h2 className="text-4xl font-serif mb-4" style={{ color: '#3d3a34' }}>{why.title}</h2>
            <div className="mx-auto" style={{ width: 64, height: 3, background: '#708156' }} />
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
            {WHY.map((item, i) => <WhyCard key={item.title} item={item} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ TRUST ══ */}
      {clients.length > 0 && (
      <section className="py-12 px-8 border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false, amount: 0.5 }} className="text-center text-[9px] uppercase tracking-[0.3em] font-bold mb-10" style={{ color: '#b4aea1' }}>{trust.title}</motion.p>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 0.6 }} viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.6 }} whileHover={{ opacity: 1 } as any} className="flex flex-wrap justify-center gap-16 grayscale cursor-pointer" style={{ transition: 'opacity 0.5s' }}>
            {clients.map(c => c.logo
              ? <img key={c.name} src={c.logo} alt={c.name} style={{ height: 32, objectFit: 'contain' }} />
              : <span key={c.name} className="font-serif text-xl font-bold" style={{ color: '#4d4941', letterSpacing: -0.5 }}>{c.name}</span>)}
          </motion.div>
        </div>
      </section>
      )}

      {/* ══ CTA ══ */}
      <section ref={ctaRef} className="py-10 px-8 text-center" style={{ background: '#f1f0ed' }}>
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, letterSpacing: '-0.05em', y: 20 }}
            animate={ctaInView ? { opacity: 1, letterSpacing: '-0.01em', y: 0 } : { opacity: 0, letterSpacing: '-0.05em', y: 20 }}
            transition={{ duration: 0.85, ease: EASE }}
            className="font-serif text-5xl md:text-6xl leading-tight mb-6"
            style={{ color: '#3d3a34' }}
          >
            {cta.title}
            <span className="italic font-normal"> {cta.titleHighlight} </span>
            {cta.titleEnd}
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.6, delay: 0.15 }} className="text-lg font-light leading-relaxed mb-12" style={{ color: '#7b7466' }}>
            {cta.text}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.6, delay: 0.28 }} className="flex flex-col sm:flex-row justify-center gap-6">
            <motion.button
              whileHover={{ scale: 1.06, y: -3, boxShadow: '0 18px 40px rgba(68,79,54,0.3)' }}
              onClick={() => (window.location.href = '/get-proposal')}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-white font-bold uppercase tracking-[0.2em] text-xs px-14 py-6 shadow-xl rounded-lg"
              style={{ background: '#444f36', border: 'none', cursor: 'pointer' }}
            >
              {cta.primaryButton}
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => (window.location.href = '/contact')}
              className="font-bold uppercase tracking-[0.2em] text-xs pb-1 transition-colors"
              style={{ background: 'transparent', border: 'none', borderBottom: '2px solid rgba(61,58,52,0.2)', cursor: 'pointer', color: '#3d3a34' }}
              onMouseEnter={e => (e.currentTarget.style.borderBottomColor = '#708156')}
              onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'rgba(61,58,52,0.2)')}
            >
              {cta.secondaryButton}
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}