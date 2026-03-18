import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LESSON_EVALUATION_DOMAIN_KEYS,
  LESSON_EVALUATION_ITEM_KEYS,
  LESSON_EVALUATION_ITEMS,
  LESSON_FOCUS_OPTIONS,
} from "@/lib/lesson-evaluation";
import {
  getLessonEvaluationByIdAsync,
  logAuditEvent,
  updateLessonEvaluationAsync,
  voidLessonEvaluationAsync,
} from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

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

const updateSchema = z.object({
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

const voidSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

function toId(raw: string) {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Invalid lesson evaluation ID.");
  }
  return parsed;
}

function canCreateOrEditLessonEvaluation(user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedPortalUser>>>) {
  return (
    user.role === "Staff" ||
    user.role === "Volunteer" ||
    user.role === "Admin" ||
    user.isAdmin ||
    user.isSuperAdmin
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canCreateOrEditLessonEvaluation(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: rawId } = await context.params;
    const evaluationId = toId(rawId);
    const evaluation = await getLessonEvaluationByIdAsync(evaluationId);
    if (!evaluation) {
      return NextResponse.json({ error: "Lesson evaluation not found." }, { status: 404 });
    }
    return NextResponse.json({ evaluation });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canCreateOrEditLessonEvaluation(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: rawId } = await context.params;
    const evaluationId = toId(rawId);
    const parsed = updateSchema.parse(await request.json());
    const before = await getLessonEvaluationByIdAsync(evaluationId);
    if (!before) {
      return NextResponse.json({ error: "Lesson evaluation not found." }, { status: 404 });
    }
    const evaluation = await updateLessonEvaluationAsync(
      evaluationId,
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

    logAuditEvent(
      user.id,
      user.fullName,
      "update",
      "lesson_evaluations",
      evaluation.id,
      JSON.stringify({
        schoolId: before.schoolId,
        teacherUid: before.teacherUid,
        lessonDate: before.lessonDate,
        visitId: before.visitId,
      }),
      JSON.stringify({
        schoolId: evaluation.schoolId,
        teacherUid: evaluation.teacherUid,
        lessonDate: evaluation.lessonDate,
        visitId: evaluation.visitId,
      }),
      "Lesson evaluation updated.",
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: rawId } = await context.params;
    const evaluationId = toId(rawId);
    const parsed = voidSchema.parse(await request.json().catch(() => ({})));
    const before = await getLessonEvaluationByIdAsync(evaluationId);
    if (!before) {
      return NextResponse.json({ error: "Lesson evaluation not found." }, { status: 404 });
    }

    const evaluation = await voidLessonEvaluationAsync(evaluationId, user.id, parsed.reason);
    if (!evaluation) {
      return NextResponse.json({ error: "Lesson evaluation not found." }, { status: 404 });
    }

    logAuditEvent(
      user.id,
      user.fullName,
      "void",
      "lesson_evaluations",
      evaluation.id,
      JSON.stringify({
        status: before.status,
      }),
      JSON.stringify({
        status: evaluation.status,
        reason: parsed.reason,
      }),
      "Lesson evaluation voided.",
    );

    return NextResponse.json({ ok: true, evaluation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid void request." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
