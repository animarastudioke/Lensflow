-- =============================================================================
-- LENSFLOW DATABASE SCHEMA - MIGRATION 018: NOTIFICATIONS
-- =============================================================================
-- Replaces the hardcoded fake notification list in the dashboard header
-- (three static items linking to /dashboard/notifications/1, /2, /3 — routes
-- that never existed) with a real, studio-scoped notification feed.
-- =============================================================================

CREATE TYPE notification_type AS ENUM (
  'booking_created',
  'payment_received',
  'invoice_overdue',
  'gallery_downloaded',
  'gallery_viewed',
  'team_invitation',
  'order_created'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_studio_id ON notifications(studio_id, created_at DESC);
CREATE INDEX idx_notifications_studio_unread ON notifications(studio_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view studio notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (is_studio_member(studio_id));

CREATE POLICY "Members can mark studio notifications read"
  ON notifications FOR UPDATE
  TO authenticated
  USING (is_studio_member(studio_id))
  WITH CHECK (is_studio_member(studio_id));

-- Notifications are studio-wide (visible to every team member), so any
-- member marking one read is legitimate — there's no per-user read state to
-- protect here, unlike the payments/subscriptions tables.
