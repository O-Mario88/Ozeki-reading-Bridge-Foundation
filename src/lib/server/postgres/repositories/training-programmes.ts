import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";

export type TrainingProgramme = {
  id: number;
  code: string | null;
  title: string;
  description: string | null;
  audience: string | null;
  durationWeeks: number | null;
  startDate: string | null;
  endDate: string | null;
  status: "draft" | "active" | "completed" | "archived";
  coverImageUrl: string | null;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  sessionCount?: number;
  enrolledCount?: number;
  completedCount?: number;
};

export type ProgrammeSession = {
  id: number;
  programmeId: number;
  sessionId: number;
  sortOrder: number;
  required: boolean;
  sessionTitle: string;
  sessionStatus: string;
  sessionStartTime: string;
};

export type ProgrammeEnrollment = {
  id: number;
  programmeId: number;
  teacherUserId: number | null;
  teacherName: string;
  teacherEmail: string | null;
  schoolId: number | null;
  schoolName: string | null;
  enrollmentStatus: "active" | "completed" | "dropped";
  sessionsAttended: number;
  sessionsRequired: number;
  completionPct: number;
  completedAt: string | null;
  createdAt: string;
};

function mapProgramme(row: Record<string, unknown>): TrainingProgramme {
  return {
    id: Number(row.id),
    code: row.code ? String(row.code) : null,
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    audience: row.audience ? String(row.audience) : null,
    durationWeeks: row.duration_weeks != null ? Number(row.duration_weeks) : null,
    startDate: row.start_date ? String(row.start_date).slice(0, 10) : null,
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : null,
    status: (row.status as TrainingProgramme["status"]) ?? "draft",
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : null,
    createdByUserId: row.created_by_user_id != null ? Number(row.created_by_user_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sessionCount: row.session_count != null ? Number(row.session_count) : undefined,
    enrolledCount: row.enrolled_count != null ? Number(row.enrolled_count) : undefined,
    completedCount: row.completed_count != null ? Number(row.completed_count) : undefined,
  };
}

export async function listProgrammesPostgres(): Promise<TrainingProgramme[]> {
  const res = await queryPostgres<Record<string, unknown>>(
    `SELECT p.*,
       (SELECT COUNT(*)::int FROM online_training_programme_sessions ps WHERE ps.programme_id = p.id) AS session_count,
       (SELECT COUNT(*)::int FROM online_training_programme_enrollments e WHERE e.programme_id = p.id) AS enrolled_count,
       (SELECT COUNT(*)::int FROM online_training_programme_enrollments e WHERE e.programme_id = p.id AND e.enrollment_status = 'completed') AS completed_count
     FROM online_training_programmes p
     WHERE p.status != 'archived'
     ORDER BY
       CASE p.status WHEN 'active' THEN 1 WHEN 'draft' THEN 2 WHEN 'completed' THEN 3 ELSE 4 END,
       p.start_date DESC NULLS LAST, p.created_at DESC`,
  );
  return res.rows.map(mapProgramme);
}

export async function getProgrammePostgres(id: number): Promise<TrainingProgramme | null> {
  const res = await queryPostgres<Record<string, unknown>>(
    `SELECT p.*,
       (SELECT COUNT(*)::int FROM online_training_programme_sessions ps WHERE ps.programme_id = p.id) AS session_count,
       (SELECT COUNT(*)::int FROM online_training_programme_enrollments e WHERE e.programme_id = p.id) AS enrolled_count,
       (SELECT COUNT(*)::int FROM online_training_programme_enrollments e WHERE e.programme_id = p.id AND e.enrollment_status = 'completed') AS completed_count
     FROM online_training_programmes p WHERE p.id = $1`,
    [id],
  );
  return res.rows[0] ? mapProgramme(res.rows[0]) : null;
}

export async function createProgrammePostgres(input: {
  code?: string | null;
  title: string;
  description?: string | null;
  audience?: string | null;
  durationWeeks?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: TrainingProgramme["status"];
  coverImageUrl?: string | null;
  createdByUserId: number;
}): Promise<number> {
  const res = await queryPostgres<Record<string, unknown>>(
    `INSERT INTO online_training_programmes
       (code, title, description, audience, duration_weeks, start_date, end_date, status, cover_image_url, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      input.code ?? null,
      input.title.trim(),
      input.description?.trim() ?? null,
      input.audience?.trim() ?? null,
      input.durationWeeks ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.status ?? "draft",
      input.coverImageUrl ?? null,
      input.createdByUserId,
    ],
  );
  return Number(res.rows[0].id);
}

export async function listProgrammeSessionsPostgres(programmeId: number): Promise<ProgrammeSession[]> {
  const res = await queryPostgres<Record<string, unknown>>(
    `SELECT ps.id, ps.programme_id, ps.session_id, ps.sort_order, ps.required,
            ots.title AS session_title, ots.status AS session_status, ots.start_time::text AS session_start_time
     FROM online_training_programme_sessions ps
     JOIN online_training_sessions ots ON ots.id = ps.session_id
     WHERE ps.programme_id = $1
     ORDER BY ps.sort_order ASC, ots.start_time ASC`,
    [programmeId],
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    programmeId: Number(r.programme_id),
    sessionId: Number(r.session_id),
    sortOrder: Number(r.sort_order),
    required: Boolean(r.required),
    sessionTitle: String(r.session_title),
    sessionStatus: String(r.session_status),
    sessionStartTime: String(r.session_start_time),
  }));
}

export async function addSessionToProgrammePostgres(programmeId: number, sessionId: number, sortOrder = 0, required = true): Promise<void> {
  await queryPostgres(
    `INSERT INTO online_training_programme_sessions (programme_id, session_id, sort_order, required)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (programme_id, session_id) DO UPDATE
       SET sort_order = EXCLUDED.sort_order, required = EXCLUDED.required`,
    [programmeId, sessionId, sortOrder, required],
  );
}

export async function removeSessionFromProgrammePostgres(programmeId: number, sessionId: number): Promise<void> {
  await queryPostgres(
    `DELETE FROM online_training_programme_sessions WHERE programme_id = $1 AND session_id = $2`,
    [programmeId, sessionId],
  );
}

export async function listProgrammeEnrollmentsPostgres(programmeId: number): Promise<ProgrammeEnrollment[]> {
  const res = await queryPostgres<Record<string, unknown>>(
    `SELECT e.*, s.name AS school_name
     FROM online_training_programme_enrollments e
     LEFT JOIN schools_directory s ON s.id = e.school_id
     WHERE e.programme_id = $1
     ORDER BY e.enrollment_status, e.teacher_name ASC`,
    [programmeId],
  );
  return res.rows.map((r) => {
    const attended = Number(r.sessions_attended ?? 0);
    const required = Number(r.sessions_required ?? 0);
    return {
      id: Number(r.id),
      programmeId: Number(r.programme_id),
      teacherUserId: r.teacher_user_id != null ? Number(r.teacher_user_id) : null,
      teacherName: String(r.teacher_name),
      teacherEmail: r.teacher_email ? String(r.teacher_email) : null,
      schoolId: r.school_id != null ? Number(r.school_id) : null,
      schoolName: r.school_name ? String(r.school_name) : null,
      enrollmentStatus: (r.enrollment_status as ProgrammeEnrollment["enrollmentStatus"]) ?? "active",
      sessionsAttended: attended,
      sessionsRequired: required,
      completionPct: required > 0 ? Math.round((attended / required) * 100) : 0,
      completedAt: r.completed_at ? String(r.completed_at) : null,
      createdAt: String(r.created_at),
    };
  });
}

export async function enrollTeacherInProgrammePostgres(input: {
  programmeId: number;
  teacherUserId?: number | null;
  teacherName: string;
  teacherEmail?: string | null;
  schoolId?: number | null;
}): Promise<number> {
  return withPostgresClient(async (client) => {
    // Compute sessions required = count of required programme sessions
    const reqRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM online_training_programme_sessions
        WHERE programme_id = $1 AND required = TRUE`,
      [input.programmeId],
    );
    const required = Number((reqRes.rows[0] as { n?: number }).n ?? 0);

    const insertRes = await client.query(
      `INSERT INTO online_training_programme_enrollments
         (programme_id, teacher_user_id, teacher_name, teacher_email, school_id, sessions_required)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (programme_id, teacher_user_id) DO UPDATE
         SET enrollment_status = 'active', updated_at = NOW(), sessions_required = EXCLUDED.sessions_required
       RETURNING id`,
      [
        input.programmeId,
        input.teacherUserId ?? null,
        input.teacherName.trim(),
        input.teacherEmail?.trim() ?? null,
        input.schoolId ?? null,
        required,
      ],
    );
    return Number((insertRes.rows[0] as { id: number }).id);
  });
}

