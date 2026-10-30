import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowRight, Building2, Crown, Download, Gift, Handshake, Leaf, PenTool, Truck, Users } from "lucide-react";
import OurClients from "../components/client";
import catalogue from "../assests/depawali/Ecotwist Diwali Catalogue-2026.pdf";
import {
  Diya,
  Fireworks,
  Jaali,
  Kandil,
  LightCurtain,
  MarigoldToran,
  PetalShower,
  Rangoli,
  SeriesLights,
  seeded,
} from "../components/DiwaliDecor";
import { asset } from "../lib/content";
import content from "../content/pages/diwali-home.json";

/* ============================
   Diwali special home page.
   Shown at "/" while src/config/homepage.ts says so; the regular
   home page (Home.tsx) is left untouched.
============================ */

const DEVANAGARI = '"Tiro Devanagari Hindi", "Nirmala UI", "Mangal", serif';

// Page words and photos: src/content/pages/diwali-home.json (admin → Pages → Home (Diwali)).
// Web-sized copies of the Diwali artwork live in /public/diwali-home
const { hero, marquee, giftEdit, hampers, workplace, promises, process, cta } = content;

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 1, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

/* ============================
   Content
============================ */

const ICONS = { Users, Handshake, Crown, Leaf, PenTool, Truck, Building2 };

const STATS = hero.stats;

const MARQUEE = marquee.items.map((item) => item.text);

const GIFT_EDIT = giftEdit.items;

const HAMPERS = hampers.items;

const AUDIENCES = workplace.audiences.map((item) => ({ ...item, icon: ICONS[item.icon as keyof typeof ICONS] }));

const PROMISES = promises.items.map((item) => ({ ...item, icon: ICONS[item.icon as keyof typeof ICONS] }));

const STEPS = process.steps;

const starRand = seeded(21);
const STARS = Array.from({ length: 46 }, () => ({
  left: starRand() * 100,
  top: starRand() * 62,
  size: 1 + starRand() * 1.8,
  delay: -starRand() * 4,
  duration: 2 + starRand() * 3,
}));

/* ============================
   Small building blocks
============================ */

