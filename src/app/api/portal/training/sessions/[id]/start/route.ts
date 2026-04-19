import { NextRequest, NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getTrainingSession, startTrainingSession } from "@/lib/training-db";
import { logger } from "@/lib/logger";
import { syncConferenceRecordJob } from "@/lib/training-jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    const sessionId = Number(id);

    const session = await getTrainingSession(sessionId);
    if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const isHost = session.hostUserId === user.id || session.createdByUserId === user.id;
    if (!user.isAdmin && !user.isSuperAdmin && !isHost) {
      return NextResponse.json({ error: "Only the host or an admin can start this session." }, { status: 403 });
    }

    if (session.status === "live") {
      return NextResponse.json({ ok: true, meetJoinUrl: session.meetJoinUrl, alreadyLive: true });
    }

    if (!["scheduled", "draft"].includes(session.status)) {
      return NextResponse.json({ error: `Cannot start a session with status '${session.status}'.` }, { status: 400 });
    }

    await startTrainingSession(sessionId, user.id);

    // Fire-and-forget: attempt to sync the conference record ID so artifact
    // collection can begin as soon as the meeting finishes.
    if (session.calendarEventId) {
      syncConferenceRecordJob(sessionId).catch((err) =>
        logger.warn("[training/start] syncConferenceRecordJob failed (non-fatal)", { error: String(err) }),
      );
    }

    return NextResponse.json({ ok: true, meetJoinUrl: session.meetJoinUrl });
  } catch (error) {
    logger.error("[training/sessions/start] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
