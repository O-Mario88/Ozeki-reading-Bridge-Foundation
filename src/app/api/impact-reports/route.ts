import { NextResponse } from "next/server";
import { z } from "zod";
import { getImpactReportFilterFacetsAsync, listPublicImpactReportsAsync } from "@/lib/db";
import {
  ImpactReportAudience,
  ImpactReportOutput,
  ImpactReportPeriodType,
  ImpactReportScopeType,
  ImpactReportType,
  ReportCategory,
} from "@/lib/types";

const scopeTypeSchema = z.enum([
  "National",
  "Region",
  "Sub-region",
  "District",
  "Sub-county",
  "Parish",
  "School",
]);
const reportTypeSchema = z.enum([
  "FY Impact Report",
  "Regional Impact Report",
  "Sub-region Report",
  "District Report",
  "School Report",
  "School Coaching Pack",
  "Headteacher Summary",
  "Partner Snapshot Report",
]);
const reportCategorySchema = z.enum([
  "Assessment Report",
  "Training Report",
  "School Coaching Visit Report",
  "Teaching Quality Report (Lesson Evaluations)",
  "Remedial & Catch-Up Intervention Report",
  "1001 Story Project Report",
  "Implementation Fidelity & Coverage Report",
  "District Literacy Brief",
  "Graduation Readiness & Alumni Monitoring Report",
  "Partner/Donor Report (Scoped)",
  "Data Quality & Credibility Report",
  "School Profile Report (Headteacher Pack)",
]);
const periodTypeSchema = z.enum(["FY", "Term", "Quarter", "Custom"]);
const audienceSchema = z.enum(["Public-safe", "Staff-only"]);
const outputSchema = z.enum(["PDF", "HTML preview"]);

function parseFilters(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const year = searchParams.get("year") || undefined;
  const scopeTypeRaw = searchParams.get("scopeType");
  const scopeValue = searchParams.get("scopeValue") || undefined;
  const reportTypeRaw = searchParams.get("reportType");
  const reportCategoryRaw = searchParams.get("reportCategory");
  const periodTypeRaw = searchParams.get("periodType");
  const audienceRaw = searchParams.get("audience");
  const outputRaw = searchParams.get("output");
  const region = searchParams.get("region") || undefined;
  const subRegion = searchParams.get("subRegion") || undefined;
  const district = searchParams.get("district") || undefined;
  const schoolIdRaw = searchParams.get("schoolId");
  const schoolId = schoolIdRaw ? Number(schoolIdRaw) : undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const parsedYear = year ? Number(year) : NaN;

  return {
    year:
      Number.isInteger(parsedYear) && parsedYear >= 2025 && parsedYear <= 2050
        ? String(parsedYear)
        : undefined,
    scopeType: scopeTypeRaw
      ? (scopeTypeSchema.parse(scopeTypeRaw) as ImpactReportScopeType)
      : undefined,
    scopeValue,
    reportType: reportTypeRaw
      ? (reportTypeSchema.parse(reportTypeRaw) as ImpactReportType)
      : undefined,
    reportCategory: reportCategoryRaw
      ? (reportCategorySchema.parse(reportCategoryRaw) as ReportCategory)
      : undefined,
    periodType: periodTypeRaw
      ? (periodTypeSchema.parse(periodTypeRaw) as ImpactReportPeriodType)
      : undefined,
    audience: audienceRaw
      ? (audienceSchema.parse(audienceRaw) as ImpactReportAudience)
      : undefined,
    output: outputRaw
      ? (outputSchema.parse(outputRaw) as ImpactReportOutput)
      : undefined,
    region,
    subRegion,
    district,
    schoolId:
      schoolId !== undefined && Number.isFinite(schoolId) && schoolId > 0
        ? Math.trunc(schoolId)
        : undefined,
    limit: limit && Number.isFinite(limit) ? Math.max(1, Math.min(limit, 120)) : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const filters = parseFilters(request);
    const reports = await listPublicImpactReportsAsync(filters);
    const facets = await getImpactReportFilterFacetsAsync();
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
