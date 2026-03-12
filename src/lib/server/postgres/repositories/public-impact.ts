import {
  type LessonEvaluationDomainKey,
  type LessonEvaluationItemInput,
  type LessonEvaluationOverallLevel,
  type LessonEvaluationRecord,
  type PublicImpactAggregate,
  type TeachingLearningAlignmentAggregate,
  type TeachingLearningAlignmentPoint,
} from "@/lib/types";
import { LESSON_EVALUATION_ITEMS } from "@/lib/lesson-evaluation";
import { queryPostgres } from "@/lib/server/postgres/client";

export type PublicImpactScopeLevel = PublicImpactAggregate["scope"]["level"];

export type PublicImpactSchoolScopeRow = {
  schoolId: number;
  schoolUid: string;
  schoolName: string;
  district: string;
  subRegion: string;
  region: string;
  enrollmentTotal: number;
  directImpactTotal: number;
};

export type PublicImpactPortalRecordRow = {
  id: number;
  module: string;
  schoolId: number;
  date: string;
  status: string;
  programType: string | null;
  payloadJson: string;
  updatedAt: string;
};

export type PublicImpactAttendanceRow = {
  portalRecordId: number;
  schoolId: number;
  participantName: string;
  participantRole: string;
  gender: string | null;
  teacherUid: string | null;
  recordDate: string | null;
};

export type PublicImpactTeacherSupportRow = {
  teacherUid: string;
  schoolId: number;
  gender: "Male" | "Female" | null;
};

export type PublicImpactAssessmentRow = {
  id: number;
  schoolId: number;
  assessmentDate: string;
  assessmentType: "baseline" | "progress" | "endline";
  classGrade: string | null;
  age: number | null;
  learnerUid: string | null;
  letterIdentificationScore: number | null;
  soundIdentificationScore: number | null;
  decodableWordsScore: number | null;
  undecodableWordsScore: number | null;
  madeUpWordsScore: number | null;
  storyReadingScore: number | null;
  fluencyAccuracyScore: number | null;
  readingComprehensionScore: number | null;
  modelVersion: string | null;
  benchmarkVersion: string | null;
  scoringProfileVersion: string | null;
  readingStageLabel: string | null;
  readingStageOrder: number | null;
  benchmarkGradeLevel: string | null;
  expectedVsActualStatus: string | null;
  phonemicAwarenessMasteryStatus: string | null;
  graphemePhonemeCorrespondenceMasteryStatus: string | null;
  blendingDecodingMasteryStatus: string | null;
  wordRecognitionFluencyMasteryStatus: string | null;
  sentenceParagraphConstructionMasteryStatus: string | null;
  comprehensionMasteryStatus: string | null;
  createdAt: string;
};

export type PublicImpactAssessmentSessionRow = {
  id: number;
  schoolId: number;
  assessmentDate: string;
  assessmentType: "baseline" | "progress" | "endline";
};

export type PublicImpactLessonEvaluationRow = {
  id: number;
  schoolId: number;
  lessonDate: string;
  overallScore: number;
  overallLevel: LessonEvaluationOverallLevel;
  topGapDomain: LessonEvaluationDomainKey | null;
  updatedAt: string;
};

export type PublicImpactLessonEvaluationItemRow = {
  domainKey: LessonEvaluationDomainKey;
  score: number;
};

export type TeachingImprovementSettingsRow = {
  teacherDeltaThreshold: number | null;
  minDomainsImproved: number | null;
  schoolDeltaThreshold: number | null;
  schoolImprovedTeachersPercentThreshold: number | null;
};

function emptyLessonDomainScores(): Record<LessonEvaluationDomainKey, number | null> {
  return {
    setup: null,
    new_sound: null,
    decoding: null,
    reading_practice: null,
    tricky_words: null,
    check_next: null,
  };
}

