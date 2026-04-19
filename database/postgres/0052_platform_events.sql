-- Migration 0052: Event Bus Infrastructure
-- Establishes the platform-wide event ledger that every write endpoint publishes to.
-- Handlers read this ledger to fire cascading automation (notifications, intervention
-- seeding, cache invalidation, aggregate refreshes).

CREATE TABLE IF NOT EXISTS platform_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  handler_results_json JSONB NOT NULL DEFAULT '[]'
);

-- Defensive: if platform_events was created by a prior version of this migration
-- that lacked some columns, add them now so downstream indexes never fail.
ALTER TABLE platform_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE platform_events ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE platform_events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE platform_events ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE platform_events ADD COLUMN IF NOT EXISTS entity_id TEXT;

CREATE INDEX IF NOT EXISTS idx_platform_events_status
  ON platform_events(status, occurred_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_platform_events_type
  ON platform_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_entity
  ON platform_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_recent
  ON platform_events(occurred_at DESC);

-- Lightweight log of every handler execution (for observability + health dashboard)
CREATE TABLE IF NOT EXISTS automation_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES platform_events(id) ON DELETE CASCADE,
  handler_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'skipped')),
  duration_ms INTEGER,
  result_json JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Defensive: if automation_logs was created by an older version of this migration
-- without handler_name, add it now so the index creation below doesn't fail.
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS handler_name TEXT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS event_id BIGINT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_automation_logs_handler
  ON automation_logs(handler_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_event
  ON automation_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_recent
  ON automation_logs(created_at DESC);
