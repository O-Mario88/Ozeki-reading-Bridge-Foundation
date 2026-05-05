import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  createObservationPostgres,
  listObservationsPostgres,
} from "@/lib/server/postgres/repositories/phonics-observations";
import { logger } from "@/lib/logger";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const scoredItemSchema = z.object({
  criteriaKey: z.string().min(1),
  score: z.coerce.number().int().min(1).max(4).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const lessonStructureItemSchema = z.object({
  itemKey: z.string().min(1),
  observedYesNo: z.enum(["yes", "no"]).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const actionPlanSchema = z.object({
  actionToTake: z.string().max(2000).default(""),
  resourcesNeeded: z.string().max(2000).default(""),
  reviewDate: z.string().nullable().optional(),
});

const createSchema = z.object({
  teacherName: z.string().trim().min(1).max(200),
  observationDate: z.string().trim().min(8),
  schoolName: z.string().trim().min(1).max(200),
  observerName: z.string().trim().min(1).max(200),
  classLevel: z.string().trim().min(1).max(100),
  lessonDuration: z.string().trim().min(1).max(100),
  learnersPresent: z.coerce.number().int().min(0).nullable().optional(),
  lessonFocus: z.string().trim().min(1).max(500),
  overallPostObservationRating: z.enum(["fidelity", "partial", "low"]).nullable().optional(),
  coachSignatureName: z.string().trim().max(200).nullable().optional(),
  coachSignatureDate: z.string().nullable().optional(),
  headteacherDosSignatureName: z.string().trim().max(200).nullable().optional(),
  headteacherDosSignatureDate: z.string().nullable().optional(),
  teacherSignatureName: z.string().trim().max(200).nullable().optional(),
  teacherSignatureDate: z.string().nullable().optional(),
  schoolId: z.coerce.number().int().positive().nullable().optional(),
  observerUserId: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["draft", "submitted"]).default("draft"),
  publicVisibility: z.boolean().default(false),
  lessonStructure: z.array(lessonStructureItemSchema).optional(),
  scoredItems: z.array(scoredItemSchema).optional(),
  strengths: z.tuple([z.string().max(1000), z.string().max(1000), z.string().max(1000), z.string().max(1000)]).optional(),
  developmentAreas: z.tuple([z.string().max(1000), z.string().max(1000), z.string().max(1000), z.string().max(1000)]).optional(),
  actionPlan: actionPlanSchema.nullable().optional(),
  /** Per-domain rubric scores (0–100) — drive the public dashboard's
   *  Teaching Quality from Teacher Observation Analysis card. */
  lessonStructureScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  instructionalDeliveryScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  learnerEngagementScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  assessmentPracticesScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  useOfMaterialsScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  classroomEnvironmentScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    const params = req.nextUrl.searchParams;

    const isAdmin = user.isAdmin || user.isSuperAdmin;
    const filter = {
      status: params.get("status") || undefined,
      schoolId: params.get("schoolId") ? Number(params.get("schoolId")) : undefined,
      createdByUserId: isAdmin ? (params.get("createdBy") ? Number(params.get("createdBy")) : undefined) : user.id,
      observerUserId: params.get("observerUserId") ? Number(params.get("observerUserId")) : undefined,
      dateFrom: params.get("from") || undefined,
      dateTo: params.get("to") || undefined,
      limit: params.get("limit") ? Number(params.get("limit")) : 100,
      offset: params.get("offset") ? Number(params.get("offset")) : 0,
    };

    const observations = await listObservationsPostgres(filter);
    return NextResponse.json({ observations });
  } catch (error) {
    logger.error("[observations] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    const body = await req.json();
    const parsed = createSchema.parse(body);

    const id = await createObservationPostgres({
      teacherName: parsed.teacherName,
      observationDate: parsed.observationDate,
      schoolName: parsed.schoolName,
      observerName: parsed.observerName,
      classLevel: parsed.classLevel,
      lessonDuration: parsed.lessonDuration,
      learnersPresent: parsed.learnersPresent ?? null,
      lessonFocus: parsed.lessonFocus,
      overallPostObservationRating: parsed.overallPostObservationRating ?? null,
      coachSignatureName: parsed.coachSignatureName ?? null,
      coachSignatureDate: parsed.coachSignatureDate ?? null,
      headteacherDosSignatureName: parsed.headteacherDosSignatureName ?? null,
      headteacherDosSignatureDate: parsed.headteacherDosSignatureDate ?? null,
      teacherSignatureName: parsed.teacherSignatureName ?? null,
      teacherSignatureDate: parsed.teacherSignatureDate ?? null,
      schoolId: parsed.schoolId ?? null,
      observerUserId: parsed.observerUserId ?? null,
      status: parsed.status,
      publicVisibility: parsed.publicVisibility,
      createdByUserId: user.id,
      lessonStructure: parsed.lessonStructure?.map((l) => ({
        itemKey: l.itemKey,
        observedYesNo: l.observedYesNo ?? null,
        notes: l.notes ?? null,
      })),
      scoredItems: parsed.scoredItems?.map((s) => ({
        criteriaKey: s.criteriaKey,
        score: s.score ?? null,
        notes: s.notes ?? null,
      })),
      strengths: parsed.strengths,
      developmentAreas: parsed.developmentAreas,
      actionPlan: parsed.actionPlan ? { ...parsed.actionPlan, reviewDate: parsed.actionPlan.reviewDate ?? null } : null,
    });

    if (parsed.status === "submitted") {
      const { publishEvent } = await import("@/lib/server/events/publish");
      await publishEvent({
        eventType: "observation.submitted",
        actorUserId: user.id,
        entityType: "observation",
        entityId: id,
        payload: {
          schoolId: parsed.schoolId ?? null,
          teacherName: parsed.teacherName,
          rating: parsed.overallPostObservationRating ?? null,
        },
      });
    }

    await auditLog({
      actor: user,
      action: parsed.status === "submitted" ? "submit" : "create",
      targetTable: "teacher_lesson_observations",
      targetId: id,
      after: { status: parsed.status, teacherName: parsed.teacherName, schoolId: parsed.schoolId ?? null },
      detail: `${parsed.status === "submitted" ? "Submitted" : "Drafted"} observation for ${parsed.teacherName}`,
      request: req,
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    // Surface the actual Postgres error message + code (when available)
    // instead of a blanket "Internal error" — gives the operator a real
    // diagnostic when a column / constraint mismatch happens in prod.
    const e = error as { message?: string; code?: string; detail?: string };
    logger.error("[observations] POST failed", {
      error: e?.message,
      code: e?.code,
      detail: e?.detail,
    });
    return NextResponse.json(
      {
        error: e?.message ?? "Internal error.",
        code: e?.code ?? null,
        detail: e?.detail ?? null,
      },
      { status: 500 },
    );
  }
}
