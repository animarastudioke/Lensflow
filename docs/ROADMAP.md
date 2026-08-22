# LensFlow — Roadmap (Current-State Gaps)

This is **not** a feature brainstorm. It's an inventory of things the codebase already gestures at — via stub pages, placeholder constants, half-wired config, or documentation that overclaims — that need an explicit decision (build it, or remove the surface implying it exists) before new product work builds on top of them. Nothing here is a new idea; everything is already present in some partial form.

## Public site content

12 marketing pages currently render the shared `MarketingComingSoon` placeholder instead of real content:
`/solutions/creative-teams`, `/solutions/portrait-photographers`, `/solutions/studios`, `/solutions/videographers`, `/solutions/wedding-photographers`, `/press`, `/partners`, `/help`, `/careers`, `/community`, `/api-docs`, `/affiliates`.

**Decision needed:** which of these are actually planned near-term (write real content) vs. which should be removed from navigation entirely until they are (a "Coming soon" page linked from the main nav reads as unfinished to a visitor).

## Payment gateways beyond M-Pesa

`stripe` (npm dependency), and Flutterwave/PayPal (env vars + a `payments.method` CHECK constraint value) exist as placeholders with zero calling code. `README.md` currently lists all four as supported, which is not accurate.

**Decision needed:** if a second gateway is actually on the near-term roadmap, scope it as new integration work (it is not "80% done"). If not, remove the unused `stripe` dependency and stop implying Flutterwave/PayPal support in the README and `.env.example` until there's real code.

## PostHog analytics

`next.config.mjs` proxies `/ingest/*` to PostHog's EU ingestion domain, and `.env.example` documents the keys — but no client-side `posthog.init()` call exists anywhere in `src/`. The proxy currently serves no traffic.

**Decision needed:** finish the client-side integration (a few lines in `providers.tsx`), or remove the rewrite + env var documentation so it doesn't look live.

## SMS/WhatsApp (Africa's Talking) and Sentry

Both are documented in `README.md`/`.env.example` with no implementation at all (Africa's Talking appears only as a notification-channel constant; Sentry has no SDK dependency installed). Lower priority than PostHog/payment gateways since there's no partial wiring to finish — these are pure documentation-ahead-of-code.

**Decision needed:** same as above — build or stop documenting as available.

## Aspirational schema/permission surface

`src/lib/constants/index.ts` and `src/lib/auth/permissions.ts` both model features with no backing database tables: coupons, gift cards, shipping zones (`STORE_CONSTANTS`), SMS/WhatsApp/push notification channels, and `leads`/`audit_logs`-scoped permissions. These read as either a planned-but-not-built roadmap or leftovers from an earlier, broader schema draft that was scaled back (see `_archived/README.md` in `supabase/migrations/` for the schema-drift history this likely traces back to).

**Decision needed, feature by feature:** either these are genuinely planned (in which case they belong in a real roadmap with sequencing) or they should be pruned so the permission/constant surface matches what's actually buildable today. Building new code against these constants without checking the schema first is the exact trap that produced the original schema drift.

## Authenticated-route Content-Security-Policy

`src/middleware.ts` only sets a CSP header when there's no session — every logged-in dashboard page currently ships with zero CSP. This is real security hardening work, not cleanup: it requires enumerating every script/style/connect source the authenticated app actually needs (Supabase, R2, Google Analytics/GTM, PostHog once live, web fonts, any third-party embeds) and should be rolled out in report-only mode before enforcing, to catch anything the policy would otherwise silently break.

**Decision needed:** prioritize this as a dedicated security task with a staged rollout plan — don't bolt it onto an unrelated feature PR.

## `serverActions.allowedOrigins`

Currently only `localhost:3000`. Verified **not** a live production bug today (Next.js auto-trusts the deployment's own host for same-origin Server Action calls). Worth adding the production domain(s) explicitly anyway as a defensive measure, and revisiting immediately if LensFlow is ever put behind a reverse proxy or CDN layer that changes what Host header Next.js actually sees.

## Route duplication: `q/[token]` vs `quote/[token]`

Two routes serve what appears to be the same "public quote viewer" purpose. Needs an audit of which one (if either) has actually been shared with real clients before consolidating — removing the wrong one breaks an already-shared link.

## Homepage

Out of scope for this stabilization pass entirely. The full product-design critique and a recommended structure already exist in `docs/CURRENT_STATE_AUDIT.md` (Part 2) — start there when homepage work is actually scheduled. **Do not use this document to justify starting that work now.**
