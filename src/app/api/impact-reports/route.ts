import { NextResponse } from "next/server";
import { z } from "zod";
import { getImpactReportFilterFacets, listPublicImpactReports } from "@/lib/db";
import { ImpactReportScopeType, ImpactReportType } from "@/lib/types";

const scopeTypeSchema = z.enum(["National", "Region", "District", "School"]);
const reportTypeSchema = z.enum([
  "FY Impact Report",
  "Regional Impact Report",
  "District Report",
  "School Report",
  "Partner Snapshot Report",
]);

function parseFilters(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const year = searchParams.get("year") || undefined;
  const scopeTypeRaw = searchParams.get("scopeType");
  const scopeValue = searchParams.get("scopeValue") || undefined;
  const reportTypeRaw = searchParams.get("reportType");
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  return {
    year: year && /^\d{4}$/.test(year) ? year : undefined,
    scopeType: scopeTypeRaw
      ? (scopeTypeSchema.parse(scopeTypeRaw) as ImpactReportScopeType)
      : undefined,
    scopeValue,
    reportType: reportTypeRaw
      ? (reportTypeSchema.parse(reportTypeRaw) as ImpactReportType)
      : undefined,
    limit: limit && Number.isFinite(limit) ? Math.max(1, Math.min(limit, 120)) : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const filters = parseFilters(request);
    const reports = listPublicImpactReports(filters);
    const facets = getImpactReportFilterFacets();
    return NextResponse.json({ reports, facets });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid report filters." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
