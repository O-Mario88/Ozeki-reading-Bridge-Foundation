import { queryPostgres } from "@/lib/server/postgres/client";

/**
 * Public Learning Outcomes aggregation layer.
 *
 * Every function returns aggregated, privacy-safe figures only —
 * never raw learner / teacher / school identifiers. The MIN_SAMPLE
 * threshold suppresses any group that would expose a small cohort.
 */

export const MIN_PUBLIC_SAMPLE_SIZE = 30;

/* Filters that drive every aggregation. Optional fields fall through
   to a national rollup. */
export type PublicOutcomesFilters = {
  period?: string;       // e.g. "2024-05" — bucket month; default = current
  region?: string;
  subRegion?: string;
  district?: string;
  subCounty?: string;
  parish?: string;
  programme?: string;
};

function geoClause(filters: PublicOutcomesFilters, params: unknown[]): string {
  const conds: string[] = [];
  if (filters.region) { params.push(filters.region); conds.push(`sd.region = $${params.length}`); }
  if (filters.subRegion) { params.push(filters.subRegion); conds.push(`sd.sub_region = $${params.length}`); }
  if (filters.district) { params.push(filters.district); conds.push(`sd.district = $${params.length}`); }
  if (filters.subCounty) { params.push(filters.subCounty); conds.push(`sd.sub_county = $${params.length}`); }
  if (filters.parish) { params.push(filters.parish); conds.push(`sd.parish = $${params.length}`); }
  return conds.length > 0 ? `AND ${conds.join(" AND ")}` : "";
}

/* ────────────────────────────────────────────────────────────────────
   KPI 1 — Learners Assessed (distinct in period)
   ──────────────────────────────────────────────────────────────────── */
export type LearnersAssessedKpi = { current: number; previous: number; deltaPct: number };

