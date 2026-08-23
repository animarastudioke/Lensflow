-- Phase 2 security hardening: database-level role/permission enforcement.
--
-- Phase 1 (migration 031) closed tenant-isolation and secret-exposure gaps.
-- It left one gap open, explicitly documented at the time: every tenant-
-- owned business table's RLS only checks is_studio_member(studio_id) —
-- tenant isolation, not role. The application's ROLE_PERMISSIONS matrix
-- (src/lib/auth/permissions.ts) is enforced by requireStudioPermission()
-- only in the four files Phase 1 touched (invoices/quotes/orders/products
-- status-change/delete paths). Everywhere else, and even for those four
-- tables via any *other* mutation, a same-studio team_member/editor with
-- their own valid Supabase session could bypass the Next.js app entirely
-- and PATCH/DELETE these tables directly via PostgREST.
--
-- This migration adds that missing layer: a has_studio_permission() helper
-- mirroring the subset of ROLE_PERMISSIONS actually needed to gate writes
-- on these tables, and replaces each table's single "Members can manage"
-- FOR ALL policy with permission-scoped INSERT/UPDATE/DELETE policies.
--
-- Deliberately NOT touched: SELECT policies. Every role that can currently
-- read these tables continues to be able to read them — narrowing SELECT
-- as well would risk breaking cross-role aggregation reads (e.g.
-- getAnalyticsOverview, getDashboardStats) that were never in scope here.
-- The permission matrix does show some roles (mostly `editor`) with zero
-- :read permission on some of these resources; that over-read gap is
-- tracked separately, out of scope for this migration, and documented in
-- the Phase 2 report rather than fixed here.
--
-- Also deliberately NOT touched: is_studio_member / is_studio_manager
-- (preserved, unchanged) and migration 031 (never edited).

-- =============================================================================
-- has_studio_permission(): the caller's studio_members.role for p_studio_id,
-- checked against a fixed subset of ROLE_PERMISSIONS. Mirrors
-- src/lib/auth/permissions.ts's ROLE_PERMISSIONS exactly for the permission
-- strings referenced below — if that matrix changes for any of these
-- permissions, this function must be updated to match.
--
-- studio_owner (and, transitively, anyone whose row has that role) is
-- always true: in this app studio_owner and super_admin both hold every
-- permission this function is ever asked about, and super_admin never has
-- a studio_members row (platform-admin actions go through service-role
-- code gated on profiles.role, never through this function).
-- =============================================================================
CREATE OR REPLACE FUNCTION has_studio_permission(p_studio_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      ELSE ARRAY[]::text[]
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION has_studio_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_studio_permission(uuid, text) TO authenticated;

-- =============================================================================
-- CLIENTS
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio clients" ON clients;
CREATE POLICY "Members can create studio clients" ON clients FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'clients:create'));
CREATE POLICY "Members can update studio clients" ON clients FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'clients:update'));
CREATE POLICY "Members can delete studio clients" ON clients FOR DELETE
  USING (has_studio_permission(studio_id, 'clients:delete'));

-- =============================================================================
-- CONTRACTS (+ contract_signers)
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio contracts" ON contracts;
CREATE POLICY "Members can create studio contracts" ON contracts FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'contracts:create'));
CREATE POLICY "Members can update studio contracts" ON contracts FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'contracts:update'));
CREATE POLICY "Members can delete studio contracts" ON contracts FOR DELETE
  USING (has_studio_permission(studio_id, 'contracts:delete'));

DROP POLICY IF EXISTS "Members can manage contract signers" ON contract_signers;
CREATE POLICY "Members can manage contract signers" ON contract_signers FOR ALL
  USING (EXISTS (SELECT 1 FROM contracts c WHERE c.id = contract_signers.contract_id AND is_studio_member(c.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM contracts c WHERE c.id = contract_signers.contract_id AND has_studio_permission(c.studio_id, 'contracts:update')));

-- =============================================================================
-- BOOKINGS
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio bookings" ON bookings;
CREATE POLICY "Members can create studio bookings" ON bookings FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'bookings:create'));
CREATE POLICY "Members can update studio bookings" ON bookings FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'bookings:update'));
CREATE POLICY "Members can delete studio bookings" ON bookings FOR DELETE
  USING (has_studio_permission(studio_id, 'bookings:delete'));

-- =============================================================================
-- PROJECTS
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio projects" ON projects;
CREATE POLICY "Members can create studio projects" ON projects FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'projects:create'));
CREATE POLICY "Members can update studio projects" ON projects FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'projects:update'));
CREATE POLICY "Members can delete studio projects" ON projects FOR DELETE
  USING (has_studio_permission(studio_id, 'projects:delete'));

-- =============================================================================
-- WEBSITES (+ website_pages)
-- =============================================================================
-- website:publish/:manage_pages are not distinguished from website:update
-- here because, in the current matrix, no role holds either without also
-- holding website:update (both are studio_owner-only, same as :update).
DROP POLICY IF EXISTS "Members can manage studio websites" ON websites;
CREATE POLICY "Members can create studio websites" ON websites FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'website:create'));
CREATE POLICY "Members can update studio websites" ON websites FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'website:update'));
CREATE POLICY "Members can delete studio websites" ON websites FOR DELETE
  USING (has_studio_permission(studio_id, 'website:delete'));

