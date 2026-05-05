import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import {
  ALL_SCORED_CRITERIA,
  LESSON_STRUCTURE_ITEMS,
  type PostObservationRating,
} from "@/lib/phonics-observation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ObservationLessonStructureItem = {
  itemKey: string;
  itemLabel: string;
  observedYesNo: "yes" | "no" | null;
  notes: string | null;
};

export type ObservationScoredItem = {
  sectionKey: string;
  sectionLabel: string;
  criteriaKey: string;
  criteriaLabel: string;
  score: number | null;
  notes: string | null;
};

export type ObservationActionPlan = {
  actionToTake: string;
  resourcesNeeded: string;
  reviewDate: string | null;
};

export type TeacherLessonObservation = {
  id: number;
  observationCode: string;
  teacherName: string;
  observationDate: string;
  schoolName: string;
  observerName: string;
  classLevel: string;
  lessonDuration: string;
  learnersPresent: number | null;
  lessonFocus: string;
  overallPostObservationRating: PostObservationRating | null;
  coachSignatureName: string | null;
  coachSignatureDate: string | null;
  headteacherDosSignatureName: string | null;
  headteacherDosSignatureDate: string | null;
  teacherSignatureName: string | null;
  teacherSignatureDate: string | null;
  schoolId: number | null;
  observerUserId: number | null;
  createdByUserId: number;
  updatedByUserId: number | null;
  status: "draft" | "submitted" | "archived";
  publicVisibility: boolean;
  createdAt: string;
  updatedAt: string;
  // Child records (populated by getById)
  lessonStructure?: ObservationLessonStructureItem[];
  scoredItems?: ObservationScoredItem[];
  strengths?: string[];
  developmentAreas?: string[];
  actionPlan?: ObservationActionPlan | null;
};

export type CreateObservationInput = {
  teacherName: string;
  observationDate: string;
  schoolName: string;
  observerName: string;
  classLevel: string;
  lessonDuration: string;
  learnersPresent?: number | null;
  lessonFocus: string;
  overallPostObservationRating?: PostObservationRating | null;
  coachSignatureName?: string | null;
  coachSignatureDate?: string | null;
  headteacherDosSignatureName?: string | null;
  headteacherDosSignatureDate?: string | null;
  teacherSignatureName?: string | null;
  teacherSignatureDate?: string | null;
  schoolId?: number | null;
  observerUserId?: number | null;
  createdByUserId: number;
  status?: "draft" | "submitted" | "archived";
  publicVisibility?: boolean;
  lessonStructure?: Array<{ itemKey: string; observedYesNo?: "yes" | "no" | null; notes?: string | null }>;
  scoredItems?: Array<{ criteriaKey: string; score?: number | null; notes?: string | null }>;
  strengths?: [string, string, string, string];
  developmentAreas?: [string, string, string, string];
  actionPlan?: ObservationActionPlan | null;
  /** Per-domain rubric scores (0–100) — drive the per-domain Teaching
   *  Quality breakdown on the public Learning Outcomes dashboard. */
  lessonStructureScore?: number | null;
  instructionalDeliveryScore?: number | null;
  learnerEngagementScore?: number | null;
  assessmentPracticesScore?: number | null;
  useOfMaterialsScore?: number | null;
  classroomEnvironmentScore?: number | null;
};

export type UpdateObservationInput = Partial<Omit<CreateObservationInput, "createdByUserId">> & {
  updatedByUserId: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateObservationCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `OZK-OBS-${year}-${rand}`;
}

