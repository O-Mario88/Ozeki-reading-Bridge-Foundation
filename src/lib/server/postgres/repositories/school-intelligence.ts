import { queryPostgres } from "@/lib/server/postgres/client";

/* ───────────────────────── Types ───────────────────────── */

export type SchoolHealthScore = {
  overall: number;                // 0-100 composite
  band: "Excellent" | "Strong" | "Developing" | "At Risk";
  components: {
    literacyOutcomes: number;     // 0-100
    implementationFidelity: number; // 0-100
    coachingFrequency: number;    // 0-100
    trainingCoverage: number;     // 0-100
  };
  sampleSizes: {
    assessments: number;
    observations: number;
    visits: number;
    teachers: number;
    trainedTeachers: number;
  };
};

export type SchoolTrajectory = {
  band: "Accelerating" | "Steady" | "Stagnating" | "Regressing" | "Insufficient Data";
  cyclesCompared: number;
  latestScore: number | null;
  previousScore: number | null;
  earliestScore: number | null;
  deltaVsPrevious: number | null;   // percentage points
  deltaVsEarliest: number | null;   // percentage points
  series: Array<{ period: string; score: number; n: number }>;
};

export type TeacherRosterIntel = {
  total: number;
  trained: number;
  observed: number;
  withAssessmentData: number;
  untrained: number;
  coverageScore: number; // 0-100
  teachers: Array<{
    teacherUid: string;
    fullName: string;
    classTaught: string | null;
    gender: string | null;
    isTrained: boolean;
    isObserved: boolean;
    hasAssessmentData: boolean;
    lastObservationDate: string | null;
    lastObservationRating: string | null;
  }>;
};

export type GraduationReadiness = {
  score: number;                // 0-100
  ready: boolean;
  currentStatus: string;        // from schools_directory.program_status
  manualGraduatedAt: string | null;
  criteria: Array<{
    key: string;
    label: string;
    target: string;
    actual: string;
    met: boolean;
    weight: number;
  }>;
  missing: string[];
};

export type DistrictComparison = {
  district: string;
  rankInDistrict: number | null;
  totalInDistrict: number;
  percentile: number | null;    // 0-100
  thisSchoolScore: number;
  districtAverage: number;
  districtMedian: number;
  peers: Array<{
    schoolId: number;
    name: string;
    score: number;
    rank: number;
    isThisSchool: boolean;
  }>;
};

export type SchoolDossier = {
  schoolId: number;
  schoolName: string;
  schoolCode: string;
  district: string;
  subCounty: string;
  enrollmentTotal: number;
  generatedAt: string;
  health: SchoolHealthScore;
  trajectory: SchoolTrajectory;
  teacherRoster: TeacherRosterIntel;
  graduation: GraduationReadiness;
  districtComparison: DistrictComparison;
};

/* ───────────────────────── Helpers ───────────────────────── */

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/* ───────────────────────── Core queries ───────────────────────── */

