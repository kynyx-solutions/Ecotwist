import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AnalyticsTracker } from './lib/analytics';
import { SeoManager } from './components/SeoManager';
import { RelatedLinks } from './components/RelatedLinks';

// ── Core pages (default exports) ──────────────────────
const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const DiwaliHome = lazy(() => import("./pages/DiwaliHome"));
const NewYearHome = lazy(() => import("./pages/NewYearHome"));
const DiwaliFooter = lazy(() => import('./components/DiwaliFooter').then((m) => ({ default: m.DiwaliFooter })));
const NewYearFooter = lazy(() => import('./components/NewYearFooter').then((m) => ({ default: m.NewYearFooter })));
import { homeTheme } from "./config/homepage";
const Contact = lazy(() => import('./pages/Contact'));
const Solutions = lazy(() => import("./pages/Solutions").then((m) => ({ default: m.Solutions })));
const GetProposal = lazy(() => import('./pages/GetProposal'));
const Impact = lazy(() => import('./pages/Impact'));
const ThankYou = lazy(() => import('./pages/ThankYou'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));

// ── Original 5 Occasion pages ─────────────────────────
const ClientAppreciation = lazy(() => import('./pages/ClientAppreciation'));
const EmployeeOnboarding = lazy(() => import('./pages/EmployeeOnboarding'));
const FestiveGifting = lazy(() => import('./pages/FestiveGifting.'));
const EventsConferences = lazy(() => import('./pages/EventsConferences..tsx'));
const EmployeeWellness = lazy(() => import('./pages/EmployeeWellness..tsx'));

// ── New 5 Occasion pages ──────────────────────────────
const BirthdayGifting = lazy(() => import('./pages/BirthdayGifting.tsx'));
const WorkAnniversary = lazy(() => import('./pages/WorkAnniversary.tsx'));
const ProductLaunch = lazy(() => import('./pages/ProductLaunch.tsx'));
const AwardRecognition = lazy(() => import('./pages/AwardRecognition.tsx'));
const RetirementGifting = lazy(() => import('./pages/RetirementGifting.tsx'));
const DepawaliGifting = lazy(() => import('./pages/Depawali.tsx'));
const ProductList = lazy(() => import('./pages/Products.tsx'));
const Shop = lazy(() => import('./pages/shop/Shop'));
const ProductPage = lazy(() => import('./pages/shop/ProductPage'));
const Cart = lazy(() => import('./pages/shop/Cart'));
const OrderPlaced = lazy(() => import('./pages/shop/OrderPlaced'));

// ── Newer occasion pages: one shared layout, one content file each ──
import type { OccasionContent } from './pages/OccasionTemplate';
const OccasionTemplate = lazy(() => import('./pages/OccasionTemplate'));
import womensDay       from './content/pages/womens-day.json';
import christmas       from './content/pages/christmas-gifting.json';
import earthDay        from './content/pages/earth-day-gifting.json';
import channelPartners from './content/pages/channel-partner-gifting.json';
const TEMPLATE_OCCASIONS = [womensDay, christmas, earthDay, channelPartners] as OccasionContent[];

// ── Policy pages ──────────────────────────────────────
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const RefundPolicy = lazy(() => import('./components/RefundPolicy'));
const ShippingPolicy = lazy(() => import('./components/ShippingPolicy'));
// ──────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';


/* ========= PAGE TRANSITION WRAPPER ========= */
// The first page a visitor lands on shows straight away (no fade-in), so it
// paints as early as possible; later page changes keep the transition.
let firstPage = true;
const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const initial = firstPage ? false : { opacity: 0, y: 20, filter: 'blur(10px)' };
  firstPage = false;
  return (
  <motion.div
    initial={initial}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
  );
};

/* ========= FESTIVE SWITCH (src/config/homepage.ts) ========= */
const HOME_PAGES = { default: <Home />, diwali: <DiwaliHome />, newYear: <NewYearHome /> };
const FOOTERS = { default: <Footer />, diwali: <DiwaliFooter />, newYear: <NewYearFooter /> };

