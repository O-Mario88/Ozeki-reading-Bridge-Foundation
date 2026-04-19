-- Track when a session actually went live (host clicked Start Training)
ALTER TABLE online_training_sessions
  ADD COLUMN IF NOT EXISTS live_started_at TIMESTAMPTZ;

-- Index for querying currently-live sessions quickly
CREATE INDEX IF NOT EXISTS idx_online_training_sessions_live
  ON online_training_sessions (status, live_started_at)
  WHERE status = 'live';

COMMENT ON COLUMN online_training_sessions.live_started_at
  IS 'Timestamp when the host clicked Start Training — used for live duration counter and attendance window.';
