import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import nav from '../content/pages/navigation.json';
import home from '../content/pages/home.json';
import { inr, productById, products } from '../lib/store';
import { asset, responsive } from '../lib/content';

/* ============================
   "Explore more" block above the footer on every page: related occasions
   (with starting price and kit count from the store) and keyword links.
   Gives search engines and visitors contextual internal links between the
   occasion pages, the shop and the guides.
============================ */

// Store occasion name → occasion page
const STORE_OCCASION: Record<string, string> = {
  '/occasions/client-appreciation': 'Client Appreciation', '/occasions/employee-onboarding': 'Onboarding',
  '/occasions/festive-gifting': 'Festive', '/occasions/depawali-gifting': 'Festive', '/occasions/events-conferences': 'Events',
  '/occasions/employee-wellness': 'Wellness', '/occasions/birthday-gifting': 'Birthday', '/occasions/work-anniversary': 'Work Anniversary',
  '/occasions/product-launch': 'Product Launch', '/occasions/award-recognition': 'Awards', '/occasions/retirement-gifting': 'Retirement',
  '/occasions/womens-day': "Women's Day", '/occasions/christmas-gifting': 'Christmas', '/occasions/earth-day-gifting': 'Earth Day',
  '/occasions/channel-partner-gifting': 'Channel Partners',
};

// Which occasions to suggest from each page (closest buying intent first)
const RELATED: Record<string, string[]> = {
  '/occasions/client-appreciation': ['channel-partner-gifting', 'festive-gifting', 'product-launch', 'award-recognition'],
  '/occasions/employee-onboarding': ['work-anniversary', 'employee-wellness', 'birthday-gifting', 'events-conferences'],
  '/occasions/festive-gifting': ['depawali-gifting', 'christmas-gifting', 'client-appreciation', 'womens-day'],
  '/occasions/depawali-gifting': ['festive-gifting', 'client-appreciation', 'channel-partner-gifting', 'employee-onboarding'],
  '/occasions/events-conferences': ['product-launch', 'earth-day-gifting', 'channel-partner-gifting', 'employee-onboarding'],
  '/occasions/employee-wellness': ['womens-day', 'birthday-gifting', 'earth-day-gifting', 'employee-onboarding'],
  '/occasions/birthday-gifting': ['work-anniversary', 'employee-wellness', 'award-recognition', 'womens-day'],
  '/occasions/work-anniversary': ['award-recognition', 'retirement-gifting', 'birthday-gifting', 'employee-onboarding'],
  '/occasions/product-launch': ['events-conferences', 'client-appreciation', 'channel-partner-gifting', 'earth-day-gifting'],
  '/occasions/award-recognition': ['work-anniversary', 'channel-partner-gifting', 'retirement-gifting', 'client-appreciation'],
  '/occasions/retirement-gifting': ['work-anniversary', 'award-recognition', 'employee-wellness', 'client-appreciation'],
  '/occasions/womens-day': ['employee-wellness', 'birthday-gifting', 'festive-gifting', 'earth-day-gifting'],
  '/occasions/christmas-gifting': ['festive-gifting', 'client-appreciation', 'employee-wellness', 'womens-day'],
  '/occasions/earth-day-gifting': ['employee-onboarding', 'events-conferences', 'employee-wellness', 'womens-day'],
  '/occasions/channel-partner-gifting': ['client-appreciation', 'award-recognition', 'festive-gifting', 'product-launch'],
};
const POPULAR = ['employee-onboarding', 'client-appreciation', 'festive-gifting', 'events-conferences'];

