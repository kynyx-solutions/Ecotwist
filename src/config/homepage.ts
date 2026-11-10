/* ============================
   Which page shows at "/", and which footer shows on every page

   HOME_PAGE
     "newYear" -> the New Year special home page (src/pages/NewYearHome.tsx)
                  and the New Year footer (src/components/NewYearFooter.tsx)
     "diwali"  -> the Diwali special home page (src/pages/DiwaliHome.tsx)
                  and the Diwali footer (src/components/DiwaliFooter.tsx)
     "default" -> the regular home page (src/pages/Home.tsx)
                  and the regular footer (src/components/Footer.tsx)

   SHOW_UNTIL
     Safety net for each festive page: from this date (midnight, India time)
     the regular home page and footer come back on their own, even if
     HOME_PAGE still names that festival. It is checked in each visitor's
     browser, so no redeploy is needed for it to switch.
============================ */

export type HomeTheme = "default" | "diwali" | "newYear";

export const HOME_PAGE: HomeTheme = "newYear";

export const SHOW_UNTIL: Record<Exclude<HomeTheme, "default">, string> = {
  diwali: "2026-11-16",
  newYear: "2027-01-10",
};

/** The theme to show right now: HOME_PAGE, or "default" once its date has passed. */
export function homeTheme(now = new Date()): HomeTheme {
  if (HOME_PAGE === "default") return "default";
  return now < new Date(`${SHOW_UNTIL[HOME_PAGE]}T00:00:00+05:30`) ? HOME_PAGE : "default";
}