function parseLessonEvaluationDomainScoresJson(
  value: string | null | undefined,
): Record<LessonEvaluationDomainKey, number | null> {
  const empty = emptyLessonDomainScores();
  if (!value) {
    return empty;
  }
  try {
    const parsed = JSON.parse(value) as Partial<Record<LessonEvaluationDomainKey, number | null>>;
    return {
      setup: typeof parsed.setup === "number" ? Number(parsed.setup) : null,
      new_sound: typeof parsed.new_sound === "number" ? Number(parsed.new_sound) : null,
      decoding: typeof parsed.decoding === "number" ? Number(parsed.decoding) : null,
      reading_practice:
        typeof parsed.reading_practice === "number" ? Number(parsed.reading_practice) : null,
      tricky_words: typeof parsed.tricky_words === "number" ? Number(parsed.tricky_words) : null,
      check_next: typeof parsed.check_next === "number" ? Number(parsed.check_next) : null,
    };
  } catch {
    return empty;
  }
}

function normalizeLessonEvaluationItems(
  items: LessonEvaluationItemInput[],
): LessonEvaluationItemInput[] {
  const deduped = new Map(items.map((item) => [item.itemKey, item]));
  return LESSON_EVALUATION_ITEMS.map((definition) => {
    const existing = deduped.get(definition.itemKey);
    if (existing) {
      return {
        domainKey: existing.domainKey,
        itemKey: existing.itemKey,
        score: existing.score,
        note: existing.note ?? null,
      } satisfies LessonEvaluationItemInput;
    }
    return {
      domainKey: definition.domainKey,
      itemKey: definition.itemKey,
      score: 1,
      note: null,
    } satisfies LessonEvaluationItemInput;
  });
}

const SCHOOL_SCOPE_SELECT = `
  SELECT
    school_id AS "schoolId",
    COALESCE(school_uid, '') AS "schoolUid",
    school_name AS "schoolName",
    district,
    sub_region AS "subRegion",
    region,
    COALESCE(enrollment_total, 0) AS "enrollmentTotal",
    COALESCE(direct_impact_total, 0) AS "directImpactTotal"
  FROM impact_public_school_scope
`;

export async function listScopedSchoolsForPublicImpactPostgres(
  level: PublicImpactScopeLevel,
  id: string,
): Promise<PublicImpactSchoolScopeRow[]> {
  if (level === "country") {
    const result = await queryPostgres(SCHOOL_SCOPE_SELECT);
    return result.rows.map((row) => ({
      schoolId: Number(row.schoolId),
      schoolUid: String(row.schoolUid ?? ""),
      schoolName: String(row.schoolName ?? ""),
      district: String(row.district ?? ""),
      subRegion: String(row.subRegion ?? ""),
      region: String(row.region ?? ""),
      enrollmentTotal: Number(row.enrollmentTotal ?? 0),
      directImpactTotal: Number(row.directImpactTotal ?? 0),
    }));
  }

  let whereClause = "";
  if (level === "region") {
    whereClause = "WHERE lower(region) = lower($1) OR lower(region_id) = lower($1)";
  } else if (level === "subregion") {
    whereClause = "WHERE lower(sub_region) = lower($1) OR lower(subregion_id) = lower($1)";
  } else if (level === "district") {
    whereClause = "WHERE lower(district) = lower($1) OR lower(district_id) = lower($1)";
  } else {
    whereClause = `
      WHERE school_id = CASE WHEN $1 ~ '^[0-9]+$' THEN $1::int ELSE -1 END
         OR lower(COALESCE(school_uid, '')) = lower($1)
         OR lower(school_name) = lower($1)
      LIMIT 1
    `;
  }

  const result = await queryPostgres(`${SCHOOL_SCOPE_SELECT} ${whereClause}`, [id]);
  return result.rows.map((row) => ({
    schoolId: Number(row.schoolId),
    schoolUid: String(row.schoolUid ?? ""),
    schoolName: String(row.schoolName ?? ""),
    district: String(row.district ?? ""),
    subRegion: String(row.subRegion ?? ""),
    region: String(row.region ?? ""),
    enrollmentTotal: Number(row.enrollmentTotal ?? 0),
    directImpactTotal: Number(row.directImpactTotal ?? 0),
  }));
}

