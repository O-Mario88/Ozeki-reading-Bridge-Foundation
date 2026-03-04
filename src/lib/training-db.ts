import { getDb, logAuditEvent } from "./db";
import type { OnlineTrainingSessionRecord } from "./types";

export function ensureTrainingSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      agenda TEXT NOT NULL,
      objectives TEXT,
      program_tags TEXT NOT NULL DEFAULT '[]',
      scope_type TEXT NOT NULL DEFAULT 'country',
      scope_id TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      host_user_id INTEGER NOT NULL,
      calendar_event_id TEXT,
      meet_join_url TEXT,
      conference_record_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      visibility TEXT NOT NULL DEFAULT 'private',
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS training_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      school_id INTEGER,
      teacher_user_id INTEGER,
      role TEXT NOT NULL DEFAULT 'attendee',
      attendance_status TEXT NOT NULL DEFAULT 'invited',
      joined_at TEXT,
      left_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS training_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      file_name TEXT,
      stored_path TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      external_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS training_artifacts (
      session_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'google_meet',
      source_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (session_id, type),
      FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS training_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL UNIQUE,
      facts_json TEXT NOT NULL,
      narrative_html TEXT NOT NULL,
      pdf_stored_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_training_sessions_start_time ON training_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_training_sessions_calendar_event_id ON training_sessions(calendar_event_id);
    CREATE INDEX IF NOT EXISTS idx_training_participants_session_id ON training_participants(session_id);
    CREATE INDEX IF NOT EXISTS idx_training_participants_school_id ON training_participants(school_id);
    CREATE INDEX IF NOT EXISTS idx_training_artifacts_session_id ON training_artifacts(session_id);
  `);
}

/**
 * Create a new training session and return its ID.
 */
export function createTrainingSession(input: {
  title: string;
  agenda: string;
  objectives?: string;
  programTags?: string[];
  scopeType?: string;
  scopeId?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  hostUserId: number;
  createdByUserId: number;
  status: string;
}): number {
  ensureTrainingSchema();
  const db = getDb();
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO training_sessions
      (title, agenda, objectives, program_tags, scope_type, scope_id, start_time, end_time, timezone, host_user_id, created_by_user_id, status, created_at, updated_at)
    VALUES
      (@title, @agenda, @objectives, @programTags, @scopeType, @scopeId, @startTime, @endTime, @timezone, @hostUserId, @createdByUserId, @status, @now, @now)
  `).run({
    title: input.title,
    agenda: input.agenda,
    objectives: input.objectives ?? null,
    programTags: JSON.stringify(input.programTags ?? []),
    scopeType: input.scopeType ?? "country",
    scopeId: input.scopeId ?? null,
    startTime: input.startTime,
    endTime: input.endTime,
    timezone: input.timezone ?? "Africa/Kampala",
    hostUserId: input.hostUserId,
    createdByUserId: input.createdByUserId,
    status: input.status,
    now,
  });

  const sessionId = Number(result.lastInsertRowid);

  logAuditEvent(
    input.createdByUserId,
    "system",
    "create",
    "training_sessions",
    sessionId,
    null,
    JSON.stringify(input),
    `Created training session: ${input.title}`,
  );

  return sessionId;
}

/**
 * Get a single training session by ID.
 */
export function getTrainingSession(sessionId: number): OnlineTrainingSessionRecord | null {
  ensureTrainingSchema();
  const db = getDb();

  const row = db.prepare(`
    SELECT * FROM training_sessions WHERE id = ?
  `).get(sessionId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as number,
    title: row.title as string,
    agenda: row.agenda as string,
    objectives: row.objectives as string | null,
    programTags: row.program_tags as string,
    scopeType: row.scope_type as OnlineTrainingSessionRecord["scopeType"],
    scopeId: row.scope_id as string | null,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    timezone: row.timezone as string,
    hostUserId: row.host_user_id as number,
    calendarEventId: row.calendar_event_id as string | null,
    meetJoinUrl: row.meet_join_url as string | null,
    conferenceRecordId: row.conference_record_id as string | null,
    status: row.status as OnlineTrainingSessionRecord["status"],
    createdByUserId: row.created_by_user_id as number,
    createdAt: row.created_at as string,
    schoolName: "",
    district: "",
    subCounty: "",
    parish: "",
    region: "",
    visibility: (row.visibility as string) || "private",
    updatedAt: row.updated_at as string,
    participants: [],
    resources: [],
    artifacts: [],
  };
}

/**
 * After Google Calendar event is created, update the session with Meet link data.
 */
export function updateTrainingSessionGoogleLinks(
  sessionId: number,
  calendarEventId: string | null,
  meetJoinUrl: string | null,
  conferenceRecordId: string | null,
): void {
  ensureTrainingSchema();
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE training_sessions
    SET calendar_event_id = @calendarEventId,
        meet_join_url = @meetJoinUrl,
        conference_record_id = @conferenceRecordId,
        updated_at = @now
    WHERE id = @sessionId
  `).run({
    calendarEventId,
    meetJoinUrl,
    conferenceRecordId,
    now,
    sessionId,
  });
}
