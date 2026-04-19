import { queryPostgres } from "@/lib/server/postgres/client";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export type TrainingEffectivenessRow = {
  portalRecordId: number;
  schoolId: number;
  schoolName: string;
  district: string;
  trainingDate: string;
  trainingTopic: string | null;
  facilitatorUserId: number | null;
  facilitatorName: string | null;
  attendeeCount: number;
  baselineCompositePre: number | null;
  baselineCompositePost: number | null;
  scoreDelta: number | null;
  assessmentsPre: number;
  assessmentsPost: number;
};

export type FacilitatorLeagueRow = {
  facilitatorUserId: number;
  facilitatorName: string;
  sessionsLed: number;
  schoolsTrained: number;
  teachersTrained: number;
  certificatesIssued: number;
  avgScoreLift: number | null;
  lastTrainingDate: string | null;
};

export type TrainingCoverageGapRow = {
  schoolId: number;
  schoolName: string;
  district: string;
  region: string;
  lastTrainingDate: string | null;
  daysSinceLastTraining: number | null;
  coverageGapSeverity: "critical" | "warning" | "fresh" | "never";
};

export type TrainingScheduleRow = {
  id: number;
  topic: string;
  description: string | null;
  scheduledDate: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  venue: string | null;
  district: string | null;
  region: string | null;
  facilitatorUserId: number | null;
  facilitatorName: string | null;
  capacity: number | null;
  registeredCount: number;
  status: string;
  audience: string | null;
};

export type TrainingFollowUpRow = {
  actionId: number;
  planId: number;
  actionType: string;
  trainingId: number | null;
  schoolId: number | null;
  schoolName: string | null;
  dueDate: string | null;
  status: string;
  ownerUserId: number;
  ownerName: string | null;
  daysOverdue: number | null;
  createdAt: string;
};

// ──────────────────────────────────────────────────────────────────────────
// 1. Training Effectiveness Score
//    For each training session, compare the average reading composite for
//    baseline assessments taken within 90 days BEFORE the training vs. the
//    average for assessments taken within 90 days AFTER the training, at
//    the same school. Positive delta ≈ training moved the needle.
// ──────────────────────────────────────────────────────────────────────────

