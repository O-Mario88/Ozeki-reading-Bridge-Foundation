import { queryPostgres } from "@/lib/server/postgres/client";

/* ────────────────────────────────────────────────────────────────────────── */
/* National Benchmarks — reading norms by grade × term                        */
/* ────────────────────────────────────────────────────────────────────────── */

export type NationalBenchmark = {
  grade: string;
  cycleType: "baseline" | "progress" | "endline";
  learnersAssessed: number;
  letterIdentification: number | null;
  soundIdentification: number | null;
  decodableWords: number | null;
  fluencyAccuracy: number | null;
  readingComprehension: number | null;
  compositeAvg: number | null;
  atOrAboveBenchmarkPct: number;
};

export type NationalBenchmarkReport = {
  asOf: string;
  totalLearnersAssessed: number;
  benchmarks: NationalBenchmark[];
};

export async function getNationalBenchmarksPostgres(): Promise<NationalBenchmarkReport> {
  const res = await queryPostgres(
    `SELECT
       class_grade,
       assessment_type,
       COUNT(DISTINCT learner_uid)::int AS n,
       AVG(letter_identification_score)::numeric AS letter,
       AVG(sound_identification_score)::numeric AS sound,
       AVG(decodable_words_score)::numeric AS decodable,
       AVG(fluency_accuracy_score)::numeric AS fluency,
       AVG(reading_comprehension_score)::numeric AS comp,
       AVG(
         (COALESCE(letter_identification_score,0) +
          COALESCE(sound_identification_score,0) +
          COALESCE(decodable_words_score,0) +
          COALESCE(fluency_accuracy_score,0) +
          COALESCE(reading_comprehension_score,0)) / 5.0
       )::numeric AS composite,
       (COUNT(*) FILTER (
         WHERE LOWER(COALESCE(expected_vs_actual_status, '')) LIKE '%meet%'
            OR LOWER(COALESCE(expected_vs_actual_status, '')) LIKE '%exceed%'
            OR LOWER(COALESCE(expected_vs_actual_status, '')) LIKE '%on%track%'
       )::numeric / NULLIF(COUNT(*), 0) * 100)::numeric AS at_benchmark_pct
     FROM assessment_records
     WHERE class_grade IS NOT NULL AND class_grade <> ''
       AND assessment_type IS NOT NULL
     GROUP BY class_grade, assessment_type
     HAVING COUNT(DISTINCT learner_uid) >= 10
     ORDER BY class_grade ASC,
       CASE assessment_type WHEN 'baseline' THEN 1 WHEN 'progress' THEN 2 WHEN 'endline' THEN 3 ELSE 4 END`,
  );

  const round1 = (n: unknown): number | null => {
    if (n === null || n === undefined) return null;
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    return Math.round(v * 10) / 10;
  };

  const benchmarks: NationalBenchmark[] = res.rows.map((r) => ({
    grade: String(r.class_grade),
    cycleType: String(r.assessment_type) as NationalBenchmark["cycleType"],
    learnersAssessed: Number(r.n),
    letterIdentification: round1(r.letter),
    soundIdentification: round1(r.sound),
    decodableWords: round1(r.decodable),
    fluencyAccuracy: round1(r.fluency),
    readingComprehension: round1(r.comp),
    compositeAvg: round1(r.composite),
    atOrAboveBenchmarkPct: Math.round(Number(r.at_benchmark_pct ?? 0) * 10) / 10,
  }));

  const totalRes = await queryPostgres(
    `SELECT COUNT(DISTINCT learner_uid)::int AS n FROM assessment_records WHERE learner_uid IS NOT NULL`,
  );

  return {
    asOf: new Date().toISOString(),
    totalLearnersAssessed: Number(totalRes.rows[0]?.n ?? 0),
    benchmarks,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* District Literacy Indicators — for /api/v1/districts/:id/literacy          */
/* ────────────────────────────────────────────────────────────────────────── */

export type DistrictLiteracyIndicators = {
  district: string;
  region: string | null;
  schoolsCount: number;
  schoolsWithAssessments: number;
  learnersAssessed: number;
  teachersTrained: number;
  coachingVisits: number;
  trainingSessions: number;
  fidelityObservations: number;
  fidelityPct: number;
  atOrAboveBenchmarkPct: number;
  baselineComposite: number | null;
  endlineComposite: number | null;
  improvementPp: number | null;
  asOf: string;
};

export async function getDistrictLiteracyIndicatorsPostgres(district: string): Promise<DistrictLiteracyIndicators | null> {
  const schoolCheckRes = await queryPostgres(
    `SELECT DISTINCT district, region FROM schools_directory WHERE LOWER(district) = LOWER($1) LIMIT 1`,
    [district],
  );
  if (schoolCheckRes.rows.length === 0) return null;
  const districtRow = schoolCheckRes.rows[0];

  const res = await queryPostgres(
    `WITH district_schools AS (
       SELECT id FROM schools_directory WHERE LOWER(district) = LOWER($1)
     )
     SELECT
       (SELECT COUNT(*)::int FROM district_schools) AS schools_count,
       (SELECT COUNT(DISTINCT ar.school_id)::int FROM assessment_records ar
          WHERE ar.school_id IN (SELECT id FROM district_schools)) AS schools_with_assessments,
       (SELECT COUNT(DISTINCT ar.learner_uid)::int FROM assessment_records ar
          WHERE ar.school_id IN (SELECT id FROM district_schools) AND ar.learner_uid IS NOT NULL) AS learners_assessed,
       (SELECT COUNT(DISTINCT pta.teacher_uid)::int FROM portal_training_attendance pta
          WHERE pta.school_id IN (SELECT id FROM district_schools) AND pta.attended IS TRUE AND pta.teacher_uid IS NOT NULL) AS teachers_trained,
       (SELECT COUNT(*)::int FROM portal_records pr
          WHERE pr.school_id IN (SELECT id FROM district_schools) AND pr.module = 'visit') AS coaching_visits,
       (SELECT COUNT(*)::int FROM portal_records pr
          WHERE pr.school_id IN (SELECT id FROM district_schools) AND pr.module = 'training') AS training_sessions,
       (SELECT COUNT(*)::int FROM teacher_lesson_observations tlo
          WHERE tlo.school_id IN (SELECT id FROM district_schools) AND tlo.status = 'submitted') AS obs_total,
       (SELECT COUNT(*)::int FROM teacher_lesson_observations tlo
          WHERE tlo.school_id IN (SELECT id FROM district_schools) AND tlo.status = 'submitted'
            AND tlo.overall_post_observation_rating = 'fidelity') AS obs_fidelity,
       (SELECT AVG(
            (COALESCE(letter_identification_score,0) + COALESCE(sound_identification_score,0) +
             COALESCE(decodable_words_score,0) + COALESCE(fluency_accuracy_score,0) +
             COALESCE(reading_comprehension_score,0)) / 5.0
          )::numeric FROM assessment_records ar
          WHERE ar.school_id IN (SELECT id FROM district_schools) AND ar.assessment_type = 'baseline') AS baseline_comp,
       (SELECT AVG(
            (COALESCE(letter_identification_score,0) + COALESCE(sound_identification_score,0) +
             COALESCE(decodable_words_score,0) + COALESCE(fluency_accuracy_score,0) +
             COALESCE(reading_comprehension_score,0)) / 5.0
          )::numeric FROM assessment_records ar
          WHERE ar.school_id IN (SELECT id FROM district_schools) AND ar.assessment_type = 'endline') AS endline_comp,
       (SELECT (COUNT(*) FILTER (
            WHERE LOWER(COALESCE(expected_vs_actual_status, '')) LIKE '%meet%'
               OR LOWER(COALESCE(expected_vs_actual_status, '')) LIKE '%exceed%'
               OR LOWER(COALESCE(expected_vs_actual_status, '')) LIKE '%on%track%'
          )::numeric / NULLIF(COUNT(*), 0) * 100)::numeric
          FROM assessment_records ar
          WHERE ar.school_id IN (SELECT id FROM district_schools)) AS at_benchmark_pct
    `,
    [district],
  );

  const row = res.rows[0];
  const obsTotal = Number(row?.obs_total ?? 0);
  const obsFid = Number(row?.obs_fidelity ?? 0);
  const baseline = row?.baseline_comp != null ? Math.round(Number(row.baseline_comp) * 10) / 10 : null;
  const endline = row?.endline_comp != null ? Math.round(Number(row.endline_comp) * 10) / 10 : null;

  return {
    district: String(districtRow.district),
    region: districtRow.region ? String(districtRow.region) : null,
    schoolsCount: Number(row?.schools_count ?? 0),
    schoolsWithAssessments: Number(row?.schools_with_assessments ?? 0),
    learnersAssessed: Number(row?.learners_assessed ?? 0),
    teachersTrained: Number(row?.teachers_trained ?? 0),
    coachingVisits: Number(row?.coaching_visits ?? 0),
    trainingSessions: Number(row?.training_sessions ?? 0),
    fidelityObservations: obsTotal,
    fidelityPct: obsTotal > 0 ? Math.round((obsFid / obsTotal) * 100) : 0,
    atOrAboveBenchmarkPct: Math.round(Number(row?.at_benchmark_pct ?? 0) * 10) / 10,
    baselineComposite: baseline,
    endlineComposite: endline,
    improvementPp: baseline != null && endline != null ? Math.round((endline - baseline) * 10) / 10 : null,
    asOf: new Date().toISOString(),
  };
}

export async function listDistrictsPostgres(): Promise<Array<{ district: string; region: string | null; schoolsCount: number }>> {
  const res = await queryPostgres(
    `SELECT district, MAX(region) AS region, COUNT(*)::int AS n
     FROM schools_directory
     WHERE district IS NOT NULL AND district <> ''
     GROUP BY district
     ORDER BY district ASC`,
  );
  return res.rows.map((r) => ({
    district: String(r.district),
    region: r.region ? String(r.region) : null,
    schoolsCount: Number(r.n ?? 0),
  }));
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Data Quality Score — one per district                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export type DistrictDataQuality = {
  district: string;
  region: string | null;
  totalSchools: number;
  schoolsWithBaseline: number;
  schoolsWithEndline: number;
  baselineCoveragePct: number;
  endlineCoveragePct: number;
  learnersWithUidPct: number;
  avgVisitsPerSchool: number;
  avgObservationsPerSchool: number;
  score: number;         // 0-100 composite
  grade: "A" | "B" | "C" | "D" | "F";
};

export type DataQualityReport = {
  asOf: string;
  districts: DistrictDataQuality[];
  nationalAverage: number;
};

function gradeFor(score: number): DistrictDataQuality["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

export async function getDataQualityByDistrictPostgres(): Promise<DataQualityReport> {
  const res = await queryPostgres(
    `WITH per_district AS (
       SELECT
         s.district,
         MAX(s.region) AS region,
         COUNT(DISTINCT s.id)::int AS total_schools,
         COUNT(DISTINCT s.id) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM assessment_records ar
             WHERE ar.school_id = s.id AND ar.assessment_type = 'baseline'
           )
         )::int AS schools_with_baseline,
         COUNT(DISTINCT s.id) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM assessment_records ar
             WHERE ar.school_id = s.id AND ar.assessment_type = 'endline'
           )
         )::int AS schools_with_endline,
         (SELECT COUNT(*)::int FROM assessment_records ar
            JOIN schools_directory ss ON ss.id = ar.school_id
            WHERE LOWER(ss.district) = LOWER(s.district) AND ar.learner_uid IS NOT NULL AND ar.learner_uid <> '') AS learners_uid,
         (SELECT COUNT(*)::int FROM assessment_records ar
            JOIN schools_directory ss ON ss.id = ar.school_id
            WHERE LOWER(ss.district) = LOWER(s.district)) AS learners_total,
         (SELECT COUNT(*)::int FROM portal_records pr
            JOIN schools_directory ss ON ss.id = pr.school_id
            WHERE LOWER(ss.district) = LOWER(s.district) AND pr.module = 'visit') AS total_visits,
         (SELECT COUNT(*)::int FROM teacher_lesson_observations tlo
            JOIN schools_directory ss ON ss.id = tlo.school_id
            WHERE LOWER(ss.district) = LOWER(s.district) AND tlo.status = 'submitted') AS total_obs
       FROM schools_directory s
       WHERE s.district IS NOT NULL AND s.district <> ''
       GROUP BY s.district
     )
     SELECT * FROM per_district ORDER BY district ASC`,
  );

  const districts: DistrictDataQuality[] = res.rows.map((r) => {
    const totalSchools = Number(r.total_schools);
    const baselineSchools = Number(r.schools_with_baseline ?? 0);
    const endlineSchools = Number(r.schools_with_endline ?? 0);
    const learnersUid = Number(r.learners_uid ?? 0);
    const learnersTotal = Number(r.learners_total ?? 0);
    const totalVisits = Number(r.total_visits ?? 0);
    const totalObs = Number(r.total_obs ?? 0);

    const baselinePct = totalSchools > 0 ? (baselineSchools / totalSchools) * 100 : 0;
    const endlinePct = totalSchools > 0 ? (endlineSchools / totalSchools) * 100 : 0;
    const uidPct = learnersTotal > 0 ? (learnersUid / learnersTotal) * 100 : 0;
    const avgVisits = totalSchools > 0 ? totalVisits / totalSchools : 0;
    const avgObs = totalSchools > 0 ? totalObs / totalSchools : 0;

    // Composite score (0-100):
    // - Baseline coverage      25 pts
    // - Endline coverage       25 pts
    // - Learner UID %          20 pts
    // - Visits per school      15 pts (target: 4+/school scaled)
    // - Observations per school 15 pts (target: 3+/school scaled)
    const visitsScore = Math.min(1, avgVisits / 4) * 15;
    const obsScore = Math.min(1, avgObs / 3) * 15;
    const score = Math.round(
      (baselinePct * 0.25) +
      (endlinePct * 0.25) +
      (uidPct * 0.20) +
      visitsScore +
      obsScore
    );

    return {
      district: String(r.district),
      region: r.region ? String(r.region) : null,
      totalSchools,
      schoolsWithBaseline: baselineSchools,
      schoolsWithEndline: endlineSchools,
      baselineCoveragePct: Math.round(baselinePct * 10) / 10,
      endlineCoveragePct: Math.round(endlinePct * 10) / 10,
      learnersWithUidPct: Math.round(uidPct * 10) / 10,
      avgVisitsPerSchool: Math.round(avgVisits * 10) / 10,
      avgObservationsPerSchool: Math.round(avgObs * 10) / 10,
      score,
      grade: gradeFor(score),
    };
  }).sort((a, b) => b.score - a.score);

  const nationalAverage = districts.length > 0
    ? Math.round(districts.reduce((a, d) => a + d.score, 0) / districts.length)
    : 0;

  return {
    asOf: new Date().toISOString(),
    districts,
    nationalAverage,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Programme Comparison — placeholder for multi-NGO cross-programme benchmarks */
/* ────────────────────────────────────────────────────────────────────────── */

export type ProgrammeComparison = {
  grade: string;
  compositeMean: number;
  p25: number;
  p50: number;
  p75: number;
  programmesContributing: number;
  note: string;
};

/**
 * Until multi-tenant programmes ship, this returns the distribution of school-level
 * composite scores by grade as a proxy. When multi-NGO support lands, this will
 * partition by programme_id and produce true cross-programme percentiles.
 */
/* ────────────────────────────────────────────────────────────────────────── */
/* Regions — parity with districts endpoint                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export type RegionSummary = {
  region: string;
  schoolsCount: number;
  districtsCount: number;
  subCountiesCount: number;
};

export async function listRegionsPostgres(): Promise<RegionSummary[]> {
  const res = await queryPostgres(
    `SELECT
       region,
       COUNT(*)::int AS schools,
       COUNT(DISTINCT district)::int AS districts,
       COUNT(DISTINCT sub_county)::int AS subcounties
     FROM schools_directory
     WHERE region IS NOT NULL AND region <> ''
     GROUP BY region
     ORDER BY region ASC`,
  );
  return res.rows.map((r) => ({
    region: String(r.region),
    schoolsCount: Number(r.schools ?? 0),
    districtsCount: Number(r.districts ?? 0),
    subCountiesCount: Number(r.subcounties ?? 0),
  }));
}

export type RegionLiteracyIndicators = DistrictLiteracyIndicators & {
  districtsCount: number;
};

export async function getRegionLiteracyIndicatorsPostgres(region: string): Promise<RegionLiteracyIndicators | null> {
  const check = await queryPostgres(
    `SELECT region FROM schools_directory WHERE LOWER(region) = LOWER($1) LIMIT 1`,
    [region],
  );
  if (check.rows.length === 0) return null;

  const res = await queryPostgres(
    `WITH region_schools AS (
       SELECT id FROM schools_directory WHERE LOWER(region) = LOWER($1)
     )
     SELECT
       (SELECT COUNT(*)::int FROM region_schools) AS schools_count,
       (SELECT COUNT(DISTINCT district)::int FROM schools_directory WHERE LOWER(region) = LOWER($1) AND district IS NOT NULL AND district <> '') AS districts_count,
       (SELECT COUNT(DISTINCT ar.school_id)::int FROM assessment_records ar WHERE ar.school_id IN (SELECT id FROM region_schools)) AS schools_with_assessments,
       (SELECT COUNT(DISTINCT ar.learner_uid)::int FROM assessment_records ar WHERE ar.school_id IN (SELECT id FROM region_schools) AND ar.learner_uid IS NOT NULL) AS learners_assessed,
       (SELECT COUNT(DISTINCT teacher_uid)::int FROM portal_training_attendance WHERE school_id IN (SELECT id FROM region_schools) AND attended IS TRUE AND teacher_uid IS NOT NULL) AS teachers_trained,
       (SELECT COUNT(*)::int FROM portal_records WHERE school_id IN (SELECT id FROM region_schools) AND module = 'visit') AS coaching_visits,
       (SELECT COUNT(*)::int FROM portal_records WHERE school_id IN (SELECT id FROM region_schools) AND module = 'training') AS training_sessions,
       (SELECT COUNT(*)::int FROM teacher_lesson_observations WHERE school_id IN (SELECT id FROM region_schools) AND status = 'submitted') AS obs_total,
       (SELECT COUNT(*)::int FROM teacher_lesson_observations WHERE school_id IN (SELECT id FROM region_schools) AND status = 'submitted' AND overall_post_observation_rating = 'fidelity') AS obs_fidelity,
       (SELECT AVG(
            (COALESCE(letter_identification_score,0) + COALESCE(sound_identification_score,0) +
             COALESCE(decodable_words_score,0) + COALESCE(fluency_accuracy_score,0) +
             COALESCE(reading_comprehension_score,0)) / 5.0
          )::numeric FROM assessment_records ar
          WHERE ar.school_id IN (SELECT id FROM region_schools) AND ar.assessment_type = 'baseline') AS baseline_comp,
       (SELECT AVG(
            (COALESCE(letter_identification_score,0) + COALESCE(sound_identification_score,0) +
             COALESCE(decodable_words_score,0) + COALESCE(fluency_accuracy_score,0) +
             COALESCE(reading_comprehension_score,0)) / 5.0
          )::numeric FROM assessment_records ar
          WHERE ar.school_id IN (SELECT id FROM region_schools) AND ar.assessment_type = 'endline') AS endline_comp,
       (SELECT (COUNT(*) FILTER (
            WHERE LOWER(COALESCE(expected_vs_actual_status, '')) LIKE '%meet%'
               OR LOWER(COALESCE(expected_vs_actual_status, '')) LIKE '%exceed%'
               OR LOWER(COALESCE(expected_vs_actual_status, '')) LIKE '%on%track%'
          )::numeric / NULLIF(COUNT(*), 0) * 100)::numeric
          FROM assessment_records ar
          WHERE ar.school_id IN (SELECT id FROM region_schools)) AS at_benchmark_pct`,
    [region],
  );
  const row = res.rows[0];
  const obsTotal = Number(row?.obs_total ?? 0);
  const obsFid = Number(row?.obs_fidelity ?? 0);
  const baseline = row?.baseline_comp != null ? Math.round(Number(row.baseline_comp) * 10) / 10 : null;
  const endline = row?.endline_comp != null ? Math.round(Number(row.endline_comp) * 10) / 10 : null;

  return {
    district: "",
    region: String(check.rows[0].region),
    districtsCount: Number(row?.districts_count ?? 0),
    schoolsCount: Number(row?.schools_count ?? 0),
    schoolsWithAssessments: Number(row?.schools_with_assessments ?? 0),
    learnersAssessed: Number(row?.learners_assessed ?? 0),
    teachersTrained: Number(row?.teachers_trained ?? 0),
    coachingVisits: Number(row?.coaching_visits ?? 0),
    trainingSessions: Number(row?.training_sessions ?? 0),
    fidelityObservations: obsTotal,
    fidelityPct: obsTotal > 0 ? Math.round((obsFid / obsTotal) * 100) : 0,
    atOrAboveBenchmarkPct: Math.round(Number(row?.at_benchmark_pct ?? 0) * 10) / 10,
    baselineComposite: baseline,
    endlineComposite: endline,
    improvementPp: baseline != null && endline != null ? Math.round((endline - baseline) * 10) / 10 : null,
    asOf: new Date().toISOString(),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* National time series — month-over-month trajectory                          */
/* ────────────────────────────────────────────────────────────────────────── */

export type NationalTimeSeriesPoint = {
  month: string;  // YYYY-MM
  learnersAssessed: number;
  avgComprehension: number | null;
  avgFluency: number | null;
  avgComposite: number | null;
  coachingVisits: number;
  trainingSessions: number;
  observationsSubmitted: number;
  fidelityPct: number;
};

export async function getNationalTimeSeriesPostgres(months = 12): Promise<NationalTimeSeriesPoint[]> {
  const clampedMonths = Math.max(3, Math.min(60, Math.floor(months)));
  const res = await queryPostgres(
    `WITH series AS (
       SELECT to_char(d, 'YYYY-MM') AS month
       FROM generate_series(
         date_trunc('month', NOW() - ($1 || ' months')::interval),
         date_trunc('month', NOW()),
         '1 month'::interval
       ) AS d
     )
     SELECT
       s.month,
       COALESCE((SELECT COUNT(DISTINCT learner_uid)::int FROM assessment_records
          WHERE to_char(assessment_date, 'YYYY-MM') = s.month), 0) AS learners,
       (SELECT AVG(reading_comprehension_score)::numeric FROM assessment_records
          WHERE to_char(assessment_date, 'YYYY-MM') = s.month) AS avg_comp,
       (SELECT AVG(fluency_accuracy_score)::numeric FROM assessment_records
          WHERE to_char(assessment_date, 'YYYY-MM') = s.month) AS avg_flu,
       (SELECT AVG(
            (COALESCE(letter_identification_score,0) + COALESCE(sound_identification_score,0) +
             COALESCE(decodable_words_score,0) + COALESCE(fluency_accuracy_score,0) +
             COALESCE(reading_comprehension_score,0)) / 5.0
          )::numeric FROM assessment_records
          WHERE to_char(assessment_date, 'YYYY-MM') = s.month) AS avg_composite,
       COALESCE((SELECT COUNT(*)::int FROM portal_records
          WHERE module = 'visit' AND to_char(date, 'YYYY-MM') = s.month), 0) AS visits,
       COALESCE((SELECT COUNT(*)::int FROM portal_records
          WHERE module = 'training' AND to_char(date, 'YYYY-MM') = s.month), 0) AS trainings,
       COALESCE((SELECT COUNT(*)::int FROM teacher_lesson_observations
          WHERE status = 'submitted' AND to_char(observation_date, 'YYYY-MM') = s.month), 0) AS obs_total,
       COALESCE((SELECT COUNT(*)::int FROM teacher_lesson_observations
          WHERE status = 'submitted' AND overall_post_observation_rating = 'fidelity'
            AND to_char(observation_date, 'YYYY-MM') = s.month), 0) AS obs_fid
     FROM series s
     ORDER BY s.month ASC`,
    [String(clampedMonths)],
  );
  const round1 = (n: unknown): number | null => {
    if (n === null || n === undefined) return null;
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    return Math.round(v * 10) / 10;
  };
  return res.rows.map((r) => {
    const obsTotal = Number(r.obs_total ?? 0);
    const obsFid = Number(r.obs_fid ?? 0);
    return {
      month: String(r.month),
      learnersAssessed: Number(r.learners ?? 0),
      avgComprehension: round1(r.avg_comp),
      avgFluency: round1(r.avg_flu),
      avgComposite: round1(r.avg_composite),
      coachingVisits: Number(r.visits ?? 0),
      trainingSessions: Number(r.trainings ?? 0),
      observationsSubmitted: obsTotal,
      fidelityPct: obsTotal > 0 ? Math.round((obsFid / obsTotal) * 100) : 0,
    };
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/* National gender parity — exposed through v1 API                             */
/* ────────────────────────────────────────────────────────────────────────── */

export type NationalGenderParity = {
  asOf: string;
  overall: {
    maleLearners: number;
    femaleLearners: number;
    maleAvgComposite: number | null;
    femaleAvgComposite: number | null;
    parityIndex: number | null;
    gapPp: number | null;
  };
  byGrade: Array<{
    grade: string;
    maleLearners: number;
    femaleLearners: number;
    maleAvgComposite: number | null;
    femaleAvgComposite: number | null;
    parityIndex: number | null;
  }>;
};

function genderFromRow(raw: unknown): "male" | "female" | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "male" || s === "m" || s === "boy") return "male";
  if (s === "female" || s === "f" || s === "girl") return "female";
  return null;
}

export async function getNationalGenderParityApiPostgres(): Promise<NationalGenderParity> {
  const res = await queryPostgres(
    `SELECT
       LOWER(COALESCE(sl.gender, ar.gender, '')) AS g,
       ar.class_grade,
       (COALESCE(ar.letter_identification_score,0) + COALESCE(ar.sound_identification_score,0) +
        COALESCE(ar.decodable_words_score,0) + COALESCE(ar.fluency_accuracy_score,0) +
        COALESCE(ar.reading_comprehension_score,0)) / 5.0 AS composite
     FROM assessment_records ar
     LEFT JOIN school_learners sl ON sl.learner_uid = ar.learner_uid
     WHERE ar.learner_uid IS NOT NULL`,
  );

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  const maleAll: number[] = [];
  const femaleAll: number[] = [];
  const byGradeMap = new Map<string, { male: number[]; female: number[] }>();

  for (const row of res.rows) {
    const gender = genderFromRow(row.g);
    const comp = Number(row.composite);
    if (!Number.isFinite(comp)) continue;
    if (gender === "male") maleAll.push(comp);
    else if (gender === "female") femaleAll.push(comp);

    const grade = row.class_grade ? String(row.class_grade) : null;
    if (!grade || !gender) continue;
    if (!byGradeMap.has(grade)) byGradeMap.set(grade, { male: [], female: [] });
    byGradeMap.get(grade)![gender].push(comp);
  }

  const maleAvg = avg(maleAll);
  const femaleAvg = avg(femaleAll);

  return {
    asOf: new Date().toISOString(),
    overall: {
      maleLearners: maleAll.length,
      femaleLearners: femaleAll.length,
      maleAvgComposite: maleAvg,
      femaleAvgComposite: femaleAvg,
      parityIndex: maleAvg && maleAvg > 0 && femaleAvg != null ? Math.round((femaleAvg / maleAvg) * 1000) / 1000 : null,
      gapPp: maleAvg != null && femaleAvg != null ? Math.round((femaleAvg - maleAvg) * 10) / 10 : null,
    },
    byGrade: [...byGradeMap.entries()]
      .map(([grade, b]) => {
        const ma = avg(b.male);
        const fa = avg(b.female);
        return {
          grade,
          maleLearners: b.male.length,
          femaleLearners: b.female.length,
          maleAvgComposite: ma,
          femaleAvgComposite: fa,
          parityIndex: ma && ma > 0 && fa != null ? Math.round((fa / ma) * 1000) / 1000 : null,
        };
      })
      .sort((a, b) => a.grade.localeCompare(b.grade)),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Schools — paginated, anonymized aggregate for research partners             */
/* ────────────────────────────────────────────────────────────────────────── */

export type SchoolApiRow = {
  schoolId: number;
  schoolCode: string;
  district: string;
  region: string;
  subCounty: string;
  enrollmentTotal: number;
  learnersAssessed: number;
  baselineComposite: number | null;
  endlineComposite: number | null;
  improvementPp: number | null;
  fidelityPct: number;
  coachingVisits: number;
};

export type SchoolsApiResult = {
  data: SchoolApiRow[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export async function listSchoolsForApiPostgres(filters: {
  region?: string;
  district?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<SchoolsApiResult> {
  const limit = Math.min(1000, Math.max(1, Math.floor(filters.limit ?? 100)));
  const offset = Math.max(0, Math.floor(filters.offset ?? 0));

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters.region) {
    conditions.push(`LOWER(s.region) = LOWER($${idx++})`);
    params.push(filters.region);
  }
  if (filters.district) {
    conditions.push(`LOWER(s.district) = LOWER($${idx++})`);
    params.push(filters.district);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRes, rowsRes] = await Promise.all([
    queryPostgres(`SELECT COUNT(*)::int AS n FROM schools_directory s ${where}`, params),
    queryPostgres(
      `SELECT
         s.id, s.school_code, s.district, s.region, s.sub_county, s.enrollment_total,
         (SELECT COUNT(DISTINCT ar.learner_uid)::int FROM assessment_records ar
            WHERE ar.school_id = s.id AND ar.learner_uid IS NOT NULL) AS learners_assessed,
         (SELECT AVG(
            (COALESCE(letter_identification_score,0) + COALESCE(sound_identification_score,0) +
             COALESCE(decodable_words_score,0) + COALESCE(fluency_accuracy_score,0) +
             COALESCE(reading_comprehension_score,0)) / 5.0
          )::numeric FROM assessment_records WHERE school_id = s.id AND assessment_type = 'baseline') AS baseline_comp,
         (SELECT AVG(
            (COALESCE(letter_identification_score,0) + COALESCE(sound_identification_score,0) +
             COALESCE(decodable_words_score,0) + COALESCE(fluency_accuracy_score,0) +
             COALESCE(reading_comprehension_score,0)) / 5.0
          )::numeric FROM assessment_records WHERE school_id = s.id AND assessment_type = 'endline') AS endline_comp,
         (SELECT COUNT(*)::int FROM teacher_lesson_observations WHERE school_id = s.id AND status = 'submitted') AS obs_total,
         (SELECT COUNT(*)::int FROM teacher_lesson_observations WHERE school_id = s.id AND status = 'submitted' AND overall_post_observation_rating = 'fidelity') AS obs_fid,
         (SELECT COUNT(*)::int FROM portal_records WHERE school_id = s.id AND module = 'visit') AS visits
       FROM schools_directory s
       ${where}
       ORDER BY s.id ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
  ]);

  const round1 = (n: unknown): number | null => {
    if (n === null || n === undefined) return null;
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    return Math.round(v * 10) / 10;
  };

  const data = rowsRes.rows.map((r) => {
    const baseline = round1(r.baseline_comp);
    const endline = round1(r.endline_comp);
    const obsTotal = Number(r.obs_total ?? 0);
    const obsFid = Number(r.obs_fid ?? 0);
    return {
      schoolId: Number(r.id),
      schoolCode: String(r.school_code ?? ""),
      district: String(r.district ?? ""),
      region: String(r.region ?? ""),
      subCounty: String(r.sub_county ?? ""),
      enrollmentTotal: Number(r.enrollment_total ?? 0),
      learnersAssessed: Number(r.learners_assessed ?? 0),
      baselineComposite: baseline,
      endlineComposite: endline,
      improvementPp: baseline != null && endline != null ? Math.round((endline - baseline) * 10) / 10 : null,
      fidelityPct: obsTotal > 0 ? Math.round((obsFid / obsTotal) * 100) : 0,
      coachingVisits: Number(r.visits ?? 0),
    };
  });

  const total = Number(countRes.rows[0]?.n ?? 0);
  return {
    data,
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Outcomes by grade × domain                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export type GradeOutcomeRow = {
  grade: string;
  learnersAssessed: number;
  letterIdentification: number | null;
  soundIdentification: number | null;
  decodableWords: number | null;
  fluencyAccuracy: number | null;
  readingComprehension: number | null;
  composite: number | null;
};

export async function getOutcomesByGradePostgres(): Promise<GradeOutcomeRow[]> {
  const res = await queryPostgres(
    `SELECT
       class_grade,
       COUNT(DISTINCT learner_uid)::int AS n,
       AVG(letter_identification_score)::numeric AS letter,
       AVG(sound_identification_score)::numeric AS sound,
       AVG(decodable_words_score)::numeric AS decodable,
       AVG(fluency_accuracy_score)::numeric AS fluency,
       AVG(reading_comprehension_score)::numeric AS comp,
       AVG(
         (COALESCE(letter_identification_score,0) + COALESCE(sound_identification_score,0) +
          COALESCE(decodable_words_score,0) + COALESCE(fluency_accuracy_score,0) +
          COALESCE(reading_comprehension_score,0)) / 5.0
       )::numeric AS composite
     FROM assessment_records
     WHERE class_grade IS NOT NULL AND class_grade <> ''
     GROUP BY class_grade
     HAVING COUNT(DISTINCT learner_uid) >= 10
     ORDER BY class_grade ASC`,
  );
  const round1 = (n: unknown): number | null => {
    if (n === null || n === undefined) return null;
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    return Math.round(v * 10) / 10;
  };
  return res.rows.map((r) => ({
    grade: String(r.class_grade),
    learnersAssessed: Number(r.n),
    letterIdentification: round1(r.letter),
    soundIdentification: round1(r.sound),
    decodableWords: round1(r.decodable),
    fluencyAccuracy: round1(r.fluency),
    readingComprehension: round1(r.comp),
    composite: round1(r.composite),
  }));
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Programme Comparison                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export async function getProgrammeComparisonsPostgres(): Promise<ProgrammeComparison[]> {
  const res = await queryPostgres(
    `WITH school_grade AS (
       SELECT
         school_id, class_grade,
         AVG(
           (COALESCE(letter_identification_score,0) +
            COALESCE(sound_identification_score,0) +
            COALESCE(decodable_words_score,0) +
            COALESCE(fluency_accuracy_score,0) +
            COALESCE(reading_comprehension_score,0)) / 5.0
         )::numeric AS composite
       FROM assessment_records
       WHERE class_grade IS NOT NULL AND class_grade <> ''
       GROUP BY school_id, class_grade
       HAVING COUNT(*) >= 5
     )
     SELECT
       class_grade AS grade,
       AVG(composite)::numeric AS mean,
       PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY composite)::numeric AS p25,
       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY composite)::numeric AS p50,
       PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY composite)::numeric AS p75,
       COUNT(DISTINCT school_id)::int AS schools
     FROM school_grade
     GROUP BY class_grade
     ORDER BY class_grade ASC`,
  );

  return res.rows.map((r) => ({
    grade: String(r.grade),
    compositeMean: Math.round(Number(r.mean) * 10) / 10,
    p25: Math.round(Number(r.p25) * 10) / 10,
    p50: Math.round(Number(r.p50) * 10) / 10,
    p75: Math.round(Number(r.p75) * 10) / 10,
    programmesContributing: Number(r.schools),
    note: "Currently reported as school-level distribution. Once cross-programme support ships, this becomes programme-level percentiles.",
  }));
}