const KEYWORD_LINKS = [
  { to: '/shop', text: 'Eco-friendly corporate gifts' },
  { to: '/shop?budget=u500', text: 'Corporate gifts under ₹500' },
  { to: '/occasions/employee-onboarding', text: 'Employee welcome kits' },
  { to: '/occasions/depawali-gifting', text: 'Diwali corporate gifts' },
  { to: '/occasions/client-appreciation', text: 'Client appreciation gifts' },
  { to: '/occasions/events-conferences', text: 'Conference giveaways' },
  { to: '/occasions/earth-day-gifting', text: 'ESG & CSR gifting' },
  { to: '/get-proposal', text: 'Bulk corporate gifting quote' },
  { to: '/products', text: 'Sustainable gift products' },
  { to: '/blog', text: 'Corporate gift ideas & guides' },
];

const HIDE_ON = ['/cart', '/order-placed', '/thanks'];
const images = Object.fromEntries(home.occasions.cards.map((c) => [c.path, c.image]));
images['/occasions/depawali-gifting'] = '/kits/jar-box-2-palace.webp';

function occasionCard(path: string) {
  const o = nav.occasions.find((x) => x.path === path);
  if (!o) return null;
  const kits = products.filter((p) => p.occasions.includes(STORE_OCCASION[path] ?? ''));
  const prices = kits.map((p) => p.price).filter((p): p is number => p != null);
  return { ...o, image: images[path], kits: kits.length, from: prices.length ? Math.min(...prices) : null, store: STORE_OCCASION[path] };
}

export function RelatedLinks() {
  const { pathname } = useLocation();
  if (HIDE_ON.includes(pathname)) return null;

  // Product pages suggest that product's occasions
  let slugs = RELATED[pathname];
  const productMatch = pathname.match(/^\/shop\/([^/]+)$/);
  if (productMatch) {
    const p = productById(productMatch[1]);
    const fromProduct = Object.entries(STORE_OCCASION).filter(([, name]) => p?.occasions.includes(name)).map(([path]) => path.replace('/occasions/', ''));
    slugs = [...new Set([...fromProduct, ...POPULAR])];
  }
  const cards = (slugs ?? POPULAR).map((s) => occasionCard(`/occasions/${s}`)).filter((c): c is NonNullable<ReturnType<typeof occasionCard>> => !!c && c.path !== pathname).slice(0, 4);

  return (
    <section aria-labelledby="explore-heading" className="border-t border-[#e6e0cf] bg-[#F4F1EA] px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="explore-heading" className="font-serif text-3xl text-[#1f2a17] sm:text-4xl">Explore more corporate gifting ideas</h2>
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#38461B] underline-offset-4 hover:underline">
            Shop all eco-friendly gifts <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((c) => (
            <article key={c.path} className="flex flex-col overflow-hidden rounded-2xl border border-[#e6e0cf] bg-white">
              <Link to={c.path} className="group block">
                <div className="aspect-[4/3] overflow-hidden bg-[#efeadf]">
                  {c.image && <img {...responsive(c.image, '(min-width: 1024px) 25vw, 50vw')} alt={`${c.label} corporate gifts`} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                </div>
                <div className="p-4 pb-2">
                  <h3 className="font-serif text-lg leading-snug text-[#1f2a17] group-hover:underline">{c.label}</h3>
                  <h4 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f2e]">
                    {c.kits ? `${c.kits} kits${c.from != null ? ` · from ${inr(c.from)}` : ''}` : c.tag}
                  </h4>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5f6655]">{c.desc}</p>
                </div>
              </Link>
              {c.store && c.kits > 0 && (
                <Link to={`/shop?occasion=${encodeURIComponent(c.store)}`} className="mt-auto px-4 pb-4 text-sm font-semibold text-[#38461B] hover:underline">
                  Shop {c.label.toLowerCase()} kits →
                </Link>
              )}
            </article>
          ))}
        </div>

        <div className="mt-10">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#5f6655]">Popular searches</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {KEYWORD_LINKS.filter((k) => k.to !== pathname).map((k) => (
              <li key={k.to + k.text}>
                <Link to={k.to} className="inline-block rounded-full border border-[#d8cfae] bg-white px-3.5 py-1.5 text-sm text-[#1f2a17] hover:border-[#38461B]">
                  {k.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
