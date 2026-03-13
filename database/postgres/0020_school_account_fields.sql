ALTER TABLE schools_directory
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Uganda',
  ADD COLUMN IF NOT EXISTS alternate_school_names TEXT,
  ADD COLUMN IF NOT EXISTS school_status TEXT NOT NULL DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS school_status_date DATE,
  ADD COLUMN IF NOT EXISTS current_partner_type TEXT NOT NULL DEFAULT 'NA',
  ADD COLUMN IF NOT EXISTS year_founded INTEGER,
  ADD COLUMN IF NOT EXISTS account_record_type TEXT NOT NULL DEFAULT 'School',
  ADD COLUMN IF NOT EXISTS school_type TEXT NOT NULL DEFAULT 'School',
  ADD COLUMN IF NOT EXISTS parent_account_label TEXT NOT NULL DEFAULT 'Uganda',
  ADD COLUMN IF NOT EXISTS school_relationship_status TEXT,
  ADD COLUMN IF NOT EXISTS school_relationship_status_date DATE,
  ADD COLUMN IF NOT EXISTS denomination TEXT,
  ADD COLUMN IF NOT EXISTS protestant_denomination TEXT,
  ADD COLUMN IF NOT EXISTS client_school_number INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_metric_date DATE,
  ADD COLUMN IF NOT EXISTS metric_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS running_total_max_enrollment INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_type TEXT,
  ADD COLUMN IF NOT EXISTS current_partner_school BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS school_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_schools_directory_country
  ON schools_directory(country);

CREATE INDEX IF NOT EXISTS idx_schools_directory_status_partner
  ON schools_directory(school_status, current_partner_type);
