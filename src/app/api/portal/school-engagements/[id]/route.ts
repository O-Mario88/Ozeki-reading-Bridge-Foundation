import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  getSchoolEngagementByIdPostgres,
  updateSchoolEngagementPostgres,
} from "@/lib/server/postgres/repositories/school-engagements";

export const runtime = "nodejs";

const statusEnum = z.enum(["planned", "active", "completed", "cancelled"]);

const updateSchema = z.object({
  label: z.string().min(3).max(200).optional(),
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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePortalUser();
    const { id } = await ctx.params;
    const engagement = await getSchoolEngagementByIdPostgres(Number(id));
    if (!engagement) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ engagement });
  } catch (err) {
    console.error("[api/portal/school-engagements/:id] GET failed", err);
    return NextResponse.json({ error: "Failed to load engagement." }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser();
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const parsed = updateSchema.parse(body);
    const row = await updateSchoolEngagementPostgres({
      ...parsed,
      id: Number(id),
      updatedByUserId: user.id,
    });
    if (!row) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ engagement: row });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    console.error("[api/portal/school-engagements/:id] PATCH failed", err);
    return NextResponse.json({ error: "Failed to update engagement." }, { status: 500 });
  }
}
