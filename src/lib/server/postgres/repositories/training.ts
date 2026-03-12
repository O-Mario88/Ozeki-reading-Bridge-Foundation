import { queryPostgres } from "@/lib/server/postgres/client";
import type {
  OnlineTrainingSessionRecord,
  TrainingArtifactRecord,
  TrainingArtifactSource,
  TrainingArtifactType,
  TrainingResourceVisibility,
  TrainingSessionStatus,
} from "@/lib/types";

export type OnlineTrainingResourceRow = {
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

export type OnlineTrainingNotesRow = {
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

type ListOnlineTrainingSessionsOptions = {
  includeDrafts?: boolean;
  hostUserId?: number | null;
  limit?: number;
};

const SESSION_SELECT = `
  SELECT
    id,
    title,
    agenda,
    objectives,
    description,
    audience,
    program_tags_json AS "programTagsJson",
    attendee_emails_json AS "attendeeEmailsJson",
    scope_type AS "scopeType",
    scope_id AS "scopeId",
    start_time::text AS "startTime",
    end_time::text AS "endTime",
    timezone,
    host_user_id AS "hostUserId",
    attendee_count AS "attendeeCount",
    online_teachers_trained AS "onlineTeachersTrained",
    online_school_leaders_trained AS "onlineSchoolLeadersTrained",
    calendar_event_id AS "calendarEventId",
    calendar_link AS "calendarLink",
    meet_join_url AS "meetJoinUrl",
    conference_record_id AS "conferenceRecordId",
    recording_url AS "recordingUrl",
    chat_summary AS "chatSummary",
    attendance_captured_at::text AS "attendanceCapturedAt",
    status,
    visibility,
    created_by_user_id AS "createdByUserId",
    created_at::text AS "createdAt",
    updated_at::text AS "updatedAt"
`;

function mapSession(row: Record<string, unknown>): OnlineTrainingSessionRecord {
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    agenda: String(row.agenda ?? ""),
    objectives: row.objectives ? String(row.objectives) : null,
    description: row.description ? String(row.description) : null,
    audience: row.audience ? String(row.audience) : null,
    programTags: String(row.programTagsJson ?? "[]"),
    attendeeEmails: String(row.attendeeEmailsJson ?? "[]"),
    scopeType: String(row.scopeType ?? "country") as OnlineTrainingSessionRecord["scopeType"],
    scopeId: row.scopeId ? String(row.scopeId) : null,
    startTime: String(row.startTime ?? ""),
    endTime: String(row.endTime ?? ""),
    timezone: String(row.timezone ?? "Africa/Kampala"),
    hostUserId: Number(row.hostUserId ?? 0),
    attendeeCount: Number(row.attendeeCount ?? 0),
    onlineTeachersTrained: Number(row.onlineTeachersTrained ?? 0),
    onlineSchoolLeadersTrained: Number(row.onlineSchoolLeadersTrained ?? 0),
    calendarEventId: row.calendarEventId ? String(row.calendarEventId) : null,
    calendarLink: row.calendarLink ? String(row.calendarLink) : null,
    meetJoinUrl: row.meetJoinUrl ? String(row.meetJoinUrl) : null,
    conferenceRecordId: row.conferenceRecordId ? String(row.conferenceRecordId) : null,
    recordingUrl: row.recordingUrl ? String(row.recordingUrl) : null,
    chatSummary: row.chatSummary ? String(row.chatSummary) : null,
    attendanceCapturedAt: row.attendanceCapturedAt ? String(row.attendanceCapturedAt) : null,
    status: String(row.status ?? "draft") as TrainingSessionStatus,
    visibility: String(row.visibility ?? "private"),
    createdByUserId: Number(row.createdByUserId ?? 0),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
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

function mapArtifact(row: Record<string, unknown>): TrainingArtifactRecord {
  return {
    id: Number(row.id),
    sessionId: Number(row.sessionId ?? 0),
    type: String(row.type ?? "recording") as TrainingArtifactType,
    source: String(row.source ?? "google_meet") as TrainingArtifactSource,
    sourceUrl: row.sourceUrl ? String(row.sourceUrl) : null,
    status: String(row.status ?? "pending") as TrainingArtifactRecord["status"],
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  };
}

export async function listOnlineTrainingSessionsPostgres(
  options: ListOnlineTrainingSessionsOptions = {},
) {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 60), 1), 500);

  if (!options.includeDrafts) {
    clauses.push(`status IN ('scheduled', 'live', 'completed')`);
  }

  if (options.hostUserId) {
    params.push(options.hostUserId);
    clauses.push(`host_user_id = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `
      ${SESSION_SELECT}
      FROM online_training_sessions
      ${whereClause}
      ORDER BY start_time DESC, id DESC
      LIMIT ${limit}
    `,
    params,
  );
  return result.rows.map((row) => mapSession(row));
}

export async function getOnlineTrainingSessionPostgres(sessionId: number) {
  const result = await queryPostgres(
    `
      ${SESSION_SELECT}
      FROM online_training_sessions
      WHERE id = $1
      LIMIT 1
    `,
    [sessionId],
  );
  return result.rows[0] ? mapSession(result.rows[0]) : null;
}

export async function createOnlineTrainingSessionPostgres(input: {
  title: string;
  agenda: string;
  objectives?: string | null;
  description?: string | null;
  audience?: string | null;
  programTags?: string[];
  attendeeEmails?: string[];
  scopeType?: string;
  scopeId?: string | null;
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
}) {
  const result = await queryPostgres(
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
        visibility
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10::timestamptz,
        $11::timestamptz,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19,
        $20,
        $21::timestamptz,
        $22,
        $23,
        $24
      )
      RETURNING id
    `,
    [
      input.title.trim(),
      input.agenda.trim(),
      input.objectives?.trim() || null,
      input.description?.trim() || null,
      input.audience?.trim() || null,
      JSON.stringify(input.programTags ?? []),
      JSON.stringify((input.attendeeEmails ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean)),
      input.scopeType ?? "country",
      input.scopeId?.trim() || null,
      input.startTime,
      input.endTime,
      input.timezone ?? "Africa/Kampala",
      input.hostUserId,
      Math.max(0, Math.trunc(input.attendeeCount ?? 0)),
      Math.max(0, Math.trunc(input.onlineTeachersTrained ?? 0)),
      Math.max(0, Math.trunc(input.onlineSchoolLeadersTrained ?? 0)),
      input.calendarEventId?.trim() || null,
      input.calendarLink?.trim() || null,
      input.meetJoinUrl?.trim() || null,
      input.conferenceRecordId?.trim() || null,
      input.recordingUrl?.trim() || null,
      input.chatSummary?.trim() || null,
      input.attendanceCapturedAt ?? null,
      input.createdByUserId,
      input.status,
      input.visibility ?? "private",
    ],
  );
  return Number(result.rows[0]?.id ?? 0);
}

export async function updateOnlineTrainingSessionGoogleLinksPostgres(
  sessionId: number,
  calendarEventId: string | null,
  meetJoinUrl: string | null,
  conferenceRecordId: string | null,
  calendarLink?: string | null,
) {
  await queryPostgres(
    `
      UPDATE online_training_sessions
      SET calendar_event_id = $2,
          calendar_link = COALESCE($3, calendar_link),
          meet_join_url = $4,
          conference_record_id = $5,
          updated_at = NOW()
      WHERE id = $1
    `,
    [sessionId, calendarEventId, calendarLink ?? null, meetJoinUrl, conferenceRecordId],
  );
}

export async function updateOnlineTrainingSessionOutcomesPostgres(
  sessionId: number,
  input: {
    attendeeCount: number;
    onlineTeachersTrained: number;
    onlineSchoolLeadersTrained: number;
    recordingUrl?: string | null;
    chatSummary?: string | null;
    attendanceCapturedAt: string;
  },
) {
  await queryPostgres(
    `
      UPDATE online_training_sessions
      SET attendee_count = $2,
          online_teachers_trained = $3,
          online_school_leaders_trained = $4,
          recording_url = $5,
          chat_summary = $6,
          attendance_captured_at = $7::timestamptz,
          updated_at = NOW()
      WHERE id = $1
    `,
    [
      sessionId,
      Math.max(0, Math.trunc(input.attendeeCount)),
      Math.max(0, Math.trunc(input.onlineTeachersTrained)),
      Math.max(0, Math.trunc(input.onlineSchoolLeadersTrained)),
      input.recordingUrl?.trim() || null,
      input.chatSummary?.trim() || null,
      input.attendanceCapturedAt,
    ],
  );
}

export async function listOnlineTrainingResourcesPostgres(sessionId: number) {
  const result = await queryPostgres(
    `
      SELECT
        id,
        session_id AS "sessionId",
        title,
        file_name AS "fileName",
        stored_path AS "storedPath",
        mime_type AS "mimeType",
        size_bytes AS "sizeBytes",
        external_url AS "externalUrl",
        COALESCE(external_url, stored_path) AS "fileUrl",
        visibility,
        sort_order AS "sortOrder",
        uploaded_by_user_id AS "uploadedByUserId",
        created_at::text AS "createdAt"
      FROM online_training_resources
      WHERE session_id = $1
      ORDER BY sort_order ASC, id ASC
    `,
    [sessionId],
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    sessionId: Number(row.sessionId ?? 0),
    title: String(row.title ?? ""),
    fileName: row.fileName ? String(row.fileName) : null,
    storedPath: row.storedPath ? String(row.storedPath) : null,
    mimeType: row.mimeType ? String(row.mimeType) : null,
    sizeBytes: row.sizeBytes === null || row.sizeBytes === undefined ? null : Number(row.sizeBytes),
    externalUrl: row.externalUrl ? String(row.externalUrl) : null,
    fileUrl: row.fileUrl ? String(row.fileUrl) : null,
    visibility: String(row.visibility ?? "internal") as TrainingResourceVisibility,
    sortOrder: Number(row.sortOrder ?? 0),
    uploadedByUserId:
      row.uploadedByUserId === null || row.uploadedByUserId === undefined
        ? null
        : Number(row.uploadedByUserId),
    createdAt: String(row.createdAt ?? ""),
  }));
}