export async function listPortalRecordsForPublicImpactPostgres(
  schoolIds: number[],
): Promise<PublicImpactPortalRecordRow[]> {
  if (schoolIds.length === 0) {
    return [];
  }
  const result = await queryPostgres(
    `
      SELECT
        id,
        module,
        school_id AS "schoolId",
        date::text AS date,
        status,
        program_type AS "programType",
        COALESCE(payload_json, '{}') AS "payloadJson",
        updated_at::text AS "updatedAt"
      FROM portal_records
      WHERE school_id = ANY($1::int[])
        AND module IN ('training', 'visit', 'assessment', 'story', 'story_activity')
    `,
    [schoolIds],
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    module: String(row.module ?? ""),
    schoolId: Number(row.schoolId),
    date: String(row.date ?? ""),
    status: String(row.status ?? ""),
    programType: row.programType ? String(row.programType) : null,
    payloadJson: String(row.payloadJson ?? "{}"),
    updatedAt: String(row.updatedAt ?? ""),
  }));
}

export async function listTrainingAttendanceForPublicImpactPostgres(
  schoolIds: number[],
): Promise<PublicImpactAttendanceRow[]> {
  if (schoolIds.length === 0) {
    return [];
  }
  const result = await queryPostgres(
    `
      SELECT
        pta.portal_record_id AS "portalRecordId",
        pta.school_id AS "schoolId",
        pta.participant_name AS "participantName",
        pta.participant_role AS "participantRole",
        pta.gender,
        pta.teacher_uid AS "teacherUid",
        pr.date::text AS "recordDate"
      FROM portal_training_attendance pta
      LEFT JOIN portal_records pr ON pr.id = pta.portal_record_id
      WHERE pta.school_id = ANY($1::int[])
    `,
    [schoolIds],
  );
  return result.rows.map((row) => ({
    portalRecordId: Number(row.portalRecordId),
    schoolId: Number(row.schoolId),
    participantName: String(row.participantName ?? ""),
    participantRole: String(row.participantRole ?? ""),
    gender: row.gender ? String(row.gender) : null,
    teacherUid: row.teacherUid ? String(row.teacherUid) : null,
    recordDate: row.recordDate ? String(row.recordDate) : null,
  }));
}

export async function listTeacherSupportRowsForPublicImpactPostgres(
  schoolIds: number[],
): Promise<PublicImpactTeacherSupportRow[]> {
  if (schoolIds.length === 0) {
    return [];
  }
  const result = await queryPostgres(
    `
      SELECT
        teacher_uid AS "teacherUid",
        school_id AS "schoolId",
        gender
      FROM impact_public_teacher_support
      WHERE school_id = ANY($1::int[])
    `,
    [schoolIds],
  );
  return result.rows.map((row) => ({
    teacherUid: String(row.teacherUid ?? ""),
    schoolId: Number(row.schoolId),
    gender: row.gender === "Male" || row.gender === "Female" ? row.gender : null,
  }));
}

