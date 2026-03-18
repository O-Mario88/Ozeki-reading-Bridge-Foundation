import { queryPostgres } from "@/lib/server/postgres/client";
import { AssessmentRecordInput, AssessmentRecord } from "@/lib/types";
import { computeOneTestStyleMasteryAssessment } from "@/lib/mastery-assessment";

export async function saveAssessmentRecordPostgres(
  input: AssessmentRecordInput,
  actorUserId: number,
): Promise<AssessmentRecord> {
  const computed = computeOneTestStyleMasteryAssessment({
    grade: input.classGrade,
    age: input.age,
    domainInputs: input.masteryDomainInputs || null,
    itemResponses: input.masteryItemResponses || null,
    legacyScores: {
      letterIdentificationScore: input.letterIdentificationScore,
      soundIdentificationScore: input.soundIdentificationScore,
      decodableWordsScore: input.decodableWordsScore,
      undecodableWordsScore: input.undecodableWordsScore,
      madeUpWordsScore: input.madeUpWordsScore,
      storyReadingScore: input.storyReadingScore,
      readingComprehensionScore: input.readingComprehensionScore,
      fluencyAccuracyScore: input.fluencyAccuracyScore,
    },
    modelVersion: input.assessmentModelVersion,
    benchmarkVersion: input.benchmarkVersion,
    scoringProfileVersion: input.scoringProfileVersion,
  });

  const paStatus = computed.domains["phonemic_awareness"]?.domainMasteryStatus || "red";
  const gpcStatus = computed.domains["grapheme_phoneme_correspondence"]?.domainMasteryStatus || "red";
  const blendStatus = computed.domains["blending_decoding"]?.domainMasteryStatus || "red";
  const fluencyStatus = computed.domains["word_recognition_fluency"]?.domainMasteryStatus || "red";
  const sentenceStatus = computed.domains["sentence_paragraph_construction"]?.domainMasteryStatus || "red";
  const compStatus = computed.domains["comprehension"]?.domainMasteryStatus || "red";

  const result = await queryPostgres(
    `INSERT INTO assessment_records (
       school_id, assessment_date, assessment_type, class_grade, age, learner_uid,
       letter_identification_score, sound_identification_score, decodable_words_score,
       undecodable_words_score, made_up_words_score, story_reading_score, fluency_accuracy_score,
       reading_comprehension_score, model_version, benchmark_version, scoring_profile_version,
       reading_stage_label, reading_stage_order, benchmark_grade_level, expected_vs_actual_status,
       phonemic_awareness_mastery_status, grapheme_phoneme_correspondence_mastery_status,
       blending_decoding_mastery_status, word_recognition_fluency_mastery_status,
       sentence_paragraph_construction_mastery_status, comprehension_mastery_status,
       created_by_user_id, created_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11, $12, $13,
       $14, $15, $16, $17,
       $18, $19, $20, $21,
       $22, $23, $24, $25, $26, $27,
       $28, NOW()
     )
     RETURNING id`,
    [
      input.schoolId,
      input.assessmentDate,
      input.assessmentType,
      input.classGrade,
      input.age,
      input.learnerUid || null,
      input.letterIdentificationScore ?? null,
      input.soundIdentificationScore ?? null,
      input.decodableWordsScore ?? null,
      input.undecodableWordsScore ?? null,
      input.madeUpWordsScore ?? null,
      input.storyReadingScore ?? null,
      input.fluencyAccuracyScore ?? null,
      input.readingComprehensionScore ?? null,
      computed.modelVersion,
      computed.benchmarkVersion,
      computed.scoringProfileVersion,
      computed.readingStageLabel,
      computed.readingStageOrder,
      computed.benchmarkGradeLevel,
      computed.expectedVsActualStatus,
      paStatus,
      gpcStatus,
      blendStatus,
      fluencyStatus,
      sentenceStatus,
      compStatus,
      actorUserId,
    ],
  );

  const id = Number(result.rows[0]?.id ?? 0);

  return {
    id,
    childName: input.childName,
    childId: input.childId || "",
    learnerUid: input.learnerUid || "",
    gender: input.gender,
    age: input.age,
    schoolId: input.schoolId,
    classGrade: input.classGrade,
    assessmentDate: input.assessmentDate,
    assessmentType: input.assessmentType,
    letterIdentificationScore: input.letterIdentificationScore,
    soundIdentificationScore: input.soundIdentificationScore,
    decodableWordsScore: input.decodableWordsScore,
    undecodableWordsScore: input.undecodableWordsScore,
    madeUpWordsScore: input.madeUpWordsScore,
    storyReadingScore: input.storyReadingScore,
    readingComprehensionScore: input.readingComprehensionScore,
    fluencyAccuracyScore: input.fluencyAccuracyScore,
    assessmentModelVersion: computed.modelVersion,
    benchmarkVersion: computed.benchmarkVersion,
    scoringProfileVersion: computed.scoringProfileVersion,
    readingStageLabel: computed.readingStageLabel,
    readingStageOrder: computed.readingStageOrder,
    benchmarkGradeLevel: computed.benchmarkGradeLevel,
    expectedVsActualStatus: computed.expectedVsActualStatus as "Below expected level for age/grade" | "At expected level" | "Above expected level" | "Data not available",
    notes: input.notes,
    createdByUserId: actorUserId,
    createdAt: new Date().toISOString(),
  };
}

