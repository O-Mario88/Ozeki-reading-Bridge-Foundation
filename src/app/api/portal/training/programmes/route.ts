import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalStaffUser } from "@/lib/auth";
import {
  listProgrammesPostgres,
  createProgrammePostgres,
} from "@/lib/server/postgres/repositories/training-programmes";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const createSchema = z.object({
  code: z.string().trim().max(64).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  audience: z.string().trim().max(200).nullable().optional(),
  durationWeeks: z.coerce.number().int().min(1).max(52).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  coverImageUrl: z.string().url().nullable().optional(),
});

export async function GET() {
  try {
    await requirePortalStaffUser();
    const programmes = await listProgrammesPostgres();
    return NextResponse.json({ programmes });
  } catch (error) {
    logger.error("[programmes] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalStaffUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Only admins can create programmes." }, { status: 403 });
    }
    const parsed = createSchema.parse(await req.json());
    const id = await createProgrammePostgres({ ...parsed, createdByUserId: user.id });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[programmes] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
