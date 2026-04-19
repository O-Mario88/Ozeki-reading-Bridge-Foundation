import { queryPostgres } from "@/lib/server/postgres/client";

// ──────────────────────────────────────────────────────────────────────────
// UNIFIED WORK QUEUE
// Merges pending actions from assessments, coaching, certificates, finance,
// action plans, training follow-ups, and data-quality flags into a single
// prioritised queue for operations staff.
// ──────────────────────────────────────────────────────────────────────────

export type WorkQueueItem = {
  id: string;
  category: "assessment" | "coaching" | "certificate" | "finance" | "action_plan" | "training_follow_up" | "at_risk";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  subtitle: string;
  dueDate: string | null;
  daysOverdue: number | null;
  ownerUserId: number | null;
  ownerName: string | null;
  schoolId: number | null;
  schoolName: string | null;
  district: string | null;
  actionHref: string;
  payload: Record<string, unknown>;
};

export type WorkQueueOptions = {
  ownerUserId?: number;
  schoolIds?: number[];
  category?: WorkQueueItem["category"];
  includeResolved?: boolean;
  limit?: number;
};

export async function getWorkQueuePostgres(options: WorkQueueOptions = {}): Promise<WorkQueueItem[]> {
  const items: WorkQueueItem[] = [];
  const limit = options.limit ?? 100;

  // 1. Schools awaiting endline (baseline exists but no endline in the current cycle)
  try {
    const assessmentRes = await queryPostgres(
      `WITH latest AS (
         SELECT school_id,
                COUNT(*) FILTER (WHERE assessment_type = 'baseline') AS baseline_n,
                COUNT(*) FILTER (WHERE assessment_type = 'endline') AS endline_n,
                MAX(assessment_date) FILTER (WHERE assessment_type = 'baseline') AS last_baseline,
                MAX(assessment_date) FILTER (WHERE assessment_type = 'endline') AS last_endline
         FROM assessment_records
         WHERE assessment_date >= CURRENT_DATE - INTERVAL '365 days'
         GROUP BY school_id
       )
       SELECT l.school_id AS "schoolId", s.name AS "schoolName", s.district,
              l.baseline_n::int AS "baselineN", l.endline_n::int AS "endlineN",
              l.last_baseline::text AS "lastBaseline",
              (CURRENT_DATE - l.last_baseline)::int AS "daysSinceBaseline"
       FROM latest l
       JOIN schools_directory s ON s.id = l.school_id
       WHERE l.baseline_n > 0 AND l.endline_n = 0
         AND l.last_baseline < CURRENT_DATE - INTERVAL '90 days'
       ORDER BY l.last_baseline ASC
       LIMIT 30`,
    );
    for (const r of assessmentRes.rows) {
      const days = Number(r.daysSinceBaseline ?? 0);
      const priority = days > 150 ? "critical" : days > 120 ? "high" : "medium";
      items.push({
        id: `assessment:${r.schoolId}`,
        category: "assessment",
        priority,
        title: `${r.schoolName} — endline overdue`,
        subtitle: `Baseline taken ${days} days ago (${r.baselineN} learners). No endline yet.`,
        dueDate: null,
        daysOverdue: days - 90,
        ownerUserId: null,
        ownerName: null,
        schoolId: Number(r.schoolId),
        schoolName: String(r.schoolName),
        district: String(r.district ?? ""),
        actionHref: `/portal/schools/${r.schoolId}`,
        payload: { baselineN: r.baselineN, daysSinceBaseline: days },
      });
    }
  } catch (_e) { /* ignore */ }

  // 2. Coaching visits overdue (>90d since last)
  try {
    const coachRes = await queryPostgres(
      `WITH last_visit AS (
         SELECT school_id, MAX(visit_date) AS last_date,
                (array_agg(coach_user_id ORDER BY visit_date DESC))[1] AS last_coach_id
         FROM coaching_visits GROUP BY school_id
       )
       SELECT s.id AS "schoolId", s.name AS "schoolName", s.district,
              lv.last_date::text AS "lastDate",
              (CURRENT_DATE - COALESCE(lv.last_date, '2020-01-01'::date))::int AS "daysSince",
              lv.last_coach_id AS "coachId",
              pu.full_name AS "coachName"
       FROM schools_directory s
       LEFT JOIN last_visit lv ON lv.school_id = s.id
       LEFT JOIN portal_users pu ON pu.id = lv.last_coach_id
       WHERE s.program_status = 'active'
         AND (lv.last_date IS NULL OR lv.last_date < CURRENT_DATE - INTERVAL '60 days')
       ORDER BY lv.last_date ASC NULLS FIRST
       LIMIT 30`,
    );
    for (const r of coachRes.rows) {
      const days = Number(r.daysSince ?? 0);
      const priority = r.lastDate === null ? "critical" : days > 120 ? "critical" : days > 90 ? "high" : "medium";
      items.push({
        id: `coaching:${r.schoolId}`,
        category: "coaching",
        priority,
        title: `${r.schoolName} — coaching visit due`,
        subtitle: r.lastDate
          ? `Last visit ${days}d ago${r.coachName ? ` by ${r.coachName}` : ""}`
          : "No coaching visit on record",
        dueDate: null,
        daysOverdue: days - 60,
        ownerUserId: r.coachId ? Number(r.coachId) : null,
        ownerName: r.coachName ? String(r.coachName) : null,
        schoolId: Number(r.schoolId),
        schoolName: String(r.schoolName),
        district: String(r.district ?? ""),
        actionHref: `/portal/schools/${r.schoolId}`,
        payload: { daysSince: days, lastDate: r.lastDate },
      });
    }
  } catch (_e) { /* ignore */ }

  // 3. Certificates waiting to be issued
  try {
    const certRes = await queryPostgres(
      `SELECT COUNT(*)::int AS "pending",
              MIN(pr.date)::text AS "oldestDate"
       FROM portal_training_attendance pta
       LEFT JOIN portal_records pr ON pr.id = pta.portal_record_id
       WHERE pta.attended IS TRUE
         AND (pta.certificate_status IS NULL OR pta.certificate_status <> 'Issued')`,
    );
    const pendingCount = Number(certRes.rows[0]?.pending ?? 0);
    if (pendingCount > 0) {
      items.push({
        id: `certificate:training:all`,
        category: "certificate",
        priority: pendingCount > 50 ? "high" : "medium",
        title: `${pendingCount} training certificates awaiting issuance`,
        subtitle: `Oldest eligible training from ${certRes.rows[0]?.oldestDate ?? "—"}`,
        dueDate: null,
        daysOverdue: null,
        ownerUserId: null,
        ownerName: null,
        schoolId: null,
        schoolName: null,
        district: null,
        actionHref: `/portal/trainings`,
        payload: { pendingCount },
      });
    }

    const lessonCertRes = await queryPostgres(
      `SELECT COUNT(*)::int AS "pending"
       FROM lesson_completion
       WHERE certificate_eligible IS TRUE`,
    );
    const lessonPending = Number(lessonCertRes.rows[0]?.pending ?? 0);
    if (lessonPending > 0) {
      items.push({
        id: `certificate:lesson:all`,
        category: "certificate",
        priority: "medium",
        title: `${lessonPending} recorded-lesson certificates ready to send`,
        subtitle: "Teachers have completed quiz + watched ≥ 5min — auto-issue recommended",
        dueDate: null,
        daysOverdue: null,
        ownerUserId: null,
        ownerName: null,
        schoolId: null,
        schoolName: null,
        district: null,
        actionHref: `/portal/recorded-lessons/analytics`,
        payload: { pendingCount: lessonPending },
      });
    }
  } catch (_e) { /* ignore */ }

  // 4. Finance exceptions
  try {
    const financeRes = await queryPostgres(
      `SELECT entity_type AS "entityType", entity_id AS "entityId",
              severity, rule_code AS "ruleCode", message,
              created_at::text AS "createdAt"
       FROM finance_audit_exceptions
       WHERE status = 'open'
       ORDER BY
         CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         created_at ASC
       LIMIT 10`,
    );
    for (const r of financeRes.rows) {
      const severityStr = String(r.severity ?? "medium");
      const priority: WorkQueueItem["priority"] =
        severityStr === "critical" ? "critical" :
        severityStr === "high" ? "high" :
        severityStr === "low" ? "low" : "medium";
      items.push({
        id: `finance:${r.entityType}:${r.entityId}`,
        category: "finance",
        priority,
        title: `Finance exception: ${String(r.ruleCode)}`,
        subtitle: String(r.message ?? ""),
        dueDate: null,
        daysOverdue: null,
        ownerUserId: null,
        ownerName: null,
        schoolId: null,
        schoolName: null,
        district: null,
        actionHref: `/portal/finance/audit-center`,
        payload: { entityType: r.entityType, entityId: r.entityId },
      });
    }
  } catch (_e) { /* ignore */ }

  // 5. Action-plan reviews overdue or due soon
  try {
    const apRes = await queryPostgres(
      `SELECT o.id AS "observationId",
              o.teacher_name AS "teacherName",
              o.school_id AS "schoolId",
              o.school_name AS "schoolName",
              ap.review_date::text AS "reviewDate",
              (CURRENT_DATE - ap.review_date)::int AS "daysOverdue",
              o.observer_user_id AS "observerId",
              pu.full_name AS "observerName"
       FROM observation_action_plans ap
       JOIN teacher_lesson_observations o ON o.id = ap.observation_id
       LEFT JOIN portal_users pu ON pu.id = o.observer_user_id
       WHERE ap.review_date IS NOT NULL
         AND ap.review_date <= CURRENT_DATE + INTERVAL '7 days'
         AND o.status = 'submitted'
       ORDER BY ap.review_date ASC
       LIMIT 20`,
    );
    for (const r of apRes.rows) {
      const days = Number(r.daysOverdue ?? 0);
      const priority = days > 14 ? "critical" : days > 0 ? "high" : "medium";
      items.push({
        id: `action_plan:${r.observationId}`,
        category: "action_plan",
        priority,
        title: `Action plan review — ${r.teacherName}`,
        subtitle: days > 0
          ? `${days}d overdue · ${r.schoolName}`
          : `Due ${r.reviewDate} · ${r.schoolName}`,
        dueDate: r.reviewDate ? String(r.reviewDate) : null,
        daysOverdue: days,
        ownerUserId: r.observerId ? Number(r.observerId) : null,
        ownerName: r.observerName ? String(r.observerName) : null,
        schoolId: r.schoolId ? Number(r.schoolId) : null,
        schoolName: r.schoolName ? String(r.schoolName) : null,
        district: null,
        actionHref: `/portal/observations/${r.observationId}`,
        payload: {},
      });
    }
  } catch (_e) { /* ignore */ }

  // 6. Training follow-up actions (30/60/90d) overdue
  try {
    const tfRes = await queryPostgres(
      `SELECT ia.action_id AS "actionId", ia.training_id AS "trainingId",
              ia.due_date::text AS "dueDate", ia.status, ia.owner_user_id AS "ownerId",
              pu.full_name AS "ownerName",
              pr.school_id AS "schoolId", pr.school_name AS "schoolName",
              (CURRENT_DATE - ia.due_date::date)::int AS "daysOverdue"
       FROM intervention_actions ia
       LEFT JOIN portal_records pr ON pr.id = ia.training_id
       LEFT JOIN portal_users pu ON pu.id = ia.owner_user_id
       WHERE ia.action_type LIKE 'training_follow_up%'
         AND ia.status != 'completed'
         AND ia.due_date::date <= CURRENT_DATE + INTERVAL '7 days'
       ORDER BY ia.due_date ASC
       LIMIT 20`,
    );
    for (const r of tfRes.rows) {
      const days = Number(r.daysOverdue ?? 0);
      const priority = days > 14 ? "high" : days > 0 ? "medium" : "low";
      items.push({
        id: `training_follow_up:${r.actionId}`,
        category: "training_follow_up",
        priority,
        title: `Training follow-up at ${r.schoolName ?? "school"}`,
        subtitle: days > 0 ? `${days}d overdue` : `Due ${r.dueDate}`,
        dueDate: r.dueDate ? String(r.dueDate) : null,
        daysOverdue: days,
        ownerUserId: r.ownerId ? Number(r.ownerId) : null,
        ownerName: r.ownerName ? String(r.ownerName) : null,
        schoolId: r.schoolId ? Number(r.schoolId) : null,
        schoolName: r.schoolName ? String(r.schoolName) : null,
        district: null,
        actionHref: `/portal/trainings`,
        payload: {},
      });
    }
  } catch (_e) { /* ignore */ }

  // Apply filters
  let filtered = items;
  if (options.ownerUserId) {
    filtered = filtered.filter((i) => i.ownerUserId === options.ownerUserId);
  }
  if (options.schoolIds && options.schoolIds.length > 0) {
    const s = new Set(options.schoolIds);
    filtered = filtered.filter((i) => i.schoolId !== null && s.has(i.schoolId));
  }
  if (options.category) {
    filtered = filtered.filter((i) => i.category === options.category);
  }

  // Sort: priority first, then overdue days desc, then schoolName
  const priorityRank: Record<WorkQueueItem["priority"], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  filtered.sort((a, b) => {
    const p = priorityRank[a.priority] - priorityRank[b.priority];
    if (p !== 0) return p;
    const oA = a.daysOverdue ?? -1;
    const oB = b.daysOverdue ?? -1;
    return oB - oA;
  });

  return filtered.slice(0, limit);
}

