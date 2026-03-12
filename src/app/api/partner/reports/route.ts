import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertPartnerScopeAllowed,
  authenticatePartnerApiKeyAsync,
  listNationalReportPacksAsync,
  logPartnerExportAsync,
} from "@/lib/national-intelligence";

export const runtime = "nodejs";

const querySchema = z.object({
  scopeType: z.enum(["country", "region", "sub_region", "district", "sub_county", "parish", "school"]),
  scopeId: z.string().trim().min(1),
});

import { readApiKey } from "@/app/api/partner/_shared/auth";



export async function GET(request: Request) {
  try {
    const apiKey = readApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: "Missing partner API key." }, { status: 401 });
    }

    const client = await authenticatePartnerApiKeyAsync(apiKey);
    if (!client) {
      return NextResponse.json({ error: "Invalid partner API key." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      scopeType: searchParams.get("scopeType") ?? client.allowedScopeType,
      scopeId: searchParams.get("scopeId") ?? client.allowedScopeIds[0],
    });

    assertPartnerScopeAllowed({
      client,
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
    });

    const reports = (await listNationalReportPacksAsync({
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      limit: 50,
    })).map((report) => ({
      reportCode: report.reportCode,
      preset: report.preset,
      scopeType: report.scopeType,
      scopeId: report.scopeId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      generatedAt: report.generatedAt,
      generatedByName: report.generatedByName,
      pdfUrl: report.pdfPath
        ? `/api/portal/national-intelligence/reports/${encodeURIComponent(report.reportCode)}/pdf`
        : null,
    }));

    await logPartnerExportAsync({
      clientId: client.clientId,
      partnerName: client.partnerName,
      endpoint: "/api/partner/reports",
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      format: "json",
    });

    return NextResponse.json({ reports });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid partner reports query." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      const status = error.message.toLowerCase().includes("allowed") ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
