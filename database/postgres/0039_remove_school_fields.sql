-- Migration: Remove unnecessary fields from schools directory
-- Drops columns that are no longer needed for public dashboards or reporting

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
