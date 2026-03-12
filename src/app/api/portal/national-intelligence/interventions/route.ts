import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createInterventionPlanAsync,
  createInterventionPlanFromPriorityAsync,
  listInterventionPlansAsync,
} from "@/lib/national-intelligence-async";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { canManageNationalInterventions } from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const getSchema = z.object({
  scopeType: z.enum(["school", "district"]).optional(),
  scopeId: z.string().trim().optional(),
  status: z.enum(["planned", "in_progress", "completed", "paused"]).optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
});

const postSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("manual"),
    scopeType: z.enum(["school", "district"]),
    scopeId: z.string().trim().min(1),
    schoolId: z.coerce.number().int().positive().nullable().optional(),
    district: z.string().trim().optional(),
    title: z.string().trim().min(3).max(200),
    status: z.enum(["planned", "in_progress", "completed", "paused"]).optional(),
    targetMetrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    notes: z.string().trim().max(4000).optional(),
  }),
  z.object({
    mode: z.literal("from_priority"),
    schoolId: z.coerce.number().int().positive(),
    schoolName: z.string().trim().min(2),
    district: z.string().trim().default(""),
    metrics: z.object({
      nonReadersPct: z.coerce.number(),
      at20PlusDeltaPct: z.coerce.number(),
      teachingQualityPct: z.coerce.number(),
      coachingCoveragePct: z.coerce.number(),
      completenessPct: z.coerce.number(),
    }),
    recommendedIntervention: z.enum([
      "Remedial & Catch-up",
      "Coaching",
      "Training",
      "Leadership support",
    ]),
  }),
]);

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageNationalInterventions(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = getSchema.parse({
      scopeType: searchParams.get("scopeType") ?? undefined,
      scopeId: searchParams.get("scopeId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return NextResponse.json({
      plans: await listInterventionPlansAsync({
        scopeType: parsed.scopeType,
        scopeId: parsed.scopeId,
        status: parsed.status,
        limit: parsed.limit,
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid intervention query." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageNationalInterventions(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = postSchema.parse(await request.json());
    const plan =
      payload.mode === "from_priority"
        ? await createInterventionPlanFromPriorityAsync({
          user,
          item: payload,
        })
        : await createInterventionPlanAsync({
          user,
          input: {
            scopeType: payload.scopeType,
            scopeId: payload.scopeId,
            schoolId: payload.schoolId,
            district: payload.district,
            title: payload.title,
            status: payload.status,
            targetMetrics: payload.targetMetrics,
            startDate: payload.startDate,
            endDate: payload.endDate,
            notes: payload.notes,
          },
        });

    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid intervention payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
