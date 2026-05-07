import { NextResponse } from "next/server";
import { listOnlineTrainingSessions } from "@/lib/training-db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessions = await listOnlineTrainingSessions({
      includeDrafts: false,
      limit: 120,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    logger.error("List public training sessions failed", { error: error instanceof Error ? error.message : String(error) });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
