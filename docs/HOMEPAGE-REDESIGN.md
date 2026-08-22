# LensFlow — Homepage Redesign

A literal, as-built map of the current public homepage, produced by reading every file in its render tree directly, the same way `docs/HOMEPAGE-DISCOVERY.md` documented the pre-redesign state. This is the companion/successor document: it records what actually shipped in the redesign (PR #10, squash commit `27c8ea9`), why each change was made, and — for every finding raised in the discovery doc — how it was resolved. Content is transcribed exactly as it exists in code; nothing here is aspirational.

---

## 1. Route and entry point

- **Route:** `/` (site root) — unchanged.
- **File:** `src/app/page.tsx` — still a server component, `export default function HomePage()`.
- **Rendered inside:** `src/app/layout.tsx` (`RootLayout`) → `src/app/providers.tsx` (`Providers`) — unchanged.
- **Metadata:** `page.tsx` still exports its own `metadata`, merged over the root layout's — see §9 for what changed.

## 2. Complete section order

As composed in `page.tsx`, in exact order:

1. `<StructuredData />` (inline, JSON-LD only — unchanged)
2. `<HomeSessionRedirect />` (invisible — behavior changed, see §8)
3. Skip-to-content link (inline in `page.tsx`)
4. `<Navbar transparent />` — now the **shared** navbar (see §5), not a homepage-only component
5. `<main id="main-content">` containing, in order:
   1. `<Hero />`
   2. `<ValueStrip />` *(was `TrustStrip`)*
   3. `<ProblemSection />`
   4. `<FeatureTabs />`
   5. `<GalleryShowcase />`
   6. `<ClientJourney />`
   7. `<AfricaSection />` *(`DashboardShowcase` removed — see §3.9)*
   8. `<Pricing />` *(was `PricingPreview`)*
   9. `<EarlyAccess />` *(was `Testimonials`)*
   10. `<Faq />`
   11. `<FinalCta />`
6. `<Footer />` — now the **shared** footer (see §5), not a homepage-only component

**11 content sections**, down from 12 — `DashboardShowcase` was removed rather than redesigned (rationale in §3.9).

## 3. Old → new section mapping

| Discovery-doc section | Assessment given | New component | What changed |
|---|---|---|---|
| Navbar | B (redesign, reconcile with `MarketingShell`) | `src/components/marketing/navbar.tsx` | Consolidated into the one shared nav used everywhere (§5) |
| Hero | B (keep mechanism, fix headline) | `src/components/marketing/home/hero.tsx` | Copy rewritten to name the product category; mechanism (parallax + `ProductPreview`) unchanged |
| ProductPreview | B (label or fix fabricated data) | `src/components/marketing/home/product-preview.tsx` | Added a "Demo data" badge next to the greeting; unchanged otherwise |
| TrustStrip | D (wrong concept for the slot) | `src/components/marketing/home/value-strip.tsx` | Replaced outright — now an accurate product-capability strip, not implied social proof |
| ProblemSection | B (keep, fix radius drift) | `src/components/marketing/home/problem-section.tsx` | Copy and "before" data rewritten (stage + tool, not just a tool-name tile); radius normalized to `rounded-md` |
| FeatureTabs | A/B (keep mechanism, fix a11y bug) | `src/components/marketing/home/feature-tabs.tsx` | Mechanism unchanged; payments copy corrected; `GalleriesDemo` a11y bug fixed (§7) |
| GalleryShowcase | B (real imagery when available) | `src/components/marketing/home/gallery-showcase.tsx` | Still stock imagery (no real client galleries available) — now explicitly labeled "Example imagery"; all 8 images now shown on mobile (was 4) |
| ClientJourney | A/B (already strong) | `src/components/marketing/home/client-journey.tsx` | Heading split into H2 + subhead; radius normalized |
| DashboardShowcase | B (keep "Demo data" labeling pattern) | *(removed)* | Not in the target 11-section structure; overlapped with `ProductPreview` — see §3.9 |
| AfricaSection | E (factual accuracy problem — product decision needed) | `src/components/marketing/home/africa-section.tsx` | Resolved: removed the two false capabilities (cards/bank transfers, WhatsApp), keeping only what's real |
| PricingPreview | D (needs an actual visible price) | `src/components/marketing/home/pricing.tsx` | Replaced outright — real prices from `PRICING_TIERS`, not a no-numbers before/after comparison |
| Testimonials | E (no real testimonials exist — needs product content) | `src/components/marketing/home/early-access.tsx` | Resolved: renamed/reframed honestly as early-access, with a data structure ready to swap in real testimonials later |
| Faq | A (no change needed) | `src/components/marketing/home/faq.tsx` | Unchanged — already correctly scoped payments to M-Pesa |
| FinalCta | A/B (mirror the hero) | `src/components/marketing/home/final-cta.tsx` | Copy updated to say "photography or videography," matching the hero |
| HomeFooter | D (unify with `MarketingFooter`) | `src/components/marketing/footer.tsx` | Consolidated into the one shared footer (§5) |
| `/og-default.png` | C (broken, needs a real asset) | `src/app/opengraph-image.tsx` | Resolved: file-convention `ImageResponse`, generated at request time |

---

## 4. Per-section detail (new copy, verbatim)

### Navbar
**File:** `src/components/marketing/navbar.tsx` (`'use client'`) — see §5 for the consolidation story.
**Content:** Unchanged link structure (`Product`/`Solutions`/`Pricing`/`Resources` dropdowns, sourced from `src/lib/constants/navigation.ts`). Same "Log in" → `/auth/login`, "Start free" → `/auth/signup` CTAs.
**Behavior:** Takes a `transparent` prop. `transparent={false}` (every non-homepage marketing page, via `MarketingShell`) always renders the solid light bar. `transparent={true}` (homepage only) starts transparent-over-the-dark-hero and crossfades to the solid bar once `scrollY > 24`.

### Hero
**File:** `src/components/marketing/home/hero.tsx`
**Content, verbatim:**
- Eyebrow: **"The business platform for photographers & videographers"**
- H1: **"Run your entire creative business from one place."**
- Subhead: **"Galleries, bookings, contracts, CRM, invoices and M-Pesa payments — connected in one workspace built for photographers and videographers."**
- Micro-copy: **"No credit card required · Free plan available"**
**What changed and why:** The old H1 ("Everything your creative business needs. In one place.") never named what LensFlow actually is. The new H1 states the positioning directly; the subhead now names the real modules (including M-Pesa specifically, not a vague "payments") instead of the old generic "get paid" phrasing.
**Unchanged:** Parallax mechanism, CTA destinations, `ProductPreview` overlap.

### ValueStrip *(replaces TrustStrip)*
**File:** `src/components/marketing/home/value-strip.tsx`
**Content, verbatim:** Label: **"Everything between inquiry and delivery."** Below it, seven words with dot separators: **Galleries · Booking · CRM · Contracts · Payments · Store · Website** (`VALUE_STRIP_ITEMS`).
**Why replaced, not redesigned:** The discovery doc flagged `TrustStrip` (assessment **D**) as occupying the page's social-proof slot with category words that read as social proof but weren't. Rather than invent trust signals that don't exist, this slot was repurposed for something honest and useful: a plain statement of product breadth.

### ProblemSection
**File:** `src/components/marketing/home/problem-section.tsx`
**Content, verbatim:** Eyebrow: **"The problem"**. H2: **"Your work is creative. Your workflow shouldn't be complicated."** Body: **"Your galleries are in one place. Bookings somewhere else. Contracts in another. Invoices somewhere else. LensFlow connects the workflow from inquiry to delivery."** Six "Before LensFlow" tiles now pair a workflow stage with where it lives today (`FRAGMENTED_WORKFLOW`): Inquiry / Instagram, email, messages · Booking / Calendar · Contracts / Separate tool · Invoices / Separate system · Payments / Separate processor · Delivery / Gallery platform. "With LensFlow" card: **"One client. One project. One connected workflow."** / **"Every tool, one login, one client record — connected from inquiry to delivery."**
**What changed and why:** The old "before" tiles were generic tool-category icons (Gallery host, Calendar app, ...) with no connection to a client's actual journey. Pairing each tile with the workflow *stage* it represents makes the fragmentation concrete rather than abstract.

### FeatureTabs
**File:** `src/components/marketing/home/feature-tabs.tsx` + 6 files in `feature-demos/` — mechanism entirely unchanged (kept per discovery-doc assessment **A/B**, "the best section on the page").
**What changed:** Only the Payments tab's copy: **"Send invoices, collect deposits, and track balances with the payment method your Kenyan clients already use."** (was "...payment methods your clients already use" — plural, vague, and implicitly overclaiming beyond M-Pesa). The accessibility defect in `GalleriesDemo` was fixed — see §7.

### GalleryShowcase
**File:** `src/components/marketing/home/gallery-showcase.tsx`
**Content, verbatim:** Eyebrow: **"The gallery experience"**. H2: **"The gallery is part of the experience."** Body: **"Give clients a beautiful place to discover, select, share, and download their images."**
**What changed:** All 8 images now render on mobile (`sm:hidden` grid; previously only the first 4 of 8). Added a caption under the filmstrip: **"Example imagery"** — an explicit, low-key disclosure that this is stock photography, not LensFlow's own product output or a real client's work (discovery doc §14 flagged this as undisclosed).

### ClientJourney
**File:** `src/components/marketing/home/client-journey.tsx` — the 8-stage content (`JOURNEY_STAGES`) is unchanged verbatim (kept per assessment **A/B**, "genuinely strong").
**What changed:** Heading split into an H2 + separate subhead: **"From first inquiry to final delivery."** / **"One connected workflow for every client relationship."** (was one combined heading line).

### AfricaSection
**File:** `src/components/marketing/home/africa-section.tsx`
**Content, verbatim:** Eyebrow: **"Built for where you work"**. H2: **"Built for where you work. Ready to grow with you."** Body: **"Modern business tools should work with the way creative businesses actually operate — starting with M-Pesa payments in Kenya."** Four capability tiles (`LOCAL_MARKET_CAPABILITIES`, down from six):
1. **M-Pesa** — "Native support for Kenya's leading mobile money network"
2. **Mobile money** — "Collect payments the way your clients already pay"
3. **Local currency** — "Invoice and get paid in Kenyan shillings"
4. **Affordable plans** — "One subscription, priced for growing studios"

**What changed and why:** This is the direct resolution of the discovery doc's flagged **E** (factual accuracy) item. Two capabilities were removed outright: *"International payments — Cards and bank transfers for clients anywhere"* and *"WhatsApp updates"* — neither is implemented (M-Pesa is the only live payment method; there is no WhatsApp/Africa's Talking integration anywhere in the codebase). The closing italic line ("From Mombasa to New York...") was also dropped, since it implied a breadth of reach the product doesn't yet support. What remains is a shorter, entirely accurate list.

