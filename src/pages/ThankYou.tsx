import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import content from "../content/pages/thank-you.json";

// Page words: src/content/pages/thank-you.json (admin → Pages → Thank-you page)
const { hero, summary, quote } = content;

const FloatingParticles = () => {
  const particles = Array.from({ length: 18 });

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[#B8974A]/40"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            opacity: 0,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 6 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

const SuccessRing = () => {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 120 }}
    >
      <motion.div
        className="absolute w-28 h-28 rounded-full border-2 border-[#B8974A]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="w-20 h-20 rounded-full bg-[#2C2D1E] flex items-center justify-center text-white">
        <CheckCircle size={36} className="text-[#B8974A]" />
      </div>
    </motion.div>
  );
};

const ThankYou = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const configurator = location.state?.configurator;

  const [count, setCount] = useState(0);

  const submittedAt = new Date();

const submissionDate = submittedAt.toLocaleDateString("en-IN", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const submissionTime = submittedAt.toLocaleTimeString("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const submissionId = `ECO-${Date.now().toString().slice(-6)}`;

  useEffect(() => {
    let start = 0;
    const end = 24;
    const interval = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(interval);
    }, 60);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F6F1] relative overflow-hidden">
      <FloatingParticles />

      {/* MAIN GRID */}
      <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-10 items-center">
        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="uppercase tracking-[0.3em] text-xs text-[#5A8A6E] font-bold mb-6">
            {hero.eyebrow}
          </p>

          <h1 className="text-5xl md:text-7xl font-serif text-[#2C2D1E] leading-tight">
            {hero.titleLine1}
            <br />
            <span className="italic">{hero.titleLine2}</span>
          </h1>

          <p className="mt-8 text-lg text-[#2C2D1E]/70 leading-relaxed">
            {hero.text}
          </p>

          {/* TIMELINE */}
          <div className="mt-10 space-y-3">
            {hero.timeline.map(({ text: step }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="flex items-center gap-3 text-sm text-[#2C2D1E]/80"
              >
                <span className="w-2 h-2 rounded-full bg-[#B8974A]" />
                {step}
              </motion.div>
            ))}
          </div>

          {/* RESPONSE CARD */}
          <motion.div
            className="mt-10 p-6 bg-white/60 backdrop-blur-md border border-[#B8974A]/20 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs uppercase tracking-widest text-[#5A8A6E]">
              {hero.responseLabel}
            </p>
            <p className="text-3xl font-bold text-[#2C2D1E] mt-2">
              {count} {hero.responseUnit}
            </p>
          </motion.div>

          {/* BUTTONS */}
          <div className="flex flex-wrap gap-4 mt-10">
            <button
              onClick={() => navigate("/products")}
              className="px-6 py-3 bg-[#2C2D1E] text-white rounded-md cursor-pointer"
            >
              {hero.exploreButton}
            </button>

            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 border border-[#2C2D1E] text-[#2C2D1E] rounded-md cursor-pointer"
            >
              {hero.homeButton}
            </button>

            <button
              onClick={() => navigate("/contact")}
              className="px-6 py-3 border border-[#B8974A] text-[#B8974A] rounded-md cursor-pointer"
            >
              {hero.callButton}
            </button>
          </div>
        </motion.div>

      
        {/* RIGHT */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center"
        >

          {/* ================= RING ================= */}
          <div className="translate-x-[-25px] translate-y-[20px]">
            <SuccessRing />
          </div>

          {/* ================= SUBMISSION TAG ================= */}
          <motion.div
            className="mt-6 bg-white/70 backdrop-blur-xl px-8 py-4 rounded-xl border border-[#B8974A]/20 shadow-lg text-center"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          >
            <p className="text-xs uppercase tracking-widest text-[#5A8A6E]">
              {summary.submissionIdLabel}
            </p>

            <p className="font-bold text-[#2C2D1E] mt-1 text-lg">
              {submissionId}
            </p>
          </motion.div>

          {/* ================= CONFIGURATION CARD ================= */}
          <motion.div
            className="mt-8 w-full max-w-md bg-white/85 backdrop-blur-2xl rounded-2xl border border-[#B8974A]/25 shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >

            {/* HEADER */}
            <div className="bg-[#2C2D1E] text-white px-6 py-5">
              <h3 className="text-xl font-serif">
                {summary.title}
              </h3>

              <p className="text-xs uppercase tracking-[0.25em] text-[#B8974A] mt-1">
                {summary.subtitle}
              </p>
            </div>

            {/* BODY (UNCHANGED) */}
            <div className="p-6 space-y-8">

              {/* USER DETAILS */}
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#5A8A6E] font-semibold mb-5">
                  {summary.detailsHeading}
                </p>

                {/* Name */}
                <div className="flex items-center justify-between border-b border-[#B8974A]/20 pb-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#2C2D1E]/50">
                      {summary.nameLabel}
                    </p>
                    <p className="text-lg font-semibold text-[#2C2D1E]">
                      {configurator?.name || summary.notProvided}
                    </p>
                  </div>
                  <CheckCircle size={18} className="text-green-600" />
                </div>

                {/* Company */}
                <div className="flex items-center justify-between border-b border-[#B8974A]/20 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#2C2D1E]/50">
                      {summary.companyLabel}
                    </p>
                    <p className="text-lg font-semibold text-[#2C2D1E]">
                      {configurator?.company || summary.notProvided}
                    </p>
                  </div>
                  <CheckCircle size={18} className="text-green-600" />
                </div>

                {/* Email */}
                <div className="flex items-center justify-between border-b border-[#B8974A]/20 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#2C2D1E]/50">
                      {summary.emailLabel}
                    </p>
                    <p className="text-lg font-semibold text-[#2C2D1E] break-all">
                      {configurator?.email || summary.notProvided}
                    </p>
                  </div>
                  <CheckCircle size={18} className="text-green-600" />
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#2C2D1E]/50">
                      {summary.phoneLabel}
                    </p>
                    <p className="text-lg font-semibold text-[#2C2D1E]">
                      {configurator?.phone || summary.notProvided}
                    </p>
                  </div>
                  <CheckCircle size={18} className="text-green-600" />
                </div>
              </div>

              {/* DIVIDER */}
              <div className="h-px bg-gradient-to-r from-transparent via-[#B8974A]/30 to-transparent" />

              {/* CONFIGURATION */}
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#5A8A6E] font-semibold mb-5">
                  {summary.configurationHeading}
                </p>

                {/* Occasion — or the product, when ordered from the Products page */}
                <div className="flex items-center justify-between border-b border-[#B8974A]/20 pb-3">
                  <p className="text-lg font-semibold text-[#2C2D1E]">
                    {configurator?.product || configurator?.occasion || summary.notSelected}
                  </p>
                  <CheckCircle size={18} className="text-green-600" />
                </div>

                {/* Budget */}
                <div className="flex items-center justify-between border-b border-[#B8974A]/20 py-3">
                  <p className="text-lg font-semibold text-[#2C2D1E]">
                    {configurator?.budget || summary.notSelected}
                  </p>
                  <CheckCircle size={18} className="text-green-600" />
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between border-b border-[#B8974A]/20 py-3">
                  <p className="text-lg font-semibold text-[#2C2D1E]">
                    {configurator?.quantity || summary.notSelected}
                  </p>
                  <CheckCircle size={18} className="text-green-600" />
                </div>

                {/* Branding */}
                <div className="flex items-center justify-between pt-3">
                  <p className="text-lg font-semibold text-[#2C2D1E]">
                    {configurator?.branding || summary.notSelected}
                  </p>
                  <CheckCircle size={18} className="text-green-600" />
                </div>

              </div>
            </div>

            {/* FOOTER */}
            <div className="bg-[#F8F6F1] px-6 py-5 border-t border-[#B8974A]/20">
              <div className="flex justify-between">
                <span className="text-sm text-[#2C2D1E]/60">{summary.statusLabel}</span>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  {summary.statusValue}
                </span>
              </div>

              <div className="flex justify-between mt-3">
                <span className="text-sm text-[#2C2D1E]/60">{summary.dateLabel}</span>
                <span className="font-semibold text-[#2C2D1E]">{submissionDate}</span>
              </div>

              <div className="flex justify-between mt-3">
                <span className="text-sm text-[#2C2D1E]/60">{summary.timeLabel}</span>
                <span className="font-semibold text-[#2C2D1E]">{submissionTime}</span>
              </div>
            </div>

          </motion.div>
        </motion.div>
      </div>

      {/* QUOTE */}
      <motion.div
        className="text-center mt-20 text-[#2C2D1E]/60 italic font-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {quote.text}
      </motion.div>
    </div>
  );
};

export default ThankYou;