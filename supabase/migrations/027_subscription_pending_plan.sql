-- Lets a downgrade be paid for immediately without losing the remaining
-- days already paid for on the current (higher) plan: the payment records
-- the intended future plan here instead of overwriting plan_id right away.
-- It's applied automatically (see getEffectivePlan in
-- src/lib/entitlements/service.ts) once current_period_end passes.
ALTER TABLE subscriptions ADD COLUMN pending_plan_id UUID REFERENCES plans(id);
COMMENT ON COLUMN subscriptions.pending_plan_id IS 'Plan to switch to once current_period_end passes - set when an owner pays for a lower-priced plan while still within an already-paid higher period, so access downgrades no earlier than what was actually paid for.';
