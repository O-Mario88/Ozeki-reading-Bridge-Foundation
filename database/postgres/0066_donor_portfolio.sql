-- Migration 0066: Donor portfolio + impact attribution (Phase 2 / Sprint 8).
--
-- Builds on 0065 external_users (role='donor'). Three tables:
--   donor_allocations           — what the donor said their gift should fund
--   donor_impact_snapshots      — monthly rollup of what was actually delivered
--                                  against that allocation
--   donor_recurring_subscriptions — Pesapal recurring-donation subscription
--                                    state (token to be filled when the API
--                                    integration ships; row is the local SoR)

CREATE TABLE IF NOT EXISTS donor_allocations (
  id BIGSERIAL PRIMARY KEY,
  donor_user_id BIGINT NOT NULL REFERENCES external_users(id) ON DELETE CASCADE,
  reference_code TEXT NOT NULL UNIQUE,
  programme TEXT NOT NULL,
  region TEXT,
  district TEXT,
  cohort_year INTEGER,
  amount_ugx NUMERIC(18, 2) NOT NULL,
  amount_usd_at_allocation NUMERIC(18, 2),
  fx_rate_used NUMERIC(12, 4),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  source_donation_id BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donor_allocations_donor
  ON donor_allocations (donor_user_id, start_date DESC);

CREATE TABLE IF NOT EXISTS donor_impact_snapshots (
  id BIGSERIAL PRIMARY KEY,
  donor_user_id BIGINT NOT NULL REFERENCES external_users(id) ON DELETE CASCADE,
  allocation_id BIGINT REFERENCES donor_allocations(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  learners_reached INTEGER NOT NULL DEFAULT 0,
  learners_improved INTEGER NOT NULL DEFAULT 0,
  teachers_trained INTEGER NOT NULL DEFAULT 0,
  coaching_visits INTEGER NOT NULL DEFAULT 0,
  evidence_photos INTEGER NOT NULL DEFAULT 0,
  amount_attributed_ugx NUMERIC(18, 2) NOT NULL DEFAULT 0,
  highlight_text TEXT,
  digest_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (donor_user_id, allocation_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_donor_impact_snapshots_donor
  ON donor_impact_snapshots (donor_user_id, period_end DESC);

CREATE TABLE IF NOT EXISTS donor_recurring_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  donor_user_id BIGINT NOT NULL REFERENCES external_users(id) ON DELETE CASCADE,
  plan_label TEXT NOT NULL,
  amount_ugx NUMERIC(18, 2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'active', 'paused', 'cancelled', 'failed'
  )),
  pesapal_subscription_token TEXT,
  pesapal_payer_token TEXT,
  next_charge_date DATE,
  last_charge_date DATE,
  last_charge_amount_ugx NUMERIC(18, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_donor_recurring_donor
  ON donor_recurring_subscriptions (donor_user_id, status);

CREATE INDEX IF NOT EXISTS idx_donor_recurring_next_charge
  ON donor_recurring_subscriptions (next_charge_date)
  WHERE status = 'active';

COMMENT ON TABLE donor_allocations IS
  'A donor''s stated allocation of a gift to a specific programme / region / cohort.';
COMMENT ON TABLE donor_impact_snapshots IS
  'Monthly rollup of impact delivered against each allocation. Powers the donor portfolio + monthly digest email.';
COMMENT ON TABLE donor_recurring_subscriptions IS
  'Local system-of-record for Pesapal recurring-donation subscriptions. pesapal_subscription_token stays NULL until the Pesapal recurring-payments API integration is wired up.';
