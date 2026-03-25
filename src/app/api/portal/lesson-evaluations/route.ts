import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LESSON_EVALUATION_DOMAIN_KEYS,
  LESSON_EVALUATION_ITEM_KEYS,
  LESSON_EVALUATION_ITEMS,
  LESSON_FOCUS_OPTIONS,
} from "@/lib/lesson-evaluation";
import {
  createLessonEvaluationAsync,
  listLessonEvaluationsAsync,
  logAuditEvent,
} from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/auth";

export const runtime = "nodejs";

const lessonDomainSchema = z.enum(LESSON_EVALUATION_DOMAIN_KEYS);
const lessonItemSchema = z.enum(LESSON_EVALUATION_ITEM_KEYS);
const gradeSchema = z.enum(["P1", "P2", "P3", "P4", "P5", "P6", "P7"]);
const lessonFocusSchema = z.enum(LESSON_FOCUS_OPTIONS);

const evaluationItemSchema = z.object({
  domainKey: lessonDomainSchema,
  itemKey: lessonItemSchema,
  score: z.coerce.number().int().min(1).max(4),
  note: z.string().trim().max(600).optional().nullable(),
});

const createSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  teacherUid: z.string().trim().min(1),
  grade: gradeSchema,
  stream: z.string().trim().max(50).optional().nullable(),
  classSize: z.coerce.number().int().min(0).max(300).optional().nullable(),
  lessonDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  lessonFocus: z.array(lessonFocusSchema).min(1).max(LESSON_FOCUS_OPTIONS.length),
  visitId: z.coerce.number().int().positive().optional().nullable(),
  items: z.array(evaluationItemSchema).length(LESSON_EVALUATION_ITEMS.length),
  strengthsText: z.string().trim().min(3).max(800),
  priorityGapText: z.string().trim().min(3).max(500),
  nextCoachingAction: z.string().trim().min(3).max(500),
  teacherCommitment: z.string().trim().min(3).max(500),
  catchupEstimateCount: z.coerce.number().int().min(0).max(2000).optional().nullable(),
  catchupEstimatePercent: z.coerce.number().min(0).max(100).optional().nullable(),
  nextVisitDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const querySchema = z.object({
  schoolId: z.coerce.number().int().positive().optional(),
  visitId: z.coerce.number().int().positive().optional(),
  teacherUid: z.string().trim().optional(),
  status: z.enum(["active", "void"]).optional(),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(300).optional(),
});

function canCreateOrEditLessonEvaluation(user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedPortalUser>>>) {
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
  if (!canCreateOrEditLessonEvaluation(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      schoolId: searchParams.get("schoolId") ?? undefined,
      visitId: searchParams.get("visitId") ?? undefined,
      teacherUid: searchParams.get("teacherUid") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const evaluations = await listLessonEvaluationsAsync(parsed);
    return NextResponse.json({ evaluations });
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

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canCreateOrEditLessonEvaluation(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = createSchema.parse(await request.json());
    const evaluation = await createLessonEvaluationAsync(
      {
        ...parsed,
        observerId: user.id,
        items: parsed.items.map((item) => ({
          ...item,
          score: item.score as 1 | 2 | 3 | 4,
        })),
      },
      user.id,
    );

    await logAuditEvent(
      user.id,
      user.fullName,
      "create",
      "lesson_evaluations",
      evaluation.id,
      null,
      JSON.stringify({
        schoolId: evaluation.schoolId,
        teacherUid: evaluation.teacherUid,
        lessonDate: evaluation.lessonDate,
      }),
      "Lesson evaluation created.",
    );

    return NextResponse.json({ ok: true, evaluation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid lesson evaluation payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
