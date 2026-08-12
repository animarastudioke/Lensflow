-- =============================================================================
-- LENSFLOW DATABASE SCHEMA - MIGRATION 016: PLAN ENTITLEMENTS
-- =============================================================================
-- Adds a normalized plans catalog and a subscriptions table (replacing the
-- flat subscription_tier-style columns referenced in older, unapplied local
-- migration drafts — the live `studios` table never actually had those
-- columns). Also extends `media` with the columns needed for R2-backed
-- storage-quota accounting and gated original downloads.
-- =============================================================================

-- =============================================================================
-- PLANS
-- =============================================================================

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug IN ('free', 'starter', 'studio', 'team')),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_interval TEXT NOT NULL DEFAULT 'month',
  storage_limit_bytes BIGINT NOT NULL CHECK (storage_limit_bytes > 0),
  max_active_galleries INTEGER, -- NULL = unlimited
  max_team_seats INTEGER, -- NULL = unlimited
  can_download_originals BOOLEAN NOT NULL DEFAULT FALSE,
  can_bulk_download BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_store BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_website_builder BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_custom_domain BOOLEAN NOT NULL DEFAULT FALSE,
  can_accept_payments BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_booking BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_crm BOOLEAN NOT NULL DEFAULT FALSE,
  priority_support BOOLEAN NOT NULL DEFAULT FALSE,
  show_powered_by_badge BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plans IS 'Catalog of subscription plans. Storage limits are entitlements (a ceiling checked at upload time), not pre-provisioned storage — actual usage is computed live from media.storage_bytes.';
COMMENT ON COLUMN plans.storage_limit_bytes IS 'Binary (GiB/TiB-based) byte ceiling, stored as an exact bigint — never a float.';

-- Seed the four real LensFlow plans with exact binary byte values.
-- 3 GiB = 3 * 1024^3, 50 GiB = 50 * 1024^3, 250 GiB = 250 * 1024^3, 1 TiB = 1024^4.
INSERT INTO plans (
  slug, name, price_cents, storage_limit_bytes, max_active_galleries, max_team_seats,
  can_download_originals, can_bulk_download, can_use_store, can_use_website_builder,
  can_use_custom_domain, can_accept_payments, can_use_booking, can_use_crm,
  priority_support, show_powered_by_badge
) VALUES
  ('free', 'Free', 0, 3221225472, 1, 1,
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('starter', 'Starter', 1200, 53687091200, NULL, 1,
    TRUE, TRUE, FALSE, FALSE, FALSE, TRUE, TRUE, TRUE, FALSE, FALSE),
  ('studio', 'Studio', 2900, 268435456000, NULL, 1,
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
  ('team', 'Team', 5900, 1099511627776, NULL, 5,
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Plans are reference data: anyone signed in can read the catalog (needed for
-- pricing/upgrade UI); only the service role can write to it.
CREATE POLICY "Authenticated users can view plans"
  ON plans FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- =============================================================================
-- SUBSCRIPTIONS
-- =============================================================================

CREATE TYPE subscription_status AS ENUM (
  'active', 'trialing', 'past_due', 'canceled', 'expired', 'incomplete'
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'active',
  billing_provider TEXT, -- 'stripe' | 'flutterwave' | 'mpesa' | 'paypal' | NULL for the Free plan
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscriptions IS 'One row per billing period/state change; a studio can have many historical rows but at most one active/trialing/past_due row at a time (enforced by the partial unique index below). Effective entitlements are resolved in the application layer from this table, never assumed just because a plan was selected.';

-- At most one "live" subscription per studio, while still allowing full
-- history (old canceled/expired rows are never deleted).
CREATE UNIQUE INDEX idx_subscriptions_studio_live
  ON subscriptions(studio_id)
  WHERE status IN ('active', 'trialing', 'past_due');

CREATE INDEX idx_subscriptions_studio_id ON subscriptions(studio_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_provider_subscription_id
  ON subscriptions(provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Read-only from the client's perspective — studio members can see their own
-- subscription, but all writes (upgrades, downgrades, webhook-driven status
-- changes) go through trusted server code using the service-role key, which
-- bypasses RLS. No client-side INSERT/UPDATE/DELETE policy is defined.
CREATE POLICY "Members can view their studio subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (is_studio_member(studio_id));

-- No DB trigger for updated_at — this app sets it manually in application
-- code on every update (the established convention across every action file;
-- there is no update_updated_at_column() trigger function in this database).

-- Give every existing studio a Free subscription so entitlement resolution
-- always has a row to find (new studios get this in application code at
-- creation time — see createStudio in src/lib/actions/studios.ts).
INSERT INTO subscriptions (studio_id, plan_id, status)
SELECT s.id, (SELECT id FROM plans WHERE slug = 'free'), 'active'
FROM studios s
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions sub
  WHERE sub.studio_id = s.id AND sub.status IN ('active', 'trialing', 'past_due')
);

-- =============================================================================
-- MEDIA: STORAGE-QUOTA + GATED-ORIGINAL COLUMNS
-- =============================================================================

ALTER TABLE media
  ADD COLUMN IF NOT EXISTS original_key TEXT,
  ADD COLUMN IF NOT EXISTS storage_bytes BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN media.original_key IS 'R2 object key for the retained full-resolution original. NULL when the studio''s plan does not include original downloads (the original is discarded after generating the preview/thumbnail, same as pre-R2 behavior) — never exposed to clients directly, only read server-side by the gated download routes.';
COMMENT ON COLUMN media.storage_bytes IS 'Total bytes actually stored in R2 for this asset across all retained variants (preview + thumb + original if kept) — authoritative for storage-quota accounting. Distinct from `size`, which historically only reflected the web-preview file size.';

UPDATE media SET storage_bytes = COALESCE(size, 0) WHERE storage_bytes = 0;

-- =============================================================================
-- STORAGE USAGE VIEW
-- =============================================================================

CREATE OR REPLACE VIEW studio_storage_usage AS
SELECT
  g.studio_id,
  COALESCE(SUM(m.storage_bytes), 0)::BIGINT AS used_bytes
FROM galleries g
LEFT JOIN media m ON m.gallery_id = g.id
GROUP BY g.studio_id;

COMMENT ON VIEW studio_storage_usage IS 'Live-computed per-studio storage usage (organization-level, shared across all team members — not per-user). No maintained counter/trigger is used; this always reflects the true current state of the media table.';
