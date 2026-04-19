import { queryPostgres } from "@/lib/server/postgres/client";

// ──────────────────────────────────────────────────────────────────────────
// 1. Action Plan Follow-Up Queue
// ──────────────────────────────────────────────────────────────────────────

export type ActionPlanFollowUpRow = {
  observationId: number;
  observationCode: string;
  teacherName: string;
  schoolName: string;
  schoolId: number | null;
  observationDate: string;
  actionToTake: string;
  resourcesNeeded: string;
  reviewDate: string | null;
  daysUntilReview: number | null;
  status: "upcoming" | "due_soon" | "overdue" | "no_date";
  coachUserId: number | null;
  coachName: string | null;
  createdByUserId: number;
};

export async function listActionPlanFollowUpsPostgres(options: {
  ownerUserId?: number;
  schoolId?: number;
  includeCompleted?: boolean;
  limit?: number;
}): Promise<ActionPlanFollowUpRow[]> {
  const params: unknown[] = [];
  const filters: string[] = [`o.status = 'submitted'`];

  if (options.ownerUserId) {
    params.push(options.ownerUserId);
    filters.push(`(o.observer_user_id = $${params.length} OR o.created_by_user_id = $${params.length})`);
  }
  if (options.schoolId) {
    params.push(options.schoolId);
    filters.push(`o.school_id = $${params.length}`);
  }
  if (!options.includeCompleted) {
    filters.push(`ap.action_to_take <> ''`);
  }
  params.push(options.limit ?? 200);
  const limitIdx = params.length;

  const sql = `
    SELECT o.id AS "observationId",
           o.observation_code AS "observationCode",
           o.teacher_name AS "teacherName",
           o.school_name AS "schoolName",
           o.school_id AS "schoolId",
           o.observation_date::text AS "observationDate",
           COALESCE(ap.action_to_take, '') AS "actionToTake",
           COALESCE(ap.resources_needed, '') AS "resourcesNeeded",
           ap.review_date::text AS "reviewDate",
           CASE WHEN ap.review_date IS NULL THEN NULL
                ELSE (ap.review_date - CURRENT_DATE)::int
           END AS "daysUntilReview",
           CASE
             WHEN ap.review_date IS NULL THEN 'no_date'
             WHEN ap.review_date < CURRENT_DATE THEN 'overdue'
             WHEN ap.review_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
             ELSE 'upcoming'
           END AS status,
           o.observer_user_id AS "coachUserId",
           pu.full_name AS "coachName",
           o.created_by_user_id AS "createdByUserId"
    FROM teacher_lesson_observations o
    LEFT JOIN observation_action_plans ap ON ap.observation_id = o.id
    LEFT JOIN portal_users pu ON pu.id = o.observer_user_id
    WHERE ${filters.join(" AND ")}
    ORDER BY
      CASE
        WHEN ap.review_date IS NULL THEN 2
        WHEN ap.review_date < CURRENT_DATE THEN 0
        ELSE 1
      END,
      ap.review_date ASC NULLS LAST
    LIMIT $${limitIdx}
  `;

  try {
    const result = await queryPostgres(sql, params);
    return result.rows.map((r) => ({
      observationId: Number(r.observationId),
      observationCode: String(r.observationCode ?? ""),
      teacherName: String(r.teacherName ?? ""),
      schoolName: String(r.schoolName ?? ""),
      schoolId: r.schoolId ? Number(r.schoolId) : null,
      observationDate: String(r.observationDate ?? ""),
      actionToTake: String(r.actionToTake ?? ""),
      resourcesNeeded: String(r.resourcesNeeded ?? ""),
      reviewDate: r.reviewDate ? String(r.reviewDate) : null,
      daysUntilReview: r.daysUntilReview !== null && r.daysUntilReview !== undefined ? Number(r.daysUntilReview) : null,
      status: r.status as ActionPlanFollowUpRow["status"],
      coachUserId: r.coachUserId ? Number(r.coachUserId) : null,
      coachName: r.coachName ? String(r.coachName) : null,
      createdByUserId: Number(r.createdByUserId ?? 0),
    }));
  } catch (_e) {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Coaching Cycle Completion Rate (per school)
// ──────────────────────────────────────────────────────────────────────────

export type CoachingCycleStatusRow = {
  schoolId: number;
  schoolName: string;
  district: string;
  region: string;
  targetVisitsPerTerm: number;
  visitsThisTerm: number;
  completionPct: number;
  status: "on_track" | "behind" | "critical" | "ahead" | "no_activity";
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  nextVisitDue: string | null;
  currentCycleNumber: number | null;
  assignedCoachName: string | null;
};

export async function getCoachingCycleStatusPostgres(options: {
  schoolIds?: number[];
  targetVisitsPerTerm?: number;
  termStart?: string;
}): Promise<CoachingCycleStatusRow[]> {
  const target = options.targetVisitsPerTerm ?? 4;
  const termStart = options.termStart ?? (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 4);
    return d.toISOString().slice(0, 10);
  })();
  const params: unknown[] = [termStart, target];
  let schoolFilter = "";
  if (options.schoolIds && options.schoolIds.length > 0) {
    params.push(options.schoolIds);
    schoolFilter = `AND s.id = ANY($${params.length}::int[])`;
  }

  const sql = `
    WITH recent_visits AS (
      SELECT cv.school_id,
             COUNT(*) AS visits_count,
             MAX(cv.visit_date) AS last_visit,
             MAX(cv.coaching_cycle_number) AS current_cycle,
             (array_agg(cv.coach_user_id ORDER BY cv.visit_date DESC))[1] AS last_coach_id
      FROM coaching_visits cv
      WHERE cv.visit_date >= $1::date
      GROUP BY cv.school_id
    )
    SELECT s.id AS "schoolId",
           s.name AS "schoolName",
           s.district,
           COALESCE(s.region, '') AS region,
           $2::int AS "targetVisitsPerTerm",
           COALESCE(rv.visits_count, 0)::int AS "visitsThisTerm",
           CASE WHEN $2 > 0 THEN LEAST(100, ROUND(100.0 * COALESCE(rv.visits_count, 0) / $2))::int ELSE 0 END AS "completionPct",
           CASE
             WHEN COALESCE(rv.visits_count, 0) = 0 THEN 'no_activity'
             WHEN COALESCE(rv.visits_count, 0) >= $2 THEN 'ahead'
             WHEN COALESCE(rv.visits_count, 0) >= ($2::float * 0.75) THEN 'on_track'
             WHEN COALESCE(rv.visits_count, 0) >= ($2::float * 0.4) THEN 'behind'
             ELSE 'critical'
           END AS status,
           rv.last_visit::text AS "lastVisitDate",
           CASE WHEN rv.last_visit IS NULL THEN NULL
                ELSE (CURRENT_DATE - rv.last_visit)::int
           END AS "daysSinceLastVisit",
           CASE WHEN rv.last_visit IS NULL THEN NULL
                ELSE (rv.last_visit + INTERVAL '30 days')::text
           END AS "nextVisitDue",
           rv.current_cycle::int AS "currentCycleNumber",
           pu.full_name AS "assignedCoachName"
    FROM schools_directory s
    LEFT JOIN recent_visits rv ON rv.school_id = s.id
    LEFT JOIN portal_users pu ON pu.id = rv.last_coach_id
    WHERE s.program_status = 'active' ${schoolFilter}
    ORDER BY
      CASE status WHEN 'critical' THEN 0 WHEN 'no_activity' THEN 0 WHEN 'behind' THEN 1 WHEN 'on_track' THEN 2 ELSE 3 END,
      rv.last_visit ASC NULLS FIRST,
      s.name
  `;

  try {
    const result = await queryPostgres(sql, params);
    return result.rows.map((r) => ({
      schoolId: Number(r.schoolId),
      schoolName: String(r.schoolName ?? ""),
      district: String(r.district ?? ""),
      region: String(r.region ?? ""),
      targetVisitsPerTerm: Number(r.targetVisitsPerTerm ?? target),
      visitsThisTerm: Number(r.visitsThisTerm ?? 0),
      completionPct: Number(r.completionPct ?? 0),
      status: r.status as CoachingCycleStatusRow["status"],
      lastVisitDate: r.lastVisitDate ? String(r.lastVisitDate) : null,
      daysSinceLastVisit: r.daysSinceLastVisit !== null && r.daysSinceLastVisit !== undefined ? Number(r.daysSinceLastVisit) : null,
      nextVisitDue: r.nextVisitDue ? String(r.nextVisitDue) : null,
      currentCycleNumber: r.currentCycleNumber !== null && r.currentCycleNumber !== undefined ? Number(r.currentCycleNumber) : null,
      assignedCoachName: r.assignedCoachName ? String(r.assignedCoachName) : null,
    }));
  } catch (_e) {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Inter-Rater Reliability
//    For each school that has had 2+ observers within the last 90 days,
//    compute the variance across observers' rubric scores.
//    Flag schools where std deviation > threshold — these may need calibration.
// ──────────────────────────────────────────────────────────────────────────

export type InterRaterReliabilityRow = {
  schoolId: number;
  schoolName: string;
  district: string;
  observersCount: number;
  observationsCount: number;
  avgRubricScore: number | null;
  stdDevScore: number | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  flag: "aligned" | "moderate_variance" | "high_variance" | "insufficient_data";
  observers: Array<{ observerName: string; observationsCount: number; avgScore: number }>;
};

export async function getInterRaterReliabilityPostgres(options: {
  daysWindow?: number;
  minObservers?: number;
  minObservationsPerObserver?: number;
}): Promise<InterRaterReliabilityRow[]> {
  const days = options.daysWindow ?? 90;
  const minObservers = options.minObservers ?? 2;
  const minObsPerObserver = options.minObservationsPerObserver ?? 1;

  const sql = `
    WITH obs_avg AS (
      SELECT o.id AS observation_id,
             o.school_id,
             o.school_name,
             o.observer_name,
             AVG(si.score)::numeric AS rubric_avg
      FROM teacher_lesson_observations o
      JOIN observation_scored_items si ON si.observation_id = o.id
      WHERE o.status = 'submitted'
        AND o.observation_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
        AND si.score IS NOT NULL
      GROUP BY o.id, o.school_id, o.school_name, o.observer_name
    ),
    per_observer AS (
      SELECT school_id, school_name, observer_name,
             COUNT(*) AS obs_count,
             AVG(rubric_avg)::numeric(4,2) AS avg_score
      FROM obs_avg
      GROUP BY school_id, school_name, observer_name
      HAVING COUNT(*) >= $3::int
    ),
    school_stats AS (
      SELECT po.school_id, po.school_name,
             COUNT(DISTINCT po.observer_name) AS observers_count,
             SUM(po.obs_count) AS observations_count,
             AVG(po.avg_score)::numeric(4,2) AS avg_rubric_score,
             STDDEV_POP(po.avg_score)::numeric(4,2) AS std_dev_score,
             MIN(po.avg_score)::numeric(4,2) AS range_low,
             MAX(po.avg_score)::numeric(4,2) AS range_high
      FROM per_observer po
      GROUP BY po.school_id, po.school_name
      HAVING COUNT(DISTINCT po.observer_name) >= $2::int
    )
    SELECT ss.school_id AS "schoolId",
           ss.school_name AS "schoolName",
           COALESCE(s.district, '') AS district,
           ss.observers_count::int AS "observersCount",
           ss.observations_count::int AS "observationsCount",
           ss.avg_rubric_score AS "avgRubricScore",
           ss.std_dev_score AS "stdDevScore",
           ss.range_low AS "rangeLow",
           ss.range_high AS "rangeHigh",
           (SELECT json_agg(json_build_object(
                'observerName', po.observer_name,
                'observationsCount', po.obs_count,
                'avgScore', po.avg_score))
            FROM per_observer po
            WHERE po.school_id = ss.school_id) AS observers
    FROM school_stats ss
    LEFT JOIN schools_directory s ON s.id = ss.school_id
    ORDER BY ss.std_dev_score DESC NULLS LAST
  `;

  try {
    const result = await queryPostgres(sql, [days, minObservers, minObsPerObserver]);
    return result.rows.map((r) => {
      const stdDev = r.stdDevScore !== null && r.stdDevScore !== undefined ? Number(r.stdDevScore) : null;
      let flag: InterRaterReliabilityRow["flag"] = "aligned";
      if (stdDev === null) flag = "insufficient_data";
      else if (stdDev > 0.7) flag = "high_variance";
      else if (stdDev > 0.4) flag = "moderate_variance";
      else flag = "aligned";

      let observers: InterRaterReliabilityRow["observers"] = [];
      if (r.observers) {
        try {
          const parsed = typeof r.observers === "string" ? JSON.parse(r.observers) : r.observers;
          if (Array.isArray(parsed)) {
            observers = parsed.map((o: Record<string, unknown>) => ({
              observerName: String(o.observerName ?? ""),
              observationsCount: Number(o.observationsCount ?? 0),
              avgScore: Number(o.avgScore ?? 0),
            }));
          }
        } catch { /* ignore */ }
      }

      return {
        schoolId: Number(r.schoolId),
        schoolName: String(r.schoolName ?? ""),
        district: String(r.district ?? ""),
        observersCount: Number(r.observersCount ?? 0),
        observationsCount: Number(r.observationsCount ?? 0),
        avgRubricScore: r.avgRubricScore !== null && r.avgRubricScore !== undefined ? Number(r.avgRubricScore) : null,
        stdDevScore: stdDev,
        rangeLow: r.rangeLow !== null && r.rangeLow !== undefined ? Number(r.rangeLow) : null,
        rangeHigh: r.rangeHigh !== null && r.rangeHigh !== undefined ? Number(r.rangeHigh) : null,
        flag,
        observers,
      };
    });
  } catch (_e) {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Coach Workload Dashboard
// ──────────────────────────────────────────────────────────────────────────

export type CoachWorkloadRow = {
  coachUserId: number;
  coachName: string;
  email: string | null;
  visitsThisTerm: number;
  observationsThisTerm: number;
  schoolsCovered: number;
  districtsCovered: number;
  avgRubricScoreGiven: number | null;
  lastVisitDate: string | null;
  utilizationStatus: "underutilized" | "balanced" | "overloaded" | "inactive";
};

export async function getCoachWorkloadPostgres(options: {
  termStart?: string;
  targetPerCoach?: number;
}): Promise<CoachWorkloadRow[]> {
  const termStart = options.termStart ?? (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 4);
    return d.toISOString().slice(0, 10);
  })();
  const target = options.targetPerCoach ?? 20;

  const sql = `
    WITH visit_rollup AS (
      SELECT cv.coach_user_id,
             COUNT(*) AS visits_count,
             COUNT(DISTINCT cv.school_id) AS schools_covered,
             COUNT(DISTINCT s.district) AS districts_covered,
             MAX(cv.visit_date) AS last_visit
      FROM coaching_visits cv
      LEFT JOIN schools_directory s ON s.id = cv.school_id
      WHERE cv.visit_date >= $1::date
      GROUP BY cv.coach_user_id
    ),
    obs_rollup AS (
      SELECT o.observer_user_id,
             COUNT(*) AS obs_count,
             AVG(si.score)::numeric(4,2) AS avg_score
      FROM teacher_lesson_observations o
      JOIN observation_scored_items si ON si.observation_id = o.id
      WHERE o.observation_date >= $1::date AND o.status = 'submitted' AND si.score IS NOT NULL
      GROUP BY o.observer_user_id
    )
    SELECT pu.id AS "coachUserId",
           pu.full_name AS "coachName",
           pu.email,
           COALESCE(vr.visits_count, 0)::int AS "visitsThisTerm",
           COALESCE(obr.obs_count, 0)::int AS "observationsThisTerm",
           COALESCE(vr.schools_covered, 0)::int AS "schoolsCovered",
           COALESCE(vr.districts_covered, 0)::int AS "districtsCovered",
           obr.avg_score AS "avgRubricScoreGiven",
           vr.last_visit::text AS "lastVisitDate",
           CASE
             WHEN COALESCE(vr.visits_count, 0) = 0 THEN 'inactive'
             WHEN COALESCE(vr.visits_count, 0) > $2::int * 1.25 THEN 'overloaded'
             WHEN COALESCE(vr.visits_count, 0) < $2::int * 0.5 THEN 'underutilized'
             ELSE 'balanced'
           END AS "utilizationStatus"
    FROM portal_users pu
    LEFT JOIN visit_rollup vr ON vr.coach_user_id = pu.id
    LEFT JOIN obs_rollup obr ON obr.observer_user_id = pu.id
    WHERE (vr.visits_count > 0 OR obr.obs_count > 0
           OR pu.role ILIKE '%coach%' OR pu.role ILIKE '%observer%')
    ORDER BY "visitsThisTerm" DESC, pu.full_name ASC
  `;

  try {
    const result = await queryPostgres(sql, [termStart, target]);
    return result.rows.map((r) => ({
      coachUserId: Number(r.coachUserId),
      coachName: String(r.coachName ?? ""),
      email: r.email ? String(r.email) : null,
      visitsThisTerm: Number(r.visitsThisTerm ?? 0),
      observationsThisTerm: Number(r.observationsThisTerm ?? 0),
      schoolsCovered: Number(r.schoolsCovered ?? 0),
      districtsCovered: Number(r.districtsCovered ?? 0),
      avgRubricScoreGiven: r.avgRubricScoreGiven !== null && r.avgRubricScoreGiven !== undefined ? Number(r.avgRubricScoreGiven) : null,
      lastVisitDate: r.lastVisitDate ? String(r.lastVisitDate) : null,
      utilizationStatus: r.utilizationStatus as CoachWorkloadRow["utilizationStatus"],
    }));
  } catch (_e) {
    return [];
  }
}

export type DistrictCoverageRow = {
  district: string;
  region: string;
  schoolsTotal: number;
  schoolsVisitedThisTerm: number;
  coachesAssigned: number;
  coveragePct: number;
  coachNames: string[];
};

export async function getDistrictCoverageMapPostgres(options: {
  termStart?: string;
}): Promise<DistrictCoverageRow[]> {
  const termStart = options.termStart ?? (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 4);
    return d.toISOString().slice(0, 10);
  })();

  const sql = `
    WITH district_schools AS (
      SELECT district, region, COUNT(*) AS total_schools
      FROM schools_directory
      WHERE program_status = 'active' AND district IS NOT NULL AND district <> ''
      GROUP BY district, region
    ),
    district_visits AS (
      SELECT s.district,
             COUNT(DISTINCT cv.school_id) AS schools_visited,
             COUNT(DISTINCT cv.coach_user_id) AS coaches_assigned,
             array_agg(DISTINCT pu.full_name) FILTER (WHERE pu.full_name IS NOT NULL) AS coach_names
      FROM coaching_visits cv
      JOIN schools_directory s ON s.id = cv.school_id
      LEFT JOIN portal_users pu ON pu.id = cv.coach_user_id
      WHERE cv.visit_date >= $1::date
      GROUP BY s.district
    )
    SELECT ds.district,
           COALESCE(ds.region, '') AS region,
           ds.total_schools::int AS "schoolsTotal",
           COALESCE(dv.schools_visited, 0)::int AS "schoolsVisitedThisTerm",
           COALESCE(dv.coaches_assigned, 0)::int AS "coachesAssigned",
           CASE WHEN ds.total_schools > 0
                THEN ROUND(100.0 * COALESCE(dv.schools_visited, 0) / ds.total_schools)::int
                ELSE 0
           END AS "coveragePct",
           COALESCE(dv.coach_names, ARRAY[]::text[]) AS "coachNames"
    FROM district_schools ds
    LEFT JOIN district_visits dv ON dv.district = ds.district
    ORDER BY "coveragePct" ASC, ds.district
  `;

  try {
    const result = await queryPostgres(sql, [termStart]);
    return result.rows.map((r) => ({
      district: String(r.district ?? ""),
      region: String(r.region ?? ""),
      schoolsTotal: Number(r.schoolsTotal ?? 0),
      schoolsVisitedThisTerm: Number(r.schoolsVisitedThisTerm ?? 0),
      coachesAssigned: Number(r.coachesAssigned ?? 0),
      coveragePct: Number(r.coveragePct ?? 0),
      coachNames: Array.isArray(r.coachNames) ? r.coachNames.map((n: unknown) => String(n)) : [],
    }));
  } catch (_e) {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Teacher Observation Trajectory (for the improvement page)
// ──────────────────────────────────────────────────────────────────────────

export type TeacherObservationTrajectoryPoint = {
  observationId: number;
  observationDate: string;
  observationCode: string;
  observerName: string;
  overallRating: "fidelity" | "partial" | "low" | null;
  gpcAvg: number | null;
  blendingAvg: number | null;
  engagementAvg: number | null;
  overallAvg: number | null;
  lessonFocus: string;
  classLevel: string;
};

export type TeacherObservationTrajectory = {
  teacherName: string;
  schoolId: number | null;
  schoolName: string | null;
  totalObservations: number;
  firstObservationDate: string | null;
  latestObservationDate: string | null;
  gpcDelta: number | null;
  blendingDelta: number | null;
  engagementDelta: number | null;
  overallDelta: number | null;
  trajectoryBand: "improving" | "stable" | "declining" | "insufficient_data";
  points: TeacherObservationTrajectoryPoint[];
};

export async function getTeacherObservationTrajectoryPostgres(input: {
  teacherName: string;
  schoolId?: number;
}): Promise<TeacherObservationTrajectory> {
  const params: unknown[] = [input.teacherName];
  let schoolFilter = "";
  if (input.schoolId) {
    params.push(input.schoolId);
    schoolFilter = `AND o.school_id = $${params.length}`;
  }

  const sql = `
    WITH domain_scores AS (
      SELECT o.id,
             o.observation_date,
             o.observation_code,
             o.observer_name,
             o.overall_post_observation_rating,
             o.lesson_focus,
             o.class_level,
             o.school_id,
             o.school_name,
             AVG(si.score) FILTER (WHERE si.section_key = 'C1')::numeric(4,2) AS gpc_avg,
             AVG(si.score) FILTER (WHERE si.section_key = 'C2')::numeric(4,2) AS blending_avg,
             AVG(si.score) FILTER (WHERE si.section_key = 'D')::numeric(4,2) AS engagement_avg,
             AVG(si.score)::numeric(4,2) AS overall_avg
      FROM teacher_lesson_observations o
      LEFT JOIN observation_scored_items si ON si.observation_id = o.id
      WHERE o.teacher_name = $1 AND o.status = 'submitted' ${schoolFilter}
      GROUP BY o.id
    )
    SELECT id AS "observationId",
           observation_date::text AS "observationDate",
           observation_code AS "observationCode",
           observer_name AS "observerName",
           overall_post_observation_rating AS "overallRating",
           lesson_focus AS "lessonFocus",
           class_level AS "classLevel",
           school_id AS "schoolId",
           school_name AS "schoolName",
           gpc_avg AS "gpcAvg",
           blending_avg AS "blendingAvg",
           engagement_avg AS "engagementAvg",
           overall_avg AS "overallAvg"
    FROM domain_scores
    ORDER BY observation_date ASC
  `;

  try {
    const result = await queryPostgres(sql, params);
    const rows = result.rows;
    const points: TeacherObservationTrajectoryPoint[] = rows.map((r) => ({
      observationId: Number(r.observationId),
      observationDate: String(r.observationDate ?? ""),
      observationCode: String(r.observationCode ?? ""),
      observerName: String(r.observerName ?? ""),
      overallRating: r.overallRating as TeacherObservationTrajectoryPoint["overallRating"],
      gpcAvg: r.gpcAvg !== null && r.gpcAvg !== undefined ? Number(r.gpcAvg) : null,
      blendingAvg: r.blendingAvg !== null && r.blendingAvg !== undefined ? Number(r.blendingAvg) : null,
      engagementAvg: r.engagementAvg !== null && r.engagementAvg !== undefined ? Number(r.engagementAvg) : null,
      overallAvg: r.overallAvg !== null && r.overallAvg !== undefined ? Number(r.overallAvg) : null,
      lessonFocus: String(r.lessonFocus ?? ""),
      classLevel: String(r.classLevel ?? ""),
    }));

    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];
    const delta = (a: number | null, b: number | null): number | null =>
      a !== null && b !== null ? Number((b - a).toFixed(2)) : null;
    const gpcDelta = points.length >= 2
      ? delta(Number(firstRow?.gpcAvg ?? null), Number(lastRow?.gpcAvg ?? null)) : null;
    const blendingDelta = points.length >= 2
      ? delta(Number(firstRow?.blendingAvg ?? null), Number(lastRow?.blendingAvg ?? null)) : null;
    const engagementDelta = points.length >= 2
      ? delta(Number(firstRow?.engagementAvg ?? null), Number(lastRow?.engagementAvg ?? null)) : null;
    const overallDelta = points.length >= 2
      ? delta(Number(firstRow?.overallAvg ?? null), Number(lastRow?.overallAvg ?? null)) : null;

    let trajectoryBand: TeacherObservationTrajectory["trajectoryBand"] = "insufficient_data";
    if (points.length >= 2 && overallDelta !== null) {
      if (overallDelta >= 0.3) trajectoryBand = "improving";
      else if (overallDelta <= -0.3) trajectoryBand = "declining";
      else trajectoryBand = "stable";
    }

    return {
      teacherName: input.teacherName,
      schoolId: firstRow?.schoolId ? Number(firstRow.schoolId) : null,
      schoolName: firstRow?.schoolName ? String(firstRow.schoolName) : null,
      totalObservations: points.length,
      firstObservationDate: firstRow ? String(firstRow.observationDate ?? null) : null,
      latestObservationDate: lastRow ? String(lastRow.observationDate ?? null) : null,
      gpcDelta, blendingDelta, engagementDelta, overallDelta,
      trajectoryBand,
      points,
    };
  } catch (_e) {
    return {
      teacherName: input.teacherName, schoolId: input.schoolId ?? null, schoolName: null,
      totalObservations: 0, firstObservationDate: null, latestObservationDate: null,
      gpcDelta: null, blendingDelta: null, engagementDelta: null, overallDelta: null,
      trajectoryBand: "insufficient_data", points: [],
    };
  }
}
