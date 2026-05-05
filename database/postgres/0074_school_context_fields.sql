-- ============================================================================
-- 0074 — Reinstate school_type + ensure ownership exists
-- ============================================================================
-- Part of the Reading Intelligence refocus (2026-05-06): the school profile
-- now exposes School Type and Ownership as the only retained "school context"
-- fields, and the New/Edit School forms persist them through the API.
--
-- school_type was originally dropped by 0039. Migration 0039 has been
-- amended to no longer drop it (mirroring the 0020 correction) so this
-- ADD COLUMN won't be undone on the next bootstrap. ownership was already
-- added in 0035; we leave it untouched but reaffirm the column exists for
-- DBs that may have skipped 0035.
--
-- Idempotent (IF NOT EXISTS), additive only — no DROP. Constraint enforcement
-- is left to the application layer (form <select>) to keep the migration
-- backfill-safe; storing as TEXT means existing rows with legacy values are
-- not orphaned.
-- ============================================================================

ALTER TABLE schools_directory
  ADD COLUMN IF NOT EXISTS school_type TEXT,
  ADD COLUMN IF NOT EXISTS ownership TEXT;

COMMENT ON COLUMN schools_directory.school_type IS
  'Reading-context field. Allowed values (validated in app): Nursery, Primary, Nursery and Primary, Community Learning Centre, Other.';

COMMENT ON COLUMN schools_directory.ownership IS
  'Reading-context field. Allowed values (validated in app): Government Aided, Private, Community, Faith-Based, NGO / Foundation Supported, Other.';
