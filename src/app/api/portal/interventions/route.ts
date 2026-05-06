import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { canEnterData } from "@/lib/permissions";
import { createInterventionPlanRecord } from "@/lib/server/postgres/repositories/interventions";

export const runtime = "nodejs";

const SCOPE_TYPES = ["Country", "Region", "District", "Cluster", "School"] as const;
const PLAN_TYPES = [
  "Coaching Cycles",
  "Remedial Reading",
  "Materials Support",
  "Leadership Support",
  "Data Quality Fixes",
] as const;
const STATUSES = ["Planned", "Approved", "In Progress", "At Risk", "Completed", "Verified"] as const;
const RISKS = ["Low", "Medium", "High"] as const;

const planSchema = z.object({
  title: z.string().trim().min(2).max(280),
  scopeType: z.enum(SCOPE_TYPES).optional(),
  scopeName: z.string().trim().max(200).optional(),
  type: z.enum(PLAN_TYPES).optional(),
  ownerName: z.string().trim().max(200).nullish(),
  status: z.enum(STATUSES).optional(),
  progressPct: z.coerce.number().int().min(0).max(100).optional(),
  dueDate: z.string().trim().nullish(),
  risk: z.enum(RISKS).optional(),
  region: z.string().trim().max(200).nullish(),
  schoolsCount: z.coerce.number().int().min(0).optional(),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!canEnterData(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: z.infer<typeof planSchema>;
  try {
    const raw = await request.json();
    body = planSchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof z.ZodError
            ? err.issues[0]?.message ?? "Invalid request."
            : "Invalid request.",
      },
      { status: 400 },
    );
  }

  const id = await createInterventionPlanRecord(
    { id: user.id, fullName: user.fullName },
    {
      title: body.title,
      scopeType: body.scopeType,
      scopeName: body.scopeName,
      type: body.type,
      ownerName: body.ownerName ?? user.fullName,
      ownerUserId: user.id,
      status: body.status ?? "Planned",
      progressPct: body.progressPct,
      dueDate: body.dueDate || null,
      risk: body.risk,
      region: body.region,
      schoolsCount: body.schoolsCount,
    },
  );

  return NextResponse.json({ success: true, planId: id });
}
