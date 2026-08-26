-- Phase 10: remediates four confirmed authorization gaps from Phase 9
-- reconnaissance, all of the same shape Phase 8 already fixed on
-- website_pages: an RLS policy authorized an operation via
-- is_studio_member(studio_id) alone (any active studio member, any role)
-- where the application's intended permission model requires something
-- narrower. Every change below is additive/narrowing only -- nothing made
-- more permissive than it already was.
--
-- ============================================================
-- TARGET 1 -- galleries INSERT/UPDATE/DELETE
-- ============================================================
--
-- Old: a single FOR ALL policy ("Members can manage studio galleries")
-- authorized INSERT/UPDATE/DELETE via is_studio_member(studio_id) alone --
-- any active member, regardless of role, could create a gallery
-- (bypassing the app's quota/entitlement checks), update any field on any
-- gallery, or hard-delete any gallery (cascading to gallery_share_settings,
-- gallery_albums, and media -- confirmed via pg_constraint during Phase 9
-- recon), all via direct PostgREST, bypassing the app's own
-- checkGalleryPermission() gate in src/lib/actions/galleries.ts entirely.
--
-- New: split into three permission-gated policies, matching the
-- permission set already enforced by checkGalleryPermission() (the
-- function that actually gates createGallery/updateGallery/deleteGallery
-- today) and cross-checked against ROLE_PERMISSIONS
-- (src/lib/auth/permissions.ts):
--   galleries:create -> photographer only (owner short-circuits already)
--   galleries:update -> photographer, team_member
--   galleries:delete -> nobody but owner (checkGalleryPermission and
--     ROLE_PERMISSIONS both agree: only studio_owner/super_admin hold
--     galleries:delete)
--
-- NOTE on galleries:update and 'editor': ROLE_PERMISSIONS
-- (src/lib/auth/permissions.ts) grants editor 'galleries:update', but
-- checkGalleryPermission()'s own inline role map -- the function that
-- actually gates updateGallery() in production today -- does NOT grant
-- editor 'galleries.edit'. This is a pre-existing, already-flagged (Phase
-- 9) discrepancy between the app's two internal galleries-permission
-- sources, explicitly OUT OF SCOPE to resolve in this phase. Per this
-- phase's explicit security principle ("the database authorization
-- boundary must not be broader than the application's intended
-- authorization boundary"), this migration aligns the DB with
-- checkGalleryPermission()'s actual currently-enforced behavior (the
-- narrower of the two, and the one that actually runs) rather than
-- ROLE_PERMISSIONS' broader claim -- granting editor DB-level
-- galleries:update here would make the DB *more* permissive than the
-- application already is, which is the opposite of this phase's goal.
--
-- SELECT is untouched: "Members can view studio galleries" already exists
-- as its own is_studio_member-gated policy, independent of the FOR ALL
-- policy being replaced, and every role that is an active member already
-- holds galleries:read in both ROLE_PERMISSIONS and checkGalleryPermission
-- -- there is no live discrepancy on SELECT, and SELECT was not named in
-- this phase's authorized scope.

DROP POLICY IF EXISTS "Members can manage studio galleries" ON galleries;

CREATE POLICY "Members can create studio galleries" ON galleries FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'galleries:create'));

CREATE POLICY "Members can update studio galleries" ON galleries FOR UPDATE
  USING (is_studio_member(studio_id))
  WITH CHECK (has_studio_permission(studio_id, 'galleries:update'));

CREATE POLICY "Members can delete studio galleries" ON galleries FOR DELETE
  USING (has_studio_permission(studio_id, 'galleries:delete'));

