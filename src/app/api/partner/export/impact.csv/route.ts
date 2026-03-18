import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertPartnerScopeAllowed,
  buildPartnerImpactCsv,
  getPartnerImpactDatasetAsync,
  authenticatePartnerApiKeyAsync,
  logPartnerExportAsync,
} from "@/lib/national-intelligence-async";

export const runtime = "nodejs";

const querySchema = z.object({
  scopeType: z.enum(["country", "region", "sub_region", "district", "sub_county", "parish", "school"]),
  scopeId: z.string().trim().min(1),
  periodStart: z.string().trim().optional(),
  periodEnd: z.string().trim().optional(),
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
      periodStart: searchParams.get("periodStart") ?? undefined,
      periodEnd: searchParams.get("periodEnd") ?? undefined,
    });

    assertPartnerScopeAllowed({
      client,
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
    });

    const impact = await getPartnerImpactDatasetAsync({
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
    });

    const csv = buildPartnerImpactCsv(impact);

    await logPartnerExportAsync({
      clientId: client.clientId,
      partnerName: client.partnerName,
      endpoint: "/api/partner/export/impact.csv",
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      format: "csv",
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=partner-impact-${parsed.scopeType}-${encodeURIComponent(parsed.scopeId)}.csv`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid partner CSV export query." },
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
