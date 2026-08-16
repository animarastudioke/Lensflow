-- Supabase security advisor WARN: mutable search_path on these two functions.
-- Pins it explicitly so they can't be tricked by a session-level search_path
-- change into resolving unqualified table names to an attacker-controlled
-- schema. No behavior change - both already only touch public schema tables.
ALTER FUNCTION public.reserve_upload_quota(uuid, uuid, bigint, bigint, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.release_upload_reservations(uuid[]) SET search_path = public, pg_temp;
