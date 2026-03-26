import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateNationalReportPackAsync as generateNationalReportPack,
  listNationalReportPacksAsync,
  listNationalReportPresets,
} from "@/lib/national-intelligence-async";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { canAccessNationalIntelligenceInternal } from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const presetSchema = z.enum([
  "National Quarterly Snapshot",
  "District Literacy Brief",
  "School Coaching Pack",
  "Annual National Report",
]);

const querySchema = z.object({
  preset: presetSchema.optional(),
  scopeType: z
    .enum(["country", "region", "sub_region", "district", "sub_county", "parish", "school"])
    .optional(),
  scopeId: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

const postSchema = z.object({
  preset: presetSchema,
  scopeType: z.enum(["country", "region", "sub_region", "district", "sub_county", "parish", "school"]),
  scopeId: z.string().trim().min(1),
  periodStart: z.string().trim().optional(),
  periodEnd: z.string().trim().optional(),
});

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!canAccessNationalIntelligenceInternal(user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      preset: searchParams.get("preset") ?? undefined,
      scopeType: searchParams.get("scopeType") ?? undefined,
      scopeId: searchParams.get("scopeId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const reports = await listNationalReportPacksAsync({
      preset: parsed.preset,
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      limit: parsed.limit,
    });

    return NextResponse.json({
      presets: listNationalReportPresets(),
      reports: reports.map((report) => ({
        ...report,
        pdfUrl: report.pdfPath
          ? `/api/portal/national-intelligence/reports/${encodeURIComponent(report.reportCode)}/pdf`
          : null,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid national report query." },
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!canAccessNationalIntelligenceInternal(user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = postSchema.parse(await request.json());
    const report = await generateNationalReportPack({
      user,
      preset: payload.preset,
      scopeType: payload.scopeType,
      scopeId: payload.scopeId,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
    });
    if (!report) {
      throw new Error("Could not generate national report pack.");
    }

    return NextResponse.json({
      report: {
        ...report,
        pdfUrl: report.pdfPath
          ? `/api/portal/national-intelligence/reports/${encodeURIComponent(report.reportCode)}/pdf`
          : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid national report payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
