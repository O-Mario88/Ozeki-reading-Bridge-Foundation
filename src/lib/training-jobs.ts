import { getDb } from "./db";
import { getTrainingSession, ensureTrainingSchema } from "./training-db";
import { getMeetArtifactsMetadata, downloadTranscriptContent } from "./google-meet-sync";
import { generateMeetingFacts, formatNarrativeMinutesHtml } from "./training-ai";

/**
 * 1) SyncConferenceRecordJob
 * For a given session, check if it has a conference record (from Calendar/Meet link).
 */
export async function syncConferenceRecordJob(sessionId: number): Promise<void> {
  const session = getTrainingSession(sessionId);
  if (!session) return;
  console.log(`SyncConferenceRecordJob for ${sessionId} (noop placeholder)`);
}

/**
 * 2) SyncMeetArtifactsJob
 * Pull metadata for recordings and transcripts, update training_artifacts
 */
export async function syncMeetArtifactsJob(sessionId: number): Promise<void> {
  const session = getTrainingSession(sessionId);
  if (!session || !session.conferenceRecordId) return;

  ensureTrainingSchema();
  const db = getDb();

  try {
    const { recordings, transcripts } = await getMeetArtifactsMetadata(session.conferenceRecordId);
    const now = new Date().toISOString();

    // Process top recording (if multiple)
    if (recordings.length > 0) {
      const rec = recordings[0] as Record<string, unknown>;
      db.prepare(
        `INSERT INTO training_artifacts (session_id, type, source, source_url, status, created_at, updated_at)
         VALUES (?, 'recording', 'google_meet', ?, 'available', ?, ?)
         ON CONFLICT(session_id, type) DO UPDATE SET source_url=?, status='available', updated_at=?`
      ).run(sessionId, (rec as Record<string, unknown>).driveDestination || (rec as Record<string, unknown>).name || '', now, now, (rec as Record<string, unknown>).driveDestination || (rec as Record<string, unknown>).name || '', now);
    } else {
      db.prepare(
        `INSERT INTO training_artifacts (session_id, type, source, status, created_at, updated_at)
         VALUES (?, 'recording', 'google_meet', 'not_available', ?, ?)
         ON CONFLICT(session_id, type) DO UPDATE SET status='not_available', updated_at=?`
      ).run(sessionId, now, now, now);
    }

    // Process top transcript
    if (transcripts.length > 0) {
      const trans = transcripts[0] as Record<string, unknown>;
      const docsDestination = trans.docsDestination as Record<string, unknown> | undefined;
      const sourceUrl = docsDestination?.document || trans.name || '';
      db.prepare(
        `INSERT INTO training_artifacts (session_id, type, source, source_url, status, created_at, updated_at)
         VALUES (?, 'transcript', 'google_meet', ?, 'available', ?, ?)
         ON CONFLICT(session_id, type) DO UPDATE SET source_url=?, status='available', updated_at=?`
      ).run(sessionId, sourceUrl, now, now, sourceUrl, now);
    } else {
      db.prepare(
        `INSERT INTO training_artifacts (session_id, type, source, status, created_at, updated_at)
         VALUES (?, 'transcript', 'google_meet', 'not_available', ?, ?)
         ON CONFLICT(session_id, type) DO UPDATE SET status='not_available', updated_at=?`
      ).run(sessionId, now, now, now);
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
  const session = getTrainingSession(sessionId);
  if (!session) return;

  ensureTrainingSchema();
  const db = getDb();

  // Check transcript artifact
  const transRow = db.prepare(
    `SELECT * FROM training_artifacts WHERE session_id=? AND type='transcript'`
  ).get(sessionId) as Record<string, unknown> | undefined;

  if (!transRow || transRow.status !== 'available' || !transRow.source_url) {
    console.log(`No available transcript for session ${sessionId}. Skipping AI notes.`);
    return;
  }

  const now = new Date().toISOString();

  // Mark AI notes as processing
  db.prepare(
    `INSERT INTO training_artifacts (session_id, type, source, status, created_at, updated_at)
     VALUES (?, 'ai_notes', 'ozeki_ai', 'processing', ?, ?)
     ON CONFLICT(session_id, type) DO UPDATE SET status='processing', updated_at=?`
  ).run(sessionId, now, now, now);

  try {
    // Download the transcript text
    const transcriptText = await downloadTranscriptContent(transRow.source_url as string);

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
    db.prepare(
      `INSERT INTO training_notes (session_id, facts_json, narrative_html, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET facts_json=?, narrative_html=?, updated_at=?`
    ).run(sessionId, JSON.stringify(facts), html, now, now, JSON.stringify(facts), html, now);

    // mark success
    db.prepare(
      `UPDATE training_artifacts SET status='available', updated_at=? WHERE session_id=? AND type='ai_notes'`
    ).run(now, sessionId);

  } catch (error) {
    console.error(`Failed AI Notes generation for session ${sessionId}`, error);
    // mark failed
    db.prepare(
      `UPDATE training_artifacts SET status='failed', updated_at=? WHERE session_id=? AND type='ai_notes'`
    ).run(now, sessionId);
  }
}