async function computeHealthScoreForSchool(schoolId: number): Promise<SchoolHealthScore> {
  const [assessmentRes, observationRes, visitRes, teacherRes, trainedRes] = await Promise.all([
    queryPostgres(
      `SELECT
         AVG(COALESCE(reading_comprehension_score, 0) +
             COALESCE(story_reading_score, 0) +
             COALESCE(fluency_accuracy_score, 0))::numeric / 3 AS avg_composite,
         COUNT(*)::int AS n
       FROM assessment_records
       WHERE school_id = $1
         AND (assessment_date >= NOW() - INTERVAL '18 months' OR created_at >= NOW() - INTERVAL '18 months')`,
      [schoolId],
    ),
    queryPostgres(
      `SELECT
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'fidelity')::int AS fidelity,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'partial')::int AS partial,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'low')::int AS low,
         COUNT(*)::int AS total
       FROM teacher_lesson_observations
       WHERE school_id = $1 AND status = 'submitted'`,
      [schoolId],
    ),
    queryPostgres(
      `SELECT COUNT(*)::int AS n
       FROM portal_records
       WHERE school_id = $1 AND module = 'visit' AND date >= NOW() - INTERVAL '12 months'`,
      [schoolId],
    ),
    queryPostgres(
      `SELECT COUNT(*)::int AS n FROM teacher_roster WHERE school_id = $1`,
      [schoolId],
    ),
    queryPostgres(
      `SELECT COUNT(DISTINCT teacher_uid)::int AS n
       FROM portal_training_attendance
       WHERE school_id = $1 AND attended IS TRUE AND teacher_uid IS NOT NULL`,
      [schoolId],
    ),
  ]);

  const assessmentN = Number(assessmentRes.rows[0]?.n ?? 0);
  const rawComposite = Number(assessmentRes.rows[0]?.avg_composite ?? 0);
  // Raw composite is a 0-100 percentage; normalize and clamp
  const literacyOutcomes = assessmentN > 0 ? clamp(rawComposite) : 0;

  const obs = observationRes.rows[0];
  const obsTotal = Number(obs?.total ?? 0);
  // Weighted: fidelity = 100, partial = 60, low = 20
  const implementationFidelity = obsTotal > 0
    ? clamp(((Number(obs.fidelity ?? 0) * 100) + (Number(obs.partial ?? 0) * 60) + (Number(obs.low ?? 0) * 20)) / obsTotal)
    : 0;

  // Coaching frequency: 4+ visits/year = 100, scale linearly
  const visits12mo = Number(visitRes.rows[0]?.n ?? 0);
  const coachingFrequency = clamp((visits12mo / 4) * 100);

  const teacherTotal = Number(teacherRes.rows[0]?.n ?? 0);
  const trainedTeachers = Number(trainedRes.rows[0]?.n ?? 0);
  const trainingCoverage = teacherTotal > 0
    ? clamp((trainedTeachers / teacherTotal) * 100)
    : 0;

  // Composite: literacy 40%, fidelity 25%, coaching 15%, training 20%
  const overall = Math.round(
    literacyOutcomes * 0.40 +
    implementationFidelity * 0.25 +
    coachingFrequency * 0.15 +
    trainingCoverage * 0.20,
  );

  const band: SchoolHealthScore["band"] =
    overall >= 75 ? "Excellent" :
    overall >= 55 ? "Strong" :
    overall >= 35 ? "Developing" :
    "At Risk";

  return {
    overall,
    band,
    components: {
      literacyOutcomes: Math.round(literacyOutcomes),
      implementationFidelity: Math.round(implementationFidelity),
      coachingFrequency: Math.round(coachingFrequency),
      trainingCoverage: Math.round(trainingCoverage),
    },
    sampleSizes: {
      assessments: assessmentN,
      observations: obsTotal,
      visits: visits12mo,
      teachers: teacherTotal,
      trainedTeachers,
    },
  };
}

export async function getSchoolHealthScorePostgres(schoolId: number): Promise<SchoolHealthScore> {
  return computeHealthScoreForSchool(schoolId);
}

