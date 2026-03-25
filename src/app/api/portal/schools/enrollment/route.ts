import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

const enrollmentSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  enrolledBoys: z.coerce.number().int().min(0),
  enrolledGirls: z.coerce.number().int().min(0),
  enrolledBaby: z.coerce.number().int().min(0),
  enrolledMiddle: z.coerce.number().int().min(0),
  enrolledTop: z.coerce.number().int().min(0),
  enrolledP1: z.coerce.number().int().min(0),
  enrolledP2: z.coerce.number().int().min(0),
  enrolledP3: z.coerce.number().int().min(0),
});

export async function PATCH(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = enrollmentSchema.parse(await request.json());
    const enrollmentTotal = payload.enrolledBoys + payload.enrolledGirls;

    await queryPostgres(
      `
      UPDATE schools_directory
      SET
        enrolled_boys = $2,
        enrolled_girls = $3,
        enrolled_baby = $4,
        enrolled_middle = $5,
        enrolled_top = $6,
        enrolled_p1 = $7,
        enrolled_p2 = $8,
        enrolled_p3 = $9,
        enrollment_total = $10,
        running_total_max_enrollment = GREATEST(COALESCE(running_total_max_enrollment, 0), $10),
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        payload.schoolId,
        payload.enrolledBoys,
        payload.enrolledGirls,
        payload.enrolledBaby,
        payload.enrolledMiddle,
        payload.enrolledTop,
        payload.enrolledP1,
        payload.enrolledP2,
        payload.enrolledP3,
        enrollmentTotal,
      ],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid enrollment payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