export async function listOnlineTrainingArtifactsPostgres(sessionId: number) {
  const result = await queryPostgres(
    `
      SELECT
        id,
        session_id AS "sessionId",
        type,
        source,
        source_url AS "sourceUrl",
        status,
        created_at::text AS "createdAt",
        updated_at::text AS "updatedAt"
      FROM online_training_artifacts
      WHERE session_id = $1
      ORDER BY id ASC
    `,
    [sessionId],
  );
  return result.rows.map((row) => mapArtifact(row));
}

export async function getOnlineTrainingArtifactPostgres(
  sessionId: number,
  type: TrainingArtifactType,
) {
  const result = await queryPostgres(
    `
      SELECT
        id,
        session_id AS "sessionId",
        type,
        source,
        source_url AS "sourceUrl",
        status,
        created_at::text AS "createdAt",
        updated_at::text AS "updatedAt"
      FROM online_training_artifacts
      WHERE session_id = $1 AND type = $2
      LIMIT 1
    `,
    [sessionId, type],
  );
  return result.rows[0] ? mapArtifact(result.rows[0]) : null;
}

export async function upsertOnlineTrainingArtifactPostgres(input: {
  sessionId: number;
  type: TrainingArtifactType;
  source: TrainingArtifactSource;
  sourceUrl?: string | null;
  status: string;
}) {
  const result = await queryPostgres(
    `
      INSERT INTO online_training_artifacts (
        session_id,
        type,
        source,
        source_url,
        status
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (session_id, type) DO UPDATE SET
        source = EXCLUDED.source,
        source_url = EXCLUDED.source_url,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING
        id,
        session_id AS "sessionId",
        type,
        source,
        source_url AS "sourceUrl",
        status,
        created_at::text AS "createdAt",
        updated_at::text AS "updatedAt"
    `,
    [input.sessionId, input.type, input.source, input.sourceUrl ?? null, input.status],
  );
  return mapArtifact(result.rows[0]);
}