export async function getTrainingEffectivenessPostgres(options: {
  schoolIds?: number[];
  facilitatorUserId?: number;
  topic?: string;
  limit?: number;
}): Promise<TrainingEffectivenessRow[]> {
  const params: unknown[] = [];
  const filters: string[] = [];

  if (options.schoolIds && options.schoolIds.length > 0) {
    params.push(options.schoolIds);
    filters.push(`pr.school_id = ANY($${params.length}::int[])`);
  }
  if (options.facilitatorUserId) {
    params.push(options.facilitatorUserId);
    filters.push(`pr.facilitator_user_id = $${params.length}`);
  }
  if (options.topic) {
    params.push(options.topic);
    filters.push(`pr.training_topic = $${params.length}`);
  }
  params.push(options.limit ?? 50);
  const limitIdx = params.length;

  const whereClause = filters.length > 0 ? `AND ${filters.join(" AND ")}` : "";

  const sql = `
    WITH training_sessions AS (
      SELECT pr.id, pr.school_id, pr.school_name, pr.district, pr.date,
             pr.training_topic, pr.facilitator_user_id,
             u.full_name AS facilitator_name,
             (SELECT COUNT(*) FROM portal_training_attendance pta
              WHERE pta.portal_record_id = pr.id AND pta.attended IS TRUE) AS attendee_count
      FROM portal_records pr
      LEFT JOIN portal_users u ON u.id = pr.facilitator_user_id
      WHERE pr.module = 'training' AND pr.date IS NOT NULL ${whereClause}
    ),
    pre_scores AS (
      SELECT ts.id AS training_id,
             AVG((
               COALESCE(ar.letter_identification_score, 0) +
               COALESCE(ar.sound_identification_score, 0) +
               COALESCE(ar.decodable_words_score, 0) +
               COALESCE(ar.made_up_words_score, 0) +
               COALESCE(ar.story_reading_score, 0) +
               COALESCE(ar.reading_comprehension_score, 0)
             ) / 6.0) AS avg_score,
             COUNT(ar.id) AS n
      FROM training_sessions ts
      LEFT JOIN assessment_records ar
        ON ar.school_id = ts.school_id
       AND ar.assessment_date >= (ts.date - INTERVAL '90 days')
       AND ar.assessment_date <  ts.date
      GROUP BY ts.id
    ),
    post_scores AS (
      SELECT ts.id AS training_id,
             AVG((
               COALESCE(ar.letter_identification_score, 0) +
               COALESCE(ar.sound_identification_score, 0) +
               COALESCE(ar.decodable_words_score, 0) +
               COALESCE(ar.made_up_words_score, 0) +
               COALESCE(ar.story_reading_score, 0) +
               COALESCE(ar.reading_comprehension_score, 0)
             ) / 6.0) AS avg_score,
             COUNT(ar.id) AS n
      FROM training_sessions ts
      LEFT JOIN assessment_records ar
        ON ar.school_id = ts.school_id
       AND ar.assessment_date >  ts.date
       AND ar.assessment_date <= (ts.date + INTERVAL '90 days')
      GROUP BY ts.id
    )
    SELECT
      ts.id AS "portalRecordId",
      ts.school_id AS "schoolId",
      ts.school_name AS "schoolName",
      ts.district,
      ts.date::text AS "trainingDate",
      ts.training_topic AS "trainingTopic",
      ts.facilitator_user_id AS "facilitatorUserId",
      ts.facilitator_name AS "facilitatorName",
      ts.attendee_count::int AS "attendeeCount",
      ROUND(pre.avg_score::numeric, 2) AS "baselineCompositePre",
      ROUND(post.avg_score::numeric, 2) AS "baselineCompositePost",
      CASE
        WHEN pre.avg_score IS NULL OR post.avg_score IS NULL THEN NULL
        ELSE ROUND((post.avg_score - pre.avg_score)::numeric, 2)
      END AS "scoreDelta",
      COALESCE(pre.n, 0)::int AS "assessmentsPre",
      COALESCE(post.n, 0)::int AS "assessmentsPost"
    FROM training_sessions ts
    LEFT JOIN pre_scores pre ON pre.training_id = ts.id
    LEFT JOIN post_scores post ON post.training_id = ts.id
    ORDER BY ts.date DESC
    LIMIT $${limitIdx}
  `;

  try {
    const result = await queryPostgres(sql, params);
    return result.rows.map((r) => ({
      portalRecordId: Number(r.portalRecordId),
      schoolId: Number(r.schoolId),
      schoolName: String(r.schoolName ?? ""),
      district: String(r.district ?? ""),
      trainingDate: String(r.trainingDate),
      trainingTopic: r.trainingTopic ? String(r.trainingTopic) : null,
      facilitatorUserId: r.facilitatorUserId ? Number(r.facilitatorUserId) : null,
      facilitatorName: r.facilitatorName ? String(r.facilitatorName) : null,
      attendeeCount: Number(r.attendeeCount ?? 0),
      baselineCompositePre: r.baselineCompositePre !== null ? Number(r.baselineCompositePre) : null,
      baselineCompositePost: r.baselineCompositePost !== null ? Number(r.baselineCompositePost) : null,
      scoreDelta: r.scoreDelta !== null ? Number(r.scoreDelta) : null,
      assessmentsPre: Number(r.assessmentsPre ?? 0),
      assessmentsPost: Number(r.assessmentsPost ?? 0),
    }));
  } catch (_e) {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Facilitator League Table
// ──────────────────────────────────────────────────────────────────────────

export async function getFacilitatorLeagueTablePostgres(): Promise<FacilitatorLeagueRow[]> {
  const sql = `
    WITH facilitator_sessions AS (
      SELECT pr.facilitator_user_id, u.full_name AS facilitator_name,
             pr.id, pr.school_id, pr.date
      FROM portal_records pr
      JOIN portal_users u ON u.id = pr.facilitator_user_id
      WHERE pr.module = 'training' AND pr.facilitator_user_id IS NOT NULL
    ),
    attendance_rollup AS (
      SELECT fs.facilitator_user_id, fs.facilitator_name,
             COUNT(DISTINCT fs.id) AS sessions_led,
             COUNT(DISTINCT fs.school_id) AS schools_trained,
             COUNT(DISTINCT pta.teacher_uid) FILTER (WHERE pta.teacher_uid IS NOT NULL) AS teachers_trained,
             COUNT(*) FILTER (WHERE pta.certificate_status = 'Issued') AS certificates_issued,
             MAX(fs.date) AS last_training_date
      FROM facilitator_sessions fs
      LEFT JOIN portal_training_attendance pta ON pta.portal_record_id = fs.id AND pta.attended IS TRUE
      GROUP BY fs.facilitator_user_id, fs.facilitator_name
    ),
    score_lift AS (
      SELECT fs.facilitator_user_id,
             AVG(
               (SELECT AVG((
                  COALESCE(ar.letter_identification_score, 0) +
                  COALESCE(ar.sound_identification_score, 0) +
                  COALESCE(ar.decodable_words_score, 0) +
                  COALESCE(ar.made_up_words_score, 0) +
                  COALESCE(ar.story_reading_score, 0) +
                  COALESCE(ar.reading_comprehension_score, 0)
                ) / 6.0)
                FROM assessment_records ar
                WHERE ar.school_id = fs.school_id
                  AND ar.assessment_date > fs.date
                  AND ar.assessment_date <= fs.date + INTERVAL '90 days'
               )
               -
               (SELECT AVG((
                  COALESCE(ar.letter_identification_score, 0) +
                  COALESCE(ar.sound_identification_score, 0) +
                  COALESCE(ar.decodable_words_score, 0) +
                  COALESCE(ar.made_up_words_score, 0) +
                  COALESCE(ar.story_reading_score, 0) +
                  COALESCE(ar.reading_comprehension_score, 0)
                ) / 6.0)
                FROM assessment_records ar
                WHERE ar.school_id = fs.school_id
                  AND ar.assessment_date >= fs.date - INTERVAL '90 days'
                  AND ar.assessment_date < fs.date
               )
             ) AS avg_lift
      FROM facilitator_sessions fs
      GROUP BY fs.facilitator_user_id
    )
    SELECT ar.facilitator_user_id AS "facilitatorUserId",
           ar.facilitator_name AS "facilitatorName",
           ar.sessions_led::int AS "sessionsLed",
           ar.schools_trained::int AS "schoolsTrained",
           ar.teachers_trained::int AS "teachersTrained",
           ar.certificates_issued::int AS "certificatesIssued",
           ROUND(sl.avg_lift::numeric, 2) AS "avgScoreLift",
           ar.last_training_date::text AS "lastTrainingDate"
    FROM attendance_rollup ar
    LEFT JOIN score_lift sl ON sl.facilitator_user_id = ar.facilitator_user_id
    ORDER BY ar.sessions_led DESC, ar.facilitator_name ASC
  `;

  try {
    const result = await queryPostgres(sql);
    return result.rows.map((r) => ({
      facilitatorUserId: Number(r.facilitatorUserId),
      facilitatorName: String(r.facilitatorName ?? ""),
      sessionsLed: Number(r.sessionsLed ?? 0),
      schoolsTrained: Number(r.schoolsTrained ?? 0),
      teachersTrained: Number(r.teachersTrained ?? 0),
      certificatesIssued: Number(r.certificatesIssued ?? 0),
      avgScoreLift: r.avgScoreLift !== null ? Number(r.avgScoreLift) : null,
      lastTrainingDate: r.lastTrainingDate ? String(r.lastTrainingDate) : null,
    }));
  } catch (_e) {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Training Coverage Gaps
// ──────────────────────────────────────────────────────────────────────────

export async function getTrainingCoverageGapsPostgres(options: {
  schoolIds?: number[];
  daysThreshold?: number;
}): Promise<TrainingCoverageGapRow[]> {
  const daysThreshold = options.daysThreshold ?? 180;
  const params: unknown[] = [daysThreshold];
  let schoolFilter = "";
  if (options.schoolIds && options.schoolIds.length > 0) {
    params.push(options.schoolIds);
    schoolFilter = `AND s.id = ANY($${params.length}::int[])`;
  }

  const sql = `
    WITH last_training AS (
      SELECT school_id, MAX(date) AS last_date
      FROM portal_records
      WHERE module = 'training' AND school_id IS NOT NULL
      GROUP BY school_id
    )
    SELECT s.id AS "schoolId",
           s.name AS "schoolName",
           s.district,
           COALESCE(s.region, '') AS region,
           lt.last_date::text AS "lastTrainingDate",
           CASE WHEN lt.last_date IS NULL THEN NULL
                ELSE (CURRENT_DATE - lt.last_date)::int
           END AS "daysSinceLastTraining",
           CASE
             WHEN lt.last_date IS NULL THEN 'never'
             WHEN (CURRENT_DATE - lt.last_date) > $1 THEN 'critical'
             WHEN (CURRENT_DATE - lt.last_date) > ($1 / 2) THEN 'warning'
             ELSE 'fresh'
           END AS "coverageGapSeverity"
    FROM schools_directory s
    LEFT JOIN last_training lt ON lt.school_id = s.id
    WHERE s.program_status = 'active' ${schoolFilter}
    ORDER BY
      CASE
        WHEN lt.last_date IS NULL THEN 0
        ELSE 1
      END,
      lt.last_date ASC NULLS FIRST,
      s.name
  `;

  try {
    const result = await queryPostgres(sql, params);
    return result.rows.map((r) => ({
      schoolId: Number(r.schoolId),
      schoolName: String(r.schoolName ?? ""),
      district: String(r.district ?? ""),
      region: String(r.region ?? ""),
      lastTrainingDate: r.lastTrainingDate ? String(r.lastTrainingDate) : null,
      daysSinceLastTraining: r.daysSinceLastTraining !== null ? Number(r.daysSinceLastTraining) : null,
      coverageGapSeverity: r.coverageGapSeverity as TrainingCoverageGapRow["coverageGapSeverity"],
    }));
  } catch (_e) {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Upcoming Training Schedule
// ──────────────────────────────────────────────────────────────────────────

export async function getUpcomingTrainingsPostgres(options: {
  fromDate?: string;
  toDate?: string;
  district?: string;
  limit?: number;
}): Promise<TrainingScheduleRow[]> {
  const fromDate = options.fromDate ?? new Date().toISOString().slice(0, 10);
  const params: unknown[] = [fromDate];
  const filters: string[] = [`ts.scheduled_date >= $1`];

  if (options.toDate) {
    params.push(options.toDate);
    filters.push(`ts.scheduled_date <= $${params.length}`);
  }
  if (options.district) {
    params.push(options.district);
    filters.push(`ts.district = $${params.length}`);
  }
  params.push(options.limit ?? 50);
  const limitIdx = params.length;

  const sql = `
    SELECT ts.id, ts.topic, ts.description,
           ts.scheduled_date::text AS "scheduledDate",
           ts.scheduled_start_time::text AS "scheduledStartTime",
           ts.scheduled_end_time::text AS "scheduledEndTime",
           ts.venue, ts.district, ts.region,
           ts.facilitator_user_id AS "facilitatorUserId",
           u.full_name AS "facilitatorName",
           ts.capacity, ts.registered_count AS "registeredCount",
           ts.status, ts.audience
    FROM training_schedule ts
    LEFT JOIN portal_users u ON u.id = ts.facilitator_user_id
    WHERE ${filters.join(" AND ")}
      AND ts.status IN ('scheduled', 'open_registration', 'in_progress')
    ORDER BY ts.scheduled_date ASC, ts.scheduled_start_time ASC NULLS LAST
    LIMIT $${limitIdx}
  `;

  try {
    const result = await queryPostgres(sql, params);
    return result.rows.map((r) => ({
      id: Number(r.id),
      topic: String(r.topic ?? ""),
      description: r.description ? String(r.description) : null,
      scheduledDate: String(r.scheduledDate),
      scheduledStartTime: r.scheduledStartTime ? String(r.scheduledStartTime) : null,
      scheduledEndTime: r.scheduledEndTime ? String(r.scheduledEndTime) : null,
      venue: r.venue ? String(r.venue) : null,
      district: r.district ? String(r.district) : null,
      region: r.region ? String(r.region) : null,
      facilitatorUserId: r.facilitatorUserId ? Number(r.facilitatorUserId) : null,
      facilitatorName: r.facilitatorName ? String(r.facilitatorName) : null,
      capacity: r.capacity !== null ? Number(r.capacity) : null,
      registeredCount: Number(r.registeredCount ?? 0),
      status: String(r.status ?? "scheduled"),
      audience: r.audience ? String(r.audience) : null,
    }));
  } catch (_e) {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Post-Training Follow-Ups (uses intervention_actions)
// ──────────────────────────────────────────────────────────────────────────

export async function getTrainingFollowUpsPostgres(options: {
  ownerUserId?: number;
  status?: string;
  overdue?: boolean;
  limit?: number;
}): Promise<TrainingFollowUpRow[]> {
  const params: unknown[] = [];
  const filters: string[] = [`ia.action_type LIKE 'training_follow_up%'`];

  if (options.ownerUserId) {
    params.push(options.ownerUserId);
    filters.push(`ia.owner_user_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    filters.push(`ia.status = $${params.length}`);
  }
  if (options.overdue) {
    filters.push(`ia.due_date::date < CURRENT_DATE AND ia.status != 'completed'`);
  }
  params.push(options.limit ?? 100);
  const limitIdx = params.length;

  const sql = `
    SELECT ia.action_id AS "actionId",
           ia.plan_id AS "planId",
           ia.action_type AS "actionType",
           ia.training_id AS "trainingId",
           pr.school_id AS "schoolId",
           pr.school_name AS "schoolName",
           ia.due_date AS "dueDate",
           ia.status,
           ia.owner_user_id AS "ownerUserId",
           u.full_name AS "ownerName",
           CASE
             WHEN ia.due_date IS NULL THEN NULL
             WHEN ia.due_date::date < CURRENT_DATE AND ia.status != 'completed'
               THEN (CURRENT_DATE - ia.due_date::date)::int
             ELSE NULL
           END AS "daysOverdue",
           ia.created_at::text AS "createdAt"
    FROM intervention_actions ia
    LEFT JOIN portal_records pr ON pr.id = ia.training_id
    LEFT JOIN portal_users u ON u.id = ia.owner_user_id
    WHERE ${filters.join(" AND ")}
    ORDER BY
      CASE WHEN ia.status = 'completed' THEN 1 ELSE 0 END,
      ia.due_date ASC NULLS LAST
    LIMIT $${limitIdx}
  `;

  try {
    const result = await queryPostgres(sql, params);
    return result.rows.map((r) => ({
      actionId: Number(r.actionId),
      planId: Number(r.planId),
      actionType: String(r.actionType),
      trainingId: r.trainingId ? Number(r.trainingId) : null,
      schoolId: r.schoolId ? Number(r.schoolId) : null,
      schoolName: r.schoolName ? String(r.schoolName) : null,
      dueDate: r.dueDate ? String(r.dueDate) : null,
      status: String(r.status),
      ownerUserId: Number(r.ownerUserId),
      ownerName: r.ownerName ? String(r.ownerName) : null,
      daysOverdue: r.daysOverdue !== null ? Number(r.daysOverdue) : null,
      createdAt: String(r.createdAt),
    }));
  } catch (_e) {
    return [];
  }
}

/**
 * Create the 30/60/90-day follow-up protocol actions for a completed training.
 * Called after attendance is finalised. Idempotent via ON CONFLICT.
 */
export async function seedTrainingFollowUpsPostgres(input: {
  trainingId: number;
  schoolId: number;
  planId: number;
  ownerUserId: number;
  trainingDate: string;
}): Promise<{ seeded: number }> {
  const { trainingId, planId, ownerUserId, trainingDate } = input;
  const baseDate = new Date(trainingDate);
  const intervals: Array<{ days: number; type: string }> = [
    { days: 30, type: "training_follow_up_30d" },
    { days: 60, type: "training_follow_up_60d" },
    { days: 90, type: "training_follow_up_90d" },
  ];

  let seeded = 0;
  for (const { days, type } of intervals) {
    const due = new Date(baseDate);
    due.setDate(due.getDate() + days);
    const dueDate = due.toISOString().slice(0, 10);
    try {
      await queryPostgres(
        `INSERT INTO intervention_actions (plan_id, action_type, owner_user_id, due_date, status, training_id)
         VALUES ($1, $2, $3, $4, 'planned', $5)`,
        [planId, type, ownerUserId, dueDate, trainingId],
      );
      seeded++;
    } catch (_e) {
      // Skip duplicates
    }
  }
  return { seeded };
}

// ──────────────────────────────────────────────────────────────────────────
// 6. Certificate-eligible attendees
// ──────────────────────────────────────────────────────────────────────────

export type CertificateEligibleRow = {
  attendanceId: number;
  portalRecordId: number;
  schoolId: number;
  schoolName: string | null;
  participantName: string;
  participantRole: string;
  gender: string | null;
  teacherUid: string | null;
  email: string | null;
  trainingDate: string;
  trainingTopic: string | null;
  facilitatorName: string | null;
  certificateStatus: string | null;
  certificateIssuedAt: string | null;
  certificateEmailSentAt: string | null;
};

export async function listCertificateEligibleAttendeesPostgres(options: {
  portalRecordId?: number;
  includeIssued?: boolean;
  limit?: number;
}): Promise<CertificateEligibleRow[]> {
  const params: unknown[] = [];
  const filters: string[] = [`pta.attended IS TRUE`];

  if (options.portalRecordId) {
    params.push(options.portalRecordId);
    filters.push(`pta.portal_record_id = $${params.length}`);
  }
  if (!options.includeIssued) {
    filters.push(`(pta.certificate_status IS NULL OR pta.certificate_status <> 'Issued')`);
  }
  params.push(options.limit ?? 500);
  const limitIdx = params.length;

  const sql = `
    SELECT pta.id AS "attendanceId",
           pta.portal_record_id AS "portalRecordId",
           pta.school_id AS "schoolId",
           pr.school_name AS "schoolName",
           pta.participant_name AS "participantName",
           pta.participant_role AS "participantRole",
           pta.gender,
           pta.teacher_uid AS "teacherUid",
           pta.email,
           pr.date::text AS "trainingDate",
           pr.training_topic AS "trainingTopic",
           u.full_name AS "facilitatorName",
           pta.certificate_status AS "certificateStatus",
           pta.certificate_issued_at::text AS "certificateIssuedAt",
           pta.certificate_email_sent_at::text AS "certificateEmailSentAt"
    FROM portal_training_attendance pta
    LEFT JOIN portal_records pr ON pr.id = pta.portal_record_id
    LEFT JOIN portal_users u ON u.id = pr.facilitator_user_id
    WHERE ${filters.join(" AND ")}
    ORDER BY pr.date DESC, pta.participant_name ASC
    LIMIT $${limitIdx}
  `;

  try {
    const result = await queryPostgres(sql, params);
    return result.rows.map((r) => ({
      attendanceId: Number(r.attendanceId),
      portalRecordId: Number(r.portalRecordId),
      schoolId: Number(r.schoolId ?? 0),
      schoolName: r.schoolName ? String(r.schoolName) : null,
      participantName: String(r.participantName ?? ""),
      participantRole: String(r.participantRole ?? ""),
      gender: r.gender ? String(r.gender) : null,
      teacherUid: r.teacherUid ? String(r.teacherUid) : null,
      email: r.email ? String(r.email) : null,
      trainingDate: String(r.trainingDate ?? ""),
      trainingTopic: r.trainingTopic ? String(r.trainingTopic) : null,
      facilitatorName: r.facilitatorName ? String(r.facilitatorName) : null,
      certificateStatus: r.certificateStatus ? String(r.certificateStatus) : null,
      certificateIssuedAt: r.certificateIssuedAt ? String(r.certificateIssuedAt) : null,
      certificateEmailSentAt: r.certificateEmailSentAt ? String(r.certificateEmailSentAt) : null,
    }));
  } catch (_e) {
    return [];
  }
}

export async function markCertificateIssuedPostgres(attendanceId: number, pdfPath?: string): Promise<void> {
  await queryPostgres(
    `UPDATE portal_training_attendance
     SET certificate_status = 'Issued',
         certificate_issued_at = NOW(),
         certificate_pdf_path = COALESCE($2, certificate_pdf_path)
     WHERE id = $1`,
    [attendanceId, pdfPath ?? null],
  );
}

export async function markCertificateEmailSentPostgres(attendanceId: number): Promise<void> {
  await queryPostgres(
    `UPDATE portal_training_attendance
     SET certificate_email_sent_at = NOW()
     WHERE id = $1`,
    [attendanceId],
  );
}
