import { google, calendar_v3 } from "googleapis";

// Assuming we have some way to get an authenticated OAuth2 client for the system or a specific user
// In a real app, you'd load credentials from DB or Vault. For this feature, we simulate retrieving it.
export async function getGoogleAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Example: load tokens from a portal_settings table or env for testing
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
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
  const auth = await getGoogleAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

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
    calendarId: "primary",
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
  const auth = await getGoogleAuthClient();
  // Using discovery or meet client if available. This is a generic implementation.
  const meet = google.meet({ version: "v2", auth });

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
    console.error("Failed to fetch Meet artifacts", error);
    return { recordings: [], transcripts: [] };
  }
}

/**
 * Downloads a specific transcript
 */
export async function downloadTranscriptContent(transcriptName: string): Promise<string> {
  const auth = await getGoogleAuthClient();
  const meet = google.meet({ version: "v2", auth });

  try {
    // List transcript entries
    const entriesRes = await meet.conferenceRecords.transcripts.entries.list({ parent: transcriptName });
    const entries = (entriesRes.data as Record<string, unknown>).entries as Array<Record<string, string>> || [];

    // Combine text
    return entries.map((e: Record<string, string>) => `[${e.participant}] ${e.text}`).join("\n");
  } catch (error) {
    console.error("Failed to download transcript", error);
    throw error;
  }
}
