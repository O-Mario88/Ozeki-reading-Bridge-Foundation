import { NextResponse } from "next/server";
import { listOnlineTrainingSessions } from "@/lib/training-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessions = await listOnlineTrainingSessions({
      includeDrafts: false,
      limit: 120,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("List public training sessions failed:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
