import React from "react";
import { seeded } from "./DiwaliDecor";

/* ============================
   New Year decorations: starfield, falling confetti and the order-deadline
   countdown. Purely decorative pieces are aria-hidden with no pointer
   events. They reuse the dw-* keyframes in index.css, which already stop
   for visitors who prefer reduced motion.
============================ */

export const NY = {
  night: "#0E1A0B",
  forest: "#15260F",
  deep: "#1F3A16",
  gold: "#E6C77A",
  goldDeep: "#B8934A",
  ivory: "#F8F5EE",
  ink: "#17220F",
  muted: "#4E5A45",
};

export const goldText = "bg-gradient-to-r from-[#F3E3B3] via-[#E6C77A] to-[#C9A45C] bg-clip-text text-transparent";

/** Champagne, silver and leaf-green bursts (green from the Ecotwist logo) for the shared canvas Fireworks. */
export const NEW_YEAR_FIREWORKS = ["#E6C77A", "#F3E3B3", "#C0C7D6", "#FFFFFF", "#68A02F", "#A8CF6B"];
export const NEW_YEAR_WILLOW = "#E6C77A";

/* ── Stars ──────────────────────────────────────────────────── */

const starRand = seeded(2027);
const STARS = Array.from({ length: 60 }, () => ({
  left: starRand() * 100,
  top: starRand() * 70,
  size: 1 + starRand() * 1.8,
  delay: -starRand() * 4,
  duration: 2 + starRand() * 3,
}));

export function StarField({ count = 60 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {STARS.slice(0, count).map((s, i) => (
        <span
          key={i}
          className="dw-bulb absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size,
            animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Confetti ───────────────────────────────────────────────── */

const confettiRand = seeded(31);
const CONFETTI_COLORS = ["#E6C77A", "#F3E3B3", "#C0C7D6", "#FFFFFF", "#A8CF6B"];
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: confettiRand() * 100,
  width: 4 + confettiRand() * 5,
  height: 8 + confettiRand() * 8,
  round: confettiRand() < 0.3,
  duration: 9 + confettiRand() * 8,
  delay: -confettiRand() * 17,
  drift: (confettiRand() - 0.5) * 160,
  rotate: confettiRand() * 360,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

/** Gold and silver confetti drifting down; hidden for reduced motion (dw-petal). */
export function Confetti({ count = 22 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI.slice(0, count).map((c, i) => (
        <span
          key={i}
          className="dw-petal absolute top-0"
          style={{
            left: `${c.left}%`, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s`,
            "--dw-drift": `${c.drift}px`,
          } as React.CSSProperties}
        >
          <span
            className="block"
            style={{
              width: c.round ? c.width + 2 : c.width,
              height: c.round ? c.width + 2 : c.height,
              borderRadius: c.round ? "50%" : 1,
              background: c.color,
              opacity: 0.85,
              transform: `rotate(${c.rotate}deg)`,
            }}
          />
        </span>
      ))}
    </div>
  );
}

/* ── Gold rule with a small star, used in section headings ──── */

export function StarMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={`h-3.5 w-3.5 shrink-0 ${className}`}>
      <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="currentColor" />
    </svg>
  );
}

/* ── Order deadline ─────────────────────────────────────────── */

/**
 * Whole days left until the end of `date` (YYYY-MM-DD) in India time,
 * or null once it has passed or when the date is missing/invalid.
 */
export function daysUntil(date: string, now = new Date()): number | null {
  const end = new Date(`${date}T23:59:59+05:30`);
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - now.getTime();
  if (ms < 0) return null;
  return Math.ceil(ms / 86_400_000);
}

/** "12 December" from "2026-12-12". */
export function formatDeadline(date: string) {
  const d = new Date(`${date}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
}

export function DeadlineBadge({ label, date, text, passedText, dark = true }: {
  label: string; date: string; text: string; passedText: string; dark?: boolean;
}) {
  const days = daysUntil(date);
  const tone = dark
    ? "border-[#E6C77A]/45 bg-white/[0.06] text-white"
    : "border-[#B8934A]/40 bg-white text-[#17220F]";

  if (days === null) {
    return (
      <div className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur-sm ${tone}`}>
        <StarMark className="text-[#E6C77A]" />
        <span>{passedText}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 backdrop-blur-sm ${tone}`}>
      <span className="flex items-baseline gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${dark ? "text-[#E6C77A]" : "text-[#B8934A]"}`}>{label}</span>
        <span className="font-serif text-xl">{formatDeadline(date)}</span>
      </span>
      <span className={`hidden h-6 w-px sm:block ${dark ? "bg-white/20" : "bg-[#17220F]/15"}`} />
      <span className={`text-sm ${dark ? "text-white/75" : "text-[#4E5A45]"}`}>
        {text}
        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${dark ? "bg-[#E6C77A] text-[#0E1A0B]" : "bg-[#17220F] text-white"}`}>
          {days === 1 ? "Last day" : `${days} days left`}
        </span>
      </span>
    </div>
  );
}
