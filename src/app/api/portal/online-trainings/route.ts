import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getPortalUserFromSession } from "@/services/dataService";
import { workspaceCalendarRecipients } from "@/lib/contact";
import {
  buildDateRangeFromDateAndTime,
  createGoogleCalendarEvent,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { createOnlineTrainingSessionPostgres, listOnlineTrainingSessionsPostgres } from "@/lib/server/postgres/repositories/training";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

const onlineTrainingSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  agenda: z.string().optional(),
  audience: z.string().min(2),
  topic: z.string().optional(),
  resourceUrl: z.string().optional().or(z.literal("")),
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

  return await getPortalUserFromSession(token);
}

export async function GET() {
  const user = await requireAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessions = await listOnlineTrainingSessionsPostgres({ includeDrafts: true });
  
  // Format to match what PortalEventsManager expects currently
  const events = sessions.map(s => ({
    id: s.id,
    title: s.title,
    audience: s.audience,
    startDateTime: s.startTime,
    endDateTime: s.endTime,
    attendeeCount: s.attendeeCount,
    onlineTeachersTrained: s.onlineTeachersTrained,
    onlineSchoolLeadersTrained: s.onlineSchoolLeadersTrained,
    calendarLink: s.calendarLink,
    meetLink: s.meetJoinUrl,
  }));

  return NextResponse.json({ events });
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

    if (!isGoogleCalendarConfigured()) {
      calendarWarning =
        "Google Calendar is not configured. Event saved without Calendar invite or Meet link.";
    } else {
      try {
        const calendarResult = await createGoogleCalendarEvent({
          summary: payload.title,
          description: payload.description,
          startDateTime: dateRange.startDateTime,
          endDateTime: dateRange.endDateTime,
          attendeeEmails,
          createMeet: true,
        });

        calendarEventId = calendarResult.eventId;
        calendarLink = calendarResult.htmlLink;
        meetLink = calendarResult.meetLink;

        if (!meetLink) {
          calendarWarning =
            "Calendar event created but Google Meet link was not generated. You can retry from the event row.";
        }
      } catch {
        calendarWarning =
          "Could not create Google Calendar event. Event saved without Calendar or Meet links.";
      }
    }

    const sessionId = await createOnlineTrainingSessionPostgres({
      title: payload.title,
      description: payload.description,
      agenda: payload.agenda || 'TBD',
      audience: payload.audience,
      programTags: payload.topic ? [payload.topic] : [],
      attendeeEmails,
      startTime: dateRange.startDateTime,
      endTime: dateRange.endDateTime,
      hostUserId: user.id,
      calendarEventId,
      calendarLink,
      meetJoinUrl: meetLink,
      createdByUserId: user.id,
      status: 'scheduled',
      visibility: 'public'
    });
    
    // Attach the locked resource link if the admin provided one
    if (payload.resourceUrl && payload.resourceUrl.trim() !== '') {
       await queryPostgres(
         `INSERT INTO online_training_resources (session_id, title, external_url, visibility, uploaded_by_user_id) VALUES ($1, $2, $3, 'public', $4)`,
         [sessionId, "Training Materials (External Link)", payload.resourceUrl, user.id]
       );
    }

    const eventResponse = {
      id: sessionId,
      title: payload.title,
      audience: payload.audience,
      startDateTime: dateRange.startDateTime,
      endDateTime: dateRange.endDateTime,
      attendeeCount: 0,
      onlineTeachersTrained: 0,
      onlineSchoolLeadersTrained: 0,
      calendarLink,
      meetLink,
    };

    return NextResponse.json({
      ok: true,
      event: eventResponse,
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
