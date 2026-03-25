import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { createSchoolEnrollment, getSchoolEnrollments } from "@/lib/server/postgres/repositories/school-metrics";

export const runtime = "nodejs";

const enrollmentSchema = z.object({
  boysCount: z.coerce.number().int().min(0),
  girlsCount: z.coerce.number().int().min(0),
  updatedFrom: z.string().min(1),
  academicTerm: z.string().nullable().optional(),
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
    if (isNaN(schoolId)) {
      return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
    }

    const enrollments = await getSchoolEnrollments(schoolId);
    return NextResponse.json({ items: enrollments });
  } catch (error) {
    console.error("Failed to fetch enrollments:", error);
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
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

    const payload = enrollmentSchema.parse(await request.json());
    const totalEnrollment = payload.boysCount + payload.girlsCount;

    const record = await createSchoolEnrollment({
      schoolId,
      boysCount: payload.boysCount,
      girlsCount: payload.girlsCount,
      totalEnrollment,
      updatedFrom: payload.updatedFrom,
      academicTerm: payload.academicTerm ?? null,
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
