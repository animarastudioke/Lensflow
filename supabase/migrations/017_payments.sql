-- =============================================================================
-- LENSFLOW DATABASE SCHEMA - MIGRATION 017: PAYMENTS
-- =============================================================================
-- Real payment ledger. Previously the only record of money received was
-- invoices.amount_paid, updated by a photographer manually clicking "mark as
-- paid" — no processor integration existed at all. This adds an actual
-- transaction record, written only by trusted server code (STK push
-- initiation + the M-Pesa webhook), never directly by a client.
-- =============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  method TEXT NOT NULL DEFAULT 'mpesa' CHECK (method IN ('mpesa', 'stripe', 'flutterwave', 'paypal', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  phone_number TEXT,
  provider_checkout_id TEXT,
  provider_merchant_request_id TEXT,
  provider_receipt_number TEXT,
  failure_reason TEXT,
  raw_callback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'Real transaction ledger. Status only ever transitions from pending -> completed/failed via the M-Pesa webhook (or equivalent provider webhook in future) verifying the actual outcome — never based on client-reported state.';
COMMENT ON COLUMN payments.currency IS 'M-Pesa STK push only settles in KES; other providers/currencies added later will use this same column.';
COMMENT ON COLUMN payments.provider_checkout_id IS 'M-Pesa CheckoutRequestID — the webhook matches its callback back to a payment row using this, never by trusting an ID the client supplies.';

CREATE INDEX idx_payments_studio_id ON payments(studio_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_payments_client_id ON payments(client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX idx_payments_provider_checkout_id ON payments(provider_checkout_id) WHERE provider_checkout_id IS NOT NULL;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Read-only from the client's perspective, same pattern as subscriptions:
-- studio members can see their own payment history, but every write goes
-- through trusted server code using the service-role key. No client-side
-- INSERT/UPDATE/DELETE policy is defined.
CREATE POLICY "Members can view studio payments"
  ON payments FOR SELECT
  TO authenticated
  USING (is_studio_member(studio_id));
