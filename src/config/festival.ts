/* ============================
   Festival option on the Get Proposal page (/get-proposal)

   ACTIVE_FESTIVAL picks the festival shown as the highlighted first option in
   step 1 (Occasion). Change it for the next festival, or set it to null to
   hide the option. Edit a preset (or add one) to change its wording.

   Links to /get-proposal?occasion=festival open the form with the active
   festival already selected.

   A festival with `images` also replaces the two photos beside each step of
   the form; without them the regular photos show.
============================ */

export interface Festival {
  title: string;            // shown on the card and sent with the proposal as the occasion
  desc: string;
  greeting: string;
  icon: string;
  accent: [string, string]; // gradient for the card's border and badge
  tint: string;             // card background
  images?: Record<1 | 2 | 3 | 4 | 5, [string, string]>; // photos beside steps 1–5
}

// Web-sized Diwali artwork lives in /public/diwali-home
const diwaliPhoto = (file: string) => `/diwali-home/${file}`;
// Web-sized New Year photos live in /public/new-year-home
const newYearPhoto = (file: string) => `/new-year-home/${file}`;

export const FESTIVALS = {
  diwali: {
    title: "Diwali Gifting",
    desc: "Festive hampers, soya wax diyas and sweets for the festival of lights.",
    greeting: "शुभ दीपावली",
    icon: "🪔",
    accent: ["#F59E0B", "#B45309"],
    tint: "#FFF8EB",
    images: {
      1: [diwaliPhoto("hero-hamper.webp"), diwaliPhoto("workplace.webp")],              // Occasion
      2: [diwaliPhoto("proposal-luxury.webp"), diwaliPhoto("hamper-gourmet.webp")],     // Budget
      3: [diwaliPhoto("proposal-portfolio.webp"), diwaliPhoto("proposal-office.webp")], // Quantity
      4: [diwaliPhoto("proposal-branding.webp"), diwaliPhoto("proposal-packaging.webp")], // Branding
      5: [diwaliPhoto("hamper-executive.webp"), diwaliPhoto("hamper-client.webp")],     // Your details
    },
  },
  holi: {
    title: "Holi Gifting",
    desc: "Colourful hampers to celebrate the festival of colours.",
    greeting: "Happy Holi",
    icon: "🎨",
    accent: ["#EC4899", "#8B5CF6"],
    tint: "#FDF2F8",
  },
  rakhi: {
    title: "Raksha Bandhan Gifting",
    desc: "Thoughtful hampers that celebrate the bond between siblings.",
    greeting: "Happy Raksha Bandhan",
    icon: "🎀",
    accent: ["#F43F5E", "#F59E0B"],
    tint: "#FFF1F2",
  },
  christmas: {
    title: "Christmas Gifting",
    desc: "Seasonal hampers to spread holiday cheer across your teams.",
    greeting: "Merry Christmas",
    icon: "🎄",
    accent: ["#16A34A", "#B91C1C"],
    tint: "#F0FDF4",
  },
  newYear: {
    title: "New Year Gifting",
    desc: "Start the year with gifts your people will use every day.",
    greeting: "Happy New Year",
    icon: "🎆",
    accent: ["#437327", "#C5A059"],
    tint: "#F1F7EA",
    images: {
      1: [newYearPhoto("hero-thank-you-box.webp"), newYearPhoto("workplace.webp")],     // Occasion
      2: [newYearPhoto("kit-leadership.webp"), newYearPhoto("kit-celebration.webp")],   // Budget
      3: [newYearPhoto("kit-fresh-start.webp"), newYearPhoto("kit-planner.webp")],      // Quantity
      4: [newYearPhoto("edit-cork-diary.webp"), newYearPhoto("kit-artisan.webp")],      // Branding
      5: [newYearPhoto("kit-wellness.webp"), newYearPhoto("edit-bamboo.webp")],         // Your details
    },
  },
  eid: {
    title: "Eid Gifting",
    desc: "Elegant hampers of dry fruits and sweets for Eid celebrations.",
    greeting: "Eid Mubarak",
    icon: "🌙",
    accent: ["#047857", "#C5A059"],
    tint: "#ECFDF5",
  },
} satisfies Record<string, Festival>;

export const ACTIVE_FESTIVAL: keyof typeof FESTIVALS | null = "newYear";

export const activeFestival: Festival | null = ACTIVE_FESTIVAL ? FESTIVALS[ACTIVE_FESTIVAL] : null;
