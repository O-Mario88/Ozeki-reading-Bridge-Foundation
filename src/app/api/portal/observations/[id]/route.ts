import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  getObservationByIdPostgres,
  updateObservationPostgres,
  archiveObservationPostgres,
} from "@/lib/server/postgres/repositories/phonics-observations";
import { logger } from "@/lib/logger";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  teacherName: z.string().trim().min(1).max(200).optional(),
  observationDate: z.string().trim().min(8).optional(),
  schoolName: z.string().trim().min(1).max(200).optional(),
  observerName: z.string().trim().min(1).max(200).optional(),
  classLevel: z.string().trim().min(1).max(100).optional(),
  lessonDuration: z.string().trim().min(1).max(100).optional(),
  learnersPresent: z.coerce.number().int().min(0).nullable().optional(),
  lessonFocus: z.string().trim().min(1).max(500).optional(),
  overallPostObservationRating: z.enum(["fidelity", "partial", "low"]).nullable().optional(),
  coachSignatureName: z.string().trim().max(200).nullable().optional(),
  coachSignatureDate: z.string().nullable().optional(),
  headteacherDosSignatureName: z.string().trim().max(200).nullable().optional(),
  headteacherDosSignatureDate: z.string().nullable().optional(),
  teacherSignatureName: z.string().trim().max(200).nullable().optional(),
  teacherSignatureDate: z.string().nullable().optional(),
  schoolId: z.coerce.number().int().positive().nullable().optional(),
  observerUserId: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["draft", "submitted", "archived"]).optional(),
  publicVisibility: z.boolean().optional(),
  lessonStructure: z.array(z.object({
    itemKey: z.string(),
    observedYesNo: z.enum(["yes", "no"]).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })).optional(),
  scoredItems: z.array(z.object({
    criteriaKey: z.string(),
    score: z.coerce.number().int().min(1).max(4).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })).optional(),
  strengths: z.tuple([z.string().max(1000), z.string().max(1000), z.string().max(1000), z.string().max(1000)]).optional(),
  developmentAreas: z.tuple([z.string().max(1000), z.string().max(1000), z.string().max(1000), z.string().max(1000)]).optional(),
  actionPlan: z.object({
    actionToTake: z.string().max(2000).default(""),
    resourcesNeeded: z.string().max(2000).default(""),
    reviewDate: z.string().nullable().optional(),
  }).nullable().optional(),
  /** Per-domain rubric scores (0–100) — drive the public dashboard's
   *  Teaching Quality from Teacher Observation Analysis card. */
  lessonStructureScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  instructionalDeliveryScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  learnerEngagementScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  assessmentPracticesScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  useOfMaterialsScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  classroomEnvironmentScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    const obs = await getObservationByIdPostgres(Number(id));

    if (!obs) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const isAdmin = user.isAdmin || user.isSuperAdmin;
    if (!isAdmin && obs.createdByUserId !== user.id && obs.observerUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ observation: obs });
  } catch (error) {
    logger.error("[observations/[id]] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    const { id } = await params;
    const obsId = Number(id);

    const existing = await getObservationByIdPostgres(obsId);
    if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (existing.status === "archived") {
      return NextResponse.json({ error: "Cannot edit an archived observation." }, { status: 400 });
    }

    const isAdmin = user.isAdmin || user.isSuperAdmin;
    if (!isAdmin && existing.createdByUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchSchema.parse(body);

    await updateObservationPostgres(obsId, {
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
      actionPlan: parsed.actionPlan === undefined ? undefined : (parsed.actionPlan ? { ...parsed.actionPlan, reviewDate: parsed.actionPlan.reviewDate ?? null } : null),
      updatedByUserId: user.id,
    });

    await auditLog({
      actor: user,
      action: "update",
      targetTable: "teacher_lesson_observations",
      targetId: obsId,
      before: existing,
      after: parsed,
      detail: `Updated observation ${obsId}`,
      request: req,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[observations/[id]] PATCH failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePortalUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Only admins can archive observations." }, { status: 403 });
    }

    const { id } = await params;
    const obsId = Number(id);
    const existing = await getObservationByIdPostgres(obsId);
    if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

    await archiveObservationPostgres(obsId, user.id);
    await auditLog({
      actor: user,
      action: "soft_delete",
      targetTable: "phonics_observations",
      targetId: obsId,
      before: existing,
      request: req,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[observations/[id]] DELETE failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
