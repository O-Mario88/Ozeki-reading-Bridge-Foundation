-- Adds the still-current school-account fields onto schools_directory.
--
-- The previous version of this migration also added 10 columns that
-- 0039_remove_school_fields.sql drops (denomination, account_record_type, …).
-- Because each bootstrap re-ADDed the column and 0039 re-DROPped it, every
-- deploy left 10 *dropped* placeholders in pg_attribute. Postgres still
-- counts dropped columns toward the per-table 1600-attribute limit, so after
-- ~150 deploys the table hit the cap and any further ADD COLUMN failed with
-- "tables can have at most 1600 columns".
--
-- Fix: the columns 0039 drops are no longer added here. The 0039 migration
-- now becomes an idempotent no-op on existing databases (DROP COLUMN IF
-- EXISTS).
--
-- One-time prod cleanup of the 1500+ dropped-column placeholders requires a
-- table rebuild during a maintenance window — see scripts/repack-schools-directory.ts.

ALTER TABLE schools_directory
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Uganda',
  ADD COLUMN IF NOT EXISTS alternate_school_names TEXT,
  ADD COLUMN IF NOT EXISTS school_status TEXT NOT NULL DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS school_status_date DATE,
  ADD COLUMN IF NOT EXISTS current_partner_type TEXT NOT NULL DEFAULT 'NA',
  ADD COLUMN IF NOT EXISTS year_founded INTEGER,
  ADD COLUMN IF NOT EXISTS client_school_number INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metric_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS running_total_max_enrollment INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_partner_school BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS school_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS website TEXT;

CREATE INDEX IF NOT EXISTS idx_schools_directory_country
  ON schools_directory(country);

CREATE INDEX IF NOT EXISTS idx_schools_directory_status_partner
  ON schools_directory(school_status, current_partner_type);
