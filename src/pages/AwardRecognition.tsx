import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  motion, useScroll, useTransform, useSpring, useMotionValue, useInView,
} from 'motion/react';
import type { Variants } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { clients } from '../lib/clients';
import { asset } from '../lib/content';
import content from '../content/pages/award-recognition.json';

// Page words and photos: src/content/pages/award-recognition.json (admin → Pages → Award & Recognition)
const { hero, about, categories, products, customization, why, trust, cta } = content;

/* ─────────────────────────────────────────────
   AWARD RECOGNITION CANVAS
   Theme: Deep navy, burnished gold, platinum silver
   Elements: Trophy particles, achievement stars,
   floating medals, gold dust, laurel rings,
   click = golden trophy burst + crown explosion
───────────────────────────────────────────── */
function useAwardCanvas(
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

    /* ── Gold & Platinum Palette ── */
    const GOLD_HUES     = [42, 45, 48, 38, 50, 35];
    const SILVER_HUES   = [200, 210, 220, 215];
    const ACCENT_HUES   = [...GOLD_HUES, ...SILVER_HUES];
    const goldH  = () => GOLD_HUES[Math.floor(Math.random() * GOLD_HUES.length)];
    const silverH = () => SILVER_HUES[Math.floor(Math.random() * SILVER_HUES.length)];
    const accentH = () => ACCENT_HUES[Math.floor(Math.random() * ACCENT_HUES.length)];

    /* ── Interfaces ── */
    interface GoldDust {
      x: number; y: number; vx: number; vy: number;
      r: number; hue: number; alpha: number;
      wobble: number; wSpd: number; shimmer: number; sSpd: number;
      trail: { x: number; y: number }[];
    }
    interface LaurelRing {
      cx: number; cy: number; r: number; targetR: number;
      hue: number; alpha: number; rot: number; rotSpd: number;
      pts: number; life: number;
    }
    interface AwardStar {
      x: number; y: number; vx: number; vy: number;
      r: number; hue: number; alpha: number;
      rot: number; rotSpd: number; pulse: number; pSpd: number;
      points: number; trail: { x: number; y: number }[];
    }
    interface Medal {
      x: number; y: number; vx: number; vy: number;
      r: number; hue: number; alpha: number;
      wobble: number; wSpd: number; rot: number; rSpd: number;
      shimmer: number; sSpd: number; rank: number;
    }
    interface GlowOrb {
      x: number; y: number; bR: number; hue: number;
      ph: number; pSpd: number; op: number;
      drift: number; dSpd: number;
    }
    interface ClickParticle {
      x: number; y: number; vx: number; vy: number;
      life: number; hue: number; r: number; shape: number;
      rot: number; rotSpd: number; trail: { x: number; y: number }[];
      gravity: number;
    }
    interface CrownRay {
      x: number; y: number; angle: number; len: number; targetLen: number;
      hue: number; life: number; width: number;
    }
    interface ShockRing {
      x: number; y: number; r: number; maxR: number;
      hue: number; life: number; width: number;
    }
    interface StarBurst {
      x: number; y: number; r: number; targetR: number;
      hue: number; life: number; pts: number; rot: number;
    }

    /* ── Arrays ── */
    const DUST:    GoldDust[]      = [];
    const LAURELS: LaurelRing[]    = [];
    const STARS:   AwardStar[]     = [];
    const MEDALS:  Medal[]         = [];
    const ORBS:    GlowOrb[]       = [];
    const CLICK_P: ClickParticle[] = [];
    const RAYS:    CrownRay[]      = [];
    const RINGS:   ShockRing[]     = [];
    const BURSTS:  StarBurst[]     = [];

    /* ── Background stars ── */
    interface BgStar { x: number; y: number; r: number; alpha: number; ph: number; spd: number; }
    const BG_STARS: BgStar[] = [];

    /* ══════════════ INIT ══════════════ */
    function initBgStars() {
      BG_STARS.length = 0;
      for (let i = 0; i < 220; i++) {
        BG_STARS.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 0.2 + Math.random() * 0.9,
          alpha: 0.05 + Math.random() * 0.35,
          ph: Math.random() * Math.PI * 2,
          spd: 0.02 + Math.random() * 0.04,
        });
      }
    }

    function initOrbs() {
      ORBS.length = 0;
      for (let i = 0; i < 6; i++) {
        ORBS.push({
          x: W * ((i + 0.5) / 6) + (Math.random() - 0.5) * 60,
          y: H * (0.1 + Math.random() * 0.8),
          bR: 70 + Math.random() * 100,
          hue: i < 4 ? goldH() : silverH(),
          ph: Math.random() * Math.PI * 2,
          pSpd: 0.003 + Math.random() * 0.004,
          op: 0.025 + Math.random() * 0.035,
          drift: Math.random() * Math.PI * 2,
          dSpd: 0.0015 + Math.random() * 0.002,
        });
      }
    }

    function initMedals() {
      MEDALS.length = 0;
      for (let i = 0; i < 10; i++) {
        MEDALS.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(0.15 + Math.random() * 0.25),
          r: 12 + Math.random() * 16,
          hue: i < 7 ? goldH() : silverH(),
          alpha: 0.04 + Math.random() * 0.08,
          wobble: Math.random() * Math.PI * 2,
          wSpd: 0.01 + Math.random() * 0.015,
          rot: Math.random() * Math.PI * 2,
          rSpd: (Math.random() - 0.5) * 0.008,
          shimmer: Math.random() * Math.PI * 2,
          sSpd: 0.03 + Math.random() * 0.04,
          rank: i % 3, // 0=gold,1=silver,2=bronze
        });
      }
    }

    /* ── Laurel ring constants ── */
    const LAUREL_RINGS_STATIC: { r: number; pts: number; rotOff: number; hue: number; }[] = [
      { r: 0.08, pts: 8,  rotOff: 0,           hue: 42 },
      { r: 0.16, pts: 14, rotOff: Math.PI / 14, hue: 45 },
      { r: 0.25, pts: 20, rotOff: 0,            hue: 38 },
      { r: 0.35, pts: 26, rotOff: Math.PI / 26, hue: 210 },
      { r: 0.46, pts: 32, rotOff: 0,            hue: 42 },
    ];

    function resize() {
      W = canvas!.width  = container!.offsetWidth;
      H = canvas!.height = container!.offsetHeight;
      initBgStars();
      initOrbs();
      initMedals();
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    /* ══════════════ EVENTS ══════════════ */
    const onMM = (e: MouseEvent) => {
      const r = container!.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    };
    const onML = () => { mx = -9999; my = -9999; };

    /* ══════════════ CLICK: TROPHY CROWN BURST ══════════════ */
    const onClick = (e: MouseEvent) => {
      const rect = container!.getBoundingClientRect();
      const cx   = e.clientX - rect.left;
      const cy   = e.clientY - rect.top;
      const hue  = goldH();

      /* Shock rings */
      for (let i = 0; i < 7; i++) {
        RINGS.push({
          x: cx, y: cy,
          r: i * 20, maxR: 280 + i * 50,
          hue: i % 2 === 0 ? hue : silverH(),
          life: 1,
          width: 2.5,
        });
      }

      /* Crown rays — points upward like a trophy crown */
      const RAY_COUNT = 16;
      for (let i = 0; i < RAY_COUNT; i++) {
        const angle = (i / RAY_COUNT) * Math.PI * 2 - Math.PI / 2;
        RAYS.push({
          x: cx, y: cy,
          angle,
          len: 0,
          targetLen: 90 + Math.random() * 130,
          hue: i % 3 === 0 ? silverH() : hue,
          life: 1,
          width: 2 + Math.random() * 2,
        });
      }

      /* Star bursts */
      for (let i = 0; i < 5; i++) {
        BURSTS.push({
          x: cx, y: cy,
          r: 0, targetR: 40 + i * 35,
          hue: i % 2 === 0 ? hue : silverH(),
          life: 1,
          pts: 5 + i * 2,
          rot: Math.random() * Math.PI,
        });
      }

      /* Explosion particles — trophy shape shards */
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd   = 3 + Math.random() * 9;
        CLICK_P.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 1,
          hue: Math.random() > 0.3 ? hue : silverH(),
          r: 2 + Math.random() * 5,
          shape: Math.floor(Math.random() * 4), // 0=circle,1=star,2=diamond,3=spark
          rot: Math.random() * Math.PI * 2,
          rotSpd: (Math.random() - 0.5) * 0.15,
          trail: [],
          gravity: 0.08 + Math.random() * 0.06,
        });
      }

      /* Gold dust burst */
      for (let i = 0; i < 40; i++) spawnDustAt(cx, cy, true);

      /* Laurel ring at click point */
      LAURELS.push({
        cx, cy, r: 0, targetR: 80 + Math.random() * 60,
        hue, alpha: 0.9,
        rot: Math.random() * Math.PI * 2,
        rotSpd: 0.015,
        pts: 12, life: 1,
      });

      /* Spawn achievement stars */
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist  = 60 + Math.random() * 80;
        STARS.push({
          x: cx + Math.cos(angle) * 20,
          y: cy + Math.sin(angle) * 20,
          vx: Math.cos(angle) * (2 + Math.random() * 4),
          vy: Math.sin(angle) * (2 + Math.random() * 4),
          r: 4 + Math.random() * 6,
          hue: i % 2 === 0 ? hue : silverH(),
          alpha: 1,
          rot: Math.random() * Math.PI * 2,
          rotSpd: (Math.random() - 0.5) * 0.08,
          pulse: 0, pSpd: 0.06,
          points: 5 + (i % 2) * 1,
          trail: [],
        });
      }
    };

    container.addEventListener('mousemove', onMM);
    container.addEventListener('mouseleave', onML);
    container.addEventListener('click', onClick);

    /* ══════════════ SPAWNERS ══════════════ */
    function spawnDust(x?: number, y?: number) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const spd   = 0.5 + Math.random() * 1.8;
      DUST.push({
        x: x ?? Math.random() * W,
        y: y ?? H + 10,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        r: 0.8 + Math.random() * 2.2,
        hue: goldH(),
        alpha: 0.4 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
        wSpd: 0.03 + Math.random() * 0.04,
        shimmer: Math.random() * Math.PI * 2,
        sSpd: 0.05 + Math.random() * 0.06,
        trail: [],
      });
    }

    function spawnDustAt(cx: number, cy: number, burst = false) {
      const angle = burst ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const spd   = burst ? 2 + Math.random() * 6 : 0.5 + Math.random() * 2;
      DUST.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        r: burst ? 1.5 + Math.random() * 3.5 : 0.8 + Math.random() * 2,
        hue: goldH(),
        alpha: burst ? 0.9 : 0.5,
        wobble: Math.random() * Math.PI * 2,
        wSpd: 0.04,
        shimmer: Math.random() * Math.PI * 2,
        sSpd: 0.06,
        trail: [],
      });
    }

    function spawnAmbientStar() {
      STARS.push({
        x: Math.random() * W,
        y: H + 20,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.4 + Math.random() * 0.8),
        r: 2 + Math.random() * 4,
        hue: Math.random() > 0.6 ? silverH() : goldH(),
        alpha: 0.3 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.025,
        pulse: Math.random() * Math.PI * 2,
        pSpd: 0.03 + Math.random() * 0.03,
        points: Math.random() > 0.5 ? 5 : 6,
        trail: [],
      });
    }

    /* ══════════════ DRAW HELPERS ══════════════ */
    function drawStarPath(pts: number, r: number, innerR: number) {
      ctx!.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const angle  = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? r : innerR;
        const px     = Math.cos(angle) * radius;
        const py     = Math.sin(angle) * radius;
        i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
      }
      ctx!.closePath();
    }

    function drawDiamondPath(r: number) {
      ctx!.beginPath();
      ctx!.moveTo(0, -r);
      ctx!.lineTo(r * 0.6, 0);
      ctx!.lineTo(0, r);
      ctx!.lineTo(-r * 0.6, 0);
      ctx!.closePath();
    }

    function drawSparkPath(r: number) {
      ctx!.beginPath();
      ctx!.moveTo(0, -r);
      ctx!.lineTo(r * 0.12, -r * 0.12);
      ctx!.lineTo(r, 0);
      ctx!.lineTo(r * 0.12, r * 0.12);
      ctx!.lineTo(0, r);
      ctx!.lineTo(-r * 0.12, r * 0.12);
      ctx!.lineTo(-r, 0);
      ctx!.lineTo(-r * 0.12, -r * 0.12);
      ctx!.closePath();
    }

    /* ══════════════ DRAW BACKGROUND ══════════════ */
    function drawBackground() {
      /* Deep navy-to-black gradient */
      const bg = ctx!.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0,   '#020408');
      bg.addColorStop(0.3, '#040210');
      bg.addColorStop(0.6, '#080308');
      bg.addColorStop(1,   '#020105');
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      /* Warm gold center warmth */
      const warm = ctx!.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.7);
      warm.addColorStop(0,   'rgba(100, 72, 8, 0.28)');
      warm.addColorStop(0.4, 'rgba(60, 40, 4, 0.14)');
      warm.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx!.fillStyle = warm;
      ctx!.fillRect(0, 0, W, H);
    }

    /* ══════════════ DRAW BG STARS ══════════════ */
    function drawBgStars() {
      BG_STARS.forEach(s => {
        s.ph += s.spd;
        const a = s.alpha * (0.4 + Math.sin(s.ph) * 0.6);
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${goldH()}, 70%, 88%, ${a})`;
        ctx!.fill();
      });
    }

    /* ══════════════ DRAW ORBS ══════════════ */
    function drawOrbs() {
      ORBS.forEach(o => {
        o.ph    += o.pSpd;
        o.drift += o.dSpd;
        const r  = o.bR * (1 + Math.sin(o.ph) * 0.2);
        const dx = Math.cos(o.drift) * 22;
        const dy = Math.sin(o.drift) * 15;
        const g  = ctx!.createRadialGradient(o.x + dx, o.y + dy, 0, o.x + dx, o.y + dy, r);
        g.addColorStop(0,   `hsla(${o.hue}, 88%, 75%, ${o.op * 3})`);
        g.addColorStop(0.4, `hsla(${o.hue}, 80%, 60%, ${o.op * 1.5})`);
        g.addColorStop(1,   `hsla(${o.hue}, 70%, 45%, 0)`);
        ctx!.beginPath();
        ctx!.arc(o.x + dx, o.y + dy, r, 0, Math.PI * 2);
        ctx!.fillStyle = g;
        ctx!.fill();
      });
    }

    /* ══════════════ DRAW LAUREL RINGS (static mandala) ══════════════ */
    let laurelRot = 0;
    function drawLaurelMandala() {
      laurelRot += 0.0006;
      const cx   = W / 2;
      const cy   = H * 0.44;
      const maxR = Math.min(W, H) * 0.42;

      ctx!.save();
      ctx!.translate(cx, cy);

      LAUREL_RINGS_STATIC.forEach((ring, idx) => {
        const rot = laurelRot * (idx % 2 === 0 ? 1 : -1) * (0.5 + idx * 0.3);
        ctx!.save();
        ctx!.rotate(rot);

        for (let p = 0; p < ring.pts; p++) {
          const angle = (p / ring.pts) * Math.PI * 2;
          const px    = Math.cos(angle) * maxR * ring.r;
          const py    = Math.sin(angle) * maxR * ring.r;

          /* Laurel leaf dot */
          const a   = 0.045 + idx * 0.012;
          const gr  = ctx!.createRadialGradient(px, py, 0, px, py, 7);
          gr.addColorStop(0, `hsla(${ring.hue}, 90%, 82%, ${a * 3})`);
          gr.addColorStop(1, `hsla(${ring.hue}, 80%, 60%, 0)`);
          ctx!.beginPath();
          ctx!.arc(px, py, 7, 0, Math.PI * 2);
          ctx!.fillStyle = gr;
          ctx!.fill();

          /* Connector */
          if (p < ring.pts - 1) {
            const nx = Math.cos(((p + 1) / ring.pts) * Math.PI * 2) * maxR * ring.r;
            const ny = Math.sin(((p + 1) / ring.pts) * Math.PI * 2) * maxR * ring.r;
            ctx!.beginPath();
            ctx!.moveTo(px, py);
            ctx!.lineTo(nx, ny);
            ctx!.strokeStyle = `hsla(${ring.hue}, 75%, 65%, ${a * 0.5})`;
            ctx!.lineWidth   = 0.5;
            ctx!.stroke();
          }
        }

        /* Ring arc */
        ctx!.beginPath();
        ctx!.arc(0, 0, maxR * ring.r, 0, Math.PI * 2);
        ctx!.strokeStyle = `hsla(${ring.hue}, 70%, 62%, ${0.028 + idx * 0.008})`;
        ctx!.lineWidth   = 0.6;
        ctx!.stroke();

        ctx!.restore();
      });

      /* Center trophy glow */
      const cg = ctx!.createRadialGradient(0, 0, 0, 0, 0, maxR * 0.07);
      cg.addColorStop(0, 'hsla(45, 100%, 95%, 0.7)');
      cg.addColorStop(1, 'hsla(42, 90%, 65%, 0)');
      ctx!.beginPath();
      ctx!.arc(0, 0, maxR * 0.07, 0, Math.PI * 2);
      ctx!.fillStyle = cg;
      ctx!.fill();

      ctx!.restore();
    }

    /* ══════════════ DRAW MEDALS ══════════════ */
    function updateDrawMedals() {
      const RANK_HUES = [42, 210, 30]; // gold, silver, bronze
      MEDALS.forEach(m => {
        m.x      += m.vx;
        m.y      += m.vy;
        m.wobble += m.wSpd;
        m.rot    += m.rSpd;
        m.shimmer += m.sSpd;

        if (m.y < -60) { m.y = H + 40; m.x = Math.random() * W; }
        if (m.x < -40)  m.x = W + 40;
        if (m.x > W + 40) m.x = -40;

        const wx = Math.sin(m.wobble) * 4;
        const sh = 0.5 + Math.sin(m.shimmer) * 0.5;
        const a  = m.alpha * sh;
        const h  = RANK_HUES[m.rank];

        ctx!.save();
        ctx!.translate(m.x + wx, m.y);
        ctx!.rotate(m.rot);
        ctx!.globalAlpha = a;

        /* Medal glow */
        const glowG = ctx!.createRadialGradient(0, 0, 0, 0, 0, m.r * 2.5);
        glowG.addColorStop(0,   `hsla(${h}, 90%, 80%, 0.5)`);
        glowG.addColorStop(1,   `hsla(${h}, 75%, 55%, 0)`);
        ctx!.beginPath();
        ctx!.arc(0, 0, m.r * 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = glowG;
        ctx!.fill();

        /* Medal body */
        const bodyG = ctx!.createRadialGradient(-m.r * 0.25, -m.r * 0.25, 0, 0, 0, m.r);
        bodyG.addColorStop(0,   `hsla(${h + 15}, 95%, 82%, 1)`);
        bodyG.addColorStop(0.5, `hsla(${h}, 85%, 65%, 1)`);
        bodyG.addColorStop(1,   `hsla(${h - 10}, 75%, 48%, 1)`);
        ctx!.beginPath();
        ctx!.arc(0, 0, m.r, 0, Math.PI * 2);
        ctx!.fillStyle = bodyG;
        ctx!.fill();

        /* Star on medal */
        ctx!.save();
        ctx!.fillStyle = `hsla(${h + 20}, 100%, 95%, 0.6)`;
        drawStarPath(5, m.r * 0.55, m.r * 0.22);
        ctx!.fill();
        ctx!.restore();

        /* Highlight */
        ctx!.beginPath();
        ctx!.arc(-m.r * 0.3, -m.r * 0.3, m.r * 0.22, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${h + 20}, 100%, 98%, 0.5)`;
        ctx!.fill();

        /* Ribbon */
        ctx!.fillStyle = `hsla(${h}, 70%, 55%, 0.7)`;
        ctx!.fillRect(-m.r * 0.25, -m.r * 1.5, m.r * 0.5, m.r * 0.6);

        ctx!.restore();
      });
    }

    /* ══════════════ DRAW GOLD DUST ══════════════ */
    let dustTimer = 0;
    function updateDrawDust() {
      dustTimer++;
      if (dustTimer > 6) { dustTimer = 0; spawnDust(); }
      if (mx > -999 && dustTimer % 3 === 0) spawnDustAt(mx + (Math.random() - 0.5) * 40, my + (Math.random() - 0.5) * 40);

      for (let i = DUST.length - 1; i >= 0; i--) {
        const d = DUST[i];
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > 8) d.trail.shift();

        d.wobble  += d.wSpd;
        d.shimmer += d.sSpd;
        d.x += d.vx + Math.sin(d.wobble) * 0.5;
        d.y += d.vy;
        d.vy -= 0.02;
        d.alpha -= 0.0009;

        if (d.alpha <= 0 || d.y < -30) { DUST.splice(i, 1); continue; }
        if (d.x < -10) d.x = W + 10;
        if (d.x > W + 10) d.x = -10;

        /* Trail */
        for (let t = 0; t < d.trail.length - 1; t++) {
          const prog = t / d.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(d.trail[t].x, d.trail[t].y);
          ctx!.lineTo(d.trail[t + 1].x, d.trail[t + 1].y);
          ctx!.strokeStyle = `hsla(${d.hue}, 88%, 75%, ${prog * d.alpha * 0.4})`;
          ctx!.lineWidth   = d.r * prog * 0.4;
          ctx!.stroke();
        }

        const sh  = 0.5 + Math.sin(d.shimmer) * 0.5;
        const grd = ctx!.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4);
        grd.addColorStop(0, `hsla(${d.hue}, 100%, 94%, ${d.alpha * sh})`);
        grd.addColorStop(1, `hsla(${d.hue}, 90%, 65%, 0)`);
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.r * 4, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${d.hue}, 95%, 88%, ${d.alpha})`;
        ctx!.fill();
      }
    }

    /* ══════════════ DRAW ACHIEVEMENT STARS ══════════════ */
    let starTimer = 0;
    function updateDrawAwardStars() {
      starTimer++;
      if (starTimer > 40) { starTimer = 0; spawnAmbientStar(); }

      for (let i = STARS.length - 1; i >= 0; i--) {
        const s = STARS[i];
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 10) s.trail.shift();

        s.x     += s.vx;
        s.y     += s.vy;
        s.vy    -= 0.018;
        s.vx    *= 0.99;
        s.rot   += s.rotSpd;
        s.pulse += s.pSpd;
        s.alpha -= 0.003;

        if (s.alpha <= 0 || s.y < -40) { STARS.splice(i, 1); continue; }

        /* Trail */
        for (let t = 0; t < s.trail.length - 1; t++) {
          const prog = t / s.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(s.trail[t].x, s.trail[t].y);
          ctx!.lineTo(s.trail[t + 1].x, s.trail[t + 1].y);
          ctx!.strokeStyle = `hsla(${s.hue}, 90%, 78%, ${prog * s.alpha * 0.5})`;
          ctx!.lineWidth   = s.r * prog * 0.4;
          ctx!.stroke();
        }

        const pr  = s.r * (1 + Math.sin(s.pulse) * 0.25);
        const grd = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, pr * 5);
        grd.addColorStop(0,   `hsla(${s.hue}, 100%, 96%, ${s.alpha * 0.8})`);
        grd.addColorStop(0.4, `hsla(${s.hue}, 90%, 72%, ${s.alpha * 0.3})`);
        grd.addColorStop(1,   `hsla(${s.hue}, 80%, 55%, 0)`);
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, pr * 5, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();

        ctx!.save();
        ctx!.translate(s.x, s.y);
        ctx!.rotate(s.rot);
        ctx!.fillStyle = `hsla(${s.hue}, 95%, 90%, ${s.alpha})`;
        drawStarPath(s.points, pr, pr * 0.38);
        ctx!.fill();

        /* Highlight */
        ctx!.beginPath();
        ctx!.arc(-pr * 0.28, -pr * 0.28, pr * 0.2, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${s.hue + 15}, 100%, 98%, ${s.alpha * 0.7})`;
        ctx!.fill();
        ctx!.restore();
      }
    }

    /* ══════════════ CLICK FX ══════════════ */
    function updateDrawClickParticles() {
      for (let i = CLICK_P.length - 1; i >= 0; i--) {
        const p = CLICK_P[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 10) p.trail.shift();

        p.x   += p.vx;
        p.y   += p.vy;
        p.vy  += p.gravity;
        p.vx  *= 0.95;
        p.vy  *= 0.96;
        p.rot += p.rotSpd;
        p.life -= 0.013;

        if (p.life <= 0) { CLICK_P.splice(i, 1); continue; }

        /* Trail */
        for (let t = 0; t < p.trail.length - 1; t++) {
          const prog = t / p.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(p.trail[t].x, p.trail[t].y);
          ctx!.lineTo(p.trail[t + 1].x, p.trail[t + 1].y);
          ctx!.strokeStyle = `hsla(${p.hue}, 100%, 78%, ${prog * p.life * 0.7})`;
          ctx!.lineWidth   = p.r * prog * 0.5;
          ctx!.stroke();
        }

        /* Glow */
        const grd = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        grd.addColorStop(0,   `hsla(${p.hue}, 100%, 97%, ${p.life * 0.9})`);
        grd.addColorStop(0.5, `hsla(${p.hue}, 95%, 72%, ${p.life * 0.35})`);
        grd.addColorStop(1,   `hsla(${p.hue}, 85%, 55%, 0)`);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();

        /* Shape */
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.globalAlpha = p.life;
        ctx!.fillStyle   = `hsla(${p.hue}, 100%, 92%, 1)`;

        if (p.shape === 0) {
          ctx!.beginPath(); ctx!.arc(0, 0, p.r * p.life, 0, Math.PI * 2); ctx!.fill();
        } else if (p.shape === 1) {
          drawStarPath(5, p.r, p.r * 0.4); ctx!.fill();
        } else if (p.shape === 2) {
          drawDiamondPath(p.r); ctx!.fill();
        } else {
          drawSparkPath(p.r); ctx!.fill();
        }
        ctx!.restore();
      }
    }

    function updateDrawCrownRays() {
      for (let i = RAYS.length - 1; i >= 0; i--) {
        const r = RAYS[i];
        r.len  += (r.targetLen - r.len) * 0.1;
        r.life -= 0.016;
        if (r.life <= 0) { RAYS.splice(i, 1); continue; }

        const ex = r.x + Math.cos(r.angle) * r.len;
        const ey = r.y + Math.sin(r.angle) * r.len;

        const grad = ctx!.createLinearGradient(r.x, r.y, ex, ey);
        grad.addColorStop(0,   `hsla(${r.hue}, 100%, 98%, ${r.life * 0.9})`);
        grad.addColorStop(0.6, `hsla(${r.hue}, 95%, 78%, ${r.life * 0.5})`);
        grad.addColorStop(1,   `hsla(${r.hue}, 85%, 58%, 0)`);

        ctx!.beginPath();
        ctx!.moveTo(r.x, r.y);
        ctx!.lineTo(ex, ey);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth   = r.width * r.life;
        ctx!.stroke();

        /* Ray tip glow */
        const tipG = ctx!.createRadialGradient(ex, ey, 0, ex, ey, 10);
        tipG.addColorStop(0, `hsla(${r.hue}, 100%, 99%, ${r.life})`);
        tipG.addColorStop(1, `hsla(${r.hue}, 90%, 70%, 0)`);
        ctx!.beginPath();
        ctx!.arc(ex, ey, 10, 0, Math.PI * 2);
        ctx!.fillStyle = tipG;
        ctx!.fill();
      }
    }

    function updateDrawShockRings() {
      for (let i = RINGS.length - 1; i >= 0; i--) {
        const ring = RINGS[i];
        ring.r    += (ring.maxR - ring.r) * 0.08 + 2;
        ring.life -= 0.015;
        if (ring.life <= 0) { RINGS.splice(i, 1); continue; }

        ctx!.beginPath();
        ctx!.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx!.strokeStyle = `hsla(${ring.hue}, 90%, 78%, ${ring.life * 0.5})`;
        ctx!.lineWidth   = ring.width * ring.life;
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.arc(ring.x, ring.y, ring.r * 0.72, 0, Math.PI * 2);
        ctx!.strokeStyle = `hsla(${ring.hue}, 100%, 94%, ${ring.life * 0.18})`;
        ctx!.lineWidth   = ring.width * 2.5 * ring.life;
        ctx!.stroke();
      }
    }

    function updateDrawStarBursts() {
      for (let i = BURSTS.length - 1; i >= 0; i--) {
        const b = BURSTS[i];
        b.r    += (b.targetR - b.r) * 0.1;
        b.rot  += 0.012;
        b.life -= 0.018;
        if (b.life <= 0) { BURSTS.splice(i, 1); continue; }

        ctx!.save();
        ctx!.translate(b.x, b.y);
        ctx!.rotate(b.rot);
        ctx!.globalAlpha = b.life * 0.8;
        ctx!.strokeStyle = `hsla(${b.hue}, 92%, 80%, ${b.life})`;
        ctx!.lineWidth   = 1.5;
        drawStarPath(b.pts, b.r, b.r * 0.45);
        ctx!.stroke();

        const grd = ctx!.createRadialGradient(0, 0, 0, 0, 0, b.r * 0.3);
        grd.addColorStop(0, `hsla(${b.hue}, 100%, 98%, ${b.life * 0.6})`);
        grd.addColorStop(1, `hsla(${b.hue}, 90%, 70%, 0)`);
        ctx!.beginPath();
        ctx!.arc(0, 0, b.r * 0.3, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();
        ctx!.restore();
      }
    }

    function updateDrawLaurelClicks() {
      for (let i = LAURELS.length - 1; i >= 0; i--) {
        const l = LAURELS[i];
        l.r    += (l.targetR - l.r) * 0.08;
        l.rot  += l.rotSpd;
        l.life -= 0.012;
        if (l.life <= 0) { LAURELS.splice(i, 1); continue; }

        ctx!.save();
        ctx!.translate(l.cx, l.cy);
        ctx!.rotate(l.rot);
        ctx!.globalAlpha = l.alpha * l.life;

        for (let p = 0; p < l.pts; p++) {
          const angle = (p / l.pts) * Math.PI * 2;
          const px    = Math.cos(angle) * l.r;
          const py    = Math.sin(angle) * l.r;

          const gr = ctx!.createRadialGradient(px, py, 0, px, py, 8);
          gr.addColorStop(0, `hsla(${l.hue}, 92%, 82%, ${l.life * 0.9})`);
          gr.addColorStop(1, `hsla(${l.hue}, 80%, 60%, 0)`);
          ctx!.beginPath();
          ctx!.arc(px, py, 8, 0, Math.PI * 2);
          ctx!.fillStyle = gr;
          ctx!.fill();
        }

        ctx!.beginPath();
        ctx!.arc(0, 0, l.r, 0, Math.PI * 2);
        ctx!.strokeStyle = `hsla(${l.hue}, 80%, 70%, ${l.life * 0.35})`;
        ctx!.lineWidth   = 1;
        ctx!.stroke();
        ctx!.restore();
      }
    }

    /* ══════════════ MAIN LOOP ══════════════ */
    function loop() {
      time++;
      ctx!.clearRect(0, 0, W, H);
      drawBackground();
      drawBgStars();
      drawOrbs();
      drawLaurelMandala();
      updateDrawMedals();
      updateDrawDust();
      updateDrawAwardStars();
      /* Click FX */
      updateDrawLaurelClicks();
      updateDrawShockRings();
      updateDrawCrownRays();
      updateDrawStarBursts();
      updateDrawClickParticles();
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

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const vFadeUp: Variants = { hidden: { opacity: 0, y: 44 }, show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } } };
const vStagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.13 } } };
const vScaleIn: Variants = { hidden: { opacity: 0, scale: 0.6, rotateX: -55 }, show: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.95, ease: EASE } } };
const vSlideLeft: Variants = { hidden: { opacity: 0, x: -48 }, show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } } };
const vSlideRight: Variants = { hidden: { opacity: 0, x: 48 }, show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } } };

