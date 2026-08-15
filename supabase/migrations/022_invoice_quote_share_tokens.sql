-- =============================================================================
-- MIGRATION 022: INVOICE/QUOTE SHARE TOKENS
-- =============================================================================
-- Adds a non-sequential public share token to invoices and quotes, mirroring
-- galleries.share_token and questionnaire_responses.share_token: the token
-- is what a client-facing link is built from, and public access to it goes
-- through the service-role client in application code (no anon RLS policy
-- here by design, same as the other two).
--
-- DEFAULT backfills every existing row with a real token in the same
-- statement that adds the column -- no separate UPDATE needed.

ALTER TABLE invoices ADD COLUMN share_token TEXT UNIQUE
  DEFAULT replace(gen_random_uuid()::text, '-', '');

ALTER TABLE quotes ADD COLUMN share_token TEXT UNIQUE
  DEFAULT replace(gen_random_uuid()::text, '-', '');

CREATE INDEX idx_invoices_share_token ON invoices(share_token);
CREATE INDEX idx_quotes_share_token ON quotes(share_token);
