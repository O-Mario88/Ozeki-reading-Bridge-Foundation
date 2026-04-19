import { NextRequest, NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getTrainingSession, updateTrainingSession, cancelTrainingSession } from "@/lib/training-db";
import {
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateCalendarEventAttendees,
} from "@/lib/google-calendar";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    const sessionId = parseInt(id, 10);
    const session = await getTrainingSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const isAdmin = user.isAdmin || user.isSuperAdmin;
    if (!isAdmin && Number(session.hostUserId) !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    logger.error("[training/sessions/[id]] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const sessionId = parseInt(id, 10);
    const session = await getTrainingSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    if (session.status === "canceled") {
      return NextResponse.json({ error: "Cannot update a canceled session." }, { status: 400 });
    }

    const body = await req.json();
    const { title, agenda, objectives, description, startTime, endTime, timezone, attendeeEmails } = body;

    await updateTrainingSession(sessionId, {
      title,
      agenda,
      objectives,
      description,
      startTime,
      endTime,
      timezone,
      attendeeEmails,
      updatedByUserId: user.id,
    });

    // Sync changes to the linked Google Calendar event
    if (session.calendarEventId) {
      const calendarPatch: Parameters<typeof updateGoogleCalendarEvent>[1] = {};
      if (title !== undefined) calendarPatch.summary = title;
      if (agenda !== undefined) calendarPatch.description = agenda;
      if (startTime !== undefined) calendarPatch.startDateTime = startTime;
      if (endTime !== undefined) calendarPatch.endDateTime = endTime;

      if (Object.keys(calendarPatch).length > 0) {
        await updateGoogleCalendarEvent(session.calendarEventId, calendarPatch).catch((err) =>
          logger.warn("[training/sessions/[id]] Calendar event update failed", { error: String(err) }),
        );
      }

      if (attendeeEmails !== undefined) {
        await updateCalendarEventAttendees(session.calendarEventId, attendeeEmails).catch((err) =>
          logger.warn("[training/sessions/[id]] Calendar attendee sync failed", { error: String(err) }),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[training/sessions/[id]] PATCH failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const sessionId = parseInt(id, 10);
    const session = await getTrainingSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    if (session.status === "canceled") {
      return NextResponse.json({ error: "Session is already canceled." }, { status: 400 });
    }

    await cancelTrainingSession(sessionId, user.id);

    // Remove the Google Calendar event so attendees get cancellation notices
    if (session.calendarEventId) {
      await deleteGoogleCalendarEvent(session.calendarEventId).catch((err) =>
        logger.warn("[training/sessions/[id]] Calendar event deletion failed", { error: String(err) }),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[training/sessions/[id]] DELETE failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
