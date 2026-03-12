ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS child_name TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS child_id TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS computed_reading_level TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS computed_level_band INTEGER;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS reading_rules_version TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS reading_level_computed_at TIMESTAMPTZ;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS source_portal_record_id INTEGER REFERENCES portal_records(id) ON DELETE SET NULL;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS source_row_key TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS learner_expected_grade TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS mastery_profile_summary_json TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS stage_reason_code TEXT;
ALTER TABLE assessment_records ADD COLUMN IF NOT EXISTS stage_reason_summary TEXT;

CREATE INDEX IF NOT EXISTS idx_assessment_records_source_portal
  ON assessment_records(source_portal_record_id);
CREATE INDEX IF NOT EXISTS idx_assessment_records_learner_uid
  ON assessment_records(learner_uid);
