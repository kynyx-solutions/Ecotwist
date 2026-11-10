/* ============================
   Client testimonials, added from the admin panel (/admin → Website → Testimonials).
   The list lives in src/content/testimonials.json. Sections that show
   testimonials stay hidden while no testimonial is approved.

   Only entries with "approved": true appear on the website. Keep a quote
   unapproved until the client has confirmed the exact wording.
============================ */

import data from '../content/testimonials.json';

export interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  company?: string;
  logo?: string;
  approved?: boolean;
}

export const testimonials: Testimonial[] = (data.testimonials as Testimonial[]).filter((t) => t.approved === true && t.quote.trim());
