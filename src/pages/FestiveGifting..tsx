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
import { ArrowRight } from 'lucide-react';
import { hasSiteImage, siteImage } from '../lib/siteImages';
import { clients } from '../lib/clients';
import { testimonials } from '../lib/testimonials';
import { asset } from '../lib/content';
import content from '../content/pages/festive-gifting.json';

// Page words and photos: src/content/pages/festive-gifting.json (admin → Pages → Festive Gifting)
const { hero, about, categories, featured, customization, why, trust, cta } = content;

/* ─────────────────────────────────────────────
   FESTIVE CANVAS HOOK
───────────────────────────────────────────── */
function useFestiveCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    let animId: number;
    let mx = -9999, my = -9999;
    let frame = 0;
    let fwTimer = 0;
    let flashAmt = 0;
    let time = 0;

    /* ── ripples on click ── */
    interface Ripple { x: number; y: number; r: number; maxR: number; life: number; hue: number; }
    const RIPPLES: Ripple[] = [];

    /* ── shockwave rings on click ── */
    interface Shockwave { x: number; y: number; r: number; life: number; hue: number; }
    const SHOCKWAVES: Shockwave[] = [];

    /* ── gravity wells (linger on canvas after click) ── */
    interface Well { x: number; y: number; life: number; maxLife: number; hue: number; strength: number; }
    const WELLS: Well[] = [];

    function resize() {
      W = canvas!.width  = container!.offsetWidth;
      H = canvas!.height = container!.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function onMouseMove(e: MouseEvent) {
      const r = container!.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    }
    function onMouseLeave() { mx = -9999; my = -9999; }
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    function onClick(e: MouseEvent) {
      const r  = container!.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const hue = FEST_HUES[Math.floor(Math.random() * FEST_HUES.length)];

      /* 1 – big firework */
      spawnFirework(cx, cy, true);
      flashAmt = 1;

      /* 2 – ripple rings */
      for (let i = 0; i < 4; i++) {
        RIPPLES.push({ x: cx, y: cy, r: i * 18, maxR: 180 + i * 60, life: 1, hue });
      }

      /* 3 – shockwave */
      SHOCKWAVES.push({ x: cx, y: cy, r: 0, life: 1, hue });

      /* 4 – gravity well that pulls nearby nodes */
      WELLS.push({ x: cx, y: cy, life: 1, maxLife: 1, hue, strength: 3.5 });

      /* 5 – burst of embers */
      for (let i = 0; i < 12; i++) spawnEmber(cx, cy);
    }
    container.addEventListener('click', onClick);

    /* ── palette ── */
    const FEST_HUES = [45, 50, 55, 30, 0, 330, 340, 15, 120, 200];
    const randH = () => FEST_HUES[Math.floor(Math.random() * FEST_HUES.length)];

    /* ══════════════════════════════
       NEURON / ORB NETWORK  ← KEY feature
       Dense node mesh with animated
       electrical pulses along edges
    ══════════════════════════════ */
    interface Node {
      x: number; y: number; vx: number; vy: number;
      ox: number; oy: number;          /* original / home position */
      hue: number; r: number;
      pulse: number; pulseSpd: number;
      excited: number;                 /* 0-1, lit up when pulse arrives */
    }
    interface Pulse {
      fromIdx: number; toIdx: number;
      t: number;       /* 0→1 progress */
      spd: number;
      hue: number;
      size: number;
    }

    const NODE_COUNT = 90;
    const NODES: Node[] = [];
    const PULSES: Pulse[] = [];
    let pulseTimer = 0;

    function initNodes() {
      NODES.length = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        NODES.push({
          x, y, ox: x, oy: y,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          hue: randH(),
          r: 1.8 + Math.random() * 2.2,
          pulse: Math.random() * Math.PI * 2,
          pulseSpd: 0.025 + Math.random() * 0.035,
          excited: 0,
        });
      }
    }
    initNodes();

    /* spawn a travelling pulse between two random connected nodes */
    function spawnPulse(fromIdx?: number) {
      const fi = fromIdx ?? Math.floor(Math.random() * NODES.length);
      /* find a close neighbour */
      let best = -1, bestD = 999999;
      for (let j = 0; j < NODES.length; j++) {
        if (j === fi) continue;
        const dx = NODES[fi].x - NODES[j].x;
        const dy = NODES[fi].y - NODES[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 160 && d < bestD && Math.random() > 0.25) { best = j; bestD = d; }
      }
      if (best === -1) return;
      PULSES.push({
        fromIdx: fi, toIdx: best,
        t: 0, spd: 0.012 + Math.random() * 0.018,
        hue: NODES[fi].hue,
        size: 2.5 + Math.random() * 2,
      });
    }

    function updateDrawNetwork() {
      const LINK_DIST = 140;

      /* move nodes */
      NODES.forEach(n => {
        n.pulse += n.pulseSpd;
        n.excited = Math.max(0, n.excited - 0.02);

        /* gentle drift back to home */
        n.vx += (n.ox - n.x) * 0.0004;
        n.vy += (n.oy - n.y) * 0.0004;

        /* mouse repulsion */
        if (mx > -999) {
          const dx = n.x - mx, dy = n.y - my;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 140 && d > 0) {
            n.vx += (dx / d) * (140 - d) * 0.012;
            n.vy += (dy / d) * (140 - d) * 0.012;
          }
        }

        /* gravity wells */
        WELLS.forEach(w => {
          const dx = w.x - n.x, dy = w.y - n.y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 200 && d > 0) {
            n.vx += (dx / d) * w.strength * w.life * 0.5;
            n.vy += (dy / d) * w.strength * w.life * 0.5;
          }
        });

        n.vx *= 0.94; n.vy *= 0.94;
        n.x  += n.vx;  n.y  += n.vy;

        /* soft boundary */
        if (n.x < 0)  { n.x = 0;  n.vx *= -0.5; }
        if (n.x > W)  { n.x = W;  n.vx *= -0.5; }
        if (n.y < 0)  { n.y = 0;  n.vy *= -0.5; }
        if (n.y > H)  { n.y = H;  n.vy *= -0.5; }
      });

      /* draw links */
      for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
          const a = NODES[i], b = NODES[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.38
              + (a.excited + b.excited) * 0.2;
            const h = (a.hue + b.hue) / 2;

            /* gradient stroke for a glowing wire look */
            const grad = ctx!.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, `hsla(${a.hue},90%,68%,${alpha})`);
            grad.addColorStop(1, `hsla(${b.hue},90%,68%,${alpha})`);
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.strokeStyle = grad;
            ctx!.lineWidth   = 0.8 + (a.excited + b.excited) * 0.8;
            ctx!.stroke();
          }
        }
      }

      /* draw pulses travelling along edges */
      for (let i = PULSES.length - 1; i >= 0; i--) {
        const p  = PULSES[i];
        p.t += p.spd;
        if (p.t >= 1) {
          /* excite destination node and chain to next */
          NODES[p.toIdx].excited = 1;
          if (Math.random() > 0.3) spawnPulse(p.toIdx);
          PULSES.splice(i, 1);
          continue;
        }
        const a  = NODES[p.fromIdx];
        const b  = NODES[p.toIdx];
        const px = a.x + (b.x - a.x) * p.t;
        const py = a.y + (b.y - a.y) * p.t;

        /* glow behind pulse */
        const grd = ctx!.createRadialGradient(px, py, 0, px, py, p.size * 5);
        grd.addColorStop(0, `hsla(${p.hue},100%,90%,0.75)`);
        grd.addColorStop(1, `hsla(${p.hue},100%,60%,0)`);
        ctx!.beginPath();
        ctx!.arc(px, py, p.size * 5, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();

        /* core dot */
        ctx!.beginPath();
        ctx!.arc(px, py, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue},100%,95%,0.95)`;
        ctx!.fill();
      }

      /* draw nodes */
      NODES.forEach(n => {
        const pr   = n.r + Math.sin(n.pulse) * 0.6 + n.excited * 2;
        const grd  = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, pr * 5);
        const base = 0.35 + n.excited * 0.55;
        grd.addColorStop(0, `hsla(${n.hue},100%,90%,${base + 0.3})`);
        grd.addColorStop(0.4,`hsla(${n.hue},90%,65%,${base * 0.5})`);
        grd.addColorStop(1, `hsla(${n.hue},80%,50%,0)`);
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, pr * 5, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, pr, 0, Math.PI * 2);
        ctx!.fillStyle = `hsl(${n.hue},90%,${80 + n.excited * 18}%)`;
        ctx!.fill();
      });

      /* auto pulse spawn */
      pulseTimer++;
      if (pulseTimer > 8) { pulseTimer = 0; spawnPulse(); }
    }

    /* ══════════════════════════════
       RIPPLE RINGS
    ══════════════════════════════ */
    function updateDrawRipples() {
      for (let i = RIPPLES.length - 1; i >= 0; i--) {
        const rp = RIPPLES[i];
        rp.r    += (rp.maxR - rp.r) * 0.06 + 1.5;
        rp.life -= 0.018;
        if (rp.life <= 0) { RIPPLES.splice(i, 1); continue; }
        ctx!.beginPath();
        ctx!.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx!.strokeStyle = `hsla(${rp.hue},100%,75%,${rp.life * 0.55})`;
        ctx!.lineWidth   = 2 * rp.life;
        ctx!.stroke();
      }
    }

    /* ══════════════════════════════
       SHOCKWAVE
    ══════════════════════════════ */
    function updateDrawShockwaves() {
      for (let i = SHOCKWAVES.length - 1; i >= 0; i--) {
        const sw = SHOCKWAVES[i];
        sw.r    += 18;
        sw.life -= 0.04;
        if (sw.life <= 0) { SHOCKWAVES.splice(i, 1); continue; }
        const grad = ctx!.createRadialGradient(sw.x, sw.y, sw.r - 12, sw.x, sw.y, sw.r + 12);
        grad.addColorStop(0,   `hsla(${sw.hue},100%,80%,0)`);
        grad.addColorStop(0.5, `hsla(${sw.hue},100%,75%,${sw.life * 0.4})`);
        grad.addColorStop(1,   `hsla(${sw.hue},100%,80%,0)`);
        ctx!.beginPath();
        ctx!.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();
      }
    }

    /* ══════════════════════════════
       GRAVITY WELLS
    ══════════════════════════════ */
    function updateDrawWells() {
      for (let i = WELLS.length - 1; i >= 0; i--) {
        const w = WELLS[i];
        w.life -= 0.008;
        if (w.life <= 0) { WELLS.splice(i, 1); continue; }
        /* subtle pulsing ring to mark well */
        const grd = ctx!.createRadialGradient(w.x, w.y, 0, w.x, w.y, 60 * w.life);
        grd.addColorStop(0,   `hsla(${w.hue},100%,80%,${w.life * 0.12})`);
        grd.addColorStop(0.6, `hsla(${w.hue},90%,60%,${w.life * 0.06})`);
        grd.addColorStop(1,   `hsla(${w.hue},80%,50%,0)`);
        ctx!.beginPath();
        ctx!.arc(w.x, w.y, 60 * w.life, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();
      }
    }

    /* ══════════════════════════════
       DEEP STAR FIELD (parallax)
    ══════════════════════════════ */
    interface Star { x:number;y:number;z:number;px:number;py:number;hue:number;tw:number;twSpd:number; }
    const STARS: Star[] = Array.from({ length: 180 }, () => ({
      x:(Math.random()-0.5)*2, y:(Math.random()-0.5)*2, z:Math.random(),
      px:0, py:0, hue:30+Math.random()*40,
      tw:Math.random()*Math.PI*2, twSpd:0.02+Math.random()*0.04,
    }));

    function drawStarField() {
      const cx = W/2, cy = H/2;
      STARS.forEach(s => {
        s.tw += s.twSpd; s.z -= 0.0012;
        if (s.z <= 0) { s.x=(Math.random()-0.5)*2; s.y=(Math.random()-0.5)*2; s.z=1; }
        const sx = (s.x/s.z)*W*0.5+cx;
        const sy = (s.y/s.z)*H*0.5+cy;
        const r  = Math.max(0,(1-s.z)*2.2);
        const a  = (0.4+Math.sin(s.tw)*0.4)*(1-s.z*0.5);
        ctx!.beginPath(); ctx!.moveTo(s.px||sx,s.py||sy); ctx!.lineTo(sx,sy);
        ctx!.strokeStyle=`hsla(${s.hue},80%,95%,${a*0.35})`; ctx!.lineWidth=r*0.5; ctx!.stroke();
        ctx!.beginPath(); ctx!.arc(sx,sy,r,0,Math.PI*2);
        ctx!.fillStyle=`hsla(${s.hue},90%,95%,${a})`; ctx!.fill();
        s.px=sx; s.py=sy;
      });
    }

    /* ══════════════════════════════
       AURORA BANDS
    ══════════════════════════════ */
    const BANDS = [
      {hue:340,y:0.25,amp:0.08,spd:0.0007,phase:0},
      {hue:45, y:0.45,amp:0.06,spd:0.0009,phase:1.2},
      {hue:15, y:0.65,amp:0.07,spd:0.0006,phase:2.4},
      {hue:200,y:0.35,amp:0.05,spd:0.0011,phase:3.6},
    ];
    function drawAurora() {
      BANDS.forEach(b => {
        const yc = H*(b.y+Math.sin(time*b.spd+b.phase)*b.amp);
        const g  = ctx!.createLinearGradient(0,yc-120,0,yc+120);
        g.addColorStop(0,  `hsla(${b.hue},80%,40%,0)`);
        g.addColorStop(0.4,`hsla(${b.hue},90%,55%,0.06)`);
        g.addColorStop(0.5,`hsla(${b.hue},100%,65%,0.11)`);
        g.addColorStop(0.6,`hsla(${b.hue},90%,55%,0.06)`);
        g.addColorStop(1,  `hsla(${b.hue},80%,40%,0)`);
        ctx!.fillStyle=g; ctx!.fillRect(0,yc-120,W,240);
      });
    }

    /* ══════════════════════════════
       EMBERS
    ══════════════════════════════ */
    interface Ember { x:number;y:number;vx:number;vy:number;r:number;hue:number;life:number;wobble:number;wobbleSpd:number;trail:{x:number,y:number}[]; }
    const EMBERS: Ember[] = [];

    function spawnEmber(ex?: number, ey?: number) {
      const x = ex ?? Math.random()*W;
      const y = ey ?? H + 10;
      const angle = ex !== undefined ? Math.random()*Math.PI*2 : -Math.PI/2;
      const spd   = ex !== undefined ? 2+Math.random()*3 : 0.6+Math.random()*1.2;
      EMBERS.push({
        x, y,
        vx: Math.cos(angle+((Math.random()-0.5)*1.2))*spd,
        vy: Math.sin(angle+((Math.random()-0.5)*1.2))*spd,
        r:1.5+Math.random()*2.5, hue:45+Math.random()*20,
        life:1, wobble:Math.random()*Math.PI*2, wobbleSpd:0.03+Math.random()*0.04,
        trail:[],
      });
    }

    function updateDrawEmbers() {
      for (let i=EMBERS.length-1;i>=0;i--) {
        const e=EMBERS[i];
        e.wobble+=e.wobbleSpd; e.x+=e.vx+Math.sin(e.wobble)*0.4; e.y+=e.vy; e.vy-=0.025; e.life-=0.008;
        if (e.y<-20||e.life<=0){EMBERS.splice(i,1);continue;}
        e.trail.push({x:e.x,y:e.y}); if(e.trail.length>10)e.trail.shift();
        for(let t=0;t<e.trail.length-1;t++){
          const prog=t/e.trail.length;
          ctx!.beginPath(); ctx!.moveTo(e.trail[t].x,e.trail[t].y); ctx!.lineTo(e.trail[t+1].x,e.trail[t+1].y);
          ctx!.strokeStyle=`hsla(${e.hue},100%,70%,${prog*e.life*0.5})`; ctx!.lineWidth=e.r*prog; ctx!.stroke();
        }
        const grd=ctx!.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r*4);
        grd.addColorStop(0,`hsla(${e.hue},100%,95%,${e.life*0.8})`);
        grd.addColorStop(1,`hsla(${e.hue},100%,50%,0)`);
        ctx!.beginPath(); ctx!.arc(e.x,e.y,e.r*4,0,Math.PI*2); ctx!.fillStyle=grd; ctx!.fill();
        ctx!.beginPath(); ctx!.arc(e.x,e.y,e.r,0,Math.PI*2);
        ctx!.fillStyle=`hsla(${e.hue},100%,98%,${e.life})`; ctx!.fill();
      }
    }

    /* ══════════════════════════════
       DIYAS
    ══════════════════════════════ */
    interface Diya { x:number;y:number;baseY:number;wobble:number;wobbleSpd:number;flicker:number;flickerSpd:number;size:number;hue:number;floatAmp:number; }
    const DIYAS: Diya[] = Array.from({length:16},(_,i)=>{
      const col=i%8, row=Math.floor(i/8);
      return {
        x:(W||800)*((col+0.5+Math.random()*0.3)/8),
        y:(H||600)*(0.62+row*0.18+Math.random()*0.06),
        baseY:(H||600)*(0.62+row*0.18+Math.random()*0.06),
        wobble:Math.random()*Math.PI*2, wobbleSpd:0.008+Math.random()*0.008,
        flicker:Math.random()*Math.PI*2, flickerSpd:0.08+Math.random()*0.12,
        size:10+Math.random()*8, hue:Math.random()<0.6?35+Math.random()*20:15,
        floatAmp:2+Math.random()*4,
      };
    });

    function drawDiya(d:Diya){
      d.wobble+=d.wobbleSpd; d.flicker+=d.flickerSpd;
      d.y=d.baseY+Math.sin(d.wobble)*d.floatAmp;
      const fs=0.85+Math.sin(d.flicker)*0.15, s=d.size;
      ctx!.save(); ctx!.translate(d.x,d.y);
      const halo=ctx!.createRadialGradient(0,-s*0.9,0,0,-s*0.5,s*3*fs);
      halo.addColorStop(0,`hsla(${d.hue},100%,80%,0.5)`);
      halo.addColorStop(1,`hsla(${d.hue},80%,50%,0)`);
      ctx!.beginPath(); ctx!.arc(0,-s*0.5,s*3*fs,0,Math.PI*2); ctx!.fillStyle=halo; ctx!.fill();
      ctx!.save(); ctx!.scale(fs,1);
      ctx!.beginPath(); ctx!.moveTo(0,-s*0.6);
      ctx!.bezierCurveTo(s*0.35,-s*1.5,s*0.5,-s*2.2,0,-s*2.8*fs);
      ctx!.bezierCurveTo(-s*0.5,-s*2.2,-s*0.35,-s*1.5,0,-s*0.6);
      const ff=ctx!.createLinearGradient(0,-s*2.8,0,-s*0.6);
      ff.addColorStop(0,`hsla(${d.hue+10},100%,98%,0.9)`);
      ff.addColorStop(0.3,`hsla(${d.hue},100%,75%,0.85)`);
      ff.addColorStop(1,`hsla(${d.hue-10},100%,55%,0.7)`);
      ctx!.fillStyle=ff; ctx!.fill(); ctx!.restore();
      ctx!.beginPath(); ctx!.ellipse(0,0,s,s*0.38,0,0,Math.PI);
      ctx!.fillStyle=`hsla(${d.hue+10},70%,40%,0.9)`; ctx!.fill();
      ctx!.beginPath(); ctx!.ellipse(0,0,s,s*0.38,0,0,Math.PI);
      ctx!.strokeStyle=`hsla(${d.hue},90%,65%,0.6)`; ctx!.lineWidth=1.5; ctx!.stroke();
      ctx!.restore();
    }

    /* ══════════════════════════════
       LANTERNS
    ══════════════════════════════ */
    interface Lantern { x:number;y:number;r:number;speedY:number;speedX:number;wobble:number;hue:number;glow:number;pulse:number;opacity:number; }
    const LANTERNS: Lantern[] = Array.from({length:7},()=>makeLantern(true));
    function makeLantern(initial:boolean):Lantern {
      return { x:60+Math.random()*Math.max((W||800)-120,100), y:initial?Math.random()*(H||600):(H||600)+60,
        r:14+Math.random()*16, speedY:-(0.18+Math.random()*0.32), speedX:(Math.random()-0.5)*0.25,
        wobble:Math.random()*Math.PI*2, hue:Math.random()<0.55?Math.random()*20:40+Math.random()*20,
        glow:0.55+Math.random()*0.4, pulse:Math.random()*Math.PI*2, opacity:0.6+Math.random()*0.4 };
    }
    function drawLantern(l:Lantern,idx:number){
      l.wobble+=0.018; l.pulse+=0.04; l.y+=l.speedY; l.x+=l.speedX+Math.sin(l.wobble)*0.3;
      if(l.y<-80)LANTERNS[idx]=makeLantern(false);
      const p=l.glow+Math.sin(l.pulse)*0.18;
      ctx!.save(); ctx!.globalAlpha=l.opacity;
      const grd=ctx!.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r*4);
      grd.addColorStop(0,`hsla(${l.hue},100%,70%,${p*0.5})`);
      grd.addColorStop(0.5,`hsla(${l.hue},90%,55%,${p*0.15})`);
      grd.addColorStop(1,`hsla(${l.hue},80%,40%,0)`);
      ctx!.beginPath(); ctx!.arc(l.x,l.y,l.r*4,0,Math.PI*2); ctx!.fillStyle=grd; ctx!.fill();
      ctx!.beginPath(); ctx!.ellipse(l.x,l.y,l.r*0.72,l.r,0,0,Math.PI*2);
      const bg=ctx!.createRadialGradient(l.x-l.r*0.2,l.y-l.r*0.25,0,l.x,l.y,l.r);
      bg.addColorStop(0,`hsla(${l.hue+20},100%,88%,0.95)`);
      bg.addColorStop(0.5,`hsla(${l.hue},100%,58%,0.9)`);
      bg.addColorStop(1,`hsla(${l.hue-15},90%,32%,0.85)`);
      ctx!.fillStyle=bg; ctx!.fill();
      ctx!.beginPath(); ctx!.rect(l.x-l.r*0.38,l.y-l.r-5,l.r*0.76,6);
      ctx!.fillStyle=`hsla(${l.hue+25},80%,72%,0.95)`; ctx!.fill();
      ctx!.beginPath(); ctx!.moveTo(l.x,l.y-l.r-5); ctx!.lineTo(l.x,l.y-l.r-18);
      ctx!.strokeStyle='rgba(255,210,110,0.5)'; ctx!.lineWidth=1; ctx!.stroke();
      for(let t=-1;t<=1;t++){
        ctx!.beginPath(); ctx!.moveTo(l.x+t*4,l.y+l.r); ctx!.lineTo(l.x+t*6,l.y+l.r+12);
        ctx!.strokeStyle=`hsla(${l.hue+10},90%,68%,0.65)`; ctx!.lineWidth=1.5; ctx!.stroke();
      }
      ctx!.restore();
    }

    /* ══════════════════════════════
       CONFETTI
    ══════════════════════════════ */
    interface Confetti { x:number;y:number;size:number;speedY:number;speedX:number;rot:number;rotSpd:number;hue:number;sat:number;lit:number;shape:number;wobble:number;alpha:number; }
    function makeConfetti(initial:boolean):Confetti {
      return { x:Math.random()*(W||800), y:initial?Math.random()*(H||600):-20,
        size:3+Math.random()*6, speedY:0.6+Math.random()*1.1, speedX:(Math.random()-0.5)*0.8,
        rot:Math.random()*360, rotSpd:(Math.random()-0.5)*3.5,
        hue:FEST_HUES[Math.floor(Math.random()*FEST_HUES.length)],
        sat:80+Math.random()*20, lit:55+Math.random()*20,
        shape:Math.floor(Math.random()*4), wobble:Math.random()*Math.PI*2, alpha:0.5+Math.random()*0.35 };
    }
    const CONFETTI: Confetti[] = Array.from({length:110},()=>makeConfetti(true));
    function drawStarShape(spikes:number,outer:number,inner:number){
      let rot=(Math.PI/2)*3; const step=Math.PI/spikes;
      ctx!.beginPath(); ctx!.moveTo(0,-outer);
      for(let i=0;i<spikes;i++){
        ctx!.lineTo(Math.cos(rot)*outer,Math.sin(rot)*outer);rot+=step;
        ctx!.lineTo(Math.cos(rot)*inner,Math.sin(rot)*inner);rot+=step;
      }ctx!.closePath();
    }
    function updateDrawConfetti(){
      CONFETTI.forEach((c,idx)=>{
        c.wobble+=0.04; c.y+=c.speedY; c.x+=c.speedX+Math.sin(c.wobble)*0.5; c.rot+=c.rotSpd;
        /* sucked toward gravity wells */
        WELLS.forEach(w=>{
          const dx=w.x-c.x,dy=w.y-c.y,d=Math.sqrt(dx*dx+dy*dy);
          if(d<180&&d>0){c.x+=(dx/d)*w.life*1.2;c.y+=(dy/d)*w.life*1.2;}
        });
        if(c.y>H+20)CONFETTI[idx]=makeConfetti(false);
        if(c.x<-20)c.x=W+20; if(c.x>W+20)c.x=-20;
        ctx!.save(); ctx!.translate(c.x,c.y); ctx!.rotate((c.rot*Math.PI)/180);
        ctx!.globalAlpha=c.alpha; ctx!.fillStyle=`hsl(${c.hue},${c.sat}%,${c.lit}%)`;
        if(c.shape===0)ctx!.fillRect(-c.size/2,-c.size/4,c.size,c.size/2);
        else if(c.shape===1){ctx!.beginPath();ctx!.arc(0,0,c.size/2,0,Math.PI*2);ctx!.fill();}
        else if(c.shape===2){drawStarShape(4,c.size/2,c.size/4);ctx!.fill();}
        else{ctx!.beginPath();ctx!.moveTo(0,-c.size/2);ctx!.lineTo(c.size/3,0);ctx!.lineTo(0,c.size/2);ctx!.lineTo(-c.size/3,0);ctx!.closePath();ctx!.fill();}
        ctx!.restore();
      });
    }

    /* ══════════════════════════════
       FIREWORKS + ROCKETS
    ══════════════════════════════ */
    interface Spark { x:number;y:number;vx:number;vy:number;life:number;decay:number;hue:number;size:number;trail:{x:number,y:number}[];glitter:boolean; }
    const SPARKS: Spark[] = [];
    interface Rocket { x:number;y:number;vy:number;tx:number;ty:number;trail:{x:number,y:number}[];hue:number; }
    const ROCKETS: Rocket[] = [];

    function spawnFirework(x:number,y:number,big=false){
      const count=big?52:28+Math.floor(Math.random()*14);
      const hue=randH(); const glitter=Math.random()>0.4;
      for(let i=0;i<count;i++){
        const angle=(i/count)*Math.PI*2;
        const spd=(big?3.8:2)+Math.random()*3.2;
        SPARKS.push({ x,y, vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
          life:1, decay:0.011+Math.random()*0.011,
          hue:hue+(Math.random()-0.5)*25, size:(big?2.8:1.8)+Math.random()*1.8,
          trail:[], glitter });
      }
      if(big){
        const hue2=randH();
        for(let i=0;i<22;i++){
          const angle=Math.random()*Math.PI*2, spd=1+Math.random()*2.5;
          SPARKS.push({ x:x+(Math.random()-0.5)*24, y:y+(Math.random()-0.5)*24,
            vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
            life:1, decay:0.016+Math.random()*0.014,
            hue:hue2, size:1.2+Math.random(), trail:[], glitter:true });
        }
      }
      /* excite nearest nodes */
      NODES.forEach(n=>{
        const dx=n.x-x, dy=n.y-y, d=Math.sqrt(dx*dx+dy*dy);
        if(d<200) { n.excited=Math.min(1,n.excited+(1-d/200)); spawnPulse(NODES.indexOf(n)); }
      });
    }

    function spawnRocket(tx?:number,ty?:number){
      const x=80+Math.random()*(W-160);
      ROCKETS.push({ x, y:H+10, vy:-(9+Math.random()*4),
        tx:tx??x+(Math.random()-0.5)*100, ty:ty??(H*(0.1+Math.random()*0.45)),
        trail:[], hue:randH() });
    }

    function updateDrawRockets(){
      for(let i=ROCKETS.length-1;i>=0;i--){
        const r=ROCKETS[i];
        r.trail.push({x:r.x,y:r.y}); if(r.trail.length>14)r.trail.shift();
        r.x+=(r.tx-r.x)*0.04; r.y+=r.vy; r.vy*=0.97;
        if(r.y<=r.ty||Math.abs(r.vy)<0.6){spawnFirework(r.x,r.y);flashAmt=0.7;ROCKETS.splice(i,1);continue;}
        for(let t=0;t<r.trail.length-1;t++){
          const prog=t/r.trail.length;
          ctx!.beginPath(); ctx!.moveTo(r.trail[t].x,r.trail[t].y); ctx!.lineTo(r.trail[t+1].x,r.trail[t+1].y);
          ctx!.strokeStyle=`hsla(${r.hue},100%,75%,${prog*0.7})`; ctx!.lineWidth=prog*2.5; ctx!.stroke();
        }
        ctx!.beginPath(); ctx!.arc(r.x,r.y,3,0,Math.PI*2);
        ctx!.fillStyle=`hsl(${r.hue},100%,90%)`; ctx!.fill();
      }
    }

    function updateDrawSparks(){
      for(let i=SPARKS.length-1;i>=0;i--){
        const s=SPARKS[i];
        s.trail.push({x:s.x,y:s.y}); if(s.trail.length>9)s.trail.shift();
        s.x+=s.vx; s.y+=s.vy; s.vy+=0.052; s.vx*=0.97; s.vy*=0.97; s.life-=s.decay;
        if(s.life<=0){SPARKS.splice(i,1);continue;}
        for(let t=0;t<s.trail.length-1;t++){
          const prog=t/s.trail.length;
          ctx!.beginPath(); ctx!.moveTo(s.trail[t].x,s.trail[t].y); ctx!.lineTo(s.trail[t+1].x,s.trail[t+1].y);
          ctx!.strokeStyle=`hsla(${s.hue},100%,72%,${prog*s.life*0.65})`; ctx!.lineWidth=s.size*prog*0.9; ctx!.stroke();
        }
        if(s.glitter&&Math.random()>0.55){
          ctx!.beginPath(); ctx!.arc(s.x+(Math.random()-0.5)*6,s.y+(Math.random()-0.5)*6,Math.random()*1.5,0,Math.PI*2);
          ctx!.fillStyle=`hsla(${s.hue},100%,95%,${s.life*0.8})`; ctx!.fill();
        }
        ctx!.beginPath(); ctx!.arc(s.x,s.y,s.size*s.life,0,Math.PI*2);
        ctx!.fillStyle=`hsla(${s.hue},100%,88%,${s.life})`; ctx!.fill();
      }
    }

    /* ══════════════════════════════
       MANDALA
    ══════════════════════════════ */
    function drawMandala(){
      const cx=W/2,cy=H/2,maxR=Math.min(W,H)*0.36,rot=time*0.0003;
      ctx!.save(); ctx!.translate(cx,cy);
      const rings=[
        {r:maxR*0.12,petals:8, hue:45, a:0.15},
        {r:maxR*0.22,petals:12,hue:15, a:0.11},
        {r:maxR*0.34,petals:16,hue:340,a:0.09},
        {r:maxR*0.48,petals:20,hue:45, a:0.07},
        {r:maxR*0.62,petals:24,hue:120,a:0.05},
      ];
      rings.forEach((ring,ri)=>{
        ctx!.save(); ctx!.rotate(rot*(ri%2===0?1:-1)*(ri+1));
        for(let p=0;p<ring.petals;p++){
          const angle=(p/ring.petals)*Math.PI*2;
          const px=Math.cos(angle)*ring.r, py=Math.sin(angle)*ring.r;
          const grd=ctx!.createRadialGradient(px,py,0,px,py,8);
          grd.addColorStop(0,`hsla(${ring.hue},100%,75%,${ring.a*2})`);
          grd.addColorStop(1,`hsla(${ring.hue},100%,60%,0)`);
          ctx!.beginPath(); ctx!.arc(px,py,8,0,Math.PI*2); ctx!.fillStyle=grd; ctx!.fill();
          ctx!.beginPath(); ctx!.moveTo(0,0); ctx!.lineTo(px,py);
          ctx!.strokeStyle=`hsla(${ring.hue},80%,65%,${ring.a*0.5})`; ctx!.lineWidth=0.5; ctx!.stroke();
        }
        ctx!.restore();
      });
      const cg=ctx!.createRadialGradient(0,0,0,0,0,maxR*0.07);
      cg.addColorStop(0,'hsla(45,100%,95%,0.85)'); cg.addColorStop(1,'hsla(45,100%,50%,0)');
      ctx!.beginPath(); ctx!.arc(0,0,maxR*0.07,0,Math.PI*2); ctx!.fillStyle=cg; ctx!.fill();
      ctx!.restore();
    }

    /* ══════════════════════════════
       MAIN LOOP
    ══════════════════════════════ */
    let emberTimer=0, rocketTimer=0;

    function loop(){
      frame++; time++;
      ctx!.clearRect(0,0,W,H);

      /* bg */
      const bg=ctx!.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#03000a'); bg.addColorStop(0.4,'#0a0012');
      bg.addColorStop(0.75,'#110005'); bg.addColorStop(1,'#06000c');
      ctx!.fillStyle=bg; ctx!.fillRect(0,0,W,H);

      const vc=ctx!.createRadialGradient(W/2,H*0.55,0,W/2,H*0.5,Math.max(W,H)*0.7);
      vc.addColorStop(0,'rgba(80,20,0,0.2)'); vc.addColorStop(0.5,'rgba(40,5,0,0.1)'); vc.addColorStop(1,'rgba(0,0,0,0)');
      ctx!.fillStyle=vc; ctx!.fillRect(0,0,W,H);

      /* layers — network first so it sits behind everything */
      drawStarField();
      drawAurora();
      updateDrawNetwork();        /* ← NEURON MESH + PULSES */
      drawMandala();
      LANTERNS.forEach((l,i)=>drawLantern(l,i));
      DIYAS.forEach(d=>drawDiya(d));

      emberTimer++; if(emberTimer>5){emberTimer=0;spawnEmber();}
      updateDrawEmbers();
      updateDrawConfetti();
      updateDrawRockets();
      updateDrawSparks();

      /* click effects */
      updateDrawWells();
      updateDrawShockwaves();
      updateDrawRipples();

      /* auto rockets */
      rocketTimer++; if(rocketTimer>120+Math.floor(Math.random()*80)){rocketTimer=0;spawnRocket();}

      /* mouse-trail rocket */
      if(mx>-999&&frame%60===0)spawnRocket(mx,my-40);

      /* flash */
      if(flashAmt>0){
        ctx!.fillStyle=`rgba(255,200,80,${flashAmt*0.13})`;
        ctx!.fillRect(0,0,W,H); flashAmt-=0.04;
      }

      animId=requestAnimationFrame(loop);
    }
    loop();

    return ()=>{
      cancelAnimationFrame(animId);
      window.removeEventListener('resize',resize);
      container.removeEventListener('mousemove',onMouseMove);
      container.removeEventListener('mouseleave',onMouseLeave);
      container.removeEventListener('click',onClick);
    };
  },[]);
}

/* ─────────────────────────────────────────────
   TILT HOOK
───────────────────────────────────────────── */
function useTilt(strength=10){
  const ref=useRef<HTMLDivElement>(null);
  const rotateX=useMotionValue(0), rotateY=useMotionValue(0);
  const cfg={stiffness:200,damping:22,mass:0.6};
  const springX=useSpring(rotateX,cfg), springY=useSpring(rotateY,cfg);
  const onMouseMove=useCallback((e:React.MouseEvent)=>{
    if(!ref.current)return;
    const r=ref.current.getBoundingClientRect();
    rotateY.set(((e.clientX-(r.left+r.width/2))/(r.width/2))*strength);
    rotateX.set(-((e.clientY-(r.top+r.height/2))/(r.height/2))*strength);
  },[strength,rotateX,rotateY]);
  const onMouseLeave=useCallback(()=>{rotateX.set(0);rotateY.set(0);},[rotateX,rotateY]);
  return {ref,springX,springY,onMouseMove,onMouseLeave};
}

/* ─────────────────────────────────────────────
   VARIANTS
───────────────────────────────────────────── */
const EASE=[0.22,1,0.36,1] as [number,number,number,number];
const vFadeUp:Variants={hidden:{opacity:0,y:44},show:{opacity:1,y:0,transition:{duration:0.75,ease:EASE}}};
const vStagger:Variants={hidden:{},show:{transition:{staggerChildren:0.14}}};
const vScaleIn:Variants={hidden:{opacity:0,scale:0.6,rotateX:-55},show:{opacity:1,scale:1,rotateX:0,transition:{duration:0.95,ease:EASE}}};
const vSlideLeft:Variants={hidden:{opacity:0,x:-40},show:{opacity:1,x:0,transition:{duration:0.7,ease:EASE}}};
const vSlideRight:Variants={hidden:{opacity:0,x:40},show:{opacity:1,x:0,transition:{duration:0.7,ease:EASE}}};

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
// An uploaded photo wins; otherwise the photo set under "Photos to add"
const CATEGORIES=categories.items.map(c=>({name:c.name,desc:c.text,tag:c.tag,accent:c.accent,img:c.image?asset(c.image):siteImage(c.photoId ?? '')}));
const FEATURED=featured.items.map(f=>({name:f.name,sub:f.subtitle,img:f.image?asset(f.image):siteImage(f.photoId ?? '')}));
const WHY=why.items.map(w=>({icon:w.symbol,title:w.title,desc:w.text}));
const CUSTOM_ITEMS=customization.items.map(c=>({icon:c.symbol,title:c.title,desc:c.text}));

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function CategoryCard({item,index}:{item:typeof CATEGORIES[0];index:number}){
  const [hovered,setHovered]=useState(false);
  const {ref,springX,springY,onMouseMove,onMouseLeave}=useTilt(12);
  return (
    <motion.div variants={vScaleIn} style={{perspective:'1400px',transformStyle:'preserve-3d'}} className="cursor-pointer" custom={index}>
      <motion.div ref={ref} onMouseMove={onMouseMove}
        onMouseLeave={()=>{onMouseLeave();setHovered(false);}} onMouseEnter={()=>setHovered(true)}
        style={{rotateX:springX,rotateY:springY,transformStyle:'preserve-3d',willChange:'transform',
          boxShadow:hovered?'0 24px 64px rgba(0,0,0,0.15)':'0 2px 8px rgba(0,0,0,0.05)',transition:'box-shadow 0.4s'}}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100">
        <div className="overflow-hidden rounded-xl m-4 relative" style={{aspectRatio:'1'}}>
          <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover"
            animate={{scale:hovered?1.08:1}} transition={{duration:0.75,ease:EASE}} style={{willChange:'transform'}}/>
          <motion.div className="absolute inset-0 pointer-events-none rounded-xl" style={{backgroundColor:item.accent}}
            animate={{opacity:hovered?0.16:0}} transition={{duration:0.4}}/>
          <motion.span animate={{y:hovered?0:-24,opacity:hovered?1:0}} transition={{type:'spring',stiffness:320,damping:22}}
            className="absolute top-3 left-3 text-[9px] uppercase tracking-[0.18em] font-bold text-white px-3 py-1 rounded-sm"
            style={{backgroundColor:item.accent}}>{item.tag}</motion.span>
        </div>
        <div className="px-5 pb-5 relative overflow-hidden">
          <motion.div className="absolute bottom-0 left-0 h-[3px]" style={{backgroundColor:item.accent}}
            animate={{width:hovered?'100%':'0%'}} transition={{duration:0.45,ease:EASE}}/>
          <h3 className="font-serif text-2xl mb-2">{item.name}</h3>
          <p className="text-gray-500 text-sm mb-4">{item.desc}</p>
          <button className="w-full py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 border border-gray-200 text-gray-700 transition-colors"
            style={{fontFamily:'inherit'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#14532d';(e.currentTarget as HTMLElement).style.color='white';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='white';(e.currentTarget as HTMLElement).style.color='#44403c';}}>
            {categories.buttonText} <ArrowRight size={13}/>
          </button>
        </div>
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{boxShadow:'inset 0 0 0 1px rgba(0,0,0,0.06)'}}/>
      </motion.div>
    </motion.div>
  );
}

function WhyCard({item,index}:{item:typeof WHY[0];index:number}){
  const ref=useRef<HTMLDivElement>(null);
  const inView=useInView(ref,{once:false,amount:0.3});
  return (
    <motion.div ref={ref} initial={{opacity:0,y:36}} animate={inView?{opacity:1,y:0}:{opacity:0,y:36}}
      transition={{duration:0.7,delay:index*0.12,ease:EASE}}
      whileHover={{y:-5,transition:{type:'spring',stiffness:300,damping:22}}}
      className="relative p-8 rounded-2xl bg-white border border-gray-200" style={{boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
      <motion.div initial={{scaleX:0}} animate={inView?{scaleX:1}:{scaleX:0}}
        transition={{duration:0.5,delay:index*0.12+0.25,ease:EASE}}
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-emerald-700" style={{transformOrigin:'left'}}/>
      <span className="text-3xl block mb-4" style={{color:'#166534'}}>{item.icon}</span>
      <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
      <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
    </motion.div>
  );
}

function FeaturedCard({p,i}:{p:typeof FEATURED[0];i:number}){
  const ref=useRef<HTMLDivElement>(null);
  const inView=useInView(ref,{once:false,amount:0.2});
  return (
    <motion.div ref={ref} initial={{opacity:0,y:48}} animate={inView?{opacity:1,y:0}:{opacity:0,y:48}}
      transition={{duration:0.7,delay:i*0.1,ease:EASE}} className="cursor-pointer flex-shrink-0"
      style={{minWidth:300,scrollSnapAlign:'start'}}>
      <div className="overflow-hidden rounded-2xl mb-4" style={{width:250,aspectRatio:'4/5'}}>
        <motion.img src={p.img} alt={p.name} className="w-full h-full object-cover"/>
      </div>
      <h4 className="font-medium text-lg mb-1">{p.name}</h4>
      <p className="text-gray-500 text-sm">{p.sub}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function FestiveGifting(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const heroRef=useRef<HTMLElement>(null);
  const {scrollYProgress}=useScroll({target:heroRef,offset:['start start','end start']});
  const textY=useTransform(scrollYProgress,[0,1],['0%','18%']);
  const heroOpacity=useTransform(scrollYProgress,[0,0.75],[1,0]);
  const springTxt=useSpring(textY,{stiffness:80,damping:25});
  useFestiveCanvas(canvasRef,heroRef);
  const {ref:aboutTiltRef,springX:atX,springY:atY,onMouseMove:atMM,onMouseLeave:atML}=useTilt(6);
  const aboutRef=useRef<HTMLElement>(null),catRef=useRef<HTMLElement>(null),
    prodRef=useRef<HTMLElement>(null),custRef=useRef<HTMLElement>(null),
    trustRef=useRef<HTMLElement>(null),ctaRef=useRef<HTMLElement>(null);
  const aboutInView=useInView(aboutRef,{once:false,amount:0.2}),
    catInView=useInView(catRef,{once:false,amount:0.15}),
    prodInView=useInView(prodRef,{once:false,amount:0.15}),
    custInView=useInView(custRef,{once:false,amount:0.15}),
    trustInView=useInView(trustRef,{once:false,amount:0.2}),
    ctaInView=useInView(ctaRef,{once:false,amount:0.3});

  return (
    <div className="overflow-x-hidden bg-brand-beige" style={{fontFamily:'inherit'}}>

      {/* ══ HERO ══ */}
      <section ref={heroRef} className="relative flex items-center overflow-hidden" style={{minHeight:'100vh'}}>
        <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:0}}/>
        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{background:'linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 100%)',zIndex:1}}/>
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{background:'linear-gradient(to bottom,rgba(0,0,0,0.45) 0%,transparent 100%)',zIndex:1}}/>

        {/* click hint */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2.2,duration:1}}
          className="absolute top-6 right-8 z-10 text-white/40 text-[10px] uppercase tracking-widest font-bold pointer-events-none flex items-center gap-2">
          <motion.span animate={{scale:[1,1.3,1]}} transition={{duration:2,repeat:Infinity}}>✦</motion.span>
          {hero.clickHint}
        </motion.div>

        <motion.div style={{y:springTxt,opacity:heroOpacity,willChange:'transform'}}
          className="absolute bottom-20 left-8 md:left-20 z-10 max-w-2xl px-4">
          <motion.p initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{duration:0.6,delay:0.1}}
            className="text-[10px] uppercase tracking-[0.32em] font-bold text-white/60 mb-5 flex items-center gap-3">
            <span className="w-10 h-px bg-brand-olive inline-block"/>{hero.eyebrow}
          </motion.p>
          <h1 className="font-serif text-white" style={{fontSize:'clamp(3rem,7vw,6rem)',lineHeight:1.08}}>
            {[hero.titleLine1,hero.titleLine2].map((word,i)=>(
              <motion.span key={word} initial={{rotateX:-90,opacity:0,y:40}} animate={{rotateX:0,opacity:1,y:0}}
                transition={{duration:0.7,delay:0.25+i*0.15,ease:EASE}}
                style={{display:'block',transformOrigin:'bottom center',transformStyle:'preserve-3d'}}>
                {word}
              </motion.span>
            ))}
            <motion.span initial={{rotateX:-90,opacity:0,y:40}} animate={{rotateX:0,opacity:1,y:0}}
              transition={{duration:0.7,delay:0.55,ease:EASE}}
              style={{display:'block',transformOrigin:'bottom center',transformStyle:'preserve-3d',fontStyle:'italic',fontWeight:400}}>
              {hero.titleHighlight}
            </motion.span>
          </h1>
          <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.65,delay:0.8}}
            className="text-white/80 mt-6 max-w-md text-lg font-light leading-relaxed">
            {hero.intro}
          </motion.p>
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.55,delay:1.05}}
            className="flex gap-4 mt-10 flex-wrap">
            <motion.button whileHover={{scale:1.05,y:-2,boxShadow:'0 12px 32px rgba(20,83,45,0.4)'}}
              whileTap={{scale:0.96}} transition={{type:'spring',stiffness:300,damping:18}}
              className="bg-emerald-900 text-white px-9 py-4 rounded-full font-bold uppercase tracking-widest text-xs flex items-center gap-2">
              {hero.primaryButton} <ArrowRight size={13}/>
            </motion.button>
            <motion.button whileHover={{scale:1.04,y:-2}} whileTap={{scale:0.96}}
              transition={{type:'spring',stiffness:300,damping:18}}
              onClick={()=>window.location.href='/contact'}
              className="border border-white/40 text-white px-9 py-4 rounded-full font-bold uppercase tracking-widest text-xs backdrop-blur-sm"
              style={{background:'rgba(255,255,255,0.08)'}}>
              {hero.secondaryButton}
            </motion.button>
          </motion.div>
        </motion.div>

        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.8,duration:0.8}}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold">{hero.scrollLabel}</span>
          <motion.div animate={{y:[0,8,0]}} transition={{duration:1.5,repeat:Infinity,ease:'easeInOut'}}
            style={{width:1,height:28,background:'linear-gradient(to bottom,rgba(181,162,106,0.85),transparent)'}}/>
        </motion.div>
      </section>

      {/* ══ ABOUT ══ */}
      <section ref={aboutRef} className="py-32 px-8 md:px-20 lg:px-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vStagger} initial="hidden" animate={aboutInView?'show':'hidden'}>
            <motion.div variants={vFadeUp}>
              <motion.div initial={{scaleX:0}} animate={aboutInView?{scaleX:1}:{scaleX:0}}
                transition={{duration:0.55,ease:EASE}} style={{originX:0}} className="w-20 h-1 bg-brand-olive mb-6"/>
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-emerald-800 mb-4">{about.eyebrow}</p>
            </motion.div>
            <motion.h2 variants={vFadeUp} className="text-5xl font-serif leading-tight mb-7">{about.titleLine1}<br/>{about.titleLine2}</motion.h2>
            <motion.p variants={vFadeUp} className="text-gray-600 text-lg leading-relaxed mb-6">
              {about.paragraph}
            </motion.p>
            <motion.blockquote variants={vFadeUp} className="font-serif text-lg text-gray-600 italic leading-relaxed border-l-2 border-emerald-700 pl-6 py-2">
              "{about.quote}"
            </motion.blockquote>
          </motion.div>
          <motion.div initial={{opacity:0,scale:0.85}} animate={aboutInView?{opacity:1,scale:1}:{opacity:0,scale:0.85}}
            transition={{duration:0.85,ease:EASE}} style={{perspective:'1200px',position:'relative'}}>
            <motion.div ref={aboutTiltRef} onMouseMove={atMM} onMouseLeave={atML}
              style={{rotateX:atX,rotateY:atY,transformStyle:'preserve-3d',willChange:'transform',position:'relative'}}>
              <motion.div className="absolute rounded-2xl"
                style={{inset:-16,background:'#dcfce7',transform:'rotate(-2deg)',zIndex:0}}
                whileHover={{rotate:0} as any}/>
              <div className="overflow-hidden rounded-2xl relative z-10">
                <img src={about.image ? asset(about.image) : siteImage(about.photoId)}
                  alt={about.imageAlt} className="w-full shadow-2xl" style={{aspectRatio:'4/3',objectFit:'cover',borderRadius:16}}/>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ CATEGORIES ══ */}
      <section ref={catRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{background:'#f5f5f4'}}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{opacity:0,y:30}} animate={catInView?{opacity:1,y:0}:{opacity:0,y:30}}
            transition={{duration:0.6}} className="text-center mb-14">
            <h2 className="text-5xl font-serif mb-5">{categories.title}</h2>
            <motion.div initial={{scaleX:0}} animate={catInView?{scaleX:1}:{scaleX:0}}
              transition={{duration:0.55,delay:0.2,ease:EASE}}
              className="h-[2px] w-20 bg-emerald-700 mx-auto" style={{originX:0.5}}/>
          </motion.div>
          <motion.div variants={vStagger} initial="hidden" animate={catInView?'show':'hidden'}
            className="grid grid-cols-1 md:grid-cols-3 gap-7" style={{perspective:'1600px'}}>
            {CATEGORIES.map((item,i)=><CategoryCard key={item.name} item={item} index={i}/>)}
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURED ══ */}
      <section ref={prodRef} className="py-32 px-8 md:px-20 lg:px-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{opacity:0,y:24}} animate={prodInView?{opacity:1,y:0}:{opacity:0,y:24}}
            transition={{duration:0.6}} className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-5xl font-serif mb-2">{featured.title}</h2>
              <p className="text-gray-500">{featured.intro}</p>
            </div>
            <motion.a whileHover={{y:-1}} className="font-bold text-xs uppercase tracking-widest border-b-2 border-brand-olive pb-1 cursor-pointer">{featured.viewAllText}</motion.a>
          </motion.div>
          <div className="flex gap-6 overflow-x-auto pb-4"
            style={{scrollSnapType:'x mandatory',msOverflowStyle:'none',scrollbarWidth:'none'}}>
            {FEATURED.map((p,i)=><FeaturedCard key={p.name} p={p} i={i}/>)}
          </div>
        </div>
      </section>

      {/* ══ CUSTOMIZATION ══ */}
      <section ref={custRef} className="py-32 px-8 md:px-20 lg:px-32" style={{background:'#052e16'}}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{opacity:0,y:24}} animate={custInView?{opacity:1,y:0}:{opacity:0,y:24}}
            transition={{duration:0.6}} className="text-center mb-16">
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-brand-olive/80 mb-4">{customization.eyebrow}</p>
            <h2 className="text-5xl font-serif text-white">{customization.title}</h2>
          </motion.div>
          <motion.div variants={vStagger} initial="hidden" animate={custInView?'show':'hidden'}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            {CUSTOM_ITEMS.map(item=>(
              <motion.div key={item.title} variants={vFadeUp}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl border"
                  style={{background:'rgba(255,255,255,0.08)',borderColor:'rgba(255,255,255,0.18)'}}>
                  {item.icon}
                </div>
                <h3 className="font-serif text-xl text-white mb-3">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ WHY US ══ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}}
            viewport={{once:false,amount:0.4}} transition={{duration:0.6}} className="mb-14">
            <motion.div initial={{scaleX:0}} whileInView={{scaleX:1}}
              viewport={{once:false,amount:0.4}} transition={{duration:0.55,ease:EASE}}
              style={{originX:0}} className="w-20 h-1 bg-brand-olive mb-5"/>
            <h2 className="text-5xl font-serif">{why.title}</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY.map((item,i)=><WhyCard key={item.title} item={item} index={i}/>)}
          </div>
        </div>
      </section>

      {/* ══ TRUST: clients and a testimonial from the admin panel ══ */}
      {clients.length > 0 && (
      <section ref={trustRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{background:'#f5f5f4'}}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={vSlideLeft} initial="hidden" animate={trustInView?'show':'hidden'}>
            <h2 className="text-4xl font-serif mb-10">{trust.title}</h2>
            <div className="flex flex-wrap gap-6 opacity-50">
              {clients.map(c => c.logo
                ? <img key={c.name} src={c.logo} alt={c.name} style={{height:32,objectFit:'contain'}}/>
                : <span key={c.name} className="font-bold text-base text-gray-800 tracking-widest">{c.name}</span>)}
            </div>
          </motion.div>
          {testimonials[0] && (
          <motion.div variants={vSlideRight} initial="hidden" animate={trustInView?'show':'hidden'}
            whileHover={{y:-4,boxShadow:'0 24px 60px rgba(0,0,0,0.12)'}}
            className="bg-white p-8 rounded-2xl shadow-xl" style={{borderTop:'4px solid #166534',willChange:'transform'}}>
            <div className="text-yellow-400 mb-4 text-xl">{trust.ratingSymbol}</div>
            <p className="font-serif text-gray-600 italic leading-relaxed mb-6 text-[15px]">
              "{testimonials[0].quote}"
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">{trust.avatarSymbol}</div>
              <div>
                <p className="font-bold text-sm">{testimonials[0].name}</p>
                <p className="text-gray-400 text-xs">{[testimonials[0].role, testimonials[0].company].filter(Boolean).join(', ')}</p>
              </div>
            </div>
          </motion.div>
          )}
        </div>
      </section>
      )}

      {/* ══ CTA ══ */}
      <section ref={ctaRef} className="py-32 px-8 relative overflow-hidden text-center">
        <div className="absolute inset-0" style={{background:'#14532d'}}>
          {(cta.backgroundImage || hasSiteImage(cta.photoId)) && <img src={cta.backgroundImage ? asset(cta.backgroundImage) : siteImage(cta.photoId)}
            alt="" className="w-full h-full object-cover" style={{opacity:0.18,mixBlendMode:'overlay'}}/>}
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-white">
          <motion.h2 initial={{opacity:0,letterSpacing:'-0.05em',y:20}}
            animate={ctaInView?{opacity:1,letterSpacing:'-0.01em',y:0}:{opacity:0,letterSpacing:'-0.05em',y:20}}
            transition={{duration:0.85,ease:EASE}} className="font-serif text-5xl md:text-7xl mb-8 leading-tight">
            {cta.titleLine1}<br/>{cta.titleLine2} <span className="italic font-normal">{cta.titleHighlight}</span><br/>{cta.titleEnd}
          </motion.h2>
          <motion.p initial={{opacity:0,y:16}} animate={ctaInView?{opacity:1,y:0}:{opacity:0,y:16}}
            transition={{duration:0.6,delay:0.15}} className="text-emerald-100 text-xl mb-12 max-w-xl mx-auto leading-relaxed">
            {cta.intro}
          </motion.p>
          <motion.div initial={{opacity:0,y:16}} animate={ctaInView?{opacity:1,y:0}:{opacity:0,y:16}}
            transition={{duration:0.6,delay:0.28}} className="flex flex-col sm:flex-row justify-center gap-6">
            <motion.button whileHover={{scale:1.06,y:-3,boxShadow:'0 18px 40px rgba(0,0,0,0.25)'}}
              whileTap={{scale:0.96}} transition={{type:'spring',stiffness:300,damping:18}}
              className="bg-white text-emerald-950 px-14 py-6 rounded-full font-bold text-lg shadow-xl">
              {cta.primaryButton}
            </motion.button>
            <motion.button whileHover={{y:-2}} transition={{type:'spring',stiffness:400,damping:20}}
              className="border-b-2 border-white/30 hover:border-white text-white text-sm font-bold uppercase tracking-[0.2em] pb-1 transition-colors">
              {cta.secondaryButton}
            </motion.button>
          </motion.div>
        </div>
      </section>

    </div>
  );
}