import { queryPostgres } from "../client";

/* ── Tier-1 transparency metrics ───────────────────────────────────────────
   The functions below feed the public homepage + transparency page with
   live-from-Postgres aggregates. Each returns `null` when there isn't enough
   data to publish (no learners assessed yet, no posted journal entries, etc.)
   so callers can render an "early-days" empty state instead of misleading
   zeros. ────────────────────────────────────────────────────────────────── */

export interface ReadingStageShift {
  baselineLearners: number;
  endlineLearners: number;
  baselineAvgComposite: number | null;
  endlineAvgComposite: number | null;
  /** endline minus baseline composite, in absolute points. */
  deltaPoints: number | null;
  /** Share of endline learners who improved by at least one reading stage. */
  improvedSharePct: number | null;
}

/**
 * Average reading-stage movement across all paired baseline → endline
 * assessments. Returns `null` if either cohort has < 5 learners (avoids
 * publishing thin samples).
 */
export async function getPublicReadingStageShift(): Promise<ReadingStageShift | null> {
  const res = await queryPostgres<{
    baseline_learners: string;
    endline_learners: string;
    avg_baseline: string | null;
    avg_endline: string | null;
    improved: string;
    paired: string;
  }>(
    `WITH paired AS (
       SELECT
         b.learner_uid,
         b.composite_score AS baseline_score,
         e.composite_score AS endline_score,
         b.reading_stage_band AS baseline_stage,
         e.reading_stage_band AS endline_stage
       FROM assessment_records b
       JOIN assessment_records e
         ON e.learner_uid = b.learner_uid
        AND e.assessment_type = 'endline'
        AND b.assessment_type = 'baseline'
        AND e.assessment_date > b.assessment_date
       WHERE b.composite_score IS NOT NULL AND e.composite_score IS NOT NULL
     ),
     stage_rank AS (
       SELECT
         learner_uid,
         baseline_score, endline_score,
         CASE baseline_stage
           WHEN 'pre_reader' THEN 0 WHEN 'emergent' THEN 1 WHEN 'minimum' THEN 2
           WHEN 'competent' THEN 3 WHEN 'strong' THEN 4 ELSE NULL END AS b_rank,
         CASE endline_stage
           WHEN 'pre_reader' THEN 0 WHEN 'emergent' THEN 1 WHEN 'minimum' THEN 2
           WHEN 'competent' THEN 3 WHEN 'strong' THEN 4 ELSE NULL END AS e_rank
       FROM paired
     )
     SELECT
       (SELECT COUNT(DISTINCT learner_uid)::int
          FROM assessment_records WHERE assessment_type = 'baseline') AS baseline_learners,
       (SELECT COUNT(DISTINCT learner_uid)::int
          FROM assessment_records WHERE assessment_type = 'endline')  AS endline_learners,
       AVG(baseline_score)::numeric(10,1)        AS avg_baseline,
       AVG(endline_score)::numeric(10,1)         AS avg_endline,
       COUNT(*) FILTER (WHERE e_rank IS NOT NULL AND b_rank IS NOT NULL AND e_rank > b_rank)::int AS improved,
       COUNT(*)::int                             AS paired
     FROM stage_rank`,
  );
  const r = res.rows[0];
  if (!r) return null;

  const baselineLearners = Number(r.baseline_learners) || 0;
  const endlineLearners = Number(r.endline_learners) || 0;
  if (baselineLearners < 5 || endlineLearners < 5) return null;

  const baselineAvg = r.avg_baseline != null ? Number(r.avg_baseline) : null;
  const endlineAvg = r.avg_endline != null ? Number(r.avg_endline) : null;
  const delta = baselineAvg != null && endlineAvg != null ? +(endlineAvg - baselineAvg).toFixed(1) : null;
  const paired = Number(r.paired) || 0;
  const improved = Number(r.improved) || 0;
  const improvedShare = paired > 0 ? Math.round((improved / paired) * 100) : null;

  return {
    baselineLearners,
    endlineLearners,
    baselineAvgComposite: baselineAvg,
    endlineAvgComposite: endlineAvg,
    deltaPoints: delta,
    improvedSharePct: improvedShare,
  };
}

export interface CostPerLearnerReached {
  totalProgrammeSpendUgx: number;
  learnersReached: number;
  costPerLearnerUgx: number;
  /** Convenience USD figure using the 1 USD = 3,800 UGX heuristic; the
   *  /portal/finance dashboard uses live FX, but the public site shows a
   *  stable rounded figure. */
  costPerLearnerUsd: number;
}

