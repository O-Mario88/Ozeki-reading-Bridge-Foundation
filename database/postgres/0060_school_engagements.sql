-- Migration 0060: School engagements + assessment stage + provenance links
--
-- Introduces a per-school × cycle container so every training, coaching visit
-- and assessment in an engagement window can be attributed together. This is
-- the analytical spine for "did Ozeki's work move the needle on reading for
-- this school?" — without it, the best we can do is activity counting.
--
-- What this migration does:
--   1. Creates school_engagements (the parent) with FKs to schools_directory,
--      portal_records (training), and assessment_schedule_windows.
--   2. Adds a nullable engagement_id FK to assessment_records, coaching_visits,
--      lesson_evaluations, and teacher_lesson_observations. Legacy rows stay
--      valid (NULL); the application layer requires it on new writes.
--   3. Adds a stage column to assessment_records (baseline|mid|endline) so the
--      delta-over-engagement KPI is computable.
--   4. Adds a deferred FK from lesson_evaluations.visit_id → coaching_visits(id)
--      so the visit→observation chain is now enforced (was nullable text link).
--   5. Ships an engagement-summary view for dashboards.
--
-- The migration is idempotent (IF NOT EXISTS / defensive DO blocks) and
-- non-breaking — all additions are nullable, and existing indexes/FKs stay.

BEGIN;

-- 1. Parent container
CREATE TABLE IF NOT EXISTS school_engagements (
  id                         SERIAL PRIMARY KEY,
  school_id                  INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  label                      TEXT NOT NULL,
  cohort_code                TEXT,
  academic_year              INTEGER,
  term_number                INTEGER CHECK (term_number IS NULL OR term_number BETWEEN 1 AND 3),
  grade                      TEXT,
  training_id                INTEGER REFERENCES portal_records(id) ON DELETE SET NULL,
  assessment_window_id       INTEGER REFERENCES assessment_schedule_windows(id) ON DELETE SET NULL,
  start_date                 DATE,
  end_date                   DATE,
  status                     TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  goal_description           TEXT,
  notes                      TEXT,
  created_by_user_id         INTEGER REFERENCES portal_users(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT school_engagements_period_sane
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_school_engagements_school
  ON school_engagements(school_id, academic_year, term_number);

CREATE INDEX IF NOT EXISTS idx_school_engagements_training
  ON school_engagements(training_id)
  WHERE training_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_school_engagements_status_dates
  ON school_engagements(status, start_date, end_date);

-- 2. Attach engagement_id to the four activity tables (nullable for back-compat)
ALTER TABLE assessment_records
  ADD COLUMN IF NOT EXISTS engagement_id INTEGER REFERENCES school_engagements(id) ON DELETE SET NULL;

ALTER TABLE coaching_visits
  ADD COLUMN IF NOT EXISTS engagement_id INTEGER REFERENCES school_engagements(id) ON DELETE SET NULL;

ALTER TABLE lesson_evaluations
  ADD COLUMN IF NOT EXISTS engagement_id INTEGER REFERENCES school_engagements(id) ON DELETE SET NULL;

-- teacher_lesson_observations may not exist on very old environments; guard it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_lesson_observations') THEN
    EXECUTE $sql$
      ALTER TABLE teacher_lesson_observations
        ADD COLUMN IF NOT EXISTS engagement_id INTEGER REFERENCES school_engagements(id) ON DELETE SET NULL
    $sql$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessment_records_engagement
  ON assessment_records(engagement_id)
  WHERE engagement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coaching_visits_engagement
  ON coaching_visits(engagement_id)
  WHERE engagement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lesson_evaluations_engagement
  ON lesson_evaluations(engagement_id)
  WHERE engagement_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'teacher_lesson_observations' AND column_name = 'engagement_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_teacher_lesson_observations_engagement
             ON teacher_lesson_observations(engagement_id)
             WHERE engagement_id IS NOT NULL';
  END IF;
END $$;

-- 3. Assessment stage (baseline | mid | endline)
ALTER TABLE assessment_records
  ADD COLUMN IF NOT EXISTS stage TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assessment_records_stage_check'
  ) THEN
    ALTER TABLE assessment_records
      ADD CONSTRAINT assessment_records_stage_check
      CHECK (stage IS NULL OR stage IN ('baseline', 'mid', 'endline'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessment_records_engagement_stage
  ON assessment_records(engagement_id, stage)
  WHERE engagement_id IS NOT NULL AND stage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_records_school_stage_date
  ON assessment_records(school_id, stage, assessment_date)
  WHERE stage IS NOT NULL;

-- 4. Enforce the lesson_evaluations → coaching_visits FK (was nullable text link)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_evaluations' AND column_name = 'visit_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lesson_evaluations_visit_fk'
  ) THEN
    -- Orphaned visit_ids would break the FK; null them first so the constraint holds.
    UPDATE lesson_evaluations le
       SET visit_id = NULL
     WHERE visit_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM coaching_visits cv WHERE cv.id = le.visit_id);

    ALTER TABLE lesson_evaluations
      ADD CONSTRAINT lesson_evaluations_visit_fk
      FOREIGN KEY (visit_id) REFERENCES coaching_visits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Engagement summary view — used by dashboards + reports
CREATE OR REPLACE VIEW v_school_engagement_summary AS
SELECT
  e.id                                                     AS engagement_id,
  e.school_id,
  e.label,
  e.cohort_code,
  e.academic_year,
  e.term_number,
  e.grade,
  e.training_id,
  e.assessment_window_id,
  e.status,
  e.start_date,
  e.end_date,
  (SELECT COUNT(*) FROM coaching_visits cv
    WHERE cv.engagement_id = e.id)                         AS visits_count,
  (SELECT COUNT(*) FROM lesson_evaluations le
    WHERE le.engagement_id = e.id
      AND COALESCE(le.status, 'active') = 'active')        AS lesson_evaluations_count,
  (SELECT COUNT(*) FROM assessment_records ar
    WHERE ar.engagement_id = e.id AND ar.stage = 'baseline') AS assessments_baseline,
  (SELECT COUNT(*) FROM assessment_records ar
    WHERE ar.engagement_id = e.id AND ar.stage = 'mid')     AS assessments_mid,
  (SELECT COUNT(*) FROM assessment_records ar
    WHERE ar.engagement_id = e.id AND ar.stage = 'endline') AS assessments_endline
FROM school_engagements e;

COMMIT;
