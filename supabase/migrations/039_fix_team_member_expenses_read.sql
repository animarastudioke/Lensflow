-- Phase 5 P1: narrowest possible correction of a live correctness bug
-- found during the post-Phase-4 security hygiene review.
--
-- ROLE_PERMISSIONS (src/lib/auth/permissions.ts) has granted team_member
-- 'expenses:read' since 2026-08-15 (commit 375fb3a0), well before any
-- Phase 3/4 work -- but migration 038's has_studio_permission() CASE
-- mapping incorrectly cased 'expenses:read' as ARRAY['photographer']
-- only, omitting team_member. This silently denies team_member's
-- legitimate, pre-existing expenses:read grant -- a wrongful-denial
-- bug (not an over-exposure), live-confirmed via a real disposable-user
-- PostgREST call before this migration was written.
--
-- This migration changes ONE line relative to migration 038: the
-- 'expenses:read' branch. Every other branch (every :create/:update
-- /:delete permission, every other :read permission) is reproduced
-- byte-for-byte, unchanged. SECURITY DEFINER, STABLE, and the pinned
-- search_path are all preserved exactly.
--
-- UPDATE (still pre-deployment, folded into this same migration rather
-- than fragmented across another): migration 041
-- (041_questionnaire_responses_write_policies.sql) introduces the
-- FIRST-EVER RLS policy referencing 'questionnaires:send' -- previously
-- only checked at the app layer (requireStudioPermission), never by any
-- RLS policy. The new has-studio-permission-case-coverage.test.ts
-- regression guard (tests/unit/) correctly caught this as an uncased
-- permission before anything shipped -- exactly the failure mode it was
-- built to prevent. Added below: WHEN 'questionnaires:send' THEN
-- ARRAY['photographer'], matching ROLE_PERMISSIONS exactly
-- (super_admin/studio_owner/photographer hold questionnaires:send;
-- team_member/editor do not).

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
      -- Fixed by this migration: was ARRAY['photographer'], now matches
      -- ROLE_PERMISSIONS' actual (and long-standing) grant to team_member.
      WHEN 'expenses:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'questionnaires:read' THEN ARRAY['photographer', 'team_member']
      WHEN 'questionnaires:send' THEN ARRAY['photographer']
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
