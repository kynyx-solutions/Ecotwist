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
import { ArrowRight } from 'lucide-react';
import { asset } from '../lib/content';
import content from '../content/pages/employee-wellness.json';

// Page words and photos: src/content/pages/employee-wellness.json (admin → Pages → Employee Wellness)
const { hero, about, categories, products, customization, why, trust, cta } = content;

/* ─────────────────────────────────────────────
   WELLNESS CANVAS HOOK
   Theme: soft greens, teals, lavender, gold
   Elements: breathing orbs, leaf particles,
   neuron mesh, ripple clicks, floating motes
───────────────────────────────────────────── */
function useWellnessCanvas(
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
    let frame = 0, time = 0;

    /* ── click effects ── */
    interface Ripple { x:number;y:number;r:number;maxR:number;life:number;hue:number; }
    interface Bloom  { x:number;y:number;petals:number;r:number;life:number;hue:number;rot:number; }
    interface Well   { x:number;y:number;life:number;hue:number;strength:number; }
    const RIPPLES:Ripple[] = [], BLOOMS:Bloom[] = [], WELLS:Well[] = [];

    function resize() {
      W = canvas!.width  = container!.offsetWidth;
      H = canvas!.height = container!.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      const r = container!.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    };
    const onMouseLeave = () => { mx = -9999; my = -9999; };
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    const onClick = (e: MouseEvent) => {
      const r  = container!.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const hue = WELL_HUES[Math.floor(Math.random() * WELL_HUES.length)];
      /* ripple rings */
      for (let i = 0; i < 5; i++)
        RIPPLES.push({ x:cx, y:cy, r:i*16, maxR:200+i*50, life:1, hue });
      /* flower bloom */
      BLOOMS.push({ x:cx, y:cy, petals:8+Math.floor(Math.random()*6),
        r:0, life:1, hue, rot:Math.random()*Math.PI });
      /* gravity well */
      WELLS.push({ x:cx, y:cy, life:1, hue, strength:2.8 });
      /* excite nearby nodes */
      NODES.forEach(n => {
        const d = Math.hypot(n.x-cx, n.y-cy);
        if (d < 220) { n.excited = Math.min(1, n.excited+(1-d/220)); spawnPulse(NODES.indexOf(n)); }
      });
      /* burst motes */
      for (let i = 0; i < 14; i++) spawnMote(cx, cy);
    };
    container.addEventListener('click', onClick);

    /* ── palette: calm wellness greens / teals / lavender / gold ── */
    const WELL_HUES = [150, 160, 170, 185, 200, 260, 280, 45, 55];
    const randH = () => WELL_HUES[Math.floor(Math.random() * WELL_HUES.length)];

    /* ══════════════════════════════
       NEURON / ORB NETWORK
    ══════════════════════════════ */
    interface Node {
      x:number;y:number;vx:number;vy:number;
      ox:number;oy:number;
      hue:number;r:number;
      pulse:number;pulseSpd:number;
      excited:number;
      breathPhase:number;
    }
    interface Pulse { fromIdx:number;toIdx:number;t:number;spd:number;hue:number;size:number; }

    const NODE_COUNT = 75;
    const NODES: Node[] = [];
    const PULSES: Pulse[] = [];
    let pulseTimer = 0;

    function initNodes() {
      NODES.length = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        const x = Math.random() * (W || 800);
        const y = Math.random() * (H || 600);
        NODES.push({
          x, y, ox:x, oy:y,
          vx:(Math.random()-0.5)*0.3,
          vy:(Math.random()-0.5)*0.3,
          hue: randH(),
          r: 2 + Math.random() * 2.5,
          pulse: Math.random()*Math.PI*2,
          pulseSpd: 0.018 + Math.random()*0.025,
          excited: 0,
          breathPhase: Math.random()*Math.PI*2,
        });
      }
    }
    initNodes();

    function spawnPulse(fromIdx?: number) {
      const fi = fromIdx ?? Math.floor(Math.random() * NODES.length);
      let best = -1, bestD = 999999;
      for (let j = 0; j < NODES.length; j++) {
        if (j === fi) continue;
        const d = Math.hypot(NODES[fi].x-NODES[j].x, NODES[fi].y-NODES[j].y);
        if (d < 160 && d < bestD && Math.random() > 0.3) { best=j; bestD=d; }
      }
      if (best === -1) return;
      PULSES.push({ fromIdx:fi, toIdx:best, t:0,
        spd: 0.008+Math.random()*0.014,
        hue: NODES[fi].hue, size: 2+Math.random()*2 });
    }

    function updateDrawNetwork() {
      const LINK = 135;

      NODES.forEach(n => {
        n.pulse      += n.pulseSpd;
        n.breathPhase+= 0.008;
        n.excited     = Math.max(0, n.excited - 0.015);

        /* gentle home drift */
        n.vx += (n.ox - n.x) * 0.0003;
        n.vy += (n.oy - n.y) * 0.0003;

        /* mouse repulsion — soft */
        if (mx > -999) {
          const dx=n.x-mx, dy=n.y-my, d=Math.hypot(dx,dy);
          if (d < 160 && d > 0) {
            n.vx += (dx/d)*(160-d)*0.008;
            n.vy += (dy/d)*(160-d)*0.008;
          }
        }

        /* gravity wells attract */
        WELLS.forEach(w => {
          const dx=w.x-n.x, dy=w.y-n.y, d=Math.hypot(dx,dy);
          if (d < 220 && d > 0) {
            n.vx += (dx/d)*w.strength*w.life*0.4;
            n.vy += (dy/d)*w.strength*w.life*0.4;
          }
        });

        n.vx *= 0.93; n.vy *= 0.93;
        n.x  += n.vx;  n.y  += n.vy;

        /* soft boundary */
        if (n.x < 0)  { n.x=0;  n.vx*=-0.4; }
        if (n.x > W)  { n.x=W;  n.vx*=-0.4; }
        if (n.y < 0)  { n.y=0;  n.vy*=-0.4; }
        if (n.y > H)  { n.y=H;  n.vy*=-0.4; }
      });

      /* links — gradient "living wire" */
      for (let i = 0; i < NODES.length; i++) {
        for (let j = i+1; j < NODES.length; j++) {
          const a=NODES[i], b=NODES[j];
          const d=Math.hypot(a.x-b.x, a.y-b.y);
          if (d < LINK) {
            const base  = (1-d/LINK)*0.32 + (a.excited+b.excited)*0.18;
            const grad  = ctx!.createLinearGradient(a.x,a.y,b.x,b.y);
            grad.addColorStop(0, `hsla(${a.hue},70%,65%,${base})`);
            grad.addColorStop(1, `hsla(${b.hue},70%,65%,${base})`);
            ctx!.beginPath();
            ctx!.moveTo(a.x,a.y); ctx!.lineTo(b.x,b.y);
            ctx!.strokeStyle = grad;
            ctx!.lineWidth   = 0.75 + (a.excited+b.excited)*0.6;
            ctx!.stroke();
          }
        }
      }

      /* travelling pulses */
      for (let i = PULSES.length-1; i >= 0; i--) {
        const p = PULSES[i];
        p.t += p.spd;
        if (p.t >= 1) {
          NODES[p.toIdx].excited = 1;
          if (Math.random() > 0.28) spawnPulse(p.toIdx);
          PULSES.splice(i,1); continue;
        }
        const a=NODES[p.fromIdx], b=NODES[p.toIdx];
        const px=a.x+(b.x-a.x)*p.t, py=a.y+(b.y-a.y)*p.t;

        const grd=ctx!.createRadialGradient(px,py,0,px,py,p.size*6);
        grd.addColorStop(0,`hsla(${p.hue},90%,88%,0.75)`);
        grd.addColorStop(1,`hsla(${p.hue},80%,60%,0)`);
        ctx!.beginPath(); ctx!.arc(px,py,p.size*6,0,Math.PI*2);
        ctx!.fillStyle=grd; ctx!.fill();

        ctx!.beginPath(); ctx!.arc(px,py,p.size,0,Math.PI*2);
        ctx!.fillStyle=`hsla(${p.hue},100%,92%,0.95)`; ctx!.fill();
      }

      /* nodes — breathing glow */
      NODES.forEach(n => {
        const breath = 1 + Math.sin(n.breathPhase)*0.35;
        const pr     = n.r * breath + n.excited*2.5;

        const grd=ctx!.createRadialGradient(n.x,n.y,0,n.x,n.y,pr*6);
        const base = 0.25 + n.excited*0.55 + Math.sin(n.pulse)*0.08;
        grd.addColorStop(0,`hsla(${n.hue},80%,82%,${base+0.25})`);
        grd.addColorStop(0.4,`hsla(${n.hue},70%,60%,${base*0.4})`);
        grd.addColorStop(1,`hsla(${n.hue},60%,50%,0)`);
        ctx!.beginPath(); ctx!.arc(n.x,n.y,pr*6,0,Math.PI*2);
        ctx!.fillStyle=grd; ctx!.fill();

        ctx!.beginPath(); ctx!.arc(n.x,n.y,pr,0,Math.PI*2);
        ctx!.fillStyle=`hsl(${n.hue},75%,${75+n.excited*18}%)`;
        ctx!.fill();
      });

      /* auto pulse */
      pulseTimer++;
      if (pulseTimer > 10) { pulseTimer=0; spawnPulse(); }
    }

    /* ══════════════════════════════
       BREATHING ORBS  (large slow)
    ══════════════════════════════ */
    interface Orb {
      x:number;y:number;baseR:number;
      breathPhase:number;breathSpd:number;breathAmp:number;
      hue:number;opacity:number;
      drift:number;driftSpd:number;
    }
    const ORBS: Orb[] = Array.from({length:6},(_,i)=>({
      x: (W||800)*((i+0.5)/6) + (Math.random()-0.5)*60,
      y: (H||600)*(0.2+Math.random()*0.6),
      baseR: 60+Math.random()*80,
      breathPhase: Math.random()*Math.PI*2,
      breathSpd: 0.006+Math.random()*0.006,
      breathAmp: 0.18+Math.random()*0.12,
      hue: [150,170,185,200,260,45][i],
      opacity: 0.04+Math.random()*0.05,
      drift: Math.random()*Math.PI*2,
      driftSpd: 0.003+Math.random()*0.004,
    }));

    function drawBreathingOrbs() {
      ORBS.forEach(o => {
        o.breathPhase += o.breathSpd;
        o.drift       += o.driftSpd;
        const r = o.baseR*(1+Math.sin(o.breathPhase)*o.breathAmp);
        const dx = Math.cos(o.drift)*18, dy = Math.sin(o.drift)*12;

        const grd=ctx!.createRadialGradient(o.x+dx,o.y+dy,0,o.x+dx,o.y+dy,r);
        grd.addColorStop(0,`hsla(${o.hue},60%,75%,${o.opacity*2})`);
        grd.addColorStop(0.5,`hsla(${o.hue},55%,65%,${o.opacity})`);
        grd.addColorStop(1,`hsla(${o.hue},50%,55%,0)`);
        ctx!.beginPath(); ctx!.arc(o.x+dx,o.y+dy,r,0,Math.PI*2);
        ctx!.fillStyle=grd; ctx!.fill();
      });
    }

    /* ══════════════════════════════
       LEAF / PETAL MOTES
    ══════════════════════════════ */
    interface Mote {
      x:number;y:number;vx:number;vy:number;
      rot:number;rotSpd:number;size:number;
      hue:number;alpha:number;wobble:number;wobbleSpd:number;
      type:number; /* 0=leaf 1=petal 2=circle */
      trail:{x:number,y:number}[];
    }
    const MOTES: Mote[] = [];

    function spawnMote(ex?:number,ey?:number) {
      const fromClick = ex !== undefined;
      const angle = fromClick ? Math.random()*Math.PI*2 : -Math.PI/2+(Math.random()-0.5)*0.8;
      const spd   = fromClick ? 1.5+Math.random()*2.5 : 0.4+Math.random()*0.8;
      MOTES.push({
        x: ex??Math.random()*W,
        y: ey??H+10,
        vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd,
        rot: Math.random()*Math.PI*2, rotSpd:(Math.random()-0.5)*0.06,
        size: fromClick ? 4+Math.random()*7 : 5+Math.random()*9,
        hue: randH(), alpha: 0.45+Math.random()*0.4,
        wobble: Math.random()*Math.PI*2, wobbleSpd:0.03+Math.random()*0.04,
        type: Math.floor(Math.random()*3),
        trail:[],
      });
    }

    function drawLeaf(size:number) {
      ctx!.beginPath();
      ctx!.moveTo(0,-size);
      ctx!.bezierCurveTo(size*0.8,-size*0.5, size*0.8,size*0.5, 0,size);
      ctx!.bezierCurveTo(-size*0.8,size*0.5, -size*0.8,-size*0.5, 0,-size);
      ctx!.closePath();
    }
    function drawPetal(size:number) {
      ctx!.beginPath();
      ctx!.moveTo(0,-size);
      ctx!.bezierCurveTo(size*0.5,-size*0.3, size*0.3,size*0.5, 0,size*0.6);
      ctx!.bezierCurveTo(-size*0.3,size*0.5, -size*0.5,-size*0.3, 0,-size);
      ctx!.closePath();
    }

    function updateDrawMotes() {
      for (let i=MOTES.length-1;i>=0;i--) {
        const m=MOTES[i];
        m.wobble  += m.wobbleSpd;
        m.x       += m.vx+Math.sin(m.wobble)*0.5;
        m.y       += m.vy;
        m.vy      -= 0.012;
        m.rot     += m.rotSpd;
        m.alpha   -= 0.004;

        if (m.alpha<=0||m.y<-30) { MOTES.splice(i,1); continue; }
        if (m.x<-20) m.x=W+20;
        if (m.x>W+20) m.x=-20;

        m.trail.push({x:m.x,y:m.y});
        if (m.trail.length>8) m.trail.shift();

        /* faint trail */
        for (let t=0;t<m.trail.length-1;t++) {
          const prog=t/m.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(m.trail[t].x,m.trail[t].y);
          ctx!.lineTo(m.trail[t+1].x,m.trail[t+1].y);
          ctx!.strokeStyle=`hsla(${m.hue},70%,70%,${prog*m.alpha*0.4})`;
          ctx!.lineWidth=m.size*prog*0.4; ctx!.stroke();
        }

        ctx!.save();
        ctx!.translate(m.x,m.y); ctx!.rotate(m.rot);
        ctx!.globalAlpha=m.alpha;
        ctx!.fillStyle=`hsl(${m.hue},65%,68%)`;

        if (m.type===0) drawLeaf(m.size);
        else if (m.type===1) drawPetal(m.size);
        else { ctx!.beginPath(); ctx!.arc(0,0,m.size*0.55,0,Math.PI*2); }
        ctx!.fill();

        /* midrib for leaf */
        if (m.type===0) {
          ctx!.beginPath(); ctx!.moveTo(0,-m.size); ctx!.lineTo(0,m.size);
          ctx!.strokeStyle=`hsla(${m.hue},50%,45%,${m.alpha*0.5})`;
          ctx!.lineWidth=0.7; ctx!.stroke();
        }
        ctx!.restore();
      }
    }

    /* ══════════════════════════════
       AMBIENT STAR FIELD (subtle)
    ══════════════════════════════ */
    interface Star { x:number;y:number;r:number;phase:number;spd:number;hue:number; }
    const STARS:Star[] = Array.from({length:120},()=>({
      x:Math.random()*(W||800), y:Math.random()*(H||600),
      r:0.3+Math.random()*1, phase:Math.random()*Math.PI*2,
      spd:0.015+Math.random()*0.025, hue:150+Math.random()*120,
    }));

    function drawStars() {
      STARS.forEach(s => {
        s.phase += s.spd;
        const a = 0.15+Math.sin(s.phase)*0.2;
        ctx!.beginPath(); ctx!.arc(s.x%W,s.y%H,s.r,0,Math.PI*2);
        ctx!.fillStyle=`hsla(${s.hue},60%,85%,${a})`; ctx!.fill();
      });
    }

    /* ══════════════════════════════
       SLOW AURORA WAVES
    ══════════════════════════════ */
    const AURORA=[
      {hue:150,y:0.22,amp:0.07,spd:0.0005,phase:0},
      {hue:185,y:0.50,amp:0.06,spd:0.0007,phase:2.1},
      {hue:260,y:0.72,amp:0.05,spd:0.0004,phase:4.2},
      {hue:45, y:0.38,amp:0.04,spd:0.0009,phase:1.0},
    ];
    function drawAurora() {
      AURORA.forEach(b=>{
        const yc=H*(b.y+Math.sin(time*b.spd+b.phase)*b.amp);
        const g=ctx!.createLinearGradient(0,yc-100,0,yc+100);
        g.addColorStop(0,  `hsla(${b.hue},65%,55%,0)`);
        g.addColorStop(0.4,`hsla(${b.hue},70%,65%,0.055)`);
        g.addColorStop(0.5,`hsla(${b.hue},75%,70%,0.10)`);
        g.addColorStop(0.6,`hsla(${b.hue},70%,65%,0.055)`);
        g.addColorStop(1,  `hsla(${b.hue},65%,55%,0)`);
        ctx!.fillStyle=g; ctx!.fillRect(0,yc-100,W,200);
      });
    }

    /* ══════════════════════════════
       CLICK EFFECTS
    ══════════════════════════════ */
    function updateDrawRipples() {
      for (let i=RIPPLES.length-1;i>=0;i--) {
        const rp=RIPPLES[i];
        rp.r   +=(rp.maxR-rp.r)*0.055+1.2;
        rp.life-=0.016;
        if (rp.life<=0){RIPPLES.splice(i,1);continue;}
        ctx!.beginPath(); ctx!.arc(rp.x,rp.y,rp.r,0,Math.PI*2);
        ctx!.strokeStyle=`hsla(${rp.hue},70%,72%,${rp.life*0.45})`;
        ctx!.lineWidth=1.8*rp.life; ctx!.stroke();
      }
    }

    function updateDrawBlooms() {
      for (let i=BLOOMS.length-1;i>=0;i--) {
        const bl=BLOOMS[i];
        bl.r   +=(80-bl.r)*0.07;
        bl.life-=0.012;
        if (bl.life<=0){BLOOMS.splice(i,1);continue;}
        ctx!.save();
        ctx!.translate(bl.x,bl.y);
        ctx!.globalAlpha=bl.life*0.55;
        for (let p=0;p<bl.petals;p++) {
          const angle=(p/bl.petals)*Math.PI*2+bl.rot+time*0.0008;
          const px=Math.cos(angle)*bl.r, py=Math.sin(angle)*bl.r;
          const grd=ctx!.createRadialGradient(px,py,0,px,py,12);
          grd.addColorStop(0,`hsla(${bl.hue},80%,82%,0.9)`);
          grd.addColorStop(1,`hsla(${bl.hue},70%,65%,0)`);
          ctx!.beginPath(); ctx!.arc(px,py,12,0,Math.PI*2);
          ctx!.fillStyle=grd; ctx!.fill();
        }
        /* centre */
        const cg=ctx!.createRadialGradient(0,0,0,0,0,8);
        cg.addColorStop(0,`hsla(${bl.hue+30},90%,90%,0.95)`);
        cg.addColorStop(1,`hsla(${bl.hue},70%,65%,0)`);
        ctx!.beginPath(); ctx!.arc(0,0,8,0,Math.PI*2);
        ctx!.fillStyle=cg; ctx!.fill();
        ctx!.restore();
      }
    }

    function updateDrawWells() {
      for (let i=WELLS.length-1;i>=0;i--) {
        const w=WELLS[i];
        w.life-=0.006;
        if (w.life<=0){WELLS.splice(i,1);continue;}
        const grd=ctx!.createRadialGradient(w.x,w.y,0,w.x,w.y,80*w.life);
        grd.addColorStop(0,`hsla(${w.hue},70%,78%,${w.life*0.1})`);
        grd.addColorStop(1,`hsla(${w.hue},60%,65%,0)`);
        ctx!.beginPath(); ctx!.arc(w.x,w.y,80*w.life,0,Math.PI*2);
        ctx!.fillStyle=grd; ctx!.fill();
      }
    }

    /* ══════════════════════════════
       MAIN LOOP
    ══════════════════════════════ */
    let moteTimer=0;

    function loop() {
      frame++; time++;
      ctx!.clearRect(0,0,W,H);

      /* ── wellness dark-but-warm background ── */
      const bg=ctx!.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,   '#050e08');
      bg.addColorStop(0.4, '#060d0e');
      bg.addColorStop(0.75,'#070a10');
      bg.addColorStop(1,   '#050d07');
      ctx!.fillStyle=bg; ctx!.fillRect(0,0,W,H);

      /* soft green centre glow */
      const cg=ctx!.createRadialGradient(W/2,H*0.5,0,W/2,H*0.5,Math.max(W,H)*0.65);
      cg.addColorStop(0,  'rgba(30,65,40,0.28)');
      cg.addColorStop(0.5,'rgba(10,30,20,0.12)');
      cg.addColorStop(1,  'rgba(0,0,0,0)');
      ctx!.fillStyle=cg; ctx!.fillRect(0,0,W,H);

      /* layers */
      drawStars();
      drawAurora();
      drawBreathingOrbs();
      updateDrawNetwork();      /* neuron mesh + pulses */
      updateDrawMotes();
      updateDrawWells();
      updateDrawBlooms();
      updateDrawRipples();

      /* spawn ambient motes */
      moteTimer++;
      if (moteTimer>18){moteTimer=0;spawnMote();}

      /* mouse-proximity mote */
      if (mx>-999&&frame%45===0) spawnMote(mx+(Math.random()-0.5)*40,my+(Math.random()-0.5)*40);

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
  const onMouseLeave = useCallback(() => { rotateX.set(0); rotateY.set(0); }, [rotateX, rotateY]);
  return { ref, springX, springY, onMouseMove, onMouseLeave };
}

