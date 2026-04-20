import { queryPostgres } from "@/lib/server/postgres/client";

/**
 * School engagements are the analytical spine that ties a school's reading
 * improvement back to Ozeki's activities. One engagement groups a training,
 * its follow-up coaching visits, and the assessments that bookend the cycle,
 * so a score delta can be attributed to a concrete bundle of work rather than
 * inferred from timestamps.
 */

export type EngagementStatus = "planned" | "active" | "completed" | "cancelled";
export type AssessmentStage = "baseline" | "mid" | "endline";

export type SchoolEngagement = {
  id: number;
  schoolId: number;
  label: string;
  cohortCode: string | null;
  academicYear: number | null;
  termNumber: number | null;
  grade: string | null;
  trainingId: number | null;
  assessmentWindowId: number | null;
  startDate: string | null;
  endDate: string | null;
  status: EngagementStatus;
  goalDescription: string | null;
  notes: string | null;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SchoolEngagementSummary = SchoolEngagement & {
  visitsCount: number;
  lessonEvaluationsCount: number;
  assessmentsBaseline: number;
  assessmentsMid: number;
  assessmentsEndline: number;
};

type Row = Record<string, unknown>;

function toEngagement(row: Row): SchoolEngagement {
  return {
    id: Number(row.id),
    schoolId: Number(row.school_id),
    label: String(row.label),
    cohortCode: (row.cohort_code ?? null) as string | null,
    academicYear: row.academic_year == null ? null : Number(row.academic_year),
    termNumber: row.term_number == null ? null : Number(row.term_number),
    grade: (row.grade ?? null) as string | null,
    trainingId: row.training_id == null ? null : Number(row.training_id),
    assessmentWindowId: row.assessment_window_id == null ? null : Number(row.assessment_window_id),
    startDate: (row.start_date ?? null) as string | null,
    endDate: (row.end_date ?? null) as string | null,
    status: String(row.status) as EngagementStatus,
    goalDescription: (row.goal_description ?? null) as string | null,
    notes: (row.notes ?? null) as string | null,
    createdByUserId: row.created_by_user_id == null ? null : Number(row.created_by_user_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export type CreateEngagementInput = {
  schoolId: number;
  label: string;
  cohortCode?: string | null;
  academicYear?: number | null;
  termNumber?: number | null;
  grade?: string | null;
  trainingId?: number | null;
  assessmentWindowId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: EngagementStatus;
  goalDescription?: string | null;
  notes?: string | null;
  createdByUserId: number;
};

export async function createSchoolEngagementPostgres(
  input: CreateEngagementInput,
): Promise<SchoolEngagement> {
  const res = await queryPostgres<Row>(
    `INSERT INTO school_engagements (
       school_id, label, cohort_code, academic_year, term_number, grade,
       training_id, assessment_window_id, start_date, end_date, status,
       goal_description, notes, created_by_user_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,'active'),$12,$13,$14)
     RETURNING *`,
    [
      input.schoolId,
      input.label,
      input.cohortCode ?? null,
      input.academicYear ?? null,
      input.termNumber ?? null,
      input.grade ?? null,
      input.trainingId ?? null,
      input.assessmentWindowId ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.status ?? null,
      input.goalDescription ?? null,
      input.notes ?? null,
      input.createdByUserId,
    ],
  );
  return toEngagement(res.rows[0]);
}

export async function getSchoolEngagementByIdPostgres(id: number): Promise<SchoolEngagement | null> {
  const res = await queryPostgres<Row>(`SELECT * FROM school_engagements WHERE id = $1`, [id]);
  const row = res.rows[0];
  return row ? toEngagement(row) : null;
}

export async function listSchoolEngagementsPostgres(opts: {
  schoolId?: number;
  trainingId?: number;
  status?: EngagementStatus;
  academicYear?: number;
  limit?: number;
}): Promise<SchoolEngagementSummary[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.schoolId != null) { params.push(opts.schoolId); clauses.push(`s.school_id = $${params.length}`); }
  if (opts.trainingId != null) { params.push(opts.trainingId); clauses.push(`s.training_id = $${params.length}`); }
  if (opts.status != null) { params.push(opts.status); clauses.push(`s.status = $${params.length}`); }
  if (opts.academicYear != null) { params.push(opts.academicYear); clauses.push(`s.academic_year = $${params.length}`); }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(Math.max(1, Math.min(500, opts.limit ?? 100)));
  const res = await queryPostgres<Row>(
    `SELECT e.*, s.visits_count, s.lesson_evaluations_count,
            s.assessments_baseline, s.assessments_mid, s.assessments_endline
       FROM school_engagements e
       JOIN v_school_engagement_summary s ON s.engagement_id = e.id
       ${where}
      ORDER BY COALESCE(e.start_date, e.created_at::date) DESC, e.id DESC
      LIMIT $${params.length}`,
    params,
  );
  return res.rows.map((row) => ({
    ...toEngagement(row),
    visitsCount: Number(row.visits_count ?? 0),
    lessonEvaluationsCount: Number(row.lesson_evaluations_count ?? 0),
    assessmentsBaseline: Number(row.assessments_baseline ?? 0),
    assessmentsMid: Number(row.assessments_mid ?? 0),
    assessmentsEndline: Number(row.assessments_endline ?? 0),
  }));
}

export type UpdateEngagementInput = Partial<
  Omit<CreateEngagementInput, "schoolId" | "createdByUserId">
> & {
  id: number;
  updatedByUserId: number;
};

export async function updateSchoolEngagementPostgres(
  input: UpdateEngagementInput,
): Promise<SchoolEngagement | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };
  if (input.label !== undefined) push("label", input.label);
  if (input.cohortCode !== undefined) push("cohort_code", input.cohortCode);
  if (input.academicYear !== undefined) push("academic_year", input.academicYear);
  if (input.termNumber !== undefined) push("term_number", input.termNumber);
  if (input.grade !== undefined) push("grade", input.grade);
  if (input.trainingId !== undefined) push("training_id", input.trainingId);
  if (input.assessmentWindowId !== undefined) push("assessment_window_id", input.assessmentWindowId);
  if (input.startDate !== undefined) push("start_date", input.startDate);
  if (input.endDate !== undefined) push("end_date", input.endDate);
  if (input.status !== undefined) push("status", input.status);
  if (input.goalDescription !== undefined) push("goal_description", input.goalDescription);
  if (input.notes !== undefined) push("notes", input.notes);
  if (sets.length === 0) {
    return getSchoolEngagementByIdPostgres(input.id);
  }
  sets.push(`updated_at = NOW()`);
  params.push(input.id);
  const res = await queryPostgres<Row>(
    `UPDATE school_engagements SET ${sets.join(", ")}
      WHERE id = $${params.length}
      RETURNING *`,
    params,
  );
  return res.rows[0] ? toEngagement(res.rows[0]) : null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Attachment helpers — link existing activity rows to an engagement          */
/* ────────────────────────────────────────────────────────────────────────── */

export async function attachCoachingVisitToEngagementPostgres(visitId: number, engagementId: number | null) {
  await queryPostgres(
    `UPDATE coaching_visits SET engagement_id = $1, updated_at = NOW() WHERE id = $2`,
    [engagementId, visitId],
  );
}

export async function attachLessonEvaluationToEngagementPostgres(
  lessonEvaluationId: number,
  engagementId: number | null,
) {
  await queryPostgres(
    `UPDATE lesson_evaluations SET engagement_id = $1 WHERE id = $2`,
    [engagementId, lessonEvaluationId],
  );
}

export async function attachAssessmentToEngagementPostgres(
  assessmentId: number,
  engagementId: number | null,
  stage?: AssessmentStage | null,
) {
  if (stage === undefined) {
    await queryPostgres(
      `UPDATE assessment_records SET engagement_id = $1 WHERE id = $2`,
      [engagementId, assessmentId],
    );
  } else {
    await queryPostgres(
      `UPDATE assessment_records SET engagement_id = $1, stage = $2 WHERE id = $3`,
      [engagementId, stage, assessmentId],
    );
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Attribution — learner provenance chain                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export type LearnerAttributionRow = {
  learnerUid: string;
  schoolId: number;
  engagementId: number;
  trainingId: number | null;
  teacherUid: string | null;
  teacherName: string | null;
  baselineStage: string | null;
  endlineStage: string | null;
  baselineOrder: number | null;
  endlineOrder: number | null;
  readingStageDelta: number | null;
  baselineDate: string | null;
  endlineDate: string | null;
};

/**
 * Pulls the provenance chain: for each learner with both baseline + endline
 * assessments inside one engagement, join the teachers who attended the
 * engagement's training. Score delta uses `reading_stage_order` (discrete 0..N).
 */
export async function getLearnerAttributionForEngagementPostgres(
  engagementId: number,
): Promise<LearnerAttributionRow[]> {
  const res = await queryPostgres<Row>(
    `
    WITH base AS (
      SELECT learner_uid, school_id, reading_stage_order, reading_stage_label, assessment_date
        FROM assessment_records
       WHERE engagement_id = $1 AND stage = 'baseline'
    ),
    endl AS (
      SELECT learner_uid, school_id, reading_stage_order, reading_stage_label, assessment_date
        FROM assessment_records
       WHERE engagement_id = $1 AND stage = 'endline'
    ),
    eng AS (
      SELECT id, school_id, training_id
        FROM school_engagements
       WHERE id = $1
    ),
    trained AS (
      SELECT a.teacher_uid, t.full_name AS teacher_name
        FROM portal_training_attendance a
        LEFT JOIN teacher_roster t ON t.teacher_uid = a.teacher_uid
       WHERE a.portal_record_id = (SELECT training_id FROM eng)
         AND COALESCE(a.attended, FALSE) = TRUE
    )
    SELECT
      COALESCE(b.learner_uid, e.learner_uid)  AS learner_uid,
      COALESCE(b.school_id, e.school_id)      AS school_id,
      $1::int                                 AS engagement_id,
      (SELECT training_id FROM eng)           AS training_id,
      tr.teacher_uid,
      tr.teacher_name,
      b.reading_stage_label                   AS baseline_stage,
      e.reading_stage_label                   AS endline_stage,
      b.reading_stage_order                   AS baseline_order,
      e.reading_stage_order                   AS endline_order,
      (e.reading_stage_order - b.reading_stage_order) AS reading_stage_delta,
      b.assessment_date                       AS baseline_date,
      e.assessment_date                       AS endline_date
    FROM base b
    FULL OUTER JOIN endl e
      ON e.learner_uid = b.learner_uid
    LEFT JOIN LATERAL (SELECT * FROM trained LIMIT 1) tr ON TRUE
    ORDER BY reading_stage_delta DESC NULLS LAST
    `,
    [engagementId],
  );
  return res.rows.map((row) => ({
    learnerUid: String(row.learner_uid ?? ""),
    schoolId: Number(row.school_id ?? 0),
    engagementId: Number(row.engagement_id),
    trainingId: row.training_id == null ? null : Number(row.training_id),
    teacherUid: (row.teacher_uid ?? null) as string | null,
    teacherName: (row.teacher_name ?? null) as string | null,
    baselineStage: (row.baseline_stage ?? null) as string | null,
    endlineStage: (row.endline_stage ?? null) as string | null,
    baselineOrder: row.baseline_order == null ? null : Number(row.baseline_order),
    endlineOrder: row.endline_order == null ? null : Number(row.endline_order),
    readingStageDelta: row.reading_stage_delta == null ? null : Number(row.reading_stage_delta),
    baselineDate: (row.baseline_date ?? null) as string | null,
    endlineDate: (row.endline_date ?? null) as string | null,
  }));
}
