import { queryPostgres } from "@/lib/server/postgres/client";

import { scoreLabel, LESSON_EVALUATION_DOMAIN_KEYS } from "@/lib/lesson-evaluation";

export type CreateLessonEvaluationItem = {
  domainKey: string;
  itemKey: string;
  score: 1 | 2 | 3 | 4;
  note?: string | null;
};

export type CreateLessonStructureItem = {
  itemKey: string;
  observed: boolean;
  note?: string | null;
};

export type CreateActionPlan = {
  urgentAction: string;
  resourcesNeeded: string;
  reviewDate: string;
};

export type CreateLessonEvaluationInput = {
  schoolId: number;
  teacherUid: string;
  grade: string;
  stream?: string | null;
  classSize?: number | null;
  lessonDate: string;
  lessonFocus: string[];
  lessonDurationMinutes?: number | null;
  observerNameText?: string | null;
  visitId?: number | null;
  lessonStructure?: CreateLessonStructureItem[];
  items: CreateLessonEvaluationItem[];
  strengthsList?: string[];
  areasForDevelopmentList?: string[];
  actionPlan?: CreateActionPlan | null;
  postObservationRating?: string | null;
  strengthsText: string;
  priorityGapText: string;
  nextCoachingAction: string;
  teacherCommitment: string;
  catchupEstimateCount?: number | null;
  catchupEstimatePercent?: number | null;
  nextVisitDate?: string | null;
  observerId?: number; // optionally injected externally
};

function processEvaluationAnalytics(items: CreateLessonEvaluationItem[]) {
  const domainTotals: Record<string, number> = {};
  const domainCounts: Record<string, number> = {};
  let overallTotal = 0;
  let overallCount = 0;

  for (const item of items) {
    if (!domainTotals[item.domainKey]) {
      domainTotals[item.domainKey] = 0;
      domainCounts[item.domainKey] = 0;
    }
    const score = Number(item.score);
    if (!isNaN(score)) {
      domainTotals[item.domainKey] += score;
      domainCounts[item.domainKey]++;
      overallTotal += score;
      overallCount++;
    }
  }

  const domainScores: Record<string, number> = {};
  for (const dk of LESSON_EVALUATION_DOMAIN_KEYS) {
    if (domainCounts[dk] > 0) {
      domainScores[dk] = Number((domainTotals[dk] / domainCounts[dk]).toFixed(2));
    }
  }

  const overallScore = overallCount > 0 ? Number((overallTotal / overallCount).toFixed(2)) : 0;
  const overallLevel = scoreLabel(overallScore);

  let topStrengthDomain = null;
  let topGapDomain = null;
  let maxScore = -1;
  let minScore = 5;

  for (const [dk, score] of Object.entries(domainScores)) {
    if (score > maxScore) {
      maxScore = score;
      topStrengthDomain = dk;
    }
    if (score < minScore) {
      minScore = score;
      topGapDomain = dk;
    }
  }

  return {
    overallScore,
    overallLevel,
    domainScores,
    topStrengthDomain,
    topGapDomain,
  };
}

