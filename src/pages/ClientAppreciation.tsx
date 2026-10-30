import { useRef, useEffect, useCallback, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
} from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { clients } from '../lib/clients';
import { asset } from '../lib/content';
import content from '../content/pages/client-appreciation.json';

// Page words and photos: src/content/pages/client-appreciation.json (admin → Pages → Client Appreciation)
const { hero, about, collections, products, personalization, features, trustedBy, cta } = content;

function useTilt(strength = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const cfg = { stiffness: 200, damping: 22, mass: 0.6 };
  const springX = useSpring(rotateX, cfg);
  const springY = useSpring(rotateY, cfg);
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      rotateY.set(dx * strength);
      rotateX.set(-dy * strength);
    },
    [strength, rotateX, rotateY]
  );
  const onMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);
  return { ref, springX, springY, onMouseMove, onMouseLeave };
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const vFadeUp: Variants = {
  hidden: { opacity: 0, y: 44 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};
const vStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13 } },
};
const vScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.6, rotateX: -55 },
  show: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.95, ease: EASE } },
};
const vSlideLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};
const vSlideRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

const PRODUCTS = products.items.map(p => ({ name: p.name, sub: p.subtitle, price: p.price, img: asset(p.image) }));
const CATEGORIES = collections.items.map(c => ({ name: c.name, desc: c.text, accent: c.accent, tag: c.tag, img: asset(c.image) }));
const FEATURES = features.items.map(f => ({ icon: f.symbol, title: f.title, desc: f.text }));
const CUSTOM_ITEMS = personalization.items.map(c => ({ icon: c.symbol, title: c.title, desc: c.text }));

