import { getDb, logAuditEvent } from "./db";
import { isPostgresConfigured, queryPostgres } from "@/lib/server/postgres/client";
import {
  createOnlineTrainingSessionPostgres,
  getOnlineTrainingArtifactPostgres,
  getOnlineTrainingSessionPostgres,
  listOnlineTrainingArtifactsPostgres,
  listOnlineTrainingResourcesPostgres,
  listOnlineTrainingSessionsPostgres,
  upsertOnlineTrainingArtifactPostgres,
  upsertOnlineTrainingNotesPostgres,
  updateOnlineTrainingSessionGoogleLinksPostgres,
  updateOnlineTrainingSessionOutcomesPostgres,
} from "@/lib/server/postgres/repositories/training";
import type {
  OnlineTrainingEventRecord,
  OnlineTrainingSessionRecord,
  TrainingArtifactRecord,
  TrainingArtifactSource,
  TrainingArtifactType,
  TrainingResourceVisibility,
  TrainingSessionStatus,
} from "./types";

export type OnlineTrainingResourceRecord = {
  id: number;
  sessionId: number;
  title: string;
  fileName: string | null;
  storedPath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  externalUrl: string | null;
  fileUrl: string | null;
  visibility: TrainingResourceVisibility;
  sortOrder: number;
  uploadedByUserId: number | null;
  createdAt: string;
};

export type OnlineTrainingNotesRecord = {
  id: number;
  sessionId: number;
  factsJson: string;
  narrativeHtml: string;
  pdfStoredPath: string | null;
  aiModel: string | null;
  guardrailVersion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTrainingSessionInput = {
  title: string;
  agenda: string;
  objectives?: string;
  description?: string;
  audience?: string;
  programTags?: string[];
  attendeeEmails?: string[];
  scopeType?: string;
  scopeId?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  hostUserId: number;
  attendeeCount?: number;
  onlineTeachersTrained?: number;
  onlineSchoolLeadersTrained?: number;
  calendarEventId?: string | null;
  calendarLink?: string | null;
  meetJoinUrl?: string | null;
  conferenceRecordId?: string | null;
  recordingUrl?: string | null;
  chatSummary?: string | null;
  attendanceCapturedAt?: string | null;
  createdByUserId: number;
  status: TrainingSessionStatus;
  visibility?: string;
};

function normalizeEmailList(emails?: string[] | null) {
  return (emails ?? [])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .filter((email, index, list) => list.indexOf(email) === index);
}

function getDurationMinutes(startTime: string, endTime: string) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return Math.round((end - start) / 60000);
}

function parseAudience(session: OnlineTrainingSessionRecord) {
  return session.audience?.trim() || "Teachers and school leaders";
}

function ensureLegacyOnlineTrainingEventMirrorSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS online_training_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      audience TEXT NOT NULL,
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      attendee_emails TEXT,
      attendee_count INTEGER NOT NULL DEFAULT 0,
      online_teachers_trained INTEGER NOT NULL DEFAULT 0,
      online_school_leaders_trained INTEGER NOT NULL DEFAULT 0,
      calendar_event_id TEXT,
      calendar_link TEXT,
      meet_link TEXT,
      recording_url TEXT,
      chat_summary TEXT,
      attendance_captured_at TEXT,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function mapTrainingSessionToEventRecord(
  session: OnlineTrainingSessionRecord,
): OnlineTrainingEventRecord {
  return {
    id: session.id,
    title: session.title,
    description: session.description ?? session.objectives ?? session.agenda ?? null,
    audience: parseAudience(session),
    startDateTime: session.startTime,
    endDateTime: session.endTime,
    durationMinutes: getDurationMinutes(session.startTime, session.endTime),
    attendeeCount: Number(session.attendeeCount ?? 0),
    onlineTeachersTrained: Number(session.onlineTeachersTrained ?? 0),
    onlineSchoolLeadersTrained: Number(session.onlineSchoolLeadersTrained ?? 0),
    calendarEventId: session.calendarEventId,
    calendarLink: session.calendarLink,
    meetLink: session.meetJoinUrl,
    recordingUrl: session.recordingUrl,
    chatSummary: session.chatSummary,
    attendanceCapturedAt: session.attendanceCapturedAt,
    createdAt: session.createdAt,
  };
}

