import { NextRequest, NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getTrainingSession } from "@/lib/training-db";
import { syncMeetArtifactsJob, generateAiMeetingNotesJob, syncConferenceRecordJob } from "@/lib/training-jobs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requirePortalUser();

        if (!user.isAdmin && !user.isSuperAdmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { id } = await params;
        const sessionId = parseInt(id, 10);
        const session = await getTrainingSession(sessionId);

        if (!session) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const body = await req.json();
        const { action } = body;

        if (action === "sync_artifacts") {
            if (!session.conferenceRecordId) {
                await syncConferenceRecordJob(sessionId);
            }
            syncMeetArtifactsJob(sessionId).catch((err) => logger.error("[portal/training/sessions/:id/sync] artifact sync job failed", { error: err instanceof Error ? err.message : String(err) }));
            return NextResponse.json({ success: true, message: "Artifact sync started" });
        }

        if (action === "generate_notes") {
            generateAiMeetingNotesJob(sessionId).catch((err) => logger.error("[portal/training/sessions/:id/sync] AI notes job failed", { error: err instanceof Error ? err.message : String(err) }));
            return NextResponse.json({ success: true, message: "AI Notes generation started" });
        }

        return new NextResponse("Invalid action", { status: 400 });

    } catch (error) {
        logger.error("[portal/training/sessions/:id/sync] sync action failed", { error: error instanceof Error ? error.message : String(error) });
        return new NextResponse("Internal Error", { status: 500 });
    }
}
