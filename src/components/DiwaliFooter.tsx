import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { asset } from "../lib/content";
import content from "../content/pages/diwali-footer.json";
import catalogue from "../assests/depawali/Ecotwist Diwali Catalogue-2026.pdf";
import { Diya, Fireworks, Jaali, Kandil, Rangoli, SeriesLights } from "./DiwaliDecor";

/* ============================
   Festive footer, shown instead of Footer.tsx while the Diwali switch in
   src/config/homepage.ts is on. Same links and newsletter as the regular
   footer, which is left untouched.
============================ */

const DEVANAGARI = '"Tiro Devanagari Hindi", "Nirmala UI", "Mangal", serif';
const goldText = "bg-gradient-to-r from-[#F6D27A] via-[#F59E0B] to-[#E9C46A] bg-clip-text text-transparent";

const { greeting, brand, columns, newsletter, bottomBar } = content;

const SOCIALS = brand.socials;

const linkClass = "transition-colors hover:text-[#F6D27A]";

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h5 className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#E9C46A]">
      <span className="h-1.5 w-1.5 rotate-45 bg-[#F59E0B]" />
      {children}
    </h5>
  );
}

export const DiwaliFooter = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Same newsletter sign-up as the regular footer
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email.trim()) {
      setError(newsletter.emailRequiredMessage);
      return;
    }
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      setError(newsletter.invalidEmailMessage);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "newsletter", email, sourcePage: window.location.pathname }),
      });
      const result = await response.json();
      if (result.success) {
        setMessage(newsletter.successMessage);
        setEmail("");
      } else {
        setError(result.message);
      }
    } catch {
      setError(newsletter.connectionErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative overflow-hidden bg-[#12050d] text-white">
      {/* Festive night backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 0%, rgba(190,50,90,.28), transparent 70%)," +
            "linear-gradient(180deg, #24091a 0%, #12050d 60%, #0c0409 100%)",
        }}
      />
      <Jaali opacity={0.045} />
      <div className="pointer-events-none absolute -bottom-40 -right-40 hidden md:block">
        <Rangoli className="w-[560px] opacity-[0.07]" />
      </div>
      <div className="pointer-events-none absolute -left-32 top-1/2 hidden md:block">
        <Rangoli className="w-[360px] opacity-[0.05]" />
      </div>

      <SeriesLights variant="warm" />
      {/* short strings keep the lanterns above the greeting */}
      <Kandil className="absolute hidden md:block" style={{ left: "6%", top: 0 }} string={30} width={44} palette="marigold" />
      <Kandil className="absolute hidden md:block" style={{ right: "6%", top: 0 }} string={12} width={44} delay={2} />

      {/* Greeting band */}
      <div className="relative">
        <Fireworks className="absolute inset-0 h-full w-full" onDark />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 pb-12 pt-24 text-center md:pt-36 lg:flex-row lg:justify-between lg:text-left">
          <div>
            {/* padding keeps the vowel marks inside the clipped gold gradient */}
            <p style={{ fontFamily: DEVANAGARI }} className={`py-2 text-4xl leading-normal sm:text-5xl ${goldText}`}>
              {greeting.title}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
              {greeting.text}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/occasions/depawali-gifting"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#E9C46A] px-7 py-3.5 text-sm font-semibold text-[#2a0a1c] shadow-[0_12px_36px_-14px_rgba(245,158,11,.8)]"
            >
              {greeting.primaryButton}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/get-proposal?occasion=festival"
              className="inline-flex items-center justify-center rounded-full border border-[#E9C46A]/60 px-7 py-3.5 text-sm font-medium text-[#F6D27A] transition-colors hover:bg-white/5"
            >
              {greeting.secondaryButton}
            </Link>
          </div>
        </div>

        {/* Diyas on a rangoli-dotted ledge */}
        <div aria-hidden className="relative mx-auto flex max-w-7xl items-end gap-3 px-6 sm:gap-5">
          <span className="mb-3 h-px flex-1 border-t-2 border-dotted border-[#E9C46A]/40" />
          {Array.from({ length: 5 }, (_, i) => (
            <Diya key={i} delay={(i * 0.37) % 1.1} className={`w-9 sm:w-11 ${i === 0 || i === 4 ? "hidden sm:block" : ""}`} />
          ))}
          <span className="mb-3 h-px flex-1 border-t-2 border-dotted border-[#E9C46A]/40" />
        </div>
      </div>

      {/* Links */}
      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-16">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-10">
          {/* Brand & social */}
          <div className="lg:col-span-3">
            <Link to="/" className="group mb-8 flex w-fit flex-col items-start">
              <img src={asset(brand.logo)} alt={brand.logoAlt} className="h-16 w-auto object-contain transition group-hover:scale-105 sm:h-20" />
              <span className="mt-2 font-serif text-xl font-bold uppercase tracking-widest text-white sm:text-2xl">{brand.name}</span>
            </Link>
            <p className="mb-8 max-w-sm text-sm leading-relaxed text-white/55">
              {brand.description}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.name}
                  href={social.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold uppercase tracking-widest text-white/55 transition-colors hover:text-[#F6D27A]"
                >
                  {social.name}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6">
            {columns.map((column) => (
              <div key={column.heading}>
                <ColumnHeading>{column.heading}</ColumnHeading>
                <ul className="space-y-4 text-sm text-white/60">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {"key" in link && link.key === "catalogue" ? (
                        <a href={catalogue} target="_blank" rel="noopener noreferrer" className={linkClass}>{link.label}</a>
                      ) : link.path.startsWith("/") ? (
                        <Link to={link.path} className={linkClass}>{link.label}</Link>
                      ) : (
                        <a href={link.path} className={linkClass}>{link.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <ColumnHeading>{newsletter.heading}</ColumnHeading>
            <p className="mb-6 text-xs leading-relaxed text-white/55">
              {newsletter.text}
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={newsletter.placeholder}
                className={`rounded-full border bg-white/5 px-5 py-3 text-sm text-white transition-colors placeholder:text-white/35 focus:outline-none ${
                  error ? "border-red-500" : "border-[#E9C46A]/25 focus:border-[#E9C46A]"
                }`}
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              {message && <p className="text-xs text-green-400">{message}</p>}
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-gradient-to-r from-[#F59E0B] to-[#E9C46A] py-3 text-sm font-bold uppercase tracking-widest text-[#2a0a1c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? newsletter.buttonLoading : newsletter.button}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-[#E9C46A]/15 px-6 pb-10 pt-8 md:flex-row">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
          <span>{bottomBar.copyright}</span>
          {bottomBar.legalLinks.map((link) => (
            <Link key={link.path} to={link.path} className={linkClass}>{link.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-2 text-center text-[10px] uppercase tracking-[0.2em] text-white/40">
          {bottomBar.tagline}
          <span className="text-[#E9C46A]">{bottomBar.symbol}</span>
          <span style={{ fontFamily: DEVANAGARI }} className="text-xs normal-case tracking-normal text-[#F6D27A]/80">{bottomBar.greeting}</span>
        </div>
      </div>
    </footer>
  );
};