function mapRow(row: Record<string, unknown>): TeacherLessonObservation {
  return {
    id: Number(row.id),
    observationCode: String(row.observation_code),
    teacherName: String(row.teacher_name),
    observationDate: String(row.observation_date).slice(0, 10),
    schoolName: String(row.school_name),
    observerName: String(row.observer_name),
    classLevel: String(row.class_level),
    lessonDuration: String(row.lesson_duration),
    learnersPresent: row.learners_present != null ? Number(row.learners_present) : null,
    lessonFocus: String(row.lesson_focus),
    overallPostObservationRating: (row.overall_post_observation_rating as PostObservationRating) ?? null,
    coachSignatureName: (row.coach_signature_name as string) ?? null,
    coachSignatureDate: row.coach_signature_date ? String(row.coach_signature_date).slice(0, 10) : null,
    headteacherDosSignatureName: (row.headteacher_dos_signature_name as string) ?? null,
    headteacherDosSignatureDate: row.headteacher_dos_signature_date ? String(row.headteacher_dos_signature_date).slice(0, 10) : null,
    teacherSignatureName: (row.teacher_signature_name as string) ?? null,
    teacherSignatureDate: row.teacher_signature_date ? String(row.teacher_signature_date).slice(0, 10) : null,
    schoolId: row.school_id != null ? Number(row.school_id) : null,
    observerUserId: row.observer_user_id != null ? Number(row.observer_user_id) : null,
    createdByUserId: Number(row.created_by_user_id),
    updatedByUserId: row.updated_by_user_id != null ? Number(row.updated_by_user_id) : null,
    status: row.status as "draft" | "submitted" | "archived",
    publicVisibility: Boolean(row.public_visibility),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Write child records inside a transaction client
// ---------------------------------------------------------------------------

async function writeChildRecords(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }> },
  observationId: number,
  input: Pick<CreateObservationInput, "lessonStructure" | "scoredItems" | "strengths" | "developmentAreas" | "actionPlan">,
) {
  // Section B: lesson structure
  await client.query(`DELETE FROM observation_lesson_structure_items WHERE observation_id = $1`, [observationId]);
  for (const item of LESSON_STRUCTURE_ITEMS) {
    const provided = input.lessonStructure?.find((i) => i.itemKey === item.key);
    await client.query(
      `INSERT INTO observation_lesson_structure_items (observation_id, item_key, item_label, observed_yes_no, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [observationId, item.key, `${item.label}: ${item.description}`, provided?.observedYesNo ?? null, provided?.notes ?? null],
    );
  }

  // Sections C & D: scored items
  await client.query(`DELETE FROM observation_scored_items WHERE observation_id = $1`, [observationId]);
  for (const criterion of ALL_SCORED_CRITERIA) {
    const provided = input.scoredItems?.find((i) => i.criteriaKey === criterion.key);
    await client.query(
      `INSERT INTO observation_scored_items (observation_id, section_key, section_label, criteria_key, criteria_label, score, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        observationId,
        criterion.sectionKey,
        criterion.sectionLabel,
        criterion.key,
        `${criterion.label}: ${criterion.description}`,
        provided?.score ?? null,
        provided?.notes ?? null,
      ],
    );
  }

  // Section E1: strengths
  await client.query(`DELETE FROM observation_strengths WHERE observation_id = $1`, [observationId]);
  const strengths = input.strengths ?? ["", "", "", ""];
  for (let i = 0; i < 4; i++) {
    await client.query(
      `INSERT INTO observation_strengths (observation_id, line_number, content) VALUES ($1, $2, $3)`,
      [observationId, i + 1, strengths[i] ?? ""],
    );
  }

  // Section E2: development areas
  await client.query(`DELETE FROM observation_development_areas WHERE observation_id = $1`, [observationId]);
  const devAreas = input.developmentAreas ?? ["", "", "", ""];
  for (let i = 0; i < 4; i++) {
    await client.query(
      `INSERT INTO observation_development_areas (observation_id, line_number, content) VALUES ($1, $2, $3)`,
      [observationId, i + 1, devAreas[i] ?? ""],
    );
  }

  // Section E3: action plan
  await client.query(`DELETE FROM observation_action_plans WHERE observation_id = $1`, [observationId]);
  if (input.actionPlan) {
    await client.query(
      `INSERT INTO observation_action_plans (observation_id, action_to_take, resources_needed, review_date)
       VALUES ($1, $2, $3, $4)`,
      [
        observationId,
        input.actionPlan.actionToTake,
        input.actionPlan.resourcesNeeded,
        input.actionPlan.reviewDate || null,
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createObservationPostgres(input: CreateObservationInput): Promise<number> {
  const code = generateObservationCode();

  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const res = await client.query<{ id: number }>(
        `INSERT INTO teacher_lesson_observations (
           observation_code, teacher_name, observation_date, school_name, observer_name,
           class_level, lesson_duration, learners_present, lesson_focus,
           overall_post_observation_rating,
           coach_signature_name, coach_signature_date,
           headteacher_dos_signature_name, headteacher_dos_signature_date,
           teacher_signature_name, teacher_signature_date,
           school_id, observer_user_id, created_by_user_id, status, public_visibility,
           lesson_structure_score, instructional_delivery_score, learner_engagement_score,
           assessment_practices_score, use_of_materials_score, classroom_environment_score
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
         RETURNING id`,
        [
          code,
          input.teacherName,
          input.observationDate,
          input.schoolName,
          input.observerName,
          input.classLevel,
          input.lessonDuration,
          input.learnersPresent ?? null,
          input.lessonFocus,
          input.overallPostObservationRating ?? null,
          input.coachSignatureName ?? null,
          input.coachSignatureDate ?? null,
          input.headteacherDosSignatureName ?? null,
          input.headteacherDosSignatureDate ?? null,
          input.teacherSignatureName ?? null,
          input.teacherSignatureDate ?? null,
          input.schoolId ?? null,
          input.observerUserId ?? null,
          input.createdByUserId,
          input.status ?? "draft",
          input.publicVisibility ?? false,
          input.lessonStructureScore ?? null,
          input.instructionalDeliveryScore ?? null,
          input.learnerEngagementScore ?? null,
          input.assessmentPracticesScore ?? null,
          input.useOfMaterialsScore ?? null,
          input.classroomEnvironmentScore ?? null,
        ],
      );

      const observationId = res.rows[0].id;
      await writeChildRecords(client, observationId, input);
      await client.query("COMMIT");
      return observationId;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

export async function updateObservationPostgres(
  id: number,
  input: UpdateObservationInput,
): Promise<void> {
  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;

      const field = (col: string, val: unknown) => { sets.push(`${col} = $${idx++}`); vals.push(val); };

      if (input.teacherName !== undefined) field("teacher_name", input.teacherName);
      if (input.observationDate !== undefined) field("observation_date", input.observationDate);
      if (input.schoolName !== undefined) field("school_name", input.schoolName);
      if (input.observerName !== undefined) field("observer_name", input.observerName);
      if (input.classLevel !== undefined) field("class_level", input.classLevel);
      if (input.lessonDuration !== undefined) field("lesson_duration", input.lessonDuration);
      if (input.learnersPresent !== undefined) field("learners_present", input.learnersPresent);
      if (input.lessonFocus !== undefined) field("lesson_focus", input.lessonFocus);
      if (input.overallPostObservationRating !== undefined) field("overall_post_observation_rating", input.overallPostObservationRating ?? null);
      if (input.coachSignatureName !== undefined) field("coach_signature_name", input.coachSignatureName ?? null);
      if (input.coachSignatureDate !== undefined) field("coach_signature_date", input.coachSignatureDate ?? null);
      if (input.headteacherDosSignatureName !== undefined) field("headteacher_dos_signature_name", input.headteacherDosSignatureName ?? null);
      if (input.headteacherDosSignatureDate !== undefined) field("headteacher_dos_signature_date", input.headteacherDosSignatureDate ?? null);
      if (input.teacherSignatureName !== undefined) field("teacher_signature_name", input.teacherSignatureName ?? null);
      if (input.teacherSignatureDate !== undefined) field("teacher_signature_date", input.teacherSignatureDate ?? null);
      if (input.schoolId !== undefined) field("school_id", input.schoolId ?? null);
      if (input.observerUserId !== undefined) field("observer_user_id", input.observerUserId ?? null);
      if (input.status !== undefined) field("status", input.status);
      if (input.publicVisibility !== undefined) field("public_visibility", input.publicVisibility);
      if (input.lessonStructureScore !== undefined) field("lesson_structure_score", input.lessonStructureScore ?? null);
      if (input.instructionalDeliveryScore !== undefined) field("instructional_delivery_score", input.instructionalDeliveryScore ?? null);
      if (input.learnerEngagementScore !== undefined) field("learner_engagement_score", input.learnerEngagementScore ?? null);
      if (input.assessmentPracticesScore !== undefined) field("assessment_practices_score", input.assessmentPracticesScore ?? null);
      if (input.useOfMaterialsScore !== undefined) field("use_of_materials_score", input.useOfMaterialsScore ?? null);
      if (input.classroomEnvironmentScore !== undefined) field("classroom_environment_score", input.classroomEnvironmentScore ?? null);

      sets.push(`updated_by_user_id = $${idx++}`, `updated_at = NOW()`);
      vals.push(input.updatedByUserId);
      vals.push(id);

      if (sets.length > 2) {
        await client.query(
          `UPDATE teacher_lesson_observations SET ${sets.join(", ")} WHERE id = $${idx}`,
          vals,
        );
      }

      await writeChildRecords(client, id, input);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  });
}

export async function getObservationByIdPostgres(id: number): Promise<TeacherLessonObservation | null> {
  const main = await queryPostgres<Record<string, unknown>>(
    `SELECT * FROM teacher_lesson_observations WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (!main.rows[0]) return null;

  const obs = mapRow(main.rows[0]);

  const [struct, scored, strengths, devAreas, actionPlan] = await Promise.all([
    queryPostgres<Record<string, unknown>>(
      `SELECT item_key, item_label, observed_yes_no, notes FROM observation_lesson_structure_items WHERE observation_id = $1 ORDER BY id`,
      [id],
    ),
    queryPostgres<Record<string, unknown>>(
      `SELECT section_key, section_label, criteria_key, criteria_label, score, notes FROM observation_scored_items WHERE observation_id = $1 ORDER BY id`,
      [id],
    ),
    queryPostgres<Record<string, unknown>>(
      `SELECT line_number, content FROM observation_strengths WHERE observation_id = $1 ORDER BY line_number`,
      [id],
    ),
    queryPostgres<Record<string, unknown>>(
      `SELECT line_number, content FROM observation_development_areas WHERE observation_id = $1 ORDER BY line_number`,
      [id],
    ),
    queryPostgres<Record<string, unknown>>(
      `SELECT action_to_take, resources_needed, review_date FROM observation_action_plans WHERE observation_id = $1 LIMIT 1`,
      [id],
    ),
  ]);

  obs.lessonStructure = struct.rows.map((r) => ({
    itemKey: String(r.item_key),
    itemLabel: String(r.item_label),
    observedYesNo: (r.observed_yes_no as "yes" | "no" | null) ?? null,
    notes: (r.notes as string) ?? null,
  }));

  obs.scoredItems = scored.rows.map((r) => ({
    sectionKey: String(r.section_key),
    sectionLabel: String(r.section_label),
    criteriaKey: String(r.criteria_key),
    criteriaLabel: String(r.criteria_label),
    score: r.score != null ? Number(r.score) : null,
    notes: (r.notes as string) ?? null,
  }));

  const strArr: string[] = ["", "", "", ""];
  strengths.rows.forEach((r) => { strArr[Number(r.line_number) - 1] = String(r.content); });
  obs.strengths = strArr;

  const devArr: string[] = ["", "", "", ""];
  devAreas.rows.forEach((r) => { devArr[Number(r.line_number) - 1] = String(r.content); });
  obs.developmentAreas = devArr;

  obs.actionPlan = actionPlan.rows[0]
    ? {
        actionToTake: String(actionPlan.rows[0].action_to_take),
        resourcesNeeded: String(actionPlan.rows[0].resources_needed),
        reviewDate: actionPlan.rows[0].review_date ? String(actionPlan.rows[0].review_date).slice(0, 10) : null,
      }
    : null;

  return obs;
}

export type ListObservationsFilter = {
  status?: string;
  schoolId?: number;
  createdByUserId?: number;
  observerUserId?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export async function listObservationsPostgres(filter: ListObservationsFilter = {}): Promise<TeacherLessonObservation[]> {
  const conditions: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  if (filter.status) { conditions.push(`status = $${idx++}`); vals.push(filter.status); }
  if (filter.schoolId) { conditions.push(`school_id = $${idx++}`); vals.push(filter.schoolId); }
  if (filter.createdByUserId) { conditions.push(`created_by_user_id = $${idx++}`); vals.push(filter.createdByUserId); }
  if (filter.observerUserId) { conditions.push(`observer_user_id = $${idx++}`); vals.push(filter.observerUserId); }
  if (filter.dateFrom) { conditions.push(`observation_date >= $${idx++}`); vals.push(filter.dateFrom); }
  if (filter.dateTo) { conditions.push(`observation_date <= $${idx++}`); vals.push(filter.dateTo); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;

  const res = await queryPostgres<Record<string, unknown>>(
    `SELECT * FROM teacher_lesson_observations ${where} ORDER BY observation_date DESC, created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...vals, limit, offset],
  );

  return res.rows.map(mapRow);
}

export async function archiveObservationPostgres(id: number, userId: number): Promise<void> {
  await queryPostgres(
    `UPDATE teacher_lesson_observations SET status = 'archived', updated_by_user_id = $1, updated_at = NOW() WHERE id = $2`,
    [userId, id],
  );
}

export async function getPublicObservationFidelityStatsPostgres(): Promise<{
  totalSubmitted: number;
  fidelityCount: number;
  partialCount: number;
  lowCount: number;
  fidelityPct: number;
  monthlyTrend: Array<{ month: string; fidelityCount: number; partialCount: number; lowCount: number }>;
}> {
  const [counts, trend] = await Promise.all([
    queryPostgres<Record<string, unknown>>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'submitted') AS total_submitted,
         COUNT(*) FILTER (WHERE status = 'submitted' AND overall_post_observation_rating = 'fidelity') AS fidelity_count,
         COUNT(*) FILTER (WHERE status = 'submitted' AND overall_post_observation_rating = 'partial') AS partial_count,
         COUNT(*) FILTER (WHERE status = 'submitted' AND overall_post_observation_rating = 'low') AS low_count
       FROM teacher_lesson_observations WHERE status != 'archived'`,
    ),
    queryPostgres<Record<string, unknown>>(
      `SELECT
         to_char(observation_date, 'YYYY-MM') AS month,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'fidelity')::int AS fidelity_count,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'partial')::int AS partial_count,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'low')::int AS low_count
       FROM teacher_lesson_observations
       WHERE status = 'submitted'
         AND observation_date >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month ASC`,
    ),
  ]);

  const c = counts.rows[0];
  const total = Number(c?.total_submitted ?? 0);
  const fidelityCount = Number(c?.fidelity_count ?? 0);
  return {
    totalSubmitted: total,
    fidelityCount,
    partialCount: Number(c?.partial_count ?? 0),
    lowCount: Number(c?.low_count ?? 0),
    fidelityPct: total > 0 ? Math.round((fidelityCount / total) * 100) : 0,
    monthlyTrend: trend.rows.map((r) => ({
      month: String(r.month),
      fidelityCount: Number(r.fidelity_count ?? 0),
      partialCount: Number(r.partial_count ?? 0),
      lowCount: Number(r.low_count ?? 0),
    })),
  };
}

/**
 * Teaching-quality IMPROVEMENT signal for the Public Live Impact
 * Dashboard. Compares the current 90-day window against the prior
 * 90-day window for:
 *   - overall fidelity %                    (deltaPp)
 *   - average per-domain rubric score (0-100, 6 domains)  (deltaPoints)
 *   - lesson-structure adherence per checkpoint  (deltaPp)
 * Empty arrays / zero deltas when no submissions yet.
 */
export type TeachingQualityImprovement = {
  current: { fidelityPct: number; submitted: number };
  prior: { fidelityPct: number; submitted: number };
  fidelityDeltaPp: number;
  domainImprovements: Array<{
    domainKey:
      | "lesson_structure_score"
      | "instructional_delivery_score"
      | "learner_engagement_score"
      | "assessment_practices_score"
      | "use_of_materials_score"
      | "classroom_environment_score";
    label: string;
    currentAvg: number;
    priorAvg: number;
    deltaPoints: number;
  }>;
  lessonStructureImprovements: Array<{
    itemKey: string;
    itemLabel: string;
    currentAdherencePct: number;
    priorAdherencePct: number;
    deltaPp: number;
  }>;
};

const DOMAIN_LABELS: Array<{ column: TeachingQualityImprovement["domainImprovements"][number]["domainKey"]; label: string }> = [
  { column: "lesson_structure_score", label: "Lesson Structure" },
  { column: "instructional_delivery_score", label: "Instructional Delivery" },
  { column: "learner_engagement_score", label: "Learner Engagement" },
  { column: "assessment_practices_score", label: "Assessment Practices" },
  { column: "use_of_materials_score", label: "Use of Materials" },
  { column: "classroom_environment_score", label: "Classroom Environment" },
];

export async function getPublicTeachingQualityImprovementPostgres(): Promise<TeachingQualityImprovement> {
  try {
    const [bands, domains, structure] = await Promise.all([
      // Headline fidelity for current vs prior 90-day window
      queryPostgres<{ window: string; submitted: number; fidelity: number }>(
        `SELECT
           CASE WHEN observation_date >= NOW() - INTERVAL '90 days' THEN 'current' ELSE 'prior' END AS window,
           COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
           COUNT(*) FILTER (WHERE status = 'submitted' AND overall_post_observation_rating = 'fidelity')::int AS fidelity
         FROM teacher_lesson_observations
         WHERE observation_date >= NOW() - INTERVAL '180 days'
         GROUP BY window`,
      ),
      // Per-domain averages (current vs prior)
      queryPostgres<{
        window: string;
        ls: number | null; id: number | null; le: number | null;
        ap: number | null; um: number | null; ce: number | null;
      }>(
        `SELECT
           CASE WHEN observation_date >= NOW() - INTERVAL '90 days' THEN 'current' ELSE 'prior' END AS window,
           AVG(lesson_structure_score)         FILTER (WHERE status = 'submitted' AND lesson_structure_score IS NOT NULL)         AS ls,
           AVG(instructional_delivery_score)   FILTER (WHERE status = 'submitted' AND instructional_delivery_score IS NOT NULL)   AS id,
           AVG(learner_engagement_score)       FILTER (WHERE status = 'submitted' AND learner_engagement_score IS NOT NULL)       AS le,
           AVG(assessment_practices_score)     FILTER (WHERE status = 'submitted' AND assessment_practices_score IS NOT NULL)     AS ap,
           AVG(use_of_materials_score)         FILTER (WHERE status = 'submitted' AND use_of_materials_score IS NOT NULL)         AS um,
           AVG(classroom_environment_score)    FILTER (WHERE status = 'submitted' AND classroom_environment_score IS NOT NULL)    AS ce
         FROM teacher_lesson_observations
         WHERE observation_date >= NOW() - INTERVAL '180 days'
         GROUP BY window`,
      ),
      // Per-Section-B-checkpoint adherence current vs prior
      queryPostgres<{ window: string; item_key: string; item_label: string; observed: number; total: number }>(
        `SELECT
           CASE WHEN tlo.observation_date >= NOW() - INTERVAL '90 days' THEN 'current' ELSE 'prior' END AS window,
           lsi.item_key,
           MAX(lsi.item_label) AS item_label,
           COUNT(*) FILTER (WHERE lsi.observed_yes_no = 'yes')::int AS observed,
           COUNT(*) FILTER (WHERE lsi.observed_yes_no IN ('yes', 'no'))::int AS total
         FROM observation_lesson_structure_items lsi
         JOIN teacher_lesson_observations tlo ON tlo.id = lsi.observation_id
         WHERE tlo.status = 'submitted'
           AND tlo.observation_date >= NOW() - INTERVAL '180 days'
         GROUP BY window, lsi.item_key
         ORDER BY MIN(lsi.id)`,
      ),
    ]);

    const findBand = (w: "current" | "prior") =>
      bands.rows.find((r) => r.window === w) ?? { window: w, submitted: 0, fidelity: 0 };
    const c = findBand("current");
    const p = findBand("prior");
    const fidelityCurr = Number(c.submitted) > 0 ? Math.round((Number(c.fidelity) / Number(c.submitted)) * 1000) / 10 : 0;
    const fidelityPrior = Number(p.submitted) > 0 ? Math.round((Number(p.fidelity) / Number(p.submitted)) * 1000) / 10 : 0;

    const domainCurr = domains.rows.find((r) => r.window === "current");
    const domainPrior = domains.rows.find((r) => r.window === "prior");
    const round = (v: number | null | undefined) => (v === null || v === undefined ? 0 : Math.round(Number(v) * 10) / 10);
    const dvalue = (row: typeof domainCurr, key: TeachingQualityImprovement["domainImprovements"][number]["domainKey"]): number => {
      if (!row) return 0;
      switch (key) {
        case "lesson_structure_score": return round(row.ls);
        case "instructional_delivery_score": return round(row.id);
        case "learner_engagement_score": return round(row.le);
        case "assessment_practices_score": return round(row.ap);
        case "use_of_materials_score": return round(row.um);
        case "classroom_environment_score": return round(row.ce);
      }
    };
    const domainImprovements = DOMAIN_LABELS.map((d) => {
      const currentAvg = dvalue(domainCurr, d.column);
      const priorAvg = dvalue(domainPrior, d.column);
      return {
        domainKey: d.column,
        label: d.label,
        currentAvg,
        priorAvg,
        deltaPoints: Math.round((currentAvg - priorAvg) * 10) / 10,
      };
    });

    // Group structure rows by item_key
    const byItem = new Map<string, { label: string; current?: { observed: number; total: number }; prior?: { observed: number; total: number } }>();
    for (const r of structure.rows) {
      const key = String(r.item_key);
      const cur = byItem.get(key) ?? { label: String(r.item_label) };
      const window = r.window === "current" ? "current" : "prior";
      cur[window] = { observed: Number(r.observed ?? 0), total: Number(r.total ?? 0) };
      byItem.set(key, cur);
    }
    const lessonStructureImprovements = Array.from(byItem.entries()).map(([key, v]) => {
      const cAd = v.current && v.current.total > 0 ? Math.round((v.current.observed / v.current.total) * 1000) / 10 : 0;
      const pAd = v.prior && v.prior.total > 0 ? Math.round((v.prior.observed / v.prior.total) * 1000) / 10 : 0;
      return {
        itemKey: key,
        itemLabel: v.label,
        currentAdherencePct: cAd,
        priorAdherencePct: pAd,
        deltaPp: Math.round((cAd - pAd) * 10) / 10,
      };
    });

    return {
      current: { fidelityPct: fidelityCurr, submitted: Number(c.submitted) },
      prior: { fidelityPct: fidelityPrior, submitted: Number(p.submitted) },
      fidelityDeltaPp: Math.round((fidelityCurr - fidelityPrior) * 10) / 10,
      domainImprovements,
      lessonStructureImprovements,
    };
  } catch {
    return {
      current: { fidelityPct: 0, submitted: 0 },
      prior: { fidelityPct: 0, submitted: 0 },
      fidelityDeltaPp: 0,
      domainImprovements: DOMAIN_LABELS.map((d) => ({
        domainKey: d.column, label: d.label, currentAvg: 0, priorAvg: 0, deltaPoints: 0,
      })),
      lessonStructureImprovements: [],
    };
  }
}

export async function getObservationDashboardStatsPostgres(): Promise<{
  total: number;
  submitted: number;
  draft: number;
  fidelityCount: number;
  partialCount: number;
  lowCount: number;
  recentObservations: TeacherLessonObservation[];
}> {
  const [counts, recent] = await Promise.all([
    queryPostgres<Record<string, unknown>>(
      `SELECT
         COUNT(*) FILTER (WHERE status != 'archived') AS total,
         COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
         COUNT(*) FILTER (WHERE status = 'draft') AS draft,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'fidelity') AS fidelity_count,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'partial') AS partial_count,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'low') AS low_count
       FROM teacher_lesson_observations WHERE status != 'archived'`,
    ),
    queryPostgres<Record<string, unknown>>(
      `SELECT * FROM teacher_lesson_observations WHERE status = 'submitted' ORDER BY observation_date DESC, created_at DESC LIMIT 5`,
    ),
  ]);

  const c = counts.rows[0];
  return {
    total: Number(c?.total ?? 0),
    submitted: Number(c?.submitted ?? 0),
    draft: Number(c?.draft ?? 0),
    fidelityCount: Number(c?.fidelity_count ?? 0),
    partialCount: Number(c?.partial_count ?? 0),
    lowCount: Number(c?.low_count ?? 0),
    recentObservations: recent.rows.map(mapRow),
  };
}
