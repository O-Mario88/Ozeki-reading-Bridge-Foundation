/**
 * Read API for the /portal/visits dashboard.
 *
 * Aggregates from existing tables — no new schema:
 *   coaching_visits      (school, coach, visit_date, visit_type)
 *   lesson_evaluations   (overall_score, overall_level, domain_scores_json)
 *   schools_directory    (joined for region + name)
 *   portal_users         (joined for coach name)
 *
 * Each function returns null/[] on miss; the page falls back to its
 * FALLBACK constant when results are empty.
 */

import { queryPostgres } from "@/lib/server/postgres/client";

export type VisitsKpis = {
  visitsCompleted: number;
  scheduledVisits: number;
  schoolsReached: number;
  teachersEvaluated: number;
  avgEvaluationScore: number;
  followUpActionsOpen: number;
  dataQualityPct: number;
};

export type VisitTrendPoint = { month: string; visits: number };
export type EvalSegment = { label: string; value: number; pct: number };
export type RegionCoverage = { name: string; pct: number };

export type VisitRow = {
  id: string; school: string; coach: string; date: string;
  type: string; status: string; score: string;
};

export type UpcomingVisitRow = {
  date: string; school: string; purpose: string; coach: string;
};

export type CoachWorkloadRow = {
  name: string; initials: string; color: string;
  assigned: number; completed: number; pending: number; rate: number;
};

export type DomainAvg = { label: string; pct: number };

const COACH_COLORS = ["#10b981", "#2563eb", "#f59e0b", "#8b5cf6", "#ef4444", "#0f766e"];

function isoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function isoDay(v: unknown): string | null {
  const s = isoDate(v);
  return s ? s.slice(0, 10) : null;
}

function initialsFrom(name: string | null | undefined): string {
  if (!name) return "??";
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

/* ── KPIs ──────────────────────────────────────────────────────────── */

export async function getVisitsKpis(): Promise<VisitsKpis | null> {
  const res = await queryPostgres<{
    completed: string; scheduled: string; schools: string;
    teachers: string; avg_score: string | null; followups: string;
    quality: string | null;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM coaching_visits
          WHERE visit_date <= CURRENT_DATE) AS completed,
       (SELECT COUNT(*)::int FROM coaching_visits
          WHERE visit_date > CURRENT_DATE) AS scheduled,
       (SELECT COUNT(DISTINCT school_id)::int FROM coaching_visits) AS schools,
       (SELECT COUNT(DISTINCT teacher_uid)::int FROM lesson_evaluations
          WHERE status = 'active') AS teachers,
       (SELECT ROUND(AVG(overall_score) * 10)::int FROM lesson_evaluations
          WHERE status = 'active') AS avg_score,
       (SELECT COUNT(*)::int FROM lesson_evaluations
          WHERE status = 'active'
            AND next_visit_date IS NOT NULL
            AND next_visit_date >= CURRENT_DATE) AS followups,
       (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active') / NULLIF(COUNT(*), 0))
          FROM lesson_evaluations) AS quality`,
  );
  const r = res.rows[0];
  if (!r) return null;
  const completed = Number(r.completed) || 0;
  if (completed === 0) return null;
  return {
    visitsCompleted:     completed,
    scheduledVisits:     Number(r.scheduled) || 0,
    schoolsReached:      Number(r.schools) || 0,
    teachersEvaluated:   Number(r.teachers) || 0,
    avgEvaluationScore:  Number(r.avg_score) || 0,
    followUpActionsOpen: Number(r.followups) || 0,
    dataQualityPct:      Number(r.quality) || 0,
  };
}

/* ── Visit trend (last N months) ───────────────────────────────────── */

export async function getVisitTrend(months = 6): Promise<VisitTrendPoint[]> {
  const res = await queryPostgres<{ month: string; count: string }>(
    `WITH window AS (
       SELECT generate_series(
         date_trunc('month', NOW()) - (($1 - 1) || ' months')::interval,
         date_trunc('month', NOW()),
         '1 month'
       )::date AS month_start
     )
     SELECT TO_CHAR(w.month_start, 'Mon ''YY') AS month,
            COUNT(cv.id)::int AS count
       FROM window w
       LEFT JOIN coaching_visits cv
         ON date_trunc('month', cv.visit_date) = w.month_start
      GROUP BY w.month_start
      ORDER BY w.month_start`,
    [months],
  );
  return res.rows.map((r) => ({ month: r.month, visits: Number(r.count) || 0 }));
}

/* ── Evaluation score distribution (donut) ─────────────────────────── */

export async function getEvalDistribution(): Promise<{ total: number; segments: EvalSegment[] } | null> {
  const res = await queryPostgres<{ bucket: string; count: string }>(
    `SELECT
       CASE
         WHEN overall_score >= 8 THEN 'Excellent (80-100%)'
         WHEN overall_score >= 6 THEN 'Good (60-79%)'
         WHEN overall_score >= 4 THEN 'Needs Support (40-59%)'
         ELSE 'Critical (0-39%)'
       END AS bucket,
       COUNT(*)::int AS count
       FROM lesson_evaluations
      WHERE status = 'active'
      GROUP BY bucket`,
  );
  const counts = new Map<string, number>(res.rows.map((r) => [r.bucket, Number(r.count) || 0]));
  const total = res.rows.reduce((n, r) => n + (Number(r.count) || 0), 0);
  if (total === 0) return null;
  const labels = ["Excellent (80-100%)", "Good (60-79%)", "Needs Support (40-59%)", "Critical (0-39%)"];
  const segments: EvalSegment[] = labels.map((label) => {
    const value = counts.get(label) ?? 0;
    return { label, value, pct: Math.round((value / total) * 1000) / 10 };
  });
  return { total, segments };
}

/* ── Regional coverage ─────────────────────────────────────────────── */

export async function getRegionalCoverage(): Promise<RegionCoverage[]> {
  const res = await queryPostgres<{ region: string; total: string; visited: string }>(
    `SELECT COALESCE(sd.region, 'Unassigned') AS region,
            COUNT(DISTINCT sd.id)::int AS total,
            COUNT(DISTINCT cv.school_id)::int AS visited
       FROM schools_directory sd
       LEFT JOIN coaching_visits cv ON cv.school_id = sd.id
      GROUP BY sd.region
      ORDER BY visited DESC`,
  );
  return res.rows
    .filter((r) => Number(r.total) > 0)
    .map((r) => ({
      name: r.region,
      pct: Math.round((Number(r.visited) / Number(r.total)) * 100),
    }));
}

/* ── Recent visits ─────────────────────────────────────────────────── */

export async function listRecentVisits(limit = 5): Promise<VisitRow[]> {
  const res = await queryPostgres<{
    visit_uid: string; school: string; coach: string; visit_date: string;
    visit_type: string; status: string; avg_score: string | null;
  }>(
    `SELECT cv.visit_uid, sd.name AS school,
            COALESCE(pu.full_name, pu.email, '—') AS coach,
            cv.visit_date, cv.visit_type,
            CASE
              WHEN COUNT(le.id) FILTER (WHERE le.status = 'active') > 0 THEN 'Completed'
              WHEN cv.implementation_status = 'in_progress' THEN 'In Review'
              ELSE 'Pending'
            END AS status,
            ROUND(AVG(le.overall_score) * 10)::text AS avg_score
       FROM coaching_visits cv
       JOIN schools_directory sd ON sd.id = cv.school_id
       LEFT JOIN portal_users pu ON pu.id = cv.coach_user_id
       LEFT JOIN lesson_evaluations le ON le.visit_id = cv.id
      GROUP BY cv.id, cv.visit_uid, sd.name, pu.full_name, pu.email,
               cv.visit_date, cv.visit_type, cv.implementation_status
      ORDER BY cv.visit_date DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    id: r.visit_uid,
    school: r.school,
    coach: r.coach,
    date: isoDay(r.visit_date) ?? "",
    type: r.visit_type === "observation" ? "Observation" : "Coaching",
    status: r.status,
    score: r.avg_score ? `${r.avg_score}%` : "—",
  }));
}

