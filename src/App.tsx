import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AnalyticsTracker } from './lib/analytics';
import { SeoManager } from './components/SeoManager';
import { RelatedLinks } from './components/RelatedLinks';

// ── Core pages (default exports) ──────────────────────
import { Home } from "./pages/Home";
import DiwaliHome from "./pages/DiwaliHome";
import NewYearHome from "./pages/NewYearHome";
import { DiwaliFooter } from './components/DiwaliFooter';
import { NewYearFooter } from './components/NewYearFooter';
import { homeTheme } from "./config/homepage";
import Contact      from './pages/Contact';
import { Solutions } from "./pages/Solutions";
import GetProposal  from './pages/GetProposal';
import Impact       from './pages/Impact';
import  ThankYou  from './pages/ThankYou';
import Blog         from './pages/Blog';
import BlogPost     from './pages/BlogPost';

// ── Original 5 Occasion pages ─────────────────────────
import ClientAppreciation from './pages/ClientAppreciation';
import EmployeeOnboarding from './pages/EmployeeOnboarding';
import FestiveGifting     from './pages/FestiveGifting.';
import EventsConferences  from './pages/EventsConferences..tsx';
import EmployeeWellness   from './pages/EmployeeWellness..tsx';

// ── New 5 Occasion pages ──────────────────────────────
import BirthdayGifting    from './pages/BirthdayGifting.tsx';
import WorkAnniversary    from './pages/WorkAnniversary.tsx';
import ProductLaunch      from './pages/ProductLaunch.tsx';
import AwardRecognition   from './pages/AwardRecognition.tsx';
import RetirementGifting  from './pages/RetirementGifting.tsx';
import DepawaliGifting from './pages/Depawali.tsx';
import  ProductList  from './pages/Products.tsx';
import Shop        from './pages/shop/Shop';
import ProductPage from './pages/shop/ProductPage';
import Cart        from './pages/shop/Cart';
import OrderPlaced from './pages/shop/OrderPlaced';

// ── Newer occasion pages: one shared layout, one content file each ──
import OccasionTemplate, { type OccasionContent } from './pages/OccasionTemplate';
import womensDay       from './content/pages/womens-day.json';
import christmas       from './content/pages/christmas-gifting.json';
import earthDay        from './content/pages/earth-day-gifting.json';
import channelPartners from './content/pages/channel-partner-gifting.json';
const TEMPLATE_OCCASIONS = [womensDay, christmas, earthDay, channelPartners] as OccasionContent[];

// ── Policy pages ──────────────────────────────────────
import PrivacyPolicy   from './components/PrivacyPolicy';
import TermsOfService  from './components/TermsOfService';
import RefundPolicy    from './components/RefundPolicy';
import ShippingPolicy  from './components/ShippingPolicy';
// ──────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';


/* ========= PAGE TRANSITION WRAPPER ========= */
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

/* ========= FESTIVE SWITCH (src/config/homepage.ts) ========= */
const HOME_PAGES = { default: <Home />, diwali: <DiwaliHome />, newYear: <NewYearHome /> };
const FOOTERS = { default: <Footer />, diwali: <DiwaliFooter />, newYear: <NewYearFooter /> };

/* ========= ANIMATED ROUTES ========= */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
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
  );
};

/* ========= MAIN APP ========= */
export default function App() {
  return (
    <Router>
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
        {FOOTERS[homeTheme()]}
      </div>
    </Router>
  );
}



// import EcotwistComingSoon from './components/Coming';

// export default function App() {
//   return (
//     <EcotwistComingSoon />
//   );
// }

