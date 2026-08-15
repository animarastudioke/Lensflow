-- =============================================================================
-- MIGRATION 020: SUBSCRIPTION PAYMENTS
-- =============================================================================
-- Extends the payments ledger (built for client-pays-photographer invoice
-- payments) to also record studio-pays-LensFlow subscription payments. A row
-- has either invoice_id (invoice payment) or plan_id (subscription payment)
-- set, never both -- there is no DB constraint enforcing that, matching the
-- existing loose style of this table (e.g. method='manual' payments already
-- have no client_id).

ALTER TABLE payments ADD COLUMN plan_id UUID REFERENCES plans(id);

CREATE INDEX idx_payments_plan_id ON payments(plan_id) WHERE plan_id IS NOT NULL;