export async function listAssessmentRowsForPublicImpactPostgres(
  schoolIds: number[],
): Promise<PublicImpactAssessmentRow[]> {
  if (schoolIds.length === 0) {
    return [];
  }
  const result = await queryPostgres(
    `
      SELECT
        id,
        school_id AS "schoolId",
        assessment_date::text AS "assessmentDate",
        assessment_type AS "assessmentType",
        class_grade AS "classGrade",
        age,
        learner_uid AS "learnerUid",
        letter_identification_score AS "letterIdentificationScore",
        sound_identification_score AS "soundIdentificationScore",
        decodable_words_score AS "decodableWordsScore",
        undecodable_words_score AS "undecodableWordsScore",
        made_up_words_score AS "madeUpWordsScore",
        story_reading_score AS "storyReadingScore",
        fluency_accuracy_score AS "fluencyAccuracyScore",
        reading_comprehension_score AS "readingComprehensionScore",
        model_version AS "modelVersion",
        benchmark_version AS "benchmarkVersion",
        scoring_profile_version AS "scoringProfileVersion",
        reading_stage_label AS "readingStageLabel",
        reading_stage_order AS "readingStageOrder",
        benchmark_grade_level AS "benchmarkGradeLevel",
        expected_vs_actual_status AS "expectedVsActualStatus",
        phonemic_awareness_mastery_status AS "phonemicAwarenessMasteryStatus",
        grapheme_phoneme_correspondence_mastery_status AS "graphemePhonemeCorrespondenceMasteryStatus",
        blending_decoding_mastery_status AS "blendingDecodingMasteryStatus",
        word_recognition_fluency_mastery_status AS "wordRecognitionFluencyMasteryStatus",
        sentence_paragraph_construction_mastery_status AS "sentenceParagraphConstructionMasteryStatus",
        comprehension_mastery_status AS "comprehensionMasteryStatus",
        created_at::text AS "createdAt"
      FROM assessment_records
      WHERE school_id = ANY($1::int[])
    `,
    [schoolIds],
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    schoolId: Number(row.schoolId),
    assessmentDate: String(row.assessmentDate ?? ""),
    assessmentType: String(row.assessmentType ?? "progress") as
      | "baseline"
      | "progress"
      | "endline",
    classGrade: row.classGrade ? String(row.classGrade) : null,
    age: row.age === null || row.age === undefined ? null : Number(row.age),
    learnerUid: row.learnerUid ? String(row.learnerUid) : null,
    letterIdentificationScore:
      row.letterIdentificationScore === null || row.letterIdentificationScore === undefined
        ? null
        : Number(row.letterIdentificationScore),
    soundIdentificationScore:
      row.soundIdentificationScore === null || row.soundIdentificationScore === undefined
        ? null
        : Number(row.soundIdentificationScore),
    decodableWordsScore:
      row.decodableWordsScore === null || row.decodableWordsScore === undefined
        ? null
        : Number(row.decodableWordsScore),
    undecodableWordsScore:
      row.undecodableWordsScore === null || row.undecodableWordsScore === undefined
        ? null
        : Number(row.undecodableWordsScore),
    madeUpWordsScore:
      row.madeUpWordsScore === null || row.madeUpWordsScore === undefined
        ? null
        : Number(row.madeUpWordsScore),
    storyReadingScore:
      row.storyReadingScore === null || row.storyReadingScore === undefined
        ? null
        : Number(row.storyReadingScore),
    fluencyAccuracyScore:
      row.fluencyAccuracyScore === null || row.fluencyAccuracyScore === undefined
        ? null
        : Number(row.fluencyAccuracyScore),
    readingComprehensionScore:
      row.readingComprehensionScore === null || row.readingComprehensionScore === undefined
        ? null
        : Number(row.readingComprehensionScore),
    modelVersion: row.modelVersion ? String(row.modelVersion) : null,
    benchmarkVersion: row.benchmarkVersion ? String(row.benchmarkVersion) : null,
    scoringProfileVersion: row.scoringProfileVersion ? String(row.scoringProfileVersion) : null,
    readingStageLabel: row.readingStageLabel ? String(row.readingStageLabel) : null,
    readingStageOrder:
      row.readingStageOrder === null || row.readingStageOrder === undefined
        ? null
        : Number(row.readingStageOrder),
    benchmarkGradeLevel: row.benchmarkGradeLevel ? String(row.benchmarkGradeLevel) : null,
    expectedVsActualStatus: row.expectedVsActualStatus ? String(row.expectedVsActualStatus) : null,
    phonemicAwarenessMasteryStatus: row.phonemicAwarenessMasteryStatus
      ? String(row.phonemicAwarenessMasteryStatus)
      : null,
    graphemePhonemeCorrespondenceMasteryStatus: row.graphemePhonemeCorrespondenceMasteryStatus
      ? String(row.graphemePhonemeCorrespondenceMasteryStatus)
      : null,
    blendingDecodingMasteryStatus: row.blendingDecodingMasteryStatus
      ? String(row.blendingDecodingMasteryStatus)
      : null,
    wordRecognitionFluencyMasteryStatus: row.wordRecognitionFluencyMasteryStatus
      ? String(row.wordRecognitionFluencyMasteryStatus)
      : null,
    sentenceParagraphConstructionMasteryStatus: row.sentenceParagraphConstructionMasteryStatus
      ? String(row.sentenceParagraphConstructionMasteryStatus)
      : null,
    comprehensionMasteryStatus: row.comprehensionMasteryStatus
      ? String(row.comprehensionMasteryStatus)
      : null,
    createdAt: String(row.createdAt ?? ""),
  }));
}