export async function listAssessmentRecordsPostgres(limit: number = 2000): Promise<AssessmentRecord[]> {
  const result = await queryPostgres(
    `SELECT
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
       model_version AS "assessmentModelVersion",
       benchmark_version AS "benchmarkVersion",
       scoring_profile_version AS "scoringProfileVersion",
       reading_stage_label AS "readingStageLabel",
       reading_stage_order AS "readingStageOrder",
       benchmark_grade_level AS "benchmarkGradeLevel",
       expected_vs_actual_status AS "expectedVsActualStatus"
     FROM assessment_records
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    schoolId: Number(row.schoolId),
    assessmentDate: String(row.assessmentDate ?? ""),
    assessmentType: String(row.assessmentType ?? "progress") as "baseline" | "progress" | "endline",
    classGrade: row.classGrade ? String(row.classGrade) : "P1",
    age: Number(row.age ?? 0),
    learnerUid: row.learnerUid ? String(row.learnerUid) : "",
    letterIdentificationScore: row.letterIdentificationScore == null ? null : Number(row.letterIdentificationScore),
    soundIdentificationScore: row.soundIdentificationScore == null ? null : Number(row.soundIdentificationScore),
    decodableWordsScore: row.decodableWordsScore == null ? null : Number(row.decodableWordsScore),
    undecodableWordsScore: row.undecodableWordsScore == null ? null : Number(row.undecodableWordsScore),
    madeUpWordsScore: row.madeUpWordsScore == null ? null : Number(row.madeUpWordsScore),
    storyReadingScore: row.storyReadingScore == null ? null : Number(row.storyReadingScore),
    fluencyAccuracyScore: row.fluencyAccuracyScore == null ? null : Number(row.fluencyAccuracyScore),
    readingComprehensionScore: row.readingComprehensionScore == null ? null : Number(row.readingComprehensionScore),
    assessmentModelVersion: row.assessmentModelVersion ? String(row.assessmentModelVersion) : null,
    benchmarkVersion: row.benchmarkVersion ? String(row.benchmarkVersion) : null,
    scoringProfileVersion: row.scoringProfileVersion ? String(row.scoringProfileVersion) : null,
    readingStageLabel: row.readingStageLabel ? String(row.readingStageLabel) : null,
    readingStageOrder: row.readingStageOrder == null ? null : Number(row.readingStageOrder),
    benchmarkGradeLevel: row.benchmarkGradeLevel ? String(row.benchmarkGradeLevel) : null,
    expectedVsActualStatus: row.expectedVsActualStatus ? String(row.expectedVsActualStatus) as "Below expected level for age/grade" | "At expected level" | "Above expected level" | "Data not available" : null,
    childName: "Learner",
    childId: "",
    gender: "Boy",
    createdByUserId: Number(row.createdByUserId ?? 0),
    createdAt: String(row.createdAt ?? ""),
  }));
}