/* ═══════════════════════════════════════════════════════════════
   GIFTING CANVAS  — replaces plain bubbles with themed shapes
═══════════════════════════════════════════════════════════════ */
const GiftingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const mouseRef  = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = (canvas.width  = canvas.offsetWidth);
    let H = (canvas.height = canvas.offsetHeight);

    const onResize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    window.addEventListener("resize", onResize);

    const section = canvas.parentElement!;
    const onMove  = (e: MouseEvent) => { const r = section.getBoundingClientRect(); mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    section.addEventListener("mousemove", onMove);
    section.addEventListener("mouseleave", onLeave);

    /* ── palette ── */
    const GOLD   = ["#FFD700","#FFC84B","#E8C882","#C9A96E","#FFB347"];
    const BLUE   = ["#60a5fa","#38bdf8","#7dd3fc","#93c5fd","#a5f3fc"];
    const PINK   = ["#f9a8d4","#fb7185","#fda4af","#f472b6"];
    const GREEN  = ["#6ee7b7","#34d399","#a7f3d0"];
    const ALL    = [...GOLD,...BLUE,...PINK,...GREEN];

    function rnd(a:number,b:number){ return Math.random()*(b-a)+a; }
    function pick<T>(arr:T[]): T { return arr[Math.floor(Math.random()*arr.length)]; }

    /* ════════════════════════════════════════
       1. GIFT BOX (floating)
    ════════════════════════════════════════ */
    interface GiftBox {
      x:number;y:number;vx:number;vy:number;
      driftX:number;driftY:number;
      size:number;rot:number;rotSpd:number;
      bodyCol:string;lidCol:string;ribbonCol:string;bowCol:string;
      pulse:number;alpha:number;
    }
    function makeBox(): GiftBox {
      const ang=rnd(0,Math.PI*2), spd=rnd(0.15,0.45);
      return {
        x:rnd(0,W), y:rnd(0,H),
        vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
        driftX:Math.cos(ang)*spd, driftY:Math.sin(ang)*spd,
        size:rnd(18,42), rot:rnd(0,Math.PI*2), rotSpd:rnd(-0.007,0.007),
        bodyCol:pick(GOLD), lidCol:pick(BLUE), ribbonCol:pick(PINK), bowCol:pick(GOLD),
        pulse:rnd(0,Math.PI*2), alpha:rnd(0.35,0.75),
      };
    }
    function drawBox(b:GiftBox,mx:number,my:number){
      const s=b.size*(0.9+Math.sin(b.pulse)*0.08);
      const near=mx>-999&&Math.hypot(b.x-mx,b.y-my)<160;
      const al=near?Math.min(1,b.alpha*1.7):b.alpha;
      ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.rot); ctx.globalAlpha=al;
      // body
      ctx.fillStyle=b.bodyCol;
      ctx.beginPath(); ctx.roundRect(-s/2,0,s,s*0.72,4); ctx.fill();
      // lid
      ctx.fillStyle=b.lidCol;
      ctx.beginPath(); ctx.roundRect(-s/2-3,-s*0.2,s+6,s*0.24,3); ctx.fill();
      // vertical ribbon
      ctx.fillStyle=b.ribbonCol;
      ctx.fillRect(-s*0.1,-s*0.2,s*0.2,s*0.92);
      // horizontal ribbon
      ctx.fillRect(-s/2,s*0.18,s,s*0.18);
      // bow left loop
      ctx.strokeStyle=b.bowCol; ctx.lineWidth=near?2.5:1.5;
      ctx.beginPath(); ctx.ellipse(-s*0.28,-s*0.28,s*0.22,s*0.14,-0.6,0,Math.PI*2); ctx.stroke();
      // bow right loop
      ctx.beginPath(); ctx.ellipse(s*0.28,-s*0.28,s*0.22,s*0.14,0.6,0,Math.PI*2); ctx.stroke();
      // bow knot
      ctx.fillStyle=b.bowCol;
      ctx.beginPath(); ctx.arc(0,-s*0.22,s*0.07,0,Math.PI*2); ctx.fill();
      // glow if near
      if(near){
        ctx.shadowBlur=22; ctx.shadowColor=b.bodyCol;
        ctx.strokeStyle=b.bodyCol; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.roundRect(-s/2-3,-s*0.2,s+6,s*0.92,4); ctx.stroke();
        ctx.shadowBlur=0;
      }
      ctx.restore();
    }

    /* ════════════════════════════════════════
       2. 4-POINT STAR (twinkling)
    ════════════════════════════════════════ */
    interface Star4 {
      x:number;y:number;vx:number;vy:number;driftX:number;driftY:number;
      r:number;rot:number;rotSpd:number;col:string;pulse:number;twinkle:number;twSpd:number;
    }
    function makeStar(): Star4 {
      const ang=rnd(0,Math.PI*2),spd=rnd(0.1,0.5);
      return {
        x:rnd(0,W),y:rnd(0,H),vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
        driftX:Math.cos(ang)*spd,driftY:Math.sin(ang)*spd,
        r:rnd(4,14),rot:rnd(0,Math.PI*2),rotSpd:rnd(-0.02,0.02),
        col:pick([...GOLD,...BLUE]),pulse:rnd(0,Math.PI*2),twinkle:rnd(0,Math.PI*2),twSpd:rnd(0.03,0.09),
      };
    }
    function drawStar4(s:Star4,mx:number,my:number){
      const near=mx>-999&&Math.hypot(s.x-mx,s.y-my)<150;
      const r=s.r*(0.85+Math.sin(s.pulse)*0.18);
      const tw=0.3+Math.sin(s.twinkle)*0.55;
      const al=near?1:tw;
      ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.rot); ctx.globalAlpha=al;
      if(near){ ctx.shadowBlur=18; ctx.shadowColor=s.col; }
      // 4-point star path
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        const rad=i%2===0?r:r*0.35;
        i===0?ctx.moveTo(rad*Math.cos(a),rad*Math.sin(a)):ctx.lineTo(rad*Math.cos(a),rad*Math.sin(a));
      }
      ctx.closePath();
      ctx.fillStyle=near?"#fff":s.col;
      ctx.fill();
      // inner sparkle dot
      ctx.globalAlpha=al*0.6;
      ctx.fillStyle="#fff";
      ctx.beginPath(); ctx.arc(0,0,r*0.18,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    /* ════════════════════════════════════════
       3. FLOATING RIBBON / BOW
    ════════════════════════════════════════ */
    interface Ribbon {
      x:number;y:number;vx:number;vy:number;driftX:number;driftY:number;
      size:number;rot:number;rotSpd:number;col:string;pulse:number;alpha:number;
    }
    function makeRibbon(): Ribbon {
      const ang=rnd(0,Math.PI*2),spd=rnd(0.1,0.35);
      return {
        x:rnd(0,W),y:rnd(0,H),vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
        driftX:Math.cos(ang)*spd,driftY:Math.sin(ang)*spd,
        size:rnd(12,28),rot:rnd(0,Math.PI*2),rotSpd:rnd(-0.01,0.01),
        col:pick([...PINK,...GOLD]),pulse:rnd(0,Math.PI*2),alpha:rnd(0.3,0.65),
      };
    }
    function drawRibbon(rb:Ribbon,mx:number,my:number){
      const s=rb.size*(0.9+Math.sin(rb.pulse)*0.1);
      const near=mx>-999&&Math.hypot(rb.x-mx,rb.y-my)<150;
      const al=near?Math.min(1,rb.alpha*1.8):rb.alpha;
      ctx.save(); ctx.translate(rb.x,rb.y); ctx.rotate(rb.rot); ctx.globalAlpha=al;
      ctx.strokeStyle=rb.col; ctx.lineWidth=near?2:1.2;
      if(near){ ctx.shadowBlur=14; ctx.shadowColor=rb.col; }
      // left loop
      ctx.beginPath(); ctx.ellipse(-s*0.55,-s*0.15,s*0.5,s*0.28,-0.5,0,Math.PI*2); ctx.stroke();
      // right loop
      ctx.beginPath(); ctx.ellipse(s*0.55,-s*0.15,s*0.5,s*0.28,0.5,0,Math.PI*2); ctx.stroke();
      // tails
      ctx.beginPath(); ctx.moveTo(-s*0.1,0); ctx.lineTo(-s*0.55,s*0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*0.1,0); ctx.lineTo(s*0.55,s*0.7); ctx.stroke();
      // knot
      ctx.fillStyle=rb.col; ctx.globalAlpha=al;
      ctx.beginPath(); ctx.ellipse(0,0,s*0.16,s*0.12,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    /* ════════════════════════════════════════
       4. FLOATING HEART
    ════════════════════════════════════════ */
    interface Heart {
      x:number;y:number;vx:number;vy:number;driftX:number;driftY:number;
      size:number;rot:number;rotSpd:number;col:string;pulse:number;alpha:number;
    }
    function makeHeart(): Heart {
      const ang=rnd(0,Math.PI*2),spd=rnd(0.1,0.4);
      return {
        x:rnd(0,W),y:rnd(0,H),vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
        driftX:Math.cos(ang)*spd,driftY:Math.sin(ang)*spd,
        size:rnd(8,20),rot:rnd(-0.3,0.3),rotSpd:rnd(-0.008,0.008),
        col:pick(PINK),pulse:rnd(0,Math.PI*2),alpha:rnd(0.3,0.7),
      };
    }
    function drawHeart(h:Heart,mx:number,my:number){
      const s=h.size*(0.88+Math.sin(h.pulse)*0.14);
      const near=mx>-999&&Math.hypot(h.x-mx,h.y-my)<150;
      const al=near?Math.min(1,h.alpha*1.9):h.alpha;
      ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(h.rot); ctx.globalAlpha=al;
      if(near){ ctx.shadowBlur=16; ctx.shadowColor=h.col; }
      ctx.fillStyle=near?"#ff90b0":h.col;
      ctx.beginPath();
      ctx.moveTo(0,s*0.3);
      ctx.bezierCurveTo(-s*0.5,-s*0.1,-s,-s*0.3,0,s*1.0);
      ctx.bezierCurveTo(s,-s*0.3,s*0.5,-s*0.1,0,s*0.3);
      ctx.closePath(); ctx.fill();
      // shine
      ctx.globalAlpha=al*0.35;
      ctx.fillStyle="#fff";
      ctx.beginPath(); ctx.ellipse(-s*0.22,-s*0.08,s*0.14,s*0.08,-0.4,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    /* ════════════════════════════════════════
       5. DIAMOND / GEM shape
    ════════════════════════════════════════ */
    interface Diamond {
      x:number;y:number;vx:number;vy:number;driftX:number;driftY:number;
      size:number;rot:number;rotSpd:number;col:string;pulse:number;alpha:number;
    }
    function makeDiamond(): Diamond {
      const ang=rnd(0,Math.PI*2),spd=rnd(0.1,0.35);
      return {
        x:rnd(0,W),y:rnd(0,H),vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
        driftX:Math.cos(ang)*spd,driftY:Math.sin(ang)*spd,
        size:rnd(10,24),rot:rnd(0,Math.PI*2),rotSpd:rnd(-0.012,0.012),
        col:pick([...BLUE,...GOLD]),pulse:rnd(0,Math.PI*2),alpha:rnd(0.28,0.65),
      };
    }
    function drawDiamond(d:Diamond,mx:number,my:number){
      const s=d.size*(0.9+Math.sin(d.pulse)*0.1);
      const near=mx>-999&&Math.hypot(d.x-mx,d.y-my)<150;
      const al=near?Math.min(1,d.alpha*1.8):d.alpha;
      ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.rot); ctx.globalAlpha=al;
      if(near){ ctx.shadowBlur=20; ctx.shadowColor=d.col; }
      // top facets
      ctx.beginPath();
      ctx.moveTo(0,-s); ctx.lineTo(s*0.55,-s*0.25); ctx.lineTo(0,0); ctx.closePath();
      ctx.fillStyle=near?"#fff":d.col; ctx.globalAlpha=al*0.85; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0,-s); ctx.lineTo(-s*0.55,-s*0.25); ctx.lineTo(0,0); ctx.closePath();
      ctx.fillStyle=d.col; ctx.globalAlpha=al*0.55; ctx.fill();
      // bottom
      ctx.beginPath();
      ctx.moveTo(-s*0.55,-s*0.25); ctx.lineTo(s*0.55,-s*0.25);
      ctx.lineTo(s*0.25,s*0.55); ctx.lineTo(-s*0.25,s*0.55); ctx.closePath();
      ctx.fillStyle=d.col; ctx.globalAlpha=al*0.7; ctx.fill();
      // outline
      ctx.globalAlpha=al;
      ctx.strokeStyle=near?"#fff":d.col; ctx.lineWidth=0.8;
      ctx.beginPath();
      ctx.moveTo(0,-s); ctx.lineTo(s*0.55,-s*0.25);
      ctx.lineTo(s*0.25,s*0.55); ctx.lineTo(-s*0.25,s*0.55);
      ctx.lineTo(-s*0.55,-s*0.25); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }

    /* ════════════════════════════════════════
       6. WAVY SILK RIBBON (horizontal, background)
    ════════════════════════════════════════ */
    interface SilkRibbon {
      yBase:number; phase:number; speed:number;
      amp:number; freq:number; col:string; width:number; alpha:number;
    }
    const SILK: SilkRibbon[] = Array.from({length:7},(_,i)=>({
      yBase: 0.1+i*0.14,
      phase: rnd(0,Math.PI*2),
      speed: rnd(0.004,0.012),
      amp: rnd(10,32),
      freq: rnd(0.008,0.018),
      col: pick([...GOLD,...BLUE,...PINK,...GREEN]),
      width: rnd(0.5,1.8),
      alpha: rnd(0.03,0.08),
    }));

    /* ════════════════════════════════════════
       7. SPARKLE BURST (mouse + auto)
    ════════════════════════════════════════ */
    interface Spark { x:number;y:number;vx:number;vy:number;life:number;col:string;r:number; }
    const SPARKS:Spark[]=[];
    function spawnSpark(sx:number,sy:number,count=6){
      for(let i=0;i<count;i++){
        const a=Math.random()*Math.PI*2, s=1.5+Math.random()*3.5;
        SPARKS.push({x:sx,y:sy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,col:pick(ALL),r:1.5+Math.random()*2.5});
      }
    }

    /* ════════════════════════════════════════
       8. LIGHTNING
    ════════════════════════════════════════ */
    interface LPt { x:number;y:number }
    interface Branch { pts:LPt[];life:number }
    interface Bolt { pts:LPt[];life:number;maxLife:number;branches:Branch[] }
    const BOLTS:Bolt[]=[]; let boltTimer=0; let flash=0;
    function zigzag(x1:number,y1:number,x2:number,y2:number,segs:number,rough:number):LPt[]{
      const pts:LPt[]=[{x:x1,y:y1}];
      for(let i=1;i<segs;i++){
        const t=i/segs, px=x1+(x2-x1)*t, py=y1+(y2-y1)*t;
        const perp=Math.atan2(y2-y1,x2-x1)+Math.PI/2;
        const off=(Math.random()-0.5)*rough*(1-Math.abs(t-0.5)*1.5);
        pts.push({x:px+Math.cos(perp)*off,y:py+Math.sin(perp)*off});
      }
      pts.push({x:x2,y:y2}); return pts;
    }
    function spawnBolt(x1:number,y1:number,x2:number,y2:number){
      const pts=zigzag(x1,y1,x2,y2,14,55);
      const bolt:Bolt={pts,life:1,maxLife:1,branches:[]};
      if(Math.random()>0.4){
        const bi=Math.floor(pts.length*(0.3+Math.random()*0.35));
        const ang=Math.atan2(y2-y1,x2-x1)+(Math.random()-0.5)*1.4;
        const len=30+Math.random()*60;
        bolt.branches.push({pts:zigzag(pts[bi].x,pts[bi].y,pts[bi].x+Math.cos(ang)*len,pts[bi].y+Math.sin(ang)*len,6,25),life:1});
      }
      BOLTS.push(bolt);
    }
    function drawBolt(b:Bolt){
      const a=b.life/b.maxLife;
      ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round";
      ctx.shadowBlur=25; ctx.shadowColor="rgba(120,200,255,0.8)";
      ctx.strokeStyle=`rgba(80,160,255,${a*0.5})`; ctx.lineWidth=3;
      ctx.beginPath(); b.pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)); ctx.stroke();
      ctx.shadowBlur=8; ctx.shadowColor="#fff";
      ctx.strokeStyle=`rgba(255,255,255,${a*0.95})`; ctx.lineWidth=0.8;
      ctx.beginPath(); b.pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)); ctx.stroke();
      b.branches.forEach(br=>{
        ctx.shadowBlur=12; ctx.shadowColor="rgba(120,200,255,0.6)";
        ctx.strokeStyle=`rgba(180,220,255,${br.life*a*0.5})`; ctx.lineWidth=1.2;
        ctx.beginPath(); br.pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)); ctx.stroke();
        br.life-=0.08;
      });
      ctx.restore();
    }

    /* ════════════════════════════════════════
       9. PARTICLE LINKS (network)
    ════════════════════════════════════════ */
    interface NetPt { x:number;y:number;vx:number;vy:number;driftX:number;driftY:number;pulse:number;col:string; }
    const NETS:NetPt[]=Array.from({length:60},()=>{
      const ang=rnd(0,Math.PI*2),spd=rnd(0.1,0.35);
      return {x:rnd(0,W),y:rnd(0,H),vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,driftX:Math.cos(ang)*spd,driftY:Math.sin(ang)*spd,pulse:rnd(0,Math.PI*2),col:pick([...GOLD,...BLUE])};
    });
    function updateNets(mx:number,my:number){
      const R=140;
      NETS.forEach(n=>{
        n.pulse+=0.03;
        if(mx>-999){
          const dx=n.x-mx,dy=n.y-my,d=Math.hypot(dx,dy);
          if(d<R&&d>0){const f=(R-d)/R;n.vx+=(dx/d)*f*1.5;n.vy+=(dy/d)*f*1.5;}
        }
        n.vx+=(n.driftX-n.vx)*0.04; n.vy+=(n.driftY-n.vy)*0.04;
        const spd=Math.hypot(n.vx,n.vy); if(spd>3){n.vx=n.vx/spd*3;n.vy=n.vy/spd*3;}
        n.x+=n.vx; n.y+=n.vy;
        if(n.x<-10)n.x=W+10; if(n.x>W+10)n.x=-10;
        if(n.y<-10)n.y=H+10; if(n.y>H+10)n.y=-10;
      });
    }
    function drawNets(){
      const MAX=100;
      for(let i=0;i<NETS.length;i++){
        for(let j=i+1;j<NETS.length;j++){
          const a=NETS[i],b=NETS[j],d=Math.hypot(a.x-b.x,a.y-b.y);
          if(d<MAX){
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
            ctx.strokeStyle=`rgba(180,160,80,${(1-d/MAX)*0.18})`; ctx.lineWidth=0.5; ctx.stroke();
          }
        }
        const n=NETS[i], pr=2+Math.sin(n.pulse)*0.5;
        ctx.beginPath(); ctx.arc(n.x,n.y,pr,0,Math.PI*2);
        ctx.fillStyle=n.col; ctx.globalAlpha=0.5; ctx.fill(); ctx.globalAlpha=1;
      }
    }

    /* ════════════════════════════════════════
       INSTANCES
    ════════════════════════════════════════ */
    const REPULSE=170, REPULSE_F=1.6;
    function applyRepulse<T extends {x:number;y:number;vx:number;vy:number}>(o:T,mx:number,my:number,f=1){
      const dx=o.x-mx,dy=o.y-my,d=Math.hypot(dx,dy);
      if(d<REPULSE&&d>0){const frc=(REPULSE-d)/REPULSE;o.vx+=(dx/d)*frc*REPULSE_F*f;o.vy+=(dy/d)*frc*REPULSE_F*f;}
    }
    function wrapEdge<T extends {x:number;y:number}>(o:T,m=20){
      if(o.x<-m)o.x=W+m; if(o.x>W+m)o.x=-m;
      if(o.y<-m)o.y=H+m; if(o.y>H+m)o.y=-m;
    }
    function movObj<T extends {x:number;y:number;vx:number;vy:number;driftX:number;driftY:number;rot:number;rotSpd:number;pulse:number}>(o:T,mx:number,my:number,maxSpd=2.5){
      o.pulse+=0.03; o.rot+=o.rotSpd;
      applyRepulse(o,mx,my,0.7);
      o.vx+=(o.driftX-o.vx)*0.04; o.vy+=(o.driftY-o.vy)*0.04;
      const s=Math.hypot(o.vx,o.vy); if(s>maxSpd){o.vx=o.vx/s*maxSpd;o.vy=o.vy/s*maxSpd;}
      o.x+=o.vx; o.y+=o.vy; wrapEdge(o);
    }

    const BOXES    = Array.from({length:12},makeBox);
    const STARS    = Array.from({length:30},makeStar);
    const RIBBONS  = Array.from({length:14},makeRibbon);
    const HEARTS   = Array.from({length:10},makeHeart);
    const DIAMONDS = Array.from({length:10},makeDiamond);

    let frame=0; let sparkTimer=0;

    /* ════════════════════════════════════════
       MAIN LOOP
    ════════════════════════════════════════ */
    function loop(){
      const {x:mx,y:my}=mouseRef.current;
      frame++;
      ctx.clearRect(0,0,W,H);
      ctx.globalAlpha=1;

      /* ── background ── */
      const bg=ctx.createLinearGradient(0,0,W*0.5,H);
      bg.addColorStop(0,"#000008"); bg.addColorStop(0.45,"#04041a"); bg.addColorStop(1,"#000010");
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      /* center warm glow */
      const cg=ctx.createRadialGradient(W*0.5,H*0.5,0,W*0.5,H*0.5,W*0.55);
      cg.addColorStop(0,"rgba(201,169,110,0.07)"); cg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=cg; ctx.fillRect(0,0,W,H);

      /* screen flash */
      if(flash>0){
        ctx.fillStyle=`rgba(180,210,255,${flash*0.14})`; ctx.fillRect(0,0,W,H); flash-=0.1;
      }

      /* ── silk ribbons (background waves) ── */
      SILK.forEach(r=>{
        r.phase+=r.speed;
        ctx.save(); ctx.globalAlpha=r.alpha;
        ctx.beginPath();
        for(let x=0;x<=W;x+=4){
          const y=r.yBase*H+r.amp*Math.sin(x*r.freq+r.phase)+r.amp*0.4*Math.sin(x*r.freq*2+r.phase*1.3);
          x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle=r.col; ctx.lineWidth=r.width*2.5; ctx.stroke();
        ctx.strokeStyle="#fff"; ctx.lineWidth=r.width*0.35; ctx.globalAlpha=r.alpha*0.4; ctx.stroke();
        ctx.restore();
      });

      /* ── network nodes + links ── */
      updateNets(mx,my); drawNets();

      /* ── diamonds ── */
      DIAMONDS.forEach(d=>{ movObj(d,mx,my,2); drawDiamond(d,mx,my); });

      /* ── gift boxes ── */
      BOXES.forEach(b=>{ movObj(b,mx,my,2); drawBox(b,mx,my); });

      /* ── ribbons / bows ── */
      RIBBONS.forEach(r=>{ movObj(r,mx,my,2); drawRibbon(r,mx,my); });

      /* ── hearts ── */
      HEARTS.forEach(h=>{ movObj(h,mx,my,2); drawHeart(h,mx,my); });

      /* ── stars ── */
      STARS.forEach(s=>{
        s.pulse+=0.04; s.twinkle+=s.twSpd; s.rot+=s.rotSpd;
        applyRepulse(s,mx,my,0.8);
        s.vx+=(s.driftX-s.vx)*0.04; s.vy+=(s.driftY-s.vy)*0.04;
        const spd=Math.hypot(s.vx,s.vy); if(spd>3){s.vx=s.vx/spd*3;s.vy=s.vy/spd*3;}
        s.x+=s.vx; s.y+=s.vy; wrapEdge(s);
        drawStar4(s,mx,my);
      });

      /* ── sparks ── */
      sparkTimer++;
      if(sparkTimer>55+Math.floor(Math.random()*30)){
        sparkTimer=0; spawnSpark(Math.random()*W,Math.random()*H,8);
      }
      if(mx>-999&&frame%8===0) spawnSpark(mx,my,5);

      ctx.save();
      for(let i=SPARKS.length-1;i>=0;i--){
        const s=SPARKS[i]; s.x+=s.vx; s.y+=s.vy; s.vy-=0.05; s.life-=0.07;
        if(s.life<=0){SPARKS.splice(i,1);continue;}
        ctx.globalAlpha=s.life;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r*s.life,0,Math.PI*2);
        ctx.fillStyle=s.col; ctx.fill();
        // cross glint
        ctx.beginPath();
        ctx.moveTo(s.x-6*s.life,s.y); ctx.lineTo(s.x+6*s.life,s.y);
        ctx.moveTo(s.x,s.y-6*s.life); ctx.lineTo(s.x,s.y+6*s.life);
        ctx.strokeStyle=s.col; ctx.lineWidth=0.8; ctx.globalAlpha=s.life*0.6; ctx.stroke();
      }
      ctx.restore();

      /* ── lightning ── */
      boltTimer++;
      if(boltTimer>65+Math.floor(Math.random()*45)){
        boltTimer=0;
        const sx=Math.random()*W, ex=sx+(Math.random()-0.5)*100;
        spawnBolt(sx,0,ex,H*(0.4+Math.random()*0.55)); flash=1;
      }
      if(mx>-999&&frame%10===0){ spawnBolt(mx+(Math.random()-0.5)*60,0,mx,my); }
      for(let i=BOLTS.length-1;i>=0;i--){
        drawBolt(BOLTS[i]); BOLTS[i].life-=0.08;
        if(BOLTS[i].life<=0)BOLTS.splice(i,1);
      }

      /* ── mouse glow ── */
      if(mx>-9999){
        const mg=ctx.createRadialGradient(mx,my,0,mx,my,130);
        mg.addColorStop(0,"rgba(201,169,110,0.12)"); mg.addColorStop(0.5,"rgba(80,160,255,0.05)"); mg.addColorStop(1,"transparent");
        ctx.globalAlpha=1; ctx.fillStyle=mg; ctx.fillRect(0,0,W,H);
      }

      animRef.current=requestAnimationFrame(loop);
    }
    loop();

    return ()=>{
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize",onResize);
      section.removeEventListener("mousemove",onMove);
      section.removeEventListener("mouseleave",onLeave);
    };
  },[]);

  return (
    <canvas ref={canvasRef} style={{
      position:"absolute", top:0, left:0,
      width:"100%", height:"100%",
      display:"block", zIndex:0, pointerEvents:"none",
    }}/>
  );
};