export async function getSchoolTrajectoryPostgres(schoolId: number): Promise<SchoolTrajectory> {
  const res = await queryPostgres(
    `SELECT
       assessment_type AS type,
       AVG(COALESCE(reading_comprehension_score, 0) +
           COALESCE(story_reading_score, 0) +
           COALESCE(fluency_accuracy_score, 0))::numeric / 3 AS composite,
       COUNT(*)::int AS n,
       MIN(assessment_date)::text AS min_date
     FROM assessment_records
     WHERE school_id = $1
     GROUP BY assessment_type
     ORDER BY min_date ASC`,
    [schoolId],
  );

  // Map assessment types to ordered cycles: baseline → progress → endline
  const ordered = ["baseline", "progress", "endline"];
  const series = ordered
    .map((type) => {
      const row = res.rows.find((r) => String(r.type) === type);
      return row
        ? { period: type, score: Math.round(Number(row.composite)), n: Number(row.n) }
        : null;
    })
    .filter((p): p is { period: string; score: number; n: number } => p !== null);

  if (series.length < 2) {
    return {
      band: "Insufficient Data",
      cyclesCompared: series.length,
      latestScore: series[0]?.score ?? null,
      previousScore: null,
      earliestScore: series[0]?.score ?? null,
      deltaVsPrevious: null,
      deltaVsEarliest: null,
      series,
    };
  }

  const earliest = series[0];
  const latest = series[series.length - 1];
  const previous = series[series.length - 2];

  const deltaVsPrevious = latest.score - previous.score;
  const deltaVsEarliest = latest.score - earliest.score;

  // Band thresholds (percentage points improvement)
  let band: SchoolTrajectory["band"];
  if (deltaVsEarliest >= 15) band = "Accelerating";
  else if (deltaVsEarliest >= 5) band = "Steady";
  else if (deltaVsEarliest >= -5) band = "Stagnating";
  else band = "Regressing";

  return {
    band,
    cyclesCompared: series.length,
    latestScore: latest.score,
    previousScore: previous.score,
    earliestScore: earliest.score,
    deltaVsPrevious,
    deltaVsEarliest,
    series,
  };
}

export async function getTeacherRosterIntelPostgres(schoolId: number): Promise<TeacherRosterIntel> {
  const res = await queryPostgres(
    `SELECT
       tr.teacher_uid AS "teacherUid",
       tr.full_name AS "fullName",
       tr.class_taught AS "classTaught",
       tr.gender,
       EXISTS (
         SELECT 1 FROM portal_training_attendance pta
         WHERE pta.school_id = tr.school_id
           AND pta.teacher_uid = tr.teacher_uid
           AND pta.attended IS TRUE
       ) AS is_trained,
       EXISTS (
         SELECT 1 FROM teacher_lesson_observations tlo
         WHERE tlo.school_id = tr.school_id
           AND LOWER(TRIM(tlo.teacher_name)) = LOWER(TRIM(tr.full_name))
           AND tlo.status = 'submitted'
       ) AS is_observed,
       EXISTS (
         SELECT 1 FROM assessment_records ar
         WHERE ar.school_id = tr.school_id
           AND ar.class_grade = tr.class_taught
       ) AS has_assessment,
       (SELECT observation_date::text FROM teacher_lesson_observations t2
         WHERE t2.school_id = tr.school_id
           AND LOWER(TRIM(t2.teacher_name)) = LOWER(TRIM(tr.full_name))
           AND t2.status = 'submitted'
         ORDER BY observation_date DESC LIMIT 1) AS "lastObsDate",
       (SELECT overall_post_observation_rating FROM teacher_lesson_observations t3
         WHERE t3.school_id = tr.school_id
           AND LOWER(TRIM(t3.teacher_name)) = LOWER(TRIM(tr.full_name))
           AND t3.status = 'submitted'
         ORDER BY observation_date DESC LIMIT 1) AS "lastObsRating"
     FROM teacher_roster tr
     WHERE tr.school_id = $1
     ORDER BY tr.full_name ASC`,
    [schoolId],
  );

  const teachers = res.rows.map((r) => ({
    teacherUid: String(r.teacherUid),
    fullName: String(r.fullName),
    classTaught: r.classTaught ? String(r.classTaught) : null,
    gender: r.gender ? String(r.gender) : null,
    isTrained: Boolean(r.is_trained),
    isObserved: Boolean(r.is_observed),
    hasAssessmentData: Boolean(r.has_assessment),
    lastObservationDate: r.lastObsDate ? String(r.lastObsDate).slice(0, 10) : null,
    lastObservationRating: r.lastObsRating ? String(r.lastObsRating) : null,
  }));

  const total = teachers.length;
  const trained = teachers.filter((t) => t.isTrained).length;
  const observed = teachers.filter((t) => t.isObserved).length;
  const withAssessmentData = teachers.filter((t) => t.hasAssessmentData).length;
  const untrained = total - trained;

  // Coverage score = (trained + observed) / (2 * total)
  const coverageScore = total > 0
    ? clamp(((trained + observed) / (2 * total)) * 100)
    : 0;

  return {
    total,
    trained,
    observed,
    withAssessmentData,
    untrained,
    coverageScore: Math.round(coverageScore),
    teachers,
  };
}

