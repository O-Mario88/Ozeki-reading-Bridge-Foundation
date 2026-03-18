import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listSchoolSupportStatuses,
  listTeacherSupportStatuses,
  recomputeLearningAutomationSnapshots,
} from "@/services/dataService";
import { canReview, getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const getSchema = z.object({
  type: z.enum(["school", "teacher"]).default("school"),
  schoolId: z.coerce.number().int().positive().optional(),
  district: z.string().trim().optional(),
  region: z.string().trim().optional(),
  status: z.string().trim().optional(),
  periodKey: z.string().trim().optional(),
  teacherUid: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(3000).optional(),
});

const postSchema = z.object({
  schoolId: z.coerce.number().int().positive().optional(),
});

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = getSchema.parse({
      type: searchParams.get("type") ?? undefined,
      schoolId: searchParams.get("schoolId") ?? undefined,
      district: searchParams.get("district") ?? undefined,
      region: searchParams.get("region") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      periodKey: searchParams.get("periodKey") ?? undefined,
      teacherUid: searchParams.get("teacherUid") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (parsed.type === "teacher") {
      const records = listTeacherSupportStatuses({
        schoolId: parsed.schoolId,
        district: parsed.district,
        teacherUid: parsed.teacherUid,
        status:
          parsed.status === "Needs Catch-up Training" ||
          parsed.status === "Needs Coaching & Follow-up" ||
          parsed.status === "On Track"
            ? parsed.status
            : undefined,
        periodKey: parsed.periodKey,
        limit: parsed.limit,
      });
      return NextResponse.json({ type: "teacher", records });
    }

    const records = listSchoolSupportStatuses({
      schoolId: parsed.schoolId,
      district: parsed.district,
      region: parsed.region,
      status:
        parsed.status === "Requires Remedial & Catch-Up" ||
        parsed.status === "Progressing (Maintain + Strengthen)" ||
        parsed.status === "Graduation Prep (Approaching criteria)" ||
        parsed.status === "Graduation Eligible"
          ? parsed.status
          : undefined,
      periodKey: parsed.periodKey,
      limit: parsed.limit,
    });
    return NextResponse.json({ type: "school", records });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid support-status query." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReview(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = postSchema.parse(await request.json());
    recomputeLearningAutomationSnapshots({
      schoolId: parsed.schoolId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid recompute payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
