-- Migration: Remove unnecessary fields from schools directory
--
-- Originally dropped 13 columns from schools_directory. Combined with the
-- 0020 migration that re-added 10 of those columns each bootstrap, this
-- created a leak — every deploy added 10 fresh attributes and dropped them,
-- leaving dropped placeholders that count toward Postgres's 1600-column
-- per-table hard limit.
--
-- 0020 has been corrected to no longer add the columns this migration
-- dropped, so this migration's drops are now no-ops on every existing
-- database. The DROP statements are kept (idempotent IF EXISTS) so that any
-- DB still carrying live copies of these legacy columns is migrated cleanly,
-- but in practice they will not match.

ALTER TABLE schools_directory
  DROP COLUMN IF EXISTS denomination,
  DROP COLUMN IF EXISTS protestant_denomination,
  DROP COLUMN IF EXISTS account_record_type,
  DROP COLUMN IF EXISTS school_type,
  DROP COLUMN IF EXISTS parent_account_label,
  DROP COLUMN IF EXISTS school_relationship_status,
  DROP COLUMN IF EXISTS school_relationship_status_date,
  DROP COLUMN IF EXISTS first_metric_date,
  DROP COLUMN IF EXISTS partner_type,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS gps_lat,
  DROP COLUMN IF EXISTS gps_lng;
