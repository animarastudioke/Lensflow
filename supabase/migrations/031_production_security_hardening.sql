-- Phase 1 production security hardening.
--
-- Fixes, at the database/RLS boundary:
--   1. profiles.role / profiles.studio_id client-side privilege escalation
--      (a plain PATCH to one's own profile row could set role='super_admin').
--   2. studio_members role escalation (a manager/photographer could PATCH
--      any member's role to 'studio_owner' directly via PostgREST, bypassing
--      the app-level TeamRole restriction in src/lib/actions/team.ts).
--   3. Public/anonymous exposure of galleries.password_hash,
--      galleries.share_token, gallery_share_settings.password_hash,
--      media.original_key, and client PII — the previous "Public can view
--      published galleries/media/share settings" policies granted the anon
--      key full-row SELECT (RLS is row-level, not column-level) on every
--      published gallery across every studio, reachable directly via the
--      PostgREST REST API regardless of what the Next.js app code does.
--      Anonymous gallery access now goes exclusively through the
--      service-role-backed Server Actions in src/lib/actions/galleries.ts,
--      which enforce token possession and (for protected galleries)
--      password verification before returning anything — the same model
--      already used by getInvoiceByToken/getQuoteByToken.

-- =============================================================================
-- 1. profiles.role / profiles.studio_id immutability
-- =============================================================================
-- The existing "Users can update their own profile" policy has no WITH CHECK,
-- so any authenticated user can PATCH their own row to
-- {"role":"super_admin"} or move themselves into an arbitrary studio_id.
--
-- A trigger (rather than a WITH CHECK clause) is used because the one
-- legitimate self-service exception — createStudio() setting the creator's
-- own profile to studio_owner of the studio they just created — needs to
-- look up sibling rows in `studios` and `studio_members` to verify, which a
-- WITH CHECK clause on `profiles` can express but a trigger makes clearer
-- and easier to keep readable as the exception grows.
CREATE OR REPLACE FUNCTION enforce_profiles_role_studio_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Trusted server-side code using the service-role client (e.g.
  -- inviteTeamMember() in src/lib/actions/team.ts assigning a role to an
  -- invited teammate) is authoritative and bypasses this check entirely.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS NOT DISTINCT FROM OLD.role AND NEW.studio_id IS NOT DISTINCT FROM OLD.studio_id THEN
    RETURN NEW;
  END IF;

  -- The one legitimate client-driven exception: a user who has just created
  -- a studio (studios.owner_id = them) and been added as its active
  -- studio_owner member (studio_members row inserted moments earlier in the
  -- same request) is allowed to stamp that onto their own profile. Anything
  -- else — a different role, a studio_id they don't own, someone else's
  -- row — is rejected. (RLS's own USING clause on this policy already
  -- restricts UPDATE to the caller's own row; this is checked again here
  -- for defense in depth.)
  IF NEW.id = auth.uid()
     AND NEW.role = 'studio_owner'
     AND EXISTS (
       SELECT 1 FROM studios s
       WHERE s.id = NEW.studio_id AND s.owner_id = auth.uid()
     )
     AND EXISTS (
       SELECT 1 FROM studio_members sm
       WHERE sm.studio_id = NEW.studio_id
         AND sm.user_id = auth.uid()
         AND sm.role = 'studio_owner'
         AND sm.status = 'active'
     )
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Changing role or studio_id is not permitted through this interface';
END;
$$;

DROP TRIGGER IF EXISTS enforce_profiles_role_studio_immutability ON profiles;
CREATE TRIGGER enforce_profiles_role_studio_immutability
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profiles_role_studio_immutability();

-- =============================================================================
-- 2. studio_members role escalation
-- =============================================================================
-- "Managers can manage studio membership" (is_studio_manager = studio_owner
-- or photographer) previously had no restriction on what `role` a manager
-- could write, so a photographer could PATCH any member's role to
-- 'studio_owner' directly via PostgREST even though the app's TeamRole type
-- and requireManager()-gated Server Actions never offer that option. This
-- app has no "transfer ownership" feature — studio_owner is set exactly
-- once, at studio creation (see createStudio() in src/lib/actions/studios.ts
-- and the "Studio owners can add themselves as the first member" INSERT
-- policy below) — so the fix is to disallow this policy from ever writing
-- role = 'studio_owner' onto anyone who isn't already that studio's owner.
DROP POLICY IF EXISTS "Managers can manage studio membership" ON studio_members;
CREATE POLICY "Managers can manage studio membership" ON studio_members FOR ALL
  USING (is_studio_manager(studio_id))
  WITH CHECK (
    is_studio_manager(studio_id)
    AND (
      role <> 'studio_owner'
      OR user_id = (SELECT owner_id FROM studios WHERE id = studio_members.studio_id)
    )
  );

-- =============================================================================
-- 3. Public gallery secret exposure
-- =============================================================================
-- These policies granted the anon key unrestricted full-row SELECT on every
-- published gallery/media/share-settings row across every studio — including
-- password_hash, share_token (redundant once you can already SELECT it, but
-- also every *other* gallery's token), media.original_key (server-generated
-- R2 storage keys, which per this repo's storage rules must never leave the
-- server), and client PII — reachable directly via
-- /rest/v1/galleries?select=* with nothing but the public anon key, entirely
-- independent of the Next.js app's own token/password checks.
--
-- Anonymous gallery viewing (src/lib/actions/galleries.ts:
-- getGalleryGateInfo, getGalleryByToken, verifyGalleryPassword) now uses the
-- service-role client instead, the same pattern already used for
-- getInvoiceByToken/getQuoteByToken ("no anon RLS policy on invoices by
-- design"). The service-role-backed Server Action is what enforces token
-- possession and password verification before returning anything — RLS no
-- longer needs to (and must not) grant anon access to these tables at all.
DROP POLICY IF EXISTS "Public can view published galleries" ON galleries;
DROP POLICY IF EXISTS "Public can view media of published galleries" ON media;
DROP POLICY IF EXISTS "Public can view share settings of published galleries" ON gallery_share_settings;
