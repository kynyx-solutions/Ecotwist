import { useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import faqs from '../content/faqs.json';

/* ============================
   "Frequently asked questions" above the footer, for every page listed in
   src/content/faqs.json. The answers are in the HTML (collapsed with
   <details>), so Google and AI search engines read them, and the same
   questions go into the page's FAQPage structured data (scripts/prerender.mjs).
============================ */

const PAGES = faqs.pages as Record<string, { q: string; a: string }[]>;

export function FaqSection() {
  const { pathname } = useLocation();
  const items = PAGES[pathname.replace(/\/+$/, '') || '/'];
  if (!items?.length) return null;

  return (
    <section aria-labelledby="faq-heading" className="bg-white px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <h2 id="faq-heading" className="font-serif text-3xl text-[#1f2a17] sm:text-4xl">{faqs.heading}</h2>
        <div className="mt-8 divide-y divide-[#e6e0cf] border-y border-[#e6e0cf]">
          {items.map((f, i) => (
            <details key={f.q} className="group py-1" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                <h3 className="text-base font-semibold text-[#1f2a17] sm:text-lg">{f.q}</h3>
                <Plus size={18} aria-hidden="true" className="shrink-0 text-[#38461B] transition group-open:rotate-45" />
              </summary>
              <p className="pb-5 text-[15px] leading-7 text-[#4b5243]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
