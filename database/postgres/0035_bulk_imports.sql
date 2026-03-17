ALTER TABLE schools_directory
  ADD COLUMN IF NOT EXISTS school_external_id TEXT,
  ADD COLUMN IF NOT EXISTS emis_code TEXT,
  ADD COLUMN IF NOT EXISTS school_level TEXT,
  ADD COLUMN IF NOT EXISTS ownership TEXT,
  ADD COLUMN IF NOT EXISTS school_shipping_address TEXT;

ALTER TABLE school_contacts
  ADD COLUMN IF NOT EXISTS participant_external_id TEXT;

ALTER TABLE portal_training_attendance
  ADD COLUMN IF NOT EXISTS attendance_status TEXT NOT NULL DEFAULT 'Attended',
  ADD COLUMN IF NOT EXISTS attended_from DATE,
  ADD COLUMN IF NOT EXISTS attended_to DATE,
  ADD COLUMN IF NOT EXISTS certificate_status TEXT NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE portal_training_attendance
SET
  attendance_status = CASE
    WHEN attended IS TRUE THEN 'Attended'
    WHEN confirmed IS TRUE THEN 'Confirmed'
    WHEN invited IS TRUE THEN 'Invited'
    ELSE 'Registered'
  END,
  certificate_status = COALESCE(NULLIF(trim(certificate_status), ''), 'Pending'),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  attendance_status IS NULL
  OR trim(attendance_status) = ''
  OR certificate_status IS NULL
  OR trim(certificate_status) = ''
  OR updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_directory_external_id_unique
  ON schools_directory ((lower(btrim(school_external_id))))
  WHERE school_external_id IS NOT NULL AND btrim(school_external_id) <> '';

CREATE INDEX IF NOT EXISTS idx_schools_directory_name_parish_lookup
  ON schools_directory ((lower(btrim(name))), (lower(btrim(parish))));

CREATE INDEX IF NOT EXISTS idx_schools_directory_name_district_country_lookup
  ON schools_directory ((lower(btrim(name))), (lower(btrim(district))), (lower(btrim(country))));

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_contacts_participant_external_id_unique
  ON school_contacts ((lower(btrim(participant_external_id))))
  WHERE participant_external_id IS NOT NULL AND btrim(participant_external_id) <> '';

CREATE INDEX IF NOT EXISTS idx_school_contacts_email_lookup
  ON school_contacts ((lower(btrim(email))))
  WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE INDEX IF NOT EXISTS idx_school_contacts_phone_lookup
  ON school_contacts ((regexp_replace(COALESCE(phone, ''), '[^0-9]+', '', 'g')))
  WHERE phone IS NOT NULL AND btrim(phone) <> '';

CREATE INDEX IF NOT EXISTS idx_portal_training_attendance_attendance_status
  ON portal_training_attendance (portal_record_id, attendance_status, certificate_status);

CREATE TABLE IF NOT EXISTS import_jobs (
  id BIGSERIAL PRIMARY KEY,
  import_type TEXT NOT NULL CHECK (import_type IN ('schools', 'training_participants')),
  file_name TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('csv', 'xlsx')),
  uploaded_by_user_id INTEGER NOT NULL REFERENCES portal_users(id) ON DELETE RESTRICT,
  validated_by_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  committed_by_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  source_training_record_id INTEGER REFERENCES portal_records(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('validated', 'committing', 'completed', 'completed_with_errors', 'failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  committed_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_type_status_created
  ON import_jobs (import_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_jobs_uploaded_by
  ON import_jobs (uploaded_by_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS import_job_rows (
  id BIGSERIAL PRIMARY KEY,
  import_job_id BIGINT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data_json JSONB NOT NULL,
  normalized_data_json JSONB,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'SKIP', 'ERROR')),
  status TEXT NOT NULL CHECK (status IN ('READY', 'SKIPPED', 'ERROR', 'CREATED', 'UPDATED')),
  error_message TEXT,
  warning_message TEXT,
  suggested_fix TEXT,
  linked_school_id INTEGER REFERENCES schools_directory(id) ON DELETE SET NULL,
  linked_training_id INTEGER REFERENCES portal_records(id) ON DELETE SET NULL,
  created_record_id TEXT,
  updated_record_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (import_job_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_import_job_rows_job_status
  ON import_job_rows (import_job_id, status, row_number);
