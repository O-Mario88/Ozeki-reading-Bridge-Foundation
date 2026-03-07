import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureTrainingSchema } from "@/lib/training-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    ensureTrainingSchema();
    const db = getDb();

    const sessions = db.prepare(`
          SELECT id, title, agenda, program_tags, scope_type, start_time, end_time, status
          FROM training_sessions
          WHERE status IN ('scheduled', 'live', 'completed')
          ORDER BY start_time ASC
        `).all();

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("List public training sessions failed:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
