import {
  getTrainingArtifact,
  getTrainingSession,
  upsertTrainingArtifact,
  upsertTrainingNotes,
  updateTrainingSessionGoogleLinks,
} from "./training-db";
import { getMeetArtifactsMetadata, downloadTranscriptContent } from "./google-meet-sync";
import { generateMeetingFacts, formatNarrativeMinutesHtml } from "./training-ai";
import { createGoogleCalendarClient, isGoogleWorkspaceConfigured, getRequiredEnv } from "./google-workspace";
import { logger } from "./logger";

/**
 * 1) SyncConferenceRecordJob
 * Fetches the Google Meet conference record ID from the linked Calendar event
 * and stores it on the session so artifact sync can proceed.
 */
export async function syncConferenceRecordJob(sessionId: number): Promise<void> {
  const session = await getTrainingSession(sessionId);
  if (!session) return;
  if (session.conferenceRecordId) return; // already synced
  if (!session.calendarEventId) {
    logger.warn("[training-jobs] syncConferenceRecordJob: no calendarEventId", { sessionId });
    return;
  }
  if (!isGoogleWorkspaceConfigured()) return;

  try {
    const calendarId = getRequiredEnv("GOOGLE_CALENDAR_ID");
    const calendar = createGoogleCalendarClient();
    const event = await calendar.events.get({ calendarId, eventId: session.calendarEventId });

    // The conference record name is embedded in the hangout/meet link as the space code.
    // Google Meet API addresses conference records as "conferenceRecords/<id>".
    // Until the meeting ends the record may not exist yet — we store the space code
    // from the Meet link so the artifact job can try it later.
    const meetLink = event.data.hangoutLink
      ?? event.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri
      ?? null;

    if (!meetLink) {
      logger.warn("[training-jobs] syncConferenceRecordJob: no Meet link on calendar event", { sessionId });
      return;
    }

    // Extract space code: https://meet.google.com/abc-defg-hij → abc-defg-hij
    const spaceCode = meetLink.replace(/^https?:\/\/meet\.google\.com\//, "").split("?")[0];
    if (!spaceCode) return;

    // Store as conference record ID placeholder; artifact sync will look up the
    // actual conferenceRecords resource once the meeting has ended.
    const conferenceRecordId = `spaces/${spaceCode}`;
    await updateTrainingSessionGoogleLinks(
      sessionId,
      session.calendarEventId,
      session.meetJoinUrl,
      conferenceRecordId,
      session.calendarLink,
    );

    logger.info("[training-jobs] syncConferenceRecordJob: stored conference record", { sessionId, conferenceRecordId });
  } catch (error) {
    logger.error("[training-jobs] syncConferenceRecordJob failed", { sessionId, error: String(error) });
  }
}

/**
 * 2) SyncMeetArtifactsJob
 * Pull metadata for recordings and transcripts, update training_artifacts
 */
export async function syncMeetArtifactsJob(sessionId: number): Promise<void> {
  const session = await getTrainingSession(sessionId);
  if (!session || !session.conferenceRecordId) return;

  try {
    const { recordings, transcripts } = await getMeetArtifactsMetadata(session.conferenceRecordId);

    if (recordings.length > 0) {
      const rec = recordings[0] as Record<string, unknown>;
      const sourceUrl = String(
        (rec as Record<string, unknown>).driveDestination
          || (rec as Record<string, unknown>).name
          || "",
      );
      await upsertTrainingArtifact({ sessionId, type: "recording", source: "google_meet", sourceUrl, status: "available" });
    } else {
      await upsertTrainingArtifact({ sessionId, type: "recording", source: "google_meet", status: "not_available" });
    }

    if (transcripts.length > 0) {
      const trans = transcripts[0] as Record<string, unknown>;
      const docsDestination = trans.docsDestination as Record<string, unknown> | undefined;
      const sourceUrl = String(docsDestination?.document || trans.name || "");
      await upsertTrainingArtifact({ sessionId, type: "transcript", source: "google_meet", sourceUrl, status: "available" });
    } else {
      await upsertTrainingArtifact({ sessionId, type: "transcript", source: "google_meet", status: "not_available" });
    }
  } catch (error) {
    logger.error("[training-jobs] syncMeetArtifactsJob failed", { sessionId, error: String(error) });
  }
}

/**
 * 3) GenerateAiMeetingNotesJob
 * Wait for transcript to be 'available', fetch it, run 2-pass AI, save notes
 */
export async function generateAiMeetingNotesJob(sessionId: number): Promise<void> {
  const session = await getTrainingSession(sessionId);
  if (!session) return;

  const transRow = await getTrainingArtifact(sessionId, "transcript");
  if (!transRow || transRow.status !== "available" || !transRow.sourceUrl) {
    logger.info("[training-jobs] generateAiMeetingNotesJob: no available transcript", { sessionId });
    return;
  }

  await upsertTrainingArtifact({ sessionId, type: "ai_notes", source: "ozeki_ai", status: "processing" });

  try {
    const transcriptText = await downloadTranscriptContent(transRow.sourceUrl);

    const facts = await generateMeetingFacts(
      { title: session.title, agenda: session.agenda, date: session.startTime, scope: session.scopeType },
      transcriptText,
    );

    const html = formatNarrativeMinutesHtml(facts, {
      title: session.title,
      date: session.startTime,
      scope: session.scopeType,
    });

    await upsertTrainingNotes({ sessionId, factsJson: JSON.stringify(facts), narrativeHtml: html });
    await upsertTrainingArtifact({ sessionId, type: "ai_notes", source: "ozeki_ai", status: "available" });
  } catch (error) {
    logger.error("[training-jobs] generateAiMeetingNotesJob failed", { sessionId, error: String(error) });
    await upsertTrainingArtifact({ sessionId, type: "ai_notes", source: "ozeki_ai", status: "failed" });
  }
}