const ACCENT      = '#c4a23a';
const ACCENT_DARK = '#1a1400';

const PRODUCTS = products.items.map(p => ({ name: p.name, sub: p.price, tag: p.tag, img: asset(p.image) }));

const CATEGORIES = categories.items.map(c => ({ name: c.name, desc: c.text, accent: c.accent, tag: c.tag, img: asset(c.image) }));

const CUSTOM_ITEMS = customization.items.map(c => ({ icon: c.symbol, title: c.title, desc: c.text }));

const WHY = why.items.map(w => ({ icon: w.symbol, title: w.title, desc: w.text }));

function CategoryCard({ item, index }: { item: typeof CATEGORIES[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { ref, springX, springY, onMouseMove, onMouseLeave } = useTilt(12);
  return (
    <motion.div variants={vScaleIn} style={{ perspective: '1400px', transformStyle: 'preserve-3d' }} className="cursor-pointer">
      <motion.div ref={ref} onMouseMove={onMouseMove}
        onMouseLeave={() => { onMouseLeave(); setHovered(false); }} onMouseEnter={() => setHovered(true)}
        style={{
          rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', willChange: 'transform',
          boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.14)' : '0 2px 10px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.4s', borderRadius: 16, overflow: 'hidden', background: 'white',
        }}>
        <div style={{ height: 280, overflow: 'hidden', position: 'relative' }}>
          <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.07 : 1 }} transition={{ duration: 0.75, ease: EASE }} style={{ willChange: 'transform' }} />
          <motion.div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: item.accent }}
            animate={{ opacity: hovered ? 0.18 : 0 }} transition={{ duration: 0.4 }} />
          <motion.span animate={{ y: hovered ? 0 : -24, opacity: hovered ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="absolute top-4 left-4 text-[9px] uppercase tracking-[0.18em] font-bold text-white px-3 py-1 rounded-sm"
            style={{ backgroundColor: item.accent }}>{item.tag}</motion.span>
        </div>
        <div className="p-7 relative overflow-hidden">
          <motion.div className="absolute bottom-0 left-0 h-[3px]" style={{ backgroundColor: item.accent }}
            animate={{ width: hovered ? '100%' : '0%' }} transition={{ duration: 0.45, ease: EASE }} />
          <h3 className="font-serif text-2xl mb-2" style={{ color: ACCENT_DARK }}>{item.name}</h3>
          <p className="text-sm font-light leading-relaxed mb-5" style={{ color: '#73736e' }}>{item.desc}</p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT_DARK }}>
            <motion.span animate={{ x: hovered ? 3 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>{categories.linkText}</motion.span>
            <motion.span animate={{ rotate: hovered ? 45 : 0, x: hovered ? 2 : 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }} style={{ display: 'inline-flex' }}><ArrowRight size={11} /></motion.span>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)', borderRadius: 16 }} />
      </motion.div>
    </motion.div>
  );
}

