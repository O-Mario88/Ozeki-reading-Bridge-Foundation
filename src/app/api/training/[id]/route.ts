import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureTrainingSchema, getTrainingSession } from "@/lib/training-db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id, 10);
    const session = getTrainingSession(sessionId);

    if (!session || session.status === 'draft' || session.status === 'canceled') {
      return new NextResponse("Not Found or Unavailable", { status: 404 });
    }

    ensureTrainingSchema();
    const db = getDb();

    const resources = db.prepare(
      `SELECT * FROM training_resources WHERE session_id = ?`
    ).all(sessionId);

    const artifacts = db.prepare(
      `SELECT type, status FROM training_artifacts WHERE session_id = ?`
    ).all(sessionId);

    return NextResponse.json({ session, resources, artifacts });
  } catch (error) {
    console.error("Fetch training session failed:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
