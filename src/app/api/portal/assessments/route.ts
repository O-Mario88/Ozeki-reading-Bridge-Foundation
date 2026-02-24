import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  getPortalUserFromSession,
  listAssessmentRecords,
  logAuditEvent,
  saveAssessmentRecord,
} from "@/lib/db";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { AssessmentRecordInput } from "@/lib/types";

export const runtime = "nodejs";

const optionalScore = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.coerce.number().int().min(0).max(max).nullable(),
  );

const assessmentSchema = z.object({
  childName: z.string().min(2),
  childId: z.string().trim().optional(),
  learnerUid: z.string().trim().optional(),
  gender: z.enum(["Boy", "Girl", "Other"]),
  age: z.coerce.number().int().min(3).max(25),
  schoolId: z.coerce.number().int().min(1),
  classGrade: z.string().min(1),
  assessmentDate: z.string().min(6),
  assessmentType: z.enum(["baseline", "progress", "endline"]),
  letterIdentificationScore: optionalScore(100).optional(),
  soundIdentificationScore: optionalScore(100).optional(),
  decodableWordsScore: optionalScore(100).optional(),
  undecodableWordsScore: optionalScore(100).optional(),
  madeUpWordsScore: optionalScore(100).optional(),
  storyReadingScore: optionalScore(150).optional(),
  readingComprehensionScore: optionalScore(100).optional(),
  letterSoundScore: optionalScore(100).optional(),
  decodingScore: optionalScore(100).optional(),
  fluencyScore: optionalScore(150).optional(),
  comprehensionScore: optionalScore(100).optional(),

  notes: z.string().optional(),
});

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return getPortalUserFromSession(token);
}

export async function GET() {
  const user = await requireAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  logAuditEvent(
    user.id,
    user.fullName,
    "view_learner_details",
    "assessment_records",
    null,
    "Viewed learner-level assessment records.",
  );

  return NextResponse.json({ assessments: listAssessmentRecords(20) });
}

export async function POST(request: Request) {
  const user = await requireAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = assessmentSchema.parse(await request.json());
    const normalizedPayload: AssessmentRecordInput = {
      childName: payload.childName,
      childId: payload.childId,
      learnerUid: payload.learnerUid,
      gender: payload.gender,
      age: payload.age,
      schoolId: payload.schoolId,
      classGrade: payload.classGrade,
      assessmentDate: payload.assessmentDate,
      assessmentType: payload.assessmentType,
      letterIdentificationScore: payload.letterIdentificationScore ?? payload.letterSoundScore ?? null,
      soundIdentificationScore: payload.soundIdentificationScore ?? payload.letterSoundScore ?? null,
      decodableWordsScore: payload.decodableWordsScore ?? payload.decodingScore ?? null,
      undecodableWordsScore: payload.undecodableWordsScore ?? payload.decodingScore ?? null,
      madeUpWordsScore: payload.madeUpWordsScore ?? null,
      storyReadingScore: payload.storyReadingScore ?? payload.fluencyScore ?? null,
      readingComprehensionScore:
        payload.readingComprehensionScore ?? payload.comprehensionScore ?? null,
      notes: payload.notes,
    };

    const assessment = saveAssessmentRecord(normalizedPayload, user.id);

    return NextResponse.json({ ok: true, assessment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid assessment payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
