import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createBenchmarkProfileAsync,
  listBenchmarkProfilesAsync,
  listBenchmarkRulesAsync,
  updateBenchmarkProfileAsync,
} from "@/lib/national-intelligence-async";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import {
  canAccessNationalIntelligenceInternal,
  canManageNationalBenchmarks,
} from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const postSchema = z.object({
  name: z.string().trim().min(3).max(80),
  effectiveFromDate: z.string().trim().min(8),
  effectiveToDate: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
  isActive: z.boolean().optional(),
});

const patchSchema = z.object({
  benchmarkId: z.coerce.number().int().positive(),
  name: z.string().trim().min(3).max(80).optional(),
  effectiveFromDate: z.string().trim().min(8).optional(),
  effectiveToDate: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
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
    const benchmarkIdRaw = searchParams.get("benchmarkId");
    const includeRules = String(searchParams.get("includeRules") ?? "false").toLowerCase() === "true";

    const profiles = await listBenchmarkProfilesAsync();
    const benchmarkId = benchmarkIdRaw ? Number(benchmarkIdRaw) : null;

    if (!includeRules) {
      return NextResponse.json({ profiles });
    }

    if (benchmarkId && Number.isInteger(benchmarkId) && benchmarkId > 0) {
      return NextResponse.json({
        profiles,
        rules: await listBenchmarkRulesAsync(benchmarkId),
      });
    }

    const rulesByBenchmarkEntries = await Promise.all(
      profiles.map(async (profile) => [String(profile.benchmarkId), await listBenchmarkRulesAsync(profile.benchmarkId)]),
    );
    const rulesByBenchmark = Object.fromEntries(rulesByBenchmarkEntries);

    return NextResponse.json({
      profiles,
      rulesByBenchmark,
    });
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
    const profile = await createBenchmarkProfileAsync({
      user: user as { id: number; fullName: string },
      profile: {
        name: payload.name,
        effectiveFromDate: payload.effectiveFromDate,
        effectiveToDate: payload.effectiveToDate,
        notes: payload.notes,
        isActive: payload.isActive,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid benchmark profile payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageNationalBenchmarks(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = patchSchema.parse(await request.json());
    const profile = await updateBenchmarkProfileAsync({
      user: user as { id: number; fullName: string },
      benchmarkId: payload.benchmarkId,
      profile: {
        name: payload.name,
        effectiveFromDate: payload.effectiveFromDate,
        effectiveToDate:
          payload.effectiveToDate === undefined
            ? undefined
            : payload.effectiveToDate,
        notes: payload.notes,
        isActive: payload.isActive,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid benchmark profile patch payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
