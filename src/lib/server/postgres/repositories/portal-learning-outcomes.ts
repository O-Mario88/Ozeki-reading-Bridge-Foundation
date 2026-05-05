/**
 * portal-learning-outcomes — staff-side aggregator for the Learning
 * Outcomes dashboard at /portal/learning-outcomes.
 *
 * Reuses the public-learning-outcomes repo wherever the data shape is
 * already correct (KPI counts, distribution donut, observation domains,
 * domain performance). Adds the portal-only queries that surface school
 * names and per-school detail — privacy suppression doesn't apply here
 * because this view is auth-gated to portal staff.
 */

import { queryPostgres } from "@/lib/server/postgres/client";
import {
  getDataCompletenessKpi,
  getDataQualityBreakdown,
  getDomainPerformance,
  getLearnersAssessedKpi,
  getMovedUpKpi,
  getObservationDomainBreakdown,
  getReadingLevelsDistribution,
  getReadingProficiencyKpi,
  getTeachingQualityIndexKpi,
  type DataQualityBreakdown,
  type DomainPerformanceRow,
  type ObservationDomain,
  type ReadingLevelsDistribution,
} from "./public-learning-outcomes";

/* ────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────── */

export type PortalLearningOutcomesSnapshot = {
  generatedAt: string;
  kpis: {
    learnersAssessed: { value: number; deltaPct: number };
    schoolsWithData: { value: number; deltaCount: number };
    overallLearningScore: { value: number; deltaPp: number };
    atOrAboveBenchmark: { value: number; deltaPp: number };
    teachingQualityScore: { value: number; deltaPp: number };
    readingLevelProgression: { value: number; deltaPp: number };
  };
  progressOverview: ProgressOverviewPoint[];
  readingLevels: ReadingLevelsDistribution;
  observationDomains: ObservationDomain[];
  literacyDomains: LiteracyDomainRow[];
  schoolBreakdown: {
    topPerforming: SchoolOutcomeRow[];
    priority: SchoolOutcomeRow[];
  };
  qualityCoverage: {
    assessmentCompletenessPct: number;
    observationLinkagePct: number;
    readingLevelComputationPct: number;
    latestSync: string | null;
  };
  alerts: OutcomeAlert[];
  recentRecords: RecentOutcomeRecord[];
  insight: string;
  raw: { dataQuality: DataQualityBreakdown };
};

export type ProgressOverviewPoint = {
  label: string;
  baseline: number;
  midline: number;
  latest: number;
};

export type LiteracyDomainRow = {
  key: string;
  label: string;
  pct: number;
  deltaPp: number;
  sampleSize: number;
};

export type SchoolOutcomeRow = {
  schoolId: number;
  schoolName: string;
  region: string;
  pct: number;
};

export type OutcomeAlert = {
  key: "below_benchmark" | "missing_observations" | "declining_fluency";
  count: number;
  label: string;
  href: string;
};

export type RecentOutcomeRecord = {
  schoolId: number;
  schoolName: string;
  region: string;
  learners: number;
  benchmarkPct: number;
  teachingQualityPct: number;
  readingLevelGainPp: number;
  status: "On Track" | "Needs Support" | "At Risk";
  updatedAt: string | null;
};

/* ────────────────────────────────────────────────────────────────────
   Internal queries
   ──────────────────────────────────────────────────────────────────── */

const BENCHMARK_THRESHOLD = 60;
const NEEDS_SUPPORT_THRESHOLD = 65;

async function querySchoolsWithData(): Promise<{ current: number; previous: number }> {
  try {
    const res = await queryPostgres<{ curr: number; prev: number }>(
      `SELECT
         COUNT(DISTINCT school_id) FILTER (
           WHERE assessment_date >= date_trunc('month', NOW())
         )::int AS curr,
         COUNT(DISTINCT school_id) FILTER (
           WHERE assessment_date >= date_trunc('month', NOW()) - INTERVAL '1 month'
             AND assessment_date <  date_trunc('month', NOW())
         )::int AS prev
       FROM assessment_records
       WHERE school_id IS NOT NULL`,
    );
    const r = res.rows[0];
    return { current: Number(r?.curr ?? 0), previous: Number(r?.prev ?? 0) };
  } catch {
    return { current: 0, previous: 0 };
  }
}