export async function createLessonEvaluationPostgres(
  input: CreateLessonEvaluationInput,
  actorUserId: number,
) {
  const analytics = processEvaluationAnalytics(input.items);
  const observerId = input.observerId ?? actorUserId;

  const result = await queryPostgres<{ id: number }>(
    `INSERT INTO lesson_evaluations (
       school_id, teacher_uid, grade, stream, class_size, lesson_date,
       lesson_focus_json, lesson_duration_minutes, observer_id, observer_name_text,
       visit_id, overall_score, overall_level,
       domain_scores_json, top_gap_domain, top_strength_domain,
       lesson_structure_json, strengths_list_json, areas_for_development_list_json,
       action_plan_json, post_observation_rating,
       strengths_text, priority_gap_text, next_coaching_action, teacher_commitment,
       catchup_estimate_count, catchup_estimate_percent, next_visit_date,
       status, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10,
       $11, $12, $13,
       $14, $15, $16,
       $17, $18, $19,
       $20, $21,
       $22, $23, $24, $25,
       $26, $27, $28,
       'active', NOW(), NOW()
     )
     RETURNING id`,
    [
      input.schoolId,
      input.teacherUid,
      input.grade,
      input.stream ?? null,
      input.classSize ?? null,
      input.lessonDate,
      JSON.stringify(input.lessonFocus || []),
      input.lessonDurationMinutes ?? null,
      observerId,
      input.observerNameText ?? null,
      input.visitId ?? null,
      analytics.overallScore,
      analytics.overallLevel,
      JSON.stringify(analytics.domainScores),
      analytics.topGapDomain,
      analytics.topStrengthDomain,
      JSON.stringify(input.lessonStructure || []),
      JSON.stringify(input.strengthsList || []),
      JSON.stringify(input.areasForDevelopmentList || []),
      input.actionPlan ? JSON.stringify(input.actionPlan) : null,
      input.postObservationRating ?? null,
      input.strengthsText,
      input.priorityGapText,
      input.nextCoachingAction,
      input.teacherCommitment,
      input.catchupEstimateCount ?? null,
      input.catchupEstimatePercent ?? null,
      input.nextVisitDate ?? null,
    ],
  );

  const evaluationId = Number(result.rows[0]?.id ?? 0);

  if (evaluationId > 0 && input.items && input.items.length > 0) {
    const itemQueryValues: unknown[] = [];
    const itemParamRefs: string[] = [];

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const offset = i * 5;
      itemParamRefs.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`,
      );
      itemQueryValues.push(
        evaluationId,
        item.domainKey,
        item.itemKey,
        item.score,
        item.note ?? null,
      );
    }

    await queryPostgres(
      `INSERT INTO lesson_evaluation_items (
         evaluation_id, domain_key, item_key, score, note
       ) VALUES ${itemParamRefs.join(", ")}`,
      itemQueryValues,
    );
  }

  // Reload the full persisted row with fallback values so UI states stay exact
  const rowResult = await queryPostgres(
    `SELECT * FROM lesson_evaluations WHERE id = $1 LIMIT 1`,
    [evaluationId]
  );
  
  const created = rowResult.rows[0];

  return {
    ...input,
    id: evaluationId,
    status: created.status ?? "active",
    overallScore: created.overall_score ?? analytics.overallScore,
    overallLevel: created.overall_level ?? analytics.overallLevel,
    domainScores: analytics.domainScores,
    topStrengthDomain: created.top_strength_domain ?? analytics.topStrengthDomain,
    topGapDomain: created.top_gap_domain ?? analytics.topGapDomain,
    createdByUserId: created.observer_id ?? actorUserId,
    createdAt: created.created_at ? new Date(created.created_at).toISOString() : new Date().toISOString(),
    updatedAt: created.updated_at ? new Date(created.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function updateLessonEvaluationPostgres(
  id: number,
  input: CreateLessonEvaluationInput,
  actorUserId: number,
) {
  const analytics = processEvaluationAnalytics(input.items);

  await queryPostgres(
    `UPDATE lesson_evaluations
     SET
       school_id = $1, teacher_uid = $2, grade = $3, stream = $4, class_size = $5,
       lesson_date = $6, lesson_focus_json = $7, lesson_duration_minutes = $8,
       observer_name_text = $9, visit_id = $10,
       overall_score = $11, overall_level = $12, domain_scores_json = $13,
       top_gap_domain = $14, top_strength_domain = $15,
       lesson_structure_json = $16, strengths_list_json = $17,
       areas_for_development_list_json = $18, action_plan_json = $19,
       post_observation_rating = $20,
       strengths_text = $21, priority_gap_text = $22, next_coaching_action = $23,
       teacher_commitment = $24, catchup_estimate_count = $25, catchup_estimate_percent = $26,
       next_visit_date = $27, updated_at = NOW()
     WHERE id = $28`,
    [
      input.schoolId,
      input.teacherUid,
      input.grade,
      input.stream ?? null,
      input.classSize ?? null,
      input.lessonDate,
      JSON.stringify(input.lessonFocus || []),
      input.lessonDurationMinutes ?? null,
      input.observerNameText ?? null,
      input.visitId ?? null,
      analytics.overallScore,
      analytics.overallLevel,
      JSON.stringify(analytics.domainScores),
      analytics.topGapDomain,
      analytics.topStrengthDomain,
      JSON.stringify(input.lessonStructure || []),
      JSON.stringify(input.strengthsList || []),
      JSON.stringify(input.areasForDevelopmentList || []),
      input.actionPlan ? JSON.stringify(input.actionPlan) : null,
      input.postObservationRating ?? null,
      input.strengthsText,
      input.priorityGapText,
      input.nextCoachingAction,
      input.teacherCommitment,
      input.catchupEstimateCount ?? null,
      input.catchupEstimatePercent ?? null,
      input.nextVisitDate ?? null,
      id,
    ],
  );

  // Re-sync all items completely for safety
  await queryPostgres(`DELETE FROM lesson_evaluation_items WHERE evaluation_id = $1`, [id]);

  if (input.items && input.items.length > 0) {
    const itemQueryValues: unknown[] = [];
    const itemParamRefs: string[] = [];

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const offset = i * 5;
      itemParamRefs.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`,
      );
      itemQueryValues.push(id, item.domainKey, item.itemKey, item.score, item.note ?? null);
    }

    await queryPostgres(
      `INSERT INTO lesson_evaluation_items (
         evaluation_id, domain_key, item_key, score, note
       ) VALUES ${itemParamRefs.join(", ")}`,
      itemQueryValues,
    );
  }

  return {
    ...input,
    id,
    status: "active",
    updatedByUserId: actorUserId,
    updatedAt: new Date().toISOString(),
  };
}

