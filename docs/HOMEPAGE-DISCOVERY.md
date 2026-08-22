# LensFlow — Homepage Discovery

A literal, as-built map of the current public homepage, produced by reading every file in its render tree directly. This is a discovery document, not a critique or a redesign — content is transcribed exactly as it exists; nothing here is invented, and no files were modified to produce it. (A design critique of this same surface already exists in `docs/CURRENT_STATE_AUDIT.md`, Part 2 — this document supersedes it as the exhaustive reference; the two agree wherever they overlap.)

---

## 1. Route and entry point

- **Route:** `/` (site root)
- **File:** `src/app/page.tsx` — a server component, `export default function HomePage()`
- **Rendered inside:** `src/app/layout.tsx` (`RootLayout`) → `src/app/providers.tsx` (`Providers`, theme/query-client context) — the same root layout every route in the app uses.
- **Metadata:** `page.tsx` exports its own `metadata` object, which Next.js merges over (overrides matching fields from) the root layout's `metadata` — see §16.

## 2. Complete section order

As composed in `page.tsx`, in exact order:

1. `<StructuredData />` (inline, defined in `page.tsx` itself — not a section, JSON-LD only)
2. `<HomeSessionRedirect />` (invisible — no rendered output)
3. Skip-to-content link (inline in `page.tsx`, not a component)
4. `<Navbar />`
5. `<main id="main-content">` containing, in order:
   1. `<Hero />`
   2. `<TrustStrip />`
   3. `<ProblemSection />`
   4. `<FeatureTabs />`
   5. `<GalleryShowcase />`
   6. `<ClientJourney />`
   7. `<DashboardShowcase />`
   8. `<AfricaSection />`
   9. `<PricingPreview />`
   10. `<Testimonials />`
   11. `<Faq />`
   12. `<FinalCta />`
6. `<HomeFooter />`

12 content sections total, plus nav and footer.

## 3–5, 7 — Per-section detail

Documented per the requested format: purpose / component / visual treatment / content / CTA / mobile behavior / reusable / obsolete. Exact copy is quoted verbatim.

---

### Navbar
**File:** `src/components/marketing/home/navbar.tsx` (`'use client'`)
**Purpose:** Global site navigation + primary conversion entry points, fixed above the hero.
**Visual treatment:** `fixed` position, transparent/white-text over the hero until `scrollY > 24px`, then crossfades to `bg-background/80 backdrop-blur-xl` with a border and dark text; height animates `20 → 16` (80px → 64px) on scroll. Logo (`Logo` component — see §6) swaps between white (`dark` prop, unscrolled) and the default `text-foreground` (scrolled).
**Content:** Logo + "LensFlow" wordmark. Desktop nav: **Product** (dropdown, 7 links from `NAV_PRODUCT_LINKS`), **Solutions** (dropdown, 5 links from `NAV_SOLUTIONS_LINKS`), **Pricing** (direct link), **Resources** (dropdown, 5 links from `NAV_RESOURCES_LINKS`). Dropdown panels are dark (`bg-[#15151a]/95`) regardless of scroll state — this is the one part of the navbar that doesn't theme-swap.
**CTA destinations:** "Log in" → `/auth/login`; "Start free" → `/auth/signup` (both present desktop and mobile).
**Mobile behavior:** Hamburger icon opens a full-screen `fixed inset-0` dark overlay (`bg-[#0c0c0f]`) with `role="dialog" aria-modal="true"`, accordion-expandable link groups (staggered `framer-motion` entrance), Escape-to-close, body-scroll-lock while open. Repeats Log in / Start free at the bottom as full-width buttons.
**Reusable:** The dropdown/mobile-menu mechanics are generic and could be extracted; the styling (dark, transparent-over-hero) is homepage-specific and does not match `MarketingShell`'s nav.
**Obsolete/notable:** None dead, but it is a **second, parallel navigation implementation** alongside `MarketingShell`'s `MarketingHeader` — see §10/§11.

---

### Hero
**File:** `src/components/marketing/home/hero.tsx` (`'use client'`)
**Purpose:** Primary above-the-fold value proposition + conversion.
**Visual treatment:** Full-bleed background photo (`HERO_IMAGE`, Unsplash) with a `bg-gradient-to-b from-black/55 via-black/35 to-[#0c0c0f]` overlay fading into the section's own `#0c0c0f` background; parallax on the image via `framer-motion`'s `useScroll`/`useTransform` (desktop only, disabled if `prefersReducedMotion`). Section is `min-h-[100vh]` on `lg:`. All text staggers in via a shared `fadeUp` variant (`opacity`/`y` + per-element `delay`).
**Content, verbatim:**
- Eyebrow (mono, uppercase, `text-white/70`): **"Built for photographers & videographers"**
- H1 (`font-display`, white, `text-[2.5rem] → sm:text-6xl → lg:text-[5.5rem]`): **"Everything your creative business needs. In one place."** (line-broken after "business")
- Subhead (`text-white/75`): **"Deliver stunning galleries, book clients, send contracts, get paid, and run your business — without juggling a dozen different tools."**
- Micro-copy under the CTAs (`text-white/55`, with a `CheckCircle2` icon): **"No credit card required"**
**CTA destinations:** "Start free" (solid white button) → `/auth/signup`; "See how it works" (outlined button) → `#product-tour` (in-page anchor scroll to `ProductPreview`, rendered at the bottom of this same section).
**Mobile behavior:** Separate, lower-resolution background image (`w=1600&q=75` vs. desktop's `w=2400&q=80`) with parallax disabled (desktop image wrapper is `hidden lg:block`; a second, non-parallaxed `Image` renders `lg:hidden`). CTA buttons stack full-width (`flex-col`, `w-full` per button) below `sm:`.
**Reusable:** The `fadeUp` stagger pattern is a good candidate to extract into `ScrollReveal`'s variant set (it's currently hand-duplicated in this file rather than reusing `lib/scroll-reveal.tsx`, which already exists for exactly this purpose).
**Obsolete/notable:** None — this is actively used, high-craft code. Renders `ProductPreview` (see below) positioned to overlap the section's bottom edge (`lg:absolute lg:inset-x-0 lg:bottom-0 lg:translate-y-1/2`).

