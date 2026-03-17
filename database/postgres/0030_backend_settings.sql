CREATE TABLE IF NOT EXISTS assessment_model_settings (
  id INTEGER PRIMARY KEY,
  model_version TEXT NOT NULL,
  benchmark_version TEXT NOT NULL,
  scoring_profile_version TEXT NOT NULL,
  item_weights_json TEXT NOT NULL,
  mastery_thresholds_json TEXT NOT NULL,
  latency_thresholds_json TEXT NOT NULL,
  attempt_thresholds_json TEXT NOT NULL,
  benchmark_expectations_json TEXT NOT NULL,
  stage_metadata_json TEXT NOT NULL,
  public_explanations_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS assessment_benchmark_settings (
  id INTEGER PRIMARY KEY,
  reading_level_version TEXT NOT NULL DEFAULT 'UG-RLv1',
  emergent_cwpm_max INTEGER NOT NULL DEFAULT 19,
  minimum_cwpm_max INTEGER NOT NULL DEFAULT 39,
  competent_cwpm_max INTEGER NOT NULL DEFAULT 59,
  comprehension_min_percent DOUBLE PRECISION NOT NULL DEFAULT 70,
  comprehension_min_score DOUBLE PRECISION NOT NULL DEFAULT 4,
  comprehension_total_items DOUBLE PRECISION NOT NULL DEFAULT 5,
  use_accuracy_floor BOOLEAN NOT NULL DEFAULT FALSE,
  accuracy_floor DOUBLE PRECISION NOT NULL DEFAULT 90,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS school_support_settings (
  id INTEGER PRIMARY KEY,
  rules_version TEXT NOT NULL DEFAULT 'UG-Support-v1',
  non_readers_threshold DOUBLE PRECISION NOT NULL DEFAULT 30,
  below_minimum_threshold DOUBLE PRECISION NOT NULL DEFAULT 55,
  decoding_proficiency_threshold DOUBLE PRECISION NOT NULL DEFAULT 45,
  progress_min_below_minimum_drop DOUBLE PRECISION NOT NULL DEFAULT 5,
  progress_min_cwpm20_gain DOUBLE PRECISION NOT NULL DEFAULT 5,
  graduation_prep_below_minimum_max DOUBLE PRECISION NOT NULL DEFAULT 20,
  graduation_prep_at40_min DOUBLE PRECISION NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS teacher_support_settings (
  id INTEGER PRIMARY KEY,
  rules_version TEXT NOT NULL DEFAULT 'UG-TeacherSupport-v1',
  catchup_overall_threshold DOUBLE PRECISION NOT NULL DEFAULT 60,
  critical_domain_threshold DOUBLE PRECISION NOT NULL DEFAULT 55,
  on_track_overall_threshold DOUBLE PRECISION NOT NULL DEFAULT 75,
  on_track_min_delta DOUBLE PRECISION NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

INSERT INTO assessment_model_settings (
  id,
  model_version,
  benchmark_version,
  scoring_profile_version,
  item_weights_json,
  mastery_thresholds_json,
  latency_thresholds_json,
  attempt_thresholds_json,
  benchmark_expectations_json,
  stage_metadata_json,
  public_explanations_json
)
SELECT
  1,
  'UG-MASTERY-ONETEST-STYLE-v1',
  'UG-MASTERY-BENCHMARK-v1',
  'UG-MASTERY-SCORING-v1',
  '{"accuracy":0.7,"latency":0.2,"attemptSupport":0.1}',
  '{"greenMin":80,"amberMin":50,"forceRedIfAccuracyBelow":40,"downgradeGreenIfSupportAbove":35,"highAccuracyForLatencyCheck":80}',
  '{"phonemic_awareness":{"fast":2000,"developing":4500,"slowCap":9000},"grapheme_phoneme_correspondence":{"fast":2200,"developing":4800,"slowCap":9000},"blending_decoding":{"fast":2500,"developing":5200,"slowCap":10000},"word_recognition_fluency":{"fast":1800,"developing":3500,"slowCap":7000},"sentence_paragraph_construction":{"fast":2500,"developing":5500,"slowCap":10500},"comprehension":{"fast":2800,"developing":6500,"slowCap":12000}}',
  '{"firstTryIdeal":1,"amberAttemptsMax":2,"redAttemptsMin":3}',
  '{"gradeToExpectedStageOrder":{"Baby":1,"Middle":1,"Top":2,"P1":2,"P2":3,"P3":4,"P4":5,"P5":5,"P6":5,"P7":5},"ageToExpectedStageOrder":{"5":1,"6":2,"7":3,"8":4,"9":5,"10":5,"11":5,"12":5}}',
  '{}',
  '{}'
WHERE NOT EXISTS (
  SELECT 1 FROM assessment_model_settings WHERE id = 1
);

UPDATE assessment_model_settings
SET
  model_version = 'UG-MASTERY-ONETEST-STYLE-v1',
  benchmark_version = 'UG-MASTERY-BENCHMARK-v1',
  scoring_profile_version = 'UG-MASTERY-SCORING-v1',
  item_weights_json = '{"accuracy":0.7,"latency":0.2,"attemptSupport":0.1}',
  mastery_thresholds_json = '{"greenMin":80,"amberMin":50,"forceRedIfAccuracyBelow":40,"downgradeGreenIfSupportAbove":35,"highAccuracyForLatencyCheck":80}',
  latency_thresholds_json = '{"phonemic_awareness":{"fast":2000,"developing":4500,"slowCap":9000},"grapheme_phoneme_correspondence":{"fast":2200,"developing":4800,"slowCap":9000},"blending_decoding":{"fast":2500,"developing":5200,"slowCap":10000},"word_recognition_fluency":{"fast":1800,"developing":3500,"slowCap":7000},"sentence_paragraph_construction":{"fast":2500,"developing":5500,"slowCap":10500},"comprehension":{"fast":2800,"developing":6500,"slowCap":12000}}',
  attempt_thresholds_json = '{"firstTryIdeal":1,"amberAttemptsMax":2,"redAttemptsMin":3}',
  benchmark_expectations_json = '{"gradeToExpectedStageOrder":{"Baby":1,"Middle":1,"Top":2,"P1":2,"P2":3,"P3":4,"P4":5,"P5":5,"P6":5,"P7":5},"ageToExpectedStageOrder":{"5":1,"6":2,"7":3,"8":4,"9":5,"10":5,"11":5,"12":5}}',
  updated_at = NOW()
WHERE id = 1
  AND (
    model_version = 'UG-MASTERY-ONETEST-v1'
    OR benchmark_version = 'UG-RLv1'
  );

INSERT INTO assessment_benchmark_settings (
  id,
  reading_level_version,
  emergent_cwpm_max,
  minimum_cwpm_max,
  competent_cwpm_max,
  comprehension_min_percent,
  comprehension_min_score,
  comprehension_total_items,
  use_accuracy_floor,
  accuracy_floor
)
SELECT
  1,
  'UG-RLv1',
  19,
  39,
  59,
  70,
  4,
  5,
  FALSE,
  90
WHERE NOT EXISTS (
  SELECT 1 FROM assessment_benchmark_settings WHERE id = 1
);

INSERT INTO school_support_settings (
  id,
  rules_version,
  non_readers_threshold,
  below_minimum_threshold,
  decoding_proficiency_threshold,
  progress_min_below_minimum_drop,
  progress_min_cwpm20_gain,
  graduation_prep_below_minimum_max,
  graduation_prep_at40_min
)
SELECT
  1,
  'UG-Support-v1',
  30,
  55,
  45,
  5,
  5,
  20,
  60
WHERE NOT EXISTS (
  SELECT 1 FROM school_support_settings WHERE id = 1
);

INSERT INTO teacher_support_settings (
  id,
  rules_version,
  catchup_overall_threshold,
  critical_domain_threshold,
  on_track_overall_threshold,
  on_track_min_delta
)
SELECT
  1,
  'UG-TeacherSupport-v1',
  60,
  55,
  75,
  5
WHERE NOT EXISTS (
  SELECT 1 FROM teacher_support_settings WHERE id = 1
);
