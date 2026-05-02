/**
 * Read API for the /portal/assessments dashboard.
 *
 * Aggregates from existing tables — no new schema:
 *   assessment_sessions          (school, assessor, type, date)
 *   assessment_session_results   (per-learner per-session result rows)
 *   assessment_records           (legacy per-learner with domain scores)
 *   schools_directory            (joined for region + name)
 *   portal_users                 (joined for assessor name)
 */

import { queryPostgres } from "@/lib/server/postgres/client";

export type AssessmentsKpis = {
  totalAssessments: number;
  learnersAssessed: number;
  activeSchools: number;
  windowsOpen: number;
  completionRatePct: number;
  averageScorePct: number;
  dataQualityPct: number;
};

export type AssessmentTrendPoint = { month: string; value: number };
export type ScoreDistSegment = { label: string; value: number; pct: number };
export type RegionCoverage = { name: string; pct: number };

export type RecentSessionRow = {
  no: string; school: string; assessor: string; date: string;
  learners: number; type: string; status: string; avg: string;
};

export type AssessorRow = {
  name: string; initials: string; color: string;
  assigned: number; completed: number; rate: number;
};

export type AtRiskRow = { school: string; region: string; avg: number; learners: number };
export type UpcomingWindowRow = { range: string; region: string; schools: number };
export type DomainTile = { label: string; pct: number };

const ASSESSOR_COLORS = ["#10b981", "#2563eb", "#f59e0b", "#8b5cf6", "#ef4444", "#0f766e"];

