import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertPartnerScopeAllowed,
  authenticatePartnerApiKey,
  getPartnerImpactDataset,
  logPartnerExport,
} from "@/lib/national-intelligence";

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

    const client = authenticatePartnerApiKey(apiKey);
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

    const impact = getPartnerImpactDataset({
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
    });

    logPartnerExport({
      clientId: client.clientId,
      partnerName: client.partnerName,
      endpoint: "/api/partner/impact",
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      format: "json",
    });

    return NextResponse.json({ impact });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid partner impact query." },
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
