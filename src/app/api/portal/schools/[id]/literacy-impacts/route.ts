import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { createSchoolLiteracyImpact, getSchoolLiteracyImpacts } from "@/lib/server/postgres/repositories/school-metrics";

export const runtime = "nodejs";

const literacyImpactSchema = z.object({
  babyClassImpacted: z.coerce.number().int().min(0),
  middleClassImpacted: z.coerce.number().int().min(0),
  topClassImpacted: z.coerce.number().int().min(0),
  p1Impacted: z.coerce.number().int().min(0),
  p2Impacted: z.coerce.number().int().min(0),
  p3Impacted: z.coerce.number().int().min(0),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const schoolId = parseInt(id, 10);
    if (isNaN(schoolId)) throw new Error("Invalid school ID");

    const impacts = await getSchoolLiteracyImpacts(schoolId);
    return NextResponse.json({ items: impacts });
  } catch (_error) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const schoolId = parseInt(id, 10);
    if (isNaN(schoolId)) throw new Error("Invalid school ID");

    const payload = literacyImpactSchema.parse(await request.json());
    
    // Auto-calculate Total Learners Directly Impacted
    const totalImpacted = 
      payload.babyClassImpacted + 
      payload.middleClassImpacted + 
      payload.topClassImpacted + 
      payload.p1Impacted + 
      payload.p2Impacted + 
      payload.p3Impacted;

    const record = await createSchoolLiteracyImpact({
      schoolId,
      babyClassImpacted: payload.babyClassImpacted,
      middleClassImpacted: payload.middleClassImpacted,
      topClassImpacted: payload.topClassImpacted,
      p1Impacted: payload.p1Impacted,
      p2Impacted: payload.p2Impacted,
      p3Impacted: payload.p3Impacted,
      totalImpacted,
      recordedById: user.id,
    });

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
