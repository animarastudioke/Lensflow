-- Conservative, score-based signal for repeated free-workspace creation
-- abuse (spec: "do not automatically block based on a single signal").
-- Stores only a salted hash of the IP/user-agent, never the raw values.
-- Service-role only (no policies, same posture as upload_reservations) -
-- this is an internal signal, not something a client should ever query.
CREATE TABLE signup_risk_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  studio_id UUID REFERENCES studios(id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent_hash TEXT,
  risk_score INT NOT NULL DEFAULT 0,
  risk_flags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_risk_signals_ip_hash_created_at ON signup_risk_signals (ip_hash, created_at);
CREATE INDEX idx_signup_risk_signals_user_id ON signup_risk_signals (user_id);

ALTER TABLE signup_risk_signals ENABLE ROW LEVEL SECURITY;
