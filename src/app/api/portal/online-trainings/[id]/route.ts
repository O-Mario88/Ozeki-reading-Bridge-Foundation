import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOnlineTrainingEventById,
  saveOnlineTrainingAttendance,
} from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const updateSchema = z.object({
  onlineTeachersTrained: z.coerce.number().int().min(0),
  onlineSchoolLeadersTrained: z.coerce.number().int().min(0),
  attendeeCount: z.coerce.number().int().min(0).optional(),
  recordingUrl: z.string().trim().url().optional().or(z.literal("")),
  chatSummary: z.string().trim().max(5000).optional(),
});

function parseEventId(value: string) {
  const eventId = Number(value);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new Error("Invalid event ID.");
  }
  return eventId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const eventId = parseEventId(id);
    const event = getOnlineTrainingEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error." },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const eventId = parseEventId(id);
    const payload = updateSchema.parse(await request.json());
    const event = saveOnlineTrainingAttendance(eventId, {
      onlineTeachersTrained: payload.onlineTeachersTrained,
      onlineSchoolLeadersTrained: payload.onlineSchoolLeadersTrained,
      attendeeCount: payload.attendeeCount,
      recordingUrl: payload.recordingUrl || null,
      chatSummary: payload.chatSummary || null,
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid update payload." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error." },
      { status: 400 },
    );
  }
}