export async function listAssessmentSessionsForPublicImpactPostgres(
  schoolIds: number[],
): Promise<PublicImpactAssessmentSessionRow[]> {
  if (schoolIds.length === 0) {
    return [];
  }
  const result = await queryPostgres(
    `
      SELECT
        id,
        school_id AS "schoolId",
        assessment_date::text AS "assessmentDate",
        assessment_type AS "assessmentType"
      FROM assessment_sessions
      WHERE school_id = ANY($1::int[])
    `,
    [schoolIds],
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    schoolId: Number(row.schoolId),
    assessmentDate: String(row.assessmentDate ?? ""),
    assessmentType: String(row.assessmentType ?? "progress") as
      | "baseline"
      | "progress"
      | "endline",
  }));
}

export async function listLessonEvaluationRowsForPublicImpactPostgres(
  schoolIds: number[],
): Promise<PublicImpactLessonEvaluationRow[]> {
  if (schoolIds.length === 0) {
    return [];
  }
  const result = await queryPostgres(
    `
      SELECT
        id,
        school_id AS "schoolId",
        lesson_date::text AS "lessonDate",
        overall_score AS "overallScore",
        overall_level AS "overallLevel",
        top_gap_domain AS "topGapDomain",
        updated_at::text AS "updatedAt"
      FROM lesson_evaluations
      WHERE status = 'active'
        AND school_id = ANY($1::int[])
    `,
    [schoolIds],
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    schoolId: Number(row.schoolId),
    lessonDate: String(row.lessonDate ?? ""),
    overallScore: Number(row.overallScore ?? 0),
    overallLevel: String(row.overallLevel ?? "Needs Support") as LessonEvaluationOverallLevel,
    topGapDomain: row.topGapDomain ? String(row.topGapDomain) as LessonEvaluationDomainKey : null,
    updatedAt: String(row.updatedAt ?? ""),
  }));
}

export async function listLessonEvaluationItemsForPublicImpactPostgres(
  evaluationIds: number[],
): Promise<PublicImpactLessonEvaluationItemRow[]> {
  if (evaluationIds.length === 0) {
    return [];
  }
  const result = await queryPostgres(
    `
      SELECT
        domain_key AS "domainKey",
        score
      FROM lesson_evaluation_items
      WHERE evaluation_id = ANY($1::int[])
    `,
    [evaluationIds],
  );
  return result.rows.map((row) => ({
    domainKey: String(row.domainKey ?? "setup") as LessonEvaluationDomainKey,
    score: Number(row.score ?? 0),
  }));
}

export async function getTeachingImprovementSettingsPostgres(): Promise<TeachingImprovementSettingsRow | null> {
  const result = await queryPostgres(
    `
      SELECT
        teacher_delta_threshold AS "teacherDeltaThreshold",
        min_domains_improved AS "minDomainsImproved",
        school_delta_threshold AS "schoolDeltaThreshold",
        school_improved_teachers_percent_threshold AS "schoolImprovedTeachersPercentThreshold"
      FROM teaching_improvement_settings
      WHERE id = 1
      LIMIT 1
    `,
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    teacherDeltaThreshold:
      row.teacherDeltaThreshold === null || row.teacherDeltaThreshold === undefined
        ? null
        : Number(row.teacherDeltaThreshold),
    minDomainsImproved:
      row.minDomainsImproved === null || row.minDomainsImproved === undefined
        ? null
        : Number(row.minDomainsImproved),
    schoolDeltaThreshold:
      row.schoolDeltaThreshold === null || row.schoolDeltaThreshold === undefined
        ? null
        : Number(row.schoolDeltaThreshold),
    schoolImprovedTeachersPercentThreshold:
      row.schoolImprovedTeachersPercentThreshold === null ||
      row.schoolImprovedTeachersPercentThreshold === undefined
        ? null
        : Number(row.schoolImprovedTeachersPercentThreshold),
  };
}