/* ─── CATEGORY CARD ─────────────────────────────────────────── */
function CategoryCard({ item }: { item: (typeof CATEGORIES)[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { ref, springX, springY, onMouseMove, onMouseLeave } = useTilt(12);
  return (
    <motion.div variants={vScaleIn} style={{ perspective:"1400px", transformStyle:"preserve-3d" }} className="cursor-pointer">
      <motion.div ref={ref} onMouseMove={onMouseMove}
        onMouseLeave={()=>{onMouseLeave();setHovered(false);}} onMouseEnter={()=>setHovered(true)}
        style={{ rotateX:springX,rotateY:springY,transformStyle:"preserve-3d",willChange:"transform",
          boxShadow:hovered?"0 20px 60px rgba(0,0,0,0.15)":"0 2px 12px rgba(0,0,0,0.06)",transition:"box-shadow 0.4s" }}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100">
        <div className="overflow-hidden relative" style={{height:280}}>
          <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover"
            animate={{scale:hovered?1.07:1}} transition={{duration:0.75,ease:EASE}} style={{willChange:"transform"}}/>
          <motion.div className="absolute inset-0 pointer-events-none" style={{backgroundColor:item.accent}}
            animate={{opacity:hovered?0.16:0}} transition={{duration:0.4}}/>
          <motion.span animate={{y:hovered?0:-24,opacity:hovered?1:0}}
            transition={{type:"spring",stiffness:320,damping:22}}
            className="absolute top-4 left-4 text-[9px] uppercase tracking-[0.18em] font-bold text-white px-3 py-1 rounded-sm"
            style={{backgroundColor:item.accent}}>{item.tag}</motion.span>
        </div>
        <div className="p-8 relative overflow-hidden">
          <motion.div className="absolute bottom-0 left-0 h-[3px]" style={{backgroundColor:item.accent}}
            animate={{width:hovered?"100%":"0%"}} transition={{duration:0.45,ease:EASE}}/>
          <h3 className="font-serif text-2xl text-gray-800 mb-2">{item.name}</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{item.desc}</p>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{color:"#b5a26a"}}>
            <motion.span animate={{x:hovered?3:0}} transition={{type:"spring",stiffness:400,damping:20}}>{collections.linkText}</motion.span>
            <motion.span animate={{rotate:hovered?45:0,x:hovered?2:0}} transition={{type:"spring",stiffness:380,damping:18}} style={{display:"inline-flex"}}><ArrowRight size={11}/></motion.span>
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{boxShadow:"inset 0 0 0 1px rgba(0,0,0,0.06)"}}/>
      </motion.div>
    </motion.div>
  );
}

