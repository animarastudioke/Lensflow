# LensFlow — Architecture & Engineering Decisions

A running log of decisions that shaped the current codebase, why they were made, and — where relevant — what was verified during the August 2026 foundation-stabilization pass. Newest first within each section.

## Foundation stabilization (2026-08-21)

**Context:** a full read-only audit (`docs/CURRENT_STATE_AUDIT.md`) surfaced nine specific claims about the repo's health. Before acting on any of them, each was independently re-verified against the actual code rather than trusted at face value. Two corrections came out of that verification:

- **`server-actions.allowedOrigins: ['localhost:3000']` is not, in fact, a live production bug.** Next.js compares the Server Action request's `Origin` header against `Host`/`X-Forwarded-Host` and auto-trusts same-origin requests; `allowedOrigins` only adds *extra* trusted origins (e.g. a reverse proxy on a different host). Since LensFlow's production domains point directly at the Vercel deployment, Server Actions work today without needing an entry there. The audit's framing of this as broken was too strong — it's a real config gap worth fixing defensively (see Roadmap), not an active incident.
- **`--legacy-peer-deps` is not caused by the legacy Supabase auth-helper/auth-ui packages, as the audit implied.** Empirically testing package removal (`npm install --dry-run`) isolated the actual conflict to `vaul@^0.9.1` — a drawer/dialog library with **zero imports anywhere in `src/`** — whose peer range (`^16.8 || ^17.0 || ^18.0`) rejects React 19. `vaul@1.x` does support React 19, but since the package is entirely unused, removing it outright (rather than upgrading a dependency nobody calls) is the lower-risk fix. Removing it, alongside the equally-unused Supabase auth-helper/auth-ui packages and the unused `stripe` dependency, resolves the peer conflict cleanly and also drops a stray duplicate copy of React 18 that `@supabase/auth-ui-react` was pulling in transitively.

All nine claims from the audit were otherwise confirmed as described. See the stabilization report (delivered alongside this pass) for the full verification trail and the specific cleanup applied.

**Decision:** standardize the package manager on **npm**, matching what's actually in use — `vercel.json` already drives `npm install`/`npm run build`, and only `package-lock.json` exists in the repo (no `pnpm-lock.yaml` was ever committed). The `"packageManager": "pnpm@9.10.0"` field in `package.json` was aspirational/stale, not a description of reality, and has been corrected.

**Decision:** delete the `getAuthUserServer()` null-returning stub in `src/lib/auth/hooks.ts` rather than leave it shadowed by export ordering. It was never actually called (every one of 60+ consumers imports the real implementation via the `src/lib/auth/index.ts` barrel), but a stub with the exact right name sitting next to the real implementation's every consumer was a live footgun — one wrong import path away from silently nulling out auth on any page that hit it.

**Decision:** did **not** touch the CSP-on-authenticated-routes gap, the `README.md` drift, the aspirational constants/permissions ahead of the schema, or the dead `gallery-media` Supabase Storage bucket in this pass. Each requires either a deliberate security design (CSP), a product decision (build vs. prune the aspirational surface), or a new migration (dropping a shipped bucket) — none of which belong in a "safe cleanup" pass. See `docs/ROADMAP.md`.

## Storage: Cloudflare R2, not Supabase Storage

Media (gallery photos/videos, product digital files) is stored in Cloudflare R2 via the S3-compatible AWS SDK, with the browser uploading directly via presigned URLs. Supabase Storage was evaluated/partially provisioned early on (a `gallery-media` bucket + RLS policies still exist in migration `014_gallery_cover_templates.sql`) but the app never actually used it — R2 was the real choice, likely for cost and the ability to serve public preview/thumbnail assets from a CDN-fronted public bucket domain independent of Supabase's own storage pricing/limits.

**Consequence:** `NEXT_PUBLIC_SUPABASE_STORAGE_URL` and `SUPABASE_STORAGE_BUCKET_*` env vars, and the `gallery-media` bucket/policies, are dead — don't build new features against Supabase Storage without first confirming that's actually the intended direction, since it would be a second storage backend alongside R2.

## Payments: M-Pesa first, other gateways deferred

Only Safaricom M-Pesa (via Daraja STK Push) is implemented end-to-end. Stripe, Flutterwave, and PayPal have schema columns (`payments.method` CHECK constraint, `subscriptions.billing_provider`), documented env vars, and — for Stripe — an installed-but-unused npm package, but no calling code exists for any of them. This reflects LensFlow's initial market (Kenya/East Africa, where M-Pesa is dominant) rather than an oversight — but it means the payments surface area is significantly narrower than `.env.example`/`README.md` currently imply.

**Consequence:** don't assume Stripe "mostly works and just needs wiring" — treat adding a second gateway as new integration work from scratch, including deciding how it interacts with the shared `payments` ledger table's nullable-FK-per-kind pattern.

## Server Actions as the primary API surface

The app uses Next.js Server Actions (`'use server'` modules in `src/lib/actions/`) as the default way to read (with auth context) and write data from the dashboard, rather than a conventional REST/GraphQL API. `route.ts` handlers are reserved for cases Server Actions genuinely can't cover: streamed file downloads, PDF generation, and the M-Pesa webhook (which needs a plain fetchable URL Safaricom's servers can POST to).

**Consequence:** when adding a new dashboard feature, default to a Server Action in `src/lib/actions/`. Only reach for a `route.ts` handler when the caller isn't a page in this app (a webhook, a direct download link, a generated PDF response).

## Entitlements as a single choke point

`src/lib/entitlements/service.ts` is explicitly documented (in its own header comment) as the only place allowed to query `plans`/`subscriptions` or branch on plan slug. This exists because plan/subscription logic is easy to get subtly wrong (grace periods, scheduled downgrades, ambiguous foreign-key embeds), and centralizing it means a fix in one place fixes every caller.

**Consequence:** any new code that needs to know "is this studio entitled to X" should call into this module, not write a fresh Supabase query against `subscriptions`/`plans`. The ambiguous-FK-embed bug (see Architecture) happened specifically because a query bypassed this discipline; two of the three currently-correct call sites are inside this module for exactly that reason.

## RLS + SECURITY DEFINER helpers over per-table hand-rolled policies

Every table's RLS policy leans on shared `is_studio_member(studio_id)`/`is_studio_manager(studio_id)` SECURITY DEFINER functions rather than each table re-deriving studio membership inline. This keeps the actual authorization logic in one auditable place and is why the two Supabase-advisor-driven fixes (a SECURITY DEFINER view bypassing RLS, a function with a mutable `search_path`) were each a single small migration rather than a sweep across dozens of policies.

**Consequence:** new tables scoped to a studio should reuse these helper functions in their RLS policies rather than reimplementing the membership check.
