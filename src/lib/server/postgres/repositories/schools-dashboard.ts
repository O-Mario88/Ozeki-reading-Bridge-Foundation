/**
 * Read API for the /portal/schools dashboard (Schools Overview).
 *
 * Aggregates from existing tables — no new schema:
 *   schools_directory, lesson_evaluations, assessment_records,
 *   assessment_sessions, coaching_visits, story_activities,
 *   teacher_lesson_observations, portal_records
 *
 * Each function returns null/[] on miss so the page can fall through
 * to its existing FALLBACK constant.
 */

import { queryPostgres } from "@/lib/server/postgres/client";

export type SchoolsOverviewKpis = {
  schoolsReached: number;
  activeSchools: number;
  teachersEvaluated: number;
  assessmentsCompleted: number;
  coachingVisits: number;
  storyActivities: number;
  dataQualityPct: number;
};

export type RecentSchoolVisit = {
  date: string;          // ISO yyyy-mm-dd
  school: string;
  district: string;
  coach: string;
  status: string;
};

export type ImplementationFunnelRow = {
  label: string;
  count: number;
  pct: number;
};

function isoDay(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

/* ── KPIs ──────────────────────────────────────────────────────────── */

export async function getSchoolsOverviewKpis(): Promise<SchoolsOverviewKpis | null> {
  const res = await queryPostgres<{
    reached: string; active: string; teachers: string;
    assessments: string; visits: string; stories: string;
    quality: string | null;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM schools_directory) AS reached,
       (SELECT COUNT(*)::int FROM schools_directory WHERE school_active = TRUE) AS active,
       (SELECT COUNT(DISTINCT teacher_uid)::int FROM lesson_evaluations
          WHERE status = 'active') AS teachers,
       (SELECT COUNT(*)::int FROM assessment_sessions) AS assessments,
       (SELECT COUNT(*)::int FROM coaching_visits) AS visits,
       (SELECT COUNT(*)::int FROM story_activities) AS stories,
       (SELECT ROUND(100.0 * COUNT(*) FILTER (
              WHERE region IS NOT NULL AND region <> ''
                AND district IS NOT NULL AND district <> ''
                AND name IS NOT NULL AND name <> ''
              ) / NULLIF(COUNT(*), 0))
          FROM schools_directory) AS quality`,
  );
  const r = res.rows[0];
  if (!r) return null;
  const reached = Number(r.reached) || 0;
  if (reached === 0) return null;
  return {
    schoolsReached:        reached,
    activeSchools:         Number(r.active) || 0,
    teachersEvaluated:     Number(r.teachers) || 0,
    assessmentsCompleted:  Number(r.assessments) || 0,
    coachingVisits:        Number(r.visits) || 0,
    storyActivities:       Number(r.stories) || 0,
    dataQualityPct:        Number(r.quality) || 0,
  };
}

/* ── Recent school visits ──────────────────────────────────────────── */

export async function listRecentSchoolVisits(limit = 5): Promise<RecentSchoolVisit[]> {
  const res = await queryPostgres<{
    visit_date: string; school: string; district: string;
    coach: string; status: string;
  }>(
    `SELECT cv.visit_date,
            sd.name AS school,
            COALESCE(sd.district, '—') AS district,
            COALESCE(pu.full_name, pu.email, '—') AS coach,
            CASE
              WHEN COUNT(le.id) FILTER (WHERE le.status = 'active') > 0 THEN 'Completed'
              WHEN cv.implementation_status = 'in_progress' THEN 'In Review'
              ELSE 'Pending'
            END AS status
       FROM coaching_visits cv
       JOIN schools_directory sd ON sd.id = cv.school_id
       LEFT JOIN portal_users pu ON pu.id = cv.coach_user_id
       LEFT JOIN lesson_evaluations le ON le.visit_id = cv.id
      GROUP BY cv.id, cv.visit_date, sd.name, sd.district,
               pu.full_name, pu.email, cv.implementation_status
      ORDER BY cv.visit_date DESC, cv.created_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows.map((r) => ({
    date: isoDay(r.visit_date) ?? "",
    school: r.school,
    district: r.district,
    coach: r.coach,
    status: r.status,
  }));
}

/* ── Implementation funnel (coaching_visits.implementation_status) ── */

export async function getImplementationFunnel(): Promise<ImplementationFunnelRow[]> {
  /* Bucket schools by their most-recent visit's implementation_status,
     ordering as Trained -> Visited -> Assessed -> Improving -> Flagged
     to match the dashboard's funnel. */
  const res = await queryPostgres<{
    trained: string; visited: string; assessed: string;
    improving: string; flagged: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM schools_directory) AS trained,
       (SELECT COUNT(DISTINCT school_id)::int FROM coaching_visits) AS visited,
       (SELECT COUNT(DISTINCT school_id)::int FROM assessment_sessions) AS assessed,
       (SELECT COUNT(DISTINCT cv.school_id)::int FROM coaching_visits cv
          WHERE cv.implementation_status IN ('partial','full','started')) AS improving,
       (SELECT COUNT(DISTINCT cv.school_id)::int FROM coaching_visits cv
          WHERE cv.implementation_status = 'not_started') AS flagged`,
  );
  const r = res.rows[0];
  if (!r) return [];
  const trained = Number(r.trained) || 0;
  if (trained === 0) return [];
  const stage = (label: string, count: number) => ({
    label, count, pct: Math.round((count / trained) * 100),
  });
  return [
    stage("Schools Trained",   trained),
    stage("Schools Visited",   Number(r.visited) || 0),
    stage("Schools Assessed",  Number(r.assessed) || 0),
    stage("Schools Improving", Number(r.improving) || 0),
    stage("Schools Flagged",   Number(r.flagged) || 0),
  ];
}