// ──────────────────────────────────────────────────────────────────────────
// ACTIVITY FEED
// Real-time stream of what happened today/this week across the programme.
// ──────────────────────────────────────────────────────────────────────────

export type ActivityFeedEvent = {
  id: string;
  eventType: "assessment" | "training" | "observation" | "coaching_visit" | "lesson_view" | "certificate" | "donation";
  title: string;
  subtitle: string;
  schoolName: string | null;
  district: string | null;
  actorName: string | null;
  occurredAt: string;
  href: string;
};

export async function getActivityFeedPostgres(options: {
  hours?: number;
  limit?: number;
}): Promise<ActivityFeedEvent[]> {
  const hours = options.hours ?? 48;
  const limit = options.limit ?? 50;
  const events: ActivityFeedEvent[] = [];

  try {
    const assessmentRes = await queryPostgres(
      `SELECT ar.id, ar.school_id, s.name AS school_name, s.district,
              ar.assessment_type, ar.assessment_date::text AS event_date,
              ar.updated_at::text AS updated_at
       FROM assessment_records ar
       LEFT JOIN schools_directory s ON s.id = ar.school_id
       WHERE ar.updated_at >= NOW() - ($1::int * INTERVAL '1 hour')
       ORDER BY ar.updated_at DESC
       LIMIT 20`,
      [hours],
    );
    for (const r of assessmentRes.rows) {
      events.push({
        id: `assessment:${r.id}`,
        eventType: "assessment",
        title: `${r.assessment_type} assessment submitted`,
        subtitle: r.school_name ? `at ${r.school_name}` : "",
        schoolName: r.school_name ? String(r.school_name) : null,
        district: r.district ? String(r.district) : null,
        actorName: null,
        occurredAt: String(r.updated_at ?? r.event_date),
        href: r.school_id ? `/portal/schools/${r.school_id}` : "/portal/assessments",
      });
    }
  } catch { /* ignore */ }

  try {
    const obsRes = await queryPostgres(
      `SELECT o.id, o.teacher_name, o.school_name, o.school_id,
              o.observer_name, o.created_at::text AS created_at,
              o.overall_post_observation_rating AS rating
       FROM teacher_lesson_observations o
       WHERE o.created_at >= NOW() - ($1::int * INTERVAL '1 hour')
         AND o.status = 'submitted'
       ORDER BY o.created_at DESC
       LIMIT 20`,
      [hours],
    );
    for (const r of obsRes.rows) {
      events.push({
        id: `observation:${r.id}`,
        eventType: "observation",
        title: `Observation: ${r.teacher_name}${r.rating ? ` (${r.rating})` : ""}`,
        subtitle: r.school_name ? `at ${r.school_name} by ${r.observer_name}` : `by ${r.observer_name}`,
        schoolName: r.school_name ? String(r.school_name) : null,
        district: null,
        actorName: r.observer_name ? String(r.observer_name) : null,
        occurredAt: String(r.created_at),
        href: `/portal/observations/${r.id}`,
      });
    }
  } catch { /* ignore */ }

  try {
    const visitRes = await queryPostgres(
      `SELECT cv.id, cv.school_id, s.name AS school_name, s.district,
              cv.visit_date::text AS event_date, cv.created_at::text AS created_at,
              pu.full_name AS coach_name
       FROM coaching_visits cv
       LEFT JOIN schools_directory s ON s.id = cv.school_id
       LEFT JOIN portal_users pu ON pu.id = cv.coach_user_id
       WHERE cv.created_at >= NOW() - ($1::int * INTERVAL '1 hour')
       ORDER BY cv.created_at DESC
       LIMIT 20`,
      [hours],
    );
    for (const r of visitRes.rows) {
      events.push({
        id: `visit:${r.id}`,
        eventType: "coaching_visit",
        title: `Coaching visit logged`,
        subtitle: r.school_name ? `at ${r.school_name}${r.coach_name ? ` by ${r.coach_name}` : ""}` : "",
        schoolName: r.school_name ? String(r.school_name) : null,
        district: r.district ? String(r.district) : null,
        actorName: r.coach_name ? String(r.coach_name) : null,
        occurredAt: String(r.created_at),
        href: r.school_id ? `/portal/schools/${r.school_id}` : "/portal/visits",
      });
    }
  } catch { /* ignore */ }

  try {
    const trainingRes = await queryPostgres(
      `SELECT pr.id, pr.school_id, pr.school_name, pr.district,
              pr.date::text AS event_date, pr.updated_at::text AS updated_at,
              pr.training_topic AS topic,
              (SELECT COUNT(*) FROM portal_training_attendance pta
               WHERE pta.portal_record_id = pr.id AND pta.attended IS TRUE)::int AS attendee_count
       FROM portal_records pr
       WHERE pr.module = 'training'
         AND pr.updated_at >= NOW() - ($1::int * INTERVAL '1 hour')
       ORDER BY pr.updated_at DESC
       LIMIT 20`,
      [hours],
    );
    for (const r of trainingRes.rows) {
      events.push({
        id: `training:${r.id}`,
        eventType: "training",
        title: `Training session${r.topic ? `: ${r.topic}` : ""} — ${r.attendee_count} attendees`,
        subtitle: r.school_name ? `at ${r.school_name}` : "",
        schoolName: r.school_name ? String(r.school_name) : null,
        district: r.district ? String(r.district) : null,
        actorName: null,
        occurredAt: String(r.updated_at ?? r.event_date),
        href: `/portal/trainings`,
      });
    }
  } catch { /* ignore */ }

  try {
    const lessonRes = await queryPostgres(
      `SELECT lc.id, lc.recorded_lesson_id, rl.title AS lesson_title,
              lc.user_id, pu.full_name AS user_name,
              lc.completed_at::text AS event_date
       FROM lesson_completion lc
       LEFT JOIN recorded_lessons rl ON rl.id = lc.recorded_lesson_id
       LEFT JOIN portal_users pu ON pu.id = lc.user_id
       WHERE lc.certificate_eligible IS TRUE
         AND lc.completed_at >= NOW() - ($1::int * INTERVAL '1 hour')
       ORDER BY lc.completed_at DESC
       LIMIT 10`,
      [hours],
    );
    for (const r of lessonRes.rows) {
      events.push({
        id: `cert:${r.id}`,
        eventType: "certificate",
        title: `${r.user_name ?? "Teacher"} earned certificate`,
        subtitle: r.lesson_title ? `for "${r.lesson_title}"` : "",
        schoolName: null,
        district: null,
        actorName: r.user_name ? String(r.user_name) : null,
        occurredAt: String(r.event_date),
        href: `/portal/my-learning?userId=${r.user_id}`,
      });
    }
  } catch { /* ignore */ }

  try {
    const donationRes = await queryPostgres(
      `SELECT id, donor_name, amount, currency,
              paid_at::text AS paid_at,
              donation_purpose
       FROM donations
       WHERE payment_status = 'Completed'
         AND paid_at >= NOW() - ($1::int * INTERVAL '1 hour')
       ORDER BY paid_at DESC
       LIMIT 10`,
      [hours],
    );
    for (const r of donationRes.rows) {
      events.push({
        id: `donation:${r.id}`,
        eventType: "donation",
        title: `Donation received: ${r.currency ?? "UGX"} ${Number(r.amount).toLocaleString()}`,
        subtitle: r.donor_name ? `from ${r.donor_name}${r.donation_purpose ? ` · ${r.donation_purpose}` : ""}` : "",
        schoolName: null,
        district: null,
        actorName: r.donor_name ? String(r.donor_name) : null,
        occurredAt: String(r.paid_at),
        href: `/portal/finance`,
      });
    }
  } catch { /* ignore */ }

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return events.slice(0, limit);
}

