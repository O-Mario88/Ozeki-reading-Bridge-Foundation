-- Migration 0072: schema additions to power the Public Learning Outcomes
-- Dashboard with REAL values (not derivative approximations).
--
-- Three additions:
--
-- 1. assessment_records gets validation + timeliness + programme columns
--    so Valid & Usable Data %, Data Timeliness %, and Programme filter
--    can all compute from actual record fields (instead of being
--    approximated from completion %).
--
-- 2. teacher_lesson_observations gets six per-domain rubric scores so
--    the Teaching Quality observation card can render real per-domain
--    percentages (Lesson Structure / Instructional Delivery /
--    Learner Engagement / Assessment Practices / Use of Materials /
--    Classroom Environment), not a fidelity-derived approximation.
--
-- 3. Standardised reading_stage_label values are documented via a
--    column comment — the canonical public dashboard buckets are
--    Fluent / Developing / Emerging / Beginning.

/* ── 1. Assessment record validation + timeliness + programme ──── */
ALTER TABLE assessment_records
  ADD COLUMN IF NOT EXISTS validation_status TEXT
    CHECK (validation_status IN ('pending', 'valid', 'invalid', 'rejected')),
  ADD COLUMN IF NOT EXISTS validation_notes TEXT,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validated_by_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS programme_code TEXT;

CREATE INDEX IF NOT EXISTS idx_assessment_records_validation
  ON assessment_records (validation_status)
  WHERE validation_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_records_programme
  ON assessment_records (programme_code)
  WHERE programme_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_records_submitted_at
  ON assessment_records (submitted_at DESC)
  WHERE submitted_at IS NOT NULL;

COMMENT ON COLUMN assessment_records.validation_status IS
  'Per-record validation flag used to compute Valid & Usable Data % on the public dashboard. NULL = not yet validated (counts neither valid nor invalid).';
COMMENT ON COLUMN assessment_records.submitted_at IS
  'When the assessor submitted the record. Compared to assessment_date + reporting window to compute Data Timeliness %.';
COMMENT ON COLUMN assessment_records.programme_code IS
  'Programme that this assessment belongs to. Drives the Programme filter on the public dashboard.';

/* ── 2. Teacher observation per-domain rubric scores ──────────── */
ALTER TABLE teacher_lesson_observations
  ADD COLUMN IF NOT EXISTS lesson_structure_score INTEGER
    CHECK (lesson_structure_score IS NULL OR lesson_structure_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS instructional_delivery_score INTEGER
    CHECK (instructional_delivery_score IS NULL OR instructional_delivery_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS learner_engagement_score INTEGER
    CHECK (learner_engagement_score IS NULL OR learner_engagement_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS assessment_practices_score INTEGER
    CHECK (assessment_practices_score IS NULL OR assessment_practices_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS use_of_materials_score INTEGER
    CHECK (use_of_materials_score IS NULL OR use_of_materials_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS classroom_environment_score INTEGER
    CHECK (classroom_environment_score IS NULL OR classroom_environment_score BETWEEN 0 AND 100);

COMMENT ON COLUMN teacher_lesson_observations.lesson_structure_score IS
  '0–100 score for the Lesson Structure rubric domain. Drives the per-domain Teaching Quality card.';
COMMENT ON COLUMN teacher_lesson_observations.instructional_delivery_score IS
  '0–100 score for the Instructional Delivery rubric domain.';
COMMENT ON COLUMN teacher_lesson_observations.learner_engagement_score IS
  '0–100 score for the Learner Engagement rubric domain.';
COMMENT ON COLUMN teacher_lesson_observations.assessment_practices_score IS
  '0–100 score for the Assessment Practices rubric domain.';
COMMENT ON COLUMN teacher_lesson_observations.use_of_materials_score IS
  '0–100 score for the Use of Materials rubric domain.';
COMMENT ON COLUMN teacher_lesson_observations.classroom_environment_score IS
  '0–100 score for the Classroom Environment rubric domain.';

/* ── 3. Document the canonical reading-stage vocabulary ─────────── */
COMMENT ON COLUMN assessment_records.reading_stage_label IS
  'Canonical reading-stage label. Public dashboard bucket mapping: pre_reader → Beginning, emergent → Emerging, minimum → Emerging, competent → Developing, strong/fluent → Fluent. Use reading_stage_order (0–4) when available — labels are kept for display.';
