import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateTrainingReportArtifact,
  listTrainingReportArtifactsAsync,
} from "@/lib/training-report-automation";
import type { TrainingReportScopeType } from "@/lib/types";
import { getAuthenticatedPortalUser } from "@/lib/auth";

export const runtime = "nodejs";

const scopeTypeSchema = z.enum([
  "training_session",
  "month",
  "quarter",
  "fy",
  "district",
  "region",
  "sub_region",
  "country",
]);

const postSchema = z.object({
  scopeType: scopeTypeSchema,
  scopeValue: z.string().trim().optional(),
  periodStart: z.string().trim().optional(),
  periodEnd: z.string().trim().optional(),
  includeObservedInsights: z.boolean().optional(),
});

const getSchema = z.object({
  scopeType: scopeTypeSchema.optional(),
  scopeValue: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

function canAccessInternalTrainingReports(user: {
  role: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}) {
  return (
    user.isAdmin ||
    user.isSuperAdmin ||
    user.role === "Staff" ||
    user.role === "Admin"
  );
}

function toResponseRecord(
  artifact: Awaited<ReturnType<typeof listTrainingReportArtifactsAsync>>[number],
) {
  return {
    id: artifact.id,
    reportCode: artifact.reportCode,
    scopeType: artifact.scopeType,
    scopeValue: artifact.scopeValue,
    periodStart: artifact.periodStart,
    periodEnd: artifact.periodEnd,
    facts: artifact.facts,
    narrative: artifact.narrative,
    htmlReport: artifact.htmlReport,
    generatedByUserId: artifact.generatedByUserId,
    generatedByName: artifact.generatedByName,
    generatedAt: artifact.generatedAt,
    updatedAt: artifact.updatedAt,
    pdfUrl: artifact.pdfStoredPath
      ? `/api/portal/automation/training-report/${encodeURIComponent(artifact.reportCode)}/pdf`
      : null,
  };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessInternalTrainingReports(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = getSchema.parse({
      scopeType: searchParams.get("scopeType") ?? undefined,
      scopeValue: searchParams.get("scopeValue") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const records = await listTrainingReportArtifactsAsync({
      scopeType: parsed.scopeType as TrainingReportScopeType | undefined,
      scopeValue: parsed.scopeValue,
      limit: parsed.limit,
    });
    return NextResponse.json({
      records: records.map((record) => toResponseRecord(record)),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid training report query." },
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
  if (!canAccessInternalTrainingReports(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = postSchema.parse(await request.json());
    const artifact = await generateTrainingReportArtifact({
      user,
      scopeType: payload.scopeType,
      scopeValue: payload.scopeValue,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      includeObservedInsights: payload.includeObservedInsights ?? true,
    });
    if (!artifact) {
      throw new Error("Could not load generated report artifact.");
    }

    return NextResponse.json({
      report: toResponseRecord(artifact),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid training report payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
