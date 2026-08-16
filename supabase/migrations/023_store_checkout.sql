-- =============================================================================
-- MIGRATION 023: STORE CHECKOUT
-- =============================================================================
-- Real client-facing checkout for the Store feature. Scoped to digital
-- downloads only for v1 (physical fulfillment/shipping rates are a separate
-- project) — a digital product now stores exactly one deliverable file in
-- R2, referenced by key rather than a public URL (same "no public URLs for
-- originals" posture as gallery/invoice assets).
--
-- orders gets the columns needed for anonymous checkout (no buyer account
-- system exists): email to identify the buyer, currency for display, and a
-- share_token so the post-purchase receipt/download page has a durable,
-- non-guessable public URL — same pattern as invoices/quotes (022).
--
-- payments gets order_id alongside its existing invoice_id/plan_id columns,
-- extending the same "a payment row has exactly one of these set" pattern
-- from migration 020.
-- =============================================================================

ALTER TABLE products ADD COLUMN digital_file_key TEXT;
ALTER TABLE products ADD COLUMN digital_file_name TEXT;

ALTER TABLE orders ADD COLUMN email TEXT;
ALTER TABLE orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE orders ADD COLUMN share_token TEXT UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');

ALTER TABLE payments ADD COLUMN order_id UUID REFERENCES orders(id);
CREATE INDEX idx_payments_order_id ON payments(order_id) WHERE order_id IS NOT NULL;