/* ─── PRODUCT CARD ──────────────────────────────────────────── */
function ProductCard({ item, index }: { item: (typeof PRODUCTS)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div ref={ref} initial={{opacity:0,y:40}} animate={inView?{opacity:1,y:0}:{opacity:0,y:40}}
      transition={{duration:0.65,delay:index*0.1,ease:EASE}} onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)}
      className="flex-shrink-0 bg-white rounded-xl border border-gray-100 p-4 cursor-pointer"
      style={{minWidth:360,boxShadow:hovered?"0 8px 30px rgba(0,0,0,0.1)":"0 2px 6px rgba(0,0,0,0.04)",transition:"box-shadow 0.3s"}}>
      <div className="overflow-hidden rounded-lg mb-5 h-80" style={{aspectRatio:"1"}}>
        <motion.img src={item.img} alt={item.name} className="w-full h-full object-cover rounded-lg"
          animate={{scale:hovered?1.06:1}} transition={{duration:0.65,ease:EASE}} style={{willChange:"transform"}}/>
      </div>
      <div className="px-2">
        <h4 className="font-serif text-xl text-gray-800 mb-1">{item.name}</h4>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-base" style={{color:"#064e3b"}}>{item.price}</span>
          <motion.button whileTap={{scale:0.88}} transition={{type:"spring",stiffness:320,damping:18}}
            className="text-base font-semibold" style={{background:"none",border:"none",cursor:"pointer",color:"#064e3b"}}>{products.buttonText}</motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── FEATURE ITEM ──────────────────────────────────────────── */