async function queryProgressOverview(months = 6): Promise<ProgressOverviewPoint[]> {
  // For each of the last `months` months, return % of learners with the
  // given assessment_type whose latest reading_stage_label is at/above
  // benchmark (Developing|Fluent or order >= 3). Keeps a learner's monthly
  // contribution to the latest assessment in that month for each type.
  try {
    const res = await queryPostgres<{
      month: string;
      assessed_baseline: number;
      ok_baseline: number;
      assessed_progress: number;
      ok_progress: number;
      assessed_endline: number;
      ok_endline: number;
    }>(
      `WITH bucket AS (
         SELECT
           to_char(date_trunc('month', assessment_date), 'YYYY-MM') AS month,
           assessment_type,
           learner_uid,
           reading_stage_order,
           row_number() OVER (
             PARTITION BY learner_uid, assessment_type, date_trunc('month', assessment_date)
             ORDER BY assessment_date DESC
           ) AS rn
         FROM assessment_records
         WHERE learner_uid IS NOT NULL
           AND reading_stage_order IS NOT NULL
           AND assessment_date >= date_trunc('month', NOW()) - ($1::int - 1) * INTERVAL '1 month'
       )
       SELECT month,
              COUNT(*) FILTER (WHERE assessment_type = 'baseline' AND rn = 1)::int AS assessed_baseline,
              COUNT(*) FILTER (WHERE assessment_type = 'baseline' AND rn = 1 AND reading_stage_order >= 3)::int AS ok_baseline,
              COUNT(*) FILTER (WHERE assessment_type = 'progress' AND rn = 1)::int AS assessed_progress,
              COUNT(*) FILTER (WHERE assessment_type = 'progress' AND rn = 1 AND reading_stage_order >= 3)::int AS ok_progress,
              COUNT(*) FILTER (WHERE assessment_type = 'endline'  AND rn = 1)::int AS assessed_endline,
              COUNT(*) FILTER (WHERE assessment_type = 'endline'  AND rn = 1 AND reading_stage_order >= 3)::int AS ok_endline
       FROM bucket
       GROUP BY month
       ORDER BY month ASC`,
      [months],
    );
    return res.rows.map((r) => {
      const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
      return {
        label: monthShortLabel(String(r.month)),
        baseline: pct(Number(r.ok_baseline), Number(r.assessed_baseline)),
        midline: pct(Number(r.ok_progress), Number(r.assessed_progress)),
        latest: pct(Number(r.ok_endline), Number(r.assessed_endline)),
      };
    });
  } catch {
    return [];
  }
}

function monthShortLabel(yyyyMm: string): string {
  // YYYY-MM → "Jan", "Feb", etc.
  const parts = yyyyMm.split("-");
  if (parts.length !== 2) return yyyyMm;
  const monthIdx = Number(parts[1]) - 1;
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[monthIdx] ?? yyyyMm;
}

async function querySchoolBreakdown(): Promise<{ top: SchoolOutcomeRow[]; priority: SchoolOutcomeRow[] }> {
  try {
    const res = await queryPostgres<{
      school_id: number;
      school_name: string;
      region: string | null;
      assessed: number;
      at_above: number;
    }>(
      `SELECT sd.id AS school_id,
              sd.name AS school_name,
              sd.region,
              COUNT(DISTINCT ar.learner_uid)::int AS assessed,
              COUNT(DISTINCT ar.learner_uid) FILTER (
                WHERE ar.reading_stage_order >= 3
              )::int AS at_above
       FROM assessment_records ar
       JOIN schools_directory sd ON sd.id = ar.school_id
       WHERE ar.learner_uid IS NOT NULL
         AND ar.reading_stage_order IS NOT NULL
         AND ar.assessment_date >= NOW() - INTERVAL '6 months'
       GROUP BY sd.id, sd.name, sd.region
       HAVING COUNT(DISTINCT ar.learner_uid) >= 5
       ORDER BY (CASE WHEN COUNT(DISTINCT ar.learner_uid) > 0
                      THEN COUNT(DISTINCT ar.learner_uid) FILTER (WHERE ar.reading_stage_order >= 3)::float /
                           COUNT(DISTINCT ar.learner_uid)
                      ELSE 0 END) DESC
       LIMIT 50`,
    );
    const rows: SchoolOutcomeRow[] = res.rows.map((r) => ({
      schoolId: Number(r.school_id),
      schoolName: r.school_name,
      region: r.region ?? "—",
      pct: r.assessed > 0 ? Math.round((Number(r.at_above) / Number(r.assessed)) * 100) : 0,
    }));
    const sortedDesc = [...rows].sort((a, b) => b.pct - a.pct);
    const sortedAsc = [...rows].sort((a, b) => a.pct - b.pct);
    return {
      top: sortedDesc.slice(0, 5),
      priority: sortedAsc.slice(0, 5),
    };
  } catch {
    return { top: [], priority: [] };
  }
}

