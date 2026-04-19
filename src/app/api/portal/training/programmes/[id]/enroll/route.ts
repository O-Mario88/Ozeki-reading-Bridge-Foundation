import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalStaffUser } from "@/lib/auth";
import { enrollTeacherInProgrammePostgres } from "@/lib/server/postgres/repositories/training-programmes";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const enrollSchema = z.object({
  teacherUserId: z.coerce.number().int().positive().nullable().optional(),
  teacherName: z.string().trim().min(1).max(200),
  teacherEmail: z.string().trim().email().nullable().optional(),
  schoolId: z.coerce.number().int().positive().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalStaffUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }
    const { id } = await params;
    const parsed = enrollSchema.parse(await req.json());
    const enrollmentId = await enrollTeacherInProgrammePostgres({ ...parsed, programmeId: Number(id) });
    return NextResponse.json({ ok: true, enrollmentId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[programmes/enroll] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
