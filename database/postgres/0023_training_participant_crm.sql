ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS participant_code TEXT;

ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS participant_type TEXT NOT NULL DEFAULT 'In Person';

ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS invited BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS confirmed BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS mobile_number TEXT;

ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS school_name_snapshot TEXT;

ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS school_region_snapshot TEXT;

ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS school_district_snapshot TEXT;

UPDATE portal_training_attendance
SET
  participant_code = COALESCE(participant_code, 'TP-' || portal_record_id::text || '-' || id::text),
  participant_type = COALESCE(NULLIF(participant_type, ''), 'In Person'),
  invited = COALESCE(invited, TRUE),
  confirmed = COALESCE(confirmed, TRUE),
  mobile_number = COALESCE(NULLIF(mobile_number, ''), NULLIF(phone, '')),
  school_name_snapshot = COALESCE(NULLIF(school_name_snapshot, ''), ''),
  school_region_snapshot = COALESCE(NULLIF(school_region_snapshot, ''), ''),
  school_district_snapshot = COALESCE(NULLIF(school_district_snapshot, ''), '')
WHERE
  participant_code IS NULL
  OR participant_type IS NULL
  OR mobile_number IS NULL
  OR school_name_snapshot IS NULL
  OR school_region_snapshot IS NULL
  OR school_district_snapshot IS NULL
  OR invited IS NULL
  OR confirmed IS NULL;

CREATE INDEX IF NOT EXISTS idx_portal_training_attendance_code
  ON portal_training_attendance(participant_code);

CREATE INDEX IF NOT EXISTS idx_portal_training_attendance_status
  ON portal_training_attendance(portal_record_id, invited, confirmed, attended);