### Pricing *(replaces PricingPreview)*
**File:** `src/components/marketing/home/pricing.tsx`
**Content:** Eyebrow: **"Pricing"**. H2: **"Simple pricing that grows with your business."** Body: **"Start free. Upgrade when your studio needs more storage and more ways to run your business."** Four real plan cards, sourced directly from `PRICING_TIERS` (`src/lib/constants/pricing.ts` — the same data `/pricing` uses, not a separate dataset):

| Plan | Price | Storage | Highlighted |
|---|---|---|---|
| Free | $0/mo | 3 GB | — |
| Starter | $12/mo | 100 GB | — |
| Studio | $29/mo | 500 GB | "Most popular" |
| Team | $59/mo | 1 TB | — |

Each card shows the first 4 features (`TEASER_FEATURE_COUNT`) with a "Compare all plans" link to `/pricing` for the full list.
**Why replaced, not redesigned:** The discovery doc flagged `PricingPreview` (assessment **D**) for showing zero dollar figures anywhere — the only price on the whole page was buried in a collapsed FAQ accordion item. This is a genuinely different section concept: an actual, visible price table.
**Note on the numbers:** The task brief that prompted this redesign assumed 50GB/250GB storage figures for Starter/Studio. Those were verified against `supabase/migrations/016_plan_entitlements.sql` and found to be superseded by `024_fix_starter_studio_storage_limits.sql`, which corrects them to 100GB/500GB. The homepage pulls live from `PRICING_TIERS` specifically so it can never drift from the real `/pricing` page or the database migrations that define entitlements.

