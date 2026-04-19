import { NextRequest, NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getTrainingSession, endTrainingSession } from "@/lib/training-db";
import { logger } from "@/lib/logger";
import { syncMeetArtifactsJob, generateAiMeetingNotesJob } from "@/lib/training-jobs";

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
      return NextResponse.json({ error: "Only the host or an admin can end this session." }, { status: 403 });
    }

    if (session.status === "completed") {
      return NextResponse.json({ ok: true, alreadyEnded: true });
    }

    if (session.status !== "live") {
      return NextResponse.json({ error: `Cannot end a session with status '${session.status}'.` }, { status: 400 });
    }

    await endTrainingSession(sessionId, user.id);

    // Fire-and-forget post-session artifact pipeline
    if (session.conferenceRecordId) {
      syncMeetArtifactsJob(sessionId)
        .then(() => generateAiMeetingNotesJob(sessionId))
        .catch((err) =>
          logger.warn("[training/end] post-session artifact pipeline failed (non-fatal)", { error: String(err) }),
        );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[training/sessions/end] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
