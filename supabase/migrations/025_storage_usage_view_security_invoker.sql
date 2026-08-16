-- studio_storage_usage was a SECURITY DEFINER view (the default), which
-- runs with the view owner's privileges and bypasses RLS on the underlying
-- galleries/media tables for ANY querying role - flagged as a Supabase
-- security advisor ERROR. The app's actual entitlement checks
-- (getStorageUsageBytes in src/lib/entitlements/service.ts) already use the
-- service-role client, which bypasses RLS regardless, so this has no
-- effect on app behavior - it only closes the door on a studio being able
-- to read another studio's storage usage via a direct PostgREST query.
ALTER VIEW public.studio_storage_usage SET (security_invoker = true);