/**
 * Programme dollars deployed ÷ learners reached. Programme spend = posted
 * debits to expense accounts whose code starts with `5` (programme delivery
 * by chart-of-accounts convention). Returns `null` until both legs have data.
 */
export async function getPublicCostPerLearnerReached(): Promise<CostPerLearnerReached | null> {
  const [spendRes, learnersRes] = await Promise.all([
    queryPostgres<{ total: string | null }>(
      `SELECT COALESCE(SUM(jl.debit), 0)::numeric(18,2) AS total
       FROM finance_journal_lines jl
       JOIN finance_journal_entries je ON je.id = jl.journal_id
       JOIN finance_chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.status = 'posted'
         AND coa.account_type = 'expense'
         AND coa.account_code LIKE '5%'`,
    ),
    queryPostgres<{ learners: string }>(
      `SELECT COUNT(DISTINCT learner_uid)::int AS learners FROM assessment_records`,
    ),
  ]);

  const totalUgx = Number(spendRes.rows[0]?.total ?? 0);
  const learners = Number(learnersRes.rows[0]?.learners ?? 0);
  if (totalUgx <= 0 || learners <= 0) return null;

  const perLearnerUgx = Math.round(totalUgx / learners);
  return {
    totalProgrammeSpendUgx: totalUgx,
    learnersReached: learners,
    costPerLearnerUgx: perLearnerUgx,
    costPerLearnerUsd: +(perLearnerUgx / 3800).toFixed(2),
  };
}

export interface PublicReachFootprint {
  schoolsReached: number;
  districtsReached: number;
  regionsReached: number;
}

/**
 * Geographic footprint for the public stat band — distinct schools,
 * districts, and regions where Ozeki has activity. Returns null if no
 * schools have been registered at all.
 */
export async function getPublicReachFootprint(): Promise<PublicReachFootprint | null> {
  const res = await queryPostgres<{
    schools: string;
    districts: string;
    regions: string;
  }>(
    `SELECT
       COUNT(*)::int                                        AS schools,
       COUNT(DISTINCT NULLIF(district, ''))::int            AS districts,
       COUNT(DISTINCT NULLIF(region, ''))::int              AS regions
     FROM schools_directory
     WHERE school_active IS TRUE OR school_active IS NULL`,
  );
  const r = res.rows[0];
  if (!r) return null;
  const schools = Number(r.schools) || 0;
  if (schools === 0) return null;
  return {
    schoolsReached: schools,
    districtsReached: Number(r.districts) || 0,
    regionsReached: Number(r.regions) || 0,
  };
}

export interface ReadingStageDistribution {
  totalLearners: number;
  bands: Array<{ key: string; label: string; count: number; sharePct: number }>;
}

/**
 * Latest reading-stage distribution across all assessed learners (each
 * learner counted once at their most-recent assessment). Returns null if
 * fewer than 30 learners have been assessed (sample too thin to publish).
 */
export async function getPublicReadingStageDistribution(): Promise<ReadingStageDistribution | null> {
  const res = await queryPostgres<{ band: string | null; learners: string }>(
    `WITH latest AS (
       SELECT DISTINCT ON (learner_uid)
         learner_uid, reading_stage_band
       FROM assessment_records
       WHERE learner_uid IS NOT NULL
       ORDER BY learner_uid, assessment_date DESC, id DESC
     )
     SELECT reading_stage_band AS band, COUNT(*)::int AS learners
     FROM latest
     WHERE reading_stage_band IS NOT NULL
     GROUP BY reading_stage_band`,
  );

  const ORDER: Array<{ key: string; label: string }> = [
    { key: "pre_reader", label: "Pre-reader" },
    { key: "emergent",   label: "Emergent" },
    { key: "minimum",    label: "Minimum proficiency" },
    { key: "competent",  label: "Competent" },
    { key: "strong",     label: "Strong reader" },
  ];
  const counts = new Map<string, number>();
  for (const row of res.rows) {
    if (row.band) counts.set(String(row.band), Number(row.learners) || 0);
  }
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  if (total < 30) return null;

  const bands = ORDER.map((b) => {
    const count = counts.get(b.key) ?? 0;
    return { key: b.key, label: b.label, count, sharePct: Math.round((count / total) * 100) };
  });
  return { totalLearners: total, bands };
}

export interface CoachingCompletionRate {
  scheduledLast90d: number;
  completedLast90d: number;
  completionPct: number;
}

