import React, { useEffect, useId, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/* ============================
   Diwali decorations: series lights, marigold toran, diyas,
   rangoli and fireworks. All purely decorative (aria-hidden,
   no pointer events); keyframes live in index.css (dw-*).
============================ */

const svgId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, "");

/* ── Series lights (jhalar) ─────────────────────────────────── */

const BULB_COLORS = {
  multi: ["#FF3B3B", "#FFC83D", "#22C55E", "#3D8BFF", "#FF4FB0", "#FF8A1F"],
  warm: ["#FFC94D", "#FFB13B", "#FFE08A"],
};

const LIGHTS_WIDTH = 2560;
const SCALLOP = 160;
const SAG = 26;
const WIRE_Y = 6;
const BULBS_PER_SCALLOP = 5;

const scallopStarts = Array.from({ length: LIGHTS_WIDTH / SCALLOP }, (_, s) => s * SCALLOP);
const wirePath = scallopStarts
  .map((x) => `M${x} ${WIRE_Y} Q${x + SCALLOP / 2} ${WIRE_Y + 2 * SAG} ${x + SCALLOP} ${WIRE_Y}`)
  .join(" ");
const drapeBulbs = scallopStarts.flatMap((x0) =>
  Array.from({ length: BULBS_PER_SCALLOP }, (_, b) => {
    const t = (b + 0.5) / BULBS_PER_SCALLOP;
    return { x: x0 + SCALLOP * t, y: WIRE_Y + 4 * SAG * t * (1 - t) };
  })
);

function Bulb({ x, y, gradient, color, delay, duration }: {
  x: number; y: number; gradient: string; color: string; delay: string; duration: string;
}) {
  return (
    <g className="dw-bulb" style={{ animationDelay: delay, animationDuration: duration }}>
      <circle cx={x} cy={y + 8} r={10} fill={`url(#${gradient})`} />
      <rect x={x - 1.6} y={y} width={3.2} height={3.6} rx={0.6} fill="#3a3328" />
      <ellipse cx={x} cy={y + 8} rx={3.4} ry={4.6} fill={color} />
      <ellipse cx={x - 1} cy={y + 6.4} rx={0.9} ry={1.5} fill="#fff" opacity={0.75} />
    </g>
  );
}