async function mirrorLegacyOnlineTrainingEvent(sessionId: number) {
  if (isPostgresConfigured()) {
    return;
  }

  ensureLegacyOnlineTrainingEventMirrorSchema();
  const session = await getTrainingSession(sessionId);
  if (!session) {
    return;
  }

  const event = mapTrainingSessionToEventRecord(session);
  getDb()
    .prepare(
      `
      INSERT INTO online_training_events (
        id,
        title,
        description,
        audience,
        start_datetime,
        end_datetime,
        duration_minutes,
        attendee_emails,
        attendee_count,
        online_teachers_trained,
        online_school_leaders_trained,
        calendar_event_id,
        calendar_link,
        meet_link,
        recording_url,
        chat_summary,
        attendance_captured_at,
        created_by_user_id,
        created_at
      ) VALUES (
        @id,
        @title,
        @description,
        @audience,
        @startDateTime,
        @endDateTime,
        @durationMinutes,
        @attendeeEmails,
        @attendeeCount,
        @onlineTeachersTrained,
        @onlineSchoolLeadersTrained,
        @calendarEventId,
        @calendarLink,
        @meetLink,
        @recordingUrl,
        @chatSummary,
        @attendanceCapturedAt,
        @createdByUserId,
        @createdAt
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        audience = excluded.audience,
        start_datetime = excluded.start_datetime,
        end_datetime = excluded.end_datetime,
        duration_minutes = excluded.duration_minutes,
        attendee_emails = excluded.attendee_emails,
        attendee_count = excluded.attendee_count,
        online_teachers_trained = excluded.online_teachers_trained,
        online_school_leaders_trained = excluded.online_school_leaders_trained,
        calendar_event_id = excluded.calendar_event_id,
        calendar_link = excluded.calendar_link,
        meet_link = excluded.meet_link,
        recording_url = excluded.recording_url,
        chat_summary = excluded.chat_summary,
        attendance_captured_at = excluded.attendance_captured_at,
        created_by_user_id = excluded.created_by_user_id,
        created_at = excluded.created_at
    `,
    )
    .run({
      ...event,
      attendeeEmails: session.attendeeEmails,
      createdByUserId: session.createdByUserId,
    });
}

