import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  updateDiscussionPostPostgres,
  deleteDiscussionPostPostgres,
  pinDiscussionPostPostgres,
} from "@/lib/server/postgres/repositories/training-discussions";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; postId: string }> };

const patchSchema = z.object({
  body: z.string().trim().min(1).max(5000).optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { postId } = await params;
    const parsed = patchSchema.parse(await req.json());
    const isAdmin = user.isAdmin || user.isSuperAdmin;

    if (parsed.pinned !== undefined) {
      if (!isAdmin) return NextResponse.json({ error: "Only admins can pin posts." }, { status: 403 });
      await pinDiscussionPostPostgres(Number(postId), parsed.pinned);
    }
    if (parsed.body !== undefined) {
      await updateDiscussionPostPostgres(Number(postId), user.id, parsed.body);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[discussions/id] PATCH failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { postId } = await params;
    const isAdmin = user.isAdmin || user.isSuperAdmin;
    await deleteDiscussionPostPostgres(Number(postId), user.id, isAdmin);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[discussions/id] DELETE failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
