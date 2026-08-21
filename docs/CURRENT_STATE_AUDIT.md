# LensFlow — Current State Audit

**Date:** 2026-08-21
**Scope:** Full technical architecture + homepage product-design audit. Read-only — no files were modified to produce this report.
**Method:** Direct codebase inspection (migrations, source, config) across two research passes — one technical, one homepage-focused — synthesized here with file:line citations throughout.

---

## Part 1 — Technical Architecture Audit

### 1. Tech stack

- **Framework:** Next.js `^15.5.23` (App Router), React `^19.2.8` / React DOM `^19.2.8` — current major versions paired together.
- **UI:** Radix UI primitives (25 packages) wrapped in a shadcn/ui-style `src/components/ui/` (39 files), `class-variance-authority`, `tailwind-merge`, `lucide-react`, `framer-motion`, `sonner`, `cmdk`, `vaul`, `embla-carousel-react`, `recharts`.
- **Data/DB:** Supabase — `@supabase/ssr ^0.5.0`, `@supabase/supabase-js ^2.45.0` (modern cookie-based SSR pattern actually in use), plus **legacy** `@supabase/auth-helpers-nextjs`, `@supabase/auth-helpers-react`, `@supabase/auth-ui-react`, `@supabase/auth-ui-shared` still listed as dependencies with **zero imports anywhere in `src/`**.
- **Storage/Payments:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (talking to Cloudflare R2, not AWS), `stripe ^16.12.0` (installed, **zero usage** — see §8), `sharp ^0.33.5`, `archiver` (zip bulk-downloads), `@react-pdf/renderer` (invoice/quote PDFs).
- **Forms/validation:** `react-hook-form` + `@hookform/resolvers` + `zod`.
- **State:** `zustand`, `@tanstack/react-query`.
- **TypeScript:** strict mode plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `forceConsistentCasingInFileNames`. Path aliases `@/features/*`, `@/hooks/*`, `@/stores/*`, `@/styles/*` are declared in `tsconfig.json` but **the directories don't exist** under `src/`.
- **Testing:** Vitest (unit + separate `vitest.integration.config.ts`), Playwright, Testing Library — present but not CI-enforced (see §11).
- **Package manager mismatch:** `package.json` declares `"packageManager": "pnpm@9.10.0"`, but `vercel.json:3-4` runs `npm install --legacy-peer-deps` / `npm run build`. The `--legacy-peer-deps` flag signals an unresolved peer-dependency conflict, most likely React 19 vs. the unused legacy Supabase auth-helpers packages.

### 2. Application architecture

Next.js App Router under `src/app/`. Data fetching is predominantly **Server Components calling `'use server'` action modules** in `src/lib/actions/` (25 files) — this is the dominant mutation/read mechanism. Actual `route.ts` API handlers (12 total) are reserved narrowly for: file streaming/downloads, PDF generation, the M-Pesa webhook, and token-regeneration endpoints. This split is clean and consistent.

**Middleware** (`src/middleware.ts`): session-based route gating via `@supabase/ssr`, a 47-entry `PUBLIC_PATHS` allowlist, redirect-to-login-with-`?redirect=`, redirect-authenticated-users-away-from-`/auth/*`, standard security headers, and a **Content-Security-Policy applied only when there is no session** (`middleware.ts:136-151`) — see Critical Issues.

**Folder structure:** `src/app/`, `src/components/` (22 feature subdirs + `ui/`), `src/lib/` (`actions/`, `auth/`, `constants/`, `content/`, `email/`, `entitlements/`, `payments/`, `pdf/`, `storage/`, `supabase/`, `utils/`, `validation/`).

### 3. Routes

- **Marketing/public:** `/`, `/about`, `/pricing`, `/careers`, `/press`, `/contact`, `/partners`, `/affiliates`, `/community`, `/help`, `/api-docs`, `/status`, `/blog/[slug]`, `/docs/[slug]`, `/features/{analytics,booking,crm,galleries,store,website}`, `/solutions/{creative-teams,portrait-photographers,studios,videographers,wedding-photographers}`, legal pages (`/privacy`, `/terms`, `/cookies`, `/security`, `/gdpr`, `/dpa`).
- **Auth:** `auth/(auth)/{login,signup,forgot-password,reset-password}`, `auth/callback` (client-side OAuth/PKCE exchange), `auth/confirmed`.
- **Dashboard (studio-facing):** `dashboard/(dashboard)/[studioSlug]/{analytics,bookings,calendar,clients,contracts,expenses,galleries,invoices,leads,payments,projects,questionnaires,quotes,settings,store,tasks,team,website}` with nested `new`/`[id]`/`[id]/edit` segments.
- **Public client-facing (token-gated, no auth):** `g/[token]` (gallery viewer), `q/[token]` + `quote/[token]` (**dual-mounted**, worth consolidating), `invoice/[token]`, `store/[studioSlug]`, `store/order/[shareToken]`.
- **Admin:** `admin/payouts` — `super_admin`-role-gated, outside the studio-scoped tree.
- **API routes:** 12 `route.ts` handlers under `api/{dashboard,g,galleries,invoice,payments,quote,storage,store}/`.

### 4. Components

`src/components/ui/` (39 files) is a standard shadcn-style primitive set — no separate design-system documentation file; tokens live directly in `tailwind.config.ts`/`globals.css`.

