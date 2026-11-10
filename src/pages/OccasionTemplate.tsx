import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowRight, CalendarDays } from "lucide-react";
import OurClients from "../components/client";
import type { OrderProduct } from "./GetProposal";
import { asset } from "../lib/content";

/* ============================
   Shared layout for the newer occasion pages (Women's Day, Christmas,
   Earth Day, Holi, Channel Partners). Each page is one content file in
   src/content/pages/*.json, edited in the admin panel, so a new occasion
   needs a content file and a route in App.tsx, not a new component.
============================ */

export interface OccasionContent {
  _meta: { label: string; route: string };
  theme: { accent: string; dark: string; light: string };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleHighlight: string;
    intro: string;
    when: string;
    primaryButton: string;
    secondaryButton: string;
    image: string;
    imageAlt: string;
  };
  about: { eyebrow: string; title: string; text: string; points: { title: string; text: string }[] };
  kits: {
    eyebrow: string;
    title: string;
    intro: string;
    priceNote: string;
    items: { title: string; audience: string; tag: string; contents: string; price: string; image: string }[];
  };
  personalisation: { eyebrow: string; title: string; items: { symbol: string; title: string; text: string }[] };
  timeline: { eyebrow: string; title: string; steps: { when: string; title: string; text: string }[] };
  cta: { title: string; titleHighlight: string; text: string; primaryButton: string; secondaryButton: string };
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp: Variants = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } } };
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

function Eyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color }}>
      <span className="h-px w-10" style={{ background: color, opacity: 0.5 }} />
      {children}
    </p>
  );
}