// ──────────────────────────────────────────────────────────────────────────
// ROLE-BASED AGGREGATES
// ──────────────────────────────────────────────────────────────────────────

export type CoachDashboardAggregate = {
  visitsThisTerm: number;
  schoolsAssigned: number;
  observationsThisTerm: number;
  avgRubricScoreGiven: number | null;
  upcomingFollowUps: number;
  overdueFollowUps: number;
};

export async function getCoachDashboardPostgres(coachUserId: number): Promise<CoachDashboardAggregate> {
  try {
    const res = await queryPostgres(
      `WITH term_start AS (SELECT CURRENT_DATE - INTERVAL '120 days' AS start_date),
            my_visits AS (
              SELECT * FROM coaching_visits WHERE coach_user_id = $1
                AND visit_date >= (SELECT start_date FROM term_start)
            ),
            my_obs AS (
              SELECT o.*, AVG(si.score) AS rubric_avg
              FROM teacher_lesson_observations o
              LEFT JOIN observation_scored_items si ON si.observation_id = o.id
              WHERE o.observer_user_id = $1
                AND o.observation_date >= (SELECT start_date FROM term_start)
              GROUP BY o.id
            ),
            my_followups AS (
              SELECT ap.*, (ap.review_date - CURRENT_DATE)::int AS days_until
              FROM observation_action_plans ap
              JOIN teacher_lesson_observations o ON o.id = ap.observation_id
              WHERE o.observer_user_id = $1
                AND ap.review_date IS NOT NULL
                AND o.status = 'submitted'
            )
       SELECT
         (SELECT COUNT(*) FROM my_visits)::int AS visits,
         (SELECT COUNT(DISTINCT school_id) FROM my_visits)::int AS schools,
         (SELECT COUNT(*) FROM my_obs)::int AS obs,
         (SELECT AVG(rubric_avg) FROM my_obs)::numeric(4,2) AS avg_score,
         (SELECT COUNT(*) FROM my_followups WHERE days_until >= 0 AND days_until <= 14)::int AS upcoming,
         (SELECT COUNT(*) FROM my_followups WHERE days_until < 0)::int AS overdue`,
      [coachUserId],
    );
    const r = res.rows[0] ?? {};
    return {
      visitsThisTerm: Number(r.visits ?? 0),
      schoolsAssigned: Number(r.schools ?? 0),
      observationsThisTerm: Number(r.obs ?? 0),
      avgRubricScoreGiven: r.avg_score !== null && r.avg_score !== undefined ? Number(r.avg_score) : null,
      upcomingFollowUps: Number(r.upcoming ?? 0),
      overdueFollowUps: Number(r.overdue ?? 0),
    };
  } catch (_e) {
    return {
      visitsThisTerm: 0, schoolsAssigned: 0, observationsThisTerm: 0,
      avgRubricScoreGiven: null, upcomingFollowUps: 0, overdueFollowUps: 0,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// DIGEST (daily/weekly alert summary for email)
// ──────────────────────────────────────────────────────────────────────────

export type DigestPayload = {
  periodLabel: string;
  generatedAt: string;
  newAssessments: number;
  newObservations: number;
  newTrainings: number;
  newCoachingVisits: number;
  newDonations: number;
  donationTotalUgx: number;
  overdueWorkQueueItems: number;
  criticalWorkQueueItems: number;
  topActivity: ActivityFeedEvent[];
  topWorkQueue: WorkQueueItem[];
};

export async function buildDigestPayloadPostgres(periodHours: number): Promise<DigestPayload> {
  const [activity, workQueue] = await Promise.all([
    getActivityFeedPostgres({ hours: periodHours, limit: 200 }),
    getWorkQueuePostgres({ limit: 200 }),
  ]);

  let donationTotal = 0;
  try {
    const res = await queryPostgres(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total
       FROM donations
       WHERE payment_status = 'Completed'
         AND paid_at >= NOW() - ($1::int * INTERVAL '1 hour')`,
      [periodHours],
    );
    donationTotal = Number(res.rows[0]?.total ?? 0);
  } catch { /* ignore */ }

  return {
    periodLabel: periodHours >= 168 ? "Weekly" : "Daily",
    generatedAt: new Date().toISOString(),
    newAssessments: activity.filter((a) => a.eventType === "assessment").length,
    newObservations: activity.filter((a) => a.eventType === "observation").length,
    newTrainings: activity.filter((a) => a.eventType === "training").length,
    newCoachingVisits: activity.filter((a) => a.eventType === "coaching_visit").length,
    newDonations: activity.filter((a) => a.eventType === "donation").length,
    donationTotalUgx: donationTotal,
    overdueWorkQueueItems: workQueue.filter((i) => (i.daysOverdue ?? 0) > 0).length,
    criticalWorkQueueItems: workQueue.filter((i) => i.priority === "critical").length,
    topActivity: activity.slice(0, 15),
    topWorkQueue: workQueue.filter((i) => i.priority === "critical" || i.priority === "high").slice(0, 10),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// BULK OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

export async function bulkAssignCoachPostgres(input: {
  schoolIds: number[];
  coachUserId: number;
  notes?: string;
  assignedByUserId: number;
}): Promise<{ assigned: number; skipped: number }> {
  if (input.schoolIds.length === 0) return { assigned: 0, skipped: 0 };
  const now = new Date().toISOString();

  // Ensure assignment table exists (idempotent, no-op if already created elsewhere)
  try {
    await queryPostgres(
      `CREATE TABLE IF NOT EXISTS school_coach_assignments (
         id SERIAL PRIMARY KEY,
         school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
         coach_user_id INTEGER NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
         assigned_by_user_id INTEGER REFERENCES portal_users(id),
         assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         unassigned_at TIMESTAMPTZ,
         notes TEXT,
         UNIQUE (school_id, coach_user_id, unassigned_at)
       )`,
    );
  } catch { /* ignore */ }

  let assigned = 0;
  let skipped = 0;
  for (const schoolId of input.schoolIds) {
    try {
      // Mark existing active assignments as inactive
      await queryPostgres(
        `UPDATE school_coach_assignments
         SET unassigned_at = $3
         WHERE school_id = $1 AND coach_user_id <> $2 AND unassigned_at IS NULL`,
        [schoolId, input.coachUserId, now],
      ).catch(() => {});
      // Insert new active assignment
      await queryPostgres(
        `INSERT INTO school_coach_assignments (school_id, coach_user_id, assigned_by_user_id, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [schoolId, input.coachUserId, input.assignedByUserId, input.notes ?? null],
      );
      assigned++;
    } catch {
      skipped++;
    }
  }
  return { assigned, skipped };
}

export async function bulkScheduleTrainingPostgres(input: {
  schoolIds: number[];
  topic: string;
  description?: string;
  scheduledDate: string;
  scheduledStartTime?: string;
  venue?: string;
  facilitatorUserId?: number;
  createdByUserId: number;
}): Promise<{ trainingScheduleId: number; registrations: number }> {
  const sched = await queryPostgres(
    `INSERT INTO training_schedule (
       topic, description, scheduled_date, scheduled_start_time,
       venue, facilitator_user_id, status, created_by_user_id, audience
     ) VALUES ($1, $2, $3::date, $4, $5, $6, 'scheduled', $7, 'Cohort')
     RETURNING id`,
    [
      input.topic,
      input.description ?? null,
      input.scheduledDate,
      input.scheduledStartTime ?? null,
      input.venue ?? null,
      input.facilitatorUserId ?? null,
      input.createdByUserId,
    ],
  );
  const trainingScheduleId = Number(sched.rows[0]?.id ?? 0);

  let registrations = 0;
  if (trainingScheduleId && input.schoolIds.length > 0) {
    for (const schoolId of input.schoolIds) {
      try {
        const schoolRes = await queryPostgres(
          `SELECT name, district FROM schools_directory WHERE id = $1 LIMIT 1`,
          [schoolId],
        );
        const schoolName = schoolRes.rows[0]?.name ?? `School ${schoolId}`;
        await queryPostgres(
          `INSERT INTO training_schedule_registrations
             (training_schedule_id, school_id, participant_name, participant_role, email)
           VALUES ($1, $2, $3, 'School Representative', $4)
           ON CONFLICT DO NOTHING`,
          [trainingScheduleId, schoolId, `Nominee — ${schoolName}`, `school-${schoolId}@ozekiread.org`],
        );
        registrations++;
      } catch { /* ignore */ }
    }
    await queryPostgres(
      `UPDATE training_schedule SET registered_count = $1, updated_at = NOW() WHERE id = $2`,
      [registrations, trainingScheduleId],
    ).catch(() => {});
  }

  return { trainingScheduleId, registrations };
}
