import { queryPostgres } from "@/lib/server/postgres/client";

/* ────────────────────────────────────────────────────────────────────────── */
/* Top KPI strip                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

export type DashboardKpi = {
  learnersReached: number;
  learnersDeltaPct: number | null;
  trainingsLogged: number;
  trainingsDeltaPct: number | null;
  assessments: number;
  assessmentsDeltaPct: number | null;
  schoolVisits: number;
  visitsDeltaPct: number | null;
  storyActivities: number;
  storiesDeltaPct: number | null;
  implementingPct: number;
  implementingDeltaPp: number | null;
  notImplementingPct: number;
  notImplementingDeltaPp: number | null;
};

export async function getDashboardKpisPostgres(): Promise<DashboardKpi> {
  try {
    const res = await queryPostgres(
      `WITH now_window AS (
         SELECT
           (SELECT COUNT(DISTINCT learner_uid)::int FROM assessment_records
              WHERE learner_uid IS NOT NULL
                AND assessment_date >= NOW() - INTERVAL '30 days') AS learners,
           (SELECT COUNT(*)::int FROM portal_records
              WHERE module = 'training' AND date >= NOW() - INTERVAL '30 days') AS trainings,
           (SELECT COUNT(*)::int FROM assessment_records
              WHERE assessment_date >= NOW() - INTERVAL '30 days') AS assessments,
           (SELECT COUNT(*)::int FROM portal_records
              WHERE module = 'visit' AND date >= NOW() - INTERVAL '30 days') AS visits,
           (SELECT COUNT(*)::int FROM portal_records
              WHERE module IN ('story', 'story_activity') AND date >= NOW() - INTERVAL '30 days') AS stories
       ),
       prior_window AS (
         SELECT
           (SELECT COUNT(DISTINCT learner_uid)::int FROM assessment_records
              WHERE learner_uid IS NOT NULL
                AND assessment_date >= NOW() - INTERVAL '60 days'
                AND assessment_date <  NOW() - INTERVAL '30 days') AS learners,
           (SELECT COUNT(*)::int FROM portal_records
              WHERE module = 'training'
                AND date >= NOW() - INTERVAL '60 days'
                AND date <  NOW() - INTERVAL '30 days') AS trainings,
           (SELECT COUNT(*)::int FROM assessment_records
              WHERE assessment_date >= NOW() - INTERVAL '60 days'
                AND assessment_date <  NOW() - INTERVAL '30 days') AS assessments,
           (SELECT COUNT(*)::int FROM portal_records
              WHERE module = 'visit'
                AND date >= NOW() - INTERVAL '60 days'
                AND date <  NOW() - INTERVAL '30 days') AS visits,
           (SELECT COUNT(*)::int FROM portal_records
              WHERE module IN ('story', 'story_activity')
                AND date >= NOW() - INTERVAL '60 days'
                AND date <  NOW() - INTERVAL '30 days') AS stories
       ),
       coverage_now AS (
         SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (
             WHERE LOWER(COALESCE(program_status, '')) IN ('implementing','active','onboarded')
                OR EXISTS (
                  SELECT 1 FROM portal_records pr
                  WHERE pr.school_id = schools_directory.id
                    AND pr.date >= NOW() - INTERVAL '90 days'
                )
           )::int AS implementing
         FROM schools_directory
       ),
       coverage_prior AS (
         SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (
             WHERE EXISTS (
               SELECT 1 FROM portal_records pr
               WHERE pr.school_id = schools_directory.id
                 AND pr.date >= NOW() - INTERVAL '180 days'
                 AND pr.date <  NOW() - INTERVAL '90 days'
             )
           )::int AS implementing
         FROM schools_directory
       )
       SELECT
         (SELECT learners    FROM now_window)    AS learners_now,
         (SELECT learners    FROM prior_window)  AS learners_prior,
         (SELECT trainings   FROM now_window)    AS trainings_now,
         (SELECT trainings   FROM prior_window)  AS trainings_prior,
         (SELECT assessments FROM now_window)    AS assessments_now,
         (SELECT assessments FROM prior_window)  AS assessments_prior,
         (SELECT visits      FROM now_window)    AS visits_now,
         (SELECT visits      FROM prior_window)  AS visits_prior,
         (SELECT stories     FROM now_window)    AS stories_now,
         (SELECT stories     FROM prior_window)  AS stories_prior,
         (SELECT total       FROM coverage_now)  AS schools_total,
         (SELECT implementing FROM coverage_now) AS implementing_now,
         (SELECT total       FROM coverage_prior) AS schools_total_prior,
         (SELECT implementing FROM coverage_prior) AS implementing_prior`,
    );
    const r = res.rows[0] ?? {};
    const pctChange = (now: number, prior: number): number | null => {
      if (prior === 0) return now > 0 ? 100 : null;
      return Math.round(((now - prior) / prior) * 1000) / 10;
    };
    const total = Number(r.schools_total ?? 0);
    const impNow = Number(r.implementing_now ?? 0);
    const totalPrior = Number(r.schools_total_prior ?? 0);
    const impPrior = Number(r.implementing_prior ?? 0);
    const implementingPct = total > 0 ? Math.round((impNow / total) * 1000) / 10 : 0;
    const implementingPriorPct = totalPrior > 0 ? Math.round((impPrior / totalPrior) * 1000) / 10 : 0;

    return {
      learnersReached: Number(r.learners_now ?? 0),
      learnersDeltaPct: pctChange(Number(r.learners_now ?? 0), Number(r.learners_prior ?? 0)),
      trainingsLogged: Number(r.trainings_now ?? 0),
      trainingsDeltaPct: pctChange(Number(r.trainings_now ?? 0), Number(r.trainings_prior ?? 0)),
      assessments: Number(r.assessments_now ?? 0),
      assessmentsDeltaPct: pctChange(Number(r.assessments_now ?? 0), Number(r.assessments_prior ?? 0)),
      schoolVisits: Number(r.visits_now ?? 0),
      visitsDeltaPct: pctChange(Number(r.visits_now ?? 0), Number(r.visits_prior ?? 0)),
      storyActivities: Number(r.stories_now ?? 0),
      storiesDeltaPct: pctChange(Number(r.stories_now ?? 0), Number(r.stories_prior ?? 0)),
      implementingPct,
      implementingDeltaPp: implementingPriorPct > 0 ? Math.round((implementingPct - implementingPriorPct) * 10) / 10 : null,
      notImplementingPct: total > 0 ? Math.round((100 - implementingPct) * 10) / 10 : 0,
      notImplementingDeltaPp: implementingPriorPct > 0 ? Math.round((implementingPriorPct - implementingPct) * 10) / 10 : null,
    };
  } catch {
    return {
      learnersReached: 0, learnersDeltaPct: null,
      trainingsLogged: 0, trainingsDeltaPct: null,
      assessments: 0, assessmentsDeltaPct: null,
      schoolVisits: 0, visitsDeltaPct: null,
      storyActivities: 0, storiesDeltaPct: null,
      implementingPct: 0, implementingDeltaPp: null,
      notImplementingPct: 0, notImplementingDeltaPp: null,
    };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* School Performance Scorecard — 5-domain composite                           */
