-- =============================================================================
-- MIGRATION 021: ATOMIC STORAGE QUOTA (concurrency-safe upload reservations)
-- =============================================================================
-- canAcceptUpload() was read-then-decide: two simultaneous uploads landing
-- near a nearly-full quota could each see "under limit" and both proceed,
-- pushing the studio over its plan's storage cap. This adds a short-lived
-- reservation row per in-flight upload plus an atomic reserve function, so
-- the check-and-reserve happens as one guarded operation instead of two
-- separate round trips a second request can race between.

CREATE TABLE upload_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  media_id UUID NOT NULL,
  reserved_bytes BIGINT NOT NULL CHECK (reserved_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_upload_reservations_studio_id ON upload_reservations(studio_id);
CREATE UNIQUE INDEX idx_upload_reservations_media_id ON upload_reservations(media_id);

ALTER TABLE upload_reservations ENABLE ROW LEVEL SECURITY;
-- No policies: this table is only ever touched by the service-role client,
-- via the entitlement service, matching how quota decisions already work.

-- Atomically checks (confirmed usage + active reservations + this request)
-- against the caller-supplied limit and, if it fits, inserts the reservation
-- -- all inside one function invocation so a second concurrent call can't
-- interleave between the check and the insert. The per-studio advisory
-- lock serializes concurrent reservation attempts for the SAME studio
-- (held for the transaction's duration) without blocking unrelated studios.
--
-- The plan's storage limit itself is NOT re-derived here -- effective-plan
-- resolution (subscription status fallbacks, free-plan defaults) is
-- business logic that already lives in one place, the TypeScript
-- entitlement service, and must stay there rather than being duplicated in
-- SQL where the two could drift. The caller resolves the limit first and
-- passes it in; this function only makes the compare-and-reserve atomic.
CREATE OR REPLACE FUNCTION reserve_upload_quota(
  p_studio_id UUID,
  p_media_id UUID,
  p_bytes BIGINT,
  p_limit_bytes BIGINT,
  p_ttl_seconds INT DEFAULT 900
)
RETURNS TABLE(allowed BOOLEAN, used_bytes BIGINT, reserved_bytes BIGINT) AS $$
DECLARE
  v_confirmed BIGINT;
  v_reserved BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_studio_id::text));

  -- Opportunistic cleanup: expired reservations stop counting anyway (the
  -- SUM below filters on expires_at), this just keeps the table small.
  DELETE FROM upload_reservations WHERE expires_at <= NOW();

  SELECT COALESCE(SUM(m.storage_bytes), 0) INTO v_confirmed
  FROM media m
  JOIN galleries g ON g.id = m.gallery_id
  WHERE g.studio_id = p_studio_id;

  SELECT COALESCE(SUM(r.reserved_bytes), 0) INTO v_reserved
  FROM upload_reservations r
  WHERE r.studio_id = p_studio_id AND r.expires_at > NOW();

  IF v_confirmed + v_reserved + p_bytes > p_limit_bytes THEN
    RETURN QUERY SELECT FALSE, v_confirmed, v_reserved;
    RETURN;
  END IF;

  INSERT INTO upload_reservations (studio_id, media_id, reserved_bytes, expires_at)
  VALUES (p_studio_id, p_media_id, p_bytes, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (media_id) DO NOTHING;

  RETURN QUERY SELECT TRUE, v_confirmed, v_reserved;
END;
$$ LANGUAGE plpgsql;

-- Called once an upload is finalized (the media row now exists and counts
-- for real) or abandoned (finalize skipped it) -- either way the
-- reservation's job is done and it should stop holding quota immediately
-- rather than waiting out its TTL.
CREATE OR REPLACE FUNCTION release_upload_reservations(p_media_ids UUID[])
RETURNS VOID AS $$
BEGIN
  DELETE FROM upload_reservations WHERE media_id = ANY(p_media_ids);
END;
$$ LANGUAGE plpgsql;