/** A sagging string of twinkling bulbs. Zero height: it hangs over whatever follows it. */
export function SeriesLights({ variant = "multi", className = "" }: { variant?: "multi" | "warm"; className?: string }) {
  const id = svgId(useId());
  const colors = BULB_COLORS[variant];
  const chase = variant === "multi";

  return (
    <div aria-hidden className={`pointer-events-none relative z-30 h-0 ${className}`}>
      {/* content-visibility: off-screen strings skip their twinkle animations entirely */}
      <div className="absolute inset-x-0 top-0 h-[60px] overflow-hidden [content-visibility:auto]">
        <svg
          width={LIGHTS_WIDTH}
          height={60}
          viewBox={`0 0 ${LIGHTS_WIDTH} 60`}
          className="absolute left-1/2 top-0 max-w-none -translate-x-1/2"
        >
          <defs>
            {colors.map((c, k) => (
              <radialGradient key={c} id={`${id}-g${k}`}>
                <stop offset="0" stopColor={c} stopOpacity={0.7} />
                <stop offset="1" stopColor={c} stopOpacity={0} />
              </radialGradient>
            ))}
          </defs>
          <path d={wirePath} fill="none" stroke="#4b4032" strokeOpacity={0.5} strokeWidth={1.2} />
          {scallopStarts.map((x) => (
            <circle key={x} cx={x} cy={WIRE_Y} r={2} fill="#4b4032" opacity={0.6} />
          ))}
          {drapeBulbs.map((b, i) => (
            <Bulb
              key={i}
              x={b.x}
              y={b.y}
              color={colors[i % colors.length]}
              gradient={`${id}-g${i % colors.length}`}
              // multi: classic 3-phase "running" lights; warm: gentle random twinkle
              delay={chase ? `${-(i % 3) * 0.5}s` : `${-((i * 37) % 23) / 10}s`}
              duration={chase ? "1.5s" : "2.4s"}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ── Vertical light strings for the hero edges ─────────────── */

const CURTAIN = [
  // hugs the screen edge on phones so the bulbs stay clear of the text
  { offset: "clamp(-4px, calc(1.5% - 10px), 24px)", length: 330, cls: "" },
  { offset: "4%", length: 230, cls: "hidden sm:block" },
  { offset: "6.5%", length: 150, cls: "hidden md:block" },
];

export function LightCurtain({ side, top = 64 }: { side: "left" | "right"; top?: number }) {
  const id = svgId(useId());
  const colors = BULB_COLORS.multi;

  return (
    <>
      {CURTAIN.map((string, s) => {
        const count = Math.floor((string.length - 8) / 24);
        return (
          <div
            key={s}
            aria-hidden
            className={`pointer-events-none absolute ${string.cls}`}
            style={{ top, [side]: string.offset }}
          >
            <div className="dw-sway" style={{ animationDuration: `${5 + s}s`, animationDelay: `${-s * 1.3}s` }}>
              <svg width={20} height={string.length} viewBox={`0 0 20 ${string.length}`} className="overflow-visible">
                <defs>
                  {colors.map((c, k) => (
                    <radialGradient key={c} id={`${id}-${s}-g${k}`}>
                      <stop offset="0" stopColor={c} stopOpacity={0.7} />
                      <stop offset="1" stopColor={c} stopOpacity={0} />
                    </radialGradient>
                  ))}
                </defs>
                <line x1={10} y1={0} x2={10} y2={string.length - 12} stroke="#4b4032" strokeOpacity={0.45} strokeWidth={1.1} />
                {Array.from({ length: count }, (_, k) => {
                  const c = (k + s * 2) % colors.length;
                  return (
                    <Bulb
                      key={k}
                      x={10}
                      y={8 + k * 24}
                      color={colors[c]}
                      gradient={`${id}-${s}-g${c}`}
                      // lights "pour" down the string
                      delay={`${-(1.8 - ((k * 0.15) % 1.8)).toFixed(2)}s`}
                      duration="1.8s"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── Marigold toran (bandhanwar) ────────────────────────────── */

const TORAN_WIDTH = 3200;
const TORAN_UNIT = 200;
const TORAN_SAG = 24;
const toranUnits = Array.from({ length: TORAN_WIDTH / TORAN_UNIT }, (_, u) => u * TORAN_UNIT);
const mangoLeaves = Array.from({ length: TORAN_WIDTH / 25 }, (_, k) => 12.5 + k * 25);
const garlandFlowers = toranUnits.flatMap((x0) =>
  Array.from({ length: 16 }, (_, j) => {
    const t = (j + 0.5) / 16;
    return { x: x0 + TORAN_UNIT * t, y: 6 + 4 * TORAN_SAG * t * (1 - t), yellow: Math.floor(j / 4) % 2 === 1 };
  })
);

function Marigold({ id, petal, edge, inner, innerEdge, core }: Record<string, string>) {
  return (
    <g id={id}>
      <circle r={7} fill={petal} />
      <circle r={7} fill="none" stroke={edge} strokeWidth={2.2} strokeDasharray="1.6 1.4" />
      <circle r={4.2} fill={inner} />
      <circle r={4.2} fill="none" stroke={innerEdge} strokeWidth={1.2} strokeDasharray="1 1.2" opacity={0.7} />
      <circle r={1.6} fill={core} />
    </g>
  );
}

/** Mango leaves + scalloped marigold garland with hanging strands and bells. */
export function MarigoldToran({ top = 64, className = "" }: { top?: number; className?: string }) {
  const id = svgId(useId());
  const orange = `${id}-o`;
  const yellow = `${id}-y`;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-x-0 h-[90px] overflow-hidden ${className}`} style={{ top }}>
      <svg
        width={TORAN_WIDTH}
        height={90}
        viewBox={`0 0 ${TORAN_WIDTH} 90`}
        className="absolute left-1/2 top-0 max-w-none -translate-x-1/2 origin-top scale-[.62] sm:scale-[.8] lg:scale-100"
      >
        <defs>
          <Marigold id={orange} petal="#F97316" edge="#EA580C" inner="#FB923C" innerEdge="#C2410C" core="#9A3412" />
          <Marigold id={yellow} petal="#FBBF24" edge="#F59E0B" inner="#FCD34D" innerEdge="#D97706" core="#B45309" />
        </defs>

        <line x1={0} y1={3} x2={TORAN_WIDTH} y2={3} stroke="#8B5E34" strokeWidth={2} />

        {mangoLeaves.map((x, k) => (
          <g key={x} transform={`translate(${x} 3) rotate(${k % 2 ? 7 : -7})`}>
            <path d="M0 0 C7 6 7 20 0 27 C-7 20 -7 6 0 0 Z" fill={k % 2 ? "#5A9E2F" : "#3F7D20"} />
            <line x1={0} y1={2} x2={0} y2={24} stroke="#2F5E17" strokeWidth={0.8} />
          </g>
        ))}

        {toranUnits.map((x) => (
          <g key={x}>
            <line x1={x} y1={6} x2={x} y2={54} stroke="#8B5E34" strokeWidth={1.2} />
            {[14, 26, 38, 50].map((y, k) => (
              <use key={y} href={`#${k % 2 ? yellow : orange}`} x={x} y={y} transform={`translate(${x} ${y}) scale(.85) translate(${-x} ${-y})`} />
            ))}
            <g transform={`translate(${x} 66)`}>
              <path d="M-5 0 Q-5 -9 0 -9 Q5 -9 5 0 L6.5 2 L-6.5 2 Z" fill="#D4A017" stroke="#9A7310" strokeWidth={0.8} />
              <circle cy={3.6} r={1.6} fill="#9A7310" />
            </g>
          </g>
        ))}

        {garlandFlowers.map((f, i) => (
          <use key={i} href={`#${f.yellow ? yellow : orange}`} x={f.x} y={f.y} />
        ))}
      </svg>
    </div>
  );
}

/** "Shubh Deepavali" plaque hanging from the toran. */
export function ToranGreeting({ top = 64, left = "64%" }: { top?: number; left?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute hidden -translate-x-1/2 md:block" style={{ top, left }}>
      <div className="dw-sway flex flex-col items-center" style={{ animationDuration: "6s" }}>
        <div className="flex w-24 justify-between px-3">
          <span className="h-9 w-px bg-[#8B5E34]" />
          <span className="h-9 w-px bg-[#8B5E34]" />
        </div>
        <div
          className="rounded-md border-2 border-[#E9C46A] bg-gradient-to-b from-[#B91C1C] to-[#7F1D1D] px-5 py-1.5 shadow-lg"
          style={{ fontFamily: '"Tiro Devanagari Hindi", "Nirmala UI", "Mangal", serif' }}
        >
          <span className="whitespace-nowrap text-lg text-[#FDE68A] lg:text-xl">शुभ दीपावली</span>
        </div>
        <span className="mt-1 h-2.5 w-2.5 rotate-45 bg-[#E9C46A]" />
      </div>
    </div>
  );
}

/* ── Akash kandil (hanging star lantern) ────────────────────── */

const KANDIL_COLORS = { rani: ["#DB2777", "#F97316"], marigold: ["#F59E0B", "#DC2626"] };

export function Kandil({ className = "", style, string = 60, width = 56, delay = 0, palette = "rani" }: {
  className?: string; style?: React.CSSProperties; string?: number; width?: number; delay?: number;
  palette?: keyof typeof KANDIL_COLORS;
}) {
  const id = svgId(useId());
  const [top, bottom] = KANDIL_COLORS[palette];

  return (
    <div aria-hidden className={`pointer-events-none ${className}`} style={style}>
      <div className="dw-sway flex flex-col items-center" style={{ animationDuration: "5.5s", animationDelay: `${-delay}s` }}>
        <span className="w-px bg-[#E9C46A]/70" style={{ height: string }} />
        <svg viewBox="0 0 60 112" width={width} className="overflow-visible">
          <defs>
            <radialGradient id={`${id}-glow`}>
              <stop offset="0" stopColor="#FFB347" stopOpacity={0.7} />
              <stop offset="1" stopColor="#FFB347" stopOpacity={0} />
            </radialGradient>
            <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={top} />
              <stop offset="1" stopColor={bottom} />
            </linearGradient>
          </defs>
          <circle className="dw-glow" cx={30} cy={40} r={42} fill={`url(#${id}-glow)`} />
          <rect x={24} y={0} width={12} height={5} rx={1.5} fill="#E9C46A" />
          <polygon points="30,5 54,22 54,56 30,73 6,56 6,22" fill={`url(#${id}-body)`} stroke="#E9C46A" strokeWidth={1.6} />
          <path d="M30 5 V73 M6 22 L54 56 M54 22 L6 56" stroke="#E9C46A" strokeWidth={0.8} opacity={0.6} />
          <path d="M30 25 L39 41 H21 Z M30 47 L21 31 H39 Z" fill="#FFE8A3" opacity={0.95} />
          <circle cx={30} cy={36} r={3} fill="#fff" opacity={0.9} />
          {[-10, -5, 0, 5, 10].map((dx, i) => (
            <path key={dx} d={`M30 73 Q${30 + dx * 0.6} 88 ${30 + dx} 108`} stroke={i % 2 ? "#E9C46A" : top}
              strokeWidth={2.2} fill="none" strokeLinecap="round" />
          ))}
          <circle cx={30} cy={75} r={2.6} fill="#E9C46A" />
        </svg>
      </div>
    </div>
  );
}

/* ── Falling marigold & rose petals ─────────────────────────── */

// Seeded random numbers, so scattered decorations keep the same places on every render
export const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const petalRand = seeded(7);
const PETAL_COLORS = ["#F97316", "#FBBF24", "#DB2777", "#F59E0B"];
const PETALS = Array.from({ length: 24 }, (_, i) => ({
  left: petalRand() * 100,
  size: 8 + petalRand() * 8,
  duration: 10 + petalRand() * 8,
  delay: -petalRand() * 18,
  drift: (petalRand() - 0.5) * 140,
  rotate: petalRand() * 360,
  color: PETAL_COLORS[i % PETAL_COLORS.length],
}));

export function PetalShower({ count = 18, className = "" }: { count?: number; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {PETALS.slice(0, count).map((p, i) => (
        <span
          key={i}
          className="dw-petal absolute top-0"
          style={{
            left: `${p.left}%`, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
            "--dw-drift": `${p.drift}px`,
          } as React.CSSProperties}
        >
          <svg width={p.size} height={p.size * 1.4} viewBox="0 0 10 14" style={{ transform: `rotate(${p.rotate}deg)` }}>
            <path d="M5 0 C9 4 9 10 5 14 C1 10 1 4 5 0 Z" fill={p.color} opacity={0.85} />
          </svg>
        </span>
      ))}
    </div>
  );
}

/* ── Jaali (lattice) pattern ────────────────────────────────── */

/** Gold jaali pattern laid over the dark festive backgrounds. */
export function Jaali({ opacity = 0.07 }: { opacity?: number }) {
  const id = svgId(useId());
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width={56} height={56} patternUnits="userSpaceOnUse">
          <rect x={16} y={16} width={24} height={24} fill="none" stroke="#E9C46A" strokeWidth={1} />
          <rect x={16} y={16} width={24} height={24} fill="none" stroke="#E9C46A" strokeWidth={1} transform="rotate(45 28 28)" />
          <circle cx={28} cy={28} r={4} fill="none" stroke="#E9C46A" strokeWidth={1} />
          {[[0, 0], [56, 0], [0, 56], [56, 56]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2.5} fill="#E9C46A" />)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ── Diyas ──────────────────────────────────────────────────── */

export function Diya({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  const id = svgId(useId());
  const timing = { animationDelay: `${-delay}s` };

  return (
    <svg viewBox="0 0 64 60" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#FFC94D" stopOpacity={0.75} />
          <stop offset="1" stopColor="#FFC94D" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF8D6" />
          <stop offset="0.45" stopColor="#FFD45C" />
          <stop offset="1" stopColor="#FF7A1A" />
        </linearGradient>
        <linearGradient id={`${id}-clay`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9622B" />
          <stop offset="1" stopColor="#8A3412" />
        </linearGradient>
      </defs>
      <circle className="dw-glow" style={timing} cx={32} cy={19} r={20} fill={`url(#${id}-glow)`} />
      <g className="dw-flame" style={timing}>
        <path d="M32 4 C38 13 39 20 32 27 C25 20 26 13 32 4 Z" fill={`url(#${id}-flame)`} />
        <path d="M32 13 C34.6 17 34.6 21 32 24.5 C29.4 21 29.4 17 32 13 Z" fill="#FFFBEA" opacity={0.85} />
      </g>
      <rect x={31.2} y={26} width={1.6} height={4.5} rx={0.8} fill="#3B2412" />
      <ellipse cx={32} cy={31} rx={25} ry={4.5} fill="#7A2E0E" />
      <ellipse cx={32} cy={31} rx={21} ry={3} fill="#E8A33B" />
      <path d="M7 31 C9 46 22 52 32 52 C42 52 55 46 57 31 C50 35 14 35 7 31 Z" fill={`url(#${id}-clay)`} />
      <path d="M12 38 C22 42 42 42 52 38" stroke="#F6C453" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {[16, 24, 32, 40, 48].map((x) => (
        <circle key={x} cx={x} cy={Math.abs(x - 32) > 10 ? 44 : 45.5} r={1.5} fill="#FDE68A" />
      ))}
      <ellipse cx={32} cy={56} rx={18} ry={2.5} fill="#000" opacity={0.12} />
    </svg>
  );
}

function PetalCluster({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" className={className} aria-hidden>
      <path d="M2 9 C5 4 9 4 11 8 C8 10 5 10 2 9 Z" fill="#4F8A2A" />
      <circle cx={11} cy={7} r={3.2} fill="#F97316" />
      <circle cx={16.5} cy={8.5} r={2.6} fill="#FBBF24" />
      <circle cx={20.5} cy={6} r={1.8} fill="#DB2777" />
    </svg>
  );
}

/** A ledge of lit diyas with marigold petals between them. */
export function DiyaLedge() {
  return (
    <div aria-hidden className="pointer-events-none relative bg-brand-off-white">
      <div className="mx-auto flex max-w-6xl items-end justify-center gap-3 px-4 pt-2 sm:gap-5 lg:gap-8">
        {Array.from({ length: 9 }, (_, i) => (
          <React.Fragment key={i}>
            {i > 0 && <PetalCluster className="mb-1 hidden w-5 sm:block lg:w-6" />}
            <Diya delay={(i * 0.37) % 1.1} className={`w-10 sm:w-12 lg:w-14 ${i % 2 ? "hidden sm:block" : ""}`} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Rangoli ────────────────────────────────────────────────── */

const petalPath = (r0: number, r1: number, w: number) => {
  const shoulder = -(r0 + (r1 - r0) * 0.35);
  return `M0 ${-r0} C${w} ${shoulder} ${w * 0.6} ${-(r1 - 4)} 0 ${-r1} C${-w * 0.6} ${-(r1 - 4)} ${-w} ${shoulder} 0 ${-r0} Z`;
};

const RANGOLI_RINGS = [
  { count: 24, r0: 74, r1: 98, w: 9, colors: ["#F97316", "#DB2777"], offset: 0 },
  { count: 16, r0: 48, r1: 70, w: 10, colors: ["#FACC15", "#16A34A"], offset: 11.25 },
  { count: 8, r0: 20, r1: 42, w: 11, colors: ["#E11D48", "#F59E0B"], offset: 0 },
];

const ringDots = (count: number, r: number, offset = 0) =>
  Array.from({ length: count }, (_, i) => {
    const a = ((i * 360) / count + offset) * (Math.PI / 180);
    return { x: Math.sin(a) * r, y: -Math.cos(a) * r };
  });

/** Slowly turning rangoli mandala. */
export function Rangoli({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-108 -108 216 216" className={`dw-spin pointer-events-none ${className}`} aria-hidden>
      {ringDots(48, 103).map((d, i) => (
        <circle key={`o${i}`} cx={d.x} cy={d.y} r={1.7} fill={i % 2 ? "#16A34A" : "#F97316"} />
      ))}
      {RANGOLI_RINGS.map((ring) =>
        Array.from({ length: ring.count }, (_, i) => (
          <path
            key={`${ring.r0}-${i}`}
            d={petalPath(ring.r0, ring.r1, ring.w)}
            transform={`rotate(${(i * 360) / ring.count + ring.offset})`}
            fill={ring.colors[i % 2]}
            stroke="#fff"
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        ))
      )}
      {ringDots(24, 71, 7.5).map((d, i) => (
        <circle key={`m${i}`} cx={d.x} cy={d.y} r={2.2} fill="#FACC15" />
      ))}
      <circle r={46} fill="none" stroke="#7C3AED" strokeWidth={2.5} />
      <circle r={43} fill="none" stroke="#F97316" strokeWidth={1} strokeDasharray="2 3" />
      <circle r={18} fill="#FDE68A" stroke="#F59E0B" strokeWidth={2} />
      {ringDots(8, 12).map((d, i) => (
        <circle key={`c${i}`} cx={d.x} cy={d.y} r={2} fill="#DB2777" />
      ))}
      <circle r={6} fill="#F97316" />
    </svg>
  );
}

/* ── Fireworks ──────────────────────────────────────────────── */

const FIREWORK_COLORS = ["#F59E0B", "#F97316", "#E11D48", "#DB2777", "#7C3AED", "#2563EB", "#16A34A", "#EAB308"];
const GOLD = "#E8B23A";

interface Spark {
  x: number; y: number; vx: number; vy: number;
  age: number; life: number; color: string; size: number;
  drag: number; gravity: number; flicker: boolean;
}
interface Rocket { x: number; y: number; vx: number; vy: number; ty: number; color: string; }
interface Flash { x: number; y: number; age: number; color: string; }

/**
 * Canvas fireworks. Runs only while on screen and the tab is visible;
 * renders nothing for visitors who prefer reduced motion.
 */
export function Fireworks({ className = "", onDark = false, favourRight = false, colors = FIREWORK_COLORS, gold = GOLD }: {
  className?: string; onDark?: boolean; favourRight?: boolean;
  /** Burst colours and the willow/trail colour. Pass a module-level constant so the effect doesn't restart each render. */
  colors?: string[]; gold?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || reduceMotion) return;

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const flashes: Flash[] = [];
    let w = 0, h = 0, raf = 0, last = 0, nextLaunch = 0.3;
    let visible = false, running = false;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const launch = () => {
      const x = favourRight && Math.random() < 0.65 ? rand(0.52, 0.95) * w : rand(0.06, 0.94) * w;
      // burst in the upper sky, clear of the toran at the very top
      const ty = rand(Math.min(0.15 * h, 150), Math.max(0.2 * h, Math.min(0.4 * h, 400)));
      const time = rand(0.9, 1.25);
      rockets.push({ x, y: h + 10, vx: rand(-20, 20), vy: -(h + 10 - ty) / time, ty, color: pick(colors) });
    };

    const burst = (r: Rocket, n: number, opts: {
      speed: () => number; angle?: (i: number) => number; spark?: (i: number) => Partial<Spark>;
    }) => {
      for (let i = 0; i < n && sparks.length < 700; i++) {
        const a = opts.angle ? opts.angle(i) : Math.random() * Math.PI * 2;
        const v = opts.speed();
        sparks.push({
          x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0,
          life: rand(1.1, 1.6), color: r.color, size: onDark ? 2 : 2.4, drag: 1.6, gravity: 90, flicker: false,
          ...opts.spark?.(i),
        });
      }
    };

    const explode = (r: Rocket) => {
      const base = Math.max(110, Math.min(240, Math.min(w, h) * 0.3));
      const second = pick(colors);
      const kind = Math.random();
      if (kind < 0.25) {
        // golden willow: long, drooping, crackling
        burst(r, 70, {
          speed: () => base * rand(0.35, 1),
          spark: () => ({ color: gold, life: rand(1.8, 2.6), size: onDark ? 1.6 : 2, drag: 1.4, gravity: 110, flicker: true }),
        });
      } else if (kind < 0.5) {
        // ring with a contrasting core
        burst(r, 44, { speed: () => base * 0.85, angle: (i) => (i / 44) * Math.PI * 2 });
        burst(r, 18, { speed: () => base * rand(0.15, 0.35), spark: () => ({ color: second, life: rand(0.8, 1.1) }) });
      } else {
        // two-tone peony
        burst(r, 72, { speed: () => base * rand(0.45, 1), spark: (i) => ({ color: i % 2 ? r.color : second }) });
      }
      flashes.push({ x: r.x, y: r.y, age: 0, color: r.color });
    };

    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      nextLaunch -= dt;
      if (nextLaunch <= 0) {
        launch();
        if (Math.random() < 0.3) launch();
        nextLaunch = rand(0.9, 1.9);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = onDark ? "lighter" : "source-over";
      ctx.lineCap = "round";

      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.age += dt;
        if (f.age > 0.25) { flashes.splice(i, 1); continue; }
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 46);
        g.addColorStop(0, f.color);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.35 * (1 - f.age / 0.25);
        ctx.fillStyle = g;
        ctx.fillRect(f.x - 46, f.y - 46, 92, 92);
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r.x - r.vx * 0.05, r.y - r.vy * 0.05);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
        if (Math.random() < 0.5 && sparks.length < 700) {
          sparks.push({ x: r.x, y: r.y, vx: rand(-15, 15), vy: rand(10, 40), age: 0, life: rand(0.3, 0.5), color: gold, size: 1.2, drag: 2, gravity: 40, flicker: false });
        }
        if (r.y <= r.ty) { explode(r); rockets.splice(i, 1); }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.age += dt;
        if (s.age >= s.life) { sparks.splice(i, 1); continue; }
        const k = Math.exp(-s.drag * dt);
        s.vx *= k;
        s.vy = s.vy * k + s.gravity * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const left = 1 - s.age / s.life;
        let alpha = Math.min(1, left * 2.5);
        if (s.flicker && left < 0.5 && Math.random() < 0.3) alpha *= 0.3;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.x - s.vx * 0.04, s.y - s.vy * 0.04);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const update = () => (visible && !document.hidden ? start() : stop());

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", update);

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [reduceMotion, onDark, favourRight, colors, gold]);

  if (reduceMotion) return null;
  return <canvas ref={ref} aria-hidden className={`pointer-events-none ${className}`} />;
}
