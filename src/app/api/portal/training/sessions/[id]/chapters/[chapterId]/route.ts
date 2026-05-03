import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import { getTrainingSession } from "@/lib/training-db";
import {
  updateChapterPostgres,
  deleteChapterPostgres,
} from "@/lib/server/postgres/repositories/training-chapters";
import { logger } from "@/lib/logger";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; chapterId: string }> };

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  startSeconds: z.coerce.number().int().min(0).max(86400).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

async function requireHost(sessionId: number, userId: number, isAdmin: boolean) {
  if (isAdmin) return true;
  const session = await getTrainingSession(sessionId);
  if (!session) return false;
  return session.hostUserId === userId || session.createdByUserId === userId;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id, chapterId } = await params;
    if (!(await requireHost(Number(id), user.id, user.isAdmin || user.isSuperAdmin))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const parsed = updateSchema.parse(await req.json());
    await updateChapterPostgres(Number(chapterId), parsed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[chapters/id] PATCH failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id, chapterId } = await params;
    if (!(await requireHost(Number(id), user.id, user.isAdmin || user.isSuperAdmin))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    await deleteChapterPostgres(Number(chapterId));
    await auditLog({
      actor: user,
      action: "delete",
      targetTable: "training_session_chapters",
      targetId: Number(chapterId),
      detail: `From session ${id}`,
      request: req,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[chapters/id] DELETE failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
