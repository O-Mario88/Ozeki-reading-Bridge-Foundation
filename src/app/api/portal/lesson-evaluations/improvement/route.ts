import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSchoolTeachingQualityImprovementSummaryAsync,
  getTeacherImprovementProfileAsync,
  getTeachingImprovementSettingsAsync,
  listTeacherImprovementComparisonsAsync,
} from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/auth";

export const runtime = "nodejs";

const querySchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  teacherUid: z.string().trim().min(1).optional(),
  grade: z
    .enum(["P1", "P2", "P3", "P4", "P5", "P6", "P7"])
    .optional(),
  comparisonEvaluationId: z.coerce.number().int().positive().optional(),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function canAccessLessonEvaluationImprovement(
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedPortalUser>>>,
) {
  return (
    user.role === "Staff" ||
    user.role === "Volunteer" ||
    user.role === "Admin" ||
    user.isAdmin ||
    user.isSuperAdmin
  );
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessLessonEvaluationImprovement(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      schoolId: searchParams.get("schoolId") ?? undefined,
      teacherUid: searchParams.get("teacherUid") ?? undefined,
      grade: searchParams.get("grade") ?? undefined,
      comparisonEvaluationId: searchParams.get("comparisonEvaluationId") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    const settings = await getTeachingImprovementSettingsAsync();

    if (parsed.teacherUid) {
      const profile = await getTeacherImprovementProfileAsync({
        schoolId: parsed.schoolId,
        teacherUid: parsed.teacherUid,
        grade: parsed.grade,
        comparisonEvaluationId: parsed.comparisonEvaluationId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
      });
      return NextResponse.json({ profile, settings });
    }

    const schoolSummary = await getSchoolTeachingQualityImprovementSummaryAsync({
      schoolId: parsed.schoolId,
      grade: parsed.grade,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    });
    const comparisons = await listTeacherImprovementComparisonsAsync({
      schoolId: parsed.schoolId,
      grade: parsed.grade,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    });
    return NextResponse.json({
      schoolSummary: {
        ...schoolSummary,
        teacherComparisons: comparisons,
      },
      settings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid query parameters." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
