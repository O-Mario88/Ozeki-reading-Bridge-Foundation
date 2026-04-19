import { calendar_v3 } from "googleapis";
import {
  createGoogleCalendarClient,
  createGoogleMeetClient,
  createGoogleOAuthClient,
  getGoogleWorkspaceConfig,
} from "@/lib/google-workspace";

export async function getGoogleAuthClient() {
  return createGoogleOAuthClient();
}

export type MeetEventResult = {
  calendarEventId: string;
  meetJoinUrl: string;
};

/**
 * Creates a Google Calendar event with a Google Meet conference attached.
 */
export async function createMeetEvent(
  title: string,
  description: string,
  startTime: string,
  endTime: string,
  timezone: string = "UTC"
): Promise<MeetEventResult> {
  const calendar = createGoogleCalendarClient();
  const calendarId = getGoogleWorkspaceConfig().calendarId || "primary";

  const event: calendar_v3.Schema$Event = {
    summary: title,
    description: description,
    start: {
      dateTime: startTime,
      timeZone: timezone,
    },
    end: {
      dateTime: endTime,
      timeZone: timezone,
    },
    conferenceData: {
      createRequest: {
        requestId: `ozeki-training-${Date.now()}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
    conferenceDataVersion: 1, // Must be 1 to create conference data
  });

  const createdEvent = res.data;
  const meetJoinUrl = createdEvent.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  )?.uri;

  return {
    calendarEventId: createdEvent.id || "",
    meetJoinUrl: meetJoinUrl || "",
  };
}

/**
 * Sync Meet Artifacts (Transcripts and Recordings)
 * Google Meet API (Spaces/ConferenceRecords) allows fetching artifacts.
 * Currently, googleapis supports this via the 'meet' API (v2 or v1beta).
 */
export async function getMeetArtifactsMetadata(conferenceRecordId: string) {
  // Using discovery or meet client if available. This is a generic implementation.
  const meet = createGoogleMeetClient();

  try {
    await meet.conferenceRecords.get({ name: conferenceRecordId });
    // In a full implementation, you'd list recordings and transcripts
    const recordingsRes = await meet.conferenceRecords.recordings.list({ parent: conferenceRecordId });
    const transcriptsRes = await meet.conferenceRecords.transcripts.list({ parent: conferenceRecordId });

    return {
      recordings: recordingsRes.data.recordings || [],
      transcripts: transcriptsRes.data.transcripts || [],
    };
  } catch (error) {
    const { logger } = await import("@/lib/logger");
    logger.error("[google-meet-sync] Failed to fetch Meet artifacts", { error: String(error) });
    return { recordings: [], transcripts: [] };
  }
}

/**
 * Downloads a specific transcript
 */
export async function downloadTranscriptContent(transcriptName: string): Promise<string> {
  const meet = createGoogleMeetClient();

  try {
    // List transcript entries
    const entriesRes = await meet.conferenceRecords.transcripts.entries.list({ parent: transcriptName });
    const entries = (entriesRes.data as Record<string, unknown>).entries as Array<Record<string, string>> || [];

    // Combine text
    return entries.map((e: Record<string, string>) => `[${e.participant}] ${e.text}`).join("\n");
  } catch (error) {
    const { logger } = await import("@/lib/logger");
    logger.error("[google-meet-sync] Failed to download transcript", { error: String(error) });
    throw error;
  }
}