function ProductCard({ item, index }: { item: typeof PRODUCTS[0]; index: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 44 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 44 }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: EASE }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
      className="cursor-pointer" style={{ minWidth: 360, scrollSnapAlign: 'start' }}>
      <div className="relative overflow-hidden mb-4" style={{ aspectRatio: '1', borderRadius: 16 }}>
        <motion.img src={item.img} alt={item.name} className="h-[380px] w-full object-cover"
          animate={{ scale: hovered ? 1.06 : 1 }} transition={{ duration: 0.65, ease: EASE }} style={{ willChange: 'transform' }} />
        <span className="absolute top-4 left-4 text-[10px] font-bold uppercase text-white px-4 py-1 rounded-full"
          style={{ background: 'rgba(168,136,46,0.9)', backdropFilter: 'blur(6px)', letterSpacing: 2 }}>{item.tag}</span>
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
    <motion.div ref={ref} initial={{ opacity: 0, y: 36 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: EASE }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)} className="text-center p-6 cursor-pointer">
      <motion.div className="flex items-center justify-center mx-auto mb-5 rounded-full text-3xl" style={{ width: 64, height: 64 }}
        animate={{ background: hovered ? ACCENT : '#f5edcc', color: hovered ? 'white' : ACCENT_DARK }} transition={{ duration: 0.3 }}>
        {item.icon}
      </motion.div>
      <h4 className="font-bold text-xs uppercase tracking-widest mb-2">{item.title}</h4>
      <p className="text-xs font-light leading-relaxed" style={{ color: '#73736e' }}>{item.desc}</p>
    </motion.div>
  );
}

