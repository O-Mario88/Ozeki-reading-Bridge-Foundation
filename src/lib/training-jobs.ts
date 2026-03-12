import {
  getTrainingArtifact,
  getTrainingSession,
  upsertTrainingArtifact,
  upsertTrainingNotes,
} from "./training-db";
import { getMeetArtifactsMetadata, downloadTranscriptContent } from "./google-meet-sync";
import { generateMeetingFacts, formatNarrativeMinutesHtml } from "./training-ai";

/**
 * 1) SyncConferenceRecordJob
 * For a given session, check if it has a conference record (from Calendar/Meet link).
 */
export async function syncConferenceRecordJob(sessionId: number): Promise<void> {
  const session = await getTrainingSession(sessionId);
  if (!session) return;
  console.log(`SyncConferenceRecordJob for ${sessionId} (noop placeholder)`);
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

    // Process top recording (if multiple)
    if (recordings.length > 0) {
      const rec = recordings[0] as Record<string, unknown>;
      const sourceUrl = String(
        (rec as Record<string, unknown>).driveDestination
          || (rec as Record<string, unknown>).name
          || "",
      );
      await upsertTrainingArtifact({
        sessionId,
        type: "recording",
        source: "google_meet",
        sourceUrl,
        status: "available",
      });
    } else {
      await upsertTrainingArtifact({
        sessionId,
        type: "recording",
        source: "google_meet",
        status: "not_available",
      });
    }

    // Process top transcript
    if (transcripts.length > 0) {
      const trans = transcripts[0] as Record<string, unknown>;
      const docsDestination = trans.docsDestination as Record<string, unknown> | undefined;
      const sourceUrl = String(docsDestination?.document || trans.name || "");
      await upsertTrainingArtifact({
        sessionId,
        type: "transcript",
        source: "google_meet",
        sourceUrl,
        status: "available",
      });
    } else {
      await upsertTrainingArtifact({
        sessionId,
        type: "transcript",
        source: "google_meet",
        status: "not_available",
      });
    }
  } catch (error) {
    console.error(`Failed to sync artifacts for session ${sessionId}`, error);
  }
}

/**
 * 3) GenerateAiMeetingNotesJob
 * Wait for transcript to be 'available', fetch it, run 2-pass AI, save notes and pdf
 */
export async function generateAiMeetingNotesJob(sessionId: number): Promise<void> {
  const session = await getTrainingSession(sessionId);
  if (!session) return;

  // Check transcript artifact
  const transRow = await getTrainingArtifact(sessionId, "transcript");

  if (!transRow || transRow.status !== "available" || !transRow.sourceUrl) {
    console.log(`No available transcript for session ${sessionId}. Skipping AI notes.`);
    return;
  }

  // Mark AI notes as processing
  await upsertTrainingArtifact({
    sessionId,
    type: "ai_notes",
    source: "ozeki_ai",
    status: "processing",
  });

  try {
    // Download the transcript text
    const transcriptText = await downloadTranscriptContent(transRow.sourceUrl);

    // Pass A: Extract structured facts
    const facts = await generateMeetingFacts(
      {
        title: session.title,
        agenda: session.agenda,
        date: session.startTime,
        scope: session.scopeType,
      },
      transcriptText
    );

    // Pass B: Format narrative HTML
    const html = formatNarrativeMinutesHtml(facts, {
      title: session.title,
      date: session.startTime,
      scope: session.scopeType,
    });

    // Save notes
    await upsertTrainingNotes({
      sessionId,
      factsJson: JSON.stringify(facts),
      narrativeHtml: html,
    });

    // mark success
    await upsertTrainingArtifact({
      sessionId,
      type: "ai_notes",
      source: "ozeki_ai",
      status: "available",
    });

  } catch (error) {
    console.error(`Failed AI Notes generation for session ${sessionId}`, error);
    // mark failed
    await upsertTrainingArtifact({
      sessionId,
      type: "ai_notes",
      source: "ozeki_ai",
      status: "failed",
    });
  }
}
