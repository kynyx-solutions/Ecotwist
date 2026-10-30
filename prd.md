# PRD: Ecotwist Website Improvements

**Date:** 30 Oct 2026 · **Status:** Draft

## Overview

Ecotwist.in generates B2B gifting leads, but today we cannot measure them, search engines barely see the site, and the lead backend is unprotected. This PRD lists the fixes in priority order. They come from a code review of this repo done on 30 Oct 2026.

**Current state**

- **Tracking is off.** The code calls Google Analytics (G-5CPVWVZ880) and Meta Pixel, but neither script is ever loaded, so every page view and conversion event is dropped.
- **SEO is minimal.** Every page shares the title "ECOTWIST", there is no meta description or Open Graph tags, and the site renders only in the browser, so crawlers see an empty page.
- **The lead backend is unprotected.** The Express API on Render saves form data to MongoDB with no validation, no rate limiting and CORS open to any site. Nobody is notified when a lead arrives.
- **The site is heavy.** All 20+ pages load up front, product photos are 4–6 MB each, and the repo is 609 MB, including about 53 MB of unused PDFs and video.
- **The code is hard to change.** Eleven occasion pages repeat the same sections across roughly 15,000 lines, and there is no README, CI or descriptive commit history.

**Why now:** Diwali is the peak gifting season. Leads that arrive now with no tracking or notification are lost, or can't be traced back to the ads that brought them.

## Goals and success metrics

The goal is a site where every lead is captured, counted, attributed and followed up within a business day.

| Goal | Metric | Target |
| --- | --- | --- |
| Measure traffic and leads | Page views and lead events visible in GA4 and Meta Events Manager | 100% of form submits tracked within 1 week of launch |
| Never miss a lead | Submissions that trigger a sales email | 100% |
| Get found on search | Pages with a unique title and description; pages indexed in Google Search Console | All public routes; indexed count rising month on month |
| Stop spam | Junk submissions per week | Near zero after validation, rate limiting and a captcha |
| Load fast on mobile | Lighthouse mobile performance score on home and /products | 80 or higher (measure the current score first) |
| Make changes safe | Builds checked automatically before deploy | Every push runs type check and build in CI |

**Non-goals**

- Visual redesign or new branding.
- New pages, occasions or product catalogue content.
- E-commerce, checkout or online payments.
- A CRM. Leads go to email first; a CRM integration can follow later.

## Requirements

P0 items stop lost leads and lost data and ship first. P1 items improve speed. P2 items make the codebase safe to change.

### P0: Tracking, SEO and lead capture

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| P0-1 | Load the GA4 and Meta Pixel base scripts | GA4 Realtime and Meta Events Manager show page views on every route change, with no duplicate first page view |
| P0-2 | Fire conversion events on each form | Contact, Get Proposal and newsletter submits send a Lead event (Meta) and a named event (GA4) only after the server confirms success; catalogue downloads send ViewContent |
| P0-3 | Unique title and meta description per page | Every public route sets its own title, description, canonical URL and Open Graph tags; checked by viewing the page source after load |
| P0-4 | Prerender public pages | Fetching any public URL without JavaScript returns its headings and body text, not an empty root div |
| P0-5 | 404 page | Unknown URLs show a "page not found" page with links home and to contact |
| P0-6 | One address per page | /product redirects permanently to /products |
| P0-7 | Server-side validation | All three API endpoints accept only known fields with type and length limits, and return 400 with a reason otherwise |
| P0-8 | Spam protection | Rate limit of about 5 submits per IP per 10 minutes, plus a honeypot field or Cloudflare Turnstile on each form |
| P0-9 | Lock down CORS | The API accepts browser requests only from ecotwist.in and the Vercel preview domain |
| P0-10 | Sales notification | Every contact and proposal submission emails the sales inbox within 1 minute with all fields |
| P0-11 | Reliable submits | The proposal form checks the response status and times out like the contact form; the API has a /health endpoint and exits on a failed database connection so Render restarts it |

### P1: Performance

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| P1-1 | Compress images | No image in the site is over 500 KB; product photos served as WebP at most 1600 px wide |
| P1-2 | Remove unused media | `DepawaliCatalogue2026.pdf`, `Ecotwist Corporate Solutions catalogue.pdf` and `hero.mp4` deleted |
| P1-3 | Split code by route | Each page loads with `React.lazy`; the JavaScript downloaded on a first visit is measurably smaller |
| P1-4 | Lazy-load images | Every image below the fold has `loading="lazy"`, `decoding="async"` and set width and height |
| P1-5 | Lighter page transitions | The full-page blur on route change is replaced by an opacity and position fade |

### P2: Maintainability

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| P2-1 | Remove unused dependencies | `@google/genai`, the three.js packages, `gsap`, `express` and `dotenv` removed from the frontend; only one of `framer-motion` or `motion` kept; build tools moved to devDependencies |
| P2-2 | Remove template leftovers | The Gemini key define, AI Studio comments, `metadata.json` and the "react-example" package name are gone |
| P2-3 | Shared occasion page template | The 11 occasion pages render from one template and a data file each, with no visible change on any page |
| P2-4 | Fix file and folder names | No double-dot filenames, `assests` renamed to `assets`, no spaces in asset names |
| P2-5 | Strict TypeScript | `strict` mode on and the type check passes |
| P2-6 | README and CI | README covers setup, environment variables and deploy; a GitHub Action runs the type check and build on every push |
| P2-7 | Commit practice | Descriptive commit messages and pull requests for changes to main |

## Timeline (proposed)

Diwali falls on 8 Nov 2026, and the Diwali home page switches off by itself on 16 Nov. Until then, ship only small, additive changes.

| Phase | Dates | Scope |
| --- | --- | --- |
| 1. Quick wins before Diwali | 31 Oct – 5 Nov | P0-1, P0-2, P0-9, P0-10 |
| Freeze | 6 – 16 Nov | Hotfixes only |
| 2. SEO, backend hardening, images | 17 – 30 Nov | P0-3 to P0-8, P0-11, P1-1, P1-2 |
| 3. Performance and cleanup | 1 – 19 Dec | P1-3 to P1-5, all P2 |

## Risks and open questions

**Risks**

- **Breaking the site during Diwali traffic.** Mitigation: before the freeze, ship only small, additive changes (tracking scripts, email alerts). Everything else waits until after 16 Nov.
- **Prerendering conflicts with animations or the date-based Diwali home switch.** Mitigation: try it on a preview deploy first; fall back to per-page meta tags alone if needed.
- **Validation rejects real leads.** Mitigation: match server limits to the existing frontend rules and log every rejected submit for the first two weeks.
- **Render free-tier sleep** makes the first submit after idle slow. Mitigation: ping /health every 10 minutes, or move to a paid instance.
- **Image compression lowers visible quality.** Mitigation: review compressed product photos side by side before replacing them.

**Dependencies**

- Access to the Google Analytics, Meta Business, Vercel, Render and MongoDB accounts.
- An email sending service (for example Resend) and a verified sender domain.
- The sales inbox address that should receive lead alerts.

**Open questions**

- [ ] Which inbox (or people) should receive lead alerts?
- [ ] Do we need a cookie consent banner before loading GA and the Meta Pixel?
- [ ] Should we prerender on Vite or move the marketing pages to a framework such as Astro or Next.js?
- [ ] Who owns each phase, and is there a budget for paid Render or an email service?
- [ ] Should the newsletter list sync to an email marketing tool?