function isoDay(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function initialsFrom(name: string | null | undefined): string {
  if (!name) return "??";
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

/* ── KPIs ──────────────────────────────────────────────────────────── */

export async function getAssessmentsKpis(): Promise<AssessmentsKpis | null> {
  const res = await queryPostgres<{
    total: string; learners: string; schools: string;
    open_windows: string; completion: string | null;
    avg_score: string | null; quality: string | null;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM assessment_sessions) AS total,
       (SELECT COUNT(DISTINCT learner_uid)::int FROM assessment_session_results
          WHERE learner_uid IS NOT NULL) AS learners,
       (SELECT COUNT(DISTINCT school_id)::int FROM assessment_sessions) AS schools,
       (SELECT COUNT(*)::int FROM assessment_sessions
          WHERE assessment_date >= CURRENT_DATE
            AND assessment_date <= CURRENT_DATE + INTERVAL '30 days') AS open_windows,
       (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE asr.id IS NOT NULL) / NULLIF(COUNT(*), 0))
          FROM assessment_sessions s
          LEFT JOIN assessment_session_results asr ON asr.session_id = s.id) AS completion,
       (SELECT ROUND(AVG(reading_comprehension_score) * 10)::int
          FROM assessment_records
         WHERE reading_comprehension_score IS NOT NULL) AS avg_score,
       (SELECT ROUND(100.0 * COUNT(*) FILTER (
              WHERE reading_stage_label IS NOT NULL
                AND benchmark_grade_level IS NOT NULL
              ) / NULLIF(COUNT(*), 0))
          FROM assessment_records) AS quality`,
  );
  const r = res.rows[0];
  if (!r) return null;
  const total = Number(r.total) || 0;
  if (total === 0) return null;
  return {
    totalAssessments:  total,
    learnersAssessed:  Number(r.learners) || 0,
    activeSchools:     Number(r.schools) || 0,
    windowsOpen:       Number(r.open_windows) || 0,
    completionRatePct: Number(r.completion) || 0,
    averageScorePct:   Number(r.avg_score) || 0,
    dataQualityPct:    Number(r.quality) || 0,
  };
}

/* ── Trend (last N months — sessions per month) ────────────────────── */

export async function getAssessmentTrend(months = 6): Promise<AssessmentTrendPoint[]> {
  const res = await queryPostgres<{ month: string; count: string }>(
    `WITH window AS (
       SELECT generate_series(
         date_trunc('month', NOW()) - (($1 - 1) || ' months')::interval,
         date_trunc('month', NOW()),
         '1 month'
       )::date AS month_start
     )
     SELECT TO_CHAR(w.month_start, 'Mon ''YY') AS month,
            COUNT(s.id)::int AS count
       FROM window w
       LEFT JOIN assessment_sessions s
         ON date_trunc('month', s.assessment_date) = w.month_start
      GROUP BY w.month_start
      ORDER BY w.month_start`,
    [months],
  );
  return res.rows.map((r) => ({ month: r.month, value: Number(r.count) || 0 }));
}

/* ── Score distribution donut (proxy: reading_comprehension_score) ── */

export async function getScoreDistribution(): Promise<{ total: number; segments: ScoreDistSegment[] } | null> {
  const res = await queryPostgres<{ bucket: string; count: string }>(
    `SELECT
       CASE
         WHEN reading_comprehension_score >= 8 THEN 'Proficient (80-100%)'
         WHEN reading_comprehension_score >= 6 THEN 'Developing (60-79%)'
         WHEN reading_comprehension_score >= 4 THEN 'Emerging (40-59%)'
         ELSE 'Beginning (0-39%)'
       END AS bucket,
       COUNT(*)::int AS count
       FROM assessment_records
      WHERE reading_comprehension_score IS NOT NULL
      GROUP BY bucket`,
  );
  const counts = new Map<string, number>(res.rows.map((r) => [r.bucket, Number(r.count) || 0]));
  const total = res.rows.reduce((n, r) => n + (Number(r.count) || 0), 0);
  if (total === 0) return null;
  const labels = ["Proficient (80-100%)", "Developing (60-79%)", "Emerging (40-59%)", "Beginning (0-39%)"];
  const segments: ScoreDistSegment[] = labels.map((label) => {
    const value = counts.get(label) ?? 0;
    return { label, value, pct: Math.round((value / total) * 1000) / 10 };
  });
  return { total, segments };
}

/* ── Regional coverage (% of schools assessed) ─────────────────────── */

export async function getAssessmentRegionalCoverage(): Promise<RegionCoverage[]> {
  const res = await queryPostgres<{ region: string; total: string; assessed: string }>(
    `SELECT COALESCE(sd.region, 'Unassigned') AS region,
            COUNT(DISTINCT sd.id)::int AS total,
            COUNT(DISTINCT s.school_id)::int AS assessed
       FROM schools_directory sd
       LEFT JOIN assessment_sessions s ON s.school_id = sd.id
      GROUP BY sd.region
      ORDER BY assessed DESC
      LIMIT 7`,
  );
  return res.rows
    .filter((r) => Number(r.total) > 0)
    .map((r) => ({
      name: r.region,
      pct: Math.round((Number(r.assessed) / Number(r.total)) * 100),
    }));
}

/* ── Recent assessment sessions ────────────────────────────────────── */

export async function listRecentAssessmentSessions(limit = 5): Promise<RecentSessionRow[]> {
  const res = await queryPostgres<{
    session_uid: string; school: string; assessor: string; assessment_date: string;
    learners: string; assessment_type: string; avg: string | null;
  }>(
    `SELECT s.session_uid, sd.name AS school,
            COALESCE(pu.full_name, pu.email, '—') AS assessor,
            s.assessment_date, s.assessment_type,
            COUNT(asr.id)::int AS learners,
            ROUND(AVG(ar.reading_comprehension_score) * 10)::text AS avg
       FROM assessment_sessions s
       JOIN schools_directory sd ON sd.id = s.school_id
       LEFT JOIN portal_users pu ON pu.id = s.assessor_user_id
       LEFT JOIN assessment_session_results asr ON asr.session_id = s.id
       LEFT JOIN assessment_records ar ON ar.school_id = s.school_id
                                       AND ar.assessment_date = s.assessment_date
      GROUP BY s.id, s.session_uid, sd.name, pu.full_name, pu.email,
               s.assessment_date, s.assessment_type
      ORDER BY s.assessment_date DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => {
    const learners = Number(r.learners) || 0;
    const status = learners === 0 ? "Pending" : Number(r.avg) > 0 ? "Completed" : "In Review";
    return {
      no: r.session_uid,
      school: r.school,
      assessor: r.assessor,
      date: isoDay(r.assessment_date) ?? "",
      learners,
      type: r.assessment_type || "EGRA",
      status,
      avg: r.avg ? `${r.avg}%` : "—",
    };
  });
}

/* ── At-risk schools (low avg + low cohort) ────────────────────────── */

