import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowRight, Building2, Crown, Download, Gift, Handshake, Leaf, PenTool, Truck, Users } from "lucide-react";
import OurClients from "../components/client";
// Built by scripts/build-catalog.py from the site content
const catalogue = "/catalogue/Ecotwist-Gifting-Catalogue-2027.pdf";
import { Fireworks } from "../components/DiwaliDecor";
import {
  Confetti,
  DeadlineBadge,
  NEW_YEAR_FIREWORKS,
  NEW_YEAR_WILLOW,
  StarField,
  StarMark,
  goldText,
} from "../components/NewYearDecor";
import type { OrderProduct } from "./GetProposal";
import { asset } from "../lib/content";
import content from "../content/pages/new-year-home.json";

/* ============================
   New Year special home page.
   Shown at "/" while src/config/homepage.ts says so; the regular
   home page (Home.tsx) is left untouched.
============================ */

// Page words and photos: src/content/pages/new-year-home.json (admin → Pages → Home (New Year)).
// Web-sized photos live in /public/new-year-home
const { hero, marquee, kits, giftEdit, workplace, promises, process, cta } = content;

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

const ICONS = { Users, Handshake, Crown, Leaf, PenTool, Truck, Building2 };

const AUDIENCES = workplace.audiences.map((item) => ({ ...item, icon: ICONS[item.icon as keyof typeof ICONS] }));
const PROMISES = promises.items.map((item) => ({ ...item, icon: ICONS[item.icon as keyof typeof ICONS] }));

// Opens the proposal form with the kit already chosen (skips the Occasion step)
const kitOrder = (kit: (typeof kits.items)[number]): { product: OrderProduct } => ({
  product: { name: kit.title, category: "New Year Kit", image: kit.image },
});

const PROPOSAL = "/get-proposal?occasion=festival";

/* ============================
   Small building blocks
============================ */