/**
 * Share of coaching visits scheduled in the last 90 days that were
 * delivered. `not_started` counts as scheduled-not-completed; everything
 * else is treated as delivery. Returns null if no visits in window.
 */
export async function getPublicCoachingCompletionRate(): Promise<CoachingCompletionRate | null> {
  const res = await queryPostgres<{ scheduled: string; completed: string }>(
    `SELECT
       COUNT(*)::int                                                            AS scheduled,
       COUNT(*) FILTER (WHERE implementation_status IS NOT NULL
                          AND implementation_status <> 'not_started')::int      AS completed
     FROM coaching_visits
     WHERE visit_date >= CURRENT_DATE - INTERVAL '90 days'`,
  );
  const r = res.rows[0];
  if (!r) return null;
  const scheduled = Number(r.scheduled) || 0;
  if (scheduled === 0) return null;
  const completed = Number(r.completed) || 0;
  return {
    scheduledLast90d: scheduled,
    completedLast90d: completed,
    completionPct: Math.round((completed / scheduled) * 100),
  };
}

export interface StoryCollectionGrowth {
  totalPublished: number;
  newThisMonth: number;
  monthOnMonthDeltaPct: number | null;
}

/**
 * Story-library growth signal: total published stories ever, plus the
 * count published this calendar month and the month-on-month delta.
 * Returns null until at least 1 story is published.
 */