/**
 * Recompute attendance counts for all enrolled teachers in a programme.
 * Call after a session completes to update completion status.
 */
export async function recomputeProgrammeProgressPostgres(programmeId: number): Promise<void> {
  await queryPostgres(
    `UPDATE online_training_programme_enrollments e
     SET sessions_attended = COALESCE(sub.attended, 0),
         enrollment_status = CASE
           WHEN COALESCE(sub.attended, 0) >= e.sessions_required AND e.sessions_required > 0 THEN 'completed'
           ELSE e.enrollment_status
         END,
         completed_at = CASE
           WHEN COALESCE(sub.attended, 0) >= e.sessions_required AND e.sessions_required > 0 AND e.completed_at IS NULL THEN NOW()
           ELSE e.completed_at
         END,
         updated_at = NOW()
     FROM (
       SELECT otp.teacher_user_id,
              COUNT(DISTINCT otp.session_id)::int AS attended
       FROM online_training_participants otp
       JOIN online_training_programme_sessions ps ON ps.session_id = otp.session_id
       WHERE ps.programme_id = $1
         AND otp.attendance_status IN ('attended', 'joined', 'left')
         AND otp.teacher_user_id IS NOT NULL
       GROUP BY otp.teacher_user_id
     ) sub
     WHERE e.programme_id = $1 AND e.teacher_user_id = sub.teacher_user_id`,
    [programmeId],
  );
}
