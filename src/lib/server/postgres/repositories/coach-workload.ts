import { queryPostgres } from "@/lib/server/postgres/client";

/* ────────────────────────────────────────────────────────────────────────── */
/* Types                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export type CoachWorkloadRow = {
  userId: number;
  fullName: string;
  email: string;
  role: string | null;
  visits90d: number;
  visits30d: number;
  uniqueSchoolsVisited90d: number;
  observationsSubmitted90d: number;
  fidelityObservations90d: number;
  fidelityPct: number;
  avgObsPerVisit: number;
  daysSinceLastVisit: number | null;
  workloadStatus: "underutilised" | "balanced" | "stretched" | "overloaded" | "inactive";
};

export type CoachWorkloadSummary = {
  asOf: string;
  coaches: CoachWorkloadRow[];
  totals: {
    activeCoaches: number;
    totalVisits90d: number;
    totalObservations90d: number;
    avgVisitsPerCoach: number;
    underUtilisedCount: number;
    overloadedCount: number;
  };
};

export type CoachVisitDetail = {
  schoolId: number;
  schoolName: string;
  district: string;
  lastVisitDate: string;
  visitsLast90d: number;
  observationsLast90d: number;
  daysSinceLastVisit: number;
};

export type CoachWorkloadDetail = {
  userId: number;
  fullName: string;
  email: string;
  role: string | null;
  summary: CoachWorkloadRow;
  schools: CoachVisitDetail[];
  cycleCompletion: {
    schoolsCovered: number;
    schoolsWithObservation: number;
    schoolsWithFollowup: number;
    completionPct: number;
  };
  weeklyVisits: Array<{ weekStart: string; visits: number; observations: number }>;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function classifyWorkload(visits90d: number, daysSince: number | null): CoachWorkloadRow["workloadStatus"] {
  // Heuristics tuned for a coaching cadence of 8-12 visits per quarter.
  if (visits90d === 0) return "inactive";
  if (daysSince != null && daysSince > 60) return "underutilised";
  if (visits90d <= 3) return "underutilised";
  if (visits90d <= 12) return "balanced";
  if (visits90d <= 20) return "stretched";
  return "overloaded";
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Summary — one row per coach                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

export async function getCoachWorkloadSummaryPostgres(): Promise<CoachWorkloadSummary> {
  const res = await queryPostgres(
    `WITH coach_visits AS (
       SELECT
         pr.created_by_user_id AS user_id,
         COUNT(*) FILTER (WHERE pr.date >= NOW() - INTERVAL '90 days')::int AS visits_90d,
         COUNT(*) FILTER (WHERE pr.date >= NOW() - INTERVAL '30 days')::int AS visits_30d,
         COUNT(DISTINCT pr.school_id) FILTER (WHERE pr.date >= NOW() - INTERVAL '90 days')::int AS unique_schools_90d,
         MAX(pr.date)::text AS last_visit_date
       FROM portal_records pr
       WHERE pr.module = 'visit' AND pr.created_by_user_id IS NOT NULL
       GROUP BY pr.created_by_user_id
     ),
     coach_observations AS (
       SELECT
         tlo.observer_user_id AS user_id,
         COUNT(*) FILTER (WHERE tlo.observation_date >= NOW() - INTERVAL '90 days')::int AS obs_total_90d,
         COUNT(*) FILTER (WHERE tlo.observation_date >= NOW() - INTERVAL '90 days'
                            AND tlo.overall_post_observation_rating = 'fidelity')::int AS obs_fidelity_90d
       FROM teacher_lesson_observations tlo
       WHERE tlo.status = 'submitted' AND tlo.observer_user_id IS NOT NULL
       GROUP BY tlo.observer_user_id
     )
     SELECT
       u.id AS user_id,
       u.full_name,
       u.email,
       u.role,
       COALESCE(cv.visits_90d, 0) AS visits_90d,
       COALESCE(cv.visits_30d, 0) AS visits_30d,
       COALESCE(cv.unique_schools_90d, 0) AS unique_schools_90d,
       cv.last_visit_date,
       COALESCE(co.obs_total_90d, 0) AS obs_total_90d,
       COALESCE(co.obs_fidelity_90d, 0) AS obs_fidelity_90d
     FROM portal_users u
     LEFT JOIN coach_visits cv ON cv.user_id = u.id
     LEFT JOIN coach_observations co ON co.user_id = u.id
     WHERE (cv.visits_90d > 0 OR co.obs_total_90d > 0)
     ORDER BY COALESCE(cv.visits_90d, 0) DESC, u.full_name ASC`,
  );

  const now = Date.now();
  const coaches: CoachWorkloadRow[] = res.rows.map((r) => {
    const visits90 = Number(r.visits_90d ?? 0);
    const obs90 = Number(r.obs_total_90d ?? 0);
    const fid90 = Number(r.obs_fidelity_90d ?? 0);
    const lastVisit = r.last_visit_date ? String(r.last_visit_date) : null;
    const daysSince = lastVisit
      ? Math.floor((now - new Date(lastVisit).getTime()) / 86400000)
      : null;

    return {
      userId: Number(r.user_id),
      fullName: String(r.full_name ?? "Unknown"),
      email: String(r.email ?? ""),
      role: r.role ? String(r.role) : null,
      visits90d: visits90,
      visits30d: Number(r.visits_30d ?? 0),
      uniqueSchoolsVisited90d: Number(r.unique_schools_90d ?? 0),
      observationsSubmitted90d: obs90,
      fidelityObservations90d: fid90,
      fidelityPct: obs90 > 0 ? Math.round((fid90 / obs90) * 100) : 0,
      avgObsPerVisit: visits90 > 0 ? Math.round((obs90 / visits90) * 10) / 10 : 0,
      daysSinceLastVisit: daysSince,
      workloadStatus: classifyWorkload(visits90, daysSince),
    };
  });

  const totalVisits = coaches.reduce((a, c) => a + c.visits90d, 0);
  const totalObs = coaches.reduce((a, c) => a + c.observationsSubmitted90d, 0);

  return {
    asOf: new Date().toISOString(),
    coaches,
    totals: {
      activeCoaches: coaches.length,
      totalVisits90d: totalVisits,
      totalObservations90d: totalObs,
      avgVisitsPerCoach: coaches.length > 0 ? Math.round((totalVisits / coaches.length) * 10) / 10 : 0,
      underUtilisedCount: coaches.filter((c) => c.workloadStatus === "underutilised" || c.workloadStatus === "inactive").length,
      overloadedCount: coaches.filter((c) => c.workloadStatus === "overloaded" || c.workloadStatus === "stretched").length,
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Per-coach detail                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

export async function getCoachWorkloadDetailPostgres(userId: number): Promise<CoachWorkloadDetail | null> {
  const userRes = await queryPostgres(
    `SELECT id, full_name, email, role FROM portal_users WHERE id = $1`,
    [userId],
  );
  if (userRes.rows.length === 0) return null;
  const user = userRes.rows[0];

  // Reuse summary computation for this user
  const summary = await getCoachWorkloadSummaryPostgres();
  const coachRow = summary.coaches.find((c) => c.userId === userId) ?? {
    userId,
    fullName: String(user.full_name ?? "Unknown"),
    email: String(user.email ?? ""),
    role: user.role ? String(user.role) : null,
    visits90d: 0,
    visits30d: 0,
    uniqueSchoolsVisited90d: 0,
    observationsSubmitted90d: 0,
    fidelityObservations90d: 0,
    fidelityPct: 0,
    avgObsPerVisit: 0,
    daysSinceLastVisit: null,
    workloadStatus: "inactive" as const,
  };

  const [schoolsRes, weeklyRes, cycleRes] = await Promise.all([
    queryPostgres(
      `SELECT
         pr.school_id,
         s.name AS school_name,
         s.district,
         MAX(pr.date)::text AS last_visit_date,
         COUNT(*)::int AS visits_90d,
         (SELECT COUNT(*)::int FROM teacher_lesson_observations tlo
            WHERE tlo.school_id = pr.school_id
              AND tlo.observer_user_id = $1
              AND tlo.observation_date >= NOW() - INTERVAL '90 days') AS obs_90d
       FROM portal_records pr
       JOIN schools_directory s ON s.id = pr.school_id
       WHERE pr.module = 'visit'
         AND pr.created_by_user_id = $1
         AND pr.date >= NOW() - INTERVAL '90 days'
       GROUP BY pr.school_id, s.name, s.district
       ORDER BY MAX(pr.date) DESC`,
      [userId],
    ),
    queryPostgres(
      `WITH series AS (
         SELECT generate_series(
           date_trunc('week', NOW() - INTERVAL '12 weeks'),
           date_trunc('week', NOW()),
           '1 week'::interval
         ) AS week_start
       )
       SELECT
         to_char(s.week_start, 'YYYY-MM-DD') AS week_start,
         COALESCE((SELECT COUNT(*)::int FROM portal_records pr
            WHERE pr.module = 'visit' AND pr.created_by_user_id = $1
              AND pr.date >= s.week_start AND pr.date < s.week_start + INTERVAL '1 week'), 0) AS visits,
         COALESCE((SELECT COUNT(*)::int FROM teacher_lesson_observations tlo
            WHERE tlo.observer_user_id = $1 AND tlo.status = 'submitted'
              AND tlo.observation_date >= s.week_start::date
              AND tlo.observation_date < (s.week_start + INTERVAL '1 week')::date), 0) AS observations
       FROM series s
       ORDER BY s.week_start ASC`,
      [userId],
    ),
    queryPostgres(
      `WITH visited AS (
         SELECT DISTINCT school_id FROM portal_records
         WHERE module = 'visit' AND created_by_user_id = $1
           AND date >= NOW() - INTERVAL '180 days'
       ),
       observed AS (
         SELECT DISTINCT school_id FROM teacher_lesson_observations
         WHERE observer_user_id = $1 AND status = 'submitted'
           AND observation_date >= NOW() - INTERVAL '180 days'
       ),
       followup AS (
         SELECT v.school_id FROM visited v
         WHERE EXISTS (
           SELECT 1 FROM portal_records pr2
           WHERE pr2.school_id = v.school_id AND pr2.created_by_user_id = $1
             AND pr2.module = 'visit'
             AND pr2.date >= NOW() - INTERVAL '90 days'
         )
       )
       SELECT
         (SELECT COUNT(*)::int FROM visited) AS schools_covered,
         (SELECT COUNT(*)::int FROM observed) AS schools_with_observation,
         (SELECT COUNT(*)::int FROM followup) AS schools_with_followup`,
      [userId],
    ),
  ]);

  const now = Date.now();
  const schools: CoachVisitDetail[] = schoolsRes.rows.map((r) => {
    const lastVisit = String(r.last_visit_date ?? "");
    const daysSince = lastVisit
      ? Math.max(0, Math.floor((now - new Date(lastVisit).getTime()) / 86400000))
      : 0;
    return {
      schoolId: Number(r.school_id),
      schoolName: String(r.school_name ?? ""),
      district: String(r.district ?? ""),
      lastVisitDate: lastVisit.slice(0, 10),
      visitsLast90d: Number(r.visits_90d ?? 0),
      observationsLast90d: Number(r.obs_90d ?? 0),
      daysSinceLastVisit: daysSince,
    };
  });

  const cycle = cycleRes.rows[0] ?? {};
  const schoolsCovered = Number(cycle.schools_covered ?? 0);
  const schoolsWithObs = Number(cycle.schools_with_observation ?? 0);
  const schoolsWithFollowup = Number(cycle.schools_with_followup ?? 0);

  return {
    userId,
    fullName: String(user.full_name ?? "Unknown"),
    email: String(user.email ?? ""),
    role: user.role ? String(user.role) : null,
    summary: coachRow,
    schools,
    cycleCompletion: {
      schoolsCovered,
      schoolsWithObservation: schoolsWithObs,
      schoolsWithFollowup,
      completionPct: schoolsCovered > 0
        ? Math.round((schoolsWithObs / schoolsCovered) * 100)
        : 0,
    },
    weeklyVisits: weeklyRes.rows.map((r) => ({
      weekStart: String(r.week_start),
      visits: Number(r.visits ?? 0),
      observations: Number(r.observations ?? 0),
    })),
  };
}
