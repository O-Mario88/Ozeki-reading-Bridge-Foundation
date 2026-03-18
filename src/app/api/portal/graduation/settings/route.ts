import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getGraduationSettingsAsync,
  updateGraduationSettingsAsync,
} from "@/services/dataService";
import { authorizeSuperAdmin } from "@/app/api/portal/_shared/auth";

export const runtime = "nodejs";

const settingsSchema = z.object({
  graduationEnabled: z.boolean().optional(),
  targetDomainProficiencyPct: z.coerce.number().min(0).max(100).optional(),
  requiredDomains: z
    .array(z.enum(["letter_sounds", "decoding", "fluency", "comprehension"]))
    .min(1)
    .max(4)
    .optional(),
  requiredReadingLevel: z
    .enum(["Non-Reader", "Emerging", "Developing", "Transitional", "Fluent"])
    .optional(),
  requiredFluentPct: z.coerce.number().min(0).max(100).optional(),
  minPublishedStories: z.coerce.number().int().min(0).max(100000).optional(),
  targetTeachingQualityPct: z.coerce.number().min(0).max(100).optional(),
  requireTeachingDomains: z.boolean().optional(),
  latestAssessmentRequired: z.boolean().optional(),
  latestEvaluationRequired: z.boolean().optional(),
  assessmentCycleMode: z.enum(["latest_or_endline", "latest", "endline"]).optional(),
  dismissSnoozeDays: z.coerce.number().int().min(1).max(3650).optional(),
  criteriaVersion: z.string().trim().min(3).max(40).optional(),
  /* V2 evidence gates */
  minLearnersAssessedN: z.coerce.number().int().min(0).max(10000).optional(),
  targetGrades: z.array(z.string().trim().min(1).max(10)).min(1).max(20).optional(),
  minTeacherEvaluationsTotal: z.coerce.number().int().min(0).max(1000).optional(),
  minEvaluationsPerReadingTeacher: z.coerce.number().int().min(0).max(100).optional(),
  dataCompletenessThreshold: z.coerce.number().min(0).max(100).optional(),
  /* V2 sustainability */
  requireSustainabilityValidation: z.boolean().optional(),
  sustainabilityChecklistItems: z.array(z.string().trim().min(3).max(200)).min(1).max(20).optional(),
});

export async function GET() {
  const auth = await authorizeSuperAdmin();
  if (!auth.authorized) {
    return auth.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ settings: await getGraduationSettingsAsync() });
}

export async function PUT(request: Request) {
  const auth = await authorizeSuperAdmin();
  if (!auth.authorized) {
    return auth.response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = auth.user!;

  try {
    const parsed = settingsSchema.parse(await request.json());
    const settings = await updateGraduationSettingsAsync(parsed, user);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid settings payload." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings." },
      { status: 400 },
    );
  }
}