function ensureSqliteColumn(table: string, column: string, definition: string) {
  const db = getDb();
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.some((item) => item.name === column)) {
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function mapSqliteSessionRow(row: Record<string, unknown>): OnlineTrainingSessionRecord {
  return {
    id: Number(row.id ?? 0),
    title: String(row.title ?? ""),
    agenda: String(row.agenda ?? ""),
    objectives: row.objectives ? String(row.objectives) : null,
    description: row.description ? String(row.description) : null,
    audience: row.audience ? String(row.audience) : null,
    programTags: String(row.program_tags_json ?? "[]"),
    attendeeEmails: String(row.attendee_emails_json ?? "[]"),
    scopeType: String(row.scope_type ?? "country") as OnlineTrainingSessionRecord["scopeType"],
    scopeId: row.scope_id ? String(row.scope_id) : null,
    startTime: String(row.start_time ?? ""),
    endTime: String(row.end_time ?? ""),
    timezone: String(row.timezone ?? "Africa/Kampala"),
    hostUserId: Number(row.host_user_id ?? 0),
    attendeeCount: Number(row.attendee_count ?? 0),
    onlineTeachersTrained: Number(row.online_teachers_trained ?? 0),
    onlineSchoolLeadersTrained: Number(row.online_school_leaders_trained ?? 0),
    calendarEventId: row.calendar_event_id ? String(row.calendar_event_id) : null,
    calendarLink: row.calendar_link ? String(row.calendar_link) : null,
    meetJoinUrl: row.meet_join_url ? String(row.meet_join_url) : null,
    conferenceRecordId: row.conference_record_id ? String(row.conference_record_id) : null,
    recordingUrl: row.recording_url ? String(row.recording_url) : null,
    chatSummary: row.chat_summary ? String(row.chat_summary) : null,
    attendanceCapturedAt: row.attendance_captured_at ? String(row.attendance_captured_at) : null,
    status: String(row.status ?? "draft") as TrainingSessionStatus,
    visibility: String(row.visibility ?? "private"),
    createdByUserId: Number(row.created_by_user_id ?? 0),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    schoolName: "",
    district: "",
    subCounty: "",
    parish: "",
    region: "",
    participants: [],
    resources: [],
    artifacts: [],
  };
}

function mapSqliteResourceRow(row: Record<string, unknown>): OnlineTrainingResourceRecord {
  const storedPath = row.stored_path ? String(row.stored_path) : null;
  const externalUrl = row.external_url ? String(row.external_url) : null;
  return {
    id: Number(row.id ?? 0),
    sessionId: Number(row.session_id ?? 0),
    title: String(row.title ?? ""),
    fileName: row.file_name ? String(row.file_name) : null,
    storedPath,
    mimeType: row.mime_type ? String(row.mime_type) : null,
    sizeBytes: row.size_bytes === null || row.size_bytes === undefined ? null : Number(row.size_bytes),
    externalUrl,
    fileUrl: externalUrl ?? storedPath,
    visibility: String(row.visibility ?? "internal") as TrainingResourceVisibility,
    sortOrder: Number(row.sort_order ?? 0),
    uploadedByUserId:
      row.uploaded_by_user_id === null || row.uploaded_by_user_id === undefined
        ? null
        : Number(row.uploaded_by_user_id),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapSqliteArtifactRow(row: Record<string, unknown>): TrainingArtifactRecord {
  return {
    id: Number(row.id ?? 0),
    sessionId: Number(row.session_id ?? 0),
    type: String(row.type ?? "recording") as TrainingArtifactType,
    source: String(row.source ?? "google_meet") as TrainingArtifactSource,
    sourceUrl: row.source_url ? String(row.source_url) : null,
    status: String(row.status ?? "pending") as TrainingArtifactRecord["status"],
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function ensureTrainingSchema() {
  if (isPostgresConfigured()) {
    return;
  }

  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS online_training_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      agenda TEXT NOT NULL,
      objectives TEXT,
      description TEXT,
      audience TEXT,
      program_tags_json TEXT NOT NULL DEFAULT '[]',
      attendee_emails_json TEXT NOT NULL DEFAULT '[]',
      scope_type TEXT NOT NULL DEFAULT 'country',
      scope_id TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Africa/Kampala',
      host_user_id INTEGER NOT NULL,
      attendee_count INTEGER NOT NULL DEFAULT 0,
      online_teachers_trained INTEGER NOT NULL DEFAULT 0,
      online_school_leaders_trained INTEGER NOT NULL DEFAULT 0,
      calendar_event_id TEXT,
      calendar_link TEXT,
      meet_join_url TEXT,
      conference_record_id TEXT,
      recording_url TEXT,
      chat_summary TEXT,
      attendance_captured_at TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      visibility TEXT NOT NULL DEFAULT 'private',
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS online_training_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      school_id INTEGER,
      teacher_user_id INTEGER,
      role TEXT NOT NULL DEFAULT 'attendee',
      attendance_status TEXT NOT NULL DEFAULT 'invited',
      joined_at TEXT,
      left_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES online_training_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS online_training_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      file_name TEXT,
      stored_path TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      external_url TEXT,
      visibility TEXT NOT NULL DEFAULT 'internal',
      sort_order INTEGER NOT NULL DEFAULT 0,
      uploaded_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES online_training_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS online_training_artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'google_meet',
      source_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(session_id, type),
      FOREIGN KEY (session_id) REFERENCES online_training_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS online_training_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL UNIQUE,
      facts_json TEXT NOT NULL,
      narrative_html TEXT NOT NULL,
      pdf_stored_path TEXT,
      ai_model TEXT,
      guardrail_version TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES online_training_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_online_training_sessions_start_time
      ON online_training_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_online_training_sessions_calendar_event_id
      ON online_training_sessions(calendar_event_id);
    CREATE INDEX IF NOT EXISTS idx_online_training_participants_session_id
      ON online_training_participants(session_id);
    CREATE INDEX IF NOT EXISTS idx_online_training_resources_session_id
      ON online_training_resources(session_id, sort_order, id);
    CREATE INDEX IF NOT EXISTS idx_online_training_artifacts_session_id
      ON online_training_artifacts(session_id);
  `);

  ensureSqliteColumn("online_training_sessions", "description", "TEXT");
  ensureSqliteColumn("online_training_sessions", "audience", "TEXT");
  ensureSqliteColumn("online_training_sessions", "attendee_emails_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureSqliteColumn("online_training_sessions", "attendee_count", "INTEGER NOT NULL DEFAULT 0");
  ensureSqliteColumn("online_training_sessions", "online_teachers_trained", "INTEGER NOT NULL DEFAULT 0");
  ensureSqliteColumn("online_training_sessions", "online_school_leaders_trained", "INTEGER NOT NULL DEFAULT 0");
  ensureSqliteColumn("online_training_sessions", "calendar_link", "TEXT");
  ensureSqliteColumn("online_training_sessions", "recording_url", "TEXT");
  ensureSqliteColumn("online_training_sessions", "chat_summary", "TEXT");
  ensureSqliteColumn("online_training_sessions", "attendance_captured_at", "TEXT");
}

export async function listOnlineTrainingSessions(input?: {
  includeDrafts?: boolean;
  hostUserId?: number | null;
  limit?: number;
}) {
  if (isPostgresConfigured()) {
    return listOnlineTrainingSessionsPostgres(input);
  }

  ensureTrainingSchema();
  const db = getDb();
  const whereClauses: string[] = [];
  const params: Record<string, unknown> = {
    limit: Math.min(Math.max(Math.trunc(input?.limit ?? 60), 1), 500),
  };

  if (!input?.includeDrafts) {
    whereClauses.push(`status IN ('scheduled', 'live', 'completed')`);
  }
  if (input?.hostUserId) {
    whereClauses.push(`host_user_id = @hostUserId`);
    params.hostUserId = input.hostUserId;
  }

  const rows = db
    .prepare(
      `
      SELECT *
      FROM online_training_sessions
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""}
      ORDER BY datetime(start_time) DESC, id DESC
      LIMIT @limit
    `,
    )
    .all(params) as Array<Record<string, unknown>>;

  return rows.map((row) => mapSqliteSessionRow(row));
}

export async function createTrainingSession(input: CreateTrainingSessionInput): Promise<number> {
  if (isPostgresConfigured()) {
    const sessionId = await createOnlineTrainingSessionPostgres(input);
    await queryPostgres(
      `
      INSERT INTO audit_logs (
        user_id,
        user_name,
        action,
        target_table,
        target_id,
        payload_after,
        detail
      )
      SELECT id, full_name, 'create', 'online_training_sessions', $2, $3, $4
      FROM portal_users
      WHERE id = $1
      `,
      [
        input.createdByUserId,
        String(sessionId),
        JSON.stringify(input),
        `Created online training session: ${input.title}`,
      ],
    );
    return sessionId;
  }

  ensureTrainingSchema();
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `
      INSERT INTO online_training_sessions (
        title,
        agenda,
        objectives,
        description,
        audience,
        program_tags_json,
        attendee_emails_json,
        scope_type,
        scope_id,
        start_time,
        end_time,
        timezone,
        host_user_id,
        attendee_count,
        online_teachers_trained,
        online_school_leaders_trained,
        calendar_event_id,
        calendar_link,
        meet_join_url,
        conference_record_id,
        recording_url,
        chat_summary,
        attendance_captured_at,
        created_by_user_id,
        status,
        visibility,
        created_at,
        updated_at
      ) VALUES (
        @title,
        @agenda,
        @objectives,
        @description,
        @audience,
        @programTags,
        @attendeeEmails,
        @scopeType,
        @scopeId,
        @startTime,
        @endTime,
        @timezone,
        @hostUserId,
        @attendeeCount,
        @onlineTeachersTrained,
        @onlineSchoolLeadersTrained,
        @calendarEventId,
        @calendarLink,
        @meetJoinUrl,
        @conferenceRecordId,
        @recordingUrl,
        @chatSummary,
        @attendanceCapturedAt,
        @createdByUserId,
        @status,
        @visibility,
        @now,
        @now
      )
    `,
    )
    .run({
      title: input.title.trim(),
      agenda: input.agenda.trim(),
      objectives: input.objectives?.trim() || null,
      description: input.description?.trim() || null,
      audience: input.audience?.trim() || null,
      programTags: JSON.stringify(input.programTags ?? []),
      attendeeEmails: JSON.stringify(normalizeEmailList(input.attendeeEmails)),
      scopeType: input.scopeType ?? "country",
      scopeId: input.scopeId ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      timezone: input.timezone ?? "Africa/Kampala",
      hostUserId: input.hostUserId,
      attendeeCount: Math.max(0, Math.trunc(input.attendeeCount ?? 0)),
      onlineTeachersTrained: Math.max(0, Math.trunc(input.onlineTeachersTrained ?? 0)),
      onlineSchoolLeadersTrained: Math.max(0, Math.trunc(input.onlineSchoolLeadersTrained ?? 0)),
      calendarEventId: input.calendarEventId?.trim() || null,
      calendarLink: input.calendarLink?.trim() || null,
      meetJoinUrl: input.meetJoinUrl?.trim() || null,
      conferenceRecordId: input.conferenceRecordId?.trim() || null,
      recordingUrl: input.recordingUrl?.trim() || null,
      chatSummary: input.chatSummary?.trim() || null,
      attendanceCapturedAt: input.attendanceCapturedAt ?? null,
      createdByUserId: input.createdByUserId,
      status: input.status,
      visibility: input.visibility ?? "private",
      now,
    });

  const sessionId = Number(result.lastInsertRowid);

  logAuditEvent(
    input.createdByUserId,
    "system",
    "create",
    "online_training_sessions",
    sessionId,
    null,
    JSON.stringify(input),
    `Created online training session: ${input.title}`,
  );

  await mirrorLegacyOnlineTrainingEvent(sessionId);
  return sessionId;
}

export async function getTrainingSession(sessionId: number): Promise<OnlineTrainingSessionRecord | null> {
  if (isPostgresConfigured()) {
    return getOnlineTrainingSessionPostgres(sessionId);
  }

  ensureTrainingSchema();
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM online_training_sessions WHERE id = ?`)
    .get(sessionId) as Record<string, unknown> | undefined;

  return row ? mapSqliteSessionRow(row) : null;
}

export async function listOnlineTrainingEventViews(limit = 20): Promise<OnlineTrainingEventRecord[]> {
  const sessions = await listOnlineTrainingSessions({
    includeDrafts: false,
    limit,
  });
  return sessions.map((session) => mapTrainingSessionToEventRecord(session));
}

export async function getOnlineTrainingEventViewById(
  sessionId: number,
): Promise<OnlineTrainingEventRecord | null> {
  const session = await getTrainingSession(sessionId);
  return session ? mapTrainingSessionToEventRecord(session) : null;
}

export async function scheduleOnlineTrainingSessionFromEvent(
  payload: {
    title: string;
    description?: string;
    audience: string;
    startDateTime: string;
    endDateTime: string;
    durationMinutes: number;
    attendeeEmails: string[];
    calendarEventId?: string | null;
    calendarLink?: string | null;
    meetLink?: string | null;
  },
  createdByUserId: number,
): Promise<OnlineTrainingEventRecord> {
  const sessionId = await createTrainingSession({
    title: payload.title,
    agenda: payload.description?.trim() || payload.title,
    objectives: payload.description?.trim() || undefined,
    description: payload.description?.trim() || undefined,
    audience: payload.audience,
    programTags: ["online-training"],
    attendeeEmails: normalizeEmailList(payload.attendeeEmails),
    startTime: payload.startDateTime,
    endTime: payload.endDateTime,
    timezone: "Africa/Kampala",
    hostUserId: createdByUserId,
    attendeeCount: normalizeEmailList(payload.attendeeEmails).length,
    calendarEventId: payload.calendarEventId ?? null,
    calendarLink: payload.calendarLink ?? null,
    meetJoinUrl: payload.meetLink ?? null,
    createdByUserId,
    status: "scheduled",
    visibility: "public",
  });

  const event = await getOnlineTrainingEventViewById(sessionId);
  if (!event) {
    throw new Error("Scheduled online training session could not be loaded.");
  }
  return event;
}

export async function updateTrainingSessionAttendance(
  sessionId: number,
  input: {
    onlineTeachersTrained: number;
    onlineSchoolLeadersTrained: number;
    attendeeCount?: number;
    recordingUrl?: string | null;
    chatSummary?: string | null;
  },
): Promise<OnlineTrainingEventRecord | null> {
  const attendeeCount =
    input.attendeeCount !== undefined
      ? Math.max(0, Math.floor(input.attendeeCount))
      : Math.max(
          0,
          Math.floor(input.onlineTeachersTrained) + Math.floor(input.onlineSchoolLeadersTrained),
        );
  const capturedAt = new Date().toISOString();

  if (isPostgresConfigured()) {
    await updateOnlineTrainingSessionOutcomesPostgres(sessionId, {
      attendeeCount,
      onlineTeachersTrained: input.onlineTeachersTrained,
      onlineSchoolLeadersTrained: input.onlineSchoolLeadersTrained,
      recordingUrl: input.recordingUrl ?? null,
      chatSummary: input.chatSummary ?? null,
      attendanceCapturedAt: capturedAt,
    });
    return getOnlineTrainingEventViewById(sessionId);
  }

  ensureTrainingSchema();
  getDb()
    .prepare(
      `
      UPDATE online_training_sessions
      SET
        attendee_count = @attendeeCount,
        online_teachers_trained = @onlineTeachersTrained,
        online_school_leaders_trained = @onlineSchoolLeadersTrained,
        recording_url = @recordingUrl,
        chat_summary = @chatSummary,
        attendance_captured_at = @attendanceCapturedAt,
        updated_at = @updatedAt
      WHERE id = @sessionId
      `,
    )
    .run({
      sessionId,
      attendeeCount,
      onlineTeachersTrained: Math.max(0, Math.floor(input.onlineTeachersTrained)),
      onlineSchoolLeadersTrained: Math.max(0, Math.floor(input.onlineSchoolLeadersTrained)),
      recordingUrl: input.recordingUrl?.trim() ? input.recordingUrl.trim() : null,
      chatSummary: input.chatSummary?.trim() ? input.chatSummary.trim() : null,
      attendanceCapturedAt: capturedAt,
      updatedAt: capturedAt,
    });
  await mirrorLegacyOnlineTrainingEvent(sessionId);
  return getOnlineTrainingEventViewById(sessionId);
}

export async function listTrainingResources(sessionId: number): Promise<OnlineTrainingResourceRecord[]> {
  if (isPostgresConfigured()) {
    return listOnlineTrainingResourcesPostgres(sessionId);
  }

  ensureTrainingSchema();
  const rows = getDb()
    .prepare(`SELECT * FROM online_training_resources WHERE session_id = ? ORDER BY sort_order ASC, id ASC`)
    .all(sessionId) as Array<Record<string, unknown>>;
  return rows.map((row) => mapSqliteResourceRow(row));
}

export async function listTrainingArtifacts(sessionId: number): Promise<TrainingArtifactRecord[]> {
  if (isPostgresConfigured()) {
    return listOnlineTrainingArtifactsPostgres(sessionId);
  }

  ensureTrainingSchema();
  const rows = getDb()
    .prepare(`SELECT * FROM online_training_artifacts WHERE session_id = ? ORDER BY id ASC`)
    .all(sessionId) as Array<Record<string, unknown>>;
  return rows.map((row) => mapSqliteArtifactRow(row));
}

export async function getTrainingArtifact(
  sessionId: number,
  type: TrainingArtifactType,
): Promise<TrainingArtifactRecord | null> {
  if (isPostgresConfigured()) {
    return getOnlineTrainingArtifactPostgres(sessionId, type);
  }

  ensureTrainingSchema();
  const row = getDb()
    .prepare(`SELECT * FROM online_training_artifacts WHERE session_id = ? AND type = ? LIMIT 1`)
    .get(sessionId, type) as Record<string, unknown> | undefined;
  return row ? mapSqliteArtifactRow(row) : null;
}

export async function updateTrainingSessionGoogleLinks(
  sessionId: number,
  calendarEventId: string | null,
  meetJoinUrl: string | null,
  conferenceRecordId: string | null,
  calendarLink?: string | null,
): Promise<void> {
  if (isPostgresConfigured()) {
    await updateOnlineTrainingSessionGoogleLinksPostgres(
      sessionId,
      calendarEventId,
      meetJoinUrl,
      conferenceRecordId,
      calendarLink,
    );
    return;
  }

  ensureTrainingSchema();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `
      UPDATE online_training_sessions
      SET calendar_event_id = @calendarEventId,
          calendar_link = COALESCE(@calendarLink, calendar_link),
          meet_join_url = @meetJoinUrl,
          conference_record_id = @conferenceRecordId,
          updated_at = @now
      WHERE id = @sessionId
    `,
    )
    .run({
      calendarEventId,
      calendarLink: calendarLink ?? null,
      meetJoinUrl,
      conferenceRecordId,
      now,
      sessionId,
    });
  await mirrorLegacyOnlineTrainingEvent(sessionId);
}

export async function upsertTrainingArtifact(input: {
  sessionId: number;
  type: TrainingArtifactType;
  source: TrainingArtifactSource;
  sourceUrl?: string | null;
  status: string;
}) {
  if (isPostgresConfigured()) {
    return upsertOnlineTrainingArtifactPostgres(input);
  }

  ensureTrainingSchema();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `
      INSERT INTO online_training_artifacts (session_id, type, source, source_url, status, created_at, updated_at)
      VALUES (@sessionId, @type, @source, @sourceUrl, @status, @now, @now)
      ON CONFLICT(session_id, type) DO UPDATE SET
        source = @source,
        source_url = @sourceUrl,
        status = @status,
        updated_at = @now
    `,
    )
    .run({
      sessionId: input.sessionId,
      type: input.type,
      source: input.source,
      sourceUrl: input.sourceUrl ?? null,
      status: input.status,
      now,
    });
  return getTrainingArtifact(input.sessionId, input.type);
}

export async function upsertTrainingNotes(input: {
  sessionId: number;
  factsJson: string;
  narrativeHtml: string;
  pdfStoredPath?: string | null;
  aiModel?: string | null;
  guardrailVersion?: string | null;
}) {
  if (isPostgresConfigured()) {
    return upsertOnlineTrainingNotesPostgres(input);
  }

  ensureTrainingSchema();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `
      INSERT INTO online_training_notes (
        session_id,
        facts_json,
        narrative_html,
        pdf_stored_path,
        ai_model,
        guardrail_version,
        created_at,
        updated_at
      ) VALUES (
        @sessionId,
        @factsJson,
        @narrativeHtml,
        @pdfStoredPath,
        @aiModel,
        @guardrailVersion,
        @now,
        @now
      )
      ON CONFLICT(session_id) DO UPDATE SET
        facts_json = @factsJson,
        narrative_html = @narrativeHtml,
        pdf_stored_path = @pdfStoredPath,
        ai_model = @aiModel,
        guardrail_version = @guardrailVersion,
        updated_at = @now
    `,
    )
    .run({
      sessionId: input.sessionId,
      factsJson: input.factsJson,
      narrativeHtml: input.narrativeHtml,
      pdfStoredPath: input.pdfStoredPath ?? null,
      aiModel: input.aiModel ?? null,
      guardrailVersion: input.guardrailVersion ?? null,
      now,
    });

  const row = getDb()
    .prepare(`SELECT * FROM online_training_notes WHERE session_id = ? LIMIT 1`)
    .get(input.sessionId) as Record<string, unknown> | undefined;
  return row
    ? {
        id: Number(row.id ?? 0),
        sessionId: Number(row.session_id ?? 0),
        factsJson: String(row.facts_json ?? "{}"),
        narrativeHtml: String(row.narrative_html ?? ""),
        pdfStoredPath: row.pdf_stored_path ? String(row.pdf_stored_path) : null,
        aiModel: row.ai_model ? String(row.ai_model) : null,
        guardrailVersion: row.guardrail_version ? String(row.guardrail_version) : null,
        createdAt: String(row.created_at ?? ""),
        updatedAt: String(row.updated_at ?? ""),
      }
    : null;
}