-- has_studio_permission() needs galleries:create/update/delete branches to
-- represent the policies above -- these permissions were never cased in
-- this function at all (fell through to the ELSE/owner-only branch),
-- which happened to accidentally produce the *correct* denial for every
-- non-owner role today only because the galleries table's write policies
-- never called this function in the first place. Every existing branch is
-- reproduced byte-for-byte from migration 043 (the function's current
-- live definition); only the three new branches below are added.
CREATE OR REPLACE FUNCTION public.has_studio_permission(p_studio_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM studio_members
  WHERE studio_id = p_studio_id
    AND user_id = auth.uid()
    AND status = 'active';

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role = 'studio_owner' THEN
    RETURN true;
  END IF;

  RETURN v_role = ANY(
    CASE p_permission
      WHEN 'clients:create' THEN ARRAY['photographer']
      WHEN 'clients:update' THEN ARRAY['photographer', 'team_member']
      WHEN 'clients:delete' THEN ARRAY[]::text[]
      WHEN 'contracts:create' THEN ARRAY['photographer']
      WHEN 'contracts:update' THEN ARRAY['photographer']
      WHEN 'contracts:delete' THEN ARRAY[]::text[]
      WHEN 'bookings:create' THEN ARRAY['photographer']
      WHEN 'bookings:update' THEN ARRAY['photographer', 'team_member']
      WHEN 'bookings:delete' THEN ARRAY[]::text[]
      WHEN 'projects:create' THEN ARRAY['photographer']
      WHEN 'projects:update' THEN ARRAY['photographer', 'team_member']
      WHEN 'projects:delete' THEN ARRAY[]::text[]
      WHEN 'website:create' THEN ARRAY[]::text[]
      WHEN 'website:update' THEN ARRAY[]::text[]
      WHEN 'website:delete' THEN ARRAY[]::text[]
      WHEN 'questionnaires:create' THEN ARRAY['photographer']
      WHEN 'questionnaires:update' THEN ARRAY['photographer']
      WHEN 'questionnaires:delete' THEN ARRAY[]::text[]
      WHEN 'tasks:create' THEN ARRAY['photographer']
      WHEN 'tasks:update' THEN ARRAY['photographer', 'team_member']
      WHEN 'tasks:delete' THEN ARRAY['photographer']
      WHEN 'expenses:create' THEN ARRAY['photographer']
      WHEN 'expenses:update' THEN ARRAY['photographer']
      WHEN 'expenses:delete' THEN ARRAY['photographer']
      WHEN 'quotes:create' THEN ARRAY['photographer']
      WHEN 'quotes:update' THEN ARRAY['photographer']
      WHEN 'quotes:delete' THEN ARRAY[]::text[]
      WHEN 'invoices:create' THEN ARRAY['photographer']
      WHEN 'invoices:update' THEN ARRAY['photographer']
      WHEN 'invoices:delete' THEN ARRAY[]::text[]
      WHEN 'invoices:manage_payments' THEN ARRAY[]::text[]
      WHEN 'store:manage_products' THEN ARRAY['photographer']
      WHEN 'store:manage_orders' THEN ARRAY['photographer']
      WHEN 'clients:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'contracts:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'bookings:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'projects:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'quotes:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'invoices:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'tasks:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'expenses:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'questionnaires:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'questionnaires:send' THEN ARRAY['photographer']
      WHEN 'store:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'website:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'team:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'payouts:read' THEN ARRAY[]::text[]
      WHEN 'subscriptions:read' THEN ARRAY[]::text[]
      WHEN 'payments:create' THEN ARRAY['photographer']
      WHEN 'payments:read' THEN ARRAY['photographer']
      -- New: Phase 10 Target 1 (added by this migration)
      WHEN 'galleries:create' THEN ARRAY['photographer']
      WHEN 'galleries:update' THEN ARRAY['photographer', 'team_member']
      WHEN 'galleries:delete' THEN ARRAY[]::text[]
      ELSE ARRAY[]::text[]
    END
  );
END;
$function$;

-- ============================================================
-- TARGET 2 -- invoice_items DELETE
-- ============================================================
--
-- Old: FOR ALL policy authorized DELETE via is_studio_member(i.studio_id)
-- alone (Postgres never evaluates WITH CHECK for DELETE) -- any active
-- studio member could delete an invoice's line items directly via
-- PostgREST, regardless of role, silently corrupting the invoice's
-- subtotal/total (which are computed and stored server-side by
-- createInvoice/updateInvoice from the item set at write time).
--
-- New: DELETE requires invoices:update -- the exact same permission this
-- table's own INSERT/UPDATE (WITH CHECK) already require, and the same
-- permission the parent invoices table's own UPDATE policy requires. This
-- is the smallest change that closes the gap: it does not invent a new
-- permission, and it makes every mutating operation on invoice_items
-- (INSERT via WITH CHECK, UPDATE via WITH CHECK, DELETE via this new
-- USING clause) consistently gated on the one permission that already
-- governs "can this caller change this invoice's contents."
DROP POLICY IF EXISTS "Members can manage invoice items" ON invoice_items;

CREATE POLICY "Members can view invoice items" ON invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND has_studio_permission(i.studio_id, 'invoices:read')
    )
  );

CREATE POLICY "Members can create invoice items" ON invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND has_studio_permission(i.studio_id, 'invoices:update')
    )
  );

CREATE POLICY "Members can update invoice items" ON invoice_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND is_studio_member(i.studio_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND has_studio_permission(i.studio_id, 'invoices:update')
    )
  );

CREATE POLICY "Members can delete invoice items" ON invoice_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND has_studio_permission(i.studio_id, 'invoices:update')
    )
  );

-- ============================================================
-- TARGET 3 -- order_items DELETE
-- ============================================================
--
-- Identical shape and rationale to Target 2: the FOR ALL policy's DELETE
-- was authorized by is_studio_member(o.studio_id) alone. Decomposed the
-- same way, with DELETE (and the pre-existing INSERT/UPDATE WITH CHECK)
-- consistently gated on store:manage_orders -- the permission this
-- table's own WITH CHECK already used, and the same permission the
-- parent orders table's own UPDATE/DELETE policies require.
DROP POLICY IF EXISTS "Members can manage order items" ON order_items;

CREATE POLICY "Members can view order items" ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND has_studio_permission(o.studio_id, 'store:read')
    )
  );

CREATE POLICY "Members can create order items" ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND has_studio_permission(o.studio_id, 'store:manage_orders')
    )
  );

CREATE POLICY "Members can update order items" ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND is_studio_member(o.studio_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND has_studio_permission(o.studio_id, 'store:manage_orders')
    )
  );

CREATE POLICY "Members can delete order items" ON order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND has_studio_permission(o.studio_id, 'store:manage_orders')
    )
  );

-- ============================================================
-- TARGET 4 -- questionnaire_responses SELECT
-- ============================================================
--
-- Old: "Members can view studio questionnaire responses" authorized
-- SELECT via is_studio_member(studio_id) alone -- any active member,
-- including editor (who holds no questionnaires:read in either
-- ROLE_PERMISSIONS or has_studio_permission()), could read
-- questionnaire_responses.answers (client-submitted, potentially
-- sensitive content) directly via PostgREST.
--
-- New: SELECT requires questionnaires:read, matching ROLE_PERMISSIONS
-- exactly (photographer, team_member; editor and client excluded) and
-- already cased in has_studio_permission() (migration 038) -- no function
-- change needed for this target. INSERT/UPDATE (migration 041) are
-- untouched; they already require questionnaires:send/:update
-- respectively.
DROP POLICY IF EXISTS "Members can view studio questionnaire responses" ON questionnaire_responses;

CREATE POLICY "Members can view studio questionnaire responses" ON questionnaire_responses FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'questionnaires:read'));