/* ── Upcoming visits ───────────────────────────────────────────────── */

export async function listUpcomingVisits(limit = 5): Promise<UpcomingVisitRow[]> {
  const res = await queryPostgres<{
    visit_date: string; school: string; visit_type: string; coach: string;
  }>(
    `SELECT cv.visit_date, sd.name AS school, cv.visit_type,
            COALESCE(pu.full_name, pu.email, '—') AS coach
       FROM coaching_visits cv
       JOIN schools_directory sd ON sd.id = cv.school_id
       LEFT JOIN portal_users pu ON pu.id = cv.coach_user_id
      WHERE cv.visit_date > CURRENT_DATE
      ORDER BY cv.visit_date
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    date: isoDay(r.visit_date) ?? "",
    school: r.school,
    purpose: r.visit_type === "observation" ? "Classroom Observation" : "Coaching Visit",
    coach: r.coach,
  }));
}

/* ── Coach workload ────────────────────────────────────────────────── */

export async function listCoachWorkload(limit = 5): Promise<CoachWorkloadRow[]> {
  const res = await queryPostgres<{
    coach: string; assigned: string; completed: string;
    pending: string; rate: string;
  }>(
    `SELECT COALESCE(pu.full_name, pu.email, 'Unknown') AS coach,
            COUNT(DISTINCT cv.school_id)::int AS assigned,
            COUNT(DISTINCT CASE WHEN le.id IS NOT NULL THEN cv.id END)::int AS completed,
            COUNT(DISTINCT CASE WHEN le.id IS NULL THEN cv.id END)::int AS pending,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN le.id IS NOT NULL THEN cv.id END)
                  / NULLIF(COUNT(DISTINCT cv.id), 0))::int AS rate
       FROM coaching_visits cv
       JOIN portal_users pu ON pu.id = cv.coach_user_id
       LEFT JOIN lesson_evaluations le ON le.visit_id = cv.id
      GROUP BY pu.id, pu.full_name, pu.email
      ORDER BY assigned DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r, i) => ({
    name: r.coach,
    initials: initialsFrom(r.coach),
    color: COACH_COLORS[i % COACH_COLORS.length],
    assigned:  Number(r.assigned) || 0,
    completed: Number(r.completed) || 0,
    pending:   Number(r.pending) || 0,
    rate:      Number(r.rate) || 0,
  }));
}

/* ── Evaluation domain averages (parsed from domain_scores_json) ───── */

export async function getEvaluationDomains(): Promise<DomainAvg[]> {
  /* domain_scores_json is a JSON object like
     { "Lesson Planning": 7.6, "Phonics Instruction": 7.2, ... }
     averaged across active evaluations. */
  const res = await queryPostgres<{ domain: string; avg: string }>(
    `WITH parsed AS (
       SELECT key AS domain, value::text::float AS score
         FROM lesson_evaluations,
              json_each(domain_scores_json::json)
        WHERE status = 'active'
     )
     SELECT domain, ROUND(AVG(score) * 10)::int AS avg
       FROM parsed
      GROUP BY domain
      ORDER BY avg DESC
      LIMIT 5`,
  );
  return res.rows.map((r) => ({ label: r.domain, pct: Number(r.avg) || 0 }));
}