function SectionHeading({ eyebrow, title, body, dark = false }: {
  eyebrow: string; title: React.ReactNode; body?: string; dark?: boolean;
}) {
  const rule = dark ? "bg-[#E6C77A]/50" : "bg-[#B8934A]/40";
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
        <StarMark className={dark ? "text-[#E6C77A]" : "text-[#8A6A2E]"} />
        <span className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${dark ? "text-white/65" : "text-[#4E5A45]"}`}>
          {eyebrow}
        </span>
        <StarMark className={dark ? "text-[#E6C77A]" : "text-[#8A6A2E]"} />
        <span className={`h-px w-8 sm:w-12 ${rule}`} />
      </motion.div>
      <motion.h2
        variants={fadeUp}
        className={`mt-5 font-serif leading-tight ${dark ? "text-white" : "text-[#17220F]"}`}
        style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
      >
        {title}
      </motion.h2>
      {body && (
        <motion.p
          variants={fadeUp}
          className={`mx-auto mt-5 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 ${dark ? "text-white/70" : "text-[#4E5A45]"}`}
        >
          {body}
        </motion.p>
      )}
    </motion.div>
  );
}

const goldButton =
  "inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#E6C77A] to-[#F3E3B3] px-8 py-4 font-semibold text-[#0E1A0B] shadow-[0_12px_40px_-14px_rgba(230,199,122,.8)] transition-transform hover:-translate-y-0.5";

/* ============================
   Sections
============================ */

function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#0E1A0B] text-white">
      {/* Night sky in deep forest green */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 78% 30%, rgba(104,160,47,.28), transparent 60%)," +
            "radial-gradient(ellipse 55% 45% at 8% 92%, rgba(230,199,122,.16), transparent 60%)," +
            "linear-gradient(180deg, #0E1A0B 0%, #15260F 60%, #1F3A16 100%)",
        }}
      />
      <StarField />
      <Fireworks className="absolute inset-0 h-full w-full" onDark favourRight colors={NEW_YEAR_FIREWORKS} gold={NEW_YEAR_WILLOW} />
      <Confetti />

      {/* Big faint year behind the copy */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-4 bottom-10 select-none font-serif leading-none text-transparent sm:bottom-16"
        style={{ fontSize: "clamp(9rem, 26vw, 22rem)", WebkitTextStroke: "1px rgba(230,199,122,.14)" }}
      >
        2027
      </span>

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-7xl items-center gap-14 px-5 pb-24 pt-36 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:pt-40">
        {/* Copy */}
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-3 rounded-full border border-[#E6C77A]/40 bg-white/5 px-4 py-1.5 backdrop-blur-sm"
          >
            <StarMark className="text-[#E6C77A]" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/75">{hero.badge}</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-6 font-serif leading-[1.04]"
            style={{ fontSize: "clamp(2.5rem, 6.4vw, 5.5rem)" }}
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

          <motion.div variants={fadeUp} className="mt-7">
            <DeadlineBadge
              label={hero.deadlineLabel}
              date={hero.deadlineDate}
              text={hero.deadlineText}
              passedText={hero.deadlinePassedText}
            />
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link to={PROPOSAL} className={`group ${goldButton}`}>
              {hero.primaryButton}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#new-year-kits"
              className="inline-flex items-center justify-center rounded-full border border-[#E6C77A]/60 px-8 py-4 font-medium text-[#F3E3B3] transition-colors hover:bg-white/5"
            >
              {hero.secondaryButton}
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {hero.stats.map((s) => (
              <div key={s.label}>
                <p className={`font-serif text-xl sm:text-2xl ${goldText}`}>{s.number}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/55">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Arch with the signature box */}
        <motion.div variants={fadeIn} initial="hidden" animate="show" className="relative mx-auto w-full max-w-[300px] sm:max-w-[380px] lg:max-w-[420px]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#68A02F]/15 blur-[90px]" />

          <div
            className="relative rounded-t-full rounded-b-3xl border border-[#E6C77A]/60 p-3 shadow-[0_0_90px_-20px_rgba(230,199,122,.55)]"
            style={{ background: "linear-gradient(180deg, rgba(230,199,122,.26), rgba(230,199,122,.05))" }}
          >
            <div className="overflow-hidden rounded-t-full rounded-b-2xl">
              <img
                src={asset(hero.image)}
                alt={hero.imageAlt}
                className="aspect-[3/4] w-full object-cover"
                fetchPriority="high"
              />
            </div>
            <div className="pointer-events-none absolute inset-5 rounded-t-full rounded-b-xl border border-[#E6C77A]/45" />
          </div>

          <motion.div
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-6 bottom-10 w-24 overflow-hidden rounded-full border-4 border-[#E6C77A] shadow-2xl sm:-left-10 sm:w-32"
          >
            <img src={asset(hero.insetImage)} alt={hero.insetImageAlt} className="aspect-square w-full object-cover" />
          </motion.div>

          <motion.div
            animate={{ y: [6, -6, 6] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-4 top-1/3 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md sm:-right-10"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#E6C77A] to-[#F3E3B3] text-[#0E1A0B]">
              <Gift size={18} />
            </span>
            <span className="text-left">
              <span className="block text-[10px] uppercase tracking-[0.2em] text-[#E6C77A]">{hero.badgeCardLabel}</span>
              <span className="block font-serif text-base leading-tight">{hero.badgeCardText}</span>
            </span>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#15260F]" />
    </section>
  );
}

function YearMarquee() {
  const group = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pr-10">
      {marquee.items.map(({ text }) => (
        <React.Fragment key={text}>
          <span className="whitespace-nowrap font-serif text-lg italic text-[#F3E3B3] sm:text-xl">{text}</span>
          <StarMark className="text-[#E6C77A]" />
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden border-y border-[#E6C77A]/35 bg-[#15260F] py-4">
      <div className="dw-marquee flex w-max">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}

function Kits() {
  return (
    <section id="new-year-kits" className="relative scroll-mt-24 overflow-hidden bg-[#0E1A0B] px-5 pb-24 pt-28 text-white sm:px-8 sm:pb-32 lg:px-12">
      <StarField count={30} />
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-[#E6C77A]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[#68A02F]/15 blur-[120px]" />

      <SectionHeading
        dark
        eyebrow={kits.eyebrow}
        title={<>{kits.title} <span className={`italic ${goldText}`}>{kits.titleHighlight}</span></>}
        body={kits.intro}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="relative mx-auto mt-14 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {kits.items.map((kit) => (
          <motion.div key={kit.title} variants={fadeUp}>
            <Link
              to="/get-proposal"
              state={kitOrder(kit)}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#E6C77A]/25 bg-white/[0.04] transition duration-500 hover:-translate-y-1 hover:border-[#E6C77A]/60"
            >
              <div className="relative overflow-hidden">
                <img
                  src={asset(kit.image)}
                  alt={kit.title}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <span className="absolute left-5 top-5 rounded-full bg-[#E6C77A] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0E1A0B]">
                  {kit.tag}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#E6C77A]/85">{kit.audience}</p>
                <h3 className="mt-1 font-serif text-2xl">{kit.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-white/65">{kit.contents}</p>
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                  <span className="font-serif text-lg text-[#F3E3B3]">{kit.price || "Price on request"}</span>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-white/85 group-hover:text-white">
                    Get quote
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {kits.items.some((k) => k.price) && (
        <p className="relative mt-6 text-center text-xs text-white/50">{kits.priceNote}</p>
      )}

      <div className="relative mt-12 text-center">
        <Link to={PROPOSAL} className={goldButton}>
          {kits.button}
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

function GiftEdit() {
  return (
    <section className="relative overflow-hidden bg-[#F8F5EE] px-5 pb-24 pt-28 sm:px-8 sm:pb-32 lg:px-12">
      <SectionHeading
        eyebrow={giftEdit.eyebrow}
        title={<>{giftEdit.title} <span className="italic text-[#8A6A2E]">{giftEdit.titleHighlight}</span></>}
        body={giftEdit.intro}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="relative mx-auto mt-14 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {giftEdit.items.map((item) => (
          <motion.div key={item.title} variants={fadeUp}>
            <Link
              to={`/products?category=${encodeURIComponent(item.category)}`}
              className="group flex h-full flex-col rounded-[28px] bg-white p-3 ring-1 ring-[#E6C77A]/40 transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_60px_-28px_rgba(21,38,15,.45)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-2xl bg-[#EFEAE0]">
                <img
                  src={asset(item.image)}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-2 rounded-t-full rounded-b-xl border border-white/60" />
              </div>
              <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#8A6A2E]">{item.category}</p>
                <h3 className="mt-1 font-serif text-2xl text-[#17220F]">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#4E5A45]">{item.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#1F3A16]">
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
          className="inline-flex items-center gap-3 rounded-full border border-[#1F3A16] px-8 py-4 font-medium text-[#1F3A16] transition-colors hover:bg-[#1F3A16] hover:text-white"
        >
          {giftEdit.button}
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

function Workplace() {
  return (
    <section className="relative overflow-hidden bg-white px-5 pb-24 pt-28 sm:px-8 sm:pb-32 lg:px-12">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="relative mx-auto w-full max-w-[460px]"
        >
          <div className="relative rounded-t-full rounded-b-3xl bg-gradient-to-b from-[#E6C77A] to-[#1F3A16] p-[3px] shadow-[0_40px_80px_-40px_rgba(21,38,15,.6)]">
            <div className="overflow-hidden rounded-t-full rounded-b-[22px]">
              <img
                src={asset(workplace.image)}
                alt={workplace.imageAlt}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </div>
          <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#15260F] px-5 py-3 text-sm text-[#F3E3B3] shadow-xl">
            <StarMark className="text-[#E6C77A]" />
            <span>{workplace.imageBadgeText}</span>
          </div>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <StarMark className="text-[#8A6A2E]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#4E5A45]">{workplace.eyebrow}</span>
            <span className="h-px w-12 bg-[#B8934A]/40" />
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-5 font-serif leading-tight text-[#17220F]"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
          >
            {workplace.title} <span className="italic text-[#8A6A2E]">{workplace.titleHighlight}</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-7 text-[#4E5A45] sm:text-lg sm:leading-8">
            {workplace.intro}
          </motion.p>

          <div className="mt-8 space-y-4">
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <motion.div key={title} variants={fadeUp} className="flex gap-4 rounded-2xl border border-[#E6C77A]/40 bg-[#F8F5EE] p-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1F3A16] to-[#0E1A0B] text-[#E6C77A]">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="font-serif text-xl text-[#17220F]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#4E5A45]">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8">
            <Link
              to={PROPOSAL}
              className="group inline-flex items-center gap-3 rounded-full bg-[#15260F] px-8 py-4 font-medium text-white transition-colors hover:bg-[#0E1A0B]"
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
    <section className="relative overflow-hidden bg-[#F8F5EE] px-5 pb-24 pt-28 sm:px-8 sm:pb-32 lg:px-12">
      <SectionHeading
        eyebrow={promises.eyebrow}
        title={<>{promises.title} <span className="italic text-[#8A6A2E]">{promises.titleHighlight}</span></>}
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
          <motion.div key={title} variants={fadeUp} className="rounded-3xl border border-[#E6C77A]/40 bg-white p-7 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#1F3A16] to-[#0E1A0B] text-[#E6C77A]">
              <Icon size={22} />
            </span>
            <h3 className="mt-5 font-serif text-xl text-[#17220F]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#4E5A45]">{text}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function Process() {
  return (
    <section className="relative overflow-hidden bg-white px-5 pb-24 pt-28 sm:px-8 sm:pb-32 lg:px-12">
      <SectionHeading
        eyebrow={process.eyebrow}
        title={<>{process.title} <span className="italic text-[#8A6A2E]">{process.titleHighlight}</span></>}
        body={process.intro}
      />

      <motion.ol
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="relative mx-auto mt-16 grid max-w-6xl gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-[12%] right-[12%] top-7 hidden border-t-2 border-dotted border-[#E6C77A] lg:block"
        />
        {process.steps.map((step, i) => (
          <motion.li key={step.title} variants={fadeUp} className="relative text-center">
            <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#0E1A0B] font-serif text-xl text-[#E6C77A] ring-4 ring-white">
              {i + 1}
            </span>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8A6A2E]">{step.when}</p>
            <h3 className="mt-2 font-serif text-2xl text-[#17220F]">{step.title}</h3>
            <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-6 text-[#4E5A45]">{step.text}</p>
          </motion.li>
        ))}
      </motion.ol>

      <div className="mt-14 text-center">
        <Link to={PROPOSAL} className={`group ${goldButton}`}>
          {process.button}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-[#0E1A0B] px-5 pb-32 pt-36 text-center text-white sm:px-8 lg:px-12">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 40%, rgba(104,160,47,.25), transparent 65%)," +
            "linear-gradient(180deg, #15260F 0%, #0E1A0B 100%)",
        }}
      />
      <StarField count={40} />
      <Fireworks className="absolute inset-0 h-full w-full" onDark colors={NEW_YEAR_FIREWORKS} gold={NEW_YEAR_WILLOW} />
      <Confetti count={14} />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="relative mx-auto max-w-4xl"
      >
        <motion.p variants={fadeUp} className={`font-serif text-2xl italic sm:text-3xl ${goldText}`}>
          {cta.eyebrow}
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-6 font-serif leading-tight"
          style={{ fontSize: "clamp(2.2rem, 5vw, 4.25rem)" }}
        >
          {cta.title} <span className={`italic ${goldText}`}>{cta.titleHighlight}</span>
        </motion.h2>
        <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
          {cta.text}
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8 flex justify-center">
          <DeadlineBadge
            label={hero.deadlineLabel}
            date={hero.deadlineDate}
            text={hero.deadlineText}
            passedText={hero.deadlinePassedText}
          />
        </motion.div>
        <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
          <Link to={PROPOSAL} className={goldButton}>
            {cta.proposalButton}
            <ArrowRight size={18} />
          </Link>
          <a
            href={catalogue}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-full border border-[#E6C77A]/60 px-8 py-4 font-medium text-[#F3E3B3] transition-colors hover:bg-white/5"
          >
            <Download size={18} />
            {cta.catalogueButton}
          </a>
          <Link to="/contact" className="px-4 py-4 font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
            {cta.contactLink}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ============================
   Page
============================ */

export default function NewYearHome() {
  return (
    <div className="overflow-x-hidden" style={{ fontFamily: "Inter" }}>
      <Hero />
      <YearMarquee />
      <Kits />
      <GiftEdit />
      <Workplace />
      <Promises />
      <div className="bg-white pt-14">
        <OurClients />
      </div>
      <Process />
      <FinalCta />
    </div>
  );
}
