-- Phase 2 P2-B: remove the dead `gallery-media` Supabase Storage bucket
-- (created in 013_gallery_media_upload.sql). All real gallery media has
-- lived in Cloudflare R2 since before this repo's current history (see
-- src/lib/storage/r2.ts and CLAUDE.md's storage rules) — no application
-- code reads or writes this bucket; a repo-wide search turns up only its
-- own creation migration and docs noting it as dead. It was also
-- public-readable and *not* tenant-scoped by object key the way R2 keys
-- are (`studios/{studioId}/...`), which made it a standing, unused
-- exposure surface rather than a functioning feature. Confirmed via a
-- live, read-only storage/v1/object/list call during Phase 2 recon that
-- the bucket currently holds 0 objects.
--
-- The bucket-row deletion is guarded on that still being true at
-- deployment time — if something has since written to it, only the
-- (already-unused) policies are dropped and the bucket row is left alone
-- rather than silently deleting media.

DROP POLICY IF EXISTS "Public read access to gallery media" ON storage.objects;
DROP POLICY IF EXISTS "Studio managers can upload gallery media" ON storage.objects;
DROP POLICY IF EXISTS "Studio managers can update gallery media" ON storage.objects;
DROP POLICY IF EXISTS "Studio managers can delete gallery media" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'gallery-media') THEN
    DELETE FROM storage.buckets WHERE id = 'gallery-media';
  ELSE
    RAISE NOTICE 'gallery-media bucket is non-empty — leaving the bucket row in place; its access policies above have still been removed.';
  END IF;
END $$;
