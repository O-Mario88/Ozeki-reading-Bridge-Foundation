import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  createSchoolEngagementPostgres,
  listSchoolEngagementsPostgres,
  type EngagementStatus,
} from "@/lib/server/postgres/repositories/school-engagements";

export const runtime = "nodejs";

const statusEnum = z.enum(["planned", "active", "completed", "cancelled"]);

const createSchema = z.object({
  schoolId: z.number().int().positive(),
  label: z.string().min(3).max(200),
  cohortCode: z.string().max(60).nullish(),
  academicYear: z.number().int().min(2000).max(2100).nullish(),
  termNumber: z.number().int().min(1).max(3).nullish(),
  grade: z.string().max(20).nullish(),
  trainingId: z.number().int().positive().nullish(),
  assessmentWindowId: z.number().int().positive().nullish(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  status: statusEnum.optional(),
  goalDescription: z.string().max(2000).nullish(),
  notes: z.string().max(2000).nullish(),
});

export async function GET(request: Request) {
  try {
    await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const trainingId = searchParams.get("trainingId");
    const status = searchParams.get("status") as EngagementStatus | null;
    const academicYear = searchParams.get("academicYear");
    const limit = searchParams.get("limit");

    const rows = await listSchoolEngagementsPostgres({
      schoolId: schoolId ? Number(schoolId) : undefined,
      trainingId: trainingId ? Number(trainingId) : undefined,
      status: status ?? undefined,
      academicYear: academicYear ? Number(academicYear) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return NextResponse.json({ engagements: rows });
  } catch (err) {
    console.error("[api/portal/school-engagements] GET failed", err);
    return NextResponse.json({ error: "Failed to list engagements." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePortalUser();
    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.parse(body);
    const row = await createSchoolEngagementPostgres({
      ...parsed,
      createdByUserId: user.id,
    });
    return NextResponse.json({ engagement: row }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    console.error("[api/portal/school-engagements] POST failed", err);
    return NextResponse.json({ error: "Failed to create engagement." }, { status: 500 });
  }
}
