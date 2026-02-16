import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  getPortalUserFromSession,
  listAssessmentRecords,
  saveAssessmentRecord,
} from "@/lib/db";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";

export const runtime = "nodejs";

const assessmentSchema = z.object({
  schoolName: z.string().min(2),
  district: z.string().min(2),
  subCounty: z.string().min(2),
  parish: z.string().min(2),
  village: z.string().optional(),
  learnersAssessed: z.coerce.number().int().min(0),
  storiesPublished: z.coerce.number().int().min(0),
  assessmentDate: z.string().min(6),
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

  return NextResponse.json({ assessments: listAssessmentRecords(20) });
}

export async function POST(request: Request) {
  const user = await requireAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = assessmentSchema.parse(await request.json());
    const assessment = saveAssessmentRecord(payload, user.id);

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