export async function upsertOnlineTrainingNotesPostgres(input: {
  sessionId: number;
  factsJson: string;
  narrativeHtml: string;
  pdfStoredPath?: string | null;
  aiModel?: string | null;
  guardrailVersion?: string | null;
}) {
  const result = await queryPostgres(
    `
      INSERT INTO online_training_notes (
        session_id,
        facts_json,
        narrative_html,
        pdf_stored_path,
        ai_model,
        guardrail_version
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (session_id) DO UPDATE SET
        facts_json = EXCLUDED.facts_json,
        narrative_html = EXCLUDED.narrative_html,
        pdf_stored_path = EXCLUDED.pdf_stored_path,
        ai_model = EXCLUDED.ai_model,
        guardrail_version = EXCLUDED.guardrail_version,
        updated_at = NOW()
      RETURNING
        id,
        session_id AS "sessionId",
        facts_json AS "factsJson",
        narrative_html AS "narrativeHtml",
        pdf_stored_path AS "pdfStoredPath",
        ai_model AS "aiModel",
        guardrail_version AS "guardrailVersion",
        created_at::text AS "createdAt",
        updated_at::text AS "updatedAt"
    `,
    [
      input.sessionId,
      input.factsJson,
      input.narrativeHtml,
      input.pdfStoredPath ?? null,
      input.aiModel ?? null,
      input.guardrailVersion ?? null,
    ],
  );
  const row = result.rows[0];
  return {
    id: Number(row.id),
    sessionId: Number(row.sessionId ?? 0),
    factsJson: String(row.factsJson ?? "{}"),
    narrativeHtml: String(row.narrativeHtml ?? ""),
    pdfStoredPath: row.pdfStoredPath ? String(row.pdfStoredPath) : null,
    aiModel: row.aiModel ? String(row.aiModel) : null,
    guardrailVersion: row.guardrailVersion ? String(row.guardrailVersion) : null,
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  } satisfies OnlineTrainingNotesRow;
}