export default function AwardRecognition() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const heroRef     = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const springTxt   = useSpring(useTransform(scrollYProgress, [0, 1], ['0%', '18%']), { stiffness: 80, damping: 25 });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  useAwardCanvas(canvasRef, heroRef);

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
    <div className="overflow-x-hidden" style={{ background: '#faf7ee', fontFamily: 'inherit' }}>

      {/* ══ HERO ══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative flex items-center overflow-hidden" style={{ minHeight: '100vh' }}>

        {/* Canvas */}
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />

        {/* Gradient overlays */}
        <div className="absolute bottom-0 left-0 right-0 h-56 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(4,2,8,0.75) 0%, transparent 100%)', zIndex: 1 }} />
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(4,2,8,0.5) 0%, transparent 100%)', zIndex: 1 }} />

        {/* Click hint */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1 }}
          className="absolute top-6 right-8 z-10 pointer-events-none flex items-center gap-2"
          style={{ color: 'rgba(220,185,80,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>
          <motion.span animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>✦</motion.span>
          {hero.clickHint}
        </motion.div>

        {/* Hero text */}
        <motion.div style={{ y: springTxt, opacity: heroOpacity, willChange: 'transform' }}
          className="absolute bottom-20 left-8 md:left-20 z-10 max-w-3xl px-4">

          <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[10px] uppercase tracking-[0.32em] font-bold text-white/60 mb-5 flex items-center gap-3">
            <span className="w-10 h-px inline-block" style={{ background: '#b5a26a' }} />
            {hero.eyebrow}
          </motion.p>

          <h1 className="font-serif text-white" style={{ fontSize: 'clamp(3rem,7vw,6rem)', lineHeight: 1.08 }}>
            {[hero.titleLine1, hero.titleLine2].map((word, i) => (
              <motion.span key={word}
                initial={{ rotateX: -90, opacity: 0, y: 40 }} animate={{ rotateX: 0, opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.15, ease: EASE }}
                style={{ display: 'block', transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}>
                {word}
              </motion.span>
            ))}
            <motion.span
              initial={{ rotateX: -90, opacity: 0, y: 40 }} animate={{ rotateX: 0, opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
              style={{
                display: 'block', fontStyle: 'italic', fontWeight: 400,
                transformOrigin: 'bottom center', transformStyle: 'preserve-3d',
                color: 'rgba(220,190,100,0.92)',
              }}>
              {hero.titleHighlight}
            </motion.span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.8 }}
            className="text-white/80 mt-6 max-w-md text-lg font-light leading-relaxed">
            {hero.intro}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 1.05 }}
            className="flex gap-4 mt-10 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05, y: -2, boxShadow: '0 12px 32px rgba(196,162,58,0.5)' }}
              whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full"
              style={{ background: ACCENT, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 30px rgba(196,162,58,0.4)' }}>
              {hero.primaryButton}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, y: -2, background: 'rgba(255,255,255,0.12)' }}
              whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              onClick={() => window.location.href = '/contact'}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {hero.secondaryButton}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold">{hero.scrollLabel}</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 28, background: 'linear-gradient(to bottom,rgba(196,162,58,0.85),transparent)' }} />
        </motion.div>
      </section>

      {/* ══ ABOUT ══════════════════════════════════════════ */}
      <section ref={aboutRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#faf7ee' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vStagger} initial="hidden" animate={aboutInView ? 'show' : 'hidden'}>
            <motion.div variants={vFadeUp}>
              <motion.div initial={{ scaleX: 0 }} animate={aboutInView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                style={{ originX: 0, height: 3, width: 80, background: ACCENT, marginBottom: 24 }} />
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
            <motion.div variants={vFadeUp} className="flex items-center gap-4 pt-8" style={{ borderTop: '1px solid #e8ddb0' }}>
              <div className="flex items-center justify-center rounded-full text-2xl flex-shrink-0"
                style={{ width: 48, height: 48, background: '#f5edcc' }}>{about.badgeSymbol}</div>
              <p className="font-semibold text-sm" style={{ color: ACCENT }}>{about.badgeText}</p>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={aboutInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.85, ease: EASE }} style={{ perspective: '1200px' }}>
            <motion.div ref={aRef} onMouseMove={aMM} onMouseLeave={aML}
              style={{ rotateX: aX, rotateY: aY, transformStyle: 'preserve-3d', willChange: 'transform' }}>
              <img src={asset(about.image)} alt={about.imageAlt}
                className="w-full rounded-2xl shadow-2xl" style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ CATEGORIES ══════════════════════════════════════ */}
      <section ref={catRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#f0e9cc' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={catInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }} className="text-center mb-14">
            <h2 className="text-5xl font-serif mb-4" style={{ color: ACCENT_DARK }}>{categories.title}</h2>
            <p className="font-light text-sm max-w-lg mx-auto" style={{ color: '#73736e' }}>
              {categories.intro}
            </p>
          </motion.div>
          <motion.div variants={vStagger} initial="hidden" animate={catInView ? 'show' : 'hidden'}
            className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ perspective: '1600px' }}>
            {CATEGORIES.map((item, i) => <CategoryCard key={item.name} item={item} index={i} />)}
          </motion.div>
        </div>
      </section>

      {/* ══ PRODUCTS ════════════════════════════════════════ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: '#faf7ee' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.6 }}
            className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-5xl font-serif mb-2" style={{ color: ACCENT_DARK }}>{products.title}</h2>
              <p className="font-light" style={{ color: '#73736e' }}>{products.intro}</p>
            </div>
            <motion.a whileHover={{ y: -1 }} className="font-bold text-xs uppercase tracking-widest border-b-2 pb-1 cursor-pointer"
              style={{ borderColor: ACCENT, color: ACCENT_DARK }}>{products.viewAllText}</motion.a>
          </motion.div>
          <div className="flex gap-6 overflow-x-auto pb-4"
            style={{ scrollSnapType: 'x mandatory', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {PRODUCTS.map((p, i) => <ProductCard key={p.name} item={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ CUSTOMIZATION ══════════════════════════════════ */}
      <section ref={custRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background: ACCENT_DARK }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vSlideLeft} initial="hidden" animate={custInView ? 'show' : 'hidden'}>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/60 mb-4">{customization.eyebrow}</p>
            <h2 className="text-5xl font-serif text-white leading-tight mb-6">
              {customization.title}<br />
              <span style={{ color: '#e8c96a', fontStyle: 'italic', fontWeight: 400 }}>{customization.titleHighlight}</span>
            </h2>
            <p className="text-lg font-light leading-relaxed mb-12" style={{ color: 'rgba(212,212,212,0.7)' }}>
              {customization.intro}
            </p>
            <motion.div variants={vStagger} initial="hidden" animate={custInView ? 'show' : 'hidden'} className="grid grid-cols-2 gap-8">
              {CUSTOM_ITEMS.map(item => (
                <motion.div key={item.title} variants={vFadeUp} className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center text-lg rounded-lg"
                    style={{ width: 40, height: 40, border: '1px solid rgba(232,201,106,0.3)', color: '#e8c96a' }}>{item.icon}</div>
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
            <div className="relative rounded-3xl overflow-hidden p-6" style={{ background: '#f0e9cc' }}>
              <img src={asset(customization.image)} alt={customization.imageAlt}
                className="w-full rounded-2xl shadow-xl" style={{ aspectRatio: '1', objectFit: 'cover' }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ WHY ════════════════════════════════════════════ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <h2 className="text-5xl font-serif" style={{ color: ACCENT_DARK }}>{why.title}</h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {WHY.map((item, i) => <WhyCard key={item.title} item={item} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══ TRUST ══════════════════════════════════════════ */}
      {clients.length > 0 && (
      <section className="py-14 px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false, amount: 0.5 }}
            className="text-center text-[9px] uppercase tracking-[0.3em] font-bold mb-10" style={{ color: '#a6a6a1' }}>
            {trust.title}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 0.6 }} viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.6 }} className="flex flex-wrap justify-center gap-16">
            {clients.map(c => c.logo
              ? <img key={c.name} src={c.logo} alt={c.name} style={{ height: 32, objectFit: 'contain' }} />
              : <span key={c.name} className="font-serif text-xl font-bold" style={{ color: '#4d4941', letterSpacing: -0.5 }}>{c.name}</span>)}
          </motion.div>
        </div>
      </section>
      )}

      {/* ══ CTA ════════════════════════════════════════════ */}
      <section ref={ctaRef} className="py-32 px-8 text-center" style={{ background: '#f0e9cc' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity: 0, letterSpacing: '-0.05em', y: 20 }}
            animate={ctaInView ? { opacity: 1, letterSpacing: '-0.01em', y: 0 } : { opacity: 0, letterSpacing: '-0.05em', y: 20 }}
            transition={{ duration: 0.85, ease: EASE }}
            className="font-serif text-5xl md:text-6xl leading-tight mb-6" style={{ color: ACCENT_DARK }}>
            {cta.titleLine1}<br /><span className="italic font-normal">{cta.titleHighlight}</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.6, delay: 0.15 }} className="text-xl font-light leading-relaxed mb-12" style={{ color: '#73736e' }}>
            {cta.intro}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.6, delay: 0.28 }} className="flex flex-col sm:flex-row justify-center gap-6">
            <motion.button
              whileHover={{ scale: 1.06, y: -3, boxShadow: '0 18px 40px rgba(196,162,58,0.35)' }}
              whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              onClick={() => window.location.href = '/get-proposal'}
              className="text-white font-bold uppercase tracking-[0.2em] text-xs px-14 py-6 rounded-full shadow-xl"
              style={{ background: ACCENT, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {cta.primaryButton}
            </motion.button>
            <motion.button whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="font-bold uppercase tracking-[0.2em] text-xs pb-1"
              onClick={() => window.location.href = '/contact'}
              style={{ background: 'transparent', border: 'none', borderBottom: '2px solid rgba(196,162,58,0.3)', cursor: 'pointer', fontFamily: 'inherit', color: ACCENT_DARK }}
              onMouseEnter={e => (e.currentTarget.style.borderBottomColor = ACCENT)}
              onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'rgba(196,162,58,0.3)')}>
              {cta.secondaryButton}
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}