/* ────────────────────────────────────────────────────────────────────────── */

export type ScorecardDomain = {
  key: string;
  label: string;
  score: number;       // 0-10
  bandColor: string;
};

export type SchoolScorecard = {
  overallScore: number;       // 0-10
  performanceBand: "Low Performance" | "Needs Improvement" | "Moderate Performance" | "High Performance";
  domains: ScorecardDomain[];
  schoolsScored: number;
};

function bandFromScore(score: number): SchoolScorecard["performanceBand"] {
  if (score >= 8) return "High Performance";
  if (score >= 6) return "Moderate Performance";
  if (score >= 3) return "Needs Improvement";
  return "Low Performance";
}

function bandColorFromScore(score: number): string {
  if (score >= 8) return "#10b981";        // emerald
  if (score >= 6) return "#34d399";        // light emerald
  if (score >= 3) return "#f59e0b";        // amber
  return "#ef4444";                         // red
}

/**
 * Composite school performance scorecard. Each domain is computed from the
 * best-available DB signal:
 *  - Instruction Quality: avg lesson_evaluations.overall_score (already 1-4 → ×2.5),
 *    fallback to teacher_lesson_observations fidelity rate
 *  - Learner Outcomes: avg composite reading score / 10
 *  - Leadership & Governance: % schools with named head-teacher contact / 10
 *  - Community Engagement: % schools with portal_evidence row(s) / 10
 *  - Safe Learning Environment: % "yes" rate on lesson structure observations / 10
 */
