/* ============================
   Where a customer's logo or brand name sits on each product photo, for the
   live preview on product pages. Measured on the photos themselves:
     x, y  centre of the printable surface (% of image width / height)
     w, h  the box the logo fits inside (% of image width / height)
     rot   rotation in degrees, to follow the surface
     tone  'light' or 'dark' surface: picks the engraving / foil look
     cover soften what is printed there now (an emblem or another mark)
   Photos without a good surface show the branding on a gift tag instead.
============================ */

export interface Zone { x: number; y: number; w: number; h: number; rot?: number; tone: 'light' | 'dark'; cover?: boolean }

const Z = (x: number, y: number, w: number, h: number, tone: Zone['tone'], rot = 0, cover = false): Zone => ({ x, y, w, h, rot, tone, cover });

export const MOCKUP_ZONES: Record<string, Zone> = {
  // Cork diaries and desk kits: on the cork half of the cover
  '/new-year-home/kit-desk-essentials.webp': Z(47, 43, 28, 12, 'light'),
  '/kits/cork-diary-pen-flatlay.webp': Z(44, 43, 28, 12, 'light'),
  '/new-year-home/kit-onboarding.webp': Z(42, 21, 24, 16, 'light'),
  '/kits/cork-denim-diaries.webp': Z(42, 21, 24, 16, 'light'),
  '/kits/cork-denim-diary-branded.webp': Z(48, 39, 30, 18, 'light', 0, true),
  '/kits/cork-diary-pen.webp': Z(47, 45, 15, 30, 'light'),
  '/kits/cork-pens.webp': Z(50, 43, 22, 5, 'light', 58),
  '/kits/paper-pen.webp': Z(44.4, 55.1, 40, 2.4, 'light', -61, true), // same band as the printed text
  '/kits/seed-pencils.webp': Z(57, 52, 22, 4, 'light', -17),

  // Bottles and drinkware
  '/new-year-home/kit-bamboo-workday.webp': Z(42, 45, 13, 22, 'light'),
  '/kits/bamboo-bottle-infuser.webp': Z(43, 42, 14, 24, 'light'),
  '/site/employee-onboarding/recycled-glass-bottle.png': Z(44, 58, 13, 18, 'light'),
  '/site/employee-onboarding/artisan-ceramic-mug.png': Z(62, 56, 14, 18, 'light'),
  '/site/events-conferences/ceramic-tumbler.png': Z(41, 38, 10, 14, 'light', 0, true),
  '/site/events-conferences/glass-carafe.png': Z(56, 62, 10, 14, 'light'),

  // Jar boxes: on the closed lid
  '/new-year-home/kit-classic-2-jar.webp': Z(27, 19, 20, 12, 'dark', -4, true),
  '/kits/jar-box-2-navy.webp': Z(27, 19, 20, 12, 'dark', -4, true),
  '/new-year-home/kit-executive.webp': Z(30, 15, 24, 11, 'dark', -2),
  '/kits/jar-box-4-navy.webp': Z(30, 12, 24, 10, 'dark', -2),
  '/kits/jar-box-3-velvet.webp': Z(79, 15, 16, 10, 'dark', 0, true),
  '/kits/jar-box-2-white.webp': Z(77, 16, 16, 10, 'light', -3, true),
  '/kits/jar-box-2-palace.webp': Z(75, 12, 18, 9, 'dark', -3, true),
  '/site/diwali-gifting/dry-fruit.png': Z(50, 59, 22, 8, 'light', 0, true),

  // Hampers and gift boxes: lid, notebook or box front
  '/kits/pinewood-basket.webp': Z(56, 71, 30, 9, 'light'),
  '/site/diwali-gifting/wellness-hamper.png': Z(58, 9, 14, 8, 'dark', -3, true),
  '/site/diwali-gifting/gourmet-hamper.png': Z(55, 14, 22, 9, 'dark', -4, true),
  '/site/diwali-gifting/premium-packaging.png': Z(38, 30, 20, 11, 'dark', -10, true),
  '/site/client-appreciation/the-catalyst.png': Z(36, 44, 13, 12, 'light', -10, true),
  '/site/client-appreciation/grand-celebration.png': Z(55, 33, 13, 13, 'light', 0, true),
  '/site/client-appreciation/custom-tech.png': Z(69, 68, 12, 13, 'light', -8, true),
  '/site/client-appreciation/personalization.png': Z(55, 55, 12, 12, 'dark', 0, true),
  '/site/client-appreciation/morning-ritual.jpg': Z(55, 78, 22, 9, 'light', -8),
  '/kits/kraft-gift-box.webp': Z(36, 55, 12, 12, 'dark', -10),
  '/new-year-home/kit-fresh-start.webp': Z(36, 55, 12, 12, 'dark', -10),
  '/site/award-recognition/gold-excellence-hamper.jpeg': Z(68, 46, 16, 12, 'dark', -18),
  '/site/work-anniversary/years-of-service-awards.png': Z(44, 20, 16, 12, 'dark', 0, true),
  '/site/work-anniversary/milestone-memory-box.png': Z(44, 55, 16, 13, 'dark', 0, true),

  // Notebooks, folios and other single items
  '/site/employee-onboarding/eco-leather-notebook.png': Z(52, 45, 26, 20, 'dark', -5),
  '/site/work-anniversary/leather-folio.png': Z(60, 70, 20, 10, 'dark', 0, true),
  '/site/events-conferences/bamboo-journal.png': Z(28, 33, 14, 12, 'light', 0, true),
  '/site/employee-onboarding/sustainable-tote.png': Z(55, 62, 30, 20, 'light'),
  '/site/events-conferences/canvas-tote.png': Z(45, 52, 22, 15, 'light', 0, true),
  '/site/employee-wellness/tea-press.png': Z(88, 45, 10, 16, 'light', 0, true),
  '/site/employee-wellness/yoga-mat.png': Z(60, 72, 18, 9, 'dark', -15),
  '/site/work-anniversary/desk-planter.png': Z(52, 65, 10, 12, 'dark', 0, true),
};

/** Fallback when a photo has no zone: a small gift tag in the lower-right corner. */
export const TAG_ZONE = { x: 80, y: 84, w: 26, h: 14 };