export async function voidLessonEvaluationPostgres(
  id: number,
  actorUserId: number,
  reason?: string,
) {
  await queryPostgres(
    `UPDATE lesson_evaluations
     SET status = 'void', void_reason = $1, voided_by_user_id = $2, voided_at = NOW()
     WHERE id = $3`,
    [reason || null, actorUserId, id],
  );
  return { id, status: "void" as const };
}

export async function getLessonEvaluationByIdPostgres(id: number) {
  const result = await queryPostgres(
    `SELECT * FROM lesson_evaluations WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const itemsResult = await queryPostgres(
    `SELECT * FROM lesson_evaluation_items WHERE evaluation_id = $1`,
    [id],
  );

  return {
    ...row,
    id: Number(row.id),
    schoolId: Number(row.school_id),
    teacherUid: String(row.teacher_uid),
    lessonDate: String(row.lesson_date),
    grade: String(row.grade),
    items: itemsResult.rows.map((ir) => ({
      domainKey: String(ir.domain_key),
      itemKey: String(ir.item_key),
      score: Number(ir.score),
      note: ir.note ? String(ir.note) : undefined,
    })),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    createdByUserId: row.observer_id ? Number(row.observer_id) : 0,
  };
}

export async function listLessonEvaluationsPostgres(filters?: { userId?: number; limit?: number }) {
  const limit = Math.min(filters?.limit ?? 200, 2000);
  const params: unknown[] = [limit];
  const clauses: string[] = [];

  if (filters?.userId) {
    params.push(filters.userId);
    clauses.push(`observer_id = $${params.length}`);
  }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `SELECT * FROM lesson_evaluations ${where} ORDER BY created_at DESC LIMIT $1`,
    params,
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    schoolId: Number(row.school_id),
    teacherUid: String(row.teacher_uid),
    lessonDate: String(row.lesson_date),
    status: String(row.status),
    createdByUserId: Number(row.observer_id),
    createdAt: new Date(row.created_at).toISOString(),
    overallScore: Number(row.overall_score),
    overallLevel: String(row.overall_level),
  }));
}