export async function getSchoolScorecardPostgres(): Promise<SchoolScorecard> {
  try {
    const res = await queryPostgres(
      `WITH instr AS (
         SELECT AVG(overall_score)::numeric AS avg_overall
         FROM lesson_evaluations WHERE status = 'active'
       ),
       fidelity AS (
         SELECT
           CASE WHEN COUNT(*) > 0
             THEN (COUNT(*) FILTER (WHERE overall_post_observation_rating = 'fidelity'))::numeric / COUNT(*) * 10
             ELSE NULL END AS rate
         FROM teacher_lesson_observations WHERE status = 'submitted'
       ),
       outcomes AS (
         SELECT AVG(
           (COALESCE(letter_identification_score,0) + COALESCE(sound_identification_score,0)
            + COALESCE(decodable_words_score,0) + COALESCE(fluency_accuracy_score,0)
            + COALESCE(reading_comprehension_score,0)) / 5.0
         )::numeric AS avg_composite
         FROM assessment_records WHERE learner_uid IS NOT NULL
       ),
       leadership AS (
         SELECT
           CASE WHEN (SELECT COUNT(*) FROM schools_directory) > 0
             THEN (
               (SELECT COUNT(*)::numeric FROM schools_directory
                  WHERE COALESCE(contact_name, '') <> '' OR primary_contact_id IS NOT NULL)
               / NULLIF((SELECT COUNT(*) FROM schools_directory), 0)
             ) * 10
             ELSE NULL END AS score
       ),
       community AS (
         SELECT
           CASE WHEN (SELECT COUNT(*) FROM schools_directory) > 0
             THEN (
               (SELECT COUNT(DISTINCT school_id)::numeric FROM portal_evidence)
               / NULLIF((SELECT COUNT(*) FROM schools_directory), 0)
             ) * 10
             ELSE NULL END AS score
       ),
       safe_env AS (
         SELECT
           CASE WHEN COUNT(*) > 0
             THEN (COUNT(*) FILTER (WHERE observed_yes_no = 'yes'))::numeric / COUNT(*) * 10
             ELSE NULL END AS rate
         FROM observation_lesson_structure_items
       ),
       schools_with_data AS (
         SELECT COUNT(DISTINCT school_id)::int AS n FROM assessment_records
       )
       SELECT
         (SELECT avg_overall FROM instr) AS instr_overall,
         (SELECT rate FROM fidelity) AS fidelity_rate,
         (SELECT avg_composite FROM outcomes) AS outcomes_score,
         (SELECT score FROM leadership) AS leadership_score,
         (SELECT score FROM community) AS community_score,
         (SELECT rate FROM safe_env) AS safe_env_score,
         (SELECT n FROM schools_with_data) AS schools_scored`,
    );
    const r = res.rows[0] ?? {};

    // Instruction Quality: lesson_evaluations.overall_score is 1–4 → scale ×2.5;
    // fallback to fidelity rate (already 0–10) when no lesson_evaluations rows.
    const instrFromEval = r.instr_overall != null ? Math.min(10, Number(r.instr_overall) * 2.5) : null;
    const instrFromFid = r.fidelity_rate != null ? Number(r.fidelity_rate) : null;
    const instructionQuality = round1(instrFromEval ?? instrFromFid ?? 0);

    // Learner Outcomes: composite is 0–100 → /10
    const learnerOutcomes = r.outcomes_score != null ? round1(Number(r.outcomes_score) / 10) : 0;

    const leadership = r.leadership_score != null ? round1(Number(r.leadership_score)) : 0;
    const community = r.community_score != null ? round1(Number(r.community_score)) : 0;
    const safeEnv = r.safe_env_score != null ? round1(Number(r.safe_env_score)) : 0;

    const domains: ScorecardDomain[] = [
      { key: "instruction", label: "Instruction Quality", score: instructionQuality, bandColor: bandColorFromScore(instructionQuality) },
      { key: "outcomes", label: "Learner Outcomes", score: learnerOutcomes, bandColor: bandColorFromScore(learnerOutcomes) },
      { key: "leadership", label: "Leadership & Governance", score: leadership, bandColor: bandColorFromScore(leadership) },
      { key: "community", label: "Community Engagement", score: community, bandColor: bandColorFromScore(community) },
      { key: "safe", label: "Safe Learning Environment", score: safeEnv, bandColor: bandColorFromScore(safeEnv) },
    ];

    const overallScore = round1(domains.reduce((a, d) => a + d.score, 0) / domains.length);

    return {
      overallScore,
      performanceBand: bandFromScore(overallScore),
      domains,
      schoolsScored: Number(r.schools_scored ?? 0),
    };
  } catch {
    return {
      overallScore: 0,
      performanceBand: "Low Performance",
      domains: [
        { key: "instruction", label: "Instruction Quality", score: 0, bandColor: "#94a3b8" },
        { key: "outcomes", label: "Learner Outcomes", score: 0, bandColor: "#94a3b8" },
        { key: "leadership", label: "Leadership & Governance", score: 0, bandColor: "#94a3b8" },
        { key: "community", label: "Community Engagement", score: 0, bandColor: "#94a3b8" },
        { key: "safe", label: "Safe Learning Environment", score: 0, bandColor: "#94a3b8" },
      ],
      schoolsScored: 0,
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

/* ────────────────────────────────────────────────────────────────────────── */
/* Activity Trend — 30-day daily series with category breakdown               */
/* ────────────────────────────────────────────────────────────────────────── */

export type ActivityTrend = {
  series: Array<{ date: string; total: number }>;
  totals: {
    trainings: { count: number; deltaPct: number | null };
    assessments: { count: number; deltaPct: number | null };
    schoolVisits: { count: number; deltaPct: number | null };
    storiesCollected: { count: number; deltaPct: number | null };
  };
};

export async function getActivityTrendPostgres(days = 30): Promise<ActivityTrend> {
  const dayCount = Math.max(7, Math.min(180, Math.floor(days)));
  try {
    const seriesRes = await queryPostgres(
      `WITH series AS (
         SELECT generate_series(
           date_trunc('day', NOW() - ($1 || ' days')::interval),
           date_trunc('day', NOW()),
           '1 day'::interval
         )::date AS d
       )
       SELECT to_char(s.d, 'YYYY-MM-DD') AS date,
              COALESCE((SELECT COUNT(*)::int FROM portal_records pr
                  WHERE pr.module IN ('training','visit','story','story_activity')
                    AND pr.date::date = s.d), 0)
            + COALESCE((SELECT COUNT(*)::int FROM assessment_records ar
                  WHERE ar.assessment_date::date = s.d), 0) AS total
       FROM series s ORDER BY s.d ASC`,
      [String(dayCount)],
    );

    const totalsRes = await queryPostgres(
      `SELECT
         (SELECT COUNT(*)::int FROM portal_records
            WHERE module = 'training' AND date >= NOW() - ($1 || ' days')::interval) AS trainings_now,
         (SELECT COUNT(*)::int FROM portal_records
            WHERE module = 'training'
              AND date >= NOW() - ($2 || ' days')::interval
              AND date <  NOW() - ($1 || ' days')::interval) AS trainings_prior,
         (SELECT COUNT(*)::int FROM assessment_records
            WHERE assessment_date >= NOW() - ($1 || ' days')::interval) AS assessments_now,
         (SELECT COUNT(*)::int FROM assessment_records
            WHERE assessment_date >= NOW() - ($2 || ' days')::interval
              AND assessment_date <  NOW() - ($1 || ' days')::interval) AS assessments_prior,
         (SELECT COUNT(*)::int FROM portal_records
            WHERE module = 'visit' AND date >= NOW() - ($1 || ' days')::interval) AS visits_now,
         (SELECT COUNT(*)::int FROM portal_records
            WHERE module = 'visit'
              AND date >= NOW() - ($2 || ' days')::interval
              AND date <  NOW() - ($1 || ' days')::interval) AS visits_prior,
         (SELECT COUNT(*)::int FROM portal_records
            WHERE module IN ('story','story_activity') AND date >= NOW() - ($1 || ' days')::interval) AS stories_now,
         (SELECT COUNT(*)::int FROM portal_records
            WHERE module IN ('story','story_activity')
              AND date >= NOW() - ($2 || ' days')::interval
              AND date <  NOW() - ($1 || ' days')::interval) AS stories_prior`,
      [String(dayCount), String(dayCount * 2)],
    );

    const t = totalsRes.rows[0] ?? {};
    const pctChange = (now: number, prior: number): number | null => {
      if (prior === 0) return now > 0 ? 100 : null;
      return Math.round(((now - prior) / prior) * 1000) / 10;
    };

    return {
      series: seriesRes.rows.map((r) => ({ date: String(r.date), total: Number(r.total ?? 0) })),
      totals: {
        trainings: { count: Number(t.trainings_now ?? 0), deltaPct: pctChange(Number(t.trainings_now ?? 0), Number(t.trainings_prior ?? 0)) },
        assessments: { count: Number(t.assessments_now ?? 0), deltaPct: pctChange(Number(t.assessments_now ?? 0), Number(t.assessments_prior ?? 0)) },
        schoolVisits: { count: Number(t.visits_now ?? 0), deltaPct: pctChange(Number(t.visits_now ?? 0), Number(t.visits_prior ?? 0)) },
        storiesCollected: { count: Number(t.stories_now ?? 0), deltaPct: pctChange(Number(t.stories_now ?? 0), Number(t.stories_prior ?? 0)) },
      },
    };
  } catch {
    return {
      series: [],
      totals: {
        trainings: { count: 0, deltaPct: null },
        assessments: { count: 0, deltaPct: null },
        schoolVisits: { count: 0, deltaPct: null },
        storiesCollected: { count: 0, deltaPct: null },
      },
    };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Recent Network Activity                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export type NetworkActivityRow = {
  id: number;
  schoolName: string;
  type: string;
  module: string;
  occurredAt: string;
  status: string;
  href: string;
};

const MODULE_TYPE_LABELS: Record<string, string> = {
  training: "Training Logged",
  visit: "School Visit",
  assessment: "Assessment Uploaded",
  story: "Story Captured",
  story_activity: "Story Activity",
  observation: "Observation Submitted",
};

export async function getRecentNetworkActivityPostgres(limit = 10): Promise<NetworkActivityRow[]> {
  try {
    const cap = Math.min(50, Math.max(1, Math.floor(limit)));
    const res = await queryPostgres(
      `SELECT pr.id, pr.module, pr.school_name, pr.date::text AS occurred_at, pr.status
       FROM portal_records pr
       WHERE pr.deleted_at IS NULL
       ORDER BY pr.date DESC, pr.created_at DESC
       LIMIT ${cap}`,
    );
    return res.rows.map((r) => {
      const mod = String(r.module ?? "");
      return {
        id: Number(r.id),
        schoolName: String(r.school_name ?? "Unknown School"),
        type: MODULE_TYPE_LABELS[mod] ?? mod,
        module: mod,
        occurredAt: String(r.occurred_at ?? ""),
        status: String(r.status ?? ""),
        href: `/portal/records/${r.id}`,
      };
    });
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Program Implementation Coverage                                             */
/* ────────────────────────────────────────────────────────────────────────── */

export type CoverageBucket = {
  label: string;
  count: number;
  pct: number;
  color: string;
};

export type ImplementationCoverage = {
  totalSchools: number;
  implementingPct: number;
  buckets: CoverageBucket[];
};

export async function getImplementationCoveragePostgres(): Promise<ImplementationCoverage> {
  try {
    const res = await queryPostgres(
      `WITH school_class AS (
         SELECT
           s.id,
           CASE
             WHEN EXISTS (SELECT 1 FROM portal_records pr WHERE pr.school_id = s.id AND pr.date >= NOW() - INTERVAL '90 days')
               THEN 'implementing'
             WHEN EXISTS (SELECT 1 FROM portal_records pr WHERE pr.school_id = s.id)
                  OR EXISTS (SELECT 1 FROM assessment_records ar WHERE ar.school_id = s.id)
               THEN 'not_implementing'
             ELSE 'no_data'
           END AS bucket
         FROM schools_directory s
       )
       SELECT bucket, COUNT(*)::int AS n FROM school_class GROUP BY bucket`,
    );
    const counts: Record<string, number> = { implementing: 0, not_implementing: 0, no_data: 0 };
    for (const r of res.rows) {
      counts[String(r.bucket)] = Number(r.n ?? 0);
    }
    const total = counts.implementing + counts.not_implementing + counts.no_data;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

    const buckets: CoverageBucket[] = [
      { label: "Implementing",       count: counts.implementing,     pct: pct(counts.implementing),     color: "#066a67" },
      { label: "Not Implementing",   count: counts.not_implementing, pct: pct(counts.not_implementing), color: "#ef4444" },
      { label: "No Data",            count: counts.no_data,          pct: pct(counts.no_data),          color: "#cbd5e1" },
    ];

    return {
      totalSchools: total,
      implementingPct: pct(counts.implementing),
      buckets,
    };
  } catch {
    return { totalSchools: 0, implementingPct: 0, buckets: [] };
  }
}