/* ========= ANIMATED ROUTES ========= */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>

        {/* ── Core routes ── */}
        {/* "/" shows a festive home page or the regular one: switch in src/config/homepage.ts */}
        <Route path="/"             element={<PageWrapper>{HOME_PAGES[homeTheme()]}</PageWrapper>} />
        <Route path="/contact"      element={<PageWrapper><Contact /></PageWrapper>} />
        <Route path="/solutions"    element={<PageWrapper><Solutions /></PageWrapper>} />
        <Route path="/get-proposal" element={<PageWrapper><GetProposal /></PageWrapper>} />
        {/* Old address of the proposal form: forward it, keeping any ?occasion=… */}
        <Route path="/configurator" element={<Navigate to={{ pathname: '/get-proposal', search: location.search }} state={location.state} replace />} />
        <Route path="/impact"       element={<PageWrapper><Impact /></PageWrapper>} />
        <Route path="/product"      element={<PageWrapper><ProductList /></PageWrapper>} />
        <Route path="/thanks"      element={<PageWrapper><ThankYou /></PageWrapper>} /> 
        <Route path="/blog"         element={<PageWrapper><Blog /></PageWrapper>} />
        <Route path="/blog/:slug"   element={<PageWrapper><BlogPost /></PageWrapper>} />

        {/* ── Original 5 occasion routes ── */}
        <Route path="/occasions/client-appreciation" element={<PageWrapper><ClientAppreciation /></PageWrapper>} />
        <Route path="/occasions/employee-onboarding" element={<PageWrapper><EmployeeOnboarding /></PageWrapper>} />
        <Route path="/occasions/festive-gifting"     element={<PageWrapper><FestiveGifting /></PageWrapper>} />
        <Route path="/occasions/events-conferences"  element={<PageWrapper><EventsConferences /></PageWrapper>} />
        <Route path="/occasions/employee-wellness"   element={<PageWrapper><EmployeeWellness /></PageWrapper>} />

        {/* ── New 5 occasion routes ── */}
        <Route path="/occasions/birthday-gifting"    element={<PageWrapper><BirthdayGifting /></PageWrapper>} />
        <Route path="/occasions/work-anniversary"    element={<PageWrapper><WorkAnniversary /></PageWrapper>} />
        <Route path="/occasions/product-launch"      element={<PageWrapper><ProductLaunch /></PageWrapper>} />
        <Route path="/occasions/award-recognition"   element={<PageWrapper><AwardRecognition /></PageWrapper>} />
        <Route path="/occasions/retirement-gifting"  element={<PageWrapper><RetirementGifting /></PageWrapper>} />
        <Route path="/occasions/depawali-gifting"      element={<PageWrapper><DepawaliGifting /></PageWrapper>} />
        {TEMPLATE_OCCASIONS.map((c) => (
          <Route key={c._meta.route} path={c._meta.route} element={<PageWrapper><OccasionTemplate content={c} /></PageWrapper>} />
        ))}
        <Route path="/products"                      element={<PageWrapper><ProductList /></PageWrapper>} />

        {/* ── Online store ── */}
        <Route path="/shop"          element={<PageWrapper><Shop /></PageWrapper>} />
        <Route path="/shop/:id"      element={<PageWrapper><ProductPage /></PageWrapper>} />
        <Route path="/cart"          element={<PageWrapper><Cart /></PageWrapper>} />
        <Route path="/order-placed"  element={<PageWrapper><OrderPlaced /></PageWrapper>} />

        {/* ── Policy routes ── */}
        <Route path="/privacy-policy"   element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
        <Route path="/terms-of-service" element={<PageWrapper><TermsOfService /></PageWrapper>} />
        <Route path="/refund-policy"    element={<PageWrapper><RefundPolicy /></PageWrapper>} />
        <Route path="/shipping-policy"  element={<PageWrapper><ShippingPolicy /></PageWrapper>} />

      </Routes>
    </AnimatePresence>
    </Suspense>
  );
};

/* ========= MAIN APP ========= */
// Everything inside the router. The browser wraps it in <BrowserRouter> (below);
// the build-time pre-renderer (src/entry-server.tsx) wraps it in a <StaticRouter>.
export function AppShell() {
  return (
    <>
      <AnalyticsTracker />
      <SeoManager />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <AnimatedRoutes />
        </main>
        {/* Related occasions and keyword links (internal linking) */}
        <RelatedLinks />
        {/* Festive footer or the regular one: switch in src/config/homepage.ts */}
        <Suspense fallback={null}>{FOOTERS[homeTheme()]}</Suspense>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}



// import EcotwistComingSoon from './components/Coming';

// export default function App() {
//   return (
//     <EcotwistComingSoon />
//   );
// }