/* ─────────────────────────────────────────────
   VARIANTS
───────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const vFadeUp: Variants = {
  hidden: { opacity: 0, y: 44 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};
const vStagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.13 } },
};
const vScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.6, rotateX: -55 },
  show:   { opacity: 1, scale: 1,   rotateX: 0, transition: { duration: 0.95, ease: EASE } },
};
const vSlideLeft: Variants = {
  hidden: { opacity: 0, x: -48 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};
const vSlideRight: Variants = {
  hidden: { opacity: 0, x: 48 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const PRODUCTS = products.items.map(p => ({ name: p.name, sub: p.price, tag: p.tag, img: asset(p.image) }));
const CATEGORIES = categories.items.map(c => ({ name: c.name, desc: c.desc, accent: c.accent, tag: c.tag, img: asset(c.image) }));
const CUSTOM_ITEMS = customization.items.map(i => ({ icon: i.symbol, title: i.title, desc: i.desc }));
const WHY = why.items.map(i => ({ icon: i.symbol, title: i.title, desc: i.desc }));
/* ─────────────────────────────────────────────
   CATEGORY CARD
───────────────────────────────────────────── */
function CategoryCard({ item, index }: { item: typeof CATEGORIES[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { ref, springX, springY, onMouseMove, onMouseLeave } = useTilt(12);
  return (
    <motion.div variants={vScaleIn} style={{ perspective:'1400px', transformStyle:'preserve-3d' }} className="cursor-pointer">
      <motion.div ref={ref} onMouseMove={onMouseMove}
        onMouseLeave={()=>{onMouseLeave();setHovered(false);}} onMouseEnter={()=>setHovered(true)}
        style={{ rotateX:springX, rotateY:springY, transformStyle:'preserve-3d', willChange:'transform',
          boxShadow:hovered?'0 20px 50px rgba(0,0,0,0.12)':'0 2px 10px rgba(0,0,0,0.06)',
          transition:'box-shadow 0.4s', borderRadius:16, overflow:'hidden', background:'white' }}>
        <div style={{ height:280, overflow:'hidden', position:'relative' }}>
          <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover"
            animate={{ scale:hovered?1.07:1 }} transition={{ duration:0.75, ease:EASE }} style={{ willChange:'transform' }}/>
          <motion.div className="absolute inset-0 pointer-events-none" style={{ backgroundColor:item.accent }}
            animate={{ opacity:hovered?0.16:0 }} transition={{ duration:0.4 }}/>
          <motion.span animate={{ y:hovered?0:-24, opacity:hovered?1:0 }}
            transition={{ type:'spring', stiffness:320, damping:22 }}
            className="absolute top-4 left-4 text-[9px] uppercase tracking-[0.18em] font-bold text-white px-3 py-1 rounded-sm"
            style={{ backgroundColor:item.accent }}>{item.tag}</motion.span>
        </div>
        <div className="p-7 relative overflow-hidden">
          <motion.div className="absolute bottom-0 left-0 h-[3px]" style={{ backgroundColor:item.accent }}
            animate={{ width:hovered?'100%':'0%' }} transition={{ duration:0.45, ease:EASE }}/>
          <h3 className="font-serif text-2xl mb-2" style={{ color:'#2d4337' }}>{item.name}</h3>
          <p className="text-sm font-light leading-relaxed mb-5" style={{ color:'#73736e' }}>{item.desc}</p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color:'#2d4337' }}>
            <motion.span animate={{ x:hovered?3:0 }} transition={{ type:'spring', stiffness:400, damping:20 }}>{categories.linkText}</motion.span>
            <motion.span animate={{ rotate:hovered?45:0, x:hovered?2:0 }}
              transition={{ type:'spring', stiffness:380, damping:18 }} style={{ display:'inline-flex' }}>
              <ArrowRight size={11}/>
            </motion.span>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow:'inset 0 0 0 1px rgba(0,0,0,0.06)', borderRadius:16 }}/>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   PRODUCT CARD
