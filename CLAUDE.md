# CLAUDE.md — LensFlow Operating Rules

This file governs how Claude (or any agent) works in this repository. It reflects what the codebase actually is today — see `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, and `docs/DESIGN-SYSTEM.md` for the full detail behind each rule below.

## Product purpose

LensFlow is a SaaS platform for photography/videography studios: client galleries with proofing and download, booking, CRM, contracts, quotes, invoicing, a digital-product store, and a lightweight website builder — one dashboard per studio, with token-gated public pages for that studio's clients. Initial market is Kenya/East Africa (reflected in the M-Pesa-first payment integration and KES-denominated pricing logic).

## Current technology stack

- **Framework:** Next.js (App Router) on React 19, deployed to Vercel, `output: 'standalone'`.
- **Language:** TypeScript, strict mode plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`.
- **Database/Auth:** Supabase — Postgres with RLS, `@supabase/ssr` for cookie-based auth sessions.
- **Storage:** Cloudflare R2 (S3-compatible), via `@aws-sdk/client-s3` — **not** Supabase Storage.
- **Payments:** M-Pesa (Safaricom Daraja STK Push) only. Stripe/Flutterwave/PayPal are unimplemented placeholders — do not assume they work.
- **UI:** Tailwind CSS + Radix UI primitives (shadcn-style, `src/components/ui/`), `framer-motion`.
- **Package manager:** npm. (`package.json` previously claimed `pnpm`; this was stale and has been corrected — only `package-lock.json` is committed, and `vercel.json` drives `npm install`/`npm run build`.)
- **Testing:** Vitest (unit + a separate integration config), Playwright (e2e), Testing Library.

## Architecture principles

1. **Server Actions are the default data layer.** Reads that need auth context and essentially all writes go through `'use server'` modules in `src/lib/actions/`. Reach for a `route.ts` handler only when the caller isn't a page in this app — a webhook, a streamed file download, a generated PDF, or a plain fetchable URL.
2. **`src/lib/entitlements/service.ts` is the single source of truth for plan/subscription state.** Never query `plans` or `subscriptions` directly elsewhere to decide what a studio is entitled to — call into this module.
3. **RLS + shared SECURITY DEFINER helpers, not per-table hand-rolled policies.** New studio-scoped tables should reuse `is_studio_member(studio_id)` / `is_studio_manager(studio_id)` in their RLS policies.
4. **The browser talks directly to R2 for file bytes** (presigned URLs) — the Next.js server never proxies upload/download payloads for large media.
5. **Don't introduce a second pattern for something an existing one already does.** Check `src/lib/actions/`, `src/lib/entitlements/`, `src/components/ui/`, and this file's linked docs before adding a new abstraction — see "Inspect before creating" below.

## Coding conventions

- Match the existing file's patterns before introducing a new one — this codebase is consistent about Server Actions returning `{ success: true, ... } | { error: string }` rather than throwing for expected failure cases; keep that shape.
- Server-generated IDs only for storage keys and other trust boundaries (e.g. `mediaId` in R2 keys) — never accept a client-supplied path/key as authoritative.
- Prefer the design tokens in `tailwind.config.ts`/`globals.css`/`docs/DESIGN-SYSTEM.md` over new ad-hoc values. Don't add a third button/typography system alongside `src/components/ui/*` and the (currently unused) `.btn-*`/`.input-field` classes in `globals.css` — pick the one already in active use (`src/components/ui/*`).
- Comments should explain *why*, matching the existing style (see `src/lib/storage/r2.ts`, `src/lib/entitlements/service.ts` for good examples) — not restate what the code does.

## Security rules

- **Never trust client-supplied identifiers as storage/db keys.** Generate IDs server-side.
- **Any embed of `plans` off `subscriptions` must qualify the foreign key explicitly** (`plans!subscriptions_plan_id_fkey(...)` or `plans!subscriptions_pending_plan_id_fkey(...)`) — an unqualified `plan:plans(*)` is ambiguous to PostgREST (two FKs exist) and has previously caused every paid studio to silently resolve to the Free plan. Check for this pattern any time a new FK to a table that already has one is added anywhere in the schema.
- **The R2 S3 client must keep `requestChecksumCalculation: 'WHEN_REQUIRED'`** (`src/lib/storage/r2.ts`) — removing it reintroduces a checksum mismatch that breaks every direct-to-R2 upload with a misleading CORS-looking 403.
- **CSP is currently only applied to unauthenticated routes** (`src/middleware.ts`). This is a known, documented gap (see `docs/ROADMAP.md`) — do not add a CSP to authenticated routes as a drive-by change; it needs a deliberate, staged (report-only-first) rollout as its own task.
- **`experimental.serverActions.allowedOrigins`** currently lists only `localhost:3000`. Verified this does not currently break production (Next.js auto-trusts same-origin Server Action requests via Host/X-Forwarded-Host matching) — but if LensFlow is ever placed behind a reverse proxy or a domain that changes what Host header Next.js sees, this must be updated first.
- Run/check Supabase's security advisors after any schema change — this repo has a real track record of fixing advisor-flagged issues (`025_storage_usage_view_security_invoker.sql`, `026_pin_search_path_on_quota_functions.sql`) and should keep doing so.

## Database / RLS rules

