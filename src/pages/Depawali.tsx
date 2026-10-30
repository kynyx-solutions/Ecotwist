import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import type { Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import catalogue from "../assests/depawali/Ecotwist Diwali Catalogue-2026.pdf"
import { testimonials } from "../lib/testimonials";
import { asset } from "../lib/content";
import content from "../content/pages/diwali-gifting.json";
import {
  ArrowRight,
  Sparkles,
  Gift,
  Leaf,
  Building2,
} from "lucide-react";
import {
  DiyaLedge,
  Fireworks,
  LightCurtain,
  MarigoldToran,
  Rangoli,
  SeriesLights,
  ToranGreeting,
} from "../components/DiwaliDecor";

/* ============================
   Animation Variants
============================ */

const EASE = [0.22, 1, 0.36, 1] as [
  number,
  number,
  number,
  number
];

const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: EASE,
    },
  },
};

const fadeLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -40,
  },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: EASE,
    },
  },
};

const fadeRight: Variants = {
  hidden: {
    opacity: 0,
    x: 40,
  },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: EASE,
    },
  },
};

const stagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

/* ============================
   Theme
============================ */

const COLORS = {
  olive: "#4A5D23",
  darkOlive: "#38461B",
  beige: "#F4F1EA",
  offWhite: "#FAF9F6",
  gold: "#C5A059",
  charcoal: "#1A1A1A",
};

/* ============================
   Hero Statistics
============================ */

// Page words and photos: src/content/pages/diwali-gifting.json (admin → Pages → Diwali Gifting)
const {
  hero,
  stats: statsSection,
  story,
  collections,
  signatureHamper,
  inside,
  personalisation,
  sustainability,
  ordering,
  gallery,
  testimonials: testimonialsSection,
  faq,
  cta,
} = content;

const STATS = statsSection.items;

/* ============================
   Floating Badges
============================ */

const BADGES = hero.badges.map((badge) => ({
  icon: badge.symbol,
  title: badge.title,
}));

/* ============================
   Diwali Collections
============================ */

const COLLECTIONS = [
  {
    title: "Luxury Executive",
    image: "",
  },
  {
    title: "Premium Gourmet",
    image: "",
  },
  {
    title: "Family Celebration",
    image: "",
  },
  {
    title: "Dry Fruit Collection",
    image: "",
  },
  {
    title: "Eco Essentials",
    image: "",
  },
  {
    title: "Wellness Collection",
    image: "",
  },
];

/* ============================
   Main Page
============================ */

const DIWALI_COLLECTIONS = collections.items.map((item) => ({
  ...item,
  image: asset(item.image),
}));

