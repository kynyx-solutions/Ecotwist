import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Footer } from "./Footer";
import { DeadlineBadge, StarField, StarMark, goldText } from "./NewYearDecor";
import content from "../content/pages/new-year-home.json";

/* ============================
   New Year footer: a greeting band with the order deadline above the
   regular footer (same links and newsletter, left untouched). Shown on
   every page while the New Year switch in src/config/homepage.ts is on.
============================ */

const { hero, cta } = content;

export const NewYearFooter = () => {
  // The New Year home page already ends with this call to action
  const onHome = useLocation().pathname === "/";
  return (
  <>
    {!onHome && (
    <section className="relative overflow-hidden bg-[#0E1A0B] px-5 py-14 text-white sm:px-8 lg:px-12">
      <StarField count={36} />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#E6C77A]">
            <StarMark /> {cta.eyebrow}
          </p>
          <p className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            {cta.title} <span className={`italic ${goldText}`}>{cta.titleHighlight}</span>
          </p>
          <div className="mt-5">
            <DeadlineBadge
              label={hero.deadlineLabel}
              date={hero.deadlineDate}
              text={hero.deadlineText}
              passedText={hero.deadlinePassedText}
            />
          </div>
        </div>
        <Link
          to="/get-proposal?occasion=festival"
          className="inline-flex shrink-0 items-center gap-3 rounded-full bg-gradient-to-r from-[#E6C77A] to-[#F3E3B3] px-8 py-4 font-semibold text-[#0E1A0B]"
        >
          {cta.proposalButton}
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
    )}
    <Footer />
  </>
  );
};
