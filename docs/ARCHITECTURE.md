# LensFlow — Architecture

This document describes the architecture that actually exists in this codebase today. It is descriptive, not aspirational — anything not built is called out as such rather than implied.

## What LensFlow is

A Next.js SaaS for photography/videography studios: client galleries with proofing/download, booking, CRM, contracts, quotes, invoicing, a digital-product store, and a lightweight website builder — one dashboard per studio, with token-gated public pages for the studio's clients.

## High-level shape

```
Browser
  │
  ├── Next.js App Router (Vercel, Node runtime, output: 'standalone')
  │     ├── Server Components — most reads, direct in page.tsx
  │     ├── Server Actions ('use server', src/lib/actions/*) — most writes and reads that need auth context
  │     └── route.ts handlers (src/app/api/**) — narrow set: file streaming, PDF generation, the M-Pesa webhook, token regeneration
  │
  ├── Supabase (Postgres + Auth)
  │     ├── Auth — @supabase/ssr, cookie-based sessions, middleware-gated
  │     └── Postgres — RLS on every table, SECURITY DEFINER helper functions for studio-membership checks
  │
  └── Cloudflare R2 (S3-compatible object storage)
        └── Browser uploads directly via presigned URLs; server never proxies file bytes
```

## Data-fetching pattern

The dominant pattern is **Server Components calling Server Actions**, not a REST/GraphQL API layer:

- `src/lib/actions/` (25 modules) is the primary interface for both reads with auth context and all writes. Each action module owns one feature area (`galleries.ts`, `billing.ts`, `team.ts`, etc.).
- `route.ts` handlers exist only where a Server Action genuinely can't do the job: streaming file downloads, generating a PDF response, receiving a webhook (M-Pesa), or endpoints that must be fetchable as a plain URL (share-token regeneration links).
- There is no `src/app/api/v1/`-style general-purpose API — API routes are the exception, not the rule.

This is a deliberate, consistent pattern. Keep it: don't introduce a parallel REST layer for something a Server Action already handles.

## Route map (as built)

- **Marketing/public** — homepage, `/about`, `/pricing`, `/features/*`, `/solutions/*`, `/blog/[slug]`, `/docs/[slug]`, legal pages. A large fraction (12 pages) render the shared `MarketingComingSoon` placeholder rather than real content — see `docs/ROADMAP.md`.
- **Auth** — `auth/(auth)/{login,signup,forgot-password,reset-password}`, `auth/callback` (client-side OAuth/PKCE exchange page — not a `route.ts`), `auth/confirmed`.
- **Dashboard** — `dashboard/(dashboard)/[studioSlug]/{analytics,bookings,calendar,clients,contracts,expenses,galleries,invoices,leads,payments,projects,questionnaires,quotes,settings,store,tasks,team,website}`, each with `new`/`[id]`/`[id]/edit` as needed. `dashboard/new` (studio creation) and `dashboard/page.tsx` (studio picker) sit outside the `[studioSlug]` group.
- **Public client-facing (token-gated, no login)** — `g/[token]` (gallery viewer), `q/[token]` and `quote/[token]` (dual-mounted — pick one eventually, see Decisions), `invoice/[token]`, `store/[studioSlug]`, `store/order/[shareToken]`.
- **Admin** — `admin/payouts`, gated on `role === 'super_admin'`, outside the studio-scoped tree.
- **API routes** — 12 `route.ts` files under `api/{dashboard,g,galleries,invoice,payments,quote,storage,store}/`.

## Authentication

- `@supabase/ssr` cookie-based sessions. `src/middleware.ts` gates every non-public path, redirects unauthenticated visitors to `/auth/login?redirect=...`, and redirects authenticated visitors away from `/auth/*`.
- Server-side user resolution: `getAuthUser()` in `src/lib/auth/server.ts`, exported through the barrel `src/lib/auth/index.ts` as `getAuthUserServer` — this is what every dashboard `page.tsx` calls.
- Client-side: `AuthProvider`/`useAuthUser` in `src/lib/auth/hooks.ts`, backed by `onAuthStateChange`.
- Permissions: `src/lib/auth/permissions.ts` defines a role → permission matrix (6 roles). Note: some permission entries reference features that don't exist yet in the schema (leads, coupons, gift cards, audit logs) — see `docs/ROADMAP.md`. Don't treat the presence of a permission constant as proof the feature is built.
- Google OAuth flow: `signInWithOAuth` → `/auth/callback?redirect=...` → client-side session exchange → push to `redirect` param, defaulting to `/dashboard`. Verified correct across every code path in `src/app/auth/callback/page.tsx`.

## Storage

