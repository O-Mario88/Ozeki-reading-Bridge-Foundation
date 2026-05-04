import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  getPortalUserFromSession,
  listTrainingSessions,
  saveTrainingSession,
} from "@/services/dataService";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const participantSchema = z.object({
  name: z.string().min(2),
  role: z.enum(["Classroom teacher", "School Leader"]),
  phone: z.string().min(7),
  email: z.string().email(),
  gender: z.enum(["Male", "Female"]).optional(),
  schoolId: z.coerce.number().int().positive().optional(),
});

const sessionSchema = z.object({
  schoolName: z.string().min(2),
  district: z.string().min(2),
  subCounty: z.string().min(2),
  parish: z.string().optional(),
  village: z.string().optional(),
  sessionDate: z.string().min(6),
  participants: z.array(participantSchema).min(1),
});

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return await getPortalUserFromSession(token);
}

export async function GET() {
  const user = await requireAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ sessions: await listTrainingSessions(20) });
}

export async function POST(request: Request) {
  const user = await requireAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = sessionSchema.parse(await request.json());
    const session = await saveTrainingSession(payload, user.id);

    await auditLog({
      actor: user,
      action: "create",
      targetTable: "training_sessions",
      targetId: (session as { id?: number })?.id,
      after: payload,
      detail: `Created training session`,
      request,
    });
    return NextResponse.json({ ok: true, session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid training payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
