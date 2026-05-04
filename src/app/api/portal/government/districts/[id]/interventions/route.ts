import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentExternalUser } from "@/lib/external-auth";
import { auditLog } from "@/lib/server/audit/log";
import {
  createInterventionForDistrict,
  getDistrictAssignmentByDistrict,
} from "@/lib/server/postgres/repositories/government-portal";

export const runtime = "nodejs";

const schema = z.object({
  schoolId: z.number().int().positive().nullable(),
  interventionType: z.string().trim().min(2).max(120),
  scheduledFor: z.string().trim().min(8).max(40),
  notes: z.string().trim().max(800).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentExternalUser();
  if (!user || user.role !== "district_officer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const district = decodeURIComponent(id);
  const assignment = await getDistrictAssignmentByDistrict(user.id, district);
  if (!assignment) {
    return NextResponse.json({ error: "Forbidden — no assignment for this district." }, { status: 403 });
  }
  if (assignment.scope === "view") {
    return NextResponse.json({ error: "Forbidden — view-only scope." }, { status: 403 });
  }

  try {
    const parsed = schema.parse(await request.json());
    const intervention = await createInterventionForDistrict({
      district,
      schoolId: parsed.schoolId,
      interventionType: parsed.interventionType,
      scheduledFor: parsed.scheduledFor,
      scheduledByExternalId: user.id,
      notes: parsed.notes ?? null,
    });

    await auditLog({
      actor: { id: 0, name: `${user.fullName} (district officer)` },
      action: "create",
      targetTable: "district_intervention_schedule",
      targetId: intervention.id,
      after: {
        district,
        schoolId: intervention.schoolId,
        interventionType: intervention.interventionType,
        scheduledFor: intervention.scheduledFor,
      },
      detail: `District officer scheduled ${intervention.interventionType} in ${district}`,
      request,
    });

    return NextResponse.json({ ok: true, intervention });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid intervention payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