export async function listLessonEvaluationRecordsForPublicImpactPostgres(filters: {
  schoolIds: number[];
  startDate?: string | null;
  endDate?: string | null;
  limit?: number;
}): Promise<LessonEvaluationRecord[]> {
  if (filters.schoolIds.length === 0) {
    return [];
  }

  const clauses = ["le.status = 'active'", "le.school_id = ANY($1::int[])"];
  const params: unknown[] = [filters.schoolIds];

  if (filters.startDate?.trim()) {
    params.push(filters.startDate.trim());
    clauses.push(`le.lesson_date >= $${params.length}::date`);
  }
  if (filters.endDate?.trim()) {
    params.push(filters.endDate.trim());
    clauses.push(`le.lesson_date <= $${params.length}::date`);
  }

  const limit = Math.min(filters.limit ?? 10_000, 10_000);
  const result = await queryPostgres(
    `
      SELECT
        le.id,
        le.school_id AS "schoolId",
        sd.name AS "schoolName",
        sd.district AS district,
        le.teacher_uid AS "teacherUid",
        tr.full_name AS "teacherName",
        le.grade,
        le.stream,
        le.class_size AS "classSize",
        le.lesson_date::text AS "lessonDate",
        le.lesson_focus_json AS "lessonFocusJson",
        le.observer_id AS "observerId",
        pu.full_name AS "observerName",
        le.visit_id AS "visitId",
        le.overall_score AS "overallScore",
        le.overall_level AS "overallLevel",
        le.domain_scores_json AS "domainScoresJson",
        le.top_gap_domain AS "topGapDomain",
        le.top_strength_domain AS "topStrengthDomain",
        le.strengths_text AS "strengthsText",
        le.priority_gap_text AS "priorityGapText",
        le.next_coaching_action AS "nextCoachingAction",
        le.teacher_commitment AS "teacherCommitment",
        le.catchup_estimate_count AS "catchupEstimateCount",
        le.catchup_estimate_percent AS "catchupEstimatePercent",
        le.next_visit_date::text AS "nextVisitDate",
        le.status,
        le.created_at::text AS "createdAt",
        le.updated_at::text AS "updatedAt"
      FROM lesson_evaluations le
      JOIN schools_directory sd ON sd.id = le.school_id
      LEFT JOIN teacher_roster tr ON tr.teacher_uid = le.teacher_uid
      LEFT JOIN portal_users pu ON pu.id = le.observer_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY le.lesson_date DESC, le.updated_at DESC
      LIMIT ${limit}
    `,
    params,
  );

  const evaluationIds = result.rows.map((row) => Number(row.id));
  const itemResult = evaluationIds.length > 0
    ? await queryPostgres(
      `
        SELECT
          evaluation_id AS "evaluationId",
          domain_key AS "domainKey",
          item_key AS "itemKey",
          score,
          note
        FROM lesson_evaluation_items
        WHERE evaluation_id = ANY($1::int[])
        ORDER BY evaluation_id ASC, id ASC
      `,
      [evaluationIds],
    )
    : { rows: [] as Array<Record<string, unknown>> };

  const itemMap = new Map<number, LessonEvaluationItemInput[]>();
  itemResult.rows.forEach((row) => {
    const evaluationId = Number(row.evaluationId);
    const bucket = itemMap.get(evaluationId) ?? [];
    bucket.push({
      domainKey: String(row.domainKey ?? "setup") as LessonEvaluationDomainKey,
      itemKey: String(row.itemKey ?? "A1") as LessonEvaluationItemInput["itemKey"],
      score: Math.max(1, Math.min(4, Number(row.score ?? 1))) as 1 | 2 | 3 | 4,
      note: row.note ? String(row.note) : null,
    });
    itemMap.set(evaluationId, bucket);
  });

  return result.rows.map((row) => {
    let lessonFocus: string[] = [];
    try {
      const parsed = JSON.parse(String(row.lessonFocusJson ?? "[]"));
      if (Array.isArray(parsed)) {
        lessonFocus = parsed.map((entry) => String(entry ?? "").trim()).filter(Boolean);
      }
    } catch {
      lessonFocus = [];
    }

    return {
      id: Number(row.id),
      schoolId: Number(row.schoolId),
      schoolName: String(row.schoolName ?? ""),
      district: String(row.district ?? ""),
      teacherUid: String(row.teacherUid ?? ""),
      teacherName: row.teacherName ? String(row.teacherName) : "Teacher",
      grade: String(row.grade ?? "P1") as LessonEvaluationRecord["grade"],
      stream: row.stream ? String(row.stream) : null,
      classSize: row.classSize === null || row.classSize === undefined ? null : Number(row.classSize),
      lessonDate: String(row.lessonDate ?? ""),
      lessonFocus,
      observerId: Number(row.observerId ?? 0),
      observerName: row.observerName ? String(row.observerName) : "Observer",
      visitId: row.visitId === null || row.visitId === undefined ? null : Number(row.visitId),
      overallScore: Number(row.overallScore ?? 0),
      overallLevel: String(row.overallLevel ?? "Needs Support") as LessonEvaluationOverallLevel,
      domainScores: parseLessonEvaluationDomainScoresJson(String(row.domainScoresJson ?? "{}")),
      topGapDomain: row.topGapDomain ? String(row.topGapDomain) as LessonEvaluationDomainKey : null,
      topStrengthDomain:
        row.topStrengthDomain ? String(row.topStrengthDomain) as LessonEvaluationDomainKey : null,
      strengthsText: String(row.strengthsText ?? ""),
      priorityGapText: String(row.priorityGapText ?? ""),
      nextCoachingAction: String(row.nextCoachingAction ?? ""),
      teacherCommitment: String(row.teacherCommitment ?? ""),
      catchupEstimateCount:
        row.catchupEstimateCount === null || row.catchupEstimateCount === undefined
          ? null
          : Number(row.catchupEstimateCount),
      catchupEstimatePercent:
        row.catchupEstimatePercent === null || row.catchupEstimatePercent === undefined
          ? null
          : Number(row.catchupEstimatePercent),
      nextVisitDate: row.nextVisitDate ? String(row.nextVisitDate) : null,
      status: String(row.status ?? "active") as "active" | "void",
      items: normalizeLessonEvaluationItems(itemMap.get(Number(row.id)) ?? []),
      createdAt: String(row.createdAt ?? ""),
      updatedAt: String(row.updatedAt ?? ""),
    } satisfies LessonEvaluationRecord;
  });
}

