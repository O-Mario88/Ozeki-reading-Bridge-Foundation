import { queryPostgres } from "@/lib/server/postgres/client";

export type LearnerPassportRow = {
  learnerUid: string;
  learnerName: string | null;
  schoolId: number | null;
  schoolName: string | null;
  district: string | null;
  region: string | null;
  classGrade: string | null;
  gender: string | null;
  age: number | null;
};

export type AssessmentEntry = {
  assessmentDate: string;
  assessmentType: string | null;
  readingStageLabel: string | null;
  readingStageOrder: number | null;
  storyReadingScore: number | null;
  readingComprehensionScore: number | null;
};

export async function getLearnerPassportProfile(uid: string): Promise<LearnerPassportRow | null> {
  const result = await queryPostgres(
    `SELECT
       sl.learner_uid AS "learnerUid",
       sl.learner_name AS "learnerName",
       sl.school_id AS "schoolId",
       sd.name AS "schoolName",
       sd.district,
       sd.region,
       sl.class_grade AS "classGrade",
       sl.gender,
       sl.age
     FROM school_learners sl
     LEFT JOIN schools_directory sd ON sd.id = sl.school_id
     WHERE sl.learner_uid = $1
     LIMIT 1`,
    [uid],
  );
  if (result.rows[0]) return result.rows[0] as LearnerPassportRow;

  // Fallback to assessment_records when school_learners row missing.
  const fallback = await queryPostgres(
    `SELECT DISTINCT ON (ar.learner_uid)
       ar.learner_uid AS "learnerUid",
       NULL AS "learnerName",
       ar.school_id AS "schoolId",
       sd.name AS "schoolName",
       sd.district, sd.region,
       NULL AS "classGrade", NULL AS gender, NULL AS age
     FROM assessment_records ar
     LEFT JOIN schools_directory sd ON sd.id = ar.school_id
     WHERE ar.learner_uid = $1
     ORDER BY ar.learner_uid, ar.assessment_date DESC
     LIMIT 1`,
    [uid],
  );
  return (fallback.rows[0] as LearnerPassportRow | undefined) ?? null;
}

export async function listLearnerAssessments(uid: string): Promise<AssessmentEntry[]> {
  const result = await queryPostgres(
    `SELECT assessment_date::text AS "assessmentDate",
            assessment_type AS "assessmentType",
            reading_stage_label AS "readingStageLabel",
            reading_stage_order AS "readingStageOrder",
            story_reading_score AS "storyReadingScore",
            reading_comprehension_score AS "readingComprehensionScore"
     FROM assessment_records
     WHERE learner_uid = $1
     ORDER BY assessment_date ASC`,
    [uid],
  );
  return result.rows as AssessmentEntry[];
}
