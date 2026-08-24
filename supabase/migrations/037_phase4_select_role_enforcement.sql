-- HISTORY NOTE (resolved -- this migration is now live and correct):
--
-- First deployed 2026-08-24, then immediately emergency-rolled-back the
-- same day after live testing showed has_studio_permission(studio_id,
-- permission)'s CASE statement (migration 032) only enumerated WRITE
-- permissions (plus a coincidental owner-only match for payments:read)
-- -- none of this migration's new :read permission strings were cased,
-- so they all silently fell through to ELSE ARRAY[]::text[] (owner-only),
-- incorrectly denying team_member/photographer their legitimate read
-- access. See migration 038 (038_has_studio_permission_read_permissions
-- .sql), which adds the missing :read branches to that function.
--
-- After 038 was deployed and live-verified in isolation (real-JWT RPC
-- calls proving every role/permission combination this migration needs),
-- this migration's policies were redeployed successfully (recorded in
-- Supabase migration history as
-- "037_phase4_select_role_enforcement_retry", since the original
-- "037_phase4_select_role_enforcement" version string was already
-- consumed by the first attempt) and live-verified with the full
-- Phase 4 attack suite: all UNAUTHORIZED cases denied, all AUTHORIZED
-- cases allowed, tenant isolation intact. See the Phase 4 Security
-- Deployment report for the full incident record and live verification
-- results. This file's SQL is unchanged from the original, reviewed
-- design throughout -- only this comment block was updated.
--
-- Phase 4: role-checked SELECT policies for tables where RLS currently
-- enforces tenant isolation (is_studio_member) but not role, and where
-- ROLE_PERMISSIONS (src/lib/auth/permissions.ts) already defines an
-- unambiguous, 1:1 <resource>:read permission for the gap.
--
-- Scope is deliberately narrower than every table flagged in the Phase 4
-- audit. Included here only: tables with an existing, already-isolated
-- "Members can view studio X" SELECT policy (untangled from any FOR ALL
-- write policy), where every consumer was traced and none depends on a
-- role that would lose access it's supposed to have. Confirmed against
-- the live ROLE_PERMISSIONS matrix: only `editor` loses clients/contracts/
-- bookings/projects/quotes/invoices/tasks/questionnaire_templates/
-- products/orders/websites access (editor holds none of the
-- corresponding :read permissions); `editor` and `team_member` both lose
-- expenses access (team_member also lacks expenses:read); `editor` loses
-- teammate-profile/roster visibility (lacks team:read). studio_owner,
-- photographer, super_admin, and (for expenses) team_member's other
-- reads are unaffected -- confirmed against the permission matrix, not
-- inferred from UI behavior.
--
-- UPDATE (Phase 4 pre-deployment architecture review): payouts and
-- subscriptions are now included below. Both previously had no dedicated
-- <resource>:read permission -- ROLE_PERMISSIONS now defines
-- 'payouts:read' and 'subscriptions:read' (src/lib/auth/permissions.ts),
-- granted ONLY to studio_owner/super_admin, mirroring payments:read's
-- existing role set exactly (photographer, despite holding almost every
-- other :read permission, was already deliberately excluded from
-- payments:read -- payouts/subscriptions follow the same established
-- "money/billing is owner-only" pattern, not a new one). See the Phase 4
-- pre-deployment architecture decision report for the full role-by-role
-- justification.
--
-- Deliberately NOT touched in this migration (see Phase 4 report for
-- rationale):
--   - website_pages: its only SELECT-granting policy is a combined
--     FOR ALL policy whose WITH CHECK already role-gates writes;
--     splitting it out risks an accidental write-policy regression,
--     which is explicitly out of scope for a SELECT-only change.
--
-- This migration is prepared but NOT deployed as of Phase 4. Per this
-- task's explicit instruction, it stays ⚠️ CODE-FIXED / NOT DEPLOYED
-- until separately authorized.

-- clients
DROP POLICY IF EXISTS "Members can view studio clients" ON clients;
CREATE POLICY "Members can view studio clients" ON clients FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'clients:read'));

-- contracts
DROP POLICY IF EXISTS "Members can view studio contracts" ON contracts;
CREATE POLICY "Members can view studio contracts" ON contracts FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'contracts:read'));

-- bookings
DROP POLICY IF EXISTS "Members can view studio bookings" ON bookings;
CREATE POLICY "Members can view studio bookings" ON bookings FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'bookings:read'));