Feature dirs by size: `ui/` (39), `marketing/` (7), `galleries/` (7), `invoices/` (5), `store/` (4), `layout/` (4), `website/`/`quotes/`/`contracts/`/`clients/` (3 each), `billing/` (3) — many feature areas are backed by a single large page-level component rather than being decomposed (e.g. `GalleryDetail.tsx` runs 1200+ lines).

**Duplication:** `AuthUser`-shape + profile-fetch-with-metadata-fallback logic is defined twice near-verbatim — `src/lib/auth/server.ts:4-49` (`getAuthUser`) and `src/lib/auth/hooks.ts:10-69` (`AuthProvider`'s `fetchUser`).

**Stub content:** `MarketingComingSoon` is reused across **12 marketing pages** (`/solutions/*` ×5, `/press`, `/partners`, `/help`, `/careers`, `/community`, `/api-docs`, `/affiliates`) — a large share of the public site is not yet real content.

### 5. Database structure

**Migration hygiene:** `supabase/migrations/_archived/` holds three abandoned migration files describing a schema **never deployed to production** (documented mismatches: `leads`, `collections`, `booking_packages`, `refunds`, `coupons`, `gift_cards`, `audit_logs`, etc. never existed live). This was replaced by `001_baseline_reality.sql` (817 lines), reconstructed by introspecting the *actual* live database — a genuine, well-documented repair of prior schema drift. The active tree runs `001_baseline_reality.sql` then `013`–`030` (numbers 002–012 intentionally archived/absent).

**Core tables:** `studios`, `profiles`, `studio_members` (role/status join, backed by `is_studio_member`/`is_studio_manager` SECURITY DEFINER helpers used throughout RLS); CRM (`clients`, `bookings`, `projects`); galleries (`galleries`, `gallery_albums`, `media`, `gallery_share_settings`); contracts/quotes/invoices (`contracts`+`contract_signers`, `quotes`+`quote_items`, `invoices`+`invoice_items`); store (`products`, `orders`+`order_items`); website builder (`websites`, `website_pages`); billing (`plans` — 4 seeded tiers, `subscriptions` — one live row per studio via partial unique index); one shared `payments` ledger table serving invoice/subscription/order payments via nullable FKs (**"never both set, no DB constraint enforcing it"** per its own migration comment); `notifications`, `tasks`, `expenses`, `questionnaire_templates`/`_responses`, `upload_reservations` (atomic quota), `signup_risk_signals`, `payouts`.

**RLS pattern:** every table has RLS enabled via `is_studio_member(studio_id)`/`is_studio_manager(studio_id)` SECURITY DEFINER helpers (pinned `search_path`). Server-authoritative tables (`subscriptions`, `payments`, `upload_reservations`, `signup_risk_signals`) deliberately have no client write policy — service-role only.

**Good hygiene signal:** two migrations exist specifically to close Supabase-advisor-flagged issues — `025_storage_usage_view_security_invoker.sql` (a SECURITY DEFINER view was bypassing RLS) and `026_pin_search_path_on_quota_functions.sql` (mutable `search_path` — a schema-hijacking vector). These read as real responses to the platform's own security tooling.

**Dead infrastructure:** migration `014_gallery_cover_templates.sql:9-40` provisions a `gallery-media` Supabase Storage bucket with full RLS policies — **zero references to it anywhere in `src/`**, since gallery media actually lives in R2.

### 6. Authentication

Supabase Auth via `@supabase/ssr`. Key files: `src/lib/auth/server.ts`, `src/lib/auth/hooks.ts`, `src/lib/auth/permissions.ts`, `src/lib/auth/index.ts` (barrel).

**Google OAuth homepage-redirect bug — verified fixed.** The login/signup pages build `redirectTo` correctly, and `src/app/auth/callback/page.tsx:17` reads `searchParams.get('redirect') || '/dashboard'` and pushes there after session exchange across every code path (already-has-session, PKCE exchange, magic-link/signup verification, fallback). The earlier "lands on homepage" defect is resolved. (The callback flow is a client-side page, not a `route.ts` handler.)

**Live footgun (not currently a bug, but fragile):** `src/lib/auth/hooks.ts:114-116` defines a `getAuthUserServer()` that unconditionally `return null`. Every dashboard page (60+ files) imports `getAuthUserServer` from `'@/lib/auth'`, and the barrel's explicit re-export (`src/lib/auth/index.ts:1-5`) correctly overrides the wildcard re-export from `hooks.ts` with the real implementation from `server.ts` — so this is **not live-broken**. But one wrong import path (`from '@/lib/auth/hooks'` instead of `'@/lib/auth'`) anywhere would silently null out auth on that page.

**Permissions model:** `src/lib/auth/permissions.ts` defines 100+ permissions across a 6-role matrix, including permissions for features that don't exist in the live schema (`leads:*`, `store:manage_coupons`, `store:manage_gift_cards`, `audit_logs:read/export`) — the same "aspirational surface" pattern seen in the archived migrations.

### 7. Storage implementation

`src/lib/storage/r2.ts` — AWS SDK v3 pointed at R2's S3-compatible endpoint, presigned upload/download URLs via `@aws-sdk/s3-request-presigner`.

**Checksum bug — verified fixed.** `r2.ts:36-44` sets `requestChecksumCalculation: 'WHEN_REQUIRED'` with a detailed comment on the exact prior failure mode (AWS SDK v3's default auto-checksum baked an empty-payload checksum into presigned URLs, causing R2 to 403 real uploads with no CORS headers on the error response, which browsers misreport as a network failure). This was root-caused and fixed this session.

**Key scheme:** `buildMediaKey()` generates `studios/{studioId}/galleries/{galleryId}/assets/{mediaId}/{variant}.{ext}` (`variant`: `raw|preview|thumb|original`), requiring a server-generated `mediaId` — client-supplied paths are explicitly disallowed by contract.

**Upload flow:** browser uploads directly to R2 via presigned URL (bypassing the Next.js server for file bytes); server-side `sharp` generates `preview` (resized, webp q90) and `thumb` (resized, webp q80) variants; original retention is gated on plan entitlement. Quota is enforced atomically via a Postgres RPC + advisory lock (migration 021), replacing an earlier race-prone read-then-decide check. Downloads are gated through short-lived presigned GET URLs or streamed zips — originals never get a public URL.

### 8. Payment implementation

**Entitlements** (`src/lib/entitlements/service.ts`) is the documented single source of truth for plan resolution — `getEffectivePlan()` handles status fallback, grace-period windows, and lazily materializes due scheduled downgrades on read (no cron in the system).

**PostgREST ambiguous-embed bug — verified fixed at all live call sites.** `subscriptions` has two FKs to `plans` (`plan_id`, `pending_plan_id`), making an unqualified `plan:plans(*)` embed ambiguous. All three real embed sites now qualify the FK explicitly (`service.ts:161`, `payments/resolve.ts:122`, `actions/billing.ts:33`). One remaining unqualified embed (`billing.ts:71`, off `payments`) was checked and is currently safe since `payments` has only one FK to `plans` — but it would silently re-break if a second FK were ever added, so it's fragile-by-convention rather than fixed-by-design.

**Only M-Pesa is actually implemented.** `src/lib/payments/mpesa.ts` (Daraja STK Push, OAuth token caching, Kenyan phone normalization, fixed USD→KES rate of 129 documented as an approximation) and `src/lib/payments/resolve.ts` (`applyMpesaPaymentOutcome()`, race-safe via conditional UPDATE, shared by webhook + polling fallback) handle all three payment kinds (invoice, subscription, store order) off one `payments` ledger table. **Stripe, Flutterwave, and PayPal are schema/config placeholders only** — `stripe` is installed with zero imports; Flutterwave/PayPal env vars and the `payments.method` CHECK constraint exist with no calling code.

### 9. API integrations

- **Email (Resend):** actively used — `src/lib/email/resend.ts`, `templates.ts`.
- **Google Analytics/GTM:** wired into CSP allowlisting and loaded `afterInteractive`.
- **PostHog: half-wired.** `next.config.mjs:91-106` proxies `/ingest/*` to PostHog's ingestion domain and `.env.example` documents the keys, but **zero client-side PostHog SDK calls exist anywhere in `src/`** — the proxy currently serves no traffic.
- **Africa's Talking (SMS/WhatsApp):** documented in README/`.env.example`, referenced only as a constant — no calling code.
- **Sentry:** env vars documented, no SDK dependency, no usage.
- **No AI/LLM integration** anywhere in the codebase.
- **PDF generation** (`@react-pdf/renderer`): self-hosted, not third-party.

### 10. Environment variables

`.env.example` is thorough and well-organized, but roughly a third of its sections describe integrations that are unused or half-wired without flagging that fact: Supabase Storage (`NEXT_PUBLIC_SUPABASE_STORAGE_URL`, `SUPABASE_STORAGE_BUCKET_*` — zero references in `src/`, superseded by R2), Africa's Talking, Flutterwave, PayPal, Stripe, Sentry, PostHog. A new contributor reading this file would reasonably assume all of these are live.

### 11. Deployment configuration

- `vercel.json`: minimal, `npm`-based install/build — mismatched against the `pnpm` `packageManager` field (§1).
- `next.config.mjs`: sensible `images.remotePatterns`; security headers site-wide; a **dead `/sw.js` header block** (`next.config.mjs:76-88`) for a service worker file that doesn't exist anywhere in the repo (no `public/` directory at all); a PostHog rewrite proxy with no client calling it; `experimental.serverActions.allowedOrigins` **hardcoded to `['localhost:3000']` only** — worth explicit verification that Server Actions aren't silently rejected in production, since nothing else in the repo adds a production origin conditionally.
- **No CI/CD.** No `.github/workflows/` directory exists — `lint`/`typecheck`/`test`/`test:e2e` scripts exist but nothing runs them automatically on push/PR.
- **Husky/lint-staged installed but not configured.** `postinstall`/`prepare` scripts run `husky install`, but there is no actual `.husky/pre-commit` file and no `lint-staged` config anywhere.

### 12. Existing design system

`tailwind.config.ts`: `darkMode: ['class']`; fully indirect HSL-CSS-variable color tokens (`border`, `primary`/`secondary`/`destructive`/`muted`/`accent`/`popover`/`card`, each with `DEFAULT`+`foreground`, plus `surface`/`success`/`warning`/`info`); font families `sans` (Archivo), `display` (Spectral), `mono` (JetBrains Mono), plus three heading-serif variants (`heading-playfair`/`heading-cormorant`/`heading-bodoni`) added for the gallery-cover-typography feature; a full `clamp()`-based type scale (`display-xl/lg/md/sm`, `heading-xl/lg/md/sm`, `body-lg/body/body-sm`, `caption`); custom spacing tokens (`space-18/22/30`); a complete shadow/transition/animation-keyframe set.

`src/app/globals.css`: CSS variables on `:root`/`.dark`, toggled via `next-themes`' class strategy. The palette has genuine in-code design rationale ("cool matte white, never stark #fff" for light background; a single wine-red accent described as a "gallery 'sold' dot / wax-seal red"; dark mode as "dim viewing room: tinted charcoal-ink, never pure black") — a deliberate, considered visual identity, not default shadcn boilerplate. A parallel hand-rolled `@layer components` button/input utility system (`.btn-primary`, `.input-field`, etc.) exists alongside the Radix-based `ui/button.tsx` — worth verifying both aren't being used inconsistently across the app.

### 13. Responsive behavior

Directionally consistent but not exhaustively verified page-by-page. Shared layout utilities (`container-narrow`, `container-wide`, `page-section` in `globals.css:125-135`) carry their own internal breakpoints (`px-4 sm:px-6 lg:px-8`, `py-12 sm:py-16 lg:py-20`) and are used broadly, which centralizes a lot of responsiveness rather than repeating it per component. Some components (e.g. `GalleryDetail.tsx`) hand-roll their own breakpoint classes densely; others (`StorageUsageWidget.tsx`, `LegalDocument.tsx`, `MarketingCTA.tsx`) carry none, relying entirely on the shared utilities. A full visual pass across all 22 component subdirectories would be needed for a fully confident claim; this audit supports only a directional read.

### 14. Major technical debt

Ranked roughly by severity:

1. **Dead `/sw.js` header config** with no service worker or `public/` directory anywhere.
2. **PostHog half-wired** — proxy configured, SDK never initialized.
3. **Husky/lint-staged installed but inert** — no pre-commit hook actually runs.
4. **Aspirational constants/permissions ahead of the real schema** — `src/lib/constants/index.ts` (coupons, gift cards, shipping zones, SMS/WhatsApp/push notification channels, Stripe/Flutterwave/PayPal minimums) and `src/lib/auth/permissions.ts` (leads, coupons, gift cards, audit logs) both model features that don't exist in the live database.
5. **`getAuthUserServer()` null-stub footgun** in `hooks.ts`, currently shadowed safely by barrel-export ordering but one bad import away from silently breaking auth on any page that hits it.
6. **README drifted from reality** — claims Stripe+Flutterwave+M-Pesa+PayPal (only M-Pesa exists), Supabase Storage (actual storage is R2), Africa's Talking SMS/WhatsApp (unimplemented), FFmpeg video processing (zero FFmpeg references in the repo).
7. **Unused legacy Supabase auth packages** (`auth-helpers-nextjs`, `auth-helpers-react`, `auth-ui-react`, `auth-ui-shared`) with zero imports.
8. **Stripe dependency with zero usage.**
9. **Dead `gallery-media` Supabase Storage bucket + RLS policies** shipped in migration history, superseded by R2, never removed.
10. **CSP gap on authenticated routes** — no CSP header at all on logged-in dashboard pages (see Critical Issues).
11. **`getUserStudiios` typo** in an exported function name (`src/lib/auth/server.ts:86`).
12. **Duplicated auth-user-shape logic** between `server.ts` and `hooks.ts`.
13. **Package-manager mismatch + `--legacy-peer-deps`** papering over an unresolved dependency conflict.
14. **Unused `tsconfig.json` path aliases** (`@/features/*`, `@/hooks/*`, `@/stores/*`, `@/styles/*`) pointing at nonexistent directories.
15. **12 of the public marketing pages are stub content** (`MarketingComingSoon`).
16. **`server-actions.allowedOrigins` hardcoded to `localhost:3000`** — needs explicit production verification.
17. **No CI/CD gate** before code lands on the deploy branch.

**Context worth stating plainly:** this codebase shows a genuine, recent pattern of finding and fixing real production bugs with clear, well-commented root-cause writeups — the R2 checksum fix, the two Supabase-advisor-driven RLS/search_path fixes, the plans-FK disambiguation, the archived-migration schema-drift cleanup, and the atomic-upload-quota race fix all read as competent incident response, not systemic carelessness. The debt above is the normal residue of a fast-moving product, concentrated in **unused/half-wired integrations and aspirational-but-unbuilt surface area**, not in the actively-used payment/storage/entitlements code paths, which are unusually well-documented about *why* they work the way they do.

---

## Part 2 — Homepage Product-Design Audit

**Render tree** (confirmed): `src/app/layout.tsx` → `src/app/page.tsx` composes, in order: `StructuredData` → `HomeSessionRedirect` → skip-link → `Navbar` → `Hero` → `TrustStrip` → `ProblemSection` → `FeatureTabs` → `GalleryShowcase` → `ClientJourney` → `DashboardShowcase` → `AfricaSection` → `PricingPreview` → `Testimonials` → `Faq` → `FinalCta` → `HomeFooter`. Twelve content sections plus nav/footer.

**Important structural note:** the homepage does **not** use `MarketingShell.tsx`, the shell every other marketing page (about, careers, etc.) uses. It ships its own bespoke `Navbar`/`HomeFooter` — meaning the homepage's dark, transparent-over-hero nav is visually a different system from the plain sticky light header on the rest of the site. A real cross-site consistency gap.

### 1. Visual hierarchy

The hero (full-bleed dark photo + oversized serif H1) correctly draws the eye first. Below it, hierarchy **flattens for nine straight sections**: `ProblemSection` through `Faq` all use the exact same heading recipe verbatim (`text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl`, plus an identical `label-caption` eyebrow and `mx-auto max-w-2xl text-center` wrapper). Body copy is likewise a single repeated step (`text-lg text-muted-foreground`). `FinalCta` is the only section that breaks the pattern (mirrors the hero's weight), meaning the page has real visual weight at exactly two points — the very top and the very bottom — with nine indistinguishable blocks in between.

### 2. Typography

Fonts: Archivo (`--font-sans`, body/UI default), Spectral (`--font-display`, every heading site-wide), JetBrains Mono (eyebrow/label microcopy only). Three more heading-serif families (Playfair Display, Cormorant Garamond, Bodoni Moda) load globally via `next/font/google` in the root layout **solely for a gallery-cover-typography feature elsewhere in the app** — the homepage's `<head>` pays the preconnect/network cost of 6 font families to render itself with 3.

The custom type-scale tokens in `tailwind.config.ts` (`display-xl/lg/md/sm`, `heading-*`, `body-*`) are well-designed but **the homepage never uses them** — every heading is hand-set with raw Tailwind (`text-3xl … sm:text-5xl`, `text-[2.5rem] … lg:text-[5.5rem]`). A global type-scale change would not touch this page at all. Body copy line-length is well-controlled (`max-w-xl`/`max-w-2xl` caps), though line-height doesn't pull from the tokens' explicit `1.6`.

### 3. Spacing

Most sections use the shared `.page-section` utility (`py-12 sm:py-16 lg:py-20`) — consistent rhythm. Three "editorial break" sections (`Hero`, `GalleryShowcase`, `FinalCta`) opt out with hand-tuned values that don't match `.page-section` **or each other**, and none use the custom `space-18/22/30` tokens (which go entirely unused on this page). Internal micro-spacing within each section (eyebrow → heading → body → CTA) is consistently disciplined — the macro-rhythm between sections is the weaker layer.

### 4. Navigation

Desktop: 4 top-level items (Product, Solutions, Pricing, Resources) fronting 17 total destinations via dropdowns — reasonably scoped. Two nav CTAs ("Log in", "Start free") that invert color on scroll. Mobile: full-screen dark overlay with accordion groups, proper `role="dialog" aria-modal="true"`, Escape-to-close, scroll-lock — solid pattern.

**IA inconsistency:** the Payments/Invoicing feature is named three different things across three homepage-reachable surfaces — nav calls it "Invoicing" linking to `/features/analytics#payments`, `FeatureTabs` calls it "Payments" linking to `/features/analytics`, footer also says "Payments" to the same URL. A page named "analytics" is the payments feature's URL everywhere — a content/IA smell.

### 5. Hero section

Exact copy — eyebrow: *"Built for photographers & videographers"*; H1: *"Everything your creative business needs. In one place."*; subhead: *"Deliver stunning galleries, book clients, send contracts, get paid, and run your business — without juggling a dozen different tools."*

**The H1 doesn't name the product category.** A cold visitor reading only the headline would not know this is photography software — that information lives entirely in the small eyebrow line above it, the least visually prominent element in the hero. The hero image is generic Unsplash stock (a photographer on a rooftop), not the product, not a real client's work. The one genuine "show, don't tell" asset — a `ProductPreview` dashboard mockup — is positioned overlapping the bottom of the hero/next-section boundary, effectively below the fold on most viewports.

### 6. CTA strategy

Effectively **2 conversion-intent CTA labels** ("Start free" / sign up), repeated 4 times, plus **~9 exploratory "learn more" CTAs** scattered through feature sections, plus one "View pricing" link. Primary/secondary is well-differentiated visually within the hero and final CTA. But **five of twelve sections dead-end with no CTA at all**: `TrustStrip`, `ClientJourney`, `DashboardShowcase`, `AfricaSection`, `Testimonials`. A visitor persuaded partway through the page has nothing to click until they scroll further or reach the very end.

### 7. Feature presentation

Strongest mechanic on the page: an interactive tabbed area (6 tabs — Galleries, Booking, CRM, Payments, Store, Websites) pairing benefit-led copy ("Get paid without the back-and-forth") with genuinely interactive, stateful mock UI inside a fake browser chrome — favoriting images, opening a lightbox, a fake loading state on "Download all." High craft. But **everything is simulated, not real** — no actual product screenshots anywhere on the page; all demos use placeholder names and an explicit "Demo data" badge.

### 8. Trust signals — the page's weakest dimension

The section literally named `Testimonials` **contains no testimonials** — no customer quotes, names, photos, or logos anywhere in the codebase for it. It reads "Built with working photographers," "Early access is open," "Join the first LensFlow creators" — an honest "we're new" message occupying the visual slot a social-proof section normally fills. `TrustStrip` shows category words (*Photography, Videography, Studios, Creative Teams*), not brand logos. No real usage stats anywhere — the only numbers on the page are explicitly-labeled demo data. No security/privacy mention, no founder story, no team photo on the homepage itself. For a buyer segment (independent photographers) that relies heavily on peer proof, this is very likely the single biggest conversion blocker on the page.

### 9. Pricing presentation

No pricing table or price on the homepage body. `PricingPreview` is a values pitch (a "stitching tools together yourself" list vs. "one LensFlow subscription") linking out to `/pricing`. The **only** dollar figure on the entire page — *"Paid plans start at $12/month, with a free plan also available"* — is buried inside a collapsed FAQ accordion item, easy to miss entirely.

### 10. Mobile UX

Generally well-handled: separate lower-res mobile hero image with parallax disabled; CTA buttons stack full-width; `FeatureTabs` switches to a horizontal-scroll pill row; `GalleryShowcase` degrades from an 8-image filmstrip to a static 4-image 2×2 grid (silently drops half the showcased work); `ClientJourney` has a genuinely separate, purpose-built mobile timeline rather than a squeezed desktop layout; `Testimonials` uses a snap-scroll carousel. One real gap: nav CTA buttons (~36-40px tall) sit under the commonly-cited 44px touch-target guideline; hero/final-cta CTAs are appropriately sized (~52-54px).

### 11. Accessibility

Generally solid. Exactly one `<h1>` on the page; every section correctly uses `<h2>`/`<h3>`. Skip link present and correctly targeted. Every image carries real `alt` text (no raw `<img>` tags on this page at all — the codebase's known raw-`<img>` pattern doesn't reach the homepage). Interactive demo widgets have real `aria-label`s and correct dialog semantics. `:focus-visible` is styled globally and applied consistently.

**One real gap:** the favorite-toggle control in the gallery-demo thumbnail grid is a `<span role="button" tabIndex={-1}>` — `tabIndex={-1}` explicitly removes it from keyboard tab order, so keyboard-only users cannot reach or activate it at all. It's a fake button, reachable only by mouse/touch.

**Worth a manual check:** the smallest label text on the page (`text-[10px] text-white/40`, in the dashboard/product-preview mockups) stacks a very small font size with low-opacity white directly over a photographic (non-flat) background — a plausible WCAG AA contrast failure point.

### 12. Performance

Every homepage image is a remote Unsplash URL — `next/image`-optimized, but the page's entire visual identity depends on a third-party CDN, and none of it is LensFlow's own product or customers. The hero renders **two** `priority` `<Image>` elements (desktop + mobile variants, CSS-hidden per breakpoint rather than conditionally unmounted) — both are eagerly prioritized regardless of viewport unless Next's loader skips the hidden one at the network layer, which is worth verifying directly.

Font loading correctly uses `display: 'swap'` throughout, but as noted in §2, half the loaded font families are irrelevant to this page.

**12 of ~18 homepage component files are client components** (`'use client'`), the majority driven by `framer-motion` scroll/reveal/parallax effects rather than functional necessity — e.g. `ProblemSection` is a client component purely for a rotate-in animation on static icon tiles that a CSS-only or server-rendered equivalent would handle. `HomeSessionRedirect` runs a client-side Supabase auth check on every homepage load, including fully logged-out cold traffic, on what should be the site's cheapest, most static page. A `usePrefersReducedMotion` hook is defined and never imported anywhere (every component calls `framer-motion`'s own `useReducedMotion()` instead) — dead code shipped in the bundle path.

### 13. Conversion weaknesses — prioritized

1. **Zero social proof anywhere** — the "Testimonials" section has no testimonials. Very likely the single biggest conversion blocker on the page.
2. **The headline doesn't say what the product is** — requires reading much smaller eyebrow text to learn this is for photographers at all.
3. **No price visible without hunting** — the only dollar figure is inside a collapsed FAQ item.
4. **Five of twelve sections dead-end with no CTA.**
5. **All product "proof" is simulated, not real** — well-crafted, but a skeptical buyer can tell.
6. **Nav/footer naming inconsistency** (Payments/Invoicing/"analytics") compounds the "is this a finished product" doubt already raised by the trust-signal gap.
7. **Visual hierarchy flattens for 9 straight sections** — increases scroll fatigue, fewer natural decision points.
8. **Every image is Unsplash stock, including the hero** — a specific credibility gap for a product about delivering *original* photography work.

---

## Part 3 — What Could Be Safely Removed, Consolidated, or Refactored

**Safe to remove outright** (zero usages found):
- Legacy Supabase auth packages: `@supabase/auth-helpers-nextjs`, `@supabase/auth-helpers-react`, `@supabase/auth-ui-react`, `@supabase/auth-ui-shared`.
- `stripe` npm dependency (until Stripe is actually implemented).
- The `/sw.js` header block in `next.config.mjs:76-88`.
- The dead `usePrefersReducedMotion` hook (`lib/use-reduced-motion.ts`) on the homepage.
- Unused `tsconfig.json` path aliases (`@/features/*`, `@/hooks/*`, `@/stores/*`, `@/styles/*`).

**Safe to consolidate:**
- `AuthUser`-shape + fallback logic duplicated between `src/lib/auth/server.ts` and `src/lib/auth/hooks.ts` — extract to one shared function.
- The `getAuthUserServer()` null-stub in `hooks.ts` should be deleted (not just shadowed by export ordering) to remove the footgun entirely.
- Homepage should adopt `MarketingShell.tsx` (or the shell should adopt the homepage's nav) rather than maintaining two parallel nav/footer systems.
- `q/[token]` and `quote/[token]` dual-mounted routes — pick one, redirect the other.
- The nine near-identical homepage section-heading blocks (§1 of Part 2) are a strong candidate for extraction into one shared `<SectionHeading>` component — currently the exact same className string is repeated verbatim in 9 files.

**Needs a decision, not just cleanup** (requires a migration or product call, not a simple deletion):
- The dead `gallery-media` Supabase Storage bucket + RLS policies (shipped in migration history — removing requires a new migration, not an edit to the old one).
- Aspirational constants/permissions ahead of the real schema (`STORE_CONSTANTS`, `Permission` union entries for leads/coupons/gift-cards/audit-logs) — either build the features or prune the surface.
- PostHog: either finish wiring the client SDK or remove the proxy config and env vars.
- README needs a rewrite to match actual implemented scope (payments, storage, SMS, video processing all currently overclaimed).

---

## Critical Issues

1. **No CSP on authenticated dashboard routes.** `middleware.ts:136-151` only sets Content-Security-Policy `if (!session)` — every logged-in page, where the actual sensitive app functionality lives, ships with zero CSP protection.
2. **`server-actions.allowedOrigins` hardcoded to `localhost:3000`** with no visible production-origin path — needs immediate verification that Server Actions actually work correctly in production, since this is a load-bearing config for the app's dominant data-mutation mechanism.
3. **Homepage has no testimonials in its Testimonials section, and no real customer proof anywhere** — a credibility gap serious enough to be actively costing signups, not just a cosmetic gap.
4. **Package manager / install-flag mismatch** (`pnpm` declared, `npm --legacy-peer-deps` actually used in deployment) — masks a real unresolved dependency conflict that could break a clean install at any time.
5. **No CI/CD and no working pre-commit hooks** — there is currently no automated gate of any kind before code reaches the deploy branch.

## High-Priority Improvements

- Rewrite the homepage hero headline to name the product category in the primary H1, not just the eyebrow.
- Add real testimonials/social proof (even 2-3 real early users with names/photos would materially outperform the current "early access" framing) or reframe that section's copy to stop implying testimonials exist.
- Surface a real price point above the fold or in a dedicated, non-collapsed pricing section on the homepage.
- Add a CTA to every homepage section, or intentionally merge/shorten the five sections that currently dead-end.
- Delete the `getAuthUserServer()` null-stub in `hooks.ts` rather than relying on export-order safety.
- Resolve the package-manager mismatch (standardize on one of pnpm/npm, remove `--legacy-peer-deps` by clearing the underlying conflict).
- Stand up a minimal CI workflow running `lint`/`typecheck`/`test` on PRs.
- Verify and fix `server-actions.allowedOrigins` for production.
- Author a CSP variant for authenticated routes rather than omitting it entirely.

## Medium-Priority Improvements

- Extract the repeated homepage section-heading pattern into a shared component.
- Consolidate the homepage's bespoke nav/footer with `MarketingShell` or vice versa.
- Replace simulated product demos with (or supplement them with) real product screenshots somewhere on the homepage.
- Fix the mismatched section-to-section spacing scale (`Hero`/`GalleryShowcase`/`FinalCta` vs. the shared `.page-section` rhythm).
- Adopt the existing `display-*`/`heading-*`/`body-*` type-scale tokens in homepage components instead of hand-set Tailwind sizes.
- Consolidate `q/[token]`/`quote/[token]` into one route.
- Fix the keyboard-inaccessible favorite-toggle in the gallery demo (`tabIndex={-1}` → remove or make it a real focusable button).
- Finish or remove the PostHog integration.
- Rename the Payments/Invoicing/"analytics" feature consistently across nav, footer, and its own URL.

## Low-Priority Improvements

- Fix the `getUserStudiios` typo.
- Prune unused `tsconfig.json` path aliases or build out the directories they imply.
- Remove the unused legacy Supabase auth packages and the unused `stripe` dependency.
- Remove the dead `/sw.js` header config (or actually build a PWA manifest/service worker if that's wanted — see prior conversation).
- Configure `lint-staged` now that Husky is already installed, or remove Husky if it's not going to be used.
- Update the README to reflect actually-implemented scope.
- Prune the dead `gallery-media` Supabase Storage bucket via a new migration.
- Remove the unused `usePrefersReducedMotion` hook.

## Recommended Architecture Going Forward

- **Keep the Server Actions-first pattern** — it's clean, consistent, and well-suited to this app's shape; don't introduce a parallel REST/GraphQL layer without a concrete need.
- **Formalize the entitlements module's "single source of truth" convention** into a lint rule or code-review checklist item, since the PostgREST ambiguous-embed bug happened specifically because a different call site bypassed it — the pattern that prevents recurrence already exists, it just needs enforcement.
- **Split CSP into two variants** (public/unauthenticated as today, plus a real authenticated-route policy) rather than an all-or-nothing per-session toggle.
- **Introduce CI** (lint + typecheck + unit tests, minimum) gating merges to the deploy branch, and actually configure the already-installed Husky/lint-staged for pre-commit.
- **Treat `.env.example` and the README as living documents** — flag or remove sections describing unimplemented integrations so new contributors get an accurate picture of what's real.
- **Before building new payment gateways**, decide whether Stripe/Flutterwave/PayPal are actually on the roadmap; if not, remove the placeholder schema/config surface rather than letting it keep implying support that doesn't exist.
- **Adopt the shared `MarketingShell` for the homepage** so the whole public site shares one nav/footer/design system rather than two.

## Recommended Homepage Structure

A tighter, hierarchy-respecting structure, keeping the strongest existing assets (the interactive `FeatureTabs` demos, the `ClientJourney` timeline) while fixing the credibility and flow issues identified above:

1. **Hero** — headline that names the category ("The all-in-one platform for photographers and videographers" or similar), subhead as today, primary CTA + secondary "See it in action" CTA, and pull the `ProductPreview` mockup fully into view (not overlapping the fold boundary).
2. **Real trust strip** — replace category words with actual early-customer logos/names/quotes as soon as any exist; until then, reframe honestly (e.g. a founder note) rather than occupying a "Testimonials" slot with no testimonials.
3. **Problem → Solution** (keep `ProblemSection`, convert to server component / CSS-only animation).
4. **Feature tabs** (keep as the centerpiece — it's the strongest asset on the page) — each tab's CTA should be visually distinct as a natural "try this" rather than a generic "See X."
5. **Client journey timeline** (keep — genuinely good, benefit-led).
6. **Real proof section** — actual product screenshots or a short customer case study, replacing/supplementing the simulated `DashboardShowcase`.
7. **Pricing** — a real, visible pricing snapshot (at least starting price + tier names) above any FAQ, not buried in a collapsed accordion.
8. **Testimonials (real, once available) / social proof.**
9. **FAQ.**
10. **Final CTA.**

Every section above should end with a next step — either a direct CTA or a clear visual link to the next section, so no section dead-ends.

## Files That Should Be Changed for the Homepage Redesign

- `src/app/page.tsx` — section ordering/composition.
- `src/components/marketing/home/hero.tsx` — headline copy, `ProductPreview` positioning, font-token adoption.
- `src/components/marketing/home/navbar.tsx` and `footer.tsx` — reconcile with `MarketingShell.tsx`, fix Payments/Invoicing naming.
- `src/components/marketing/home/trust-strip.tsx` — replace category words with real proof once available.
- `src/components/marketing/home/testimonials.tsx` — either populate with real testimonials or rewrite copy to stop implying they exist.
- `src/components/marketing/home/pricing-preview.tsx` — surface an actual price, not just a link to `/pricing`.
- `src/components/marketing/home/faq.tsx` — move the `$12/month` starting-price fact out of a collapsed item if pricing isn't otherwise surfaced.
- `src/components/marketing/home/problem-section.tsx`, `client-journey.tsx`, `dashboard-showcase.tsx`, `africa-section.tsx` — add CTAs where currently absent; convert `problem-section.tsx` off `'use client'` if its animation can be CSS-only.
- `src/components/marketing/home/product-preview.tsx` — reposition relative to the hero fold.
- `src/components/marketing/home/feature-demos/galleries-demo.tsx` — fix the `tabIndex={-1}` keyboard-accessibility issue on the favorite toggle.
- `src/lib/constants/homepage.ts` — copy/nav-link source of truth for most of the above.
- `tailwind.config.ts` / `src/app/globals.css` — no changes needed; the token system already supports a better result, homepage components just need to adopt it.
- A new shared `<SectionHeading>` component (doesn't exist yet) to de-duplicate the 9-times-repeated heading pattern.

## Potential Risks and Breaking Changes

- **Removing the legacy Supabase auth packages or the `stripe` dependency**: low risk (zero live imports confirmed), but re-run a full install + build before merging to catch any transitive-dependency surprise, especially given the existing `--legacy-peer-deps` flag masking a real conflict.
- **Adding CSP to authenticated routes**: real risk of breaking something currently relying on inline scripts/styles or third-party embeds that aren't yet allowlisted — needs careful staged rollout (report-only mode first) rather than a direct enforce.
- **Fixing `server-actions.allowedOrigins`**: if the current hardcoded `localhost:3000` value actually is silently broken in production today, fixing it could change behavior that some workaround elsewhere depends on — verify current production behavior before changing this.
- **Moving the homepage onto `MarketingShell`**: touches every homepage section's outer chrome simultaneously — visually low-risk but should be done as its own isolated PR, not bundled with content changes, so a regression is easy to bisect.
- **Removing the `gallery-media` Supabase Storage bucket**: must be a new migration (not an edit to the shipped one) and should first confirm zero production objects still live in that bucket before dropping policies/bucket.
- **Consolidating `q/[token]`/`quote/[token]`**: any existing shared links using the route being removed will break — needs a redirect, not a deletion, and an audit of which one (if either) has been actually shared with real clients.
- **Changing homepage copy/pricing visibility**: no technical risk, but any pricing figure shown on the homepage must be kept in lockstep with `/pricing` and the actual `plans` table — a stale hardcoded price is a real risk once one is added.
