-- Corrects two plan storage limits to match the finalized product spec.
-- Plan names/slugs are unchanged ("starter" stays "starter").
UPDATE plans
SET storage_limit_bytes = 107374182400, updated_at = now() -- 100 GB
WHERE slug = 'starter';

UPDATE plans
SET storage_limit_bytes = 536870912000, updated_at = now() -- 500 GB
WHERE slug = 'studio';