-- projects
DROP POLICY IF EXISTS "Members can view studio projects" ON projects;
CREATE POLICY "Members can view studio projects" ON projects FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'projects:read'));

-- quotes
DROP POLICY IF EXISTS "Members can view studio quotes" ON quotes;
CREATE POLICY "Members can view studio quotes" ON quotes FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'quotes:read'));

-- invoices
DROP POLICY IF EXISTS "Members can view studio invoices" ON invoices;
CREATE POLICY "Members can view studio invoices" ON invoices FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'invoices:read'));

-- tasks
DROP POLICY IF EXISTS "Members can view studio tasks" ON tasks;
CREATE POLICY "Members can view studio tasks" ON tasks FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'tasks:read'));

-- expenses (note: also removes team_member, which lacks expenses:read --
-- confirmed intentional per ROLE_PERMISSIONS, not an oversight)
DROP POLICY IF EXISTS "Members can view studio expenses" ON expenses;
CREATE POLICY "Members can view studio expenses" ON expenses FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'expenses:read'));

-- questionnaire_templates
DROP POLICY IF EXISTS "Members can view studio questionnaire templates" ON questionnaire_templates;
CREATE POLICY "Members can view studio questionnaire templates" ON questionnaire_templates FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'questionnaires:read'));

-- products (public "active products" policy is untouched -- storefront
-- browsing stays anonymous-accessible by design)
DROP POLICY IF EXISTS "Members can view studio products" ON products;
CREATE POLICY "Members can view studio products" ON products FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'store:read'));

-- orders (no dedicated orders:read permission exists; store:read is the
-- same permission that already governs product-catalog visibility and
-- is the closest existing match -- store:manage_orders remains the write
-- gate, unchanged)
DROP POLICY IF EXISTS "Members can view studio orders" ON orders;
CREATE POLICY "Members can view studio orders" ON orders FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'store:read'));

-- websites (public "published websites" policy is untouched)
DROP POLICY IF EXISTS "Members can view studio websites" ON websites;
CREATE POLICY "Members can view studio websites" ON websites FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'website:read'));

-- payouts: previously "Studio members can view their own payouts" --
-- membership-only, no role check, no dedicated permission. Now requires
-- payouts:read (studio_owner/super_admin only -- see permissions.ts).
DROP POLICY IF EXISTS "Studio members can view their own payouts" ON payouts;
CREATE POLICY "Studio owners can view their studio payouts" ON payouts FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'payouts:read'));

-- subscriptions: previously "Members can view their studio subscription"
-- -- membership-only, no role check, no dedicated permission. Now
-- requires subscriptions:read (studio_owner/super_admin only). Does NOT
-- affect entitlement resolution (getEffectivePlan/getStorageUsage/
-- getSubscriptionAccessState in src/lib/entitlements/service.ts), which
-- reads this table exclusively via supabaseAdmin (service role, bypasses
-- RLS entirely) and remains available to every role, as required for
-- quota/feature-gate checks regardless of who is asking.
DROP POLICY IF EXISTS "Members can view their studio subscription" ON subscriptions;
CREATE POLICY "Studio owners can view their studio subscription" ON subscriptions FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'subscriptions:read'));

-- profiles: teammate-visibility only. The self-view policy ("Users can
-- view their own profile") is untouched and stays unconditional -- every
-- role, including editor, must always be able to read their own profile.
DROP POLICY IF EXISTS "Studio members can view teammate profiles" ON profiles;
CREATE POLICY "Studio members can view teammate profiles" ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM studio_members sm1
      JOIN studio_members sm2 ON sm1.studio_id = sm2.studio_id
      WHERE sm1.user_id = (SELECT auth.uid())
        AND sm1.status = 'active'
        AND sm2.user_id = profiles.id
        AND sm2.status = 'active'
        AND has_studio_permission(sm1.studio_id, 'team:read')
    )
  );

-- studio_members: the caller's own membership row stays unconditionally
-- visible (the `user_id = auth.uid()` clause is untouched) -- only
-- visibility of *other* members' rows (roster enumeration, roles) now
-- requires team:read.
DROP POLICY IF EXISTS "Members can view studio membership" ON studio_members;
CREATE POLICY "Members can view studio membership" ON studio_members FOR SELECT
  USING (
    has_studio_permission(studio_id, 'team:read')
    OR user_id = (SELECT auth.uid())
  );
