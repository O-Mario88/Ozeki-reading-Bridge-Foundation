-- Migration 0053: Materialised KPI Snapshots + Triggers
-- Denormalises expensive aggregates into snapshot tables that triggers keep fresh
-- as new assessments, visits, and trainings land. The public dashboard reads
-- these snapshots instead of re-aggregating millions of rows on every request.

-- ──────────────────────────────────────────────────────────────────────────
-- SCHOOL KPI SNAPSHOT
-- One row per school, refreshed whenever underlying data changes.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_kpi_snapshot (
  school_id INTEGER PRIMARY KEY REFERENCES schools_directory(id) ON DELETE CASCADE,
  district TEXT,
  region TEXT,
  last_assessment_date DATE,
  last_coaching_visit_date DATE,
  last_training_date DATE,
  days_since_last_visit INTEGER,
  days_since_last_training INTEGER,
  total_assessments INTEGER NOT NULL DEFAULT 0,
  total_learners_assessed INTEGER NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_observations INTEGER NOT NULL DEFAULT 0,
  total_trainings INTEGER NOT NULL DEFAULT 0,
  avg_composite_baseline NUMERIC(5,2),
  avg_composite_endline NUMERIC(5,2),
  composite_delta NUMERIC(5,2),
  red_mastery_ratio NUMERIC(4,3),
  health_score INTEGER,
  at_risk_flag BOOLEAN NOT NULL DEFAULT FALSE,
  trajectory_band TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_kpi_district ON school_kpi_snapshot(district);
CREATE INDEX IF NOT EXISTS idx_school_kpi_region ON school_kpi_snapshot(region);
CREATE INDEX IF NOT EXISTS idx_school_kpi_at_risk ON school_kpi_snapshot(at_risk_flag);
CREATE INDEX IF NOT EXISTS idx_school_kpi_health ON school_kpi_snapshot(health_score);

-- ──────────────────────────────────────────────────────────────────────────
-- DISTRICT + NATIONAL KPI SNAPSHOTS (rollups of school-level)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS district_kpi_snapshot (
  district TEXT PRIMARY KEY,
  region TEXT,
  schools_count INTEGER NOT NULL DEFAULT 0,
  at_risk_schools INTEGER NOT NULL DEFAULT 0,
  total_learners_assessed INTEGER NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 0,
  avg_composite_endline NUMERIC(5,2),
  avg_composite_delta NUMERIC(5,2),
  avg_health_score INTEGER,
  coverage_pct INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS national_kpi_snapshot (
  id INTEGER PRIMARY KEY DEFAULT 1,
  schools_count INTEGER NOT NULL DEFAULT 0,
  districts_count INTEGER NOT NULL DEFAULT 0,
  at_risk_schools INTEGER NOT NULL DEFAULT 0,
  total_learners_assessed INTEGER NOT NULL DEFAULT 0,
  total_teachers_supported INTEGER NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_observations INTEGER NOT NULL DEFAULT 0,
  total_trainings INTEGER NOT NULL DEFAULT 0,
  total_certificates_issued INTEGER NOT NULL DEFAULT 0,
  avg_composite_endline NUMERIC(5,2),
  avg_composite_delta NUMERIC(5,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

-- ──────────────────────────────────────────────────────────────────────────
-- REFRESH FUNCTION: recomputes one school's row from live data
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_school_kpi_snapshot(target_school_id INTEGER)
RETURNS VOID AS $$
DECLARE
  school_rec RECORD;
  assess_rec RECORD;
  composite_pre NUMERIC;
  composite_post NUMERIC;
  health INTEGER;
  band TEXT;
  red_ratio NUMERIC;
BEGIN
  -- Gather per-school metrics
  SELECT s.district, s.region INTO school_rec
  FROM schools_directory s WHERE s.id = target_school_id;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT
    COUNT(*) FILTER (WHERE assessment_type IS NOT NULL) AS total_assessments,
    COUNT(DISTINCT learner_uid) FILTER (WHERE learner_uid IS NOT NULL) AS total_learners,
    MAX(assessment_date) AS last_assessment
  INTO assess_rec
  FROM assessment_records WHERE school_id = target_school_id;

  SELECT AVG((
    COALESCE(letter_identification_score, 0) +
    COALESCE(sound_identification_score, 0) +
    COALESCE(decodable_words_score, 0) +
    COALESCE(made_up_words_score, 0) +
    COALESCE(story_reading_score, 0) +
    COALESCE(reading_comprehension_score, 0)
  ) / 6.0) INTO composite_pre
  FROM assessment_records
  WHERE school_id = target_school_id AND assessment_type = 'baseline';

  SELECT AVG((
    COALESCE(letter_identification_score, 0) +
    COALESCE(sound_identification_score, 0) +
    COALESCE(decodable_words_score, 0) +
    COALESCE(made_up_words_score, 0) +
    COALESCE(story_reading_score, 0) +
    COALESCE(reading_comprehension_score, 0)
  ) / 6.0) INTO composite_post
  FROM assessment_records
  WHERE school_id = target_school_id AND assessment_type = 'endline';

  SELECT COALESCE(
    COUNT(*) FILTER (WHERE
      comprehension_mastery_status = 'red'
      OR blending_decoding_mastery_status = 'red'
      OR phonemic_awareness_mastery_status = 'red'
    )::NUMERIC / NULLIF(COUNT(*), 0),
    0
  ) INTO red_ratio
  FROM assessment_records
  WHERE school_id = target_school_id
    AND assessment_date >= CURRENT_DATE - INTERVAL '180 days';

  -- Compose health score (simple weighted average)
  health := COALESCE(ROUND(50
            + (COALESCE(composite_post, 0) * 10)
            - (red_ratio * 30)
            + CASE WHEN composite_pre IS NOT NULL AND composite_post IS NOT NULL
                   THEN LEAST(20, GREATEST(-20, (composite_post - composite_pre) * 5))
                   ELSE 0 END), 50);

  band := CASE
    WHEN composite_pre IS NULL OR composite_post IS NULL THEN 'insufficient_data'
    WHEN composite_post - composite_pre >= 0.5 THEN 'improving'
    WHEN composite_post - composite_pre <= -0.5 THEN 'declining'
    ELSE 'stable'
  END;

  INSERT INTO school_kpi_snapshot (
    school_id, district, region,
    last_assessment_date, last_coaching_visit_date, last_training_date,
    days_since_last_visit, days_since_last_training,
    total_assessments, total_learners_assessed,
    total_visits, total_observations, total_trainings,
    avg_composite_baseline, avg_composite_endline, composite_delta,
    red_mastery_ratio, health_score, at_risk_flag, trajectory_band,
    updated_at
  )
  VALUES (
    target_school_id, school_rec.district, school_rec.region,
    assess_rec.last_assessment,
    (SELECT MAX(visit_date) FROM coaching_visits WHERE school_id = target_school_id),
    (SELECT MAX(date) FROM portal_records WHERE module = 'training' AND school_id = target_school_id),
    (SELECT (CURRENT_DATE - MAX(visit_date))::int FROM coaching_visits WHERE school_id = target_school_id),
    (SELECT (CURRENT_DATE - MAX(date))::int FROM portal_records WHERE module = 'training' AND school_id = target_school_id),
    COALESCE(assess_rec.total_assessments, 0),
    COALESCE(assess_rec.total_learners, 0),
    (SELECT COUNT(*) FROM coaching_visits WHERE school_id = target_school_id),
    (SELECT COUNT(*) FROM teacher_lesson_observations WHERE school_id = target_school_id),
    (SELECT COUNT(*) FROM portal_records WHERE module = 'training' AND school_id = target_school_id),
    ROUND(composite_pre::numeric, 2),
    ROUND(composite_post::numeric, 2),
    CASE WHEN composite_pre IS NOT NULL AND composite_post IS NOT NULL
         THEN ROUND((composite_post - composite_pre)::numeric, 2) ELSE NULL END,
    ROUND(red_ratio::numeric, 3),
    health,
    (red_ratio >= 0.3 AND COALESCE(assess_rec.total_assessments, 0) >= 10),
    band,
    NOW()
  )
  ON CONFLICT (school_id) DO UPDATE SET
    district = EXCLUDED.district,
    region = EXCLUDED.region,
    last_assessment_date = EXCLUDED.last_assessment_date,
    last_coaching_visit_date = EXCLUDED.last_coaching_visit_date,
    last_training_date = EXCLUDED.last_training_date,
    days_since_last_visit = EXCLUDED.days_since_last_visit,
    days_since_last_training = EXCLUDED.days_since_last_training,
    total_assessments = EXCLUDED.total_assessments,
    total_learners_assessed = EXCLUDED.total_learners_assessed,
    total_visits = EXCLUDED.total_visits,
    total_observations = EXCLUDED.total_observations,
    total_trainings = EXCLUDED.total_trainings,
    avg_composite_baseline = EXCLUDED.avg_composite_baseline,
    avg_composite_endline = EXCLUDED.avg_composite_endline,
    composite_delta = EXCLUDED.composite_delta,
    red_mastery_ratio = EXCLUDED.red_mastery_ratio,
    health_score = EXCLUDED.health_score,
    at_risk_flag = EXCLUDED.at_risk_flag,
    trajectory_band = EXCLUDED.trajectory_band,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- REFRESH DISTRICT + NATIONAL
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_district_kpi_snapshots()
RETURNS VOID AS $$
BEGIN
  INSERT INTO district_kpi_snapshot (
    district, region, schools_count, at_risk_schools,
    total_learners_assessed, total_visits,
    avg_composite_endline, avg_composite_delta, avg_health_score, coverage_pct, updated_at
  )
  SELECT district,
         MAX(region),
         COUNT(*),
         COUNT(*) FILTER (WHERE at_risk_flag IS TRUE),
         SUM(total_learners_assessed),
         SUM(total_visits),
         AVG(avg_composite_endline)::numeric(5,2),
         AVG(composite_delta)::numeric(5,2),
         AVG(health_score)::int,
         ROUND(100.0 * COUNT(*) FILTER (WHERE total_visits > 0) / COUNT(*))::int,
         NOW()
  FROM school_kpi_snapshot
  WHERE district IS NOT NULL AND district <> ''
  GROUP BY district
  ON CONFLICT (district) DO UPDATE SET
    region = EXCLUDED.region,
    schools_count = EXCLUDED.schools_count,
    at_risk_schools = EXCLUDED.at_risk_schools,
    total_learners_assessed = EXCLUDED.total_learners_assessed,
    total_visits = EXCLUDED.total_visits,
    avg_composite_endline = EXCLUDED.avg_composite_endline,
    avg_composite_delta = EXCLUDED.avg_composite_delta,
    avg_health_score = EXCLUDED.avg_health_score,
    coverage_pct = EXCLUDED.coverage_pct,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_national_kpi_snapshot()
RETURNS VOID AS $$
BEGIN
  INSERT INTO national_kpi_snapshot (
    id, schools_count, districts_count, at_risk_schools,
    total_learners_assessed, total_teachers_supported, total_visits,
    total_observations, total_trainings, total_certificates_issued,
    avg_composite_endline, avg_composite_delta, updated_at
  )
  VALUES (
    1,
    (SELECT COUNT(*) FROM schools_directory WHERE program_status = 'active'),
    (SELECT COUNT(DISTINCT district) FROM schools_directory WHERE district IS NOT NULL),
    (SELECT COUNT(*) FROM school_kpi_snapshot WHERE at_risk_flag IS TRUE),
    (SELECT SUM(total_learners_assessed) FROM school_kpi_snapshot),
    (SELECT COUNT(DISTINCT teacher_uid) FROM teacher_roster),
    (SELECT COUNT(*) FROM coaching_visits),
    (SELECT COUNT(*) FROM teacher_lesson_observations WHERE status = 'submitted'),
    (SELECT COUNT(*) FROM portal_records WHERE module = 'training'),
    (SELECT COUNT(*) FROM portal_training_attendance WHERE certificate_status = 'Issued')
      + (SELECT COUNT(*) FROM lesson_completion WHERE certificate_eligible IS TRUE),
    (SELECT AVG(avg_composite_endline) FROM school_kpi_snapshot),
    (SELECT AVG(composite_delta) FROM school_kpi_snapshot),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    schools_count = EXCLUDED.schools_count,
    districts_count = EXCLUDED.districts_count,
    at_risk_schools = EXCLUDED.at_risk_schools,
    total_learners_assessed = EXCLUDED.total_learners_assessed,
    total_teachers_supported = EXCLUDED.total_teachers_supported,
    total_visits = EXCLUDED.total_visits,
    total_observations = EXCLUDED.total_observations,
    total_trainings = EXCLUDED.total_trainings,
    total_certificates_issued = EXCLUDED.total_certificates_issued,
    avg_composite_endline = EXCLUDED.avg_composite_endline,
    avg_composite_delta = EXCLUDED.avg_composite_delta,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- TRIGGERS: refresh snapshots when underlying data changes
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_refresh_school_from_assessment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_school_kpi_snapshot(COALESCE(NEW.school_id, OLD.school_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assessment_kpi_refresh ON assessment_records;
CREATE TRIGGER trg_assessment_kpi_refresh
AFTER INSERT OR UPDATE OR DELETE ON assessment_records
FOR EACH ROW EXECUTE FUNCTION trg_refresh_school_from_assessment();

CREATE OR REPLACE FUNCTION trg_refresh_school_from_visit()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_school_kpi_snapshot(COALESCE(NEW.school_id, OLD.school_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_visit_kpi_refresh ON coaching_visits;
CREATE TRIGGER trg_visit_kpi_refresh
AFTER INSERT OR UPDATE OR DELETE ON coaching_visits
FOR EACH ROW EXECUTE FUNCTION trg_refresh_school_from_visit();

CREATE OR REPLACE FUNCTION trg_refresh_school_from_observation()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.school_id IS NOT NULL OR OLD.school_id IS NOT NULL) THEN
    PERFORM refresh_school_kpi_snapshot(COALESCE(NEW.school_id, OLD.school_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_observation_kpi_refresh ON teacher_lesson_observations;
CREATE TRIGGER trg_observation_kpi_refresh
AFTER INSERT OR UPDATE OR DELETE ON teacher_lesson_observations
FOR EACH ROW EXECUTE FUNCTION trg_refresh_school_from_observation();

-- ──────────────────────────────────────────────────────────────────────────
-- TRIGGERS: keep lesson_view_summary fresh
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_refresh_lesson_view_summary()
RETURNS TRIGGER AS $$
DECLARE
  target_lesson_id INTEGER;
BEGIN
  target_lesson_id := COALESCE(NEW.recorded_lesson_id, OLD.recorded_lesson_id);
  IF target_lesson_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  INSERT INTO lesson_view_summary (
    recorded_lesson_id, total_views, unique_viewers,
    registered_viewers, guest_views, total_watch_seconds,
    average_watch_seconds, completion_rate, rewatch_count, last_viewed_at, updated_at
  )
  SELECT
    target_lesson_id,
    COUNT(*),
    COUNT(DISTINCT COALESCE(user_id::text, ip_hash, session_id)),
    COUNT(*) FILTER (WHERE user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE user_id IS NULL),
    COALESCE(SUM(watch_seconds), 0),
    COALESCE(AVG(watch_seconds)::int, 0),
    COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE completed IS TRUE) / NULLIF(COUNT(*), 0))::int, 0),
    COUNT(*) FILTER (WHERE is_rewatch IS TRUE),
    MAX(last_event_at),
    NOW()
  FROM lesson_view_sessions
  WHERE recorded_lesson_id = target_lesson_id
  ON CONFLICT (recorded_lesson_id) DO UPDATE SET
    total_views = EXCLUDED.total_views,
    unique_viewers = EXCLUDED.unique_viewers,
    registered_viewers = EXCLUDED.registered_viewers,
    guest_views = EXCLUDED.guest_views,
    total_watch_seconds = EXCLUDED.total_watch_seconds,
    average_watch_seconds = EXCLUDED.average_watch_seconds,
    completion_rate = EXCLUDED.completion_rate,
    rewatch_count = EXCLUDED.rewatch_count,
    last_viewed_at = EXCLUDED.last_viewed_at,
    updated_at = NOW();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lesson_view_summary_refresh ON lesson_view_sessions;
CREATE TRIGGER trg_lesson_view_summary_refresh
AFTER INSERT OR UPDATE OR DELETE ON lesson_view_sessions
FOR EACH ROW EXECUTE FUNCTION trg_refresh_lesson_view_summary();
