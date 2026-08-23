-- Phase 3 P1: payments table SELECT was membership-only (is_studio_member),
-- not role-aware, unlike every table migration 032 already hardened for
-- INSERT/UPDATE/DELETE. ROLE_PERMISSIONS (src/lib/auth/permissions.ts)
-- grants `payments:read` to studio_owner/super_admin only — no other role
-- (photographer, team_member, editor) has it. Confirmed live before this
-- fix: a team_member/editor/photographer could SELECT the full payments
-- ledger (amounts, M-Pesa phone numbers) via their own JWT directly
-- against PostgREST, bypassing the app's Server Actions entirely (which
-- have separately been hardened in this same change — see getPayments/
-- getSubscriptionPaymentHistory/getStudioPayoutSummary).
--
-- has_studio_permission() (032) doesn't need a new CASE branch for
-- 'payments:read': studio_owner already short-circuits to true before the
-- CASE is evaluated, and every other role correctly falls through to the
-- ELSE (no access) for any permission string not explicitly listed —
-- exactly the "owner only" behavior payments:read requires.
--
-- NOT DEPLOYED — prepared per this task's explicit instruction to leave
-- Phase 3 migrations undeployed until separately authorized. The live
-- BEFORE-state vulnerability this closes is proven in
-- tests/integration/security-hardening-phase3-select.test.ts.

DROP POLICY IF EXISTS "Members can view studio payments" ON payments;

CREATE POLICY "Members can view studio payments" ON payments FOR SELECT
  TO authenticated
  USING (has_studio_permission(studio_id, 'payments:read'));
