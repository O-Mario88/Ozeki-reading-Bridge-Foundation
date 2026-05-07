import { NextRequest, NextResponse } from "next/server";
import {
  getTrainingSession,
  listTrainingArtifacts,
  listTrainingResources,
} from "@/lib/training-db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id, 10);
    const session = await getTrainingSession(sessionId);

    if (!session || session.status === 'draft' || session.status === 'canceled') {
      return new NextResponse("Not Found or Unavailable", { status: 404 });
    }

    const [resources, artifacts] = await Promise.all([
      listTrainingResources(sessionId),
      listTrainingArtifacts(sessionId),
    ]);

    return NextResponse.json({ session, resources, artifacts });
  } catch (error) {
    logger.error("Fetch training session failed", { error: error instanceof Error ? error.message : String(error) });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
