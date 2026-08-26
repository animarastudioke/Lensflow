-- Phase 8 Target 1: close the website_pages DELETE authorization gap
-- identified live in Phase 7 reconnaissance.
--
-- Migration 040 preserved DELETE's pre-existing condition
-- (is_studio_member(w.studio_id)) unchanged, deliberately, per that
-- migration's own explicit scope ("current write behavior must NOT
-- change"). Phase 7 then live-tested the DB boundary directly (real
-- JWTs, disposable studio/website/pages, bypassing the deleteWebsitePage
-- Server Action entirely) and confirmed: because is_studio_member alone
-- says nothing about role, and the app-layer Server Action's
-- requireStudioPermission('website:manage_pages') check is bypassable by
-- calling PostgREST directly with a user's own session JWT, photographer
-- and team_member could delete any website page in their own studio via
-- a direct API call, despite holding neither website:update nor
-- website:manage_pages nor website:delete in either permission
-- taxonomy. (editor was incidentally blocked too, but only as a side
-- effect of the DELETE policy's EXISTS subquery inheriting the
-- websites table's own website:read-gated SELECT policy -- not because
-- DELETE itself checked any real permission. That accidental mechanism
-- is not something this migration relies on or preserves.)
--
-- Fix: replace the DELETE policy's condition with
-- has_studio_permission(w.studio_id, 'website:manage_pages') -- the
-- exact permission deleteWebsitePage() already requires at the app
-- layer, so the DB boundary now matches the app boundary instead of
-- being strictly looser than it. This is a straight swap of the USING
-- predicate; the policy's shape, its table, and every other policy on
-- website_pages (SELECT, INSERT, UPDATE, and the public published-page
-- policy) are untouched.
--
-- Resulting behavior (unchanged from what the app layer has always
-- enforced, now also true at the DB layer):
--   studio_owner  -> allowed (short-circuits to true in has_studio_permission)
--   photographer  -> denied  (website:manage_pages: ARRAY['super_admin' only via app; DB CASE has no branch -> ELSE -> denied)
--   team_member   -> denied  (same)
--   editor        -> denied  (same)
--   super_admin   -> handled outside has_studio_permission entirely (a
--                    separate profiles.role check per the function's
--                    existing, pre-established design -- see migration
--                    038's comment); this migration invents no new
--                    membership semantics for that role.
--   cross-studio member, non-member, anonymous -> denied, as before
--   (has_studio_permission returns false with no active studio_members
--   row for the target studio, same as is_studio_member did).

DROP POLICY IF EXISTS "Members can delete website pages" ON website_pages;

CREATE POLICY "Members can delete website pages" ON website_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_pages.website_id
        AND has_studio_permission(w.studio_id, 'website:manage_pages')
    )
  );
