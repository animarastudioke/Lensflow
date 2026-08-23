-- Phase 2 P2-B follow-up: 033_remove_dead_gallery_media_bucket.sql's bucket-
-- row DELETE cannot run as plain SQL against a real Supabase project —
-- Supabase enforces a `storage.protect_delete()` trigger on storage.buckets
-- that rejects direct DELETE statements ("Direct deletion from storage
-- tables is not allowed. Use the Storage API instead."), specifically to
-- prevent orphaning storage objects. This was only discoverable by actually
-- attempting the deployment (033 failed atomically, cleanly, with no
-- partial effect — confirmed via a live re-check that both the 4 policies
-- and the bucket row were untouched and 033 was not recorded as applied).
--
-- This migration carries only the part of 033 that *is* plain SQL and does
-- succeed: dropping the dead, public, non-tenant-scoped policies. The
-- bucket row itself is removed separately via the Storage Management API
-- (DELETE /storage/v1/bucket/gallery-media), which is the mechanism
-- Supabase's own trigger directs us to use, and which independently
-- re-verifies the bucket is empty server-side before deleting it.
--
-- 033_remove_dead_gallery_media_bucket.sql is left as originally written/
-- reviewed (never edited) — this file documents and completes what it
-- could not do via SQL alone.

DROP POLICY IF EXISTS "Public read access to gallery media" ON storage.objects;
DROP POLICY IF EXISTS "Studio managers can upload gallery media" ON storage.objects;
DROP POLICY IF EXISTS "Studio managers can update gallery media" ON storage.objects;
DROP POLICY IF EXISTS "Studio managers can delete gallery media" ON storage.objects;
