import { NextRequest, NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/portal-auth";
import {
  createTrainingSession,
  listOnlineTrainingSessions,
  updateTrainingSessionGoogleLinks,
} from "@/lib/training-db";
import { createMeetEvent } from "@/lib/google-meet-sync";

export async function GET() {
  try {
    const user = await requirePortalUser();

    const isAdmin = user.isAdmin || user.isSuperAdmin;
    const sessions = await listOnlineTrainingSessions({
      includeDrafts: true,
      limit: 200,
    });

    const filtered = isAdmin
      ? sessions
      : sessions.filter((session) => Number(session.hostUserId) === user.id);

    return NextResponse.json({ sessions: filtered });
  } catch (error) {
    console.error("List training sessions failed:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { title, agenda, objectives, programTags, scopeType, scopeId, startTime, endTime, timezone, hostUserId } = body;

    if (!title || !agenda || !startTime || !endTime || !hostUserId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Step 1: Create Calendar Event with Meet Link
    let calendarEventId = "";
    let meetJoinUrl = "";
    try {
      const eventRes = await createMeetEvent(title, agenda, startTime, endTime, timezone || "UTC");
      calendarEventId = eventRes.calendarEventId;
      meetJoinUrl = eventRes.meetJoinUrl;
    } catch (apiErr) {
      console.warn("Could not create Meet event, continuing without it.", apiErr);
    }

    // Step 2: Create DB Record
    const sessionId = await createTrainingSession({
      title,
      agenda,
      objectives,
      programTags: programTags || [],
      scopeType: scopeType || "country",
      scopeId,
      startTime,
      endTime,
      timezone: timezone || "UTC",
      hostUserId: parseInt(hostUserId, 10),
      createdByUserId: user.id,
      status: "scheduled",
    });

    // Update newly created record with Google links
    if (calendarEventId) {
      await updateTrainingSessionGoogleLinks(sessionId, calendarEventId, meetJoinUrl, null);
    }

    return NextResponse.json({ id: sessionId, calendarEventId, meetJoinUrl });
  } catch (error) {
    console.error("Create training session failed:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