- Every table gets RLS enabled. No exceptions.
- Studio-scoped tables authorize via `is_studio_member(studio_id)` / `is_studio_manager(studio_id)`, not inline re-derivation of membership.
- Server-authoritative tables (`subscriptions`, `payments`, `upload_reservations`, `signup_risk_signals`, and any future table with the same shape) get **no client write policy** — writes only via the service-role client from trusted server code.
- New migrations are numbered sequentially after the current highest (`030` as of this writing) — check `supabase/migrations/` for the current max before creating a new one.
- Don't modify a migration that has already shipped/run against production. A schema change to something already deployed is a new migration, not an edit to the old file.
- Before modeling a new table, check `docs/ARCHITECTURE.md` and the actual `supabase/migrations/` tree for what already exists — this repo has direct history (`supabase/migrations/_archived/README.md`) of schema drift caused by building against an assumed schema instead of the real one.

## Storage rules

- All media/file storage is Cloudflare R2 (`src/lib/storage/r2.ts`), not Supabase Storage. Supabase Storage env vars and a `gallery-media` bucket exist in the repo but are dead — do not build new features against Supabase Storage without an explicit decision to introduce a second storage backend.
- Object keys are server-generated and namespaced `studios/{studioId}/...` — never derive a key from client input.
- Originals never get a public URL. Access is only through short-lived presigned GET URLs or a server-streamed zip.
- Quota is enforced atomically via the `reserve_upload_quota` Postgres RPC + advisory lock — never a read-then-decide check, which is race-prone under concurrent uploads.

## Payment rules

- **M-Pesa is the only implemented payment method.** Do not write code that assumes Stripe/Flutterwave/PayPal work — they have schema/env placeholders and, for Stripe, an installed npm package, but zero calling code.
- All plan/entitlement decisions go through `src/lib/entitlements/service.ts`.
- The shared `payments` ledger table carries nullable FKs for invoice/subscription/order payments with no DB constraint enforcing exactly one is set — respect that contract in any new code that writes to this table (only ever set one).
- Do not add a new payment gateway without treating it as new integration work end-to-end (webhook handling, the `payments` ledger's nullable-FK pattern, entitlements interaction) — none of the placeholder scaffolding is "80% done."

## Testing requirements

- `npm run typecheck` (`tsc --noEmit`) and `npm run lint` (`next lint`) must pass before considering work done.
- `npm run test` (Vitest, `tests/unit/**`) covers `src/lib/payments/mpesa.ts` and `src/lib/entitlements/service.ts` today — add unit tests for new logic in these or similarly critical modules (payments, entitlements, storage key generation) rather than skipping coverage there.
- `npm run build` (production build) should succeed — this is enforced in CI (`.github/workflows/ci.yml`).
- e2e (`npm run test:e2e`, Playwright) and integration (`npm run test:integration`) tests exist but are not currently run in CI — run them manually when touching a flow they cover.

## Deployment rules

- Vercel, driven by `vercel.json` (`npm install` / `npm run build`). Don't reintroduce `--legacy-peer-deps` — it was masking a real (now-fixed) peer conflict from an unused dependency, not a permanent requirement.
- `next.config.mjs` security headers and image remote-pattern allowlist are load-bearing — don't remove an entry without confirming nothing depends on it (check `docs/ARCHITECTURE.md` for what each currently does).
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and a production build on push/PR — keep it green; don't merge past a red CI run.

## Design principles

- Follow `docs/DESIGN-SYSTEM.md` for tokens (color, type scale, spacing, shadows, motion) before inventing new values.
- The intended visual identity is a considered "gallery wall" aesthetic (matte-white/wine-red-accent light mode, "dim viewing room" dark mode) — see the in-code rationale comments in `src/app/globals.css`. Respect this framing for new UI rather than defaulting to generic SaaS styling.
- `src/components/ui/*` (Radix-based) is the actively-used component system. The `.btn-*`/`.input-field` classes in `globals.css` are currently unused — don't build against them without first deciding to actually adopt that system.

## Prohibition against inventing unimplemented integrations

Several integrations are documented (in `README.md`, `.env.example`, or as schema/permission scaffolding) without any real implementation: Stripe, Flutterwave, PayPal, PostHog (proxy configured, SDK never initialized), Africa's Talking SMS/WhatsApp, Sentry, and several `src/lib/constants/index.ts`/`src/lib/auth/permissions.ts` entries (coupons, gift cards, shipping zones, leads, audit logs) that have no backing database tables.

**Do not write code that assumes any of the above is live.** If a task appears to require one of them, treat it as new integration work requiring its own design and explicit go-ahead — not a small addition to something "mostly built." See `docs/ROADMAP.md` for the full current-state inventory of this gap.

## Requirement to inspect existing code before creating new abstractions

Before adding a new server action module, a new component primitive, a new constants file, a new auth/permission pattern, or a new database table:

1. Check `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` for whether an equivalent already exists and why it's built the way it is.
2. Grep the actual codebase (`src/lib/actions/`, `src/components/ui/`, `src/lib/entitlements/`, `supabase/migrations/`) — don't rely on `README.md`, `.env.example`, or constants/permission files alone, since several of those currently describe things that aren't built (see above).
3. If something looks unused or dead, verify with a real search (not an assumption) before either building on it or removing it — this repo has concrete precedent both ways: genuinely dead code that was safe to remove (see `docs/DECISIONS.md`), and audit claims that turned out to be less severe than they first appeared once actually checked (the `serverActions.allowedOrigins` finding).
