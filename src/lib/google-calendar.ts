import crypto from "node:crypto";
import { google } from "googleapis";

const DEFAULT_TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE ?? "Africa/Kampala";

export interface CalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmails?: string[];
  createMeet?: boolean;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink: string | null;
  meetLink: string | null;
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_CALENDAR_ID,
  );
}

function getCalendarClient() {
  const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getRequiredEnv("GOOGLE_CLIENT_SECRET");
  const refreshToken = getRequiredEnv("GOOGLE_REFRESH_TOKEN");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function createGoogleCalendarEvent(
  input: CalendarEventInput,
): Promise<CalendarEventResult> {
  const calendarId = getRequiredEnv("GOOGLE_CALENDAR_ID");
  const calendar = getCalendarClient();

  const response = await calendar.events.insert({
    calendarId,
    sendUpdates: "all",
    conferenceDataVersion: input.createMeet ? 1 : 0,
    requestBody: {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: {
        dateTime: input.startDateTime,
        timeZone: DEFAULT_TIMEZONE,
      },
      end: {
        dateTime: input.endDateTime,
        timeZone: DEFAULT_TIMEZONE,
      },
      attendees: (input.attendeeEmails ?? [])
        .filter((email) => email.trim().length > 0)
        .map((email) => ({ email })),
      conferenceData: input.createMeet
        ? {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: {
                type: "hangoutsMeet",
              },
            },
          }
        : undefined,
    },
  });

  const event = response.data;
  const meetLink =
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")
      ?.uri ??
    null;

  return {
    eventId: event.id ?? "",
    htmlLink: event.htmlLink ?? null,
    meetLink,
  };
}

function addMinutes(date: string, time: string, minutes: number) {
  const [hourPart, minutePart] = time.split(":").map((value) => Number(value));
  const totalMinutes = hourPart * 60 + minutePart + minutes;
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

  const hours = Math.floor(normalizedMinutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (normalizedMinutes % 60).toString().padStart(2, "0");

  const dateObject = new Date(`${date}T00:00:00Z`);
  dateObject.setUTCDate(dateObject.getUTCDate() + dayOffset);
  const nextDate = dateObject.toISOString().slice(0, 10);

  return `${nextDate}T${hours}:${mins}:00`;
}

export function buildDateRangeFromDateAndTime(
  date: string,
  time: string,
  durationMinutes: number,
) {
  const startDateTime = `${date}T${time}:00`;
  const endDateTime = addMinutes(date, time, durationMinutes);

  return {
    startDateTime,
    endDateTime,
  };
}