DROP POLICY IF EXISTS "Members can manage website pages" ON website_pages;
CREATE POLICY "Members can manage website pages" ON website_pages FOR ALL
  USING (EXISTS (SELECT 1 FROM websites w WHERE w.id = website_pages.website_id AND is_studio_member(w.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM websites w WHERE w.id = website_pages.website_id AND has_studio_permission(w.studio_id, 'website:update')));

-- =============================================================================
-- QUESTIONNAIRE TEMPLATES
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio questionnaire templates" ON questionnaire_templates;
CREATE POLICY "Members can create studio questionnaire templates" ON questionnaire_templates FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'questionnaires:create'));
CREATE POLICY "Members can update studio questionnaire templates" ON questionnaire_templates FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'questionnaires:update'));
CREATE POLICY "Members can delete studio questionnaire templates" ON questionnaire_templates FOR DELETE
  USING (has_studio_permission(studio_id, 'questionnaires:delete'));

-- =============================================================================
-- TASKS
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio tasks" ON tasks;
CREATE POLICY "Members can create studio tasks" ON tasks FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'tasks:create'));
CREATE POLICY "Members can update studio tasks" ON tasks FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'tasks:update'));
CREATE POLICY "Members can delete studio tasks" ON tasks FOR DELETE
  USING (has_studio_permission(studio_id, 'tasks:delete'));

-- =============================================================================
-- EXPENSES
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio expenses" ON expenses;
CREATE POLICY "Members can create studio expenses" ON expenses FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'expenses:create'));
CREATE POLICY "Members can update studio expenses" ON expenses FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'expenses:update'));
CREATE POLICY "Members can delete studio expenses" ON expenses FOR DELETE
  USING (has_studio_permission(studio_id, 'expenses:delete'));

-- =============================================================================
-- QUOTES (+ quote_items)
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio quotes" ON quotes;
CREATE POLICY "Members can create studio quotes" ON quotes FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'quotes:create'));
CREATE POLICY "Members can update studio quotes" ON quotes FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'quotes:update'));
CREATE POLICY "Members can delete studio quotes" ON quotes FOR DELETE
  USING (has_studio_permission(studio_id, 'quotes:delete'));

DROP POLICY IF EXISTS "Members can manage quote items" ON quote_items;
CREATE POLICY "Members can manage quote items" ON quote_items FOR ALL
  USING (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND is_studio_member(q.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND has_studio_permission(q.studio_id, 'quotes:update')));

-- =============================================================================
-- INVOICES (+ invoice_items)
-- =============================================================================
-- Marking an invoice 'paid' requires invoices:manage_payments specifically
-- (mirrors the invoices:update vs invoices:manage_payments split already
-- enforced in src/lib/actions/invoices.ts's updateInvoiceStatus) — a
-- photographer can update other fields but cannot flip status to 'paid'
-- outside a verified M-Pesa payment (which writes via supabaseAdmin,
-- bypassing RLS entirely, so this restriction never blocks real payments).
DROP POLICY IF EXISTS "Members can manage studio invoices" ON invoices;
CREATE POLICY "Members can create studio invoices" ON invoices FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'invoices:create'));
CREATE POLICY "Members can update studio invoices" ON invoices FOR UPDATE
  USING (is_studio_member(studio_id))
  WITH CHECK (
    has_studio_permission(studio_id, 'invoices:update')
    AND (status IS DISTINCT FROM 'paid' OR has_studio_permission(studio_id, 'invoices:manage_payments'))
  );
CREATE POLICY "Members can delete studio invoices" ON invoices FOR DELETE
  USING (has_studio_permission(studio_id, 'invoices:delete'));

DROP POLICY IF EXISTS "Members can manage invoice items" ON invoice_items;
CREATE POLICY "Members can manage invoice items" ON invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND is_studio_member(i.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND has_studio_permission(i.studio_id, 'invoices:update')));

-- =============================================================================
-- PRODUCTS
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio products" ON products;
CREATE POLICY "Members can create studio products" ON products FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'store:manage_products'));
CREATE POLICY "Members can update studio products" ON products FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'store:manage_products'));
CREATE POLICY "Members can delete studio products" ON products FOR DELETE
  USING (has_studio_permission(studio_id, 'store:manage_products'));

-- =============================================================================
-- ORDERS (+ order_items)
-- =============================================================================
DROP POLICY IF EXISTS "Members can manage studio orders" ON orders;
CREATE POLICY "Members can create studio orders" ON orders FOR INSERT
  WITH CHECK (has_studio_permission(studio_id, 'store:manage_orders'));
CREATE POLICY "Members can update studio orders" ON orders FOR UPDATE
  USING (is_studio_member(studio_id)) WITH CHECK (has_studio_permission(studio_id, 'store:manage_orders'));
CREATE POLICY "Members can delete studio orders" ON orders FOR DELETE
  USING (has_studio_permission(studio_id, 'store:manage_orders'));

DROP POLICY IF EXISTS "Members can manage order items" ON order_items;
CREATE POLICY "Members can manage order items" ON order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND is_studio_member(o.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND has_studio_permission(o.studio_id, 'store:manage_orders')));
