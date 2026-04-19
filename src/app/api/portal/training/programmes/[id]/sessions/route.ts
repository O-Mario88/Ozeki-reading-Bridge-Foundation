import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalStaffUser } from "@/lib/auth";
import {
  addSessionToProgrammePostgres,
  removeSessionFromProgrammePostgres,
} from "@/lib/server/postgres/repositories/training-programmes";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const addSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  sortOrder: z.coerce.number().int().optional(),
  required: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalStaffUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }
    const { id } = await params;
    const parsed = addSchema.parse(await req.json());
    await addSessionToProgrammePostgres(Number(id), parsed.sessionId, parsed.sortOrder ?? 0, parsed.required ?? true);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[programmes/sessions] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalStaffUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }
    const { id } = await params;
    const sessionId = Number(req.nextUrl.searchParams.get("sessionId"));
    if (!sessionId) return NextResponse.json({ error: "sessionId required." }, { status: 400 });
    await removeSessionFromProgrammePostgres(Number(id), sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[programmes/sessions] DELETE failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