---

### ProductPreview
**File:** `src/components/marketing/home/product-preview.tsx` (`'use client'`) — rendered by `Hero`, not a top-level `page.tsx` section, but documented separately since it's substantial.
**Purpose:** A fabricated product-dashboard screenshot ("show, don't tell").
**Visual treatment:** Wrapped in `BrowserFrame` (see §6). Floats upward slightly on scroll (`useTransform`, disabled under reduced motion). Entire contents `aria-hidden="true"` (correctly, since it's decorative/illustrative, not real data).
**Content:** A fake sidebar (Dashboard/Galleries/Bookings/Clients/Payments/Store/Website + Settings, `SIDEBAR_ITEMS`), greeting **"Good morning, Amina"**, three stat cards (Revenue $8,420, Bookings 12, Clients 34), a "Recent galleries" list (`RECENT_GALLERIES`: "Amara & David — Wedding" / 482 photos / Delivered; "Mwangi Family Portraits" / 96 / In review; "Nia & Co. Product Shoot" / 214 / Editing), an "Upcoming sessions" list (`UPCOMING_SESSIONS`: Engagement session — Wanjiru & Otieno, Thu 2:00 PM; Studio portraits — James Mwangi, Fri 10:00 AM), and a storage bar ("Storage — 68 GB of 200 GB used").
**CTA:** None (purely illustrative, not interactive).
**Mobile behavior:** Sidebar collapses to icon-only (`grid-cols-[56px_1fr]` → `sm:grid-cols-[180px_1fr]`, labels `hidden sm:inline`).
**Reusable:** No.
**Obsolete/notable:** **Fabricated data, not a real screenshot** — "Amina," "Amara & David," "James Mwangi," "Wanjiru & Otieno," and every number are hand-authored placeholders, not sourced from a real studio or the actual product. No "Demo data" label here (unlike `DashboardShowcase`, which does label itself) — a visitor cannot tell this isn't real without already knowing.

---

### TrustStrip
**File:** `src/components/marketing/home/trust-strip.tsx`
**Purpose:** Occupies the "social proof strip" position directly under the hero.
**Visual treatment:** Plain light section, centered, one `ScrollReveal` fade-in.
**Content, verbatim:** Eyebrow: **"Built for creatives who take their business seriously"**. Below it, four italic serif words: **Photography · Videography · Studios · Creative Teams** (`TRUST_INDICATORS`).
**CTA:** None.
**Mobile behavior:** `flex-wrap` — the four words simply wrap onto more lines on narrow screens.
**Reusable:** No — trivial.
**Obsolete/notable:** **This is not social proof.** It contains no company names, client logos, or third-party validation — just category words describing LensFlow's own target market, sitting in the visual slot a logo strip normally occupies.

---

### ProblemSection
**File:** `src/components/marketing/home/problem-section.tsx` (`'use client'`)
**Purpose:** Problem/agitation framing before introducing the product.
**Visual treatment:** `bg-muted/40`. Two-column "before/after" layout (`Before LensFlow` tool tiles → arrow → `With LensFlow` unified card) on `lg:`, stacked on mobile. Each "before" tile has a small rotate-in animation (`rotate: ±3deg → 0` on scroll). Card radii here are `rounded-lg` (tool tiles, icon chips) and **`rounded-xl`** (the "LensFlow workspace" summary card) — not touched by the recent design-system pass (homepage was explicitly out of scope there).
**Content, verbatim:** Eyebrow: **"The problem"**. H2: **"Your work is creative. Your workflow shouldn't be complicated."** Body: **"Your galleries are in one place. Bookings somewhere else. Invoices in another. Payments somewhere else. LensFlow brings the entire workflow together."** Left column ("Before LensFlow") lists six disconnected-tool tiles: Gallery host, Calendar app, Email inbox, Invoicing tool, Payment processor, Cloud storage (`DISCONNECTED_TOOLS`). Right column ("With LensFlow") shows a "LensFlow workspace" card with six icon chips and the line **"Every tool, one login, one client record — connected from inquiry to delivery."**
**CTA:** None.
**Mobile behavior:** Arrow icon swaps from horizontal (`ArrowRight`, desktop) to vertical (`ArrowDown`, mobile); before-tiles grid goes `grid-cols-2` → `sm:grid-cols-3` → `lg:grid-cols-2` (i.e., it's actually widest on `sm`, narrower again on `lg` where it sits beside the arrow and card).
**Reusable:** No — bespoke to this section's before/after concept.
**Obsolete/notable:** None dead; purely illustrative icons/tiles, no real product screenshot.

---

### FeatureTabs
**File:** `src/components/marketing/home/feature-tabs.tsx` (`'use client'`) + 6 files in `feature-demos/`
**Purpose:** The core "what the product does" section — the most substantial and highest-craft section on the page.
**Visual treatment:** Radix `Tabs`. Desktop: vertical sidebar of 6 tab triggers (numbered `01`–`06`) beside a `BrowserFrame`-wrapped live demo. Mobile: horizontal scrolling pill row (`scrollbar-hide`, `overflow-x-auto`) above the demo.
**Content, verbatim (`FEATURE_TABS`, one entry per tab):**
| # | Label | Heading | Copy | CTA |
|---|---|---|---|---|
| 01 | Galleries | "Deliver work they'll love opening." | "Create beautiful branded galleries that make your work feel as premium online as it does in person." | Explore galleries → `/features/galleries` |
| 02 | Booking | "Make booking effortless." | "Let clients see your availability, choose a session, complete their questionnaire, sign their contract, and pay — all in one flow." | See booking → `/features/booking` |
| 03 | CRM | "Know every client. Remember every detail." | "Track leads, projects, notes, and tasks in one timeline — nothing falls through the cracks." | See CRM → `/features/crm` |
| 04 | Payments | "Get paid without the back-and-forth." | "Send invoices, collect deposits, and track balances with the payment methods your clients already use." | See payments → `/features/analytics` |
| 05 | Store | "Turn your galleries into another revenue stream." | "Sell prints, albums, wall art, and digital downloads directly from the gallery your clients are already browsing." | See the store → `/features/store` |
| 06 | Websites | "Your portfolio deserves more than a template." | "A portfolio, pricing page, and booking flow that all live on your own domain — built in, not bolted on." | See websites → `/features/website` |

Section heading: **"One workspace. Every part of your business."** / body: **"From the first inquiry to final delivery, LensFlow keeps your entire client journey connected."**

Each tab renders a real, interactive mock demo (see §7):
- **GalleriesDemo** — a fake gallery ("Amara & David — Wedding," 6 photos) with working favorite-toggle, a lightbox viewer (`role="dialog"`), and a "Download all" button with a scripted 1.1s "Preparing…" → "Downloaded" state.
- **BookingDemo** — a 7-day availability picker (4 of 7 days clickable), time-slot picker, and a "Session request sent" confirmation state.
- **CrmDemo** — a 3-client list (`CRM_CLIENTS`: Amara & David Otieno / James Mwangi / Nia & Co. Studio) with a per-client project timeline and status badge.
- **PaymentsDemo** — a fake invoice (`#INV-0142`, Amara & David Otieno) with line items, deposit/balance math, and a payment-method picker showing **only M-Pesa** (`PAYMENT_METHODS` has exactly one entry).
- **StoreDemo** — a 4-product grid (`STORE_PRODUCTS`: Fine Art Print $45, Heirloom Album $320, Canvas Wall Art $180, Digital Download Pack $65) with add-to-cart micro-interaction.
- **WebsiteDemo** — a fake portfolio site ("Amara Wren Photography," `amarawren.com`) with hero image, nav, image grid, and a "Book a session" button.
**CTA destinations:** Per-tab, listed above — 6 distinct destinations.
**Mobile behavior:** Documented above (pill-row tab switcher).
**Reusable:** `BrowserFrame` (see §6) is already a shared primitive used by 3 sections.
**Obsolete/notable:** All demo data is fabricated (same "Amara & David"/"James Mwangi" placeholder identities recur across `FeatureTabs`, `ProductPreview`, and `DashboardShowcase` — at least internally consistent with itself, even if not real). `GalleriesDemo`'s favorite-toggle (`galleries-demo.tsx:100-104`) is a `<span role="button" tabIndex={-1}>` — keyboard-unreachable, a real accessibility defect.

---

### GalleryShowcase
**File:** `src/components/marketing/home/gallery-showcase.tsx`
**Purpose:** Showcase the gallery-viewing experience visually.
**Visual treatment:** Dark section (`bg-[#0c0c0f]`) with a dimmed background photo (`opacity-30`, one of the showcase images) behind the heading. Below it, a horizontally-scrolling "filmstrip" of 8 images with alternating vertical offset (`marginTop: 0 or 32px`).
**Content, verbatim:** Eyebrow: **"The gallery experience"**. H2: **"The gallery is part of the experience."** Body: **"Give clients a beautiful place to discover, select, share, and download their images."** All 8 images come from `GALLERY_SHOWCASE_IMAGES` — real Unsplash wedding/portrait stock photography (couples, brides, ceremonies), not LensFlow product screenshots.
**CTA:** "Explore galleries" → `/features/galleries`.
**Mobile behavior:** The horizontal filmstrip (`hidden ... sm:flex`) is replaced entirely by a static `2×2` grid of only the **first 4** of the 8 images (`sm:hidden`) — half the showcased photography is dropped on mobile.
**Reusable:** No.
**Obsolete/notable:** None dead — but every image is third-party stock, not LensFlow's own product or a real client's work (see §14).

---

### ClientJourney
**File:** `src/components/marketing/home/client-journey.tsx` (`'use client'`)
**Purpose:** Walks the full client lifecycle as a connected process (reframes "features" as "a journey").
**Visual treatment:** `bg-muted/40`. Desktop: an interactive horizontal 8-step stepper (click a numbered dot, detail panel updates below with `AnimatePresence` cross-fade). Mobile: a static vertical timeline showing all 8 stages inline, no interaction needed.
**Content, verbatim — the 8 stages (`JOURNEY_STAGES`):**
1. **Inquiry** — "A lead lands in your CRM" — "Every inquiry — from your site, Instagram, or a referral — lands in one place, automatically."
2. **Booking** — "They pick a date, you confirm it" — "Clients see real availability and book a package without a single back-and-forth email."
3. **Contract** — "Signed before the shoot" — "Contracts go out and come back signed, attached to the project automatically."
4. **Payment** — "Deposit collected up front" — "A deposit invoice is sent the moment the booking is confirmed — no chasing required."
5. **Shoot** — "Session day, fully briefed" — "Questionnaire answers, shot lists, and client notes are all in your pocket on the day."
6. **Proofing** — "Clients pick their favorites" — "Share a proofing gallery so clients can select and comment on the images they love."
7. **Delivery** — "A gallery worth opening" — "Final images and video are delivered in a branded gallery clients can download and share."
8. **Follow-up** — "The relationship keeps going" — "Prints, albums, and referral requests go out automatically after delivery."

Section heading: **"From first message to final delivery. One connected journey."**
**CTA:** None — this section has no link or button anywhere.
**Mobile behavior:** Fully separate implementation (not a squeezed desktop layout) — documented above.
**Reusable:** No — bespoke stepper.
**Obsolete/notable:** None dead. Genuinely one of the stronger, benefit-led sections on the page (per the earlier design critique in `CURRENT_STATE_AUDIT.md`).

---

### DashboardShowcase
**File:** `src/components/marketing/home/dashboard-showcase.tsx` (`'use client'`)
**Purpose:** "Business intelligence" proof point — shows the product answering "how is my business doing."
**Visual treatment:** `BrowserFrame`-wrapped fake dashboard with an animated SVG revenue line chart (`REVENUE_POINTS`, hand-authored 12-point array), an animated bar chart (`BOOKING_BARS`, 8-point array), and an animated pipeline funnel bar (`PIPELINE`: Leads 18 / Booked 11 / In progress 7 / Delivered 23). Stat tiles use `CountUp` for an animated count-in effect on scroll.
**Content, verbatim:** Eyebrow: **"Business insights"**. H2: **"Know how your business is doing."** Body: **"Revenue, bookings, and pipeline — at a glance, without a spreadsheet."** Header of the fake dashboard explicitly says **"Studio overview"** with a **"Demo data"** badge — the one section that honestly labels its numbers as fake. Stat tiles: Revenue this month $8,420, Active projects 12, Clients 64, Outstanding invoices $2,140, Storage used 68 GB, Team members 3.
**CTA:** None.
**Mobile behavior:** Handled by `BrowserFrame`'s and the grid's own responsive classes (`grid-cols-2 sm:grid-cols-3` for stat tiles) — no separate mobile layout, just reflow.
**Reusable:** `CountUp` and `BrowserFrame` are shared primitives (see §6).
**Obsolete/notable:** All chart data is hand-authored placeholder data (`REVENUE_POINTS`/`BOOKING_BARS`/`PIPELINE` arrays defined inline in the component), consistent with `ProductPreview`'s numbers ($8,420 revenue appears in both) but not derived from any real account.

---

### AfricaSection
**File:** `src/components/marketing/home/africa-section.tsx`
**Purpose:** Positions LensFlow's payment/locale fit for its home market while gesturing at global reach.
**Visual treatment:** `bg-muted/40`. Two-column: a real Unsplash portrait photo (left, `rounded-xl`) beside copy + a 6-item capability grid (right).
**Content, verbatim:** Eyebrow / H2 (identical text used for both): **"Built for where you work. Ready for everywhere."** Body: **"Modern business tools shouldn't require expensive international subscriptions or complicated payment systems."** Six capability tiles (`CAPABILITIES`):
1. **M-Pesa** — "Native support for Kenya's leading mobile money network"
2. **Mobile money** — "Collect payments the way your clients already pay"
3. **Local currencies** — "Invoice and get paid in your own currency"
4. **International payments** — "Cards and bank transfers for clients anywhere"
5. **WhatsApp updates** — "Booking and delivery notifications where clients read them"
6. **Affordable plans** — "One subscription, priced for growing studios"

Closing italic line: **"From Mombasa to New York, LensFlow works wherever your clients are."**
**CTA:** None.
**Mobile behavior:** Two columns stack; image caps at `max-w-md`.
**Reusable:** No.
**⚠️ Factual accuracy issue (not a design issue):** Capability #4, **"International payments — Cards and bank transfers for clients anywhere,"** and capability #5, **WhatsApp updates**, describe capabilities that **do not exist in the current implementation**. Per `CLAUDE.md`/`docs/ARCHITECTURE.md`: M-Pesa is the *only* implemented payment method — Stripe/Flutterwave/PayPal (which would be needed for "cards and bank transfers") are unbuilt placeholders, and Africa's Talking (needed for WhatsApp) has no calling code anywhere in the repo. This section's own neighbor, `PaymentsDemo` (in `FeatureTabs`, capability #1 confirms M-Pesa is real), shows only one payment method — directly contradicting capability #4 a few sections later on the same page. This is a product-accuracy problem, not a copy-polish one, and should be resolved (cut the claim, or caveat it as roadmap) before or during the redesign, independent of visual changes.

---

### PricingPreview
**File:** `src/components/marketing/home/pricing-preview.tsx`
**Purpose:** Value/consolidation pitch — "one subscription instead of many tools" — not a pricing table.
**Visual treatment:** Two side-by-side cards (`rounded-xl`), "before" (muted, X icons) vs. "after" (primary-tinted border/shadow, check icon).
**Content, verbatim:** Eyebrow: **"Pricing"**. H2: **"Professional tools. Without the professional-software bill."** Body: **"LensFlow brings the tools photographers actually need into one affordable platform — one subscription, no unnecessary add-ons, transparent pricing."** Left card ("Stitching it together yourself"): 7 items — Gallery hosting subscription, Calendar/booking tool, CRM or spreadsheet, E-signature tool for contracts, Invoicing software, Online store platform, Website builder. Right card ("With LensFlow"): 1 item — "One LensFlow subscription — everything included."
**CTA:** "View pricing" → `/pricing` (only on the right/"after" card).
**Mobile behavior:** Two columns → `sm:grid-cols-2`, so it's already stacked below `sm:` (single column on phones).
**Reusable:** No.
**Obsolete/notable:** **No price appears anywhere in this section.** No dollar figure, no tier name — see §13 for where pricing actually does/doesn't appear on this page.

---

### Testimonials
**File:** `src/components/marketing/home/testimonials.tsx`
**Purpose:** Occupies the conventional "social proof / testimonials" position in the page flow.
**Visual treatment:** 3-card grid (desktop) / horizontal snap-scroll carousel (mobile), `bg-muted/40`.
**Content, verbatim (`EARLY_ACCESS_CARDS`):**
1. **"Built with working photographers"** — "Every part of LensFlow — from proofing to payments — was shaped by conversations with photographers running real studios."
2. **"Early access is open"** — "We're onboarding studios directly and shaping the roadmap around what they need most."
3. **"Join the first LensFlow creators"** — "Be part of the founding group of photographers and videographers helping define the platform."

Eyebrow: **"Early access"**. H2: **"Built with photographers, for photographers"**.
**CTA:** None.
**Mobile behavior:** `snap-x` carousel, each card `w-[85%] shrink-0 snap-center`.
**Reusable:** No.
**Obsolete/notable:** **This component is named/positioned as testimonials but contains zero testimonials** — no customer name, quote, photo, company, or attribution anywhere in the file or its data. It is an "early access" pitch wearing the visual slot of a social-proof section. See the assessment table (§ Final Assessment) — this is a content gap requiring a product/marketing decision, not something the redesign can invent on its own.

---

### Faq
**File:** `src/components/marketing/home/faq.tsx`
**Purpose:** Objection-handling / pre-signup Q&A.
**Visual treatment:** Radix `Accordion` (`ui/accordion.tsx`), single-open, collapsible.
**Content, verbatim — 12 items (`FAQ_ITEMS`):**
1. **What is LensFlow?** — "LensFlow is a business platform for photographers and videographers. It brings client galleries, proofing, booking, CRM, contracts, invoicing, payments, an online store, and a portfolio website into one connected workspace."
2. **Who is LensFlow for?** — "Wedding and portrait photographers, videographers, studios, and creative teams who want to run their business without stitching together a dozen separate tools."
3. **Can I deliver both photos and videos?** — "Yes. Galleries support high-resolution photo and video delivery, with proofing and downloads for both."
4. **Can clients download their images?** — "Yes. You control whether clients can download full-resolution originals, web-sized copies, or nothing at all, per gallery."
5. **Can clients select favorites?** — "Yes. Clients can favorite and comment on images directly in the gallery, which makes proofing and album design faster."
6. **Can I accept payments?** — "Yes, via M-Pesa — invoice clients and collect deposits or full payment with a real-time STK push to their phone. Support for card payments is on the roadmap." *(Note: this FAQ answer is the one place on the page that correctly, honestly scopes payments to M-Pesa-only — directly contradicting `AfricaSection`'s "cards and bank transfers" claim above it in page order.)*
7. **Can I create a portfolio website?** — "Yes. The built-in website builder turns your galleries and pricing into a portfolio site, with no separate tool required."
8. **Can I use my own domain?** — "Yes. Connect a custom domain to your LensFlow website and client galleries."
9. **Can I manage a team?** — "Yes. Invite second shooters, editors, or studio managers with role-based permissions on your projects."
10. **Can clients book sessions?** — "Yes. Clients can see your availability, choose a package and time, and complete their booking online."
11. **How much does LensFlow cost?** — "Paid plans start at $12/month, with a free plan also available — see our pricing page for the full breakdown of what's included at each tier."
12. **Is there a free plan?** — "Yes. LensFlow has a free plan with 3GB of storage so you can try client galleries at no cost — no credit card required. Paid plans unlock full-resolution downloads, booking, payments, and more storage as you grow."

Eyebrow: **"FAQ"**. H2: **"Frequently asked questions"**. Also feeds `StructuredData`'s `FAQPage` JSON-LD in `page.tsx` (every Q/A pair is duplicated into schema.org markup).
**CTA:** None (accordion items aren't links).
**Mobile behavior:** No special handling needed — accordion is already narrow/stacked by default.
**Reusable:** `Accordion` primitive is shared (`ui/accordion.tsx`).
**Obsolete/notable:** **Item 11 is the only place on the entire homepage where a price ($12/month) appears**, and it's inside a collapsed-by-default accordion item — see §13.

---

### FinalCta
**File:** `src/components/marketing/home/final-cta.tsx` (`'use client'`)
**Purpose:** Last-chance conversion push, mirroring the hero's visual weight.
**Visual treatment:** Dark section (`bg-[#0c0c0f]`), a dimmed background photo (25% opacity, one of the gallery showcase images) plus an animated blurred radial glow (`framer-motion`, infinite loop, wine-red `bg-primary/20 blur-[120px]`) drifting behind the content.
**Content, verbatim:** H2: **"Spend less time managing your business. More time creating."** Body: **"Everything you need to run your photography business — beautifully connected."** Micro-copy: **"No credit card required"** (repeats the hero's line).
**CTA destinations:** "Start free" (solid white) → `/auth/signup`; "Explore LensFlow" (outlined) → `/features/galleries`.
**Mobile behavior:** Buttons stack full-width, same pattern as the hero.
**Reusable:** No — but its copy/CTA pattern intentionally mirrors `Hero`, which is a reasonable bookend design already in place.
**Obsolete/notable:** None — functioning as intended.

---

### HomeFooter
**File:** `src/components/marketing/home/footer.tsx`
**Purpose:** Site-wide footer navigation + brand sign-off, homepage-specific.
**Visual treatment:** Light `bg-background`, 6-column grid (logo/blurb spans 2, then 4 link columns), social icons (inline SVG paths, not `lucide-react`).
**Content:** Blurb: **"The business platform built for photographers and videographers."** Four link columns:
- **Product:** Galleries, Booking, CRM, Payments, Store, Websites → `/features/galleries`, `/features/booking`, `/features/crm`, `/features/analytics`, `/features/store`, `/features/website`
- **Company:** About, Pricing, Careers, Contact
- **Resources:** Help Center, Blog, Guides (→ `/docs`), Documentation (→ `/api-docs`)
- **Legal:** Privacy, Terms, Cookies, Security

Social icons link to: `instagram.com/lensflow`, `tiktok.com/@lensflow`, `youtube.com/@lensflow`, `facebook.com/lensflow` (hardcoded URLs — **not verified to be real/active accounts**; treat as placeholder unless confirmed otherwise). Bottom bar: **"© {year} LensFlow. All rights reserved."** / **"Made with care for photographers worldwide."**
**CTA:** Navigational links only, no signup CTA in the footer itself.
**Mobile behavior:** `grid-cols-2 → sm:grid-cols-3 → lg:grid-cols-6`.
**Reusable:** No — see next point.
**Obsolete/notable:** **This is a second, parallel footer implementation**, different from `MarketingShell`'s `MarketingFooter` (used by every other marketing page) in both link structure *and* social accounts — `MarketingFooter` links to `twitter.com/lensflow`, `github.com/lensflow`, `linkedin.com/company/lensflow` (a completely different platform set) and adds a fabricated **"99.9% uptime"** stat that `HomeFooter` doesn't have. Two footers, two different claimed social presences, on the same site.

---

## 6. All imported components (full inventory)

**Top-level sections** (imported directly by `page.tsx`): `Navbar`, `Hero`, `TrustStrip`, `ProblemSection`, `FeatureTabs`, `GalleryShowcase`, `ClientJourney`, `DashboardShowcase`, `AfricaSection`, `PricingPreview`, `Testimonials`, `Faq`, `FinalCta`, `HomeFooter`, `HomeSessionRedirect`.

**Shared homepage-local primitives** (`src/components/marketing/home/lib/`):
- `Logo` / `LogoMark` (`lib/logo.tsx`) — used by `Navbar`, `HomeFooter`, `ProblemSection` (mark only), and `MarketingShell` (shared across the whole marketing site — the one genuinely shared brand asset).
- `BrowserFrame` (`lib/browser-frame.tsx`) — used by `FeatureTabs`, `DashboardShowcase`, `ProductPreview`. Fixed dark chrome regardless of page theme.
- `ScrollReveal` / `StaggerGroup` / `StaggerItem` (`lib/scroll-reveal.tsx`) — used by nearly every section for scroll-triggered entrance animation.
- `CountUp` (`lib/count-up.tsx`) — used by `DashboardShowcase`'s `StatTile`.
- `usePrefersReducedMotion` (`lib/use-reduced-motion.ts`) — **defined, exported, never imported anywhere** (confirmed via grep). Dead code; every component instead calls `framer-motion`'s own `useReducedMotion()` directly.

**Feature demo components** (`src/components/marketing/home/feature-demos/`, all used exclusively by `FeatureTabs`): `GalleriesDemo`, `BookingDemo`, `CrmDemo`, `PaymentsDemo`, `StoreDemo`, `WebsiteDemo`.

**Shared `ui/` primitives used:** `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` (`Faq` only). Radix primitives used directly (not via `ui/`): `@radix-ui/react-navigation-menu` (`Navbar`), `@radix-ui/react-tabs` (`FeatureTabs`, via `TabsPrimitive` directly rather than the `ui/tabs.tsx` wrapper — see §11).

**Not used by the homepage at all:** `MarketingShell`, `MarketingHeader`, `MarketingFooter`, `MarketingComingSoon`, `MarketingPageHeader` — the shared marketing-page shell every *other* public page uses.

## 7. All images/assets

**Every content image on the homepage is a remote Unsplash URL** (`https://images.unsplash.com/{id}?w=...&q=...&auto=format&fit=crop`), sourced via `src/lib/constants/homepage.ts`. None are self-hosted; there is no `public/` directory anywhere in the repository. Full list:

| Constant | Unsplash ID | Alt text | Used by |
|---|---|---|---|
| `HERO_IMAGE` | `photo-1554080353-a576cf803bda` | "A photographer framing a shot with her camera on a city rooftop at dusk" | `Hero` (desktop + mobile variant) |
| `AFRICA_SECTION_IMAGE` | `photo-1573497491765-dccce02b29df` | "Portrait of a photographer smiling, wearing traditional print fabric" | `AfricaSection` |
| `GALLERY_SHOWCASE_IMAGES` (8 images, indexes 0–7) | see `homepage.ts:228-236` | couple/wedding/portrait photography, various | `GalleryShowcase` (all 8 desktop / first 4 mobile), `GalleryShowcase` background (`[3]`), `FinalCta` background (`[6]`), `WebsiteDemo` (`[0]`, `[2]`–`[4]`), `GalleriesDemo` (first 6) |
| `STORE_PRODUCTS[].image` (4 images) | `homepage.ts:171-174` | none (uses product label as alt) | `StoreDemo` |

**Local/generated assets:**
- `src/app/icon.svg` — favicon: a simplified ring + center dot (no blade petals), hardcoded `#7C1D2D`.
- `src/app/apple-icon.tsx` — generates a 180×180 PNG via `next/og`'s `ImageResponse`, the full six-blade aperture mark, same `#7C1D2D`.
- **`/og-default.png`** — referenced by **both** `layout.tsx` and `page.tsx` metadata (Open Graph + Twitter card image) — **this file does not exist anywhere in the repository** (no `public/` directory at all). The homepage's social-share preview image is currently a broken link. This is a concrete, fixable bug, independent of the redesign.

## 8. All animations

Two animation systems in play:
- **`framer-motion`**, used for: scroll-triggered reveals (`ScrollReveal`/`StaggerGroup`/`StaggerItem` — fade-up, fade-in, scale-in, slide-in-left/right, all easing `[0.16, 1, 0.3, 1]`), the hero's parallax background (`useScroll`/`useTransform`), `ProductPreview`'s scroll-linked float, `CountUp`'s number tween, `ClientJourney`'s active-stage cross-fade, `Navbar`'s mobile-menu stagger/slide, chart draw-in animations in `DashboardShowcase` (SVG `pathLength`, bar `height`, pipeline `width`), and `FinalCta`'s infinite ambient glow drift (`animate={{ x: [...], y: [...] }}`, `repeat: Infinity`, 18s loop).
- **Tailwind/`tailwindcss-animate`**, used for: `TabsPrimitive.Content`'s `animate-in` fade (`FeatureTabs`), `Accordion` open/close (`Faq`), `NavigationMenu` dropdown open/close (`Navbar`).

**Reduced-motion handling:** `Hero` and `ProductPreview` both explicitly check `useReducedMotion()` from `framer-motion` and zero out their parallax/float transforms when it's set. `CountUp` jumps straight to the final value instead of animating. `ScrollReveal`'s underlying animations are **not** gated on reduced-motion at all — opacity/position transitions still play for every `ScrollReveal`-wrapped section (a real, if minor, gap: most of the page's scroll-reveal motion ignores the OS-level reduced-motion preference even though the two most prominent parallax effects respect it).

## 9. Responsive behavior

Summarized in full per-section above; the overall pattern: `Hero`/`GalleryShowcase`/`ClientJourney` have genuinely separate mobile implementations (not just reflowed desktop layouts); `FeatureTabs` switches its tab-trigger layout (sidebar → horizontal pills); most other sections rely on Tailwind grid-column breakpoint changes only. `.page-section`/`.container-wide` (shared utilities, see `docs/DESIGN-SYSTEM.md`) carry most of the vertical/horizontal rhythm consistently; `Hero`, `GalleryShowcase`, and `FinalCta` opt out with hand-tuned padding that doesn't match the shared scale or each other (already flagged in `CURRENT_STATE_AUDIT.md`, unchanged since).

## 10. Dark/light behavior

The homepage is **not** theme-aware in the way the dashboard is. It's built as a fixed light page (relies on the app's default `:root` light tokens) with **specific sections hardcoded to a fixed dark palette** (`bg-[#0c0c0f]`, not `.dark`'s token background) regardless of the visitor's system/app theme preference: `Hero`, `GalleryShowcase`, `FinalCta`, `Navbar`'s dropdown panels and mobile menu, and every `BrowserFrame` instance (`bg-[#15151a]`, explicitly commented "independent of page theme — a product screenshot reads the same whether the marketing page around it is light or dark"). `MarketingShell` (used by every *other* marketing page, not this one) makes the same design choice explicitly via `LIGHT_THEME_VARS`, pinning CSS variables to their light values with a comment that dark mode is "a workspace setting, not a brand choice." The homepage doesn't use that mechanism — it achieves the same effect ad hoc, per-section, with raw hex/RGB values instead of pinned tokens.

## 11. Existing reusable components

Genuinely shared and reusable as-is: `LogoMark`/`Logo`, `BrowserFrame`, `ScrollReveal`/`StaggerGroup`/`StaggerItem`, `CountUp`, `ui/accordion.tsx`. `FeatureTabs` uses `TabsPrimitive` from `@radix-ui/react-tabs` directly with its own className strings rather than the shared `ui/tabs.tsx` wrapper (which already exists and is used elsewhere in the app) — a missed reuse opportunity, not a bug.

## 12. Duplicate components

Two confirmed duplicate systems, both real findings from this pass:
1. **Navigation:** `Navbar`/`MobileMenu` (homepage) vs. `MarketingHeader` (`MarketingShell`, every other marketing page) — different visual treatment (dark/transparent-over-hero vs. plain sticky light bar), different link structure.
2. **Footer:** `HomeFooter` (homepage) vs. `MarketingFooter` (`MarketingShell`) — different column contents, and **different social media accounts entirely** (Instagram/TikTok/YouTube/Facebook vs. Twitter/GitHub/LinkedIn), plus `MarketingFooter`'s unverified "99.9% uptime" claim that `HomeFooter` doesn't make.

## 13. Existing pricing content

**No price appears in the main visible flow of the homepage.** `PricingPreview` (positioned as the page's "pricing" section) shows a before/after tool-consolidation comparison with **zero dollar figures** and a single "View pricing" link out to `/pricing`. The **only** actual price anywhere on the page — **"$12/month"** — is inside FAQ item 11, collapsed by default inside an accordion a visitor must click to reveal.

## 14. Existing product screenshots

**None are real.** Every "product view" on the page (`ProductPreview`, all 6 `FeatureTabs` demos, `DashboardShowcase`) is a hand-built React/SVG mockup with fabricated data, not an actual screenshot of the live application. `DashboardShowcase` is the only one that honestly labels itself ("Demo data" badge); the others do not disclose this. All photography shown (hero, gallery showcase, Africa section) is third-party Unsplash stock, not LensFlow's own product output or a real client's work.

## 15. Existing testimonials/social proof

**None exist.** `Testimonials` (the component literally named for this) contains three "early access" pitch cards, not customer quotes. `TrustStrip` shows category words, not client logos. No stats on the page are real usage metrics (all traceable to fabricated demo data, explicitly or implicitly). No security/privacy/founder-story content appears on the homepage itself. This is a genuine content gap that requires product/marketing input (real customer names, quotes, logos, or usage numbers) before a redesigned version of this section can be built — it cannot be solved by visual design alone.

## 16. SEO metadata

Two metadata sources apply, and Next.js merges the more specific one (page) over the general one (layout) for matching fields:

- **`layout.tsx`** (site-wide default, applies to any route without its own override): title `"LensFlow - Premium Gallery Platform for Photographers"` (template `%s | LensFlow` for child routes), description `"Deliver photos, manage clients, book sessions, sell prints, and grow your photography business with LensFlow."`, `keywords` array (photography, client galleries, photo delivery, studio management, photographer software, portfolio website, photo sales), `robots: 'index, follow'`, OpenGraph + Twitter card both pointing at `/og-default.png` (broken — see §7).
- **`page.tsx`** (homepage-specific, overrides the above for `/`): title `"LensFlow — The Business Platform for Photographers & Videographers"` (absolute, ignores the layout's template), description `"Run your photography or videography business from one beautiful platform. Deliver galleries, manage clients, book sessions, send invoices, accept payments, and grow your business with LensFlow."`, `canonical` set to `APP_CONSTANTS.URL`, its own OpenGraph/Twitter block (also `/og-default.png`).

**Note the two descriptions differ** — the layout's says "sell prints," the homepage's says "send invoices, accept payments" — not contradictory, just not identical; worth deciding on one canonical description during the redesign rather than carrying two slightly different versions forward.

**Structured data:** `page.tsx`'s `StructuredData` component emits a single `@graph` JSON-LD block with `Organization`, `WebSite`, `SoftwareApplication` (category `BusinessApplication`, offers `SaaS subscription` with no price), and `FAQPage` (mirroring all 12 `FAQ_ITEMS` verbatim).

**Sitemap:** `src/app/sitemap.ts` includes the homepage (`path: ''`, `priority: 1`, `changeFrequency: 'weekly'`) — correctly the highest-priority entry.

## 17. Accessibility considerations

(Consistent with the deeper accessibility pass in `CURRENT_STATE_AUDIT.md` Part 2 — summarized here for completeness, one addition below.)
- Exactly one `<h1>` (`Hero`), correct `<h2>`/`<h3>` nesting throughout every section.
- Skip-to-content link present (`page.tsx`), correctly targets `#main-content`.
- All content images carry real `alt` text sourced from the constants file; purely decorative background images (`GalleryShowcase`'s dimmed backdrop, `FinalCta`'s backdrop) correctly use `alt=""` + `aria-hidden="true"`.
- Interactive demo elements have real `aria-label`s and correct dialog semantics (`GalleriesDemo`'s lightbox, `Navbar`'s mobile menu).
- **Confirmed defect:** `GalleriesDemo`'s favorite-toggle is `<span role="button" tabIndex={-1}>` (`galleries-demo.tsx:100-104`) — `tabIndex={-1}` removes it from keyboard tab order entirely; keyboard-only users cannot reach or activate it.
- **New in this pass:** `ScrollReveal`'s entrance animations don't check `prefersReducedMotion` (§8) — a real, if secondary, gap next to the two effects (`Hero` parallax, `ProductPreview` float) that do handle it correctly.

## 18. Performance considerations

(Also consistent with `CURRENT_STATE_AUDIT.md` Part 2, reconfirmed directly against source in this pass.)
- Zero raw `<img>` tags anywhere in the homepage tree — every image uses `next/image`.
- Every image is a remote Unsplash URL (§7) — `next/image` still optimizes them, but the page's entire visual identity depends on a third-party CDN, and the referenced OG image is simply missing (§7/§16).
- `Hero` renders **two** `priority` `<Image>` elements (desktop + mobile variants, both mounted, CSS-hidden per breakpoint rather than conditionally unmounted) — both are eagerly fetched regardless of actual viewport unless Next's loader skips the CSS-hidden one at the network layer.
- 6 of 6 root layout `next/font/google` families load on every homepage view; 3 of them (Playfair Display, Cormorant Garamond, Bodoni Moda) exist solely for a gallery-cover-typography feature elsewhere in the app and are irrelevant to this page.
- **12 of ~18 homepage component files are `'use client'`** (`navbar`, `hero`, `problem-section`, `feature-tabs`, `client-journey`, `dashboard-showcase`, `product-preview`, `final-cta`, all 6 `feature-demos/*`, plus `scroll-reveal`/`count-up` helpers and `session-redirect`) — the majority driven by `framer-motion` effects rather than strict functional necessity (e.g. `ProblemSection` is client-only for one rotate-in animation on static tiles).
- `HomeSessionRedirect` runs a client-side Supabase auth check + `onAuthStateChange` subscription on every homepage load, including fully logged-out cold traffic, before the page is "settled" — a real per-visit cost on what should be the cheapest, most static page on the site.
- `usePrefersReducedMotion` (§6) ships in the client bundle path unused — negligible size, but dead code.

---

## Final Assessment

**A = Keep** (works, no change needed) · **B = Redesign** (concept/content is right, needs new visual execution) · **C = Remove** (should not carry forward) · **D = Replace** (concept is wrong for this slot, needs a different section entirely) · **E = Unknown / requires product decision** (redesign cannot resolve this alone)

| Section | Assessment | Why |
|---|---|---|
| Navbar | **B** | Structure/IA is sound; needs to be reconciled with `MarketingShell`'s nav into one system (§12) rather than redesigned in isolation. |
| Hero | **B** | Strongest visual craft on the page; headline doesn't name the product category (per `CURRENT_STATE_AUDIT.md`) — redesign the message, keep the mechanism (parallax photo + `ProductPreview`). |
| ProductPreview | **B** | Good "show don't tell" instinct, undermined by unlabeled fabricated data and awkward fold-boundary placement. Redesign placement + either use real data or add a "Demo data" label like `DashboardShowcase` does. |
| TrustStrip | **D** | Occupies a social-proof slot with no social proof. Needs either real trust signals (E, pending content) or a genuinely different section concept — not a like-for-like redesign. |
| ProblemSection | **B** | Concept and copy are solid; radius/shadow drift (`rounded-xl` vs. the rest of the system) should be reconciled during redesign. |
| FeatureTabs | **A/B** | The best section on the page — keep the interactive-demo mechanism as-is (A); redesign is optional polish only, don't rebuild this from scratch. Fix the keyboard-accessibility bug regardless of redesign timing (§17). |
| GalleryShowcase | **B** | Good mechanism; all imagery is stock, not LensFlow's own work — flag for **E** if real client galleries become available to use instead. |
| ClientJourney | **A/B** | Genuinely strong, benefit-led, well-built for both breakpoints. Redesign only for whatever new visual language ships elsewhere — not because anything here is broken. |
| DashboardShowcase | **B** | Same pattern as `ProductPreview` — good instinct, fabricated data, but at least labeled. Keep the "Demo data" honesty pattern; extend it to the other unlabeled demos. |
| AfricaSection | **E** | Contains a factual product-accuracy problem (§ AfricaSection above) that must be resolved by a product/content decision before or during redesign — not fixable by visual design alone. |
| PricingPreview | **D** | The "no price shown" pattern is a documented conversion weakness (`CURRENT_STATE_AUDIT.md`). This needs a different section concept (an actual visible price), not a re-skin of the current before/after cards. |
| Testimonials | **E** | No real testimonials exist to display. Cannot be meaningfully redesigned until real customer content exists — in the meantime, needs at minimum an honest copy rewrite so it stops implying testimonials are present. |
| Faq | **A** | Functions correctly, good content, correctly feeds structured data. Redesign only for visual consistency with whatever ships elsewhere. |
| FinalCta | **A/B** | Effective bookend to the hero; keep the mechanism, redesign only alongside the hero's messaging update. |
| HomeFooter | **D** | Should be unified with `MarketingFooter` into one footer system (§12) rather than redesigned as two parallel components — the social-account mismatch also needs a product decision on which accounts are real (**E**). |
| `/og-default.png` | **C** (as currently referenced) → needs a **real replacement asset**, independent of the redesign — this is a plain bug (broken social-share image), fixable immediately. |