export default function DiwaliGifting() {

  const navigate = useNavigate();


  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", "20%"]
  );

  const heroOpacity = useTransform(
    scrollYProgress,
    [0, 0.8],
    [1, 0]
  );

  const springY = useSpring(heroY, {
    stiffness: 80,
    damping: 25,
  });

  return (

    <div
      className="overflow-x-hidden bg-brand-off-white"
      style={{
        fontFamily: "Inter",
      }}
    >

      {/* HERO SECTION */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center overflow-hidden bg-brand-off-white"
      >
        {/* FESTIVE BACKGROUND */}

        {/* Main Gradient */}

        <div className="absolute inset-0 overflow-hidden">

          <div className="absolute inset-0 bg-gradient-to-br from-brand-off-white via-white to-brand-beige" />

          {/* Golden Glow */}

          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [.15, .25, .15],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
            }}
            className="absolute -left-40 -top-32 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] lg:w-[650px] lg:h-[650px] rounded-full bg-brand-gold blur-[90px] sm:blur-[120px] lg:blur-[140px]"
          />

          {/* Olive Glow */}

          <motion.div
            animate={{
              scale: [1.1, 1, 1.1],
              opacity: [.08, .18, .08],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
            }}
            className="absolute bottom-0 right-0 w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] lg:w-[550px] lg:h-[550px] rounded-full bg-brand-olive blur-[100px] sm:blur-[130px] lg:blur-[160px]"
          />

        </div>

        {/* SERIES LIGHT CURTAINS */}

        <LightCurtain side="left" />

        <LightCurtain side="right" />

        {/* MARIGOLD TORAN + GREETING */}

        <MarigoldToran />

        <ToranGreeting />

        {/* FLOATING DIYAS */}

        <motion.div

          animate={{
            y: [-12, 12, -12],
            rotate: [-2, 2, -2],
          }}

          transition={{
            duration: 6,
            repeat: Infinity,
          }}

          className="absolute top-24 left-4 sm:left-10 text-3xl sm:text-4xl lg:text-5xl"

        >

          🪔

        </motion.div>

        <motion.div

          animate={{
            y: [-8, 8, -8],
            rotate: [2, -2, 2],
          }}

          transition={{
            duration: 7,
            repeat: Infinity,
          }}

          className="absolute bottom-28 right-4 sm:right-12 text-3xl sm:text-4xl lg:text-5xl"

        >

          🪔

        </motion.div>

        {/* HANGING LANTERNS */}

        {[
          "12%",
          "45%",
          "82%",
        ].map((left, i) => (

          <motion.div

            key={i}

            animate={{
              rotate: [-4, 4, -4],
            }}

            transition={{
              duration: 4 + i,
              repeat: Infinity,
            }}

            className="absolute top-0"

            style={{
              left,
            }}

          >

            <div className="w-px h-16 sm:h-20 lg:h-24 bg-brand-gold/40 mx-auto" />

            <div className="text-3xl sm:text-4xl lg:text-5xl">

              🏮

            </div>

          </motion.div>

        ))}

        {/* GOLD PARTICLES */}

        {Array.from({ length: 30 }).map((_, i) => (

          <motion.div

            key={i}

            animate={{

              y: [0, -40, 0],

              opacity: [0, .8, 0],

              scale: [0.5, 1.3, 0.5],

            }}

            transition={{

              duration: 5 + Math.random() * 5,

              delay: Math.random() * 5,

              repeat: Infinity,

            }}

            className="absolute rounded-full bg-brand-gold"

            style={{

              width: 4 + Math.random() * 6,

              height: 4 + Math.random() * 6,

              left: `${Math.random() * 100}%`,

              top: `${Math.random() * 100}%`,

            }}

          />

        ))}

        {/* GOLD SPARKLES */}

        <motion.div

          animate={{
            rotate: [0, 360],
            scale: [1, 1.3, 1],
            opacity: [.2, .8, .2],
          }}

          transition={{
            duration: 8,
            repeat: Infinity,
          }}

          className="absolute left-6 sm:left-32 top-32 sm:top-40 text-brand-gold text-3xl sm:text-4xl lg:text-5xl"

        >

          ✦

        </motion.div>

        <motion.div

          animate={{
            rotate: [360, 0],
            scale: [1, 1.5, 1],
            opacity: [.3, .9, .3],
          }}

          transition={{
            duration: 9,
            repeat: Infinity,
          }}

          className="absolute right-6 sm:right-28 bottom-32 sm:bottom-40 text-brand-gold text-3xl lg:text-4xl"

        >

          ✧

        </motion.div>

        {/* LIGHT RAYS */}

        <div

          className="absolute inset-0 opacity-20"

          style={{

            background:
              "linear-gradient(120deg,transparent 20%,rgba(255,255,255,.6) 50%,transparent 80%)",

          }}

        />

        {/* BOTTOM FADE */}

        <div

          className="absolute bottom-0 left-0 w-full h-32 sm:h-36 lg:h-44"

          style={{

            background:
              "linear-gradient(to top,#FAF9F6 0%,rgba(250,249,246,0) 100%)",

          }}

        />

        {/* Background Glow */}

        <div className="absolute inset-0 overflow-hidden">

          <div className="absolute -top-40 -left-40 w-[350px] h-[350px] sm:w-[600px] sm:h-[600px] rounded-full bg-brand-gold/10 blur-[90px] sm:blur-[140px]" />

          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-brand-olive/10 blur-[80px] sm:blur-[120px]" />

          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, rgba(197,160,89,.06), transparent 60%)",
            }}
          />

        </div>

        {/* FIREWORKS */}

        <Fireworks className="absolute inset-0 w-full h-full" favourRight />

        <motion.div
          className="relative z-10 max-w-7xl mx-auto w-full px-5 sm:px-6 lg:px-12 flex items-center min-h-screen"
        >

          <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 items-center">

            {/* LEFT */}

            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="relative z-50"
            >

              {/* Badge */}

              <motion.div
                variants={fadeUp}
                className="mt-18 inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-white px-4 sm:px-5 py-1 mb-2 sm:mb-2 shadow-sm"
              >

                <Sparkles
                  size={16}
                  className="text-brand-gold"
                />

                <span className="text-[10px] sm:text-xs tracking-[0.28em] uppercase font-semibold text-brand-olive">

                  {hero.eyebrow}

                </span>

              </motion.div>

              {/* Heading */}

              <motion.h1
                variants={fadeUp}
                className="font-serif leading-[1.05] text-brand-charcoal"
                style={{
                  fontSize: "clamp(2.05rem,8vw,5.5rem)",
                }}
              >

                {hero.titleLine1}

                <br />

                {hero.titleLine2}

                <br />

                <span className="italic text-brand-gold">

                  {hero.titleHighlight}

                </span>

              </motion.h1>

              {/* Description */}

              <motion.p
                variants={fadeUp}
                className="mt-2 sm:mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600 max-w-xl"
              >

                {hero.intro}

              </motion.p>

              {/* CTA */}

              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-6"
              >

                <motion.button
                  whileHover={{
                    scale: 1.04,
                    y: -3,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                  onClick={() => navigate("/products")}
                  className="group w-full xs:w-auto px-8 py-4 rounded-full bg-brand-olive text-white flex items-center justify-center gap-3 font-medium shadow-xl cursor-pointer"
                >
                  {hero.primaryButton}

                  <ArrowRight
                    size={18}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </motion.button>

                <motion.button
                  whileHover={{
                    scale: 1.04,
                    y: -3,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                  onClick={() => window.open(catalogue, "_blank")}
                  className="w-full xs:w-auto px-8 py-4 rounded-full border border-brand-olive text-brand-olive font-medium backdrop-blur-sm text-center cursor-pointer"
                >
                  {hero.secondaryButton}
                </motion.button>

              </motion.div>

              {/* Small Features */}

              <motion.div
                variants={fadeUp}
                className="flex flex-row gap-x-6 gap-y-4 sm:gap-8 mt-4 sm:mt-6"
              >

                <div className="flex items-center gap-3">

                  <Leaf
                    size={18}
                    className="text-brand-gold"
                  />

                  <span className="text-sm text-gray-600">

                    {hero.feature1}

                  </span>

                </div>

                <div className="flex items-center gap-3">

                  <Gift
                    size={18}
                    className="text-brand-gold"
                  />

                  <span className="text-sm text-gray-600">

                    {hero.feature2}

                  </span>

                </div>

                <div className="flex items-center gap-3">

                  <Building2
                    size={18}
                    className="text-brand-gold"
                  />

                  <span className="text-sm text-gray-600">

                    {hero.feature3}

                  </span>

                </div>

              </motion.div>

            </motion.div>

            {/* RIGHT SIDE */}

            {/* HERO IMAGE */}

            <motion.div
              variants={fadeRight}
              initial="hidden"
              animate="show"
              className="relative flex justify-center items-center min-h-[420px] sm:min-h-[540px] lg:min-h-[650px] mt-8 lg:mt-0"
            >

              {/* Background Circle */}

              <div className="absolute w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] rounded-full bg-brand-gold/10 blur-2xl sm:blur-3xl" />

              <div className="absolute w-[230px] h-[230px] sm:w-[340px] sm:h-[340px] lg:w-[420px] lg:h-[420px] rounded-full border border-brand-gold/20" />

              <div className="absolute w-[180px] h-[180px] sm:w-[260px] sm:h-[260px] lg:w-[320px] lg:h-[320px] rounded-full border border-brand-olive/10" />

              {/* Rangoli */}

              <div className="absolute -translate-x-20 translate-y-26">
                <Rangoli className="w-[250px] sm:w-[400px] lg:w-[480px] opacity-45" />
              </div>

              {/* Floating Image */}

              <motion.div

                animate={{
                  y: [-12, 12, -12],
                  rotate: [-1.5, 1.5, -1.5],
                }}

                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}

                whileHover={{
                  scale: 1.04,
                  rotate: 0,
                }}

                className="relative z-20 right-20 top-26"

              >

                <div className="bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden p-3 sm:p-5 border border-gray-200">

                  <img
                    src={asset(hero.image)}
                    alt={hero.imageAlt}
                    className="w-[120px] sm:w-[220px] lg:w-[260px] object-cover rounded-2xl"
                  />

                </div>

              </motion.div>

              {/* Floating Card */}

              <motion.div

                animate={{
                  y: [-8, 8, -8],
                }}

                transition={{
                  duration: 5,
                  repeat: Infinity,
                }}

                className="absolute left-0 top-10 sm:top-20 lg:top-24"

              >

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl px-3 sm:px-5 py-3 sm:py-4 border border-white">

                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-brand-gold mb-1 sm:mb-2">

                    {hero.cardOneLabel}

                  </p>

                  <h4 className="font-serif text-base sm:text-xl">

                    {hero.cardOneTitle}

                  </h4>

                </div>

              </motion.div>

              {/* Floating Card */}

              <motion.div

                animate={{
                  y: [8, -8, 8],
                }}

                transition={{
                  duration: 6,
                  repeat: Infinity,
                }}

                className="absolute right-0 bottom-14 sm:bottom-24 lg:bottom-28"

              >

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl px-3 sm:px-5 py-3 sm:py-4 border border-white">

                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-brand-gold mb-1 sm:mb-2">

                    {hero.cardTwoLabel}

                  </p>

                  <h4 className="font-serif text-base sm:text-xl">

                    {hero.cardTwoTitle}

                  </h4>

                </div>

              </motion.div>

              {/* Floating Badges */}

              {BADGES.map((badge, index) => (

                <motion.div

                  key={badge.title}

                  initial={{
                    opacity: 0,
                    scale: 0.8,
                  }}

                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: [0, -12, 0],
                  }}

                  transition={{
                    delay: index * 0.25,
                    duration: 4 + index,
                    repeat: Infinity,
                  }}

                  className={`absolute ${index === 0
                    ? "top-10 right-2 sm:top-20 sm:right-10"
                    : index === 1
                      ? "top-32 left-4 sm:top-54 sm:left-20"
                      : index === 2
                        ? "bottom-0 left-2 sm:bottom-2 sm:left-10"
                        : "bottom-10 right-1 sm:bottom-20 sm:right-6"
                    }`}

                >

                  <div className="bg-white rounded-full shadow-lg px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 border border-gray-100">

                    <span className="text-sm sm:text-lg">

                      {badge.icon}

                    </span>

                    <span className="text-[10px] sm:text-xs font-medium text-brand-charcoal whitespace-nowrap">

                      {badge.title}

                    </span>

                  </div>

                </motion.div>

              ))}

              {/* Decorative Sparkles */}

              <motion.div

                animate={{
                  scale: [1, 1.4, 1],
                  rotate: [0, 180, 360],
                  opacity: [.3, 1, .3],
                }}

                transition={{
                  duration: 8,
                  repeat: Infinity,
                }}

                className="absolute top-6 left-8 sm:top-12 sm:left-28 text-brand-gold text-xl sm:text-3xl"

              >

                ✦

              </motion.div>

              <motion.div

                animate={{
                  scale: [1, 1.5, 1],
                  rotate: [360, 0],
                  opacity: [.3, .9, .3],
                }}

                transition={{
                  duration: 10,
                  repeat: Infinity,
                }}

                className="absolute bottom-4 right-8 sm:bottom-10 sm:right-24 text-brand-gold text-lg sm:text-2xl"

              >

                ✧

              </motion.div>

            </motion.div>

            {/* SCROLL INDICATOR 
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: 1.6,
              duration: 1,
            }}
            className="absolute bottom-6 right-10 hidden lg:flex flex-col items-center z-30"
            >

            <span className="text-[10px] uppercase tracking-[0.35em] text-brand-charcoal/60">

              Scroll

            </span>

            <motion.div
              animate={{
                y: [0, 12, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.8,
              }}
              className="mt-3"
            >

              <div className="w-px h-16 bg-gradient-to-b from-brand-gold to-transparent" />

            </motion.div>

            </motion.div>*/}

            {/* DECORATIVE BLOBS */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">

              <div className="absolute -left-24 top-24 w-40 h-40 sm:w-72 sm:h-72 rounded-full bg-brand-gold/5 blur-[80px] sm:blur-[120px]" />

              <div className="absolute right-0 bottom-0 w-48 h-48 sm:w-80 sm:h-80 rounded-full bg-brand-olive/10 blur-[90px] sm:blur-[150px]" />

            </div>

            {/* GOLDEN SPARKLES */}
            <motion.div
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [1, 1.4, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                repeat: Infinity,
                duration: 8,
              }}
              className="absolute left-6 sm:left-16 top-32 sm:top-40 text-brand-gold text-3xl sm:text-5xl"
            >

              ✦

            </motion.div>

            <motion.div
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 6,
              }}
              className="absolute right-8 sm:right-20 top-20 sm:top-24 text-brand-gold text-xl sm:text-3xl"
            >

              ✧

            </motion.div>

            <motion.div
              animate={{
                opacity: [0.3, 0.9, 0.3],
                y: [0, -10, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 5,
              }}
              className="absolute left-1/3 bottom-20 sm:bottom-24 text-brand-gold text-lg sm:text-2xl"
            >

              ✦

            </motion.div>

            {/* BOTTOM FADE */}
            <div
              className="absolute bottom-0 left-0 w-full h-32 sm:h-36 lg:h-44"
              style={{
                background:
                  "linear-gradient(to top,#FAF9F6 0%,rgba(250,249,246,0) 100%)",
              }}
            />

          </div>

        </motion.div>

      </section>

      {/* DIYA LEDGE */}
      <DiyaLedge />

      <section className="relative z-20 bg-white border-y border-brand-gold/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-3 items-center justify-items-center min-h-[100px] divide-y md:divide-y-0 md:divide-x divide-brand-gold/10"
          >

            {STATS.map((item) => (
              <div
                key={item.label}
                className="w-full flex flex-col items-center justify-center py-8 text-center"
              >
                <h2 className="font-serif text-3xl lg:text-5xl text-brand-olive">
                  {item.number}
                </h2>

                <p className="mt-2 uppercase tracking-[0.25em] text-xs text-gray-500">
                  {item.label}
                </p>
              </div>
            ))}

          </motion.div>

        </div>
      </section>

      {/* FESTIVAL STORY */}
      <SeriesLights variant="multi" />
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden bg-white">

        {/* Decorative Background */}

        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute -left-32 top-20 w-40 h-40 sm:w-72 sm:h-72 rounded-full bg-brand-gold/5 blur-[80px] sm:blur-[120px]" />

          <div className="absolute right-0 bottom-10 w-52 h-52 sm:w-96 sm:h-96 rounded-full bg-brand-olive/5 blur-[90px] sm:blur-[140px]" />

        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">

          <div className="grid lg:grid-cols-2 gap-14 sm:gap-16 lg:gap-20 items-center">

            {/* LEFT */}

            <motion.div

              initial={{ opacity: 0, x: -60 }}

              whileInView={{ opacity: 1, x: 0 }}

              viewport={{ once: true }}

              transition={{ duration: .8 }}

            >

              <span className="uppercase tracking-[0.25em] sm:tracking-[0.35em] text-[10px] sm:text-xs font-semibold text-brand-gold">

                {story.eyebrow}

              </span>

              <h2 className="font-serif text-brand-charcoal mt-4 sm:mt-6 leading-tight text-3xl sm:text-4xl lg:text-6xl">

                {story.titleLine1}

                <br />

                {story.titleLine2}

                <span className="italic text-brand-gold">

                  {story.titleHighlight}

                </span>

              </h2>

              <p className="mt-6 sm:mt-8 text-base sm:text-lg leading-7 sm:leading-9 text-gray-600">

                {story.paragraph1}

              </p>

              <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-7 sm:leading-9 text-gray-600">

                {story.paragraph2}

              </p>

              {/* Quote */}

              <div className="mt-8 sm:mt-12 border-l-4 border-brand-gold pl-4 sm:pl-6">

                <p className="italic font-serif text-lg sm:text-xl lg:text-2xl text-brand-charcoal leading-relaxed">

                  "{story.quote}"

                </p>

              </div>

            </motion.div>

            {/* RIGHT */}

            <motion.div

              initial={{ opacity: 0, x: 60 }}

              whileInView={{ opacity: 1, x: 0 }}

              viewport={{ once: true }}

              transition={{ duration: .8 }}

              className="relative mt-4 lg:mt-0"

            >

              {/* Background Card */}

              <div className="absolute inset-0 bg-brand-beige rounded-[24px] sm:rounded-[32px] lg:rounded-[40px] rotate-3" />

              <div className="relative rounded-[24px] sm:rounded-[32px] lg:rounded-[40px] overflow-hidden shadow-2xl">

                <motion.img

                  whileHover={{ scale: 1.05 }}

                  transition={{ duration: .8 }}

                  src={asset(story.image)}

                  alt={story.imageAlt}

                  className="w-full h-[320px] sm:h-[450px] lg:h-[650px] object-cover"

                />

              </div>

              {/* Floating Card */}

              <motion.div

                animate={{

                  y: [-10, 10, -10],

                }}

                transition={{

                  duration: 5,

                  repeat: Infinity,

                }}

                className="absolute -left-3 sm:-left-6 lg:-left-10 bottom-6 sm:bottom-8 lg:bottom-10"

              >

                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-5 lg:p-6 w-48 sm:w-60 lg:w-72">

                  <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-brand-gold">

                    {story.badgeLabel}

                  </span>

                  <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl mt-2 sm:mt-3">

                    {story.badgeValue}

                  </h3>

                  <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">

                    {story.badgeText}

                  </p>

                </div>

              </motion.div>

            </motion.div>

          </div>

          {/* Bottom Statistics */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-8 gap-y-10 mt-20 sm:mt-24 lg:mt-28">

            {story.stats.map((item, index) => (

              <motion.div

                key={index}

                initial={{ opacity: 0, y: 40 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true }}

                transition={{

                  delay: index * .15,

                }}

                className="text-center"

              >

                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-brand-olive">

                  {item.value}

                </h2>

                <p className="mt-2 sm:mt-3 uppercase tracking-[0.15em] sm:tracking-[0.22em] text-[10px] sm:text-xs text-gray-500">

                  {item.title}

                </p>

              </motion.div>

            ))}

          </div>

        </div>

      </section>


      {/* CURATED COLLECTIONS */}
      <SeriesLights variant="warm" />
      <section className="relative py-32 bg-brand-beige overflow-hidden">

        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute left-0 top-20 w-96 h-96 rounded-full bg-brand-gold/5 blur-[140px]" />

          <div className="absolute right-0 bottom-0 w-[500px] h-[500px] rounded-full bg-brand-olive/5 blur-[160px]" />

        </div>

        <div className="relative max-w-7xl mx-auto px-6">

          {/* Heading */}

          <motion.div

            initial={{ opacity: 0, y: 40 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true }}

            className="text-center mb-20"

          >

            <span className="uppercase tracking-[0.35em] text-xs text-brand-gold font-semibold">

              {collections.eyebrow}

            </span>

            <h2 className="font-serif text-5xl lg:text-6xl mt-6">

              {collections.title}

              <span className="italic text-brand-gold">

                {collections.titleHighlight}

              </span>

            </h2>

            <p className="mt-8 text-gray-600 max-w-2xl mx-auto text-lg leading-8">

              {collections.intro}

            </p>

          </motion.div>

          {/* Grid */}

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-10">

            {DIWALI_COLLECTIONS.map((item, index) => (

              <motion.div

                key={item.title}

                initial={{ opacity: 0, y: 50 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true }}

                transition={{ delay: index * .12 }}

                whileHover={{ y: -12 }}

                className="group"

              >

                <div className="bg-white rounded-[32px] overflow-hidden shadow-xl">

                  {/* Image */}

                  <div className="relative overflow-hidden">

                    <motion.img

                      whileHover={{ scale: 1.08 }}

                      transition={{ duration: .7 }}

                      src={item.image}

                      className="h-[360px] w-full object-cover"

                    />

                    {/* Tag */}

                    <div

                      className="absolute top-5 left-5 px-4 py-2 rounded-full text-white text-xs uppercase tracking-widest"

                      style={{

                        background: item.color,

                      }}

                    >

                      {item.tag}

                    </div>

                    {/* Gradient */}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  </div>

                  {/* Content */}

                  <div className="p-8">

                    <h3 className="font-serif text-3xl">

                      {item.title}

                    </h3>

                    <p className="text-gray-500 mt-3 leading-7">

                      {item.subtitle}

                    </p>

                    {/* Button */}

                    <motion.button

                      whileHover={{ x: 6 }}
                      onClick={() => navigate("/products")}

                      className="mt-8 flex items-center gap-3 text-brand-olive font-semibold"

                    >

                      {collections.buttonText}

                      <ArrowRight size={18} />

                    </motion.button>

                  </div>

                </div>

              </motion.div>

            ))}

          </div>

        </div>

      </section>

      {/* FEATURED SIGNATURE HAMPER */}
      <SeriesLights variant="multi" />
      <section className="relative py-36 overflow-hidden bg-brand-off-white">

        {/* Decorative Background */}

        <div className="absolute inset-0">

          <div className="absolute -left-40 top-10 w-[550px] h-[550px] rounded-full bg-brand-gold/5 blur-[140px]" />

          <div className="absolute right-0 bottom-0 w-[500px] h-[500px] rounded-full bg-brand-olive/5 blur-[150px]" />

        </div>

        <div className="relative max-w-7xl mx-auto px-6">

          <div className="grid lg:grid-cols-2 gap-24 items-center">

            {/* LEFT IMAGE */}

            <motion.div

              initial={{ opacity: 0, x: -60 }}

              whileInView={{ opacity: 1, x: 0 }}

              viewport={{ once: true }}

              transition={{ duration: .8 }}

              className="relative"

            >

              {/* Gold Border */}

              <div className="absolute inset-0 rounded-[40px] border border-brand-gold/30 rotate-2" />

              <motion.div

                whileHover={{
                  scale: 1.03,
                  rotate: -1,
                }}

                transition={{
                  duration: .6,
                }}

                className="relative rounded-[40px] overflow-hidden shadow-2xl"

              >

                <img

                  src={asset(signatureHamper.image)}

                  alt={signatureHamper.imageAlt}

                  className="w-full h-[650px] object-cover"

                />

              </motion.div>

              {/* Floating Badge */}

              <motion.div

                animate={{
                  y: [-10, 10, -10],
                }}

                transition={{
                  duration: 5,
                  repeat: Infinity,
                }}

                className="absolute -right-8 top-10"

              >

                <div className="bg-white rounded-3xl shadow-xl px-6 py-5">

                  <p className="uppercase tracking-[0.25em] text-xs text-brand-gold">

                    {signatureHamper.badgeLabel}

                  </p>

                  <h3 className="font-serif text-2xl mt-2">

                    {signatureHamper.badgeTitle}

                  </h3>

                </div>

              </motion.div>

            </motion.div>

            {/* RIGHT CONTENT */}

            <motion.div

              initial={{ opacity: 0, x: 60 }}

              whileInView={{ opacity: 1, x: 0 }}

              viewport={{ once: true }}

              transition={{ duration: .8 }}

            >

              <span className="uppercase tracking-[0.35em] text-xs font-semibold text-brand-gold">

                {signatureHamper.eyebrow}

              </span>

              <h2 className="font-serif text-5xl lg:text-6xl mt-6 leading-tight">

                {signatureHamper.titleStart}

                <span className="italic text-brand-gold">

                  {signatureHamper.titleHighlight}

                </span>

                <br />

                {signatureHamper.titleLine2}

              </h2>

              <p className="mt-8 text-lg leading-9 text-gray-600">

                {signatureHamper.intro}

              </p>

              {/* Feature Grid */}

              <div className="grid sm:grid-cols-2 gap-6 mt-12">

                {signatureHamper.features.map((item, index) => (

                  <motion.div

                    key={item}

                    initial={{ opacity: 0, y: 20 }}

                    whileInView={{ opacity: 1, y: 0 }}

                    viewport={{ once: true }}

                    transition={{
                      delay: index * .08,
                    }}

                    className="flex items-center gap-3"

                  >

                    <div className="w-8 h-8 rounded-full bg-brand-gold/10 flex items-center justify-center">

                      ✓

                    </div>

                    <span>{item}</span>

                  </motion.div>

                ))}

              </div>

              {/* CTA */}

              <div className="flex flex-wrap gap-5 mt-14">

                <motion.button

                  whileHover={{
                    scale: 1.05,
                    y: -3,
                  }}

                  whileTap={{
                    scale: .97,
                  }}
                  onClick={() => window.open(catalogue, "_blank")}

                  className="px-8 py-4 rounded-full bg-brand-olive text-white font-medium shadow-lg flex items-center gap-3"

                >

                  {signatureHamper.primaryButton}

                  <ArrowRight size={18} />

                </motion.button>

                <motion.button

                  whileHover={{
                    scale: 1.05,
                  }}

                  onClick={() => navigate("/solutions")}

                  className="px-8 py-4 rounded-full border border-brand-olive text-brand-olive"

                >

                  {signatureHamper.secondaryButton}

                </motion.button>

              </div>

            </motion.div>

          </div>

          {/* Bottom Highlight Cards */}

          <div className="grid md:grid-cols-3 gap-8 mt-28">

            {signatureHamper.highlights.map((item, index) => (

              <motion.div

                key={item.title}

                initial={{ opacity: 0, y: 40 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true }}

                transition={{
                  delay: index * .12,
                }}

                whileHover={{
                  y: -8,
                }}

                className="bg-white rounded-[30px] p-10 shadow-lg"

              >

                <h3 className="font-serif text-3xl">

                  {item.title}

                </h3>

                <p className="mt-5 leading-8 text-gray-600">

                  {item.desc}

                </p>

              </motion.div>

            ))}

          </div>

        </div>

      </section>

      {/* WHAT'S INSIDE */}
      <SeriesLights variant="warm" />
      <section className="relative py-36 bg-brand-beige overflow-hidden">

        {/* Background Glow */}

        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute left-0 top-20 w-[450px] h-[450px] rounded-full bg-brand-gold/5 blur-[140px]" />

          <div className="absolute right-0 bottom-10 w-[500px] h-[500px] rounded-full bg-brand-olive/5 blur-[160px]" />

        </div>

        <div className="relative max-w-7xl mx-auto px-6">

          {/* Heading */}

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <span className="uppercase tracking-[0.35em] text-xs font-semibold text-brand-gold">

              {inside.eyebrow}

            </span>

            <h2 className="font-serif text-5xl lg:text-6xl mt-6">

              {inside.title}

              <span className="italic text-brand-gold">

                {inside.titleHighlight}

              </span>

            </h2>

            <p className="mt-8 text-lg text-gray-600 max-w-3xl mx-auto leading-8">

              {inside.intro}

            </p>

          </motion.div>

          <div className="grid lg:grid-cols-3 gap-16 items-center">

            {/* LEFT */}

            <div className="space-y-6">

              {inside.leftItems.map((item, index) => (

                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * .1 }}
                  whileHover={{ x: 8 }}
                  className="bg-white rounded-3xl p-6 shadow-lg"
                >

                  <h3 className="font-serif text-2xl">

                    {item.title}

                  </h3>

                  <p className="mt-3 text-gray-600">

                    {item.desc}

                  </p>

                </motion.div>

              ))}

            </div>

            {/* CENTER */}

            <motion.div

              initial={{ opacity: 0, scale: .9 }}

              whileInView={{ opacity: 1, scale: 1 }}

              viewport={{ once: true }}

              className="relative flex justify-center"

            >

              {/* Glow */}

              <div className="absolute w-[420px] h-[420px] rounded-full bg-brand-gold/10 blur-[120px]" />

              {/* Image */}

              <motion.img

                animate={{
                  y: [-10, 10, -10],
                }}

                transition={{
                  duration: 6,
                  repeat: Infinity,
                }}

                src={asset(inside.image)}

                alt={inside.imageAlt}

                className="relative z-10 w-full max-w-md rounded-3xl"

              />

            </motion.div>

            {/* RIGHT */}

            <div className="space-y-6">

              {inside.rightItems.map((item, index) => (

                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * .1 }}
                  whileHover={{ x: -8 }}
                  className="bg-white rounded-3xl p-6 shadow-lg"
                >

                  <h3 className="font-serif text-2xl">

                    {item.title}

                  </h3>

                  <p className="mt-3 text-gray-600">

                    {item.desc}

                  </p>

                </motion.div>

              ))}

            </div>

          </div>

          {/* Bottom Highlight */}

          <motion.div

            initial={{ opacity: 0, y: 40 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true }}

            className="mt-24 bg-white rounded-[40px] p-10 lg:p-14 shadow-xl"

          >

            <div className="grid md:grid-cols-4 gap-8 text-center">

              {inside.highlights.map((item) => (

                <div key={item}>

                  <div className="w-16 h-16 mx-auto rounded-full bg-brand-gold/10 flex items-center justify-center text-2xl">

                    ✨

                  </div>

                  <h3 className="mt-5 font-semibold text-lg">

                    {item}

                  </h3>

                </div>

              ))}

            </div>

          </motion.div>

        </div>

      </section>

      {/* PERSONALISATION */}
      <SeriesLights variant="multi" />
      <section className="relative py-36 overflow-hidden bg-white">

        {/* Background */}

        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute -right-32 top-20 w-[520px] h-[520px] rounded-full bg-brand-gold/5 blur-[150px]" />

          <div className="absolute left-0 bottom-0 w-[420px] h-[420px] rounded-full bg-brand-olive/5 blur-[140px]" />

        </div>

        <div className="relative max-w-7xl mx-auto px-6">

          {/* Heading */}

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >

            <span className="uppercase tracking-[0.35em] text-xs font-semibold text-brand-gold">

              {personalisation.eyebrow}

            </span>

            <h2 className="font-serif text-5xl lg:text-6xl mt-6">

              {personalisation.title}

              <span className="italic text-brand-gold">

                {personalisation.titleHighlight}

              </span>

            </h2>

            <p className="mt-8 max-w-3xl mx-auto text-lg leading-8 text-gray-600">

              {personalisation.intro}

            </p>

          </motion.div>

          <div className="grid lg:grid-cols-2 gap-20 items-center">

            {/* LEFT IMAGE */}

            <motion.div

              initial={{ opacity: 0, x: -50 }}

              whileInView={{ opacity: 1, x: 0 }}

              viewport={{ once: true }}

              className="relative"

            >

              <div className="absolute inset-0 rounded-[40px] rotate-3 border border-brand-gold/20" />

              <motion.img

                whileHover={{
                  scale: 1.03,
                }}

                transition={{
                  duration: .7,
                }}

                src={asset(personalisation.image)}

                alt={personalisation.imageAlt}

                className="relative rounded-[40px] shadow-2xl w-full h-[650px] object-cover"

              />

              {/* Floating Label */}

              <motion.div

                animate={{
                  y: [-10, 10, -10],
                }}

                transition={{
                  repeat: Infinity,
                  duration: 5,
                }}

                className="absolute -right-6 bottom-12"

              >

                <div className="bg-white rounded-3xl shadow-xl px-6 py-5">

                  <p className="uppercase tracking-[0.25em] text-xs text-brand-gold">

                    {personalisation.badgeLabel}

                  </p>

                  <h3 className="font-serif text-2xl mt-2">

                    {personalisation.badgeTitle}

                  </h3>

                </div>

              </motion.div>

            </motion.div>

            {/* RIGHT CONTENT */}

            <motion.div

              initial={{ opacity: 0, x: 50 }}

              whileInView={{ opacity: 1, x: 0 }}

              viewport={{ once: true }}

            >

              <div className="grid gap-6">

                {personalisation.options.map((item, index) => (

                  <motion.div

                    key={item.title}

                    initial={{ opacity: 0, y: 25 }}

                    whileInView={{ opacity: 1, y: 0 }}

                    viewport={{ once: true }}

                    transition={{
                      delay: index * .08,
                    }}

                    whileHover={{
                      y: -6,
                    }}

                    className="bg-brand-beige rounded-3xl p-6 shadow-md"

                  >

                    <div className="flex gap-5">

                      <div className="w-14 h-14 rounded-2xl bg-brand-gold/15 flex items-center justify-center text-2xl">

                        ✨

                      </div>

                      <div>

                        <h3 className="font-serif text-2xl">

                          {item.title}

                        </h3>

                        <p className="mt-2 text-gray-600 leading-7">

                          {item.desc}

                        </p>

                      </div>

                    </div>

                  </motion.div>

                ))}

              </div>

            </motion.div>

          </div>

          {/* Bottom CTA */}

          <motion.div

            initial={{ opacity: 0, y: 40 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true }}

            className="mt-28"

          >

            <div className="rounded-[40px] bg-brand-olive text-white px-10 lg:px-16 py-14 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl">

              <div>

                <span className="uppercase tracking-[0.3em] text-xs text-brand-gold">

                  {personalisation.ctaEyebrow}

                </span>

                <h3 className="font-serif text-4xl mt-4">

                  {personalisation.ctaTitle}

                </h3>

                <p className="mt-4 max-w-2xl text-white/80 leading-8">

                  {personalisation.ctaText}

                </p>

              </div>

              <motion.button

                whileHover={{
                  scale: 1.05,
                }}

                whileTap={{
                  scale: .97,
                }}
                onClick={() => navigate("/get-proposal")}

                className="bg-brand-gold text-brand-charcoal px-8 py-4 rounded-full font-semibold flex items-center gap-3"

              >

                {personalisation.ctaButton}

                <ArrowRight size={18} />

              </motion.button>

            </div>

          </motion.div>

        </div>

      </section>

      {/* SUSTAINABILITY PROMISE */}
      <SeriesLights variant="warm" />
      <section className="relative py-36 bg-brand-beige overflow-hidden">

        {/* Decorative Background */}

        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute -left-24 top-20 w-[450px] h-[450px] rounded-full bg-brand-gold/5 blur-[140px]" />

          <div className="absolute right-0 bottom-0 w-[550px] h-[550px] rounded-full bg-brand-olive/5 blur-[160px]" />

        </div>

        <div className="relative max-w-7xl mx-auto px-6">

          {/* Heading */}

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >

            <span className="uppercase tracking-[0.35em] text-xs font-semibold text-brand-gold">

              {sustainability.eyebrow}

            </span>

            <h2 className="font-serif text-5xl lg:text-6xl mt-6">

              {sustainability.title}

              <span className="italic text-brand-gold">

                {sustainability.titleHighlight}

              </span>

            </h2>

            <p className="mt-8 max-w-3xl mx-auto text-lg leading-8 text-gray-600">

              {sustainability.intro}

            </p>

          </motion.div>

          {/* Main Layout */}

          <div className="grid lg:grid-cols-2 gap-20 items-center">

            {/* LEFT */}

            <motion.div

              initial={{ opacity: 0, x: -50 }}

              whileInView={{ opacity: 1, x: 0 }}

              viewport={{ once: true }}

            >

              <img

                src={asset(sustainability.image)}

                alt={sustainability.imageAlt}

                className="rounded-[40px] shadow-2xl h-[650px] object-cover w-full"

              />

            </motion.div>

            {/* RIGHT */}

            <motion.div

              initial={{ opacity: 0, x: 50 }}

              whileInView={{ opacity: 1, x: 0 }}

              viewport={{ once: true }}

              className="space-y-6"

            >

              {sustainability.points.map((point) => ({
                title: point.title,
                desc: point.desc,
                icon: point.symbol,
              })).map((item, index) => (

                <motion.div

                  key={item.title}

                  initial={{ opacity: 0, y: 20 }}

                  whileInView={{ opacity: 1, y: 0 }}

                  viewport={{ once: true }}

                  transition={{
                    delay: index * .08,
                  }}

                  whileHover={{
                    y: -6,
                  }}

                  className="bg-white rounded-3xl shadow-lg p-6"

                >

                  <div className="flex gap-5">

                    <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-3xl">

                      {item.icon}

                    </div>

                    <div>

                      <h3 className="font-serif text-2xl">

                        {item.title}

                      </h3>

                      <p className="mt-3 leading-7 text-gray-600">

                        {item.desc}

                      </p>

                    </div>

                  </div>

                </motion.div>

              ))}

            </motion.div>

          </div>

          {/* Impact Statistics */}

          <div className="grid md:grid-cols-4 gap-8 mt-28">

            {sustainability.stats.map((item, index) => (

              <motion.div

                key={item.title}

                initial={{ opacity: 0, y: 40 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true }}

                transition={{
                  delay: index * .1,
                }}

                whileHover={{
                  y: -6,
                }}

                className="bg-white rounded-[30px] shadow-lg p-8 text-center"

              >

                <h3 className="font-serif text-5xl text-brand-olive">

                  {item.value}

                </h3>

                <p className="mt-4 uppercase tracking-[0.22em] text-xs text-gray-500">

                  {item.title}

                </p>

              </motion.div>

            ))}

          </div>

          {/* Sustainability Journey */}

          <div className="mt-32">

            <motion.h3

              initial={{ opacity: 0 }}

              whileInView={{ opacity: 1 }}

              viewport={{ once: true }}

              className="font-serif text-4xl text-center mb-20"

            >

              {sustainability.journeyTitle}

            </motion.h3>

            <div className="grid md:grid-cols-5 gap-8">

              {sustainability.journey.map((step, index) => (

                <motion.div

                  key={step}

                  initial={{ opacity: 0, y: 30 }}

                  whileInView={{ opacity: 1, y: 0 }}

                  viewport={{ once: true }}

                  transition={{
                    delay: index * .08,
                  }}

                  className="relative text-center"

                >

                  <div className="w-20 h-20 mx-auto rounded-full bg-brand-olive text-white flex items-center justify-center text-2xl font-bold shadow-lg">

                    {index + 1}

                  </div>

                  <h4 className="mt-6 font-semibold">

                    {step}

                  </h4>

                </motion.div>

              ))}

            </div>

          </div>

        </div>

      </section>

      {/* CORPORATE ORDERING PROCESS */}
      <SeriesLights variant="multi" />
      <section className="relative py-36 overflow-hidden bg-brand-off-white">

        {/* Background Decoration */}

        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute left-0 top-24 w-[420px] h-[420px] rounded-full bg-brand-gold/5 blur-[140px]" />

          <div className="absolute right-0 bottom-0 w-[520px] h-[520px] rounded-full bg-brand-olive/5 blur-[160px]" />

        </div>

        <div className="relative max-w-7xl mx-auto px-6">

          {/* Heading */}

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >

            <span className="uppercase tracking-[0.35em] text-xs font-semibold text-brand-gold">

              {ordering.eyebrow}

            </span>

            <h2 className="font-serif text-5xl lg:text-6xl mt-6">

              {ordering.title}

              <span className="italic text-brand-gold">

                {ordering.titleHighlight}

              </span>

            </h2>

            <p className="mt-8 text-lg text-gray-600 max-w-3xl mx-auto leading-8">

              {ordering.intro}

            </p>

          </motion.div>

          {/* Timeline */}

          <div className="relative">

            {/* Center Line */}

            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-brand-gold/30" />

            {ordering.steps.map((item) => ({
              title: item.title,
              desc: item.desc,
              icon: item.symbol,
            })).map((step, index) => (

              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.12 }}
                className={`relative flex items-center mb-20 ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}
              >

                {/* Card */}

                <motion.div
                  whileHover={{
                    y: -8,
                    scale: 1.02,
                  }}
                  className="w-full lg:w-[45%] bg-white rounded-[32px] shadow-xl p-8 border border-brand-gold/10"
                >

                  <div className="flex items-center gap-5">

                    <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-3xl">

                      {step.icon}

                    </div>

                    <div>

                      <span className="uppercase tracking-[0.25em] text-xs text-brand-gold">

                        {ordering.stepLabel} {index + 1}

                      </span>

                      <h3 className="font-serif text-3xl mt-2">

                        {step.title}

                      </h3>

                    </div>

                  </div>

                  <p className="mt-6 text-gray-600 leading-8">

                    {step.desc}

                  </p>

                </motion.div>

                {/* Timeline Circle */}

                <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-brand-olive text-white items-center justify-center shadow-lg font-bold text-lg">

                  {index + 1}

                </div>

              </motion.div>

            ))}

          </div>

          {/* Bottom CTA */}

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-24"
          >

            <div className="rounded-[40px] bg-brand-olive text-white px-10 lg:px-16 py-14 flex flex-col lg:flex-row items-center justify-between gap-8">

              <div>

                <span className="uppercase tracking-[0.3em] text-xs text-brand-gold">

                  {ordering.ctaEyebrow}

                </span>

                <h3 className="font-serif text-4xl mt-4">

                  {ordering.ctaTitle}

                </h3>

                <p className="mt-4 text-white/80 leading-8 max-w-2xl">

                  {ordering.ctaText}

                </p>

              </div>

              <motion.button
                whileHover={{
                  scale: 1.05,
                }}
                whileTap={{
                  scale: .97,
                }}
                onClick={() => navigate("/contact")}
                className="bg-brand-gold text-brand-charcoal px-8 py-4 rounded-full font-semibold flex items-center gap-3"
              >

                {ordering.ctaButton}

                <ArrowRight size={18} />

              </motion.button>

            </div>

          </motion.div>

        </div>

      </section>

      {/* LUXURY SHOWCASE GALLERY */}
      <SeriesLights variant="warm" />
      <section className="relative py-36 bg-white overflow-hidden">

        {/* Decorative Background */}

        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute -left-24 top-20 w-[420px] h-[420px] rounded-full bg-brand-gold/5 blur-[150px]" />

          <div className="absolute right-0 bottom-0 w-[520px] h-[520px] rounded-full bg-brand-olive/5 blur-[160px]" />

        </div>

        <div className="relative max-w-7xl mx-auto px-6">

          {/* Heading */}

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >

            <span className="uppercase tracking-[0.35em] text-xs font-semibold text-brand-gold">

              {gallery.eyebrow}

            </span>

            <h2 className="font-serif text-5xl lg:text-6xl mt-6">

              {gallery.title}

              <span className="italic text-brand-gold">

                {gallery.titleHighlight}

              </span>

            </h2>

            <p className="mt-8 max-w-3xl mx-auto text-lg leading-8 text-gray-600">

              {gallery.intro}

            </p>

          </motion.div>

          {/* Gallery Grid */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {gallery.items.map((item) => ({
              image: asset(item.image),
              title: item.title,
              category: item.category,
              height: "h-[520px]",
            })).map((item, index) => (

              <motion.div

                key={index}

                initial={{ opacity: 0, y: 60 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true }}

                transition={{
                  delay: index * 0.08,
                }}

                whileHover={{
                  y: -10,
                }}

                className={`group relative overflow-hidden rounded-[32px] shadow-xl ${item.height}`}

              >

                <motion.img

                  whileHover={{
                    scale: 1.08,
                  }}

                  transition={{
                    duration: .8,
                  }}

                  src={item.image}

                  alt={item.title}

                  className="absolute inset-0 w-full h-full object-cover"

                />

                {/* Overlay */}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-100 transition-all duration-500" />

                {/* Content */}

                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">

                  <span className="uppercase tracking-[0.25em] text-xs text-brand-gold">

                    {item.category}

                  </span>

                  <h3 className="font-serif text-3xl mt-3">

                    {item.title}

                  </h3>

                </div>

              </motion.div>

            ))}

          </div>

          {/* Bottom Highlight */}

          <motion.div

            initial={{ opacity: 0, y: 40 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true }}

            className="mt-24"

          >

            <div className="rounded-[40px] bg-brand-charcoal text-white px-10 lg:px-16 py-16 text-center shadow-2xl">

              <span className="uppercase tracking-[0.35em] text-xs text-brand-gold">

                {gallery.highlightEyebrow}

              </span>

              <h3 className="font-serif text-5xl mt-6">

                {gallery.highlightTitle}

              </h3>

              <p className="mt-8 max-w-3xl mx-auto leading-8 text-white/80">

                {gallery.highlightText}

              </p>

              <motion.button

                whileHover={{
                  scale: 1.05,
                }}

                whileTap={{
                  scale: .97,
                }}
                onClick={() => navigate("/products")}

                className="mt-10 bg-brand-gold text-brand-charcoal px-8 py-4 rounded-full font-semibold flex items-center gap-3 mx-auto"

              >

                {gallery.highlightButton}

                <ArrowRight size={18} />

              </motion.button>

            </div>

          </motion.div>

        </div>

      </section>

      {/* TESTIMONIALS: added from the admin panel; hidden until there is one */}
      {testimonials.length > 0 && (<>
      <SeriesLights variant="multi" />
      <section className="relative py-36 bg-brand-off-white overflow-hidden">

        <div className="max-w-7xl mx-auto px-6">

          {/* Heading */}

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >

            <span className="uppercase tracking-[0.35em] text-xs font-semibold text-brand-gold">

              {testimonialsSection.eyebrow}

            </span>

            <h2 className="font-serif text-5xl lg:text-6xl mt-6">

              {testimonialsSection.title}

              <span className="italic text-brand-gold">

                {testimonialsSection.titleHighlight}

              </span>

            </h2>

            <p className="mt-8 text-lg text-gray-600 max-w-3xl mx-auto">

              {testimonialsSection.intro}

            </p>

          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">

            {testimonials.map(t => ({
              name: t.name,
              company: [t.role, t.company].filter(Boolean).join(" • "),
              review: t.quote,
            })).map((item, index) => (

              <motion.div

                key={item.name}

                initial={{ opacity: 0, y: 40 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true }}

                transition={{ delay: index * .12 }}

                whileHover={{ y: -8 }}

                className="bg-white rounded-[30px] p-8 shadow-xl"

              >

                <div className="text-brand-gold text-2xl mb-6">

                  {testimonialsSection.stars}

                </div>

                <p className="leading-8 italic text-gray-600">

                  "{item.review}"

                </p>

                <div className="mt-8">

                  <h4 className="font-serif text-2xl">

                    {item.name}

                  </h4>

                  <p className="text-gray-500">

                    {item.company}

                  </p>

                </div>

              </motion.div>

            ))}

          </div>

        </div>

      </section>
      </>)}

      {/* FAQ */}
      <SeriesLights variant="warm" />
      <section className="py-36 bg-white">

        <div className="max-w-5xl mx-auto px-6">

          <motion.div

            initial={{ opacity: 0, y: 40 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true }}

            className="text-center mb-20"

          >

            <span className="uppercase tracking-[0.35em] text-xs text-brand-gold">

              {faq.eyebrow}

            </span>

            <h2 className="font-serif text-5xl mt-6">

              {faq.title}

            </h2>

          </motion.div>

          <div className="space-y-6">

            {faq.items.map((item) => ({
              q: item.question,
              a: item.answer,
            })).map((item, index) => (

              <motion.details

                key={index}

                initial={{ opacity: 0, y: 20 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true }}

                transition={{ delay: index * .08 }}

                className="group bg-brand-beige rounded-[24px] p-6 cursor-pointer"

              >

                <summary className="font-semibold text-xl list-none flex justify-between">

                  {item.q}

                  <span className="group-open:rotate-45 transition">

                    +

                  </span>

                </summary>

                <p className="mt-5 leading-8 text-gray-600">

                  {item.a}

                </p>

              </motion.details>

            ))}

          </div>

        </div>

      </section>

      {/* FINAL CTA*/}
      <SeriesLights variant="multi" />
      <section className="relative py-40 overflow-hidden bg-brand-olive text-white">

        {/* Background */}

        <div className="absolute inset-0">

          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark-olive via-brand-olive to-brand-dark-olive" />

          <div className="absolute left-0 top-0 w-[600px] h-[600px] rounded-full bg-brand-gold/10 blur-[180px]" />

          <div className="absolute right-0 bottom-0 w-[500px] h-[500px] rounded-full bg-brand-gold/10 blur-[180px]" />

        </div>

        {/* Fireworks */}

        <Fireworks className="absolute inset-0 w-full h-full" onDark />

        <motion.div

          initial={{ opacity: 0, y: 40 }}

          whileInView={{ opacity: 1, y: 0 }}

          viewport={{ once: true }}

          className="relative max-w-5xl mx-auto text-center px-6"

        >

          <span className="uppercase tracking-[0.4em] text-xs text-brand-gold">

            {cta.eyebrow}

          </span>

          <h2 className="font-serif text-6xl leading-tight mt-8">

            {cta.title}

            <span className="italic text-brand-gold">

              {cta.titleHighlight}

            </span>

          </h2>

          <p className="mt-10 text-xl text-white/80 leading-9 max-w-3xl mx-auto">

            {cta.intro}

          </p>

          <div className="flex flex-wrap justify-center gap-6 mt-14">

            <motion.button
              whileHover={{
                scale: 1.05,
                y: -3,
              }}
              whileTap={{
                scale: 0.97,
              }}
              onClick={() =>
                window.open(
                  catalogue,
                  "_blank"
                )
              }
              className="bg-brand-gold text-brand-charcoal px-10 py-5 rounded-full font-semibold flex items-center gap-3"
            >
              {cta.primaryButton}

              <ArrowRight size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/contact")}
              className="border border-white px-10 py-5 rounded-full"
            >
              {cta.secondaryButton}
            </motion.button>

          </div>

        </motion.div>

      </section>


    </div>

  );

}