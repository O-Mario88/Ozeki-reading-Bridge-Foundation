import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { getTrainingSession } from "@/lib/training-db";
import {
  listChaptersPostgres,
  createChapterPostgres,
} from "@/lib/server/postgres/repositories/training-chapters";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  startSeconds: z.coerce.number().int().min(0).max(86400),
  sortOrder: z.coerce.number().int().optional(),
});

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalUser();
    const { id } = await params;
    const chapters = await listChaptersPostgres(Number(id));
    return NextResponse.json({ chapters });
  } catch (error) {
    logger.error("[chapters] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    const sessionId = Number(id);
    const session = await getTrainingSession(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

    const isHost = user.isAdmin || user.isSuperAdmin || session.hostUserId === user.id || session.createdByUserId === user.id;
    if (!isHost) return NextResponse.json({ error: "Only host/admin can add chapters." }, { status: 403 });

    const parsed = createSchema.parse(await req.json());
    const chapter = await createChapterPostgres({ ...parsed, sessionId, createdByUserId: user.id });
    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[chapters] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
