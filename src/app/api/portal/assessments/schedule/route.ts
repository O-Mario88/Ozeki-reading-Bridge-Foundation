import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalStaffUser } from "@/lib/auth";
import {
  listAssessmentWindowsPostgres,
  createAssessmentWindowPostgres,
} from "@/lib/server/postgres/repositories/assessment-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const createSchema = z.object({
  assessmentType: z.enum(["baseline", "progress", "endline"]),
  academicYear: z.coerce.number().int().min(2020).max(2050),
  termNumber: z.coerce.number().int().min(1).max(3),
  windowOpen: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  windowClose: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scopeType: z.enum(["country", "region", "subregion", "district"]).optional(),
  scopeId: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requirePortalStaffUser();
    const year = req.nextUrl.searchParams.get("year");
    const windows = await listAssessmentWindowsPostgres(year ? Number(year) : undefined);
    return NextResponse.json({ windows });
  } catch (error) {
    logger.error("[assessments/schedule] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalStaffUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }
    const parsed = createSchema.parse(await req.json());
    const id = await createAssessmentWindowPostgres({ ...parsed, createdByUserId: user.id });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[assessments/schedule] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