async function queryQualityCoverage() {
  try {
    const [completenessRes, linkageRes, computationRes, syncRes] = await Promise.all([
      queryPostgres<{ pct: number }>(
        `SELECT CASE
           WHEN COUNT(*) > 0
             THEN ROUND(100.0 * COUNT(*) FILTER (WHERE validation_status = 'valid')::numeric
                        / COUNT(*), 1)::float
           ELSE 0 END AS pct
         FROM assessment_records`,
      ),
      queryPostgres<{ pct: number }>(
        `SELECT CASE
           WHEN COUNT(*) > 0
             THEN ROUND(100.0 * COUNT(*) FILTER (
                          WHERE EXISTS (
                            SELECT 1 FROM teacher_lesson_observations o WHERE o.school_id = s.id
                          )
                        )::numeric / COUNT(*), 1)::float
           ELSE 0 END AS pct
         FROM (
           SELECT DISTINCT school_id AS id FROM assessment_records WHERE school_id IS NOT NULL
         ) s`,
      ),
      queryPostgres<{ pct: number }>(
        `SELECT CASE
           WHEN COUNT(*) > 0
             THEN ROUND(100.0 * COUNT(*) FILTER (WHERE reading_stage_order IS NOT NULL)::numeric
                        / COUNT(*), 1)::float
           ELSE 0 END AS pct
         FROM assessment_records`,
      ),
      queryPostgres<{ ts: string | null }>(
        `SELECT MAX(GREATEST(created_at, assessment_date::timestamptz))::text AS ts
         FROM assessment_records`,
      ),
    ]);
    return {
      assessmentCompletenessPct: Number(completenessRes.rows[0]?.pct ?? 0),
      observationLinkagePct: Number(linkageRes.rows[0]?.pct ?? 0),
      readingLevelComputationPct: Number(computationRes.rows[0]?.pct ?? 0),
      latestSync: syncRes.rows[0]?.ts ?? null,
    };
  } catch {
    return {
      assessmentCompletenessPct: 0,
      observationLinkagePct: 0,
      readingLevelComputationPct: 0,
      latestSync: null,
    };
  }
}

