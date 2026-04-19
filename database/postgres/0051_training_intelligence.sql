-- Migration 0051: Training Intelligence Engine
-- Adds facilitator tracking, certificate issuance metadata, coaching-visit trigger linkage,
-- and a forward-looking training schedule table.

-- 1. Facilitator + topic tracking on training sessions
ALTER TABLE portal_records
  ADD COLUMN IF NOT EXISTS facilitator_user_id INTEGER REFERENCES portal_users(id),
  ADD COLUMN IF NOT EXISTS training_topic TEXT;

CREATE INDEX IF NOT EXISTS idx_portal_records_facilitator
  ON portal_records(facilitator_user_id, date)
  WHERE module = 'training';

CREATE INDEX IF NOT EXISTS idx_portal_records_training_topic
  ON portal_records(training_topic)
  WHERE module = 'training';

-- 2. Certificate issuance metadata on attendance rows
ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS certificate_status TEXT,
  ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certificate_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certificate_pdf_path TEXT;

-- 3. Coaching visits triggered by a specific training
ALTER TABLE coaching_visits
  ADD COLUMN IF NOT EXISTS triggered_by_training_id INTEGER REFERENCES portal_records(id);

CREATE INDEX IF NOT EXISTS idx_coaching_visits_trigger
  ON coaching_visits(triggered_by_training_id)
  WHERE triggered_by_training_id IS NOT NULL;

-- 4. Forward-looking training schedule
CREATE TABLE IF NOT EXISTS training_schedule (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  venue TEXT,
  district TEXT,
  region TEXT,
  facilitator_user_id INTEGER REFERENCES portal_users(id),
  capacity INTEGER,
  registered_count INTEGER NOT NULL DEFAULT 0,
  audience TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'open_registration', 'in_progress', 'completed', 'cancelled')),
  linked_portal_record_id INTEGER REFERENCES portal_records(id),
  created_by_user_id INTEGER REFERENCES portal_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_schedule_date
  ON training_schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_training_schedule_status
  ON training_schedule(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_training_schedule_district
  ON training_schedule(district);

-- 5. Registration table for school/teacher pre-registration
CREATE TABLE IF NOT EXISTS training_schedule_registrations (
  id SERIAL PRIMARY KEY,
  training_schedule_id INTEGER NOT NULL REFERENCES training_schedule(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools_directory(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL,
  participant_role TEXT,
  phone TEXT,
  email TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (training_schedule_id, participant_name, email)
);

CREATE INDEX IF NOT EXISTS idx_training_reg_schedule
  ON training_schedule_registrations(training_schedule_id);
CREATE INDEX IF NOT EXISTS idx_training_reg_school
  ON training_schedule_registrations(school_id);