export async function getTeachingLearningAlignmentBySchoolIdsPostgres(
  schoolIds: number[],
  startDate: string | null,
  endDate: string | null,
): Promise<TeachingLearningAlignmentAggregate> {
  const caveat =
    "These trends are aligned in time and may be associated; they do not prove causation.";
  if (schoolIds.length === 0) {
    return {
      caveat,
      points: [],
      summary: {
        teachingDelta: null,
        nonReaderReductionPp: null,
        cwpm20PlusDeltaPp: null,
        storyActiveLatest: null,
        storySessionsLatest: 0,
      },
    };
  }

  const params: unknown[] = [schoolIds];
  const clauses = ["school_id = ANY($1::int[])"];
  if (startDate && endDate) {
    params.push(startDate.slice(0, 7));
    clauses.push(`period_month >= $${params.length}`);
    params.push(endDate.slice(0, 7));
    clauses.push(`period_month <= $${params.length}`);
  }

  const result = await queryPostgres(
    `
      SELECT
        period_month AS "periodMonth",
        AVG(teaching_quality_avg) AS "teachingQualityAvg",
        AVG(decoding_avg) AS "decodingAvg",
        AVG(fluency_avg) AS "fluencyAvg",
        AVG(comprehension_avg) AS "comprehensionAvg",
        AVG(non_reader_pct) AS "nonReaderPct",
        AVG(cwpm20_plus_pct) AS "cwpm20PlusPct",
        SUM(story_sessions_count) AS "storySessionsCount",
        SUM(stories_published_count) AS "storyPublishedCount",
        COUNT(DISTINCT CASE WHEN story_active_flag = 1 THEN school_id END) AS "activeSchoolsCount"
      FROM teaching_learning_alignment_by_school_period
      WHERE ${clauses.join(" AND ")}
      GROUP BY period_month
      ORDER BY period_month ASC
    `,
    params,
  );

  const points: TeachingLearningAlignmentPoint[] = result.rows.map((row) => ({
    period: String(row.periodMonth ?? ""),
    teachingQualityAvg:
      row.teachingQualityAvg === null || row.teachingQualityAvg === undefined
        ? null
        : Number(Number(row.teachingQualityAvg).toFixed(2)),
    decodingAvg:
      row.decodingAvg === null || row.decodingAvg === undefined
        ? null
        : Number(Number(row.decodingAvg).toFixed(2)),
    fluencyAvg:
      row.fluencyAvg === null || row.fluencyAvg === undefined
        ? null
        : Number(Number(row.fluencyAvg).toFixed(2)),
    comprehensionAvg:
      row.comprehensionAvg === null || row.comprehensionAvg === undefined
        ? null
        : Number(Number(row.comprehensionAvg).toFixed(2)),
    nonReaderPct:
      row.nonReaderPct === null || row.nonReaderPct === undefined
        ? null
        : Number(Number(row.nonReaderPct).toFixed(2)),
    cwpm20PlusPct:
      row.cwpm20PlusPct === null || row.cwpm20PlusPct === undefined
        ? null
        : Number(Number(row.cwpm20PlusPct).toFixed(2)),
    storySessionsCount: Number(row.storySessionsCount ?? 0),
    storyPublishedCount: Number(row.storyPublishedCount ?? 0),
    storyActiveSchoolsPct:
      schoolIds.length > 0
        ? Number((((Number(row.activeSchoolsCount ?? 0) / schoolIds.length) * 100)).toFixed(1))
        : null,
  }));

  const first = points[0] ?? null;
  const last = points[points.length - 1] ?? null;

  return {
    caveat,
    points,
    summary: {
      teachingDelta:
        first && last && first.teachingQualityAvg !== null && last.teachingQualityAvg !== null
          ? Number((last.teachingQualityAvg - first.teachingQualityAvg).toFixed(2))
          : null,
      nonReaderReductionPp:
        first && last && first.nonReaderPct !== null && last.nonReaderPct !== null
          ? Number((first.nonReaderPct - last.nonReaderPct).toFixed(2))
          : null,
      cwpm20PlusDeltaPp:
        first && last && first.cwpm20PlusPct !== null && last.cwpm20PlusPct !== null
          ? Number((last.cwpm20PlusPct - first.cwpm20PlusPct).toFixed(2))
          : null,
      storyActiveLatest: last ? (last.storySessionsCount > 0 || last.storyPublishedCount > 0) : null,
      storySessionsLatest: last?.storySessionsCount ?? 0,
    },
  };
}

export async function listPublishedStorySchoolIdsForPublicImpactPostgres(
  schoolIds: number[],
  startDate: string,
  endDate: string,
): Promise<number[]> {
  if (schoolIds.length === 0) {
    return [];
  }
  const result = await queryPostgres(
    `
      SELECT DISTINCT school_id AS "schoolId"
      FROM story_library
      WHERE publish_status = 'published'
        AND school_id = ANY($1::int[])
        AND (
          (published_at IS NOT NULL AND published_at::date BETWEEN $2::date AND $3::date)
          OR created_at::date BETWEEN $2::date AND $3::date
        )
    `,
    [schoolIds, startDate, endDate],
  );
  return result.rows.map((row) => Number(row.schoolId));
}