export async function listAtRiskSchools(limit = 4): Promise<AtRiskRow[]> {
  const res = await queryPostgres<{
    school: string; region: string; avg: string | null; learners: string;
  }>(
    `SELECT sd.name AS school, COALESCE(sd.region, '—') AS region,
            ROUND(AVG(ar.reading_comprehension_score) * 10)::text AS avg,
            COUNT(DISTINCT ar.learner_uid)::int AS learners
       FROM assessment_records ar
       JOIN schools_directory sd ON sd.id = ar.school_id
      WHERE ar.reading_comprehension_score IS NOT NULL
      GROUP BY sd.id, sd.name, sd.region
     HAVING ROUND(AVG(ar.reading_comprehension_score) * 10) < 50
      ORDER BY avg::int
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    school: r.school,
    region: r.region,
    avg: Number(r.avg) || 0,
    learners: Number(r.learners) || 0,
  }));
}

/* ── Upcoming windows (next 60 days) ───────────────────────────────── */

export async function listUpcomingAssessmentWindows(limit = 3): Promise<UpcomingWindowRow[]> {
  const res = await queryPostgres<{ region: string; first_date: string; last_date: string; schools: string }>(
    `SELECT COALESCE(sd.region, '—') AS region,
            MIN(s.assessment_date) AS first_date,
            MAX(s.assessment_date) AS last_date,
            COUNT(DISTINCT s.school_id)::int AS schools
       FROM assessment_sessions s
       JOIN schools_directory sd ON sd.id = s.school_id
      WHERE s.assessment_date > CURRENT_DATE
        AND s.assessment_date <= CURRENT_DATE + INTERVAL '60 days'
      GROUP BY sd.region
      ORDER BY first_date
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => {
    const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    return {
      range: `${fmt(r.first_date)} – ${fmt(r.last_date)}`,
      region: `${r.region} Region`,
      schools: Number(r.schools) || 0,
    };
  });
}

/* ── Assessor workload ─────────────────────────────────────────────── */

export async function listAssessorWorkload(limit = 5): Promise<AssessorRow[]> {
  const res = await queryPostgres<{
    assessor: string; assigned: string; completed: string;
  }>(
    `SELECT COALESCE(pu.full_name, pu.email, 'Unknown') AS assessor,
            COUNT(DISTINCT s.id)::int AS assigned,
            COUNT(DISTINCT CASE WHEN asr.id IS NOT NULL THEN s.id END)::int AS completed
       FROM assessment_sessions s
       JOIN portal_users pu ON pu.id = s.assessor_user_id
       LEFT JOIN assessment_session_results asr ON asr.session_id = s.id
      GROUP BY pu.id, pu.full_name, pu.email
      ORDER BY assigned DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r, i) => {
    const assigned = Number(r.assigned) || 0;
    const completed = Number(r.completed) || 0;
    return {
      name: r.assessor,
      initials: initialsFrom(r.assessor),
      color: ASSESSOR_COLORS[i % ASSESSOR_COLORS.length],
      assigned, completed,
      rate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
    };
  });
}

/* ── Domain mastery (avg per domain across records) ────────────────── */

export async function getDomainMastery(): Promise<DomainTile[]> {
  const res = await queryPostgres<{
    phonemic: string | null; grapheme: string | null; blending: string | null;
    fluency: string | null; comprehension: string | null;
  }>(
    `SELECT
       ROUND(AVG(letter_identification_score) * 10)::int AS phonemic,
       ROUND(AVG(sound_identification_score) * 10)::int AS grapheme,
       ROUND(AVG(decodable_words_score) * 10)::int AS blending,
       ROUND(AVG(fluency_accuracy_score) * 10)::int AS fluency,
       ROUND(AVG(reading_comprehension_score) * 10)::int AS comprehension
       FROM assessment_records
      WHERE letter_identification_score IS NOT NULL`,
  );
  const r = res.rows[0];
  if (!r) return [];
  const tiles = [
    { label: "Phonemic Awareness", pct: Number(r.phonemic) || 0 },
    { label: "Grapheme-Phoneme",   pct: Number(r.grapheme) || 0 },
    { label: "Blending",            pct: Number(r.blending) || 0 },
    { label: "Fluency",             pct: Number(r.fluency) || 0 },
    { label: "Comprehension",       pct: Number(r.comprehension) || 0 },
  ];
  if (tiles.every((t) => t.pct === 0)) return [];
  return tiles;
}
