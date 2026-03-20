import {
  queryPostgres,
  requirePostgresConfigured,
} from "@/lib/server/postgres/client";
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

export function ensureTrainingSchema() {
  requirePostgresConfigured();
}

export async function listOnlineTrainingSessions(input?: {
  includeDrafts?: boolean;
  hostUserId?: number | null;
  limit?: number;
}) {
  requirePostgresConfigured();
  return listOnlineTrainingSessionsPostgres(input);
}

export async function createTrainingSession(input: CreateTrainingSessionInput): Promise<number> {
  requirePostgresConfigured();
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

export async function getTrainingSession(sessionId: number): Promise<OnlineTrainingSessionRecord | null> {
  requirePostgresConfigured();
  return getOnlineTrainingSessionPostgres(sessionId);
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
  requirePostgresConfigured();
  const attendeeCount =
    input.attendeeCount !== undefined
      ? Math.max(0, Math.floor(input.attendeeCount))
      : Math.max(
          0,
          Math.floor(input.onlineTeachersTrained) + Math.floor(input.onlineSchoolLeadersTrained),
        );
  const capturedAt = new Date().toISOString();

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

export async function listTrainingResources(sessionId: number): Promise<OnlineTrainingResourceRecord[]> {
  requirePostgresConfigured();
  return listOnlineTrainingResourcesPostgres(sessionId);
}

export async function listTrainingArtifacts(sessionId: number): Promise<TrainingArtifactRecord[]> {
  requirePostgresConfigured();
  return listOnlineTrainingArtifactsPostgres(sessionId);
}

export async function getTrainingArtifact(
  sessionId: number,
  type: TrainingArtifactType,
): Promise<TrainingArtifactRecord | null> {
  requirePostgresConfigured();
  return getOnlineTrainingArtifactPostgres(sessionId, type);
}

export async function updateTrainingSessionGoogleLinks(
  sessionId: number,
  calendarEventId: string | null,
  meetJoinUrl: string | null,
  conferenceRecordId: string | null,
  calendarLink?: string | null,
): Promise<void> {
  requirePostgresConfigured();
  await updateOnlineTrainingSessionGoogleLinksPostgres(
    sessionId,
    calendarEventId,
    meetJoinUrl,
    conferenceRecordId,
    calendarLink,
  );
}

export async function upsertTrainingArtifact(input: {
  sessionId: number;
  type: TrainingArtifactType;
  source: TrainingArtifactSource;
  sourceUrl?: string | null;
  status: string;
}) {
  requirePostgresConfigured();
  return upsertOnlineTrainingArtifactPostgres(input);
}

export async function upsertTrainingNotes(input: {
  sessionId: number;
  factsJson: string;
  narrativeHtml: string;
  pdfStoredPath?: string | null;
  aiModel?: string | null;
  guardrailVersion?: string | null;
}) {
  requirePostgresConfigured();
  return upsertOnlineTrainingNotesPostgres(input);
}

/**
 * Register a school (and optionally individual contacts) as participants of an
 * online training session.  One row per contactId is inserted; if no contacts
 * are provided a single school-level row is created.
 */
export async function addEventParticipants(
  sessionId: number,
  schoolId: number,
  contactIds: number[] = [],
): Promise<{ inserted: number }> {
  requirePostgresConfigured();

  if (contactIds.length === 0) {
    // School-level registration (no individual contacts specified)
    await queryPostgres(
      `INSERT INTO online_training_participants (session_id, school_id, role, attendance_status)
       VALUES ($1, $2, 'attendee', 'invited')`,
      [sessionId, schoolId],
    );
    return { inserted: 1 };
  }

  for (const contactId of contactIds) {
    await queryPostgres(
      `INSERT INTO online_training_participants (session_id, school_id, teacher_user_id, role, attendance_status)
       VALUES ($1, $2, $3, 'attendee', 'invited')`,
      [sessionId, schoolId, contactId],
    );
  }
  return { inserted: contactIds.length };
}
