import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal-auth";
import { ensureTrainingSchema, createTrainingSession, updateTrainingSessionGoogleLinks } from "@/lib/training-db";
import { createMeetEvent } from "@/lib/google-meet-sync";

type TrainingSessionRow = Record<string, unknown> & {
  host_user_id: number | null;
};

export async function GET() {
  try {
    const user = await requirePortalUser();
    ensureTrainingSchema();
    const db = getDb();

    const isAdmin = user.isAdmin || user.isSuperAdmin;

    const sessions = db.prepare(`
          SELECT s.*, u.full_name as host_name 
          FROM training_sessions s
          LEFT JOIN portal_users u ON s.host_user_id = u.id
          ORDER BY s.start_time DESC
        `).all() as TrainingSessionRow[];

    const filtered = isAdmin
      ? sessions
      : sessions.filter((s) => Number(s.host_user_id) === user.id);

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
    const sessionId = createTrainingSession({
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
      updateTrainingSessionGoogleLinks(sessionId, calendarEventId, meetJoinUrl, null);
    }

    return NextResponse.json({ id: sessionId, calendarEventId, meetJoinUrl });
  } catch (error) {
    console.error("Create training session failed:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