function StarField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {STARS.map((s, i) => (
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

function MarigoldMark() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0">
      <circle cx={10} cy={10} r={8} fill="#F97316" />
      <circle cx={10} cy={10} r={8} fill="none" stroke="#FBBF24" strokeWidth={2.4} strokeDasharray="2 1.6" />
      <circle cx={10} cy={10} r={3.2} fill="#FBBF24" />
    </svg>
  );
}

function DiyaRow({ count = 11 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none flex items-end justify-center gap-4 px-4 sm:gap-8">
      {Array.from({ length: count }, (_, i) => (
        <Diya key={i} delay={(i * 0.37) % 1.1} className={`w-9 sm:w-11 ${i % 2 ? "hidden sm:block" : ""}`} />
      ))}
    </div>
  );
}

function SectionHeading({ eyebrow, hindi, title, body, dark = false }: {
  eyebrow: string; hindi: string; title: React.ReactNode; body?: string; dark?: boolean;
}) {
  const rule = dark ? "bg-[#E9C46A]/50" : "bg-[#B45309]/40";
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className="relative mx-auto max-w-3xl text-center"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-center gap-3">
        <span className={`h-px w-8 sm:w-12 ${rule}`} />
        <span style={{ fontFamily: DEVANAGARI }} className={`text-lg ${dark ? "text-[#F6D27A]" : "text-[#B45309]"}`}>
          {hindi}
        </span>
        <span className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${dark ? "text-white/60" : "text-[#7c5a3a]"}`}>
          {eyebrow}
        </span>
        <span className={`h-px w-8 sm:w-12 ${rule}`} />
      </motion.div>
      <motion.h2
        variants={fadeUp}
        className={`mt-5 font-serif leading-tight ${dark ? "text-white" : "text-[#2a0a1c]"}`}
        style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
      >
        {title}
      </motion.h2>
      {body && (
        <motion.p
          variants={fadeUp}
          className={`mx-auto mt-5 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 ${dark ? "text-white/70" : "text-[#5b4b45]"}`}
        >
          {body}
        </motion.p>
      )}
    </motion.div>
  );
}

const goldText = "bg-gradient-to-r from-[#F6D27A] via-[#F59E0B] to-[#E9C46A] bg-clip-text text-transparent";

/* ============================
   Sections
============================ */

function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#14060f] text-white">
      {/* Night sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 75% 30%, rgba(190,50,90,.35), transparent 60%)," +
            "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(245,158,11,.18), transparent 60%)," +
            "linear-gradient(180deg, #14060f 0%, #2a0a1c 55%, #3d0f24 100%)",
        }}
      />
      <Jaali opacity={0.06} />
      <StarField />
      <Fireworks className="absolute inset-0 h-full w-full" onDark favourRight />
      <PetalShower count={18} />

      {/* Festive dressing */}
      <LightCurtain side="left" />
      <LightCurtain side="right" />
      <MarigoldToran />
      <Kandil className="absolute hidden -translate-x-1/2 lg:block" style={{ left: "47%", top: 64 }} string={64} width={58} />

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-7xl items-center gap-14 px-5 pb-32 pt-40 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:pt-44">
        {/* Copy */}
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-3 rounded-full border border-[#E9C46A]/40 bg-white/5 px-4 py-1.5 backdrop-blur-sm"
          >
            <span style={{ fontFamily: DEVANAGARI }} className="text-lg text-[#F6D27A]">{hero.hindiBadge}</span>
            <span className="h-4 w-px bg-[#E9C46A]/40" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/70">{hero.badge}</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-6 font-serif leading-[1.04]"
            style={{ fontSize: "clamp(2.6rem, 7vw, 6rem)" }}
          >
            {hero.titleLine1}
            <br />
            {hero.titleLine2}
            <br />
            <span className={`italic ${goldText}`}>{hero.titleHighlight}</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
            {hero.intro}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/occasions/depawali-gifting"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#E9C46A] px-8 py-4 font-semibold text-[#2a0a1c] shadow-[0_12px_40px_-12px_rgba(245,158,11,.8)] transition-transform hover:-translate-y-0.5"
            >
              {hero.primaryButton}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/get-proposal?occasion=festival"
              className="inline-flex items-center justify-center rounded-full border border-[#E9C46A]/60 px-8 py-4 font-medium text-[#F6D27A] transition-colors hover:bg-white/5"
            >
              {hero.secondaryButton}
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className={`font-serif text-2xl sm:text-3xl ${goldText}`}>{s.number}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/55">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Arch with the signature hamper */}
        <motion.div variants={fadeIn} initial="hidden" animate="show" className="relative mx-auto w-full max-w-[300px] sm:max-w-[380px] lg:max-w-[420px]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Rangoli className="w-[380px] opacity-40 sm:w-[560px] lg:w-[620px]" />
          </div>

          <div
            className="relative rounded-t-full rounded-b-3xl border border-[#E9C46A]/60 p-3 shadow-[0_0_90px_-20px_rgba(245,158,11,.65)]"
            style={{ background: "linear-gradient(180deg, rgba(233,196,106,.28), rgba(233,196,106,.06))" }}
          >
            <div className="overflow-hidden rounded-t-full rounded-b-2xl">
              <img
                src={asset(hero.image)}
                alt={hero.imageAlt}
                className="aspect-[3/4] w-full object-cover"
                fetchPriority="high"
              />
            </div>
            <div className="pointer-events-none absolute inset-5 rounded-t-full rounded-b-xl border border-[#E9C46A]/50" />
          </div>

          <motion.div
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-6 bottom-10 w-24 overflow-hidden rounded-full border-4 border-[#E9C46A] shadow-2xl sm:-left-10 sm:w-32"
          >
            <img src={asset(hero.insetImage)} alt="" className="aspect-square w-full object-cover" />
          </motion.div>

          <motion.div
            animate={{ y: [6, -6, 6] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-4 top-1/3 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md sm:-right-10"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#F59E0B] to-[#E9C46A] text-[#2a0a1c]">
              <Gift size={18} />
            </span>
            <span className="text-left">
              <span className="block text-[10px] uppercase tracking-[0.2em] text-[#F6D27A]">{hero.badgeCardLabel}</span>
              <span className="block font-serif text-base leading-tight">{hero.badgeCardText}</span>
            </span>
          </motion.div>

          <Diya className="absolute -bottom-7 left-1/2 w-16 -translate-x-1/2" />
        </motion.div>
      </div>

      {/* Diyas along the bottom, fading into the band below */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <DiyaRow />
        <div className="h-3 bg-gradient-to-b from-transparent to-[#5c1027]" />
      </div>
    </section>
  );
}

function FestiveMarquee() {
  const group = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pr-10">
      {MARQUEE.map((text) => (
        <React.Fragment key={text}>
          <span
            className="whitespace-nowrap font-serif text-lg italic text-[#F6D27A] sm:text-xl"
            style={/[ऀ-ॿ]/.test(text) ? { fontFamily: DEVANAGARI, fontStyle: "normal" } : undefined}
          >
            {text}
          </span>
          <MarigoldMark />
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden border-y border-[#E9C46A]/40 bg-[#5c1027] py-4">
      <div className="dw-marquee flex w-max">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}

function GiftEdit() {
  return (
    <section className="relative overflow-hidden bg-[#FBF6EC] px-5 pb-24 pt-28 sm:px-8 sm:pb-32 lg:px-12">
      <Rangoli className="absolute -left-28 -top-28 w-72 opacity-15" />
      <Rangoli className="absolute -bottom-32 -right-32 w-80 opacity-15" />

      <SectionHeading
        hindi={giftEdit.hindi}
        eyebrow={giftEdit.eyebrow}
        title={<>{giftEdit.title} <span className="italic text-[#B45309]">{giftEdit.titleHighlight}</span></>}
        body={giftEdit.intro}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="relative mx-auto mt-14 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {GIFT_EDIT.map((item) => (
          <motion.div key={item.title} variants={fadeUp}>
            <Link
              to={`/products?category=${encodeURIComponent(item.category)}`}
              className="group flex h-full flex-col rounded-[28px] bg-white p-3 ring-1 ring-[#E9C46A]/35 transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_60px_-28px_rgba(92,16,39,.45)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-2xl bg-[#f3eadb]">
                <img
                  src={asset(item.image)}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-2 rounded-t-full rounded-b-xl border border-white/60" />
              </div>
              <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#B45309]">{item.category}</p>
                <h3 className="mt-1 font-serif text-2xl text-[#2a0a1c]">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#5b4b45]">{item.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#5c1027]">
                  {giftEdit.linkLabel}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="relative mt-12 text-center">
        <Link
          to="/products"
          className="inline-flex items-center gap-3 rounded-full border border-[#5c1027] px-8 py-4 font-medium text-[#5c1027] transition-colors hover:bg-[#5c1027] hover:text-white"
        >
          {giftEdit.button}
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

function HamperCollection() {
  return (
    <section className="relative overflow-hidden bg-[#2a0a1c] px-5 pb-24 pt-28 text-white sm:px-8 sm:pb-32 lg:px-12">
      <Jaali opacity={0.05} />
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-[#F59E0B]/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[#DB2777]/15 blur-[120px]" />

      <SectionHeading
        dark
        hindi={hampers.hindi}
        eyebrow={hampers.eyebrow}
        title={<>{hampers.title} <span className={`italic ${goldText}`}>{hampers.titleHighlight}</span></>}
        body={hampers.intro}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="relative mx-auto mt-14 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {HAMPERS.map((h) => (
          <motion.div key={h.title} variants={fadeUp}>
            <Link
              to="/occasions/depawali-gifting"
              className="group relative block overflow-hidden rounded-3xl border border-[#E9C46A]/25"
            >
              <img
                src={asset(h.image)}
                alt={`${h.title} Diwali hamper`}
                loading="lazy"
                className="aspect-square w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14060f] via-[#14060f]/35 to-transparent" />
              <div className="pointer-events-none absolute inset-3 rounded-[20px] border border-[#E9C46A]/30" />
              <span className="absolute left-6 top-6 rounded-full bg-[#E9C46A] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2a0a1c]">
                {h.tag}
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-7">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#F6D27A]/85">{h.subtitle}</p>
                  <h3 className="mt-1 font-serif text-2xl sm:text-3xl">{h.title}</h3>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#E9C46A]/60 text-[#F6D27A] transition-colors group-hover:bg-[#E9C46A] group-hover:text-[#2a0a1c]">
                  <ArrowRight size={18} />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="relative mt-12 text-center">
        <Link
          to="/occasions/depawali-gifting"
          className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#E9C46A] px-8 py-4 font-semibold text-[#2a0a1c]"
        >
          {hampers.button}
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

function Workplace() {
  return (
    <section className="relative overflow-hidden bg-[#FBF6EC] px-5 pb-24 pt-28 sm:px-8 sm:pb-32 lg:px-12">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="relative mx-auto w-full max-w-[460px]"
        >
          <Rangoli className="absolute -right-20 -top-16 w-56 opacity-30" />
          <div className="relative rounded-t-full rounded-b-3xl bg-gradient-to-b from-[#E9C46A] to-[#B45309] p-[3px] shadow-[0_40px_80px_-40px_rgba(92,16,39,.6)]">
            <div className="overflow-hidden rounded-t-full rounded-b-[22px]">
              <img
                src={asset(workplace.image)}
                alt={workplace.imageAlt}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </div>
          <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#5c1027] px-5 py-3 text-sm text-[#F6D27A] shadow-xl">
            <span style={{ fontFamily: DEVANAGARI }} className="text-base">{workplace.imageBadgeHindi}</span>
            <span className="text-white/50">·</span>
            <span>{workplace.imageBadgeText}</span>
          </div>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <span style={{ fontFamily: DEVANAGARI }} className="text-lg text-[#B45309]">{workplace.hindi}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7c5a3a]">{workplace.eyebrow}</span>
            <span className="h-px w-12 bg-[#B45309]/40" />
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-5 font-serif leading-tight text-[#2a0a1c]"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
          >
            {workplace.title} <span className="italic text-[#B45309]">{workplace.titleHighlight}</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-7 text-[#5b4b45] sm:text-lg sm:leading-8">
            {workplace.intro}
          </motion.p>

          <div className="mt-8 space-y-4">
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="flex gap-4 rounded-2xl border border-[#E9C46A]/35 bg-white p-5"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5c1027] to-[#2a0a1c] text-[#F6D27A]">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="font-serif text-xl text-[#2a0a1c]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#5b4b45]">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8">
            <Link
              to="/get-proposal?occasion=festival"
              className="group inline-flex items-center gap-3 rounded-full bg-[#5c1027] px-8 py-4 font-medium text-white transition-colors hover:bg-[#2a0a1c]"
            >
              {workplace.button}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Promises() {
  return (
    <section className="relative overflow-hidden bg-white px-5 pb-24 pt-28 sm:px-8 sm:pb-32 lg:px-12">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Rangoli className="w-[640px] opacity-[0.07] sm:w-[900px]" />
      </div>

      <SectionHeading
        hindi={promises.hindi}
        eyebrow={promises.eyebrow}
        title={<>{promises.title} <span className="italic text-[#B45309]">{promises.titleHighlight}</span></>}
        body={promises.intro}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="relative mx-auto mt-14 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {PROMISES.map(({ icon: Icon, title, text }) => (
          <motion.div
            key={title}
            variants={fadeUp}
            className="rounded-3xl border border-[#E9C46A]/35 bg-[#FBF6EC]/80 p-7 text-center backdrop-blur-sm"
          >
            <span className="relative mx-auto grid h-16 w-16 place-items-center">
              <span className="absolute inset-0 rounded-full bg-[#F59E0B]/25 blur-md" />
              <span className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#F59E0B] to-[#B45309] text-white">
                <Icon size={22} />
              </span>
            </span>
            <h3 className="mt-5 font-serif text-xl text-[#2a0a1c]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#5b4b45]">{text}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function Process() {
  return (
    <section className="relative overflow-hidden bg-[#FBF6EC] px-5 pb-24 pt-28 sm:px-8 sm:pb-32 lg:px-12">
      <SectionHeading
        hindi={process.hindi}
        eyebrow={process.eyebrow}
        title={<>{process.title} <span className="italic text-[#B45309]">{process.titleHighlight}</span></>}
        body={process.intro}
      />

      <motion.ol
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="relative mx-auto mt-16 grid max-w-6xl gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
      >
        {/* dotted rangoli line joining the diyas */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[12%] right-[12%] top-[52px] hidden border-t-2 border-dotted border-[#E9C46A] lg:block"
        />
        {STEPS.map((step, i) => (
          <motion.li key={step.title} variants={fadeUp} className="relative text-center">
            <Diya delay={i * 0.3} className="relative mx-auto w-20" />
            <p className="mt-3 flex items-center justify-center gap-2 text-[#B45309]">
              <span style={{ fontFamily: DEVANAGARI }} className="text-2xl leading-none">{step.numeral}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">{process.stepLabel} {i + 1}</span>
            </p>
            <h3 className="mt-2 font-serif text-2xl text-[#2a0a1c]">{step.title}</h3>
            <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-6 text-[#5b4b45]">{step.text}</p>
          </motion.li>
        ))}
      </motion.ol>

      <div className="mt-14 text-center">
        <Link
          to="/get-proposal?occasion=festival"
          className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#E9C46A] px-8 py-4 font-semibold text-[#2a0a1c] shadow-[0_12px_40px_-14px_rgba(245,158,11,.8)]"
        >
          {process.button}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-[#14060f] px-5 pb-36 pt-40 text-center text-white sm:px-8 lg:px-12">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 40%, rgba(190,50,90,.32), transparent 65%)," +
            "linear-gradient(180deg, #2a0a1c 0%, #14060f 100%)",
        }}
      />
      <Jaali opacity={0.05} />
      <Fireworks className="absolute inset-0 h-full w-full" onDark />
      <MarigoldToran top={0} />
      <Kandil className="absolute hidden md:block" style={{ left: "10%", top: 0 }} string={90} width={52} palette="marigold" />
      <Kandil className="absolute hidden md:block" style={{ right: "10%", top: 0 }} string={60} width={52} delay={2} />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="relative mx-auto max-w-4xl"
      >
        {/* padding keeps the vowel marks above the letters inside the clipped gold gradient */}
        <motion.p variants={fadeUp} style={{ fontFamily: DEVANAGARI }} className={`py-3 text-4xl leading-normal sm:text-5xl ${goldText}`}>
          {cta.hindi}
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-6 font-serif leading-tight"
          style={{ fontSize: "clamp(2.2rem, 5vw, 4.25rem)" }}
        >
          {cta.title} <span className={`italic ${goldText}`}>{cta.titleHighlight}</span> {cta.titleEnd}
        </motion.h2>
        <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
          {cta.text}
        </motion.p>
        <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
          <a
            href={catalogue}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#E9C46A] px-8 py-4 font-semibold text-[#2a0a1c] shadow-[0_12px_40px_-12px_rgba(245,158,11,.8)]"
          >
            <Download size={18} />
            {cta.catalogueButton}
          </a>
          <Link
            to="/get-proposal?occasion=festival"
            className="inline-flex items-center gap-3 rounded-full border border-[#E9C46A]/60 px-8 py-4 font-medium text-[#F6D27A] transition-colors hover:bg-white/5"
          >
            {cta.proposalButton}
            <ArrowRight size={18} />
          </Link>
          <Link to="/contact" className="px-4 py-4 font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
            {cta.contactLink}
          </Link>
        </motion.div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0">
        <DiyaRow />
      </div>
    </section>
  );
}

/* ============================
   Page
============================ */

export default function DiwaliHome() {
  return (
    <div className="overflow-x-hidden" style={{ fontFamily: "Inter" }}>
      <Hero />
      <FestiveMarquee />
      <SeriesLights variant="multi" />
      <GiftEdit />
      <SeriesLights variant="warm" />
      <HamperCollection />
      <SeriesLights variant="multi" />
      <Workplace />
      <SeriesLights variant="warm" />
      <Promises />
      <SeriesLights variant="multi" />
      <div className="bg-white pt-14">
        <OurClients />
      </div>
      <SeriesLights variant="warm" />
      <Process />
      <FinalCta />
    </div>
  );
}