- Cloudflare R2, via the S3-compatible AWS SDK (`src/lib/storage/r2.ts`), **not** Supabase Storage (a Supabase Storage bucket exists in migration history but is unused — see Decisions).
- Upload flow: server issues a presigned PUT URL (`createPresignedUploadUrl`); the browser uploads directly to R2, bypassing the Next.js server entirely for file bytes. Server-side, `sharp` then downloads the raw object and generates `preview`/`thumb` webp variants.
- Key scheme: `studios/{studioId}/galleries/{galleryId}/assets/{mediaId}/{variant}.{ext}`, where `mediaId` must be server-generated (never trust a client-supplied path).
- Downloads: originals never get a public URL — access is only through short-lived presigned GET URLs or a streamed zip (`archiver`) for bulk downloads.
- Quota: enforced atomically via a Postgres RPC + advisory lock (`reserve_upload_quota`, migration 021), not a read-then-decide check.
- The S3 client is configured with `requestChecksumCalculation: 'WHEN_REQUIRED'` — required for R2 compatibility with AWS SDK v3 ≥ 3.729, which otherwise signs presigned URLs against an empty-payload checksum and causes every direct upload to fail with a misleading CORS-looking 403. **Do not remove this setting.**

## Payments

- `src/lib/entitlements/service.ts` is the single documented source of truth for "what plan does this studio have right now" (`getEffectivePlan`, `reserveUploadQuota`, `getSubscriptionAccessState`). All plan/entitlement checks should go through this module — don't query `plans`/`subscriptions` directly elsewhere.
- `subscriptions` has two foreign keys to `plans` (`plan_id`, `pending_plan_id`). Any embed of `plans` off `subscriptions` **must** qualify the FK explicitly (`plans!subscriptions_plan_id_fkey(...)`) — an unqualified `plan:plans(*)` embed is ambiguous to PostgREST and previously caused every paid studio to silently resolve to the Free plan. All three current call sites do this correctly; keep doing it for any new one.
- **Only M-Pesa is implemented.** `src/lib/payments/mpesa.ts` (Daraja STK Push) and `src/lib/payments/resolve.ts` (`applyMpesaPaymentOutcome`, race-safe via conditional UPDATE) handle invoice payments, subscription payments, and store-order payments off one shared `payments` ledger table. Stripe, Flutterwave, and PayPal exist only as schema columns, env var placeholders, and an unused npm dependency (Stripe) — there is no calling code for any of them. Do not assume they work.

## Database

- Schema lives in `supabase/migrations/`, starting from `001_baseline_reality.sql` (reconstructed directly from the live production database after earlier drafted migrations drifted from reality — see `_archived/README.md`), then `013` through `030`.
- RLS is enabled on every table. The standard pattern is `is_studio_member(studio_id)` / `is_studio_manager(studio_id)` SECURITY DEFINER helper functions (pinned `search_path`), referenced from nearly every policy.
- Server-authoritative tables (`subscriptions`, `payments`, `upload_reservations`, `signup_risk_signals`) have no client write policy at all — writes only happen through the service-role client from trusted server code.
- Two migrations exist specifically to close Supabase-advisor-flagged security issues (`025`, `026`) — a real, working pattern for responding to the platform's own security tooling. Keep running/checking Supabase's advisors after schema changes.

## Design system

- Tokens live in `tailwind.config.ts` (colors as indirect HSL CSS variables, a full `clamp()`-based type scale, custom spacing/shadow/animation tokens) and `src/app/globals.css` (the actual `:root`/`.dark` variable values, with in-code rationale comments describing the intended "gallery wall" visual identity).
- `next-themes` handles light/dark via the `class` strategy.
- `src/components/ui/` is a shadcn-style primitive set built on Radix. A parallel hand-rolled `@layer components` button/input utility system also exists in `globals.css` — check which one a given surface actually uses before adding a third pattern.
- See `docs/DESIGN-SYSTEM.md` for the full token reference.

## Deployment

- Vercel, Next.js `output: 'standalone'`, install/build driven by `vercel.json` using npm (not the `pnpm` the `package.json` `packageManager` field used to claim — see `docs/DECISIONS.md`).
- `next.config.mjs` allowlists a fixed set of image remote patterns (Supabase avatars, R2, Unsplash, Google avatars), sets baseline security headers site-wide, and proxies `/ingest/*` to PostHog's ingestion domain (currently unused — no client-side PostHog SDK call exists anywhere).
- CI: a minimal GitHub Actions workflow now runs lint, typecheck, unit tests, and a production build on every push/PR (`.github/workflows/ci.yml`) — this did not exist before this stabilization pass.

## Known architectural gaps (not fixed in this pass — see `docs/ROADMAP.md` and the stabilization report)

- No Content-Security-Policy on authenticated routes (only applied when there's no session).
- `experimental.serverActions.allowedOrigins` lists only `localhost:3000` — verified **not** currently a production bug (Next.js auto-trusts the deployment's own Host/X-Forwarded-Host as same-origin; `allowedOrigins` is only for *additional* origins such as a reverse proxy), but worth revisiting if LensFlow ever sits behind a proxy or serves Server Actions from a different host than the page.
- A meaningful share of the public marketing site is stub content (`MarketingComingSoon`).
