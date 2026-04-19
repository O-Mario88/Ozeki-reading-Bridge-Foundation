import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  listDiscussionsPostgres,
  createDiscussionPostPostgres,
} from "@/lib/server/postgres/repositories/training-discussions";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const createSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  parentId: z.coerce.number().int().positive().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalUser();
    const { id } = await params;
    const posts = await listDiscussionsPostgres(Number(id));
    return NextResponse.json({ posts });
  } catch (error) {
    logger.error("[discussions] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    const parsed = createSchema.parse(await req.json());
    const post = await createDiscussionPostPostgres({
      sessionId: Number(id),
      parentId: parsed.parentId ?? null,
      authorUserId: user.id,
      authorName: user.fullName ?? user.email ?? "Staff",
      body: parsed.body,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[discussions] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
