-- Phase 5 P3: decompose website_pages's single combined FOR ALL policy
-- ("Members can manage website pages") into SELECT/INSERT/UPDATE/DELETE,
-- adding role-scoped SELECT (has_studio_permission(..., 'website:read'))
-- while preserving every existing write authorization outcome exactly.
--
-- The original ALL policy: USING (is_studio_member(w.studio_id)),
-- WITH CHECK (has_studio_permission(w.studio_id, 'website:update')).
-- Postgres RLS semantics for FOR ALL: USING applies to SELECT/UPDATE/
-- DELETE (existing-row visibility); WITH CHECK applies to INSERT and
-- the new-row image of UPDATE only -- DELETE never evaluates WITH
-- CHECK. This migration reproduces that exact split per command:
--   SELECT (new):  has_studio_permission(studio_id, 'website:read')
--   INSERT:        WITH CHECK has_studio_permission(..., 'website:update')  [unchanged]
--   UPDATE:        USING is_studio_member(...), WITH CHECK has_studio_permission(..., 'website:update')  [unchanged]
--   DELETE:        USING is_studio_member(...)  [unchanged]
--
-- NOTE (flagged, not fixed here -- out of this migration's scope):
-- because WITH CHECK never applied to DELETE under the original ALL
-- policy, DELETE on website_pages has always been (and remains, after
-- this migration) authorized by is_studio_member() alone -- ANY active
-- studio member, not just those holding website:update/manage_pages,
-- can delete a website page via direct PostgREST today. This was not
-- previously identified in the Phase 4 report or the post-Phase-4
-- hygiene review (both only examined the SELECT/read side of this
-- table). Preserved exactly as-is per this migration's explicit
-- "current write behavior must NOT change" instruction -- see the
-- Phase 5 report for the full writeup; recommend a dedicated pass to
-- decide whether DELETE should require website:update too.
--
-- Public published-page access ("Public can view published pages of
-- published websites") is untouched.

DROP POLICY IF EXISTS "Members can manage website pages" ON website_pages;

CREATE POLICY "Members can view studio website pages" ON website_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_pages.website_id
        AND has_studio_permission(w.studio_id, 'website:read')
    )
  );

CREATE POLICY "Members can create website pages" ON website_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_pages.website_id
        AND has_studio_permission(w.studio_id, 'website:update')
    )
  );

CREATE POLICY "Members can update website pages" ON website_pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_pages.website_id
        AND is_studio_member(w.studio_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_pages.website_id
        AND has_studio_permission(w.studio_id, 'website:update')
    )
  );

CREATE POLICY "Members can delete website pages" ON website_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_pages.website_id
        AND is_studio_member(w.studio_id)
    )
  );
