import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  listOnlineTrainingEvents,
  getPortalUserFromSession,
  saveOnlineTrainingEvent,
} from "@/lib/db";
import { workspaceCalendarRecipients } from "@/lib/contact";
import {
  buildDateRangeFromDateAndTime,
  createGoogleCalendarEvent,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";

export const runtime = "nodejs";

const onlineTrainingSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  audience: z.string().min(2),
  startDate: z.string().min(6),
  startTime: z.string().min(3),
  durationMinutes: z.coerce.number().int().min(15).max(720),
  attendeeEmails: z.array(z.string().email()).optional(),
});

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return getPortalUserFromSession(token);
}

export async function GET() {
  const user = await requireAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ events: listOnlineTrainingEvents(20) });
}

export async function POST(request: Request) {
  const user = await requireAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = onlineTrainingSchema.parse(await request.json());
    const attendeeEmails = [...workspaceCalendarRecipients, ...(payload.attendeeEmails ?? [])]
      .map((email) => email.trim().toLowerCase())
      .filter((email, index, list) => email && list.indexOf(email) === index);

    const dateRange = buildDateRangeFromDateAndTime(
      payload.startDate,
      payload.startTime,
      payload.durationMinutes,
    );

    let calendarEventId: string | null = null;
    let calendarLink: string | null = null;
    let meetLink: string | null = null;
    let calendarWarning: string | undefined;

    if (isGoogleCalendarConfigured()) {
      try {
        const event = await createGoogleCalendarEvent({
          summary: payload.title,
          description: payload.description,
          startDateTime: dateRange.startDateTime,
          endDateTime: dateRange.endDateTime,
          attendeeEmails,
          createMeet: true,
        });

        calendarEventId = event.eventId;
        calendarLink = event.htmlLink;
        meetLink = event.meetLink;
      } catch {
        calendarWarning =
          "Online training saved, but Google Calendar/Meet integration failed.";
      }
    } else {
      calendarWarning =
        "Google Calendar integration is not configured. Session saved without invite/Meet link.";
    }

    const event = saveOnlineTrainingEvent(
      {
        ...payload,
        attendeeEmails,
        startDateTime: dateRange.startDateTime,
        endDateTime: dateRange.endDateTime,
        calendarEventId,
        calendarLink,
        meetLink,
      },
      user.id,
    );

    return NextResponse.json({
      ok: true,
      event,
      calendarWarning,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid online training payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
