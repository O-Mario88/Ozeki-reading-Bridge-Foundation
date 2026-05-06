-- Migration 0058: bring coaching_visits column set in line with the repository.
-- coaching-visits.ts has been writing visit_reasons_json, time_from, time_to,
-- sponsorship_type, sponsored_by_contact_id — none of which existed in the
-- table after 0007_operational_delivery, so every save was crashing.
-- These additions are non-breaking; existing rows back-fill to NULL.

ALTER TABLE coaching_visits ADD COLUMN IF NOT EXISTS visit_reasons_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE coaching_visits ADD COLUMN IF NOT EXISTS time_from TIME;
ALTER TABLE coaching_visits ADD COLUMN IF NOT EXISTS time_to TIME;
ALTER TABLE coaching_visits ADD COLUMN IF NOT EXISTS sponsorship_type TEXT;
-- school_contacts uses contact_id as its PK, not id (see 0001_foundation.sql).
-- Original FK clause referenced the wrong column and broke fresh-DB bootstrap.
ALTER TABLE coaching_visits ADD COLUMN IF NOT EXISTS sponsored_by_contact_id INTEGER REFERENCES school_contacts(contact_id) ON DELETE SET NULL;

-- Helpful composite index for the visits-by-school listing
CREATE INDEX IF NOT EXISTS idx_coaching_visits_school_date
  ON coaching_visits (school_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_visits_coach_date
  ON coaching_visits (coach_user_id, visit_date DESC)
  WHERE coach_user_id IS NOT NULL;

COMMENT ON COLUMN coaching_visits.visit_reasons_json IS 'JSON array of reasons for the visit (multi-select).';
COMMENT ON COLUMN coaching_visits.sponsorship_type IS 'When a sponsor funded this visit, which tier (school/district/region).';
COMMENT ON COLUMN coaching_visits.sponsored_by_contact_id IS 'Optional FK to school_contacts identifying the sponsor.';

-- ============================================================================
-- Legacy lesson_evaluations: bring back the columns the repository expects.
-- The repository at src/lib/server/postgres/repositories/lesson-evaluations.ts
-- references 7 columns that were never present in the latest schema. Adding
-- them as nullable means existing rows survive and INSERT/UPDATE stops crashing.
-- The newer teacher_lesson_observations system continues to be canonical for
-- new submissions; lesson_evaluations remains for historical and CRM lookup.
-- ============================================================================

ALTER TABLE lesson_evaluations ADD COLUMN IF NOT EXISTS lesson_duration_minutes INTEGER;
ALTER TABLE lesson_evaluations ADD COLUMN IF NOT EXISTS observer_name_text TEXT;
ALTER TABLE lesson_evaluations ADD COLUMN IF NOT EXISTS lesson_structure_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE lesson_evaluations ADD COLUMN IF NOT EXISTS strengths_list_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE lesson_evaluations ADD COLUMN IF NOT EXISTS areas_for_development_list_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE lesson_evaluations ADD COLUMN IF NOT EXISTS action_plan_json TEXT;
ALTER TABLE lesson_evaluations ADD COLUMN IF NOT EXISTS post_observation_rating TEXT;