async function queryOutcomeAlerts(): Promise<OutcomeAlert[]> {
  try {
    const [belowRes, missingRes, decliningRes] = await Promise.all([
      queryPostgres<{ n: number }>(
        `WITH per_school AS (
           SELECT school_id,
                  COUNT(DISTINCT learner_uid) AS assessed,
                  COUNT(DISTINCT learner_uid) FILTER (WHERE reading_stage_order >= 3) AS at_above
           FROM assessment_records
           WHERE learner_uid IS NOT NULL AND school_id IS NOT NULL
             AND assessment_date >= NOW() - INTERVAL '6 months'
           GROUP BY school_id
           HAVING COUNT(DISTINCT learner_uid) >= 5
         )
         SELECT COUNT(*)::int AS n
         FROM per_school
         WHERE assessed > 0 AND (at_above::float / assessed) < $1`,
        [BENCHMARK_THRESHOLD / 100],
      ),
      queryPostgres<{ n: number }>(
        `SELECT COUNT(*)::int AS n
         FROM (
           SELECT DISTINCT school_id AS id FROM assessment_records
           WHERE school_id IS NOT NULL AND assessment_date >= NOW() - INTERVAL '6 months'
         ) s
         WHERE NOT EXISTS (
           SELECT 1 FROM teacher_lesson_observations o
           WHERE o.school_id = s.id
             AND o.observation_date >= NOW() - INTERVAL '6 months'
         )`,
      ),
      queryPostgres<{ n: number }>(
        `WITH baseline AS (
           SELECT DISTINCT ON (school_id, learner_uid)
                  school_id, learner_uid, reading_stage_order AS so
           FROM assessment_records
           WHERE assessment_type = 'baseline'
             AND learner_uid IS NOT NULL
             AND reading_stage_order IS NOT NULL
           ORDER BY school_id, learner_uid, assessment_date ASC
         ),
         latest AS (
           SELECT DISTINCT ON (school_id, learner_uid)
                  school_id, learner_uid, reading_stage_order AS so
           FROM assessment_records
           WHERE assessment_type IN ('progress', 'endline')
             AND learner_uid IS NOT NULL
             AND reading_stage_order IS NOT NULL
           ORDER BY school_id, learner_uid, assessment_date DESC
         ),
         per_school AS (
           SELECT b.school_id,
                  COUNT(*) AS matched,
                  COUNT(*) FILTER (WHERE l.so < b.so) AS declined
           FROM baseline b
           JOIN latest l ON l.school_id = b.school_id AND l.learner_uid = b.learner_uid
           GROUP BY b.school_id
           HAVING COUNT(*) >= 5
         )
         SELECT COUNT(*)::int AS n
         FROM per_school
         WHERE declined::float / matched > 0.2`,
      ),
    ]);
    return [
      {
        key: "below_benchmark",
        count: Number(belowRes.rows[0]?.n ?? 0),
        label: "schools below benchmark",
        href: "/portal/schools",
      },
      {
        key: "missing_observations",
        count: Number(missingRes.rows[0]?.n ?? 0),
        label: "schools with missing observation evidence",
        href: "/portal/observations",
      },
      {
        key: "declining_fluency",
        count: Number(decliningRes.rows[0]?.n ?? 0),
        label: "schools with declining fluency",
        href: "/portal/interventions",
      },
    ];
  } catch {
    return [
      { key: "below_benchmark", count: 0, label: "schools below benchmark", href: "/portal/schools" },
      { key: "missing_observations", count: 0, label: "schools with missing observation evidence", href: "/portal/observations" },
      { key: "declining_fluency", count: 0, label: "schools with declining fluency", href: "/portal/interventions" },
    ];
  }
}