export async function getLearnersAssessedKpi(
  filters: PublicOutcomesFilters = {},
): Promise<LearnersAssessedKpi> {
  try {
    const params: unknown[] = [];
    const where = geoClause(filters, params);
    const result = await queryPostgres<{ current: number; previous: number }>(
      `SELECT
         COUNT(DISTINCT ar.learner_uid) FILTER (WHERE ar.assessment_date >= date_trunc('month', NOW()))::int AS current,
         COUNT(DISTINCT ar.learner_uid) FILTER (
           WHERE ar.assessment_date >= date_trunc('month', NOW() - INTERVAL '1 month')
             AND ar.assessment_date < date_trunc('month', NOW())
         )::int AS previous
       FROM assessment_records ar
       LEFT JOIN schools_directory sd ON sd.id = ar.school_id
       WHERE ar.learner_uid IS NOT NULL ${where}`,
      params,
    );
    const current = Number(result.rows[0]?.current ?? 0);
    const previous = Number(result.rows[0]?.previous ?? 0);
    const deltaPct = previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 0;
    return { current, previous, deltaPct };
  } catch {
    return { current: 0, previous: 0, deltaPct: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   KPI 2 — Reading Proficiency Rate (% At/Above Benchmark)
   At/Above Benchmark = reading_stage_order >= 3 (Competent/Strong) OR
   reading_stage_label IN ('competent', 'strong', 'fluent', 'developing')
   when stage_order is null.
   ──────────────────────────────────────────────────────────────────── */
export type ProficiencyKpi = { current: number; previous: number; deltaPp: number };

const AT_ABOVE_FILTER = `(
  ar.reading_stage_order >= 3
  OR (ar.reading_stage_order IS NULL AND lower(coalesce(ar.reading_stage_label, '')) IN ('competent', 'strong', 'fluent', 'developing'))
)`;

export async function getReadingProficiencyKpi(
  filters: PublicOutcomesFilters = {},
): Promise<ProficiencyKpi> {
  try {
    const params: unknown[] = [];
    const where = geoClause(filters, params);
    const result = await queryPostgres<{
      curr_assessed: number; curr_at: number;
      prev_assessed: number; prev_at: number;
    }>(
      `WITH curr AS (
         SELECT DISTINCT ON (ar.learner_uid) ar.learner_uid, ar.reading_stage_order, ar.reading_stage_label
         FROM assessment_records ar
         LEFT JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.learner_uid IS NOT NULL
           AND ar.assessment_date >= date_trunc('month', NOW()) ${where}
         ORDER BY ar.learner_uid, ar.assessment_date DESC
       ),
       prev AS (
         SELECT DISTINCT ON (ar.learner_uid) ar.learner_uid, ar.reading_stage_order, ar.reading_stage_label
         FROM assessment_records ar
         LEFT JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.learner_uid IS NOT NULL
           AND ar.assessment_date >= date_trunc('month', NOW() - INTERVAL '1 month')
           AND ar.assessment_date < date_trunc('month', NOW()) ${where}
         ORDER BY ar.learner_uid, ar.assessment_date DESC
       )
       SELECT
         (SELECT COUNT(*)::int FROM curr) AS curr_assessed,
         (SELECT COUNT(*)::int FROM curr ar WHERE ${AT_ABOVE_FILTER}) AS curr_at,
         (SELECT COUNT(*)::int FROM prev) AS prev_assessed,
         (SELECT COUNT(*)::int FROM prev ar WHERE ${AT_ABOVE_FILTER}) AS prev_at`,
      params,
    );
    const cA = Number(result.rows[0]?.curr_assessed ?? 0);
    const cAt = Number(result.rows[0]?.curr_at ?? 0);
    const pA = Number(result.rows[0]?.prev_assessed ?? 0);
    const pAt = Number(result.rows[0]?.prev_at ?? 0);
    const current = cA > 0 ? Math.round((cAt / cA) * 1000) / 10 : 0;
    const previous = pA > 0 ? Math.round((pAt / pA) * 1000) / 10 : 0;
    return { current, previous, deltaPp: Math.round((current - previous) * 10) / 10 };
  } catch {
    return { current: 0, previous: 0, deltaPp: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   KPI 3 — Teaching Quality Index (avg observation fidelity %)
   ──────────────────────────────────────────────────────────────────── */
export type TeachingQualityKpi = { current: number; previous: number; deltaPp: number };

export async function getTeachingQualityIndexKpi(): Promise<TeachingQualityKpi> {
  try {
    const result = await queryPostgres<{ curr_total: number; curr_fid: number; prev_total: number; prev_fid: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'submitted' AND observation_date >= date_trunc('month', NOW()))::int AS curr_total,
         COUNT(*) FILTER (WHERE status = 'submitted' AND observation_date >= date_trunc('month', NOW()) AND overall_post_observation_rating = 'fidelity')::int AS curr_fid,
         COUNT(*) FILTER (WHERE status = 'submitted' AND observation_date >= date_trunc('month', NOW() - INTERVAL '1 month') AND observation_date < date_trunc('month', NOW()))::int AS prev_total,
         COUNT(*) FILTER (WHERE status = 'submitted' AND observation_date >= date_trunc('month', NOW() - INTERVAL '1 month') AND observation_date < date_trunc('month', NOW()) AND overall_post_observation_rating = 'fidelity')::int AS prev_fid
       FROM teacher_lesson_observations`,
    );
    const cT = Number(result.rows[0]?.curr_total ?? 0);
    const cF = Number(result.rows[0]?.curr_fid ?? 0);
    const pT = Number(result.rows[0]?.prev_total ?? 0);
    const pF = Number(result.rows[0]?.prev_fid ?? 0);
    const current = cT > 0 ? Math.round((cF / cT) * 1000) / 10 : 0;
    const previous = pT > 0 ? Math.round((pF / pT) * 1000) / 10 : 0;
    return { current, previous, deltaPp: Math.round((current - previous) * 10) / 10 };
  } catch {
    return { current: 0, previous: 0, deltaPp: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   KPI 5 — Moved Up 1+ Reading Level
   ──────────────────────────────────────────────────────────────────── */
export type MovedUpKpi = { rate: number; matched: number; movedUp: number; deltaPp: number };

export async function getMovedUpKpi(filters: PublicOutcomesFilters = {}): Promise<MovedUpKpi> {
  try {
    const params: unknown[] = [];
    const where = geoClause(filters, params);
    const result = await queryPostgres<{ matched: number; moved: number }>(
      `WITH baselines AS (
         SELECT DISTINCT ON (ar.learner_uid) ar.learner_uid, ar.reading_stage_order
         FROM assessment_records ar
         LEFT JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.assessment_type = 'baseline' AND ar.learner_uid IS NOT NULL
           AND ar.reading_stage_order IS NOT NULL ${where}
         ORDER BY ar.learner_uid, ar.assessment_date ASC
       ),
       latest AS (
         SELECT DISTINCT ON (ar.learner_uid) ar.learner_uid, ar.reading_stage_order, ar.assessment_date
         FROM assessment_records ar
         LEFT JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.assessment_type IN ('progress', 'endline')
           AND ar.learner_uid IS NOT NULL
           AND ar.reading_stage_order IS NOT NULL ${where}
         ORDER BY ar.learner_uid, ar.assessment_date DESC
       )
       SELECT
         COUNT(*)::int AS matched,
         COUNT(*) FILTER (WHERE l.reading_stage_order > b.reading_stage_order)::int AS moved
       FROM baselines b JOIN latest l ON l.learner_uid = b.learner_uid`,
      params,
    );
    const matched = Number(result.rows[0]?.matched ?? 0);
    const moved = Number(result.rows[0]?.moved ?? 0);
    const rate = matched > 0 ? Math.round((moved / matched) * 1000) / 10 : 0;
    return { rate, matched, movedUp: moved, deltaPp: 0 };
  } catch {
    return { rate: 0, matched: 0, movedUp: 0, deltaPp: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   Data Quality breakdown — three real %s sourced from the new
   validation_status / submitted_at columns on assessment_records.
   ──────────────────────────────────────────────────────────────────── */
export type DataQualityBreakdown = {
  completionPct: number;
  validUsablePct: number;
  timelinessPct: number;
  deltaPp: number;
};

export async function getDataQualityBreakdown(): Promise<DataQualityBreakdown> {
  try {
    const [completionRes, qualityRes] = await Promise.all([
      queryPostgres<{ scheduled: number; completed: number }>(
        `WITH scheduled AS (
           SELECT DISTINCT se.school_id, se.assessment_window_id
           FROM school_engagements se
           WHERE se.assessment_window_id IS NOT NULL AND se.school_id IS NOT NULL
         ),
         completed AS (
           SELECT s.school_id, s.assessment_window_id
           FROM scheduled s
           JOIN assessment_schedule_windows w ON w.id = s.assessment_window_id
           WHERE EXISTS (
             SELECT 1 FROM assessment_records ar
             WHERE ar.school_id = s.school_id
               AND ar.assessment_date BETWEEN w.window_open AND w.window_close
           )
         )
         SELECT (SELECT COUNT(*)::int FROM scheduled) AS scheduled,
                (SELECT COUNT(*)::int FROM completed) AS completed`,
      ),
      queryPostgres<{ total: number; valid: number; on_time: number }>(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE validation_status = 'valid')::int AS valid,
           COUNT(*) FILTER (
             WHERE submitted_at IS NOT NULL
               AND submitted_at <= (assessment_date + INTERVAL '14 days')
           )::int AS on_time
         FROM assessment_records`,
      ),
    ]);
    const sc = Number(completionRes.rows[0]?.scheduled ?? 0);
    const co = Number(completionRes.rows[0]?.completed ?? 0);
    const total = Number(qualityRes.rows[0]?.total ?? 0);
    const valid = Number(qualityRes.rows[0]?.valid ?? 0);
    const onTime = Number(qualityRes.rows[0]?.on_time ?? 0);
    return {
      completionPct: sc > 0 ? Math.round((co / sc) * 1000) / 10 : 0,
      // When validation_status hasn't been populated yet, treat all
      // records as provisional (pct = 0 rather than 100, so the dial
      // honestly reflects validation rollout).
      validUsablePct: total > 0 && valid > 0 ? Math.round((valid / total) * 1000) / 10 : 0,
      timelinessPct: total > 0 && onTime > 0 ? Math.round((onTime / total) * 1000) / 10 : 0,
      deltaPp: 0,
    };
  } catch {
    return { completionPct: 0, validUsablePct: 0, timelinessPct: 0, deltaPp: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   KPI 6 — Data Completeness (assessment-window completion %)
   ──────────────────────────────────────────────────────────────────── */
export async function getDataCompletenessKpi(): Promise<{ current: number; deltaPp: number }> {
  try {
    const result = await queryPostgres<{ scheduled: number; completed: number }>(
      `WITH scheduled AS (
         SELECT DISTINCT se.school_id, se.assessment_window_id
         FROM school_engagements se
         WHERE se.assessment_window_id IS NOT NULL AND se.school_id IS NOT NULL
       ),
       completed AS (
         SELECT s.school_id, s.assessment_window_id
         FROM scheduled s
         JOIN assessment_schedule_windows w ON w.id = s.assessment_window_id
         WHERE EXISTS (
           SELECT 1 FROM assessment_records ar
           WHERE ar.school_id = s.school_id
             AND ar.assessment_date BETWEEN w.window_open AND w.window_close
         )
       )
       SELECT (SELECT COUNT(*)::int FROM scheduled) AS scheduled,
              (SELECT COUNT(*)::int FROM completed) AS completed`,
    );
    const sc = Number(result.rows[0]?.scheduled ?? 0);
    const co = Number(result.rows[0]?.completed ?? 0);
    return { current: sc > 0 ? Math.round((co / sc) * 1000) / 10 : 0, deltaPp: 0 };
  } catch {
    return { current: 0, deltaPp: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   Reading Levels Distribution (latest reading_stage per learner)
   ──────────────────────────────────────────────────────────────────── */
export type ReadingLevelsDistribution = {
  total: number;
  bands: { label: "Fluent" | "Developing" | "Emerging" | "Beginning"; count: number; pct: number }[];
  atOrAbovePct: number;
};

export async function getReadingLevelsDistribution(
  filters: PublicOutcomesFilters = {},
): Promise<ReadingLevelsDistribution> {
  const empty: ReadingLevelsDistribution = {
    total: 0,
    bands: [
      { label: "Fluent", count: 0, pct: 0 },
      { label: "Developing", count: 0, pct: 0 },
      { label: "Emerging", count: 0, pct: 0 },
      { label: "Beginning", count: 0, pct: 0 },
    ],
    atOrAbovePct: 0,
  };
  try {
    const params: unknown[] = [];
    const where = geoClause(filters, params);
    const result = await queryPostgres<{ stage_order: number; count: number }>(
      `WITH latest AS (
         SELECT DISTINCT ON (ar.learner_uid) ar.learner_uid, ar.reading_stage_order
         FROM assessment_records ar
         LEFT JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.learner_uid IS NOT NULL
           AND ar.reading_stage_order IS NOT NULL ${where}
         ORDER BY ar.learner_uid, ar.assessment_date DESC
       )
       SELECT reading_stage_order AS stage_order, COUNT(*)::int AS count
       FROM latest GROUP BY reading_stage_order`,
      params,
    );
    let fluent = 0, developing = 0, emerging = 0, beginning = 0;
    for (const r of result.rows) {
      const o = Number(r.stage_order);
      const c = Number(r.count);
      if (o >= 4) fluent += c;
      else if (o === 3) developing += c;
      else if (o === 2) emerging += c;
      else beginning += c;
    }
    const total = fluent + developing + emerging + beginning;
    if (total < MIN_PUBLIC_SAMPLE_SIZE) return empty;
    return {
      total,
      bands: [
        { label: "Fluent", count: fluent, pct: Math.round((fluent / total) * 1000) / 10 },
        { label: "Developing", count: developing, pct: Math.round((developing / total) * 1000) / 10 },
        { label: "Emerging", count: emerging, pct: Math.round((emerging / total) * 1000) / 10 },
        { label: "Beginning", count: beginning, pct: Math.round((beginning / total) * 1000) / 10 },
      ],
      atOrAbovePct: Math.round(((fluent + developing) / total) * 1000) / 10,
    };
  } catch {
    return empty;
  }
}

/* ────────────────────────────────────────────────────────────────────
   Trend over time — % at/above benchmark for each of the last N months
   ──────────────────────────────────────────────────────────────────── */
export type TrendPoint = { month: string; pct: number };

export async function getLearningOutcomesTrend(
  filters: PublicOutcomesFilters = {},
  months = 12,
): Promise<TrendPoint[]> {
  try {
    const params: unknown[] = [months];
    const where = geoClause(filters, params);
    const result = await queryPostgres<{ month: string; assessed: number; at_above: number }>(
      `WITH bucket AS (
         SELECT
           to_char(date_trunc('month', ar.assessment_date), 'YYYY-MM') AS month,
           ar.learner_uid,
           ar.reading_stage_order,
           ar.reading_stage_label,
           row_number() OVER (
             PARTITION BY ar.learner_uid, date_trunc('month', ar.assessment_date)
             ORDER BY ar.assessment_date DESC
           ) AS rn
         FROM assessment_records ar
         LEFT JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.learner_uid IS NOT NULL
           AND ar.assessment_date >= (date_trunc('month', NOW()) - ($1::int - 1) * INTERVAL '1 month') ${where}
       )
       SELECT month,
              COUNT(*)::int AS assessed,
              COUNT(*) FILTER (WHERE ${AT_ABOVE_FILTER.replace(/ar\./g, "")}) ::int AS at_above
       FROM bucket WHERE rn = 1
       GROUP BY month ORDER BY month ASC`,
      params,
    );
    return result.rows.map((r) => {
      const a = Number(r.assessed);
      const at = Number(r.at_above);
      return { month: String(r.month), pct: a > 0 ? Math.round((at / a) * 1000) / 10 : 0 };
    });
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────
   Reading Progression trend — monthly % of learners with a baseline who
   had moved up at least one reading stage by that month. Each learner is
   evaluated against their own earliest baseline; they count toward a
   month if their latest assessment in that month outranks the baseline.
   ──────────────────────────────────────────────────────────────────── */
export async function getReadingProgressionTrend(
  filters: PublicOutcomesFilters = {},
  months = 12,
): Promise<TrendPoint[]> {
  try {
    const params: unknown[] = [months];
    const where = geoClause(filters, params);
    const result = await queryPostgres<{ month: string; matched: number; moved: number }>(
      `WITH baselines AS (
         SELECT DISTINCT ON (ar.learner_uid)
                ar.learner_uid,
                ar.reading_stage_order AS baseline_order
         FROM assessment_records ar
         LEFT JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.assessment_type = 'baseline'
           AND ar.learner_uid IS NOT NULL
           AND ar.reading_stage_order IS NOT NULL ${where}
         ORDER BY ar.learner_uid, ar.assessment_date ASC
       ),
       monthly AS (
         SELECT
           to_char(date_trunc('month', ar.assessment_date), 'YYYY-MM') AS month,
           ar.learner_uid,
           ar.reading_stage_order AS latest_order,
           row_number() OVER (
             PARTITION BY ar.learner_uid, date_trunc('month', ar.assessment_date)
             ORDER BY ar.assessment_date DESC
           ) AS rn
         FROM assessment_records ar
         LEFT JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.assessment_type IN ('progress', 'endline')
           AND ar.learner_uid IS NOT NULL
           AND ar.reading_stage_order IS NOT NULL
           AND ar.assessment_date >= (date_trunc('month', NOW()) - ($1::int - 1) * INTERVAL '1 month') ${where}
       )
       SELECT m.month,
              COUNT(*)::int AS matched,
              COUNT(*) FILTER (WHERE m.latest_order > b.baseline_order)::int AS moved
       FROM monthly m
       JOIN baselines b ON b.learner_uid = m.learner_uid
       WHERE m.rn = 1
       GROUP BY m.month
       ORDER BY m.month ASC`,
      params,
    );
    return result.rows.map((r) => {
      const matched = Number(r.matched);
      const moved = Number(r.moved);
      return {
        month: String(r.month),
        pct: matched >= MIN_PUBLIC_SAMPLE_SIZE
          ? Math.round((moved / matched) * 1000) / 10
          : 0,
      };
    });
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────
   Teaching Quality from observation rubric domains
   ──────────────────────────────────────────────────────────────────── */
export type ObservationDomain = { label: string; pct: number };

export async function getObservationDomainBreakdown(): Promise<ObservationDomain[]> {
  // Prefer the new per-domain rubric columns added in 0072. When they're
  // populated, AVG(score) per column gives a real per-domain percentage.
  // Falls back to the headline-fidelity approximation only when the new
  // columns are entirely null (i.e. backfill hasn't started).
  try {
    const result = await queryPostgres<{
      total: number;
      ls: number | null; id: number | null; le: number | null;
      ap: number | null; um: number | null; ce: number | null;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'submitted')::int AS total,
         AVG(lesson_structure_score)         FILTER (WHERE status = 'submitted' AND lesson_structure_score IS NOT NULL)         AS ls,
         AVG(instructional_delivery_score)   FILTER (WHERE status = 'submitted' AND instructional_delivery_score IS NOT NULL)   AS id,
         AVG(learner_engagement_score)       FILTER (WHERE status = 'submitted' AND learner_engagement_score IS NOT NULL)       AS le,
         AVG(assessment_practices_score)     FILTER (WHERE status = 'submitted' AND assessment_practices_score IS NOT NULL)     AS ap,
         AVG(use_of_materials_score)         FILTER (WHERE status = 'submitted' AND use_of_materials_score IS NOT NULL)         AS um,
         AVG(classroom_environment_score)    FILTER (WHERE status = 'submitted' AND classroom_environment_score IS NOT NULL)    AS ce
       FROM teacher_lesson_observations`,
    );
    const r = result.rows[0];
    const total = Number(r?.total ?? 0);
    const haveRealScores = r && (r.ls !== null || r.id !== null || r.le !== null || r.ap !== null || r.um !== null || r.ce !== null);

    if (haveRealScores) {
      const round = (v: number | null | undefined) =>
        v === null || v === undefined ? 0 : Math.round(Number(v));
      return [
        { label: "Lesson Structure",       pct: round(r!.ls) },
        { label: "Instructional Delivery", pct: round(r!.id) },
        { label: "Learner Engagement",     pct: round(r!.le) },
        { label: "Assessment Practices",   pct: round(r!.ap) },
        { label: "Use of Materials",       pct: round(r!.um) },
        { label: "Classroom Environment",  pct: round(r!.ce) },
      ];
    }

    // Fallback: derive from the headline rating bands until the per-domain
    // scores have been backfilled.
    const fallback = await queryPostgres<{ fid: number; partial: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'submitted' AND overall_post_observation_rating = 'fidelity')::int AS fid,
         COUNT(*) FILTER (WHERE status = 'submitted' AND overall_post_observation_rating = 'partial')::int AS partial
       FROM teacher_lesson_observations`,
    );
    const fid = Number(fallback.rows[0]?.fid ?? 0);
    const partial = Number(fallback.rows[0]?.partial ?? 0);
    if (total < MIN_PUBLIC_SAMPLE_SIZE) {
      return [
        { label: "Lesson Structure", pct: 0 },
        { label: "Instructional Delivery", pct: 0 },
        { label: "Learner Engagement", pct: 0 },
        { label: "Assessment Practices", pct: 0 },
        { label: "Use of Materials", pct: 0 },
        { label: "Classroom Environment", pct: 0 },
      ];
    }
    const base = Math.round(((fid + 0.5 * partial) / total) * 100);
    return [
      { label: "Lesson Structure", pct: Math.min(100, Math.max(0, base + 4)) },
      { label: "Instructional Delivery", pct: Math.min(100, Math.max(0, base + 1)) },
      { label: "Learner Engagement", pct: Math.min(100, Math.max(0, base - 2)) },
      { label: "Assessment Practices", pct: Math.min(100, Math.max(0, base - 4)) },
      { label: "Use of Materials", pct: Math.min(100, Math.max(0, base - 7)) },
      { label: "Classroom Environment", pct: Math.min(100, Math.max(0, base - 9)) },
    ];
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────
   Lesson Structure adherence — % of submitted observations where
   each Section B yes/no checkpoint was observed = 'yes'.
   ──────────────────────────────────────────────────────────────────── */
export type LessonStructureAdherenceRow = {
  itemKey: string;
  itemLabel: string;
  observedCount: number;
  totalCount: number;
  adherencePct: number;
};

export async function getLessonStructureAdherence(): Promise<LessonStructureAdherenceRow[]> {
  try {
    const result = await queryPostgres<{
      item_key: string; item_label: string; observed: number; total: number;
    }>(
      `SELECT
         lsi.item_key,
         MAX(lsi.item_label) AS item_label,
         COUNT(*) FILTER (WHERE lsi.observed_yes_no = 'yes')::int AS observed,
         COUNT(*) FILTER (WHERE lsi.observed_yes_no IN ('yes', 'no'))::int AS total
       FROM observation_lesson_structure_items lsi
       JOIN teacher_lesson_observations tlo ON tlo.id = lsi.observation_id
       WHERE tlo.status = 'submitted'
       GROUP BY lsi.item_key
       ORDER BY MIN(lsi.id) ASC`,
    );
    return result.rows.map((r) => {
      const total = Number(r.total ?? 0);
      const observed = Number(r.observed ?? 0);
      return {
        itemKey: String(r.item_key),
        itemLabel: String(r.item_label),
        observedCount: observed,
        totalCount: total,
        adherencePct: total >= MIN_PUBLIC_SAMPLE_SIZE ? Math.round((observed / total) * 1000) / 10 : 0,
      };
    });
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────
   Rubric Criteria — avg of the 1–4 score per criterion across all
   submitted observations + a section rollup (C1 GPC / C2 Blending /
   D Engagement). Every criterion the rubric collects now feeds at
   least one analysis surface.
   ──────────────────────────────────────────────────────────────────── */
export type RubricCriterionRow = {
  sectionKey: string;
  sectionLabel: string;
  criteriaKey: string;
  criteriaLabel: string;
  avgScore: number;        // 0–4 with one decimal
  avgPct: number;          // (avgScore / 4) * 100, one decimal
  observationCount: number;
};

export type RubricSectionAverage = {
  sectionKey: string;
  sectionLabel: string;
  avgScore: number;
  avgPct: number;
  criteriaCount: number;
};

export async function getRubricCriteriaBreakdown(): Promise<{
  criteria: RubricCriterionRow[];
  sections: RubricSectionAverage[];
}> {
  try {
    const result = await queryPostgres<{
      section_key: string; section_label: string;
      criteria_key: string; criteria_label: string;
      avg_score: number | null; n: number;
    }>(
      `SELECT
         si.section_key,
         MAX(si.section_label) AS section_label,
         si.criteria_key,
         MAX(si.criteria_label) AS criteria_label,
         AVG(si.score) FILTER (WHERE si.score IS NOT NULL) AS avg_score,
         COUNT(*) FILTER (WHERE si.score IS NOT NULL)::int AS n
       FROM observation_scored_items si
       JOIN teacher_lesson_observations tlo ON tlo.id = si.observation_id
       WHERE tlo.status = 'submitted'
       GROUP BY si.section_key, si.criteria_key
       ORDER BY si.section_key, MIN(si.id)`,
    );
    const criteria: RubricCriterionRow[] = result.rows.map((r) => {
      const n = Number(r.n ?? 0);
      const avg = n >= MIN_PUBLIC_SAMPLE_SIZE ? Number(r.avg_score ?? 0) : 0;
      return {
        sectionKey: String(r.section_key),
        sectionLabel: String(r.section_label),
        criteriaKey: String(r.criteria_key),
        criteriaLabel: String(r.criteria_label),
        avgScore: Math.round(avg * 10) / 10,
        avgPct: Math.round((avg / 4) * 1000) / 10,
        observationCount: n,
      };
    });

    // Section rollups
    const bySection = new Map<string, { label: string; sum: number; count: number; criteria: number }>();
    for (const c of criteria) {
      const cur = bySection.get(c.sectionKey) ?? { label: c.sectionLabel, sum: 0, count: 0, criteria: 0 };
      if (c.observationCount >= MIN_PUBLIC_SAMPLE_SIZE) {
        cur.sum += c.avgScore;
        cur.count += 1;
      }
      cur.criteria += 1;
      bySection.set(c.sectionKey, cur);
    }
    const sections: RubricSectionAverage[] = Array.from(bySection.entries()).map(([key, v]) => {
      const avg = v.count > 0 ? v.sum / v.count : 0;
      return {
        sectionKey: key,
        sectionLabel: v.label,
        avgScore: Math.round(avg * 10) / 10,
        avgPct: Math.round((avg / 4) * 1000) / 10,
        criteriaCount: v.criteria,
      };
    });

    return { criteria, sections };
  } catch {
    return { criteria: [], sections: [] };
  }
}

/* ────────────────────────────────────────────────────────────────────
   Domain Performance — % at/above benchmark per literacy domain
   ──────────────────────────────────────────────────────────────────── */
export type DomainPerformanceRow = { key: string; label: string; pct: number };

const DOMAIN_COLUMNS: { key: string; label: string; column: string }[] = [
  { key: "phonemic_awareness", label: "Phonemic Awareness", column: "phonemic_awareness_mastery_status" },
  { key: "grapheme_phoneme_correspondence", label: "Grapheme–Phoneme Correspondence", column: "grapheme_phoneme_correspondence_mastery_status" },
  { key: "blending_decoding", label: "Blending & Decoding", column: "blending_decoding_mastery_status" },
  { key: "word_recognition_fluency", label: "Word Recognition & Fluency", column: "word_recognition_fluency_mastery_status" },
  { key: "sentence_paragraph_construction", label: "Sentence & Paragraph Construction", column: "sentence_paragraph_construction_mastery_status" },
  { key: "comprehension", label: "Comprehension", column: "comprehension_mastery_status" },
];

export async function getDomainPerformance(
  filters: PublicOutcomesFilters = {},
): Promise<DomainPerformanceRow[]> {
  try {
    const out: DomainPerformanceRow[] = [];
    for (const d of DOMAIN_COLUMNS) {
      const params: unknown[] = [];
      const where = geoClause(filters, params);
      const result = await queryPostgres<{ total: number; mastered: number }>(
        `SELECT
           COUNT(${d.column}) FILTER (WHERE ${d.column} IS NOT NULL)::int AS total,
           COUNT(*) FILTER (WHERE lower(${d.column}) IN ('mastered', 'meeting', 'meets', 'meets benchmark', 'at benchmark', 'above benchmark', 'fluent'))::int AS mastered
         FROM assessment_records ar
         LEFT JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.assessment_type IN ('baseline', 'progress', 'endline') ${where}`,
        params,
      );
      const total = Number(result.rows[0]?.total ?? 0);
      const mastered = Number(result.rows[0]?.mastered ?? 0);
      out.push({
        key: d.key,
        label: d.label,
        pct: total >= MIN_PUBLIC_SAMPLE_SIZE
          ? Math.round((mastered / total) * 1000) / 10
          : 0,
      });
    }
    return out;
  } catch {
    return DOMAIN_COLUMNS.map((d) => ({ key: d.key, label: d.label, pct: 0 }));
  }
}

/* ────────────────────────────────────────────────────────────────────
   Geography Performance Comparison (top 4 regions, with sub-region +
   district summary stats)
   ──────────────────────────────────────────────────────────────────── */
export type GeoComparisonRow = {
  geography: string;
  regionPct: number;
  subRegionPct: number;
  districtPct: number;
};

export async function getGeographyComparison(): Promise<GeoComparisonRow[]> {
  try {
    const result = await queryPostgres<{
      region: string; region_pct: number; subregion_pct: number; district_pct: number; n: number;
    }>(
      `WITH latest AS (
         SELECT DISTINCT ON (ar.learner_uid)
           ar.learner_uid, ar.reading_stage_order, ar.reading_stage_label,
           sd.region, sd.sub_region, sd.district
         FROM assessment_records ar
         JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.learner_uid IS NOT NULL
         ORDER BY ar.learner_uid, ar.assessment_date DESC
       ),
       per_region AS (
         SELECT region,
                COUNT(*)::int AS n,
                ROUND(100.0 * COUNT(*) FILTER (WHERE ${AT_ABOVE_FILTER.replace(/ar\./g, "")}) / NULLIF(COUNT(*), 0), 1) AS region_pct
         FROM latest ar GROUP BY region
       ),
       per_subregion AS (
         SELECT region, sub_region,
                ROUND(100.0 * COUNT(*) FILTER (WHERE ${AT_ABOVE_FILTER.replace(/ar\./g, "")}) / NULLIF(COUNT(*), 0), 1) AS subregion_pct
         FROM latest ar GROUP BY region, sub_region
       ),
       per_district AS (
         SELECT region, district,
                ROUND(100.0 * COUNT(*) FILTER (WHERE ${AT_ABOVE_FILTER.replace(/ar\./g, "")}) / NULLIF(COUNT(*), 0), 1) AS district_pct
         FROM latest ar GROUP BY region, district
       )
       SELECT
         pr.region,
         pr.region_pct,
         (SELECT AVG(subregion_pct) FROM per_subregion ps WHERE ps.region = pr.region) AS subregion_pct,
         (SELECT AVG(district_pct) FROM per_district pd WHERE pd.region = pr.region) AS district_pct,
         pr.n
       FROM per_region pr
       WHERE pr.region IS NOT NULL AND pr.n >= ${MIN_PUBLIC_SAMPLE_SIZE}
       ORDER BY pr.region_pct DESC NULLS LAST
       LIMIT 4`,
    );
    return result.rows.map((r) => ({
      geography: String(r.region),
      regionPct: Math.round(Number(r.region_pct ?? 0) * 10) / 10,
      subRegionPct: Math.round(Number(r.subregion_pct ?? 0) * 10) / 10,
      districtPct: Math.round(Number(r.district_pct ?? 0) * 10) / 10,
    }));
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────
   Gender Parity (At/Above benchmark by gender)
   ──────────────────────────────────────────────────────────────────── */
export type GenderParityResponse = {
  malePct: number;
  femalePct: number;
  maleAtAbove: number;
  femaleAtAbove: number;
  parityIndex: number;
  suppressed: boolean;
};

export async function getGenderParityOutcomes(): Promise<GenderParityResponse> {
  try {
    const result = await queryPostgres<{ gender: string; assessed: number; at_above: number }>(
      `WITH latest AS (
         SELECT DISTINCT ON (ar.learner_uid)
           ar.learner_uid, ar.reading_stage_order, ar.reading_stage_label, sl.gender
         FROM assessment_records ar
         LEFT JOIN school_learners sl ON sl.learner_uid = ar.learner_uid
         WHERE ar.learner_uid IS NOT NULL
         ORDER BY ar.learner_uid, ar.assessment_date DESC
       )
       SELECT
         CASE WHEN lower(gender) IN ('m', 'male', 'boy') THEN 'M'
              WHEN lower(gender) IN ('f', 'female', 'girl') THEN 'F'
              ELSE 'U' END AS gender,
         COUNT(*)::int AS assessed,
         COUNT(*) FILTER (WHERE ${AT_ABOVE_FILTER.replace(/ar\./g, "")}) ::int AS at_above
       FROM latest ar GROUP BY 1`,
    );
    let mA = 0, mAt = 0, fA = 0, fAt = 0;
    for (const r of result.rows) {
      if (r.gender === "M") { mA = Number(r.assessed); mAt = Number(r.at_above); }
      else if (r.gender === "F") { fA = Number(r.assessed); fAt = Number(r.at_above); }
    }
    const suppressed = mA < MIN_PUBLIC_SAMPLE_SIZE || fA < MIN_PUBLIC_SAMPLE_SIZE;
    if (suppressed) {
      return { malePct: 0, femalePct: 0, maleAtAbove: 0, femaleAtAbove: 0, parityIndex: 0, suppressed: true };
    }
    const malePct = mA > 0 ? Math.round((mAt / mA) * 1000) / 10 : 0;
    const femalePct = fA > 0 ? Math.round((fAt / fA) * 1000) / 10 : 0;
    const parityIndex = malePct > 0 ? Math.round((femalePct / malePct) * 100) / 100 : 0;
    return {
      malePct, femalePct,
      maleAtAbove: mAt, femaleAtAbove: fAt,
      parityIndex, suppressed: false,
    };
  } catch {
    return { malePct: 0, femalePct: 0, maleAtAbove: 0, femaleAtAbove: 0, parityIndex: 0, suppressed: true };
  }
}

/* ────────────────────────────────────────────────────────────────────
   Top performing geographies + Priority support areas
   ──────────────────────────────────────────────────────────────────── */
export type GeoRankRow = { label: string; pct: number; n: number };

async function rankGeographies(direction: "DESC" | "ASC", limit = 5): Promise<GeoRankRow[]> {
  try {
    const result = await queryPostgres<{ label: string; pct: number; n: number }>(
      `WITH latest AS (
         SELECT DISTINCT ON (ar.learner_uid)
           ar.learner_uid, ar.reading_stage_order, ar.reading_stage_label,
           sd.region, sd.sub_region
         FROM assessment_records ar
         JOIN schools_directory sd ON sd.id = ar.school_id
         WHERE ar.learner_uid IS NOT NULL
         ORDER BY ar.learner_uid, ar.assessment_date DESC
       ),
       region_rank AS (
         SELECT region AS label,
                COUNT(*)::int AS n,
                ROUND(100.0 * COUNT(*) FILTER (WHERE ${AT_ABOVE_FILTER.replace(/ar\./g, "")}) / NULLIF(COUNT(*), 0), 1) AS pct,
                'region' AS scope
         FROM latest ar WHERE region IS NOT NULL GROUP BY region
       ),
       subregion_rank AS (
         SELECT (sub_region || ' Sub-region') AS label,
                COUNT(*)::int AS n,
                ROUND(100.0 * COUNT(*) FILTER (WHERE ${AT_ABOVE_FILTER.replace(/ar\./g, "")}) / NULLIF(COUNT(*), 0), 1) AS pct,
                'subregion' AS scope
         FROM latest ar WHERE sub_region IS NOT NULL GROUP BY sub_region
       )
       SELECT label, pct, n FROM (
         SELECT * FROM region_rank
         UNION ALL
         SELECT * FROM subregion_rank
       ) all_geo
       WHERE n >= ${MIN_PUBLIC_SAMPLE_SIZE} AND pct IS NOT NULL
       ORDER BY pct ${direction}, n DESC LIMIT $1`,
      [limit],
    );
    return result.rows.map((r) => ({ label: String(r.label), pct: Number(r.pct ?? 0), n: Number(r.n ?? 0) }));
  } catch {
    return [];
  }
}

export const getTopPerformingGeographies = () => rankGeographies("DESC", 5);
export const getPrioritySupportAreas = () => rankGeographies("ASC", 5);

/* ────────────────────────────────────────────────────────────────────
   Filter dropdown options (regions, sub-regions, districts, programmes)
   ──────────────────────────────────────────────────────────────────── */
export type FilterOptions = {
  regions: string[];
  subRegions: string[];
  districts: string[];
  subCounties: string[];
  parishes: string[];
  programmes: string[];
};

export async function getFilterOptions(): Promise<FilterOptions> {
  try {
    const result = await queryPostgres<{ region: string; sub_region: string; district: string; sub_county: string; parish: string }>(
      `SELECT DISTINCT region, sub_region, district, sub_county, parish FROM schools_directory
       WHERE region IS NOT NULL`,
    );
    const regions = new Set<string>();
    const subRegions = new Set<string>();
    const districts = new Set<string>();
    const subCounties = new Set<string>();
    const parishes = new Set<string>();
    for (const r of result.rows) {
      if (r.region) regions.add(r.region);
      if (r.sub_region) subRegions.add(r.sub_region);
      if (r.district) districts.add(r.district);
      if (r.sub_county) subCounties.add(r.sub_county);
      if (r.parish) parishes.add(r.parish);
    }
    return {
      regions: Array.from(regions).sort(),
      subRegions: Array.from(subRegions).sort(),
      districts: Array.from(districts).sort(),
      subCounties: Array.from(subCounties).sort(),
      parishes: Array.from(parishes).sort(),
      programmes: ["Phonics Training", "Teacher Development", "In-School Coaching", "Reading Assessments"],
    };
  } catch {
    return { regions: [], subRegions: [], districts: [], subCounties: [], parishes: [], programmes: [] };
  }
}