export async function getPublicStoryCollectionGrowth(): Promise<StoryCollectionGrowth | null> {
  const res = await queryPostgres<{
    total: string; this_month: string; last_month: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE publish_status = 'published')::int                                    AS total,
       COUNT(*) FILTER (WHERE publish_status = 'published'
                          AND created_at >= date_trunc('month', CURRENT_DATE))::int                 AS this_month,
       COUNT(*) FILTER (WHERE publish_status = 'published'
                          AND created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                          AND created_at <  date_trunc('month', CURRENT_DATE))::int                 AS last_month
     FROM story_library`,
  );
  const r = res.rows[0];
  if (!r) return null;
  const total = Number(r.total) || 0;
  if (total === 0) return null;
  const thisMonth = Number(r.this_month) || 0;
  const lastMonth = Number(r.last_month) || 0;
  const delta = lastMonth > 0
    ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
    : null;
  return { totalPublished: total, newThisMonth: thisMonth, monthOnMonthDeltaPct: delta };
}

export interface ProgrammeOverheadSplit {
  totalProgrammeUgx: number;
  totalOverheadUgx: number;
  totalSpendUgx: number;
  programmeSharePct: number;
  overheadSharePct: number;
}

/**
 * Programme delivery (account_code 5xxx) vs general & administrative
 * overhead (account_code 6xxx) as a share of total expense.
 * Returns `null` until any expense entry has been posted.
 */
export async function getPublicProgrammeOverheadSplit(): Promise<ProgrammeOverheadSplit | null> {
  const res = await queryPostgres<{ programme: string | null; overhead: string | null }>(
    `SELECT
       COALESCE(SUM(jl.debit) FILTER (WHERE coa.account_code LIKE '5%'), 0)::numeric(18,2) AS programme,
       COALESCE(SUM(jl.debit) FILTER (WHERE coa.account_code LIKE '6%'), 0)::numeric(18,2) AS overhead
     FROM finance_journal_lines jl
     JOIN finance_journal_entries je ON je.id = jl.journal_id
     JOIN finance_chart_of_accounts coa ON coa.id = jl.account_id
     WHERE je.status = 'posted' AND coa.account_type = 'expense'`,
  );

  const programme = Number(res.rows[0]?.programme ?? 0);
  const overhead = Number(res.rows[0]?.overhead ?? 0);
  const total = programme + overhead;
  if (total <= 0) return null;

  return {
    totalProgrammeUgx: programme,
    totalOverheadUgx: overhead,
    totalSpendUgx: total,
    programmeSharePct: Math.round((programme / total) * 100),
    overheadSharePct: Math.round((overhead / total) * 100),
  };
}

export interface DistrictLearningOutcomeRow {
  district: string;
  region: string | null;
  schoolsAssessed: number;
  learnersPaired: number;
  baselineAvgComposite: number | null;
  endlineAvgComposite: number | null;
  deltaPoints: number | null;
  movedUpSharePct: number | null;
}

/**
 * District-level baseline → endline progression for the
 * /learning-outcomes public page. Each row reflects only learners with
 * BOTH a baseline and an endline assessment, joined to their school's
 * district. Districts with fewer than 5 paired learners are excluded
 * (sample too thin to publish honestly).
 */
export async function listPublicDistrictLearningOutcomes(): Promise<DistrictLearningOutcomeRow[]> {
  const res = await queryPostgres<{
    district: string;
    region: string | null;
    schools: string;
    learners: string;
    avg_baseline: string | null;
    avg_endline: string | null;
    moved_up: string;
    paired: string;
  }>(
    `WITH paired AS (
       SELECT
         b.learner_uid,
         b.school_id,
         b.composite_score AS baseline_score,
         e.composite_score AS endline_score,
         b.reading_stage_band AS baseline_stage,
         e.reading_stage_band AS endline_stage
       FROM assessment_records b
       JOIN assessment_records e
         ON e.learner_uid = b.learner_uid
        AND e.assessment_type = 'endline'
        AND b.assessment_type = 'baseline'
        AND e.assessment_date > b.assessment_date
       WHERE b.composite_score IS NOT NULL AND e.composite_score IS NOT NULL
     ),
     ranked AS (
       SELECT
         p.*,
         CASE p.baseline_stage
           WHEN 'pre_reader' THEN 0 WHEN 'emergent' THEN 1 WHEN 'minimum' THEN 2
           WHEN 'competent' THEN 3 WHEN 'strong' THEN 4 ELSE NULL END AS b_rank,
         CASE p.endline_stage
           WHEN 'pre_reader' THEN 0 WHEN 'emergent' THEN 1 WHEN 'minimum' THEN 2
           WHEN 'competent' THEN 3 WHEN 'strong' THEN 4 ELSE NULL END AS e_rank
       FROM paired p
     )
     SELECT
       COALESCE(NULLIF(sd.district, ''), 'Unknown')              AS district,
       NULLIF(sd.region, '')                                     AS region,
       COUNT(DISTINCT r.school_id)::int                          AS schools,
       COUNT(*)::int                                             AS learners,
       AVG(r.baseline_score)::numeric(10,1)                      AS avg_baseline,
       AVG(r.endline_score)::numeric(10,1)                       AS avg_endline,
       COUNT(*) FILTER (WHERE r.b_rank IS NOT NULL AND r.e_rank IS NOT NULL AND r.e_rank > r.b_rank)::int AS moved_up,
       COUNT(*)::int                                             AS paired
     FROM ranked r
     JOIN schools_directory sd ON sd.id = r.school_id
     GROUP BY sd.district, sd.region
     HAVING COUNT(*) >= 5
     ORDER BY (AVG(r.endline_score) - AVG(r.baseline_score)) DESC NULLS LAST,
              avg_endline DESC NULLS LAST,
              district ASC`,
  );

  return res.rows.map((r) => {
    const baseline = r.avg_baseline != null ? Number(r.avg_baseline) : null;
    const endline = r.avg_endline != null ? Number(r.avg_endline) : null;
    const delta = baseline != null && endline != null ? +(endline - baseline).toFixed(1) : null;
    const paired = Number(r.paired) || 0;
    const movedUp = Number(r.moved_up) || 0;
    return {
      district: r.district,
      region: r.region,
      schoolsAssessed: Number(r.schools) || 0,
      learnersPaired: Number(r.learners) || 0,
      baselineAvgComposite: baseline,
      endlineAvgComposite: endline,
      deltaPoints: delta,
      movedUpSharePct: paired > 0 ? Math.round((movedUp / paired) * 100) : null,
    };
  });
}

export interface RegionOverviewRow {
  region: string;
  districts: number;
  schools: number;
  learnersAssessedAllTime: number;
  latestAvgComposite: number | null;
  /** Coaching visits delivered in the last 90 days as a share of scheduled. */
  coachingDeliverySharePct: number | null;
}

/**
 * Region-level rollup for the /regions overview page. Uses
 * `schools_directory.region` as the canonical region grouping. Districts
 * with no region tag are bucketed under "Unspecified". Districts and
 * schools are counted distinct; learners are counted across each learner's
 * most-recent assessment in schools belonging to that region.
 */
export async function listPublicRegionOverview(): Promise<RegionOverviewRow[]> {
  const res = await queryPostgres<{
    region: string;
    districts: string;
    schools: string;
    learners: string;
    avg_composite: string | null;
    scheduled: string;
    completed: string;
  }>(
    `WITH region_schools AS (
       SELECT
         COALESCE(NULLIF(region, ''), 'Unspecified') AS region,
         id AS school_id,
         district
       FROM schools_directory
     ),
     latest_assessment AS (
       SELECT DISTINCT ON (learner_uid)
         learner_uid, school_id, composite_score, assessment_date
       FROM assessment_records
       WHERE learner_uid IS NOT NULL AND composite_score IS NOT NULL
       ORDER BY learner_uid, assessment_date DESC, id DESC
     )
     SELECT
       rs.region,
       COUNT(DISTINCT rs.district) FILTER (WHERE rs.district IS NOT NULL AND rs.district <> '')::int AS districts,
       COUNT(DISTINCT rs.school_id)::int                                                              AS schools,
       COUNT(DISTINCT la.learner_uid)::int                                                            AS learners,
       AVG(la.composite_score)::numeric(10,1)                                                         AS avg_composite,
       (SELECT COUNT(*)::int FROM coaching_visits cv
          WHERE cv.school_id IN (SELECT school_id FROM region_schools rs2 WHERE rs2.region = rs.region)
            AND cv.visit_date >= CURRENT_DATE - INTERVAL '90 days')                                   AS scheduled,
       (SELECT COUNT(*)::int FROM coaching_visits cv
          WHERE cv.school_id IN (SELECT school_id FROM region_schools rs2 WHERE rs2.region = rs.region)
            AND cv.visit_date >= CURRENT_DATE - INTERVAL '90 days'
            AND cv.implementation_status IS NOT NULL
            AND cv.implementation_status <> 'not_started')                                            AS completed
     FROM region_schools rs
     LEFT JOIN latest_assessment la ON la.school_id = rs.school_id
     GROUP BY rs.region
     ORDER BY schools DESC, rs.region ASC`,
  );

  return res.rows.map((r) => {
    const scheduled = Number(r.scheduled) || 0;
    const completed = Number(r.completed) || 0;
    return {
      region: r.region,
      districts: Number(r.districts) || 0,
      schools: Number(r.schools) || 0,
      learnersAssessedAllTime: Number(r.learners) || 0,
      latestAvgComposite: r.avg_composite != null ? Number(r.avg_composite) : null,
      coachingDeliverySharePct: scheduled > 0 ? Math.round((completed / scheduled) * 100) : null,
    };
  });
}

export interface TeacherImpactSnapshot {
  teachersTrainedTotal: number;
  teachersTrainedLast90d: number;
  teachersObserved: number;
  observationsLast90d: number;
  fidelitySharePct: number | null;
  partialSharePct: number | null;
  lowSharePct: number | null;
  ratedObservationsLast90d: number;
}

/**
 * Snapshot of teacher-side delivery for the /teacher-impact page.
 *
 * - "Trained" = distinct teacher_user_id rows in portal_training_attendance
 *   with attended=TRUE. Last-90d window = events whose portal_record dated
 *   within the last 90 days.
 * - "Observed" = distinct teachers with at least one teacher_lesson_observation
 *   row (lifetime). Last-90d obs counted by observation_date.
 * - Fidelity / partial / low shares are computed over observations in the
 *   last 90 days that have an `overall_post_observation_rating` set.
 *
 * Returns null if no teachers have ever been trained or observed (nothing
 * meaningful to publish yet).
 */
export async function getPublicTeacherImpactSnapshot(): Promise<TeacherImpactSnapshot | null> {
  const [trainedRes, observedRes, ratingsRes] = await Promise.all([
    queryPostgres<{ trained_total: string; trained_90d: string }>(
      `SELECT
         COUNT(DISTINCT pta.teacher_user_id)
           FILTER (WHERE pta.attended IS TRUE)::int                                          AS trained_total,
         COUNT(DISTINCT pta.teacher_user_id)
           FILTER (WHERE pta.attended IS TRUE
                     AND pr.date >= CURRENT_DATE - INTERVAL '90 days')::int                  AS trained_90d
       FROM portal_training_attendance pta
       JOIN portal_records pr ON pr.id = pta.portal_record_id`,
    ).catch(() => ({ rows: [{ trained_total: "0", trained_90d: "0" }] })),
    queryPostgres<{ observed_total: string; obs_90d: string }>(
      `SELECT
         COUNT(DISTINCT teacher_name)::int                                       AS observed_total,
         COUNT(*) FILTER (WHERE observation_date >= CURRENT_DATE - INTERVAL '90 days')::int  AS obs_90d
       FROM teacher_lesson_observations`,
    ).catch(() => ({ rows: [{ observed_total: "0", obs_90d: "0" }] })),
    queryPostgres<{ fidelity: string; partial: string; low: string; rated: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'fidelity')::int AS fidelity,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'partial')::int  AS partial,
         COUNT(*) FILTER (WHERE overall_post_observation_rating = 'low')::int      AS low,
         COUNT(*) FILTER (WHERE overall_post_observation_rating IS NOT NULL)::int  AS rated
       FROM teacher_lesson_observations
       WHERE observation_date >= CURRENT_DATE - INTERVAL '90 days'`,
    ).catch(() => ({ rows: [{ fidelity: "0", partial: "0", low: "0", rated: "0" }] })),
  ]);

  const trainedTotal = Number(trainedRes.rows[0]?.trained_total ?? 0);
  const observedTotal = Number(observedRes.rows[0]?.observed_total ?? 0);
  if (trainedTotal === 0 && observedTotal === 0) return null;

  const rated = Number(ratingsRes.rows[0]?.rated ?? 0);
  const fidelity = Number(ratingsRes.rows[0]?.fidelity ?? 0);
  const partial = Number(ratingsRes.rows[0]?.partial ?? 0);
  const low = Number(ratingsRes.rows[0]?.low ?? 0);

  return {
    teachersTrainedTotal: trainedTotal,
    teachersTrainedLast90d: Number(trainedRes.rows[0]?.trained_90d ?? 0),
    teachersObserved: observedTotal,
    observationsLast90d: Number(observedRes.rows[0]?.obs_90d ?? 0),
    fidelitySharePct: rated > 0 ? Math.round((fidelity / rated) * 100) : null,
    partialSharePct: rated > 0 ? Math.round((partial / rated) * 100) : null,
    lowSharePct: rated > 0 ? Math.round((low / rated) * 100) : null,
    ratedObservationsLast90d: rated,
  };
}

