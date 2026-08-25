-- Phase 4 prerequisite fix: has_studio_permission()'s CASE statement
-- (migration 032) only ever enumerated WRITE permissions (:create/
-- :update/:delete). Migration 037 (deployed then emergency-rolled-back
-- on 2026-08-24 -- see the warning banner in
-- 037_phase4_select_role_enforcement.sql) needed the function to also
-- correctly evaluate 14 :read permissions; every one of them fell
-- through to the function's ELSE ARRAY[]::text[] branch (owner-only),
-- incorrectly denying team_member/photographer legitimate read access.
--
-- This migration ONLY adds new WHEN branches for the 14 :read
-- permissions Phase 4 needs. Every existing WHEN branch is reproduced
-- byte-for-byte, unchanged -- this is additive, not a redesign, and
-- does not alter any existing write-authorization outcome. SECURITY
-- DEFINER, STABLE, and the pinned search_path are all preserved exactly
-- as before.
--
-- New branches are copied directly from ROLE_PERMISSIONS
-- (src/lib/auth/permissions.ts), non-owner roles only (studio_owner
-- already short-circuits to TRUE above this CASE; super_admin is never
-- listed in any existing branch either -- consistent with this
-- function's existing design, where super_admin's access is handled by
-- a separate ad-hoc check (requireSuperAdmin() against profiles.role),
-- not through studio_members-scoped RLS):
--
--   clients:read        -> photographer, team_member (editor: no)
--   contracts:read       -> photographer, team_member (editor: no)
--   bookings:read         -> photographer, team_member (editor: no)
--   projects:read         -> photographer, team_member (editor: no)
--   quotes:read           -> photographer, team_member (editor: no)
--   invoices:read         -> photographer, team_member (editor: no)
--   tasks:read            -> photographer, team_member (editor: no)
--   expenses:read         -> photographer only (team_member, editor: no)
--   questionnaires:read   -> photographer, team_member (editor: no)
--   store:read            -> photographer, team_member (editor: no)
--   website:read          -> photographer, team_member (editor: no)
--   team:read             -> photographer, team_member (editor: no)
--   payouts:read          -> nobody but owner (explicit branch added for
--                            documentation; functionally identical to
--                            the existing ELSE, since ROLE_PERMISSIONS
--                            grants this to studio_owner/super_admin only)
--   subscriptions:read    -> same as payouts:read
--
-- This cross-checks exactly against ROLE_PERMISSIONS as read in full
-- this session -- not inferred from UI behavior, not derived from what
-- any application query currently happens to need.

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
      -- New: Phase 4 :read permissions (added by this migration)
      WHEN 'clients:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'contracts:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'bookings:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'projects:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'quotes:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'invoices:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'tasks:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'expenses:read' THEN ARRAY['photographer']
      WHEN 'questionnaires:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'store:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'website:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'team:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'payouts:read' THEN ARRAY[]::text[]
      WHEN 'subscriptions:read' THEN ARRAY[]::text[]
      ELSE ARRAY[]::text[]
    END
  );
END;
$function$;