───────────────────────────────────────────── */
function ProductCard({ item, index }: { item: typeof PRODUCTS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:false, amount:0.2 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div ref={ref} initial={{ opacity:0, y:44 }}
      animate={inView?{opacity:1,y:0}:{opacity:0,y:44}}
      transition={{ duration:0.7, delay:index*0.12, ease:EASE }}
      onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)}
      className="flex-shrink-0 cursor-pointer" style={{ minWidth:380, scrollSnapAlign:'start' }}>
      <div className="relative overflow-hidden mb-4" style={{ aspectRatio:'1', borderRadius:16 }}>
        <div className="relative overflow-hidden mb-1 h-[360px] rounded-2xl">
          <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover"
            animate={{ scale:hovered?1.06:1 }} transition={{ duration:0.65, ease:EASE }}/>
        </div>
        <span className="absolute top-4 left-4 text-[10px] font-bold uppercase text-white px-4 py-1 rounded-full"
          style={{ background:'rgba(45,67,55,0.82)', backdropFilter:'blur(6px)', letterSpacing:2 }}>
          {item.tag}
        </span>
      </div>
      <h4 className="font-serif text-xl mb-1" style={{ color:'#121b16' }}>{item.name}</h4>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   WHY CARD
───────────────────────────────────────────── */
function WhyCard({ item, index }: { item: typeof WHY[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:false, amount:0.3 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div ref={ref} initial={{ opacity:0, y:36 }}
      animate={inView?{opacity:1,y:0}:{opacity:0,y:36}}
      transition={{ duration:0.7, delay:index*0.1, ease:EASE }}
      onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)}
      className="text-center p-6 cursor-pointer">
      <motion.div className="flex items-center justify-center mx-auto mb-5 rounded-full text-3xl"
        style={{ width:64, height:64 }}
        animate={{ background:hovered?'#2d4337':'#f1f1ef', color:hovered?'white':'#2d4337' }}
        transition={{ duration:0.3 }}>
        {item.icon}
      </motion.div>
      <h4 className="font-bold text-xs uppercase tracking-widest mb-2" style={{ letterSpacing:1.5 }}>{item.title}</h4>
      <p className="text-xs font-light leading-relaxed" style={{ color:'#73736e' }}>{item.desc}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function EmployeeWellness() {
  /* canvas refs */
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const heroRef     = useRef<HTMLElement>(null);

  /* parallax — text only (no bg image parallax needed) */
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start','end start'] });
  const textY       = useTransform(scrollYProgress, [0,1], ['0%','18%']);
  const heroOpacity = useTransform(scrollYProgress, [0,0.75], [1,0]);
  const springTxt   = useSpring(textY, { stiffness:80, damping:25 });

  /* start canvas */
  useWellnessCanvas(canvasRef, heroRef);

  /* about tilt */
  const { ref:aRef, springX:aX, springY:aY, onMouseMove:aMM, onMouseLeave:aML } = useTilt(6);

  /* section refs */
  const aboutRef = useRef<HTMLElement>(null);
  const catRef   = useRef<HTMLElement>(null);
  const custRef  = useRef<HTMLElement>(null);
  const ctaRef   = useRef<HTMLElement>(null);

  const aboutInView = useInView(aboutRef, { once:false, amount:0.2 });
  const catInView   = useInView(catRef,   { once:false, amount:0.15 });
  const custInView  = useInView(custRef,  { once:false, amount:0.15 });
  const ctaInView   = useInView(ctaRef,   { once:false, amount:0.3 });

  return (
    <div className="overflow-x-hidden" style={{ background:'#f8f8f7', fontFamily:'inherit' }}>

      {/* ══ HERO ══════════════════════════════════ */}
      <section ref={heroRef} className="relative flex items-center overflow-hidden" style={{ minHeight:'100vh' }}>

        {/* wellness canvas — fills entire hero */}
        <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:0 }}/>

        {/* bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background:'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 100%)', zIndex:1 }}/>

        {/* top fade */}
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background:'linear-gradient(to bottom,rgba(0,0,0,0.4) 0%,transparent 100%)', zIndex:1 }}/>

        {/* click hint */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.2, duration:1 }}
          className="absolute top-6 right-8 z-10 pointer-events-none flex items-center gap-2"
          style={{ color:'rgba(255,255,255,0.35)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.2em', fontWeight:700 }}>
          <motion.span animate={{ scale:[1,1.4,1], opacity:[0.4,1,0.4] }}
            transition={{ duration:2.5, repeat:Infinity }}>{hero.hintSymbol}</motion.span>
          {hero.hint}
        </motion.div>

        {/* hero text */}
        <motion.div style={{ y:springTxt, opacity:heroOpacity, willChange:'transform' }}
          className="absolute bottom-20 left-8 md:left-20 z-10 max-w-3xl px-4">

          <motion.p initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
            transition={{ duration:0.6, delay:0.1 }}
            className="text-[10px] uppercase tracking-[0.32em] font-bold text-white/60 mb-5 flex items-center gap-3">
            <span className="w-10 h-px inline-block" style={{ background:'#b5a26a' }}/>
            {hero.eyebrow}
          </motion.p>

          <h1 className="font-serif text-white" style={{ fontSize:'clamp(3rem,7vw,6rem)', lineHeight:1.08 }}>
            {[hero.titleLine1,hero.titleLine2].map((word,i)=>(
              <motion.span key={word}
                initial={{ rotateX:-90, opacity:0, y:40 }}
                animate={{ rotateX:0, opacity:1, y:0 }}
                transition={{ duration:0.7, delay:0.25+i*0.15, ease:EASE }}
                style={{ display:'block', transformOrigin:'bottom center', transformStyle:'preserve-3d' }}>
                {word}
              </motion.span>
            ))}
            <motion.span initial={{ rotateX:-90, opacity:0, y:40 }}
              animate={{ rotateX:0, opacity:1, y:0 }}
              transition={{ duration:0.7, delay:0.55, ease:EASE }}
              style={{ display:'block', fontStyle:'italic', fontWeight:400, transformOrigin:'bottom center', transformStyle:'preserve-3d' }}>
              {hero.titleItalic}
            </motion.span>
          </h1>

          <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.65, delay:0.8 }}
            className="text-white/80 mt-6 max-w-md text-lg font-light leading-relaxed">
            {hero.intro}
          </motion.p>

          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.55, delay:1.05 }}
            className="flex gap-4 mt-10 flex-wrap">
            <motion.button
              whileHover={{ scale:1.05, y:-2, boxShadow:'0 12px 32px rgba(45,67,55,0.55)' }}
              whileTap={{ scale:0.96 }}
              transition={{ type:'spring', stiffness:300, damping:18 }}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full"
              style={{ background:'#2d4337', border:'none', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 8px 30px rgba(45,67,55,0.4)' }}>
              {hero.primaryButton}
            </motion.button>
            <motion.button
              whileHover={{ scale:1.04, y:-2, background:'white', color:'#1e2d25' }}
              whileTap={{ scale:0.96 }}
              transition={{ type:'spring', stiffness:300, damping:18 }}
              onClick={()=>window.location.href='/contact'}
              className="text-white font-bold uppercase tracking-widest text-xs px-9 py-4 rounded-full"
              style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.45)', cursor:'pointer', fontFamily:'inherit' }}>
              {hero.secondaryButton}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* scroll cue */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.8, duration:0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold">{hero.scrollLabel}</span>
          <motion.div animate={{ y:[0,8,0] }} transition={{ duration:1.5, repeat:Infinity, ease:'easeInOut' }}
            style={{ width:1, height:28, background:'linear-gradient(to bottom,rgba(181,162,106,0.85),transparent)' }}/>
        </motion.div>
      </section>

      {/* ══ ABOUT ═════════════════════════════════ */}
      <section ref={aboutRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background:'#f8f8f7' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vStagger} initial="hidden" animate={aboutInView?'show':'hidden'}>
            <motion.div variants={vFadeUp}>
              <motion.div initial={{ scaleX:0 }} animate={aboutInView?{scaleX:1}:{scaleX:0}}
                transition={{ duration:0.55, ease:EASE }}
                style={{ originX:0, height:3, width:80, background:'#2d4337', marginBottom:24 }}/>
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-4" style={{ color:'#2d4337' }}>{about.eyebrow}</p>
            </motion.div>
            <motion.h2 variants={vFadeUp} className="text-5xl font-serif leading-tight mb-8" style={{ color:'#121b16' }}>
              {about.titleLine1}<br/>{about.titleLine2}
            </motion.h2>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-5" style={{ color:'#73736e' }}>
              {about.text1}
            </motion.p>
            <motion.p variants={vFadeUp} className="text-lg font-light leading-relaxed mb-10" style={{ color:'#73736e' }}>
              {about.text2}
            </motion.p>
            <motion.div variants={vFadeUp} className="flex items-center gap-4 pt-8" style={{ borderTop:'1px solid #e2e2de' }}>
              <div className="flex items-center justify-center rounded-full text-2xl flex-shrink-0"
                style={{ width:48, height:48, background:'#dae5de' }}>{about.badgeSymbol}</div>
              <p className="font-semibold text-sm" style={{ color:'#2d4337' }}>{about.badgeText}</p>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity:0, scale:0.85 }}
            animate={aboutInView?{opacity:1,scale:1}:{opacity:0,scale:0.85}}
            transition={{ duration:0.85, ease:EASE }} style={{ perspective:'1200px' }}>
            <motion.div ref={aRef} onMouseMove={aMM} onMouseLeave={aML}
              style={{ rotateX:aX, rotateY:aY, transformStyle:'preserve-3d', willChange:'transform' }}>
              <img src={asset(about.image)}
                alt={about.imageAlt} className="w-full rounded-2xl shadow-2xl"
                style={{ aspectRatio:'4/5', objectFit:'cover' }}/>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ CATEGORIES ════════════════════════════ */}
      <section ref={catRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background:'#f1f1ef' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity:0, y:30 }} animate={catInView?{opacity:1,y:0}:{opacity:0,y:30}}
            transition={{ duration:0.6 }} className="text-center mb-14">
            <h2 className="text-5xl font-serif mb-4" style={{ color:'#121b16' }}>{categories.title}</h2>
            <p className="font-light text-sm max-w-lg mx-auto" style={{ color:'#73736e' }}>
              {categories.intro}
            </p>
          </motion.div>
          <motion.div variants={vStagger} initial="hidden" animate={catInView?'show':'hidden'}
            className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ perspective:'1600px' }}>
            {CATEGORIES.map((item,i)=><CategoryCard key={item.name} item={item} index={i}/>)}
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURED PRODUCTS ═════════════════════ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background:'#f8f8f7' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:false, amount:0.3 }} transition={{ duration:0.6 }}
            className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-5xl font-serif mb-2" style={{ color:'#121b16' }}>{products.title}</h2>
              <p className="font-light" style={{ color:'#73736e' }}>{products.intro}</p>
            </div>
            <motion.a whileHover={{ y:-1 }}
              className="font-bold text-xs uppercase tracking-widest border-b-2 pb-1 cursor-pointer"
              style={{ borderColor:'#2d4337', color:'#121b16' }}>{products.viewAll}</motion.a>
          </motion.div>
          <div className="flex gap-6 overflow-x-auto pb-4"
            style={{ scrollSnapType:'x mandatory', msOverflowStyle:'none', scrollbarWidth:'none' }}>
            {PRODUCTS.map((p,i)=><ProductCard key={p.name} item={p} index={i}/>)}
          </div>
        </div>
      </section>

      {/* ══ CUSTOMIZATION ═════════════════════════ */}
      <section ref={custRef} className="py-32 px-8 md:px-20 lg:px-32 overflow-hidden" style={{ background:'#121b16' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vSlideLeft} initial="hidden" animate={custInView?'show':'hidden'}>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/60 mb-4">{customization.eyebrow}</p>
            <h2 className="text-5xl font-serif text-white leading-tight mb-6">
              {customization.titleLine1}<br/>
              <span style={{ color:'#86efac', fontStyle:'italic', fontWeight:400 }}>{customization.titleHighlight}</span>
            </h2>
            <p className="text-lg font-light leading-relaxed mb-12" style={{ color:'rgba(212,212,212,0.7)' }}>
              {customization.text}
            </p>
            <motion.div variants={vStagger} initial="hidden" animate={custInView?'show':'hidden'} className="grid grid-cols-2 gap-8">
              {CUSTOM_ITEMS.map(item=>(
                <motion.div key={item.title} variants={vFadeUp} className="flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center text-lg rounded-lg"
                    style={{ width:40, height:40, border:'1px solid #3d5a4a', color:'#86efac' }}>{item.icon}</div>
                  <div>
                    <h5 className="font-semibold text-white text-sm mb-1">{item.title}</h5>
                    <p className="text-xs font-light leading-relaxed" style={{ color:'rgba(212,212,212,0.6)' }}>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div variants={vSlideRight} initial="hidden" animate={custInView?'show':'hidden'} style={{ position:'relative' }}>
            <div className="absolute inset-0 rounded-3xl opacity-50"
              style={{ background:'#2d4337', transform:'rotate(3deg) scale(0.95)' }}/>
            <div className="relative rounded-3xl overflow-hidden p-6" style={{ background:'#f1f1ef' }}>
              <img src={asset(customization.image)}
                alt={customization.imageAlt} className="w-full rounded-2xl shadow-xl" style={{ aspectRatio:'1', objectFit:'cover' }}/>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ WHY CHOOSE ════════════════════════════ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:false, amount:0.4 }} transition={{ duration:0.6 }} className="text-center mb-16">
            <h2 className="text-5xl font-serif" style={{ color:'#121b16' }}>{why.title}</h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {WHY.map((item,i)=><WhyCard key={item.title} item={item} index={i}/>)}
          </div>
        </div>
      </section>

      {/* ══ TRUSTED BY ════════════════════════════ */}
      {clients.length > 0 && (
      <section className="py-14 px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }}
            viewport={{ once:false, amount:0.5 }}
            className="text-center text-[9px] uppercase tracking-[0.3em] font-bold mb-10"
            style={{ color:'#a6a6a1' }}>{trust.title}</motion.p>
          <motion.div initial={{ opacity:0 }} whileInView={{ opacity:0.5 }}
            viewport={{ once:false, amount:0.5 }} transition={{ duration:0.6 }}
            className="flex justify-center items-center gap-16 grayscale">
            {clients.map(c => c.logo
              ? <img key={c.name} src={c.logo} alt={c.name} style={{ height:24, objectFit:'contain' }}/>
              : <span key={c.name} className="font-bold text-sm tracking-widest" style={{ color:'#4d4941' }}>{c.name}</span>)}
          </motion.div>
        </div>
      </section>
      )}

      {/* ══ FINAL CTA ═════════════════════════════ */}
      <section ref={ctaRef} className="py-32 px-8 text-center" style={{ background:'#f1f1ef' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity:0, letterSpacing:'-0.05em', y:20 }}
            animate={ctaInView?{opacity:1,letterSpacing:'-0.01em',y:0}:{opacity:0,letterSpacing:'-0.05em',y:20}}
            transition={{ duration:0.85, ease:EASE }}
            className="font-serif text-5xl md:text-6xl leading-tight mb-6" style={{ color:'#121b16' }}>
            {cta.title}<br/>
            <span className="italic font-normal">{cta.titleHighlight}</span><br/>
            {cta.titleEnd}
          </motion.h2>
          <motion.p initial={{ opacity:0, y:16 }}
            animate={ctaInView?{opacity:1,y:0}:{opacity:0,y:16}}
            transition={{ duration:0.6, delay:0.15 }}
            className="text-xl font-light leading-relaxed mb-12" style={{ color:'#73736e' }}>
            {cta.text}
          </motion.p>
          <motion.div initial={{ opacity:0, y:16 }}
            animate={ctaInView?{opacity:1,y:0}:{opacity:0,y:16}}
            transition={{ duration:0.6, delay:0.28 }}
            className="flex flex-col sm:flex-row justify-center gap-6">
            <motion.button
              whileHover={{ scale:1.06, y:-3, boxShadow:'0 18px 40px rgba(45,67,55,0.35)' }}
              whileTap={{ scale:0.96 }}
              onClick={()=>window.location.href='/get-proposal'}
              transition={{ type:'spring', stiffness:300, damping:18 }}
              className="text-white font-bold uppercase tracking-[0.2em] text-xs px-14 py-6 rounded-full shadow-xl"
              style={{ background:'#2d4337', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              {cta.primaryButton}
            </motion.button>
            <motion.button whileHover={{ y:-2 }} transition={{ type:'spring', stiffness:400, damping:20 }}
              onClick={()=>window.location.href='/contact'}
              className="font-bold uppercase tracking-[0.2em] text-xs pb-1 transition-colors"
              style={{ background:'transparent', border:'none', borderBottom:'2px solid rgba(38,38,36,0.2)',
                cursor:'pointer', fontFamily:'inherit', color:'#262624' }}
              onMouseEnter={e=>(e.currentTarget.style.borderBottomColor='#2d4337')}
              onMouseLeave={e=>(e.currentTarget.style.borderBottomColor='rgba(38,38,36,0.2)')}>
              {cta.secondaryButton}
            </motion.button>
          </motion.div>
        </div>
      </section>

    </div>
  );
}