async function queryRecentRecords(): Promise<RecentOutcomeRecord[]> {
  try {
    const res = await queryPostgres<{
      school_id: number;
      school_name: string;
      region: string | null;
      learners: number;
      assessed: number;
      at_above: number;
      gain_pp: number;
      tq_pct: number | null;
      updated_at: string | null;
    }>(
      `WITH per_school AS (
         SELECT ar.school_id,
                COUNT(DISTINCT ar.learner_uid) AS learners,
                COUNT(DISTINCT ar.learner_uid) AS assessed,
                COUNT(DISTINCT ar.learner_uid) FILTER (WHERE ar.reading_stage_order >= 3) AS at_above,
                MAX(ar.created_at)::text AS updated_at
         FROM assessment_records ar
         WHERE ar.learner_uid IS NOT NULL
           AND ar.assessment_date >= NOW() - INTERVAL '90 days'
         GROUP BY ar.school_id
         HAVING COUNT(DISTINCT ar.learner_uid) >= 5
       ),
       baseline AS (
         SELECT DISTINCT ON (school_id, learner_uid)
                school_id, learner_uid, reading_stage_order AS so
         FROM assessment_records
         WHERE assessment_type = 'baseline'
           AND learner_uid IS NOT NULL AND reading_stage_order IS NOT NULL
         ORDER BY school_id, learner_uid, assessment_date ASC
       ),
       latest AS (
         SELECT DISTINCT ON (school_id, learner_uid)
                school_id, learner_uid, reading_stage_order AS so
         FROM assessment_records
         WHERE assessment_type IN ('progress', 'endline')
           AND learner_uid IS NOT NULL AND reading_stage_order IS NOT NULL
         ORDER BY school_id, learner_uid, assessment_date DESC
       ),
       gain AS (
         SELECT b.school_id,
                ROUND(100.0 * COUNT(*) FILTER (WHERE l.so > b.so)::numeric / NULLIF(COUNT(*), 0), 1) AS gain_pp
         FROM baseline b JOIN latest l USING (school_id, learner_uid)
         GROUP BY b.school_id
       ),
       tq AS (
         SELECT school_id,
                ROUND(100.0 * AVG(CASE
                  WHEN overall_post_observation_rating = 'fidelity' THEN 1.0
                  WHEN overall_post_observation_rating = 'partial'  THEN 0.5
                  WHEN overall_post_observation_rating = 'low'      THEN 0.0
                  ELSE NULL END)::numeric, 1) AS pct
         FROM teacher_lesson_observations
         WHERE observation_date >= NOW() - INTERVAL '6 months'
         GROUP BY school_id
       )
       SELECT ps.school_id,
              sd.name AS school_name,
              sd.region,
              ps.learners::int AS learners,
              ps.assessed::int AS assessed,
              ps.at_above::int AS at_above,
              COALESCE(g.gain_pp, 0)::float AS gain_pp,
              COALESCE(tq.pct, 0)::float AS tq_pct,
              ps.updated_at
       FROM per_school ps
       JOIN schools_directory sd ON sd.id = ps.school_id
       LEFT JOIN gain g ON g.school_id = ps.school_id
       LEFT JOIN tq ON tq.school_id = ps.school_id
       ORDER BY ps.updated_at DESC NULLS LAST
       LIMIT 12`,
    );
    return res.rows.map((r) => {
      const benchmarkPct = Number(r.assessed) > 0
        ? Math.round((Number(r.at_above) / Number(r.assessed)) * 100)
        : 0;
      const tqPct = Math.round(Number(r.tq_pct ?? 0));
      const gainPp = Math.round(Number(r.gain_pp ?? 0));
      const status: RecentOutcomeRecord["status"] =
        benchmarkPct >= NEEDS_SUPPORT_THRESHOLD ? "On Track"
        : benchmarkPct >= BENCHMARK_THRESHOLD ? "Needs Support"
        : "At Risk";
      return {
        schoolId: Number(r.school_id),
        schoolName: r.school_name,
        region: r.region ?? "—",
        learners: Number(r.learners),
        benchmarkPct,
        teachingQualityPct: tqPct,
        readingLevelGainPp: gainPp,
        status,
        updatedAt: r.updated_at ?? null,
      };
    });
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────
   Domain pcts → enrichment with delta + n
   ──────────────────────────────────────────────────────────────────── */

async function querySamplePerDomain(): Promise<{ baselinePct: Record<string, number>; sample: number }> {
  try {
    const res = await queryPostgres<{
      n: number;
      pa: number; gpc: number; bd: number; wrf: number; spc: number; comp: number;
    }>(
      `SELECT COUNT(*)::int AS n,
              ROUND(100.0 * AVG(CASE WHEN phonemic_awareness_mastery_status = 'mastered' THEN 1 ELSE 0 END)::numeric, 1)::float AS pa,
              ROUND(100.0 * AVG(CASE WHEN grapheme_phoneme_correspondence_mastery_status = 'mastered' THEN 1 ELSE 0 END)::numeric, 1)::float AS gpc,
              ROUND(100.0 * AVG(CASE WHEN blending_decoding_mastery_status = 'mastered' THEN 1 ELSE 0 END)::numeric, 1)::float AS bd,
              ROUND(100.0 * AVG(CASE WHEN word_recognition_fluency_mastery_status = 'mastered' THEN 1 ELSE 0 END)::numeric, 1)::float AS wrf,
              ROUND(100.0 * AVG(CASE WHEN sentence_paragraph_construction_mastery_status = 'mastered' THEN 1 ELSE 0 END)::numeric, 1)::float AS spc,
              ROUND(100.0 * AVG(CASE WHEN comprehension_mastery_status = 'mastered' THEN 1 ELSE 0 END)::numeric, 1)::float AS comp
       FROM assessment_records
       WHERE assessment_type = 'baseline'`,
    );
    const r = res.rows[0];
    if (!r) return { baselinePct: {}, sample: 0 };
    return {
      sample: Number(r.n ?? 0),
      baselinePct: {
        phonemic_awareness: Number(r.pa ?? 0),
        grapheme_phoneme_correspondence: Number(r.gpc ?? 0),
        blending_decoding: Number(r.bd ?? 0),
        word_recognition_fluency: Number(r.wrf ?? 0),
        sentence_paragraph_construction: Number(r.spc ?? 0),
        comprehension: Number(r.comp ?? 0),
      },
    };
  } catch {
    return { baselinePct: {}, sample: 0 };
  }
}

/* ────────────────────────────────────────────────────────────────────
   Public entry point
   ──────────────────────────────────────────────────────────────────── */

export async function getPortalLearningOutcomesSnapshot(): Promise<PortalLearningOutcomesSnapshot> {
  const [
    learnersAssessed,
    proficiency,
    teachingQuality,
    movedUp,
    dataCompleteness,
    dataQuality,
    readingLevels,
    observationDomains,
    domainPerformance,
    schoolsWithData,
    progressOverview,
    schoolBreakdown,
    qualityCoverage,
    alerts,
    recentRecords,
    domainBaselines,
  ] = await Promise.all([
    getLearnersAssessedKpi(),
    getReadingProficiencyKpi(),
    getTeachingQualityIndexKpi(),
    getMovedUpKpi(),
    getDataCompletenessKpi(),
    getDataQualityBreakdown(),
    getReadingLevelsDistribution(),
    getObservationDomainBreakdown(),
    getDomainPerformance(),
    querySchoolsWithData(),
    queryProgressOverview(6),
    querySchoolBreakdown(),
    queryQualityCoverage(),
    queryOutcomeAlerts(),
    queryRecentRecords(),
    querySamplePerDomain(),
  ]);

  // Overall learning score: blend of proficiency, progression and teaching
  // quality so the headline metric reflects the three pillars on the
  // dashboard. Deterministic and documented so it can be audited.
  const overallScore =
    Math.round(0.4 * proficiency.current + 0.3 * movedUp.rate + 0.3 * teachingQuality.current);
  const overallDelta =
    Math.round((0.4 * proficiency.deltaPp + 0.3 * (movedUp.deltaPp ?? 0) + 0.3 * teachingQuality.deltaPp) * 10) / 10;

  const literacyDomains: LiteracyDomainRow[] = (domainPerformance as DomainPerformanceRow[]).map((d) => ({
    key: d.key,
    label: d.label,
    pct: d.pct,
    deltaPp: domainBaselines.baselinePct[d.key] != null
      ? Math.round((d.pct - (domainBaselines.baselinePct[d.key] ?? 0)) * 10) / 10
      : 0,
    sampleSize: domainBaselines.sample,
  }));

  // Insight string is deterministic — strongest domain, weakest domain,
  // and a coaching reminder when teaching quality is high.
  const sortedDomains = [...literacyDomains].sort((a, b) => b.pct - a.pct);
  const strongest = sortedDomains[0];
  const insight = strongest
    ? `${strongest.label.split("&")[0].trim()} continues to lead${
        teachingQuality.current >= 65
          ? " where coaching consistency and teacher observation scores are strongest."
          : "; coaching focus recommended to lift trailing domains."
      }`
    : "Awaiting first sync of learning outcomes data.";

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      learnersAssessed: { value: learnersAssessed.current, deltaPct: learnersAssessed.deltaPct },
      schoolsWithData: {
        value: schoolsWithData.current,
        deltaCount: schoolsWithData.current - schoolsWithData.previous,
      },
      overallLearningScore: { value: overallScore, deltaPp: overallDelta },
      atOrAboveBenchmark: { value: proficiency.current, deltaPp: proficiency.deltaPp },
      teachingQualityScore: { value: teachingQuality.current, deltaPp: teachingQuality.deltaPp },
      readingLevelProgression: { value: movedUp.rate, deltaPp: movedUp.deltaPp ?? 0 },
    },
    progressOverview,
    readingLevels,
    observationDomains,
    literacyDomains,
    schoolBreakdown: { topPerforming: schoolBreakdown.top, priority: schoolBreakdown.priority },
    qualityCoverage,
    alerts,
    recentRecords,
    insight,
    raw: { dataQuality: { ...dataQuality, completionPct: dataCompleteness.current } },
  };
}
