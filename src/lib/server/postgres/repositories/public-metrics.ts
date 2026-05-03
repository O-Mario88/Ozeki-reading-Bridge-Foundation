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