function FeatureItem({ item, index }: { item: (typeof FEATURES)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.3 });
  return (
    <motion.div ref={ref} initial={{opacity:0,y:30}} animate={inView?{opacity:1,y:0}:{opacity:0,y:30}}
      transition={{duration:0.65,delay:index*0.1,ease:EASE}} className="text-center">
      <span className="text-4xl block mb-3" style={{color:"#065f46"}}>{item.icon}</span>
      <h5 className="font-semibold text-sm text-gray-800 mb-1">{item.title}</h5>
      <p className="text-gray-500 text-xs">{item.desc}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function ClientAppreciation() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start","end start"] });
  const textY       = useTransform(scrollYProgress, [0,1], ["0%","18%"]);
  const heroOpacity = useTransform(scrollYProgress, [0,0.75], [1,0]);
  const springTxt   = useSpring(textY, { stiffness:80, damping:25 });

  const { ref:aboutTiltRef, springX:atX, springY:atY, onMouseMove:atMM, onMouseLeave:atML } = useTilt(6);
  const aboutRef = useRef<HTMLElement>(null);
  const catRef   = useRef<HTMLElement>(null);
  const custRef  = useRef<HTMLElement>(null);
  const ctaRef   = useRef<HTMLElement>(null);
  const aboutInView = useInView(aboutRef, { once:false, amount:0.2 });
  const catInView   = useInView(catRef,   { once:false, amount:0.15 });
  const custInView  = useInView(custRef,  { once:false, amount:0.15 });
  const ctaInView   = useInView(ctaRef,   { once:false, amount:0.3 });

  return (
    <div className="overflow-x-hidden" style={{fontFamily:"inherit",background:"#f7f4ef"}}>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative flex items-center justify-center overflow-hidden"
        style={{minHeight:"100vh",background:"#000008",position:"relative"}}>

        {/* Gifting Canvas */}
        <GiftingCanvas />

        {/* Diagonal accent lines */}
        {[...Array(5)].map((_,i)=>(
          <motion.div key={i} style={{
            position:"absolute",width:"100%",height:1,
            top:`${18+i*15}%`,transform:`rotate(${-14+i*1.8}deg)`,
            background:"linear-gradient(90deg,transparent,rgba(201,169,110,0.14),transparent)",
            zIndex:2,pointerEvents:"none",
          }} initial={{scaleX:0,opacity:0}} animate={{scaleX:1,opacity:1}} transition={{duration:2,delay:0.5+i*0.12}}/>
        ))}

        {/* Vignette */}
        <div style={{position:"absolute",inset:0,
          background:"radial-gradient(ellipse at center,transparent 18%,rgba(0,0,8,0.75) 100%)",
          zIndex:3,pointerEvents:"none"}}/>

        {/* Hero text */}
        <motion.div style={{y:springTxt,opacity:heroOpacity,willChange:"transform",
          position:"relative",zIndex:5,textAlign:"center",padding:"0 2rem",pointerEvents:"none"}}>

          <motion.p initial={{opacity:0,y:-20,letterSpacing:"0.05em"}} animate={{opacity:1,y:0,letterSpacing:"0.5em"}}
            transition={{duration:1.2,delay:0.3}}
            style={{fontSize:11,letterSpacing:"0.5em",fontWeight:700,textTransform:"uppercase",
              color:"rgba(201,169,110,0.75)",marginBottom:"1.2rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem"}}>
            <span style={{display:"inline-block",width:36,height:1,background:"rgba(201,169,110,0.55)"}}/>
            {hero.eyebrow}
            <span style={{display:"inline-block",width:36,height:1,background:"rgba(201,169,110,0.55)"}}/>
          </motion.p>

          {/* CLIENT */}
          <div style={{overflow:"hidden",marginBottom:"0.4rem"}}>
            <motion.h1 initial={{y:"110%",opacity:0}} animate={{y:0,opacity:1}}
              transition={{duration:1.1,delay:0.5,ease:EASE}}
              style={{fontSize:"clamp(2.2rem,5vw,5rem)",lineHeight:1.0,fontFamily:"serif",fontWeight:700,
                color:"#fff",margin:0,textShadow:"0 0 60px rgba(201,169,110,0.4)",letterSpacing:"-1px",
                display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4em"}}>
              <motion.span animate={{rotate:[-8,8,-8],scale:[1,1.18,1]}}
                transition={{duration:3.2,repeat:Infinity,ease:"easeInOut"}}
                style={{fontSize:"0.52em",filter:"drop-shadow(0 0 10px rgba(255,215,0,0.8))"}}></motion.span>
              {hero.titleLine1}
            </motion.h1>
          </div>

          {/* APPRECIATION */}
          <div style={{overflow:"hidden",marginBottom:"0.4rem"}}>
            <motion.h1 initial={{y:"110%",opacity:0}} animate={{y:0,opacity:1}}
              transition={{duration:1.1,delay:0.65,ease:EASE}}
              style={{fontSize:"clamp(2.2rem,5vw,5rem)",lineHeight:1.0,fontFamily:"serif",fontWeight:700,
                color:"#fff",margin:0,textShadow:"0 0 60px rgba(201,169,110,0.4)",letterSpacing:"-1px",
                display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4em"}}>
              {hero.titleLine2}
              <motion.span animate={{rotate:[0,360],scale:[1,1.25,1]}}
                transition={{duration:5,repeat:Infinity,ease:"linear"}}
                style={{fontSize:"0.44em",filter:"drop-shadow(0 0 12px rgba(255,215,0,0.9))"}}></motion.span>
            </motion.h1>
          </div>

          {/* GIFTING SOLUTIONS */}
          <div style={{overflow:"hidden",marginBottom:"0.6rem"}}>
            <motion.h1 initial={{y:"110%",opacity:0}} animate={{y:0,opacity:1}}
              transition={{duration:1.1,delay:0.8,ease:EASE}}
              style={{fontSize:"clamp(3rem,8vw,7rem)",lineHeight:1.5,fontFamily:"serif",fontWeight:400,
                fontStyle:"italic",color:"rgba(201,169,110,0.92)",margin:0,
                textShadow:"0 0 80px rgba(201,169,110,0.5)",letterSpacing:"-1px",
                display:"flex",alignItems:"center",justifyContent:"center",gap:"0.35em"}}>
              <motion.span animate={{opacity:[0.4,1,0.4],scale:[0.8,1.35,0.8]}}
                transition={{duration:2.2,repeat:Infinity,ease:"easeInOut",delay:0.4}}
                style={{fontSize:"0.5em",filter:"drop-shadow(0 0 10px rgba(255,200,80,0.9))"}}></motion.span>
              {hero.titleLine3}
              <motion.span animate={{opacity:[0.4,1,0.4],scale:[0.8,1.35,0.8]}}
                transition={{duration:2.2,repeat:Infinity,ease:"easeInOut",delay:1.1}}
                style={{fontSize:"0.5em",filter:"drop-shadow(0 0 10px rgba(255,200,80,0.9))"}}></motion.span>
            </motion.h1>
          </div>

          <motion.p initial={{opacity:0,y:24,filter:"blur(8px)"}} animate={{opacity:1,y:0,filter:"blur(0px)"}}
            transition={{duration:0.9,delay:1.05}}
            style={{color:"rgba(220,200,160,0.72)",maxWidth:520,margin:"0 auto",fontSize:"1.1rem",fontWeight:300,lineHeight:1.7}}>
            {hero.intro}
          </motion.p>

          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.3,duration:0.7}}
            style={{display:"flex",flexWrap:"wrap",gap:"1.2rem",marginTop:"0.6rem",justifyContent:"center",pointerEvents:"none"}}>
            {hero.tags.map(t=>({icon:t.symbol,label:t.label}))
              .map(({icon,label},i)=>(
              <motion.span key={label} animate={{opacity:[0.3,0.78,0.3]}}
                transition={{duration:3.5+i*0.5,repeat:Infinity,delay:i*0.35}}
                style={{fontSize:9,letterSpacing:"0.22em",fontWeight:700,textTransform:"uppercase",
                  color:"rgba(201,169,110,0.55)",display:"flex",alignItems:"center",gap:"0.4em"}}>
                <span style={{fontSize:13}}>{icon}</span>{label}
              </motion.span>
            ))}
          </motion.div>

          <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:1.2}}
            style={{display:"flex",gap:"1rem",marginTop:"1.5rem",flexWrap:"wrap",justifyContent:"center",pointerEvents:"all"}}>
            <motion.button whileHover={{scale:1.05,y:-2,boxShadow:"0 12px 40px rgba(201,169,110,0.5)"}}
              whileTap={{scale:0.96}} transition={{type:"spring",stiffness:300,damping:18}}
              style={{background:"linear-gradient(135deg,#b5862a,#e8c882,#b5862a)",color:"#1a0e00",
                padding:"14px 40px",borderRadius:30,fontWeight:800,fontSize:13,letterSpacing:"0.15em",
                textTransform:"uppercase",border:"none",cursor:"pointer",
                boxShadow:"0 0 24px rgba(201,169,110,0.4)",display:"flex",alignItems:"center",gap:"0.5rem"}}>
              <span></span> {hero.primaryButton}
            </motion.button>
            <motion.button whileHover={{scale:1.04,y:-2}} whileTap={{scale:0.96}}
              transition={{type:"spring",stiffness:300,damping:18}}
              onClick={()=>{window.location.href="/contact";}}
              style={{background:"rgba(201,169,110,0.08)",backdropFilter:"blur(8px)",
                border:"1px solid rgba(201,169,110,0.38)",color:"#e8c882",padding:"14px 40px",
                borderRadius:30,fontWeight:700,fontSize:13,letterSpacing:"0.15em",
                textTransform:"uppercase",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.5rem"}}>
              <span>💼</span> {hero.secondaryButton}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2.2,duration:0.8}}
          style={{position:"absolute",bottom:"2rem",left:"50%",transform:"translateX(-50%)",
            zIndex:5,display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem",pointerEvents:"none"}}>
          <span style={{color:"rgba(201,169,110,0.4)",fontSize:9,letterSpacing:"0.3em",fontWeight:700,textTransform:"uppercase"}}>{hero.scrollLabel}</span>
          <motion.div animate={{y:[0,8,0]}} transition={{duration:1.5,repeat:Infinity,ease:"easeInOut"}}
            style={{width:1,height:28,background:"linear-gradient(to bottom,rgba(201,169,110,0.8),transparent)"}}/>
        </motion.div>
      </section>

      {/* ══ ABOUT ═════════════════════════════════════════════ */}
      <section ref={aboutRef} className="py-16 px-8 md:px-20 lg:px-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div initial={{opacity:0,scale:0.82}} animate={aboutInView?{opacity:1,scale:1}:{opacity:0,scale:0.82}}
            transition={{duration:0.85,ease:EASE}} style={{perspective:"1200px"}}>
            <motion.div ref={aboutTiltRef} onMouseMove={atMM} onMouseLeave={atML}
              style={{rotateX:atX,rotateY:atY,transformStyle:"preserve-3d",willChange:"transform"}}>
              <img src={asset(about.image)} alt={about.imageAlt}
                className="w-full rounded-2xl shadow-2xl" style={{aspectRatio:"4/5",objectFit:"cover"}}/>
            </motion.div>
          </motion.div>
          <motion.div variants={vStagger} initial="hidden" animate={aboutInView?"show":"hidden"}>
            <motion.div variants={vFadeUp}>
              <motion.div initial={{scaleX:0}} animate={aboutInView?{scaleX:1}:{scaleX:0}}
                transition={{duration:0.55,ease:EASE}} style={{originX:0,background:"#b5a26a",height:4,width:80,marginBottom:24}}/>
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-4" style={{color:"#065f46"}}>{about.eyebrow}</p>
            </motion.div>
            <motion.h2 variants={vFadeUp} className="text-5xl font-serif leading-tight mb-7">
              {about.titleLine1}<br/>{about.titleLine2}
            </motion.h2>
            <motion.p variants={vFadeUp} className="text-gray-600 text-lg leading-relaxed mb-10">
              {about.text}
            </motion.p>
            <motion.a variants={vFadeUp} whileHover={{x:4,transition:{type:"spring",stiffness:340,damping:22}}}
              className="inline-flex items-center gap-2 font-bold text-[11px] uppercase tracking-widest border-b-2 pb-1 cursor-pointer"
              style={{borderColor:"rgba(0,0,0,0.15)"}}>
              {about.linkText} <ArrowRight size={13}/>
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* ══ CATEGORIES ════════════════════════════════════════ */}
      <section ref={catRef} className="py-16 px-8 md:px-20 lg:px-32 overflow-hidden" style={{background:"#f5f5f4"}}>
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{opacity:0,y:30}} animate={catInView?{opacity:1,y:0}:{opacity:0,y:30}}
            transition={{duration:0.6}} className="text-center mb-8">
            <h2 className="text-5xl font-serif text-gray-900 mb-4">{collections.title}</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">{collections.intro}</p>
          </motion.div>
          <motion.div variants={vStagger} initial="hidden" animate={catInView?"show":"hidden"}
            className="grid grid-cols-1 md:grid-cols-3 gap-8" style={{perspective:"1600px"}}>
            {CATEGORIES.map((item,i)=><CategoryCard key={item.name} item={item} index={i}/>)}
          </motion.div>
        </div>
      </section>

      {/* ══ PRODUCTS ══════════════════════════════════════════ */}
      <section className="py-16 px-8 md:px-20 lg:px-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}}
            viewport={{once:false,amount:0.3}} transition={{duration:0.6}}
            className="flex justify-between items-end mb-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-3" style={{color:"#065f46"}}>{products.eyebrow}</p>
              <h2 className="text-5xl font-serif">{products.title}</h2>
            </div>
            <motion.a whileHover={{y:-1}} className="font-bold text-xs uppercase tracking-widest border-b-2 pb-1 cursor-pointer" style={{borderColor:"#b5a26a"}}>{products.viewAllText}</motion.a>
          </motion.div>
          <div className="flex gap-6 overflow-x-auto pb-4"
            style={{scrollSnapType:"x mandatory",msOverflowStyle:"none",scrollbarWidth:"none"} as React.CSSProperties}>
            {PRODUCTS.map((p,i)=><ProductCard key={p.name} item={p} index={i}/>)}
          </div>
        </div>
      </section>

      {/* ══ CUSTOMIZATION ═════════════════════════════════════ */}
      <section ref={custRef} className="py-16 px-8 md:px-20 lg:px-32 overflow-hidden" style={{background:"#1c1917"}}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div variants={vSlideLeft} initial="hidden" animate={custInView?"show":"hidden"}>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold mb-4" style={{color:"rgba(181,162,106,0.7)"}}>{personalization.eyebrow}</p>
            <h2 className="text-5xl font-serif text-white leading-tight mb-14">
              {personalization.titleLine1}<br/>
              <em style={{color:"#4ade80",fontStyle:"italic",fontWeight:400}}>{personalization.titleHighlight}</em>
            </h2>
            <motion.div variants={vStagger} initial="hidden" animate={custInView?"show":"hidden"} className="space-y-10">
              {CUSTOM_ITEMS.map(item=>(
                <motion.div key={item.title} variants={vFadeUp} className="flex gap-6">
                  <div className="flex-shrink-0 flex items-center justify-center text-xl"
                    style={{width:48,height:48,borderRadius:"50%",background:"#292524",color:"#4ade80"}}>{item.icon}</div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">{item.title}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed font-light">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div variants={vSlideRight} initial="hidden" animate={custInView?"show":"hidden"} style={{position:"relative"}}>
            <div className="absolute -inset-4 rounded-2xl" style={{background:"rgba(6,78,59,0.2)",filter:"blur(40px)"}}/>
            <div className="relative overflow-hidden rounded-2xl">
              <img src={asset(personalization.image)}
                alt={personalization.imageAlt} className="w-full rounded-2xl" style={{filter:"grayscale(0.55)",transition:"filter 1s"}}
                onMouseEnter={e=>{(e.currentTarget as HTMLImageElement).style.filter="grayscale(0)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLImageElement).style.filter="grayscale(0.55)";}}/>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════ */}
      <section className="py-32 px-8 md:px-20 lg:px-32 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10">
          {FEATURES.map((f,i)=><FeatureItem key={f.title} item={f} index={i}/>)}
        </div>
      </section>

      {/* ══ SOCIAL PROOF ══════════════════════════════════════ */}
      {clients.length > 0 && (
      <section className="py-14 px-8 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:false,amount:0.5}}
            className="text-center text-[9px] uppercase tracking-[0.3em] font-bold text-gray-400 mb-10">
            {trustedBy.title}
          </motion.p>
          <motion.div initial={{opacity:0}} whileInView={{opacity:0.4}} viewport={{once:false,amount:0.5}}
            transition={{duration:0.6}} className="flex flex-wrap justify-center gap-16 grayscale">
            {clients.map(c => c.logo
              ? <img key={c.name} src={c.logo} alt={c.name} style={{ height: 32, objectFit: 'contain' }} />
              : <span key={c.name} className="font-serif text-xl font-bold text-gray-800">{c.name}</span>)}
          </motion.div>
        </div>
      </section>
      )}

      {/* ══ FINAL CTA ═════════════════════════════════════════ */}
      <section ref={ctaRef} className="py-24 px-8 md:px-20 lg:px-32 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{opacity:0,y:30}} animate={ctaInView?{opacity:1,y:0}:{opacity:0,y:30}}
            transition={{duration:0.75,ease:EASE}}
            className="rounded-3xl text-center relative overflow-hidden px-12 py-20" style={{background:"#ecfdf5"}}>
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
              style={{background:"rgba(187,247,208,0.35)",filter:"blur(40px)"}}/>
            <div className="relative z-10">
              <motion.h2 initial={{opacity:0,y:20}} animate={ctaInView?{opacity:1,y:0}:{opacity:0,y:20}}
                transition={{duration:0.85,ease:EASE}}
                className="font-serif text-4xl md:text-5xl leading-tight mb-5" style={{color:"#022c22"}}>
                {cta.titleLine1}<br/>
                <span className="italic font-normal">{cta.titleHighlight}</span> {cta.titleEnd}
              </motion.h2>
              <motion.p initial={{opacity:0,y:16}} animate={ctaInView?{opacity:1,y:0}:{opacity:0,y:16}}
                transition={{duration:0.6,delay:0.15}}
                className="text-gray-600 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                {cta.text}
              </motion.p>
              <motion.div initial={{opacity:0,y:16}} animate={ctaInView?{opacity:1,y:0}:{opacity:0,y:16}}
                transition={{duration:0.6,delay:0.28}} className="flex flex-col sm:flex-row justify-center gap-5">
                <motion.button whileHover={{scale:1.06,y:-3,boxShadow:"0 16px 48px rgba(6,78,59,0.35)"}}
                  whileTap={{scale:0.96}} transition={{type:"spring",stiffness:300,damping:18}}
                  className="text-white px-12 py-5 rounded-lg font-bold uppercase tracking-[0.2em] text-xs shadow-xl"
                  style={{background:"#064e3b"}}>{cta.primaryButton}</motion.button>
                <motion.button whileHover={{y:-2}} transition={{type:"spring",stiffness:400,damping:20}}
                  className="border-b-2 text-sm font-bold uppercase tracking-[0.2em] pb-1 transition-colors"
                  style={{borderColor:"#d1d5db"}}>{cta.secondaryButton}</motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}