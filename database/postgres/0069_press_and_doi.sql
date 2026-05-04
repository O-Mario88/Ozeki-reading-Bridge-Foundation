-- Migration 0069: Press desk + DOI registration (Phase 3 / Sprint 11).
--
-- Three tables:
--   media_kit_assets         — downloadable assets the press desk surfaces
--   fact_check_attestations  — every public stat with source + methodology
--                              + sample-size copy, used by the tooltip widget
--   zenodo_deposits          — record of pushes to Zenodo (see lib/zenodo)

CREATE TABLE IF NOT EXISTS media_kit_assets (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'logo', 'photo', 'pdf', 'fact_sheet', 'press_release', 'chart'
  )),
  download_url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  bytes BIGINT,
  display_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_kit_active
  ON media_kit_assets (display_order, slug)
  WHERE is_active IS TRUE;

CREATE TABLE IF NOT EXISTS fact_check_attestations (
  id BIGSERIAL PRIMARY KEY,
  stat_key TEXT NOT NULL UNIQUE,
  display_label TEXT NOT NULL,
  current_value TEXT,
  source_description TEXT NOT NULL,
  methodology TEXT NOT NULL,
  sample_size TEXT,
  last_recomputed_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_check_active
  ON fact_check_attestations (stat_key)
  WHERE is_active IS TRUE;

CREATE TABLE IF NOT EXISTS zenodo_deposits (
  id BIGSERIAL PRIMARY KEY,
  dataset_id BIGINT REFERENCES research_datasets(id) ON DELETE SET NULL,
  zenodo_record_id TEXT,
  doi TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'published', 'failed')),
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zenodo_deposits_dataset
  ON zenodo_deposits (dataset_id, created_at DESC);

COMMENT ON TABLE media_kit_assets IS
  'Downloadable assets surfaced on /press for journalists.';
COMMENT ON TABLE fact_check_attestations IS
  'Per-stat source / methodology / sample-size copy used by the fact-check tooltip on every public statistic.';
COMMENT ON TABLE zenodo_deposits IS
  'Audit log of dataset pushes to Zenodo. The actual API call is performed by lib/server/zenodo and writes back doi + zenodo_record_id on success.';

-- Seed a baseline set of fact-check attestations matching the public stats
-- the platform surfaces today. Only insert when empty so re-runs are idempotent.
INSERT INTO fact_check_attestations (stat_key, display_label, source_description, methodology, sample_size)
SELECT * FROM (VALUES
  ('learners_reached',
   'Learners reached',
   'Distinct learner_uid in assessment_records — every child the team has personally assessed at least once.',
   'COUNT(DISTINCT learner_uid). Recomputed live on each public-page render.',
   'All assessed learners since programme inception.'),
  ('teachers_trained',
   'Teachers trained',
   'Distinct teacher_uid across in-person training register and the portal training-attendance log (attended = true).',
   'UNION of training_participants.teacher_uid and portal_training_attendance.teacher_uid (attended), then COUNT(DISTINCT).',
   'All trained teachers since programme inception.'),
  ('schools_reached',
   'Schools reached',
   'Distinct schools in schools_directory currently flagged active.',
   'COUNT(*) FROM schools_directory WHERE school_active IS TRUE OR school_active IS NULL.',
   'All active partner schools.'),
  ('cost_per_learner_reached',
   'Cost per learner reached',
   'Programme-account expense (chart-of-accounts code 5xx, posted journal entries) ÷ distinct learners assessed.',
   'SUM(finance_journal_lines.debit) for COA 5xx expense accounts ÷ COUNT(DISTINCT learner_uid).',
   'Lifetime programme spend ÷ lifetime distinct learners.'),
  ('cost_per_learner_improved',
   'Cost per learner improved',
   'Programme spend ÷ learners whose latest endline reading_stage_order > earliest baseline reading_stage_order.',
   'Pair earliest baseline + latest endline per learner; "improved" = positive delta in reading_stage_order or story_reading_score fallback.',
   'Lifetime improved learners with valid baseline + endline pairs.')
) AS seed(stat_key, display_label, source_description, methodology, sample_size)
WHERE NOT EXISTS (SELECT 1 FROM fact_check_attestations);