export interface PublicImpactMetrics {
  totalSchools: number;
  totalLearners: number;
  totalTeachers: number;
  averageReadingScore: number;
  averageCompScore: number;
  levelsDistribution: Record<string, number>;
  regionalBreakdown: Array<{
    regionName: string;
    learnerCount: number;
    scoreAvg: number;
  }>;
}

/**
 * Fetches privacy-safe, aggregated impact metrics for public consumption.
 * Aggregates scores at the higher levels (Country/Region/District).
 */
export async function getPublicImpactMetrics(filters: { 
  regionId?: number; 
  districtId?: number; 
  asOf?: string; 
} = {}): Promise<PublicImpactMetrics> {
  const asOf = filters.asOf || new Date().toISOString().split("T")[0];
  
  const [totalsRes, levelsRes, regionalRes] = await Promise.all([
    queryPostgres(`
      SELECT 
        COUNT(DISTINCT school_id)::int AS schools,
        COUNT(DISTINCT learner_uid)::int AS learners,
        AVG(story_reading_score) AS avg_story,
        AVG(reading_comprehension_score) AS avg_comp
      FROM assessment_records
      WHERE assessment_date <= $1
    `, [asOf]),
    
    queryPostgres(`
      SELECT computed_level_band, COUNT(*)::int AS total
      FROM assessment_records
      WHERE assessment_date <= $1
      GROUP BY computed_level_band
    `, [asOf]),
    
    queryPostgres(`
      SELECT 
        l.region_name,
        COUNT(DISTINCT a.learner_uid)::int AS learners,
        AVG(a.story_reading_score) AS avg_score
      FROM assessment_records a
      JOIN v_school_hierarchy l ON a.school_id = l.school_id
      WHERE a.assessment_date <= $1
      GROUP BY l.region_name
      ORDER BY avg_score DESC
    `, [asOf])
  ]);

  return {
    totalSchools: totalsRes.rows[0]?.schools || 0,
    totalLearners: totalsRes.rows[0]?.learners || 0,
    totalTeachers: 0, // Enriched from CRM or staff tables
    averageReadingScore: Number(totalsRes.rows[0]?.avg_story || 0),
    averageCompScore: Number(totalsRes.rows[0]?.avg_comp || 0),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    levelsDistribution: levelsRes.rows.reduce((acc: any, r: any) => {
      acc[r.computed_level_band] = r.total;
      return acc;
    }, {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    regionalBreakdown: regionalRes.rows.map((r: any) => ({
      regionName: r.region_name,
      learnerCount: r.learners,
      scoreAvg: Number(r.avg_score || 0)
    }))
  };
}