export type SchoolContactRoleDistribution = {
  roleTitle: string;
  count: number;
};

/**
 * Distribution of contacts at a school by role_title (Director, Head
 * Teacher, DOS, Deputy Head Teacher, Head Teacher Lower, Classroom
 * Teacher, etc.). Powers the role-breakdown strip on the school
 * profile dashboard. Cheap query — covered by
 * idx_school_contacts_role_title.
 */
export async function getSchoolContactRoleDistributionPostgres(
  schoolId: number,
): Promise<SchoolContactRoleDistribution[]> {
  try {
    const res = await queryPostgres<{ role_title: string; n: number }>(
      `SELECT role_title, COUNT(*)::int AS n
       FROM school_contacts
       WHERE school_id = $1 AND role_title IS NOT NULL AND role_title <> ''
       GROUP BY role_title
       ORDER BY n DESC, role_title ASC`,
      [schoolId],
    );
    return res.rows.map((r) => ({
      roleTitle: String(r.role_title),
      count: Number(r.n ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getGraduationReadinessPostgres(
  schoolId: number,
  health: SchoolHealthScore,
  teacherRoster: TeacherRosterIntel,
): Promise<GraduationReadiness> {
  const schoolRes = await queryPostgres(
    `SELECT program_status, graduated_at::text AS graduated_at
     FROM schools_directory WHERE id = $1`,
    [schoolId],
  );
  const schoolRow = schoolRes.rows[0];
  const currentStatus = String(schoolRow?.program_status ?? "active");
  const manualGraduatedAt = schoolRow?.graduated_at ? String(schoolRow.graduated_at) : null;

  // Count completed assessment cycles (distinct assessment_type values)
  const cyclesRes = await queryPostgres(
    `SELECT COUNT(DISTINCT assessment_type)::int AS cycles
     FROM assessment_records WHERE school_id = $1`,
    [schoolId],
  );
  const cyclesCompleted = Number(cyclesRes.rows[0]?.cycles ?? 0);

  // Count coaching visits over program lifetime
  const visitsRes = await queryPostgres(
    `SELECT COUNT(*)::int AS n
     FROM portal_records WHERE school_id = $1 AND module = 'visit'`,
    [schoolId],
  );
  const totalVisits = Number(visitsRes.rows[0]?.n ?? 0);

  const trainingCoveragePct = teacherRoster.total > 0
    ? (teacherRoster.trained / teacherRoster.total) * 100
    : 0;

  const criteria = [
    {
      key: "literacy_benchmark",
      label: "Literacy outcomes ≥ 60%",
      target: "60%",
      actual: `${health.components.literacyOutcomes}%`,
      met: health.components.literacyOutcomes >= 60,
      weight: 30,
    },
    {
      key: "fidelity_benchmark",
      label: "Teaching fidelity ≥ 70%",
      target: "70%",
      actual: `${health.components.implementationFidelity}%`,
      met: health.components.implementationFidelity >= 70,
      weight: 20,
    },
    {
      key: "coaching_cycles",
      label: "≥ 8 coaching visits completed",
      target: "8 visits",
      actual: `${totalVisits} visits`,
      met: totalVisits >= 8,
      weight: 15,
    },
    {
      key: "assessment_cycles",
      label: "Baseline + endline completed",
      target: "2 cycles",
      actual: `${cyclesCompleted} cycles`,
      met: cyclesCompleted >= 2,
      weight: 15,
    },
    {
      key: "staff_trained",
      label: "≥ 80% of staff trained",
      target: "80%",
      actual: `${Math.round(trainingCoveragePct)}%`,
      met: trainingCoveragePct >= 80,
      weight: 20,
    },
  ];

  const weightedScore = criteria.reduce(
    (sum, c) => sum + (c.met ? c.weight : 0),
    0,
  );

  const missing = criteria.filter((c) => !c.met).map((c) => c.label);

  return {
    score: weightedScore,
    ready: weightedScore >= 85,
    currentStatus,
    manualGraduatedAt,
    criteria,
    missing,
  };
}

export async function getDistrictComparisonPostgres(
  schoolId: number,
  district: string,
  thisSchoolScore: number,
): Promise<DistrictComparison> {
  if (!district) {
    return {
      district: "",
      rankInDistrict: null,
      totalInDistrict: 0,
      percentile: null,
      thisSchoolScore,
      districtAverage: 0,
      districtMedian: 0,
      peers: [],
    };
  }

  const peerRes = await queryPostgres(
    `SELECT id, name FROM schools_directory
     WHERE LOWER(district) = LOWER($1) AND id != $2
     ORDER BY name ASC
     LIMIT 50`,
    [district, schoolId],
  );

  // Compute health scores for all peers in parallel (capped at 50 for speed)
  const peerScores = await Promise.all(
    peerRes.rows.map(async (row) => {
      const health = await computeHealthScoreForSchool(Number(row.id));
      return {
        schoolId: Number(row.id),
        name: String(row.name),
        score: health.overall,
      };
    }),
  );

  // Include this school and rank all
  const schoolNameRes = await queryPostgres(
    `SELECT name FROM schools_directory WHERE id = $1`,
    [schoolId],
  );
  const thisSchoolName = String(schoolNameRes.rows[0]?.name ?? "This school");

  const combined = [
    ...peerScores,
    { schoolId, name: thisSchoolName, score: thisSchoolScore },
  ].sort((a, b) => b.score - a.score);

  const ranked = combined.map((p, i) => ({
    ...p,
    rank: i + 1,
    isThisSchool: p.schoolId === schoolId,
  }));

  const allScores = ranked.map((p) => p.score);
  const districtAverage = avg(allScores) ?? 0;
  const districtMedian = median(allScores);

  const thisSchool = ranked.find((p) => p.isThisSchool);
  const rankInDistrict = thisSchool?.rank ?? null;
  const percentile = rankInDistrict != null
    ? Math.round(((ranked.length - rankInDistrict + 1) / ranked.length) * 100)
    : null;

  return {
    district,
    rankInDistrict,
    totalInDistrict: ranked.length,
    percentile,
    thisSchoolScore,
    districtAverage: Math.round(districtAverage),
    districtMedian: Math.round(districtMedian),
    peers: ranked,
  };
}

export async function buildSchoolDossierPostgres(schoolId: number): Promise<SchoolDossier | null> {
  const schoolRes = await queryPostgres(
    `SELECT id, name, school_code, district, sub_county, enrollment_total
     FROM schools_directory WHERE id = $1`,
    [schoolId],
  );
  const school = schoolRes.rows[0];
  if (!school) return null;

  const [health, trajectory, teacherRoster] = await Promise.all([
    computeHealthScoreForSchool(schoolId),
    getSchoolTrajectoryPostgres(schoolId),
    getTeacherRosterIntelPostgres(schoolId),
  ]);

  const [graduation, districtComparison] = await Promise.all([
    getGraduationReadinessPostgres(schoolId, health, teacherRoster),
    getDistrictComparisonPostgres(schoolId, String(school.district ?? ""), health.overall),
  ]);

  return {
    schoolId,
    schoolName: String(school.name ?? ""),
    schoolCode: String(school.school_code ?? ""),
    district: String(school.district ?? ""),
    subCounty: String(school.sub_county ?? ""),
    enrollmentTotal: Number(school.enrollment_total ?? 0),
    generatedAt: new Date().toISOString(),
    health,
    trajectory,
    teacherRoster,
    graduation,
    districtComparison,
  };
}
