import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listBenchmarkRulesAsync,
  upsertBenchmarkRuleAsync,
} from "@/lib/national-intelligence-async";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import {
  canAccessNationalIntelligenceInternal,
  canManageNationalBenchmarks,
} from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const cwpmBandsSchema = z.object({
  non_reader: z.coerce.number().nonnegative(),
  emergent: z.tuple([z.coerce.number(), z.coerce.number()]),
  minimum: z.tuple([z.coerce.number(), z.coerce.number()]),
  competent: z.tuple([z.coerce.number(), z.coerce.number()]),
  strong: z.tuple([z.coerce.number(), z.coerce.number()]),
});

const comprehensionRuleSchema = z.union([
  z.object({
    type: z.literal("percent"),
    threshold: z.coerce.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("count"),
    correct: z.coerce.number().nonnegative(),
    total: z.coerce.number().positive(),
  }),
]);

const postSchema = z.object({
  benchmarkId: z.coerce.number().int().positive(),
  grade: z.enum(["ALL", "P1", "P2", "P3", "P4", "P5", "P6", "P7"]),
  language: z.string().trim().min(2).max(20),
  cwpmBands: cwpmBandsSchema,
  comprehensionProficientRule: comprehensionRuleSchema,
  optionalAccuracyFloor: z.coerce.number().min(0).max(100).nullable().optional(),
  domainProficiencyThresholds: z.record(z.string(), z.coerce.number().min(0).max(100)).optional(),
});

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessNationalIntelligenceInternal(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const benchmarkId = Number(searchParams.get("benchmarkId") ?? 0);
    if (!Number.isInteger(benchmarkId) || benchmarkId <= 0) {
      return NextResponse.json({ error: "benchmarkId is required." }, { status: 400 });
    }

    return NextResponse.json({ rules: await listBenchmarkRulesAsync(benchmarkId) });
  } catch (error) {
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
  if (!canManageNationalBenchmarks(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = postSchema.parse(await request.json());
    const rules = await upsertBenchmarkRuleAsync({
      user: user as { id: number; fullName: string },
      rule: payload,
    });
    return NextResponse.json({ rules });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid benchmark rule payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
