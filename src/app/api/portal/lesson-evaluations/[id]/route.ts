import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LESSON_EVALUATION_DOMAIN_KEYS,
  LESSON_EVALUATION_ITEM_KEYS,
  LESSON_EVALUATION_ITEMS,
  LESSON_FOCUS_OPTIONS,
  LESSON_STRUCTURE_ITEM_KEYS,
} from "@/lib/lesson-evaluation";
import {
  getLessonEvaluationByIdAsync,
  updateLessonEvaluationAsync,
  voidLessonEvaluationAsync,
} from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const lessonDomainSchema = z.enum(LESSON_EVALUATION_DOMAIN_KEYS);
const lessonItemSchema = z.enum(LESSON_EVALUATION_ITEM_KEYS);
const lessonStructureKeySchema = z.enum(LESSON_STRUCTURE_ITEM_KEYS);
const gradeSchema = z.enum(["P1", "P2", "P3", "P4", "P5", "P6", "P7"]);
const lessonFocusSchema = z.enum(LESSON_FOCUS_OPTIONS);

const evaluationItemSchema = z.object({
  domainKey: lessonDomainSchema,
  itemKey: lessonItemSchema,
  score: z.coerce.number().int().min(1).max(4),
  note: z.string().trim().max(600).optional().nullable(),
});

const lessonStructureItemSchema = z.object({
  itemKey: lessonStructureKeySchema,
  observed: z.boolean(),
  note: z.string().trim().max(600).optional().nullable(),
});

const actionPlanSchema = z.object({
  urgentAction: z.string().trim().max(500),
  resourcesNeeded: z.string().trim().max(500),
  reviewDate: z.string().trim().max(20),
}).optional().nullable();

const updateSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  teacherUid: z.string().trim().min(1),
  grade: gradeSchema,
  stream: z.string().trim().max(50).optional().nullable(),
  classSize: z.coerce.number().int().min(0).max(300).optional().nullable(),
  lessonDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  lessonFocus: z.array(lessonFocusSchema).min(1).max(LESSON_FOCUS_OPTIONS.length),
  lessonDurationMinutes: z.coerce.number().int().min(1).max(300).optional().nullable(),
  observerNameText: z.string().trim().max(200).optional().nullable(),
  visitId: z.coerce.number().int().positive().optional().nullable(),
  lessonStructure: z.array(lessonStructureItemSchema).optional().default([]),
  items: z.array(evaluationItemSchema).length(LESSON_EVALUATION_ITEMS.length),
  strengthsList: z.array(z.string().trim().max(300)).max(4).optional().default([]),
  areasForDevelopmentList: z.array(z.string().trim().max(300)).max(4).optional().default([]),
  actionPlan: actionPlanSchema,
  postObservationRating: z.enum([
    "implemented_with_fidelity",
    "partial_implementation",
    "low_implementation",
  ]).optional().nullable(),
  strengthsText: z.string().trim().max(800).optional().default(""),
  priorityGapText: z.string().trim().max(500).optional().default(""),
  nextCoachingAction: z.string().trim().max(500).optional().default(""),
  teacherCommitment: z.string().trim().max(500).optional().default(""),
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

    await auditLog({
      actor: user,
      action: "update",
      targetTable: "lesson_evaluations",
      targetId: evaluation.id,
      before: {
        schoolId: before.schoolId,
        teacherUid: before.teacherUid,
        lessonDate: before.lessonDate,
        visitId: (before as Record<string, unknown>).visitId,
      },
      after: {
        schoolId: evaluation.schoolId,
        teacherUid: evaluation.teacherUid,
        lessonDate: evaluation.lessonDate,
        visitId: (evaluation as Record<string, unknown>).visitId,
      },
      detail: "Lesson evaluation updated.",
      request,
    });

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

    await auditLog({
      actor: user,
      action: "void",
      targetTable: "lesson_evaluations",
      targetId: evaluation.id,
      before: { status: (before as Record<string, unknown>).status },
      after: { status: (evaluation as Record<string, unknown>).status, reason: parsed.reason },
      detail: "Lesson evaluation voided.",
      request,
    });

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
