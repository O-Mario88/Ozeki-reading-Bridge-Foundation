import crypto from "node:crypto";
import {
  createGoogleCalendarClient,
  getRequiredEnv,
  isGoogleWorkspaceConfigured,
} from "@/lib/google-workspace";
import { logger } from "@/lib/logger";

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

export function isGoogleCalendarConfigured() {
  return isGoogleWorkspaceConfigured();
}

export async function createGoogleCalendarEvent(
  input: CalendarEventInput,
): Promise<CalendarEventResult> {
  const calendarId = getRequiredEnv("GOOGLE_CALENDAR_ID");
  const calendar = createGoogleCalendarClient();

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

export async function addAttendeeToCalendarEvent(eventId: string, email: string) {
  if (!isGoogleCalendarConfigured()) return false;
  
  const calendarId = getRequiredEnv("GOOGLE_CALENDAR_ID");
  const calendar = createGoogleCalendarClient();

  try {
    const event = await calendar.events.get({
      calendarId,
      eventId,
    });

    const currentAttendees = event.data.attendees || [];
    const cleanEmail = email.trim().toLowerCase();

    // Avoid duplicating users
    if (currentAttendees.some(a => a.email === cleanEmail)) {
      return true;
    }

    currentAttendees.push({ email: cleanEmail });

    await calendar.events.patch({
      calendarId,
      eventId,
      sendUpdates: "all",
      requestBody: {
        attendees: currentAttendees,
      },
    });

    return true;
  } catch (error) {
    logger.error(`[google-calendar] Failed to add attendee ${email}`, { error: String(error) });
    return false;
  }
}

export async function removeAttendeeFromCalendarEvent(eventId: string, email: string) {
  if (!isGoogleCalendarConfigured()) return false;

  const calendarId = getRequiredEnv("GOOGLE_CALENDAR_ID");
  const calendar = createGoogleCalendarClient();

  try {
    const event = await calendar.events.get({ calendarId, eventId });
    const cleanEmail = email.trim().toLowerCase();
    const updatedAttendees = (event.data.attendees ?? []).filter(
      (a) => a.email?.toLowerCase() !== cleanEmail,
    );

    await calendar.events.patch({
      calendarId,
      eventId,
      sendUpdates: "all",
      requestBody: { attendees: updatedAttendees },
    });

    return true;
  } catch (error) {
    logger.error(`[google-calendar] Failed to remove attendee ${email}`, { error: String(error) });
    return false;
  }
}

export async function updateCalendarEventAttendees(eventId: string, attendeeEmails: string[]) {
  if (!isGoogleCalendarConfigured()) return false;

  const calendarId = getRequiredEnv("GOOGLE_CALENDAR_ID");
  const calendar = createGoogleCalendarClient();

  try {
    const attendees = attendeeEmails
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .map((email) => ({ email }));

    await calendar.events.patch({
      calendarId,
      eventId,
      sendUpdates: "all",
      requestBody: { attendees },
    });

    return true;
  } catch (error) {
    logger.error("[google-calendar] Failed to sync attendees", { eventId, error: String(error) });
    return false;
  }
}

export async function updateGoogleCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>,
): Promise<boolean> {
  if (!isGoogleCalendarConfigured()) return false;

  const calendarId = getRequiredEnv("GOOGLE_CALENDAR_ID");
  const calendar = createGoogleCalendarClient();

  try {
    const patch: Record<string, unknown> = {};

    if (input.summary !== undefined) patch.summary = input.summary;
    if (input.description !== undefined) patch.description = input.description;
    if (input.location !== undefined) patch.location = input.location;
    if (input.startDateTime !== undefined)
      patch.start = { dateTime: input.startDateTime, timeZone: DEFAULT_TIMEZONE };
    if (input.endDateTime !== undefined)
      patch.end = { dateTime: input.endDateTime, timeZone: DEFAULT_TIMEZONE };
    if (input.attendeeEmails !== undefined)
      patch.attendees = input.attendeeEmails
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
        .map((email) => ({ email }));

    await calendar.events.patch({
      calendarId,
      eventId,
      sendUpdates: "all",
      requestBody: patch,
    });

    return true;
  } catch (error) {
    logger.error("[google-calendar] Failed to update event", { eventId, error: String(error) });
    return false;
  }
}

export async function deleteGoogleCalendarEvent(eventId: string): Promise<boolean> {
  if (!isGoogleCalendarConfigured()) return false;

  const calendarId = getRequiredEnv("GOOGLE_CALENDAR_ID");
  const calendar = createGoogleCalendarClient();

  try {
    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: "all",
    });
    return true;
  } catch (error) {
    logger.error("[google-calendar] Failed to delete event", { eventId, error: String(error) });
    return false;
  }
}
