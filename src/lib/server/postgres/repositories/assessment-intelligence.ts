import { queryPostgres } from "@/lib/server/postgres/client";

/* ────────────────────────────────────────────────────────────────────────── */
/* 1. LEARNER PROFILE                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

export type DomainStatus = "on_track" | "developing" | "needs_support" | "unknown";

export type LearnerDomainBand = {
  key: string;
  label: string;
  latestScore: number | null;
  baselineScore: number | null;
  delta: number | null;
  status: DomainStatus;
};

export type LearnerAssessmentCycle = {
  assessmentId: number;
  cycleType: "baseline" | "progress" | "endline";
  assessmentDate: string;
  readingStageLabel: string | null;
  benchmarkGradeLevel: string | null;
  expectedVsActualStatus: string | null;
  letterIdentificationScore: number | null;
  soundIdentificationScore: number | null;
  decodableWordsScore: number | null;
  fluencyAccuracyScore: number | null;
  readingComprehensionScore: number | null;
  compositeScore: number | null;
};

export type LearnerProfile = {
  learnerUid: string;
  learnerName: string;
  gender: string | null;
  age: number | null;
  classGrade: string | null;
  schoolId: number | null;
  schoolName: string | null;
  district: string | null;
  readingStageToday: string | null;
  expectedGrade: string | null;
  cycles: LearnerAssessmentCycle[];
  domains: LearnerDomainBand[];
  recommendedFocus: string[];
  trajectoryDelta: number | null;
};

function bandFromStatus(statusText: string | null | undefined): DomainStatus {
  const s = (statusText ?? "").toLowerCase();
  if (s.includes("mastered") || s === "on_track" || s.includes("proficient") || s.includes("meeting")) return "on_track";
  if (s.includes("developing") || s.includes("emerging") || s === "partial") return "developing";
  if (s.includes("not") || s === "below" || s === "needs_support" || s === "low") return "needs_support";
  return "unknown";
}

function composite(row: Record<string, unknown>): number | null {
  const scores = [
    row.letter_identification_score,
    row.sound_identification_score,
    row.decodable_words_score,
    row.fluency_accuracy_score,
    row.reading_comprehension_score,
  ]
    .map((v) => (v === null || v === undefined ? null : Number(v)))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export async function getLearnerProfilePostgres(learnerUid: string): Promise<LearnerProfile | null> {
  const [learnerRes, assessmentsRes] = await Promise.all([
    queryPostgres(
      `SELECT sl.*, s.name AS school_name, s.district
       FROM school_learners sl
       LEFT JOIN schools_directory s ON s.id = sl.school_id
       WHERE sl.learner_uid = $1 LIMIT 1`,
      [learnerUid],
    ),
    queryPostgres(
      `SELECT * FROM assessment_records
       WHERE learner_uid = $1
       ORDER BY assessment_date ASC, created_at ASC`,
      [learnerUid],
    ),
  ]);

  const learnerRow = learnerRes.rows[0];
  if (!learnerRow && assessmentsRes.rows.length === 0) return null;

  const assessments = assessmentsRes.rows;
  const cycles: LearnerAssessmentCycle[] = assessments.map((r) => ({
    assessmentId: Number(r.id),
    cycleType: String(r.assessment_type ?? "progress") as "baseline" | "progress" | "endline",
    assessmentDate: String(r.assessment_date).slice(0, 10),
    readingStageLabel: r.reading_stage_label ? String(r.reading_stage_label) : null,
    benchmarkGradeLevel: r.benchmark_grade_level ? String(r.benchmark_grade_level) : null,
    expectedVsActualStatus: r.expected_vs_actual_status ? String(r.expected_vs_actual_status) : null,
    letterIdentificationScore: r.letter_identification_score != null ? Number(r.letter_identification_score) : null,
    soundIdentificationScore: r.sound_identification_score != null ? Number(r.sound_identification_score) : null,
    decodableWordsScore: r.decodable_words_score != null ? Number(r.decodable_words_score) : null,
    fluencyAccuracyScore: r.fluency_accuracy_score != null ? Number(r.fluency_accuracy_score) : null,
    readingComprehensionScore: r.reading_comprehension_score != null ? Number(r.reading_comprehension_score) : null,
    compositeScore: composite(r),
  }));

  const latest = assessments[assessments.length - 1] ?? null;
  const baseline = assessments.find((r) => String(r.assessment_type) === "baseline") ?? assessments[0] ?? null;

  const domainDefs = [
    { key: "phonemic_awareness", label: "Phonemic Awareness", statusField: "phonemic_awareness_mastery_status", scoreField: "sound_identification_score" },
    { key: "gpc", label: "Grapheme–Phoneme Correspondence", statusField: "grapheme_phoneme_correspondence_mastery_status", scoreField: "letter_identification_score" },
    { key: "blending", label: "Blending & Decoding", statusField: "blending_decoding_mastery_status", scoreField: "decodable_words_score" },
    { key: "fluency", label: "Word Recognition & Fluency", statusField: "word_recognition_fluency_mastery_status", scoreField: "fluency_accuracy_score" },
    { key: "sentence", label: "Sentence/Paragraph Construction", statusField: "sentence_paragraph_construction_mastery_status", scoreField: "story_reading_score" },
    { key: "comprehension", label: "Comprehension", statusField: "comprehension_mastery_status", scoreField: "reading_comprehension_score" },
  ];

  const domains: LearnerDomainBand[] = domainDefs.map((d) => {
    const latestScore = latest?.[d.scoreField] != null ? Number(latest[d.scoreField]) : null;
    const baselineScore = baseline?.[d.scoreField] != null ? Number(baseline[d.scoreField]) : null;
    return {
      key: d.key,
      label: d.label,
      latestScore,
      baselineScore,
      delta: latestScore != null && baselineScore != null ? Math.round((latestScore - baselineScore) * 10) / 10 : null,
      status: bandFromStatus(latest?.[d.statusField] as string | null | undefined),
    };
  });

  const recommendedFocus = domains
    .filter((d) => d.status === "needs_support" || (d.status === "developing" && (d.latestScore ?? 0) < 60))
    .sort((a, b) => (a.latestScore ?? 0) - (b.latestScore ?? 0))
    .slice(0, 3)
    .map((d) => d.label);

  const firstComp = cycles[0]?.compositeScore ?? null;
  const lastComp = cycles[cycles.length - 1]?.compositeScore ?? null;
  const trajectoryDelta =
    firstComp != null && lastComp != null ? lastComp - firstComp : null;

  return {
    learnerUid,
    learnerName: String(learnerRow?.learner_name ?? latest?.child_name ?? "Unknown learner"),
    gender: (learnerRow?.gender ?? latest?.gender) ? String(learnerRow?.gender ?? latest?.gender) : null,
    age: learnerRow?.age != null ? Number(learnerRow.age) : (latest?.age != null ? Number(latest.age) : null),
    classGrade: (learnerRow?.class_grade ?? latest?.class_grade) ? String(learnerRow?.class_grade ?? latest?.class_grade) : null,
    schoolId: learnerRow?.school_id != null ? Number(learnerRow.school_id) : (latest?.school_id != null ? Number(latest.school_id) : null),
    schoolName: learnerRow?.school_name ? String(learnerRow.school_name) : null,
    district: learnerRow?.district ? String(learnerRow.district) : null,
    readingStageToday: latest?.reading_stage_label ? String(latest.reading_stage_label) : null,
    expectedGrade: latest?.learner_expected_grade ? String(latest.learner_expected_grade) : null,
    cycles,
    domains,
    recommendedFocus,
    trajectoryDelta,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 2. CLASS ROSTER                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

export type ClassRosterLearner = {
  learnerUid: string;
  learnerName: string;
  gender: string | null;
  age: number | null;
  latestReadingStage: string | null;
  latestComposite: number | null;
  latestAssessmentDate: string | null;
  cycleType: string | null;
  flaggedForAttention: boolean;
  flagReason: string | null;
};

export type ClassRoster = {
  schoolId: number;
  schoolName: string;
  classGrade: string;
  totalLearners: number;
  flaggedCount: number;
  learners: ClassRosterLearner[];
};

export async function getClassRosterPostgres(schoolId: number, classGrade: string): Promise<ClassRoster | null> {
  const [schoolRes, learnersRes] = await Promise.all([
    queryPostgres(
      `SELECT name FROM schools_directory WHERE id = $1`,
      [schoolId],
    ),
    queryPostgres(
      `WITH latest AS (
        SELECT DISTINCT ON (learner_uid)
          learner_uid, assessment_date, reading_stage_label, assessment_type,
          letter_identification_score, sound_identification_score, decodable_words_score,
          fluency_accuracy_score, reading_comprehension_score,
          expected_vs_actual_status
        FROM assessment_records
        WHERE school_id = $1 AND class_grade = $2
        ORDER BY learner_uid, assessment_date DESC, created_at DESC
      )
      SELECT sl.learner_uid, sl.learner_name, sl.gender, sl.age,
             l.assessment_date::text AS assessment_date, l.reading_stage_label, l.assessment_type,
             l.letter_identification_score, l.sound_identification_score, l.decodable_words_score,
             l.fluency_accuracy_score, l.reading_comprehension_score,
             l.expected_vs_actual_status
      FROM school_learners sl
      LEFT JOIN latest l ON l.learner_uid = sl.learner_uid
      WHERE sl.school_id = $1 AND sl.class_grade = $2
      ORDER BY sl.learner_name ASC`,
      [schoolId, classGrade],
    ),
  ]);

  const schoolName = String(schoolRes.rows[0]?.name ?? "");
  if (learnersRes.rows.length === 0 && !schoolName) return null;

  const learners: ClassRosterLearner[] = learnersRes.rows.map((r) => {
    const comp = composite(r);
    const needsAttention = (comp != null && comp < 40) ||
      String(r.expected_vs_actual_status ?? "").toLowerCase().includes("below");
    return {
      learnerUid: String(r.learner_uid),
      learnerName: String(r.learner_name ?? "Unknown"),
      gender: r.gender ? String(r.gender) : null,
      age: r.age != null ? Number(r.age) : null,
      latestReadingStage: r.reading_stage_label ? String(r.reading_stage_label) : null,
      latestComposite: comp,
      latestAssessmentDate: r.assessment_date ? String(r.assessment_date) : null,
      cycleType: r.assessment_type ? String(r.assessment_type) : null,
      flaggedForAttention: needsAttention,
      flagReason: needsAttention
        ? (comp != null && comp < 40 ? `Score ${comp}/100` : "Below grade level")
        : null,
    };
  });

  return {
    schoolId,
    schoolName,
    classGrade,
    totalLearners: learners.length,
    flaggedCount: learners.filter((l) => l.flaggedForAttention).length,
    learners,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 3. ITEM-LEVEL DIAGNOSTIC                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export type ItemDiagnostic = {
  itemKey: string;
  domainKey: string;
  nationalAccuracyPct: number;
  avgLatencyMs: number;
  attempts: number;
  responseCount: number;
  regionalVariance: number; // std dev of accuracy by region (pp)
  hardestRegion: { region: string; accuracyPct: number } | null;
  easiestRegion: { region: string; accuracyPct: number } | null;
};

export type ItemDiagnosticsSummary = {
  totalItems: number;
  totalResponses: number;
  items: ItemDiagnostic[];
};

export async function getItemDiagnosticsPostgres(filters: {
  domainKey?: string;
  regionFilter?: string;
  limit?: number;
} = {}): Promise<ItemDiagnosticsSummary> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.domainKey) {
    conditions.push(`air.domain_key = $${idx++}`);
    params.push(filters.domainKey);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const itemsRes = await queryPostgres(
    `SELECT
       air.item_key,
       air.domain_key,
       AVG(CASE WHEN air.accuracy THEN 1.0 ELSE 0.0 END) * 100 AS accuracy_pct,
       AVG(air.latency_ms) AS avg_latency,
       AVG(air.attempts) AS avg_attempts,
       COUNT(*)::int AS response_count
     FROM assessment_item_responses air
     ${where}
     GROUP BY air.item_key, air.domain_key
     HAVING COUNT(*) >= 5
     ORDER BY accuracy_pct ASC
     LIMIT ${filters.limit ?? 50}`,
    params,
  );

  // Regional variance for each item
  const itemKeys = itemsRes.rows.map((r) => String(r.item_key));
  const variancesByItem = new Map<string, { variance: number; hardest: { region: string; pct: number } | null; easiest: { region: string; pct: number } | null }>();

  if (itemKeys.length > 0) {
    const regionRes = await queryPostgres(
      `SELECT
         air.item_key,
         s.region,
         AVG(CASE WHEN air.accuracy THEN 1.0 ELSE 0.0 END) * 100 AS accuracy_pct,
         COUNT(*)::int AS n
       FROM assessment_item_responses air
       JOIN assessment_records ar ON ar.id = air.learner_result_id
       JOIN schools_directory s ON s.id = ar.school_id
       WHERE air.item_key = ANY($1::text[])
         AND s.region IS NOT NULL AND s.region <> ''
       GROUP BY air.item_key, s.region
       HAVING COUNT(*) >= 3`,
      [itemKeys],
    );

    const byItem = new Map<string, Array<{ region: string; pct: number }>>();
    for (const r of regionRes.rows) {
      const key = String(r.item_key);
      const arr = byItem.get(key) ?? [];
      arr.push({ region: String(r.region), pct: Number(r.accuracy_pct) });
      byItem.set(key, arr);
    }
    for (const [key, arr] of byItem) {
      if (arr.length < 2) {
        variancesByItem.set(key, { variance: 0, hardest: null, easiest: null });
        continue;
      }
      const mean = arr.reduce((a, b) => a + b.pct, 0) / arr.length;
      const variance = Math.sqrt(arr.reduce((acc, { pct }) => acc + Math.pow(pct - mean, 2), 0) / arr.length);
      const sorted = [...arr].sort((a, b) => a.pct - b.pct);
      variancesByItem.set(key, {
        variance: Math.round(variance * 10) / 10,
        hardest: { region: sorted[0].region, pct: Math.round(sorted[0].pct * 10) / 10 },
        easiest: { region: sorted[sorted.length - 1].region, pct: Math.round(sorted[sorted.length - 1].pct * 10) / 10 },
      });
    }
  }

  const items: ItemDiagnostic[] = itemsRes.rows.map((r) => {
    const key = String(r.item_key);
    const variance = variancesByItem.get(key);
    return {
      itemKey: key,
      domainKey: String(r.domain_key),
      nationalAccuracyPct: Math.round(Number(r.accuracy_pct) * 10) / 10,
      avgLatencyMs: Math.round(Number(r.avg_latency ?? 0)),
      attempts: Math.round(Number(r.avg_attempts ?? 1) * 10) / 10,
      responseCount: Number(r.response_count),
      regionalVariance: variance?.variance ?? 0,
      hardestRegion: variance?.hardest ? { region: variance.hardest.region, accuracyPct: variance.hardest.pct } : null,
      easiestRegion: variance?.easiest ? { region: variance.easiest.region, accuracyPct: variance.easiest.pct } : null,
    };
  });

  const totalRes = await queryPostgres(`SELECT COUNT(*)::int AS total FROM assessment_item_responses`);

  return {
    totalItems: items.length,
    totalResponses: Number(totalRes.rows[0]?.total ?? 0),
    items,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 4. BENCHMARK GAP ANALYSIS                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export type DistrictBenchmarkGap = {
  district: string;
  region: string;
  learnersAssessed: number;
  atOrAboveBenchmarkPct: number;
  nationalAveragePct: number;
  gapPp: number; // negative if below national
  rank: number;
};

export type BenchmarkGapAnalysis = {
  nationalAveragePct: number;
  totalLearnersAssessed: number;
  districts: DistrictBenchmarkGap[];
};

export async function getBenchmarkGapAnalysisPostgres(grade?: string): Promise<BenchmarkGapAnalysis> {
  const params: unknown[] = [];
  let gradeFilter = "";
  if (grade) {
    params.push(grade);
    gradeFilter = `AND ar.class_grade = $${params.length}`;
  }

  // "At or above benchmark" = expected_vs_actual_status indicates meeting/exceeding,
  // or composite score >= 60 as fallback.
  const nationalRes = await queryPostgres(
    `SELECT
       COUNT(DISTINCT ar.learner_uid)::int AS learners,
       COUNT(DISTINCT ar.learner_uid) FILTER (
         WHERE LOWER(COALESCE(ar.expected_vs_actual_status, '')) LIKE '%meet%'
            OR LOWER(COALESCE(ar.expected_vs_actual_status, '')) LIKE '%exceed%'
            OR LOWER(COALESCE(ar.expected_vs_actual_status, '')) LIKE '%on%track%'
            OR (
              COALESCE(ar.reading_comprehension_score, 0)
              + COALESCE(ar.fluency_accuracy_score, 0)
              + COALESCE(ar.decodable_words_score, 0)
            ) / 3 >= 60
       )::int AS at_or_above
     FROM assessment_records ar
     WHERE ar.learner_uid IS NOT NULL ${gradeFilter}`,
    params,
  );

  const total = Number(nationalRes.rows[0]?.learners ?? 0);
  const atOrAbove = Number(nationalRes.rows[0]?.at_or_above ?? 0);
  const nationalPct = total > 0 ? Math.round((atOrAbove / total) * 1000) / 10 : 0;

  const districtRes = await queryPostgres(
    `SELECT
       s.district,
       MAX(s.region) AS region,
       COUNT(DISTINCT ar.learner_uid)::int AS learners,
       COUNT(DISTINCT ar.learner_uid) FILTER (
         WHERE LOWER(COALESCE(ar.expected_vs_actual_status, '')) LIKE '%meet%'
            OR LOWER(COALESCE(ar.expected_vs_actual_status, '')) LIKE '%exceed%'
            OR LOWER(COALESCE(ar.expected_vs_actual_status, '')) LIKE '%on%track%'
            OR (
              COALESCE(ar.reading_comprehension_score, 0)
              + COALESCE(ar.fluency_accuracy_score, 0)
              + COALESCE(ar.decodable_words_score, 0)
            ) / 3 >= 60
       )::int AS at_or_above
     FROM assessment_records ar
     JOIN schools_directory s ON s.id = ar.school_id
     WHERE ar.learner_uid IS NOT NULL AND s.district IS NOT NULL AND s.district <> '' ${gradeFilter}
     GROUP BY s.district
     HAVING COUNT(DISTINCT ar.learner_uid) >= 5
     ORDER BY (COUNT(DISTINCT ar.learner_uid) FILTER (
       WHERE LOWER(COALESCE(ar.expected_vs_actual_status, '')) LIKE '%meet%'
          OR LOWER(COALESCE(ar.expected_vs_actual_status, '')) LIKE '%exceed%'
          OR LOWER(COALESCE(ar.expected_vs_actual_status, '')) LIKE '%on%track%'
          OR (
            COALESCE(ar.reading_comprehension_score, 0)
            + COALESCE(ar.fluency_accuracy_score, 0)
            + COALESCE(ar.decodable_words_score, 0)
          ) / 3 >= 60
     )::numeric / NULLIF(COUNT(DISTINCT ar.learner_uid), 0)) DESC`,
    params,
  );

  const districts: DistrictBenchmarkGap[] = districtRes.rows.map((r, idx) => {
    const dLearners = Number(r.learners);
    const dAtOrAbove = Number(r.at_or_above);
    const dPct = dLearners > 0 ? Math.round((dAtOrAbove / dLearners) * 1000) / 10 : 0;
    return {
      district: String(r.district),
      region: String(r.region ?? ""),
      learnersAssessed: dLearners,
      atOrAboveBenchmarkPct: dPct,
      nationalAveragePct: nationalPct,
      gapPp: Math.round((dPct - nationalPct) * 10) / 10,
      rank: idx + 1,
    };
  });

  return {
    nationalAveragePct: nationalPct,
    totalLearnersAssessed: total,
    districts,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 5. ASSESSMENT SCHEDULE + COMPLIANCE                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export type AssessmentWindow = {
  id: number;
  assessmentType: "baseline" | "progress" | "endline";
  academicYear: number;
  termNumber: number;
  windowOpen: string;
  windowClose: string;
  scopeType: string;
  scopeId: string | null;
  notes: string | null;
  state: "upcoming" | "open" | "closed";
  daysUntilOpen: number | null;
  daysUntilClose: number | null;
};

export type WindowCompliance = {
  windowId: number;
  assessmentType: string;
  windowOpen: string;
  windowClose: string;
  expectedSchools: number;
  submittedSchools: number;
  submissionPct: number;
  missingSchools: Array<{ schoolId: number; schoolName: string; district: string }>;
};

function windowState(open: string, close: string): AssessmentWindow["state"] {
  const now = new Date();
  const openDate = new Date(open);
  const closeDate = new Date(close);
  if (now < openDate) return "upcoming";
  if (now > closeDate) return "closed";
  return "open";
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export async function listAssessmentWindowsPostgres(academicYear?: number): Promise<AssessmentWindow[]> {
  const params: unknown[] = [];
  let where = "";
  if (academicYear) {
    params.push(academicYear);
    where = `WHERE academic_year = $1`;
  }
  const res = await queryPostgres(
    `SELECT * FROM assessment_schedule_windows ${where}
     ORDER BY academic_year DESC, term_number ASC, assessment_type ASC`,
    params,
  );
  const now = new Date();
  return res.rows.map((r) => {
    const open = String(r.window_open).slice(0, 10);
    const close = String(r.window_close).slice(0, 10);
    const state = windowState(open, close);
    return {
      id: Number(r.id),
      assessmentType: r.assessment_type as AssessmentWindow["assessmentType"],
      academicYear: Number(r.academic_year),
      termNumber: Number(r.term_number),
      windowOpen: open,
      windowClose: close,
      scopeType: String(r.scope_type),
      scopeId: r.scope_id ? String(r.scope_id) : null,
      notes: r.notes ? String(r.notes) : null,
      state,
      daysUntilOpen: state === "upcoming" ? daysBetween(now, new Date(open)) : null,
      daysUntilClose: state === "open" ? daysBetween(now, new Date(close)) : null,
    };
  });
}

export async function createAssessmentWindowPostgres(input: {
  assessmentType: "baseline" | "progress" | "endline";
  academicYear: number;
  termNumber: number;
  windowOpen: string;
  windowClose: string;
  scopeType?: string;
  scopeId?: string | null;
  notes?: string | null;
  createdByUserId: number;
}): Promise<number> {
  const res = await queryPostgres(
    `INSERT INTO assessment_schedule_windows
       (assessment_type, academic_year, term_number, window_open, window_close, scope_type, scope_id, notes, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      input.assessmentType, input.academicYear, input.termNumber,
      input.windowOpen, input.windowClose,
      input.scopeType ?? "country", input.scopeId ?? null,
      input.notes ?? null, input.createdByUserId,
    ],
  );
  return Number(res.rows[0].id);
}

export async function getWindowCompliancePostgres(windowId: number): Promise<WindowCompliance | null> {
  const winRes = await queryPostgres(
    `SELECT * FROM assessment_schedule_windows WHERE id = $1`,
    [windowId],
  );
  const win = winRes.rows[0];
  if (!win) return null;

  const scope = String(win.scope_type);
  const scopeId = win.scope_id ? String(win.scope_id) : null;

  const scopeConditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (scope === "country") {
    // No scope filter — all schools
  } else if (scope === "district") {
    scopeConditions.push(`LOWER(s.district) = LOWER($${idx++})`);
    params.push(scopeId);
  } else if (scope === "region") {
    scopeConditions.push(`LOWER(s.region) = LOWER($${idx++})`);
    params.push(scopeId);
  } else if (scope === "subregion") {
    scopeConditions.push(`LOWER(s.sub_region) = LOWER($${idx++})`);
    params.push(scopeId);
  }

  const scopeWhere = scopeConditions.length > 0 ? `WHERE ${scopeConditions.join(" AND ")}` : "";

  const [expectedRes, submittedRes] = await Promise.all([
    queryPostgres(
      `SELECT s.id, s.name, s.district FROM schools_directory s ${scopeWhere}
       ORDER BY s.name ASC`,
      params,
    ),
    queryPostgres(
      `SELECT DISTINCT ar.school_id
       FROM assessment_records ar
       JOIN schools_directory s ON s.id = ar.school_id
       ${scopeWhere}${scopeWhere ? " AND" : "WHERE"} ar.assessment_type = $${idx++}
         AND ar.assessment_date >= $${idx++}::date
         AND ar.assessment_date <= $${idx++}::date`,
      [...params, win.assessment_type, String(win.window_open).slice(0, 10), String(win.window_close).slice(0, 10)],
    ),
  ]);

  const expected = expectedRes.rows;
  const submittedIds = new Set(submittedRes.rows.map((r) => Number(r.school_id)));
  const submittedCount = submittedIds.size;

  const missing = expected
    .filter((r) => !submittedIds.has(Number(r.id)))
    .map((r) => ({ schoolId: Number(r.id), schoolName: String(r.name), district: String(r.district ?? "") }));

  return {
    windowId,
    assessmentType: String(win.assessment_type),
    windowOpen: String(win.window_open).slice(0, 10),
    windowClose: String(win.window_close).slice(0, 10),
    expectedSchools: expected.length,
    submittedSchools: submittedCount,
    submissionPct: expected.length > 0 ? Math.round((submittedCount / expected.length) * 1000) / 10 : 0,
    missingSchools: missing.slice(0, 100),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 6. GENDER PARITY INDEX                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export type DomainParity = {
  domain: string;
  maleAvg: number | null;
  femaleAvg: number | null;
  parityIndex: number | null; // female/male; 1.0 = parity, >1 female ahead, <1 female behind
  gapPp: number | null;
  maleN: number;
  femaleN: number;
};

export type GenderParityReport = {
  scope: string;
  totalMale: number;
  totalFemale: number;
  overallParityIndex: number | null;
  domains: DomainParity[];
  byGrade: Array<{
    grade: string;
    maleN: number;
    femaleN: number;
    maleComposite: number | null;
    femaleComposite: number | null;
    parityIndex: number | null;
  }>;
};

function normalizeGender(raw: unknown): "male" | "female" | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "male" || s === "m" || s === "boy") return "male";
  if (s === "female" || s === "f" || s === "girl") return "female";
  return null;
}

export async function getGenderParityPostgres(filters: { district?: string; region?: string } = {}): Promise<GenderParityReport> {
  const conditions: string[] = ["ar.learner_uid IS NOT NULL"];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.district) {
    conditions.push(`LOWER(s.district) = LOWER($${idx++})`);
    params.push(filters.district);
  }
  if (filters.region) {
    conditions.push(`LOWER(s.region) = LOWER($${idx++})`);
    params.push(filters.region);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const res = await queryPostgres(
    `SELECT
       LOWER(COALESCE(sl.gender, ar.gender, '')) AS g,
       ar.class_grade,
       ar.letter_identification_score,
       ar.sound_identification_score,
       ar.decodable_words_score,
       ar.fluency_accuracy_score,
       ar.reading_comprehension_score
     FROM assessment_records ar
     JOIN schools_directory s ON s.id = ar.school_id
     LEFT JOIN school_learners sl ON sl.learner_uid = ar.learner_uid
     ${where}`,
    params,
  );

  type Row = {
    gender: "male" | "female" | null;
    grade: string | null;
    scores: {
      letter: number | null;
      sound: number | null;
      decodable: number | null;
      fluency: number | null;
      comprehension: number | null;
    };
  };

  const rows: Row[] = res.rows.map((r) => ({
    gender: normalizeGender(r.g),
    grade: r.class_grade ? String(r.class_grade) : null,
    scores: {
      letter: r.letter_identification_score != null ? Number(r.letter_identification_score) : null,
      sound: r.sound_identification_score != null ? Number(r.sound_identification_score) : null,
      decodable: r.decodable_words_score != null ? Number(r.decodable_words_score) : null,
      fluency: r.fluency_accuracy_score != null ? Number(r.fluency_accuracy_score) : null,
      comprehension: r.reading_comprehension_score != null ? Number(r.reading_comprehension_score) : null,
    },
  }));

  function avg(arr: Array<number | null>): number | null {
    const valid = arr.filter((v): v is number => v != null && Number.isFinite(v));
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
  }
  function compForRow(s: Row["scores"]): number | null {
    const vals = [s.letter, s.sound, s.decodable, s.fluency, s.comprehension].filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const male = rows.filter((r) => r.gender === "male");
  const female = rows.filter((r) => r.gender === "female");

  const domainDefs = [
    { key: "letter", label: "Letter Identification" },
    { key: "sound", label: "Sound Identification" },
    { key: "decodable", label: "Decodable Words" },
    { key: "fluency", label: "Fluency" },
    { key: "comprehension", label: "Comprehension" },
  ] as const;

  const domains: DomainParity[] = domainDefs.map((d) => {
    const maleScores = male.map((r) => r.scores[d.key]);
    const femaleScores = female.map((r) => r.scores[d.key]);
    const maleAvg = avg(maleScores);
    const femaleAvg = avg(femaleScores);
    return {
      domain: d.label,
      maleAvg,
      femaleAvg,
      parityIndex: maleAvg != null && femaleAvg != null && maleAvg > 0
        ? Math.round((femaleAvg / maleAvg) * 1000) / 1000
        : null,
      gapPp: maleAvg != null && femaleAvg != null ? Math.round((femaleAvg - maleAvg) * 10) / 10 : null,
      maleN: maleScores.filter((v) => v != null).length,
      femaleN: femaleScores.filter((v) => v != null).length,
    };
  });

  const maleComposites = male.map((r) => compForRow(r.scores)).filter((v): v is number => v != null);
  const femaleComposites = female.map((r) => compForRow(r.scores)).filter((v): v is number => v != null);
  const maleCompAvg = maleComposites.length ? maleComposites.reduce((a, b) => a + b, 0) / maleComposites.length : null;
  const femaleCompAvg = femaleComposites.length ? femaleComposites.reduce((a, b) => a + b, 0) / femaleComposites.length : null;
  const overallParityIndex = maleCompAvg != null && femaleCompAvg != null && maleCompAvg > 0
    ? Math.round((femaleCompAvg / maleCompAvg) * 1000) / 1000
    : null;

  // By-grade breakdown
  const gradeMap = new Map<string, { m: number[]; f: number[] }>();
  for (const r of rows) {
    if (!r.grade) continue;
    const comp = compForRow(r.scores);
    if (comp == null) continue;
    if (!gradeMap.has(r.grade)) gradeMap.set(r.grade, { m: [], f: [] });
    const bucket = gradeMap.get(r.grade)!;
    if (r.gender === "male") bucket.m.push(comp);
    else if (r.gender === "female") bucket.f.push(comp);
  }

  const byGrade = [...gradeMap.entries()]
    .map(([grade, b]) => {
      const mAvg = b.m.length > 0 ? b.m.reduce((a, c) => a + c, 0) / b.m.length : null;
      const fAvg = b.f.length > 0 ? b.f.reduce((a, c) => a + c, 0) / b.f.length : null;
      return {
        grade,
        maleN: b.m.length,
        femaleN: b.f.length,
        maleComposite: mAvg != null ? Math.round(mAvg * 10) / 10 : null,
        femaleComposite: fAvg != null ? Math.round(fAvg * 10) / 10 : null,
        parityIndex: mAvg != null && fAvg != null && mAvg > 0 ? Math.round((fAvg / mAvg) * 1000) / 1000 : null,
      };
    })
    .sort((a, b) => a.grade.localeCompare(b.grade));

  return {
    scope: filters.district ? `District: ${filters.district}` : filters.region ? `Region: ${filters.region}` : "National",
    totalMale: male.length,
    totalFemale: female.length,
    overallParityIndex,
    domains,
    byGrade,
  };
}
