/* ============================
   Client testimonials, added from the admin panel (/admin → Website → Testimonials).
   The list lives in src/content/testimonials.json. Sections that show
   testimonials stay hidden while the list is empty.
============================ */

import data from '../content/testimonials.json';

export interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  company?: string;
}

export const testimonials: Testimonial[] = data.testimonials;
