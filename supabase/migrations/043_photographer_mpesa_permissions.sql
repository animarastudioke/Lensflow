-- Phase 8 Target 2: grant photographer payments:create and payments:read,
-- per Phase 7's evidence-gathering and the explicit product decision that
-- followed it (Option B) -- photographer should be able to initiate an
-- M-Pesa collection attempt from the dashboard (initiateMpesaInvoicePayment)
-- and poll/read the resulting payment status (pollMpesaPaymentStatus), the
-- same two actions already gated on payments:create/payments:read at the
-- app layer today.
--
-- CRITICAL (per Phase 7 finding, reproduced here): ROLE_PERMISSIONS
-- (src/lib/auth/permissions.ts, the TypeScript taxonomy used by
-- requireStudioPermission) and has_studio_permission() (this function, the
-- DB/RLS taxonomy used by the `payments` table's SELECT policy) are two
-- separately-maintained authorization tables. Updating ROLE_PERMISSIONS
-- alone would let a photographer pass the app-layer gate in
-- mpesa-payments.ts but their `payments` SELECT RLS would still deny them
-- (payments:create/payments:read have never had a WHEN branch in this
-- function -- both silently fell through to the ELSE ARRAY[]::text[]
-- branch, i.e. owner-only, same practical result as an explicit
-- ARRAY[]::text[] branch would have produced). This migration is the DB
-- half of that same product decision, applied narrowly.
--
-- This migration ONLY adds two new WHEN branches:
--   WHEN 'payments:create' THEN ARRAY['photographer']
--   WHEN 'payments:read'   THEN ARRAY['photographer']
-- Every existing WHEN branch (from migration 039, the last migration to
-- touch this function) is reproduced byte-for-byte, unchanged -- this is
-- additive, not a redesign. studio_owner's behavior is unchanged (it
-- already short-circuits to TRUE above the CASE, for every permission,
-- including these two). super_admin's access continues to be handled
-- outside this function entirely (see migration 038's comment) --
-- unaffected by this migration. No other permission, including
-- payments:refund and payments:manage_providers (which remain
-- unrepresented in this CASE and therefore owner/super_admin-only via the
-- ELSE branch, exactly as before), is touched.
-- SECURITY DEFINER, STABLE, and the pinned search_path are all preserved
-- exactly as before.

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
      -- New: Phase 8 Target 2 (added by this migration)
      WHEN 'payments:create' THEN ARRAY['photographer']
      WHEN 'payments:read' THEN ARRAY['photographer']
      ELSE ARRAY[]::text[]
    END
  );
END;
$function$;
