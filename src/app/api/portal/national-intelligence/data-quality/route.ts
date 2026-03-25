import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listDataQualitySummariesAsync,
  listEducationAuditExceptionsAsync,
  runEducationDataQualitySweepAsync,
} from "@/lib/national-intelligence-async";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import {
  canAccessNationalIntelligenceInternal,
  canRunEducationAuditSweep,
} from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const sweepSchema = z.object({
  scopeType: z
    .enum(["country", "region", "sub_region", "district", "sub_county", "parish", "school"])
    .optional(),
  scopeId: z.string().trim().optional(),
});

const getSchema = z.object({
  scopeType: z
    .enum(["country", "region", "sub_region", "district", "sub_county", "parish", "school"])
    .optional(),
  scopeId: z.string().trim().optional(),
  status: z.enum(["open", "resolved", "overridden"]).optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  ruleCode: z.string().trim().optional(),
  periodKey: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(2000).optional(),
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
    const parsed = getSchema.parse({
      scopeType: searchParams.get("scopeType") ?? undefined,
      scopeId: searchParams.get("scopeId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
      ruleCode: searchParams.get("ruleCode") ?? undefined,
      periodKey: searchParams.get("periodKey") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const summaries = await listDataQualitySummariesAsync({
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      periodKey: parsed.periodKey,
      limit: Math.min(parsed.limit ?? 200, 500),
    });

    const exceptions = await listEducationAuditExceptionsAsync({
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      status: parsed.status,
      severity: parsed.severity,
      ruleCode: parsed.ruleCode,
      limit: parsed.limit,
    });

    return NextResponse.json({ summaries, exceptions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid data quality query." },
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
  if (!canRunEducationAuditSweep(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = sweepSchema.parse(await request.json());
    const result = await runEducationDataQualitySweepAsync({
      user,
      scopeType: payload.scopeType ?? 'country',
      scopeId: payload.scopeId ?? '',
    });

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid data quality sweep payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