### EarlyAccess *(replaces Testimonials)*
**File:** `src/components/marketing/home/early-access.tsx`
**Content, verbatim:** Eyebrow: **"Early access"**. H2 (unchanged from before): **"Built with photographers, for photographers."** Subhead: **"LensFlow is being shaped around the real workflows of photographers, videographers, studios, and creative teams."** Three cards (`EARLY_ACCESS_POINTS`, unchanged content from the old `Testimonials`' `EARLY_ACCESS_CARDS`):
1. **"Built with working photographers"** — "Every part of LensFlow — from proofing to payments — was shaped by conversations with photographers running real studios."
2. **"Early access is open"** — "We're onboarding studios directly and shaping the roadmap around what they need most."
3. **"Join the first LensFlow creators"** — "Be part of the founding group of photographers and videographers helping define the platform."

**Why this resolves the discovery doc's finding:** The old component was literally named `Testimonials` and sat in the page's testimonial slot while containing zero customer quotes, names, or attribution (flagged **E** — a content gap that can't be solved by visual design alone). The rename and copy are now honest about what the section actually is. Critically, the component is **not a dead end**: `hasTestimonials = TESTIMONIALS.length > 0` in the component checks a new `Testimonial[]` array (`src/lib/constants/homepage.ts`), deliberately left empty with a comment warning never to fill it with fabricated quotes. The moment real testimonials exist, populating that array alone flips the section to real testimonial cards (quote/name/role/studio) — no component change required.

### Faq
**File:** `src/components/marketing/home/faq.tsx` — **unchanged.** Already correctly scoped payments to M-Pesa-only in its answer ("Yes, via M-Pesa... Support for card payments is on the roadmap") — verified against the current implementation and left as-is.

### FinalCta
**File:** `src/components/marketing/home/final-cta.tsx`
**Content, verbatim:** H2 (unchanged): **"Spend less time managing your business. More time creating."** Body: **"Everything you need to run your photography or videography business — beautifully connected."** *(was missing "or videography")*. Micro-copy (unchanged): **"No credit card required"**.

### Footer
**File:** `src/components/marketing/footer.tsx` — see §5 for the consolidation story. Link groups (`FOOTER_LINK_GROUPS`) and copy otherwise match the old `HomeFooter`'s Product/Company/Resources/Legal structure.

---

## 5. Consolidation: Navbar, Footer, and their data

The discovery doc's §12 flagged two confirmed duplicate systems. Both are now resolved:

- **Navigation:** `src/components/marketing/home/navbar.tsx` (homepage-only) and `MarketingShell`'s inline `MarketingHeader` (every other marketing page) are gone. In their place: one `src/components/marketing/navbar.tsx`, taking a `transparent` prop so it can serve both the dark-hero-overlay homepage treatment and the plain solid bar every other page uses.
- **Footer:** Same story — `src/components/marketing/home/footer.tsx` and `MarketingShell`'s inline `MarketingFooter` are gone, replaced by one `src/components/marketing/footer.tsx`.
- **Shared data:** Both new components read from a single new file, `src/lib/constants/navigation.ts` (`NAV_PRODUCT_LINKS`, `NAV_SOLUTIONS_LINKS`, `NAV_RESOURCES_LINKS`, `FOOTER_LINK_GROUPS`, `SOCIAL_LINKS`) — there is now exactly one nav/footer link structure for the entire marketing site, not two that could drift apart.
- **Social accounts:** The discovery doc flagged that the two old footers linked *entirely different, unverified* social account sets (Instagram/TikTok/YouTube/Facebook vs. Twitter/GitHub/LinkedIn) plus an unverified "99.9% uptime" claim on one of them. `SOCIAL_LINKS` is now a single array, deliberately left **empty** with an explanatory comment — the `Footer` component renders no social-icon row at all when it's empty. The uptime claim was dropped entirely (it appeared nowhere in the new footer). The unverified `twitter.creator: '@lensflow'` meta tag in `layout.tsx` was removed for the same reason. Populating `SOCIAL_LINKS` with real, confirmed account URLs is the only step needed to turn the row back on.
- **`MarketingShell`** (`src/components/marketing/MarketingShell.tsx`) now simply renders the shared `Navbar`/`Footer` (non-transparent) around `children`, instead of defining its own header/footer inline.

## 6. All imported components (full inventory)

**Top-level sections** (imported directly by `page.tsx`): `Navbar` (shared), `Hero`, `ValueStrip`, `ProblemSection`, `FeatureTabs`, `GalleryShowcase`, `ClientJourney`, `AfricaSection`, `Pricing`, `EarlyAccess`, `Faq`, `FinalCta`, `Footer` (shared), `HomeSessionRedirect`.

**Shared homepage-local primitives** (`src/components/marketing/home/lib/`): `Logo`/`LogoMark`, `BrowserFrame` (now carries a `demoBadge` prop, default `true` — see §7), `ScrollReveal`/`StaggerGroup`/`StaggerItem`, `CountUp` (now unused on the homepage itself since `DashboardShowcase` was removed, but still exported for potential reuse). `use-reduced-motion.ts` — **removed**; it was dead code (confirmed via grep, zero imports), and `framer-motion`'s own `useReducedMotion()` remains the codebase's actual pattern everywhere it's used.

**Feature demo components** (unchanged, `src/components/marketing/home/feature-demos/`): `GalleriesDemo`, `BookingDemo`, `CrmDemo`, `PaymentsDemo`, `StoreDemo`, `WebsiteDemo`.

**New shared marketing components:** `src/components/marketing/navbar.tsx`, `src/components/marketing/footer.tsx` — used by both the homepage and `MarketingShell` (§5).

**Removed entirely:** `home/dashboard-showcase.tsx` (see §3.9 below), `home/trust-strip.tsx`, `home/pricing-preview.tsx`, `home/testimonials.tsx`, `home/navbar.tsx`, `home/footer.tsx`, `home/lib/use-reduced-motion.ts`.

### 3.9 — Why DashboardShowcase was removed, not redesigned

`DashboardShowcase` isn't mentioned anywhere in the 11-section target structure this redesign followed, and it conceptually overlapped with `ProductPreview` (both are fabricated "product screenshot" proof points — a business-intelligence dashboard vs. a general workspace dashboard, shown back-to-back). It was removed rather than kept, on the judgment that two similar illustrative-dashboard sections in a row was repetitive. **This is a judgment call, not an unambiguous instruction** — if `DashboardShowcase`'s "business insights" framing (revenue/bookings/pipeline charts) is wanted back as a distinct section, it can be restored from git history (`git show <pre-redesign-sha>:src/components/marketing/home/dashboard-showcase.tsx`) and re-added to `page.tsx`.

## 7. Accessibility fixes

- **`GalleriesDemo` favorite toggle (discovery doc §17, confirmed defect):** was `<span role="button" tabIndex={-1}>` nested inside a `<button>` — invalid HTML (button-in-button) and keyboard-unreachable (`tabIndex={-1}` removes it from tab order entirely). Fixed by restructuring the photo tile into a non-interactive `<div>` wrapper containing two sibling `<button>` elements: one `absolute inset-0` for "View photo N of M" (opens the lightbox), one `absolute right-1.5 top-1.5` for the favorite toggle, with a real `aria-label` (`Add to favorites`/`Remove from favorites`), `aria-pressed`, and a visible `focus-visible:ring-2` state. The lightbox's own favorite button (already a real `<button>`) gained `aria-pressed` too.
- **`ScrollReveal` reduced-motion (discovery doc §8/§17, flagged as a gap):** investigated and found to be a non-issue on closer inspection — `src/app/providers.tsx` wraps the whole app in `<MotionConfig reducedMotion="user">`, which `framer-motion` applies globally to every animated element, `ScrollReveal` included, without any per-component code needed. The in-code comment there explains this was a deliberate choice specifically to avoid the SSR/hydration mismatch that per-component `useReducedMotion()` branching (which a naive "fix" would have reintroduced) causes. No change was made to `ScrollReveal`.

## 8. Performance

- **`HomeSessionRedirect`** (discovery doc §18: "runs a client-side Supabase auth check + subscription on every homepage load, including fully logged-out cold traffic"): now checks `window.location.hash` for an `access_token=` pattern *before* doing anything else. An ordinary cold, logged-out visit — the overwhelming majority of homepage traffic — has no such hash, so the Supabase client module is never imported and no auth-state subscription is created. The client + subscription only get set up on the (rare) post-OAuth-redirect case this component exists to handle.

## 9. SEO / OpenGraph

- **`/og-default.png`** (discovery doc §7/§16 — referenced by both `layout.tsx` and `page.tsx` metadata, but the file never existed anywhere in the repo): replaced by `src/app/opengraph-image.tsx`, a Next.js file-convention `ImageResponse` (same pattern as the existing `apple-icon.tsx`) — 1200×630, dark background, the same six-blade aperture brand mark, wordmark, and tagline. Next.js auto-wires this into both `openGraph.images` and `twitter.images` at request time; both metadata blocks were updated to stop pointing at the dead static path.
- **`twitter.creator: '@lensflow'`** in `layout.tsx` — removed for the same reason as the footer's social links (§5): not a verified account.
- Titles, descriptions, canonical URL, and the `StructuredData`/`FAQPage` JSON-LD block are otherwise unchanged from the discovery doc's §16 (the homepage-specific description was already correctly scoped to say "accept payments"; confirmed still accurate against M-Pesa-only reality and now explicitly says "accept M-Pesa payments").

## 10. Design system

Every touched surface's border-radius was normalized to `rounded-md`, matching the design-token convention formalized in the prior "Design Foundation Phase" work (`docs/DESIGN-SYSTEM.md`) — this cleans up the drift the discovery doc flagged in `ProblemSection` (`rounded-xl`/`rounded-lg`) and `AfricaSection`/`ClientJourney`/`GalleryShowcase`/`FeatureTabs`/`ProductPreview` (`rounded-lg`), none of which were touched by that earlier design-system pass since it explicitly scoped the homepage out at the time.

---

## Final status

Every item in the discovery doc's Final Assessment table that called for action has a resolution:

| Discovery-doc item | Assessment | Resolution |
|---|---|---|
| Navbar / HomeFooter duplication | B / D | Consolidated into one shared `Navbar`/`Footer` (§5) |
| TrustStrip (wrong concept) | D | Replaced with `ValueStrip` |
| ProductPreview (unlabeled fabricated data) | B | "Demo data" badge added |
| ProblemSection (radius drift) | B | Normalized to `rounded-md` |
| FeatureTabs (a11y bug) | A/B | Fixed (§7) |
| GalleryShowcase (undisclosed stock imagery) | B | "Example imagery" caption added |
| DashboardShowcase | B | Removed (§3.9) — flagged for your review |
| AfricaSection (factual accuracy) | **E** | False capabilities removed |
| PricingPreview (no price shown) | D | Replaced with a real `Pricing` section |
| Testimonials (no real testimonials) | **E** | Honestly reframed as `EarlyAccess`; ready to swap in real quotes |
| `/og-default.png` (broken) | C | Replaced with generated `opengraph-image.tsx` |
| Social account mismatch | (part of §12) | `SOCIAL_LINKS` unified and left empty pending real, verified accounts |

The two items marked **E** in the discovery doc — items explicitly flagged as unable to be resolved by redesign work alone — were the two genuinely unblocked here: `AfricaSection` because the fix was subtractive (removing false claims needs no new content), and `Testimonials`/`EarlyAccess` because the honest reframe doesn't require inventing customer content, just not pretending it exists yet.

**Open items still requiring a product decision**, unchanged from before: whether/when to bring `DashboardShowcase` back in some form, and populating `SOCIAL_LINKS` / `TESTIMONIALS` once real accounts and customer quotes exist.
