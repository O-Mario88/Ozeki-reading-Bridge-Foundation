import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getGraduationSettingsAsync,
  getSchoolGraduationEligibilityAsync,
  listGraduationReviewSupervisorsAsync,
  reviewSchoolGraduationAsync,
} from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const reviewSchema = z.object({
  action: z.enum(["confirm_graduation", "keep_supporting", "needs_review"]),
  reason: z.string().trim().max(1000).optional().nullable(),
  snoozeDays: z.coerce.number().int().min(1).max(3650).optional().nullable(),
  assignedSupervisorUserId: z.coerce.number().int().positive().optional().nullable(),
  checklistAnswers: z.record(z.string(), z.boolean()).optional().nullable(),
});

function canAccessGraduation(
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedPortalUser>>>,
) {
  return (
    user.role === "Staff" ||
    user.role === "Admin" ||
    user.isAdmin ||
    user.isSuperAdmin ||
    user.isSupervisor ||
    user.isME
  );
}

function parseSchoolId(raw: string) {
  const schoolId = Number(raw);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    throw new Error("Invalid school id.");
  }
  return schoolId;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ schoolId: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessGraduation(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { schoolId: schoolIdRaw } = await context.params;
    const schoolId = parseSchoolId(schoolIdRaw);
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") !== "0";
    const eligibility = await getSchoolGraduationEligibilityAsync(schoolId, { refresh });
    if (!eligibility) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }
    return NextResponse.json({
      eligibility,
      supervisors: await listGraduationReviewSupervisorsAsync(),
      settings: await getGraduationSettingsAsync(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load graduation status." },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ schoolId: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessGraduation(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { schoolId: schoolIdRaw } = await context.params;
    const schoolId = parseSchoolId(schoolIdRaw);
    const parsed = reviewSchema.parse(await request.json());

    const eligibility = await reviewSchoolGraduationAsync(
      {
        schoolId,
        action: parsed.action,
        reason: parsed.reason ?? null,
        snoozeDays: parsed.snoozeDays ?? null,
        assignedSupervisorUserId: parsed.assignedSupervisorUserId ?? null,
        checklistAnswers: (parsed.checklistAnswers as Record<string, boolean>) ?? null,
      },
      user,
    );
    return NextResponse.json({
      ok: true,
      eligibility,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid review request." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to review graduation." },
      { status: 400 },
    );
  }
}
