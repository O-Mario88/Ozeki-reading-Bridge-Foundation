ALTER TABLE online_training_sessions
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS audience TEXT,
  ADD COLUMN IF NOT EXISTS attendee_emails_json TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS attendee_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS online_teachers_trained INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS online_school_leaders_trained INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_link TEXT,
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS chat_summary TEXT,
  ADD COLUMN IF NOT EXISTS attendance_captured_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_online_training_sessions_attendance_captured
  ON online_training_sessions(attendance_captured_at DESC);
