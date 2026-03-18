import { NextResponse } from "next/server";
import { z } from "zod";
import { createPortalRecord, listPortalRecords } from "@/services/dataService";
import { canReview, getAuthenticatedPortalUser } from "@/lib/portal-api";
import { PortalRecordFilters, PortalRecordPayload } from "@/lib/types";

export const runtime = "nodejs";

const moduleSchema = z.enum(["training", "visit", "assessment", "story"]);
const statusSchema = z.enum(["Draft", "Submitted", "Returned", "Approved"]);
const payloadValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
  z.undefined(),
]);

const createRecordSchema = z.object({
  module: moduleSchema,
  date: z.string().min(6),
  district: z.string().min(2),
  schoolId: z.coerce.number().int().positive(),
  schoolName: z.string().min(2),
  programType: z.string().trim().optional(),
  followUpDate: z.string().trim().optional(),
  followUpType: z
    .enum(["virtual_check_in", "school_visit", "refresher_session"])
    .optional(),
  followUpOwnerUserId: z.coerce.number().int().positive().optional(),
  status: statusSchema,
  payload: z.record(z.string(), payloadValueSchema).default({}),
});

function parseFilters(request: Request): PortalRecordFilters {
  const { searchParams } = new URL(request.url);
  const moduleFilter = moduleSchema.parse(searchParams.get("module"));
  const createdByParam = searchParams.get("createdBy");
  const createdBy = createdByParam ? Number(createdByParam) : undefined;

  return {
    module: moduleFilter,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    district: searchParams.get("district") || undefined,
    school: searchParams.get("school") || undefined,
    status: searchParams.get("status")
      ? statusSchema.parse(searchParams.get("status"))
      : undefined,
    createdBy: createdBy && Number.isFinite(createdBy) ? createdBy : undefined,
    programType: searchParams.get("programType") || undefined,
  };
}

function cleanPayload(input: Record<string, unknown>): PortalRecordPayload {
  const payload: PortalRecordPayload = {};

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      payload[key] = value
        .map((item) => String(item).trim())
        .filter(Boolean);
      return;
    }

    if (value === null) {
      payload[key] = null;
      return;
    }

    if (typeof value === "string") {
      payload[key] = value.trim();
      return;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      payload[key] = value;
    }
  });

  return payload;
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const filters = parseFilters(request);
    const records = await listPortalRecords(filters);
    return NextResponse.json({ records });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid filters." },
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

  try {
    const payload = createRecordSchema.parse(await request.json());
    const reviewer = canReview(user as any);

    if (!reviewer && (payload.status === "Returned" || payload.status === "Approved")) {
      return NextResponse.json(
        { error: "Only supervisors, M&E, or admins can set Returned/Approved status." },
        { status: 403 },
      );
    }

    const record = await createPortalRecord(
      {
        ...payload,
        programType: payload.programType?.trim() || undefined,
        followUpDate: payload.followUpDate?.trim() || undefined,
        followUpType: payload.followUpType,
        followUpOwnerUserId: payload.followUpOwnerUserId,
        payload: cleanPayload(payload.payload),
      },
      user.id,
    );

    if (payload.module === "assessment" || payload.module === "story") {
      try {
        const { runEducationDataQualitySweepAsync } = await import("@/lib/national-intelligence-async");
        runEducationDataQualitySweepAsync({
          user,
          scopeType: "district",
          scopeId: payload.district,
        });
      } catch {
        // Record creation should not fail due to async quality checks.
      }
    }

    if (payload.payload.egraLearnersData && typeof payload.payload.egraLearnersData === 'string') {
      try {
        const { saveAssessmentRecordAsync } = await import("@/services/dataService");
        const egraLearners = JSON.parse(payload.payload.egraLearnersData);
        if (Array.isArray(egraLearners) && egraLearners.length > 0) {
          await Promise.all(
            egraLearners.map(async (learnerObj: unknown) => {
              const learner = learnerObj as Record<string, unknown>;
              if (!learner.learnerId && !learner.learnerName && !learner.sex) return;
              
              const pType = payload.payload.assessmentType;
              const assessmentType = (typeof pType === 'string' ? pType : "progress") as "baseline" | "progress" | "endline";
              const assessmentDate = payload.date || new Date().toISOString().split("T")[0];
              
              await saveAssessmentRecordAsync({
                  childId: learner.learnerId ? String(learner.learnerId) : undefined,
                  childName: learner.learnerName ? String(learner.learnerName) : "Unknown Learner",
                  gender: String(learner.sex) === "M" ? "Boy" : String(learner.sex) === "F" ? "Girl" : "Other",
                  age: Number(learner.age) || 0,
                  schoolId: payload.schoolId,
                  classGrade: typeof payload.payload.classLevel === 'string' ? payload.payload.classLevel : "P1",
                  assessmentDate: assessmentDate,
                  assessmentType: assessmentType,
                  letterIdentificationScore: learner.letterIdentification !== "" ? Number(learner.letterIdentification) : null,
                  soundIdentificationScore: learner.soundIdentification !== "" ? Number(learner.soundIdentification) : null,
                  decodableWordsScore: learner.decodableWords !== "" ? Number(learner.decodableWords) : null,
                  undecodableWordsScore: learner.undecodableWords !== "" ? Number(learner.undecodableWords) : null,
                  madeUpWordsScore: learner.madeUpWords !== "" ? Number(learner.madeUpWords) : null,
                  storyReadingScore: learner.storyReading !== "" ? Number(learner.storyReading) : null,
                  readingComprehensionScore: learner.readingComprehension !== "" ? Number(learner.readingComprehension) : null,
                  notes: `Extracted from Portal Record #${record.id}`
              }, user.id);
            })
          );
        }
      } catch (e) {
        console.error("Failed to extract EGRA learners from portal record", e);
      }
    }

    if (payload.module === "visit") {
      try {
        const { extractAndSaveCoachingVisitAsync } = await import("@/lib/server/postgres/repositories/coaching-visits");
        await extractAndSaveCoachingVisitAsync({
          recordId: record.id,
          schoolId: payload.schoolId,
          date: payload.date || new Date().toISOString().split("T")[0],
          visitType: payload.followUpType || "school_visit",
          coachUserId: user.id,
          payloadObj: payload.payload as Record<string, unknown>,
        });
      } catch (e) {
        console.error("Failed to extract coaching visit cleanly:", e);
      }
    }

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid portal record payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