export default function OccasionTemplate({ content }: { content: OccasionContent }) {
  const { theme, hero, about, kits, personalisation, timeline, cta } = content;
  const { accent, dark, light } = theme;
  const occasion = content._meta.label;

  // "Get quote" opens the proposal form with the kit filled in
  const order = (kit: OccasionContent["kits"]["items"][number]): { product: OrderProduct } => ({
    product: { name: kit.title, category: occasion, image: kit.image },
  });

  return (
    <div className="overflow-x-hidden" style={{ fontFamily: "Inter" }}>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-5 pb-20 pt-36 text-white sm:px-8 lg:px-12 lg:pb-28 lg:pt-44" style={{ background: dark }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse 60% 55% at 80% 30%, ${accent}40, transparent 65%)` }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp}><Eyebrow color={accent}>{hero.eyebrow}</Eyebrow></motion.div>
            <motion.h1 variants={fadeUp} className="mt-6 font-serif leading-[1.05]" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
              {hero.titleLine1}
              <br />
              <span className="italic" style={{ color: accent }}>{hero.titleHighlight}</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              {hero.intro}
            </motion.p>
            <motion.p variants={fadeUp} className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/85">
              <CalendarDays size={16} style={{ color: accent }} />
              {hero.when}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/get-proposal"
                className="group inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 font-semibold transition-transform hover:-translate-y-0.5"
                style={{ background: accent, color: dark }}
              >
                {hero.primaryButton}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#kits"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-4 font-medium text-white transition-colors hover:bg-white/10"
              >
                {hero.secondaryButton}
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: EASE }}
            className="relative mx-auto w-full max-w-[420px]"
          >
            <div className="rounded-t-full rounded-b-3xl p-[3px]" style={{ background: `linear-gradient(180deg, ${accent}, ${accent}22)` }}>
              <div className="overflow-hidden rounded-t-full rounded-b-[22px] bg-white">
                <img src={asset(hero.image)} alt={hero.imageAlt} className="aspect-[4/5] w-full object-cover" fetchPriority="high" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Why this occasion ── */}
      <section className="px-5 py-24 sm:px-8 lg:px-12" style={{ background: light }}>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow color={dark}>{about.eyebrow}</Eyebrow>
            <h2 className="mt-5 font-serif leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", color: dark }}>{about.title}</h2>
            <p className="mt-5 text-base leading-7 text-[#4a4a44] sm:text-lg sm:leading-8">{about.text}</p>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2">
            {about.points.map((p) => (
              <motion.div key={p.title} variants={fadeUp} className="rounded-2xl border bg-white p-6" style={{ borderColor: `${accent}40` }}>
                <span className="block h-1 w-10 rounded-full" style={{ background: accent }} />
                <h3 className="mt-4 font-serif text-xl" style={{ color: dark }}>{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5b5b55]">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Kits ── */}
      <section id="kits" className="scroll-mt-24 bg-white px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center"><Eyebrow color={dark}>{kits.eyebrow}</Eyebrow></div>
          <h2 className="mt-5 font-serif leading-tight" style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", color: dark }}>{kits.title}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#4a4a44] sm:text-lg">{kits.intro}</p>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="mx-auto mt-14 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {kits.items.map((kit) => (
            <motion.div key={kit.title} variants={fadeUp}>
              <Link
                to="/get-proposal"
                state={order(kit)}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border bg-white transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(0,0,0,.35)]"
                style={{ borderColor: `${accent}40` }}
              >
                <div className="relative overflow-hidden" style={{ background: light }}>
                  <img
                    src={asset(kit.image)}
                    alt={kit.title}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <span
                    className="absolute left-5 top-5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                    style={{ background: accent, color: dark }}
                  >
                    {kit.tag}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: accent }}>{kit.audience}</p>
                  <h3 className="mt-1 font-serif text-2xl" style={{ color: dark }}>{kit.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-[#5b5b55]">{kit.contents}</p>
                  <div className="mt-5 flex items-center justify-between gap-4 border-t pt-4" style={{ borderColor: `${accent}30` }}>
                    <span className="font-serif text-lg" style={{ color: dark }}>{kit.price || "Price on request"}</span>
                    <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: dark }}>
                      Get quote
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
        {kits.items.some((k) => k.price) && <p className="mt-6 text-center text-xs text-[#5f6655]">{kits.priceNote}</p>}
      </section>

      {/* ── Personalisation ── */}
      <section className="px-5 py-24 sm:px-8 lg:px-12" style={{ background: light }}>
        <div className="mx-auto max-w-7xl">
          <Eyebrow color={dark}>{personalisation.eyebrow}</Eyebrow>
          <h2 className="mt-5 max-w-2xl font-serif leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", color: dark }}>{personalisation.title}</h2>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {personalisation.items.map((p) => (
              <motion.div key={p.title} variants={fadeUp} className="rounded-3xl bg-white p-7">
                <span className="grid h-12 w-12 place-items-center rounded-full text-xl" style={{ background: `${accent}22` }}>{p.symbol}</span>
                <h3 className="mt-5 font-serif text-xl" style={{ color: dark }}>{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5b5b55]">{p.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="bg-white px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="flex justify-center"><Eyebrow color={dark}>{timeline.eyebrow}</Eyebrow></div>
            <h2 className="mt-5 font-serif leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", color: dark }}>{timeline.title}</h2>
          </div>
          <motion.ol
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
          >
            <span aria-hidden className="pointer-events-none absolute left-[12%] right-[12%] top-6 hidden border-t-2 border-dotted lg:block" style={{ borderColor: accent }} />
            {timeline.steps.map((s, i) => (
              <motion.li key={s.title} variants={fadeUp} className="relative text-center">
                <span className="relative mx-auto grid h-12 w-12 place-items-center rounded-full font-serif text-lg text-white ring-4 ring-white" style={{ background: dark }}>
                  {i + 1}
                </span>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>{s.when}</p>
                <h3 className="mt-2 font-serif text-xl" style={{ color: dark }}>{s.title}</h3>
                <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-6 text-[#5b5b55]">{s.text}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      <div className="bg-white pt-6">
        <OurClients />
      </div>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden px-5 py-28 text-center text-white sm:px-8 lg:px-12" style={{ background: dark }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse 55% 60% at 50% 40%, ${accent}33, transparent 65%)` }} />
        <div className="relative mx-auto max-w-3xl">
          <h2 className="font-serif leading-tight" style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}>
            {cta.title} <span className="italic" style={{ color: accent }}>{cta.titleHighlight}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{cta.text}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/get-proposal" className="inline-flex items-center gap-3 rounded-full px-8 py-4 font-semibold" style={{ background: accent, color: dark }}>
              {cta.primaryButton}
              <ArrowRight size={18} />
            </Link>
            <Link to="/contact" className="inline-flex items-center rounded-full border border-white/30 px-8 py-4 font-medium text-white hover:bg-white/10">
              {cta.secondaryButton}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
