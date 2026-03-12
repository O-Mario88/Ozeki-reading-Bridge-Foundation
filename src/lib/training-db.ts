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
} from "@/lib/server/postgres/repositories/training";
import type {
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

function mapSqliteSessionRow(row: Record<string, unknown>): OnlineTrainingSessionRecord {
  return {
    id: Number(row.id ?? 0),
    title: String(row.title ?? ""),
    agenda: String(row.agenda ?? ""),
    objectives: row.objectives ? String(row.objectives) : null,
    programTags: String(row.program_tags_json ?? "[]"),
    scopeType: String(row.scope_type ?? "country") as OnlineTrainingSessionRecord["scopeType"],
    scopeId: row.scope_id ? String(row.scope_id) : null,
    startTime: String(row.start_time ?? ""),
    endTime: String(row.end_time ?? ""),
    timezone: String(row.timezone ?? "Africa/Kampala"),
    hostUserId: Number(row.host_user_id ?? 0),
    calendarEventId: row.calendar_event_id ? String(row.calendar_event_id) : null,
    meetJoinUrl: row.meet_join_url ? String(row.meet_join_url) : null,
    conferenceRecordId: row.conference_record_id ? String(row.conference_record_id) : null,
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
      program_tags_json TEXT NOT NULL DEFAULT '[]',
      scope_type TEXT NOT NULL DEFAULT 'country',
      scope_id TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Africa/Kampala',
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

export async function createTrainingSession(input: {
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
  status: TrainingSessionStatus;
}): Promise<number> {
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
      INSERT INTO online_training_sessions
        (title, agenda, objectives, program_tags_json, scope_type, scope_id, start_time, end_time, timezone, host_user_id, created_by_user_id, status, created_at, updated_at)
      VALUES
        (@title, @agenda, @objectives, @programTags, @scopeType, @scopeId, @startTime, @endTime, @timezone, @hostUserId, @createdByUserId, @status, @now, @now)
    `,
    )
    .run({
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
    "online_training_sessions",
    sessionId,
    null,
    JSON.stringify(input),
    `Created online training session: ${input.title}`,
  );

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
): Promise<void> {
  if (isPostgresConfigured()) {
    await updateOnlineTrainingSessionGoogleLinksPostgres(
      sessionId,
      calendarEventId,
      meetJoinUrl,
      conferenceRecordId,
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
          meet_join_url = @meetJoinUrl,
          conference_record_id = @conferenceRecordId,
          updated_at = @now
      WHERE id = @sessionId
    `,
    )
    .run({
      calendarEventId,
      meetJoinUrl,
      conferenceRecordId,
      now,
      sessionId,
    });
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
