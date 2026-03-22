import { NextRequest, NextResponse } from "next/server";
import { renderBrandedPdf } from "@/lib/server/pdf/render";
import { getPublicImpactAggregate } from "@/services/dataService";
import {
  buildPublicDashboardReportModel,
  generatePublicDashboardNarrative,
  renderPublicDashboardReportHtml,
} from "@/lib/public-dashboard-report-engine";
import type { PublicReportEngineFormat } from "@/lib/public-dashboard-report-engine";

type PublicScopeLevel = "country" | "region" | "subregion" | "district" | "school";

export const runtime = "nodejs";

function normalizeScopeLevel(value: string | null): PublicScopeLevel | null {
  if (!value) {
    return "country";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "country") return "country";
  if (normalized === "region") return "region";
  if (normalized === "subregion") return "subregion";
  if (normalized === "district") return "district";
  if (normalized === "school") return "school";
  return null;
}

function normalizeFormat(value: string | null): PublicReportEngineFormat {
  const normalized = String(value ?? "html").trim().toLowerCase();
  if (normalized === "json") return "json";
  if (normalized === "pdf") return "pdf";
  return "html";
}

function toFilenameSafe(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return normalized || "uganda";
}

function buildDashboardHref(
  scopeLevel: PublicScopeLevel,
  scopeId: string,
  period: string,
) {
  const query = new URLSearchParams();
  query.set("period", period);

  if (scopeLevel === "region") {
    query.set("region", scopeId);
  }
  if (scopeLevel === "subregion") {
    query.set("subRegion", scopeId);
  }
  if (scopeLevel === "district") {
    query.set("district", scopeId);
  }
  if (scopeLevel === "school") {
    query.set("school", scopeId);
  }

  return `/impact?${query.toString()}`;
}

import { resolveReportScope } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  const scopeLevel = normalizeScopeLevel(request.nextUrl.searchParams.get("scopeLevel"));
  if (!scopeLevel) {
    return NextResponse.json({ error: "Invalid scopeLevel." }, { status: 400 });
  }

  const requestedScopeId = String(request.nextUrl.searchParams.get("scopeId") ?? "").trim();
  const scopeId = scopeLevel === "country" ? "Uganda" : requestedScopeId;
  const requestedScope = request.nextUrl.searchParams.get("reportScope");

  if (scopeLevel !== "country" && !scopeId) {
    return NextResponse.json(
      { error: "scopeId is required for region, subregion, district, and school." },
      { status: 400 },
    );
  }

  const period = String(request.nextUrl.searchParams.get("period") ?? "This Fiscal Year").trim() || "This Fiscal Year";
  const year = request.nextUrl.searchParams.get("year")?.trim() || undefined;
  const format = normalizeFormat(request.nextUrl.searchParams.get("format"));
  const reportType = String(request.nextUrl.searchParams.get("reportType") ?? "General Literacy Report").trim();
  const reportCategory = String(request.nextUrl.searchParams.get("reportCategory") ?? "").trim();

  // 1. Resolve Authentication and Permissions
  const token = request.cookies.get("portal_session")?.value ?? request.headers.get("authorization")?.replace("Bearer ", "");
  let userPermissions: string[] = [];
  
  if (token) {
    const { findPortalUserBySessionTokenPostgres } = await import("@/lib/server/postgres/repositories/auth");
    const { getPermissionsForPortalUser } = await import("@/lib/server/postgres/repositories/rbac");
    const user = await findPortalUserBySessionTokenPostgres(token);
    if (user) {
      userPermissions = await getPermissionsForPortalUser(user.id);
    }
  }

  // 2. Resolve Report Scope (Enforce Fallback to 'Public' if unauthorized)
  const reportScope = await resolveReportScope(userPermissions, requestedScope);

  try {
    // 3. Fetch Data with Scope Awareness
    const aggregate = await getPublicImpactAggregate(scopeLevel, scopeId, period, reportScope, year);
    
    // 4. Generate Narrative with Scope Awareness
    const narrative = await generatePublicDashboardNarrative(aggregate, reportScope, reportType);
    
    const report = buildPublicDashboardReportModel(aggregate, narrative);

    if (format === "json") {
      return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store" } });
    }

    const baseQuery = new URLSearchParams({
      scopeLevel,
      scopeId,
      period,
    });
    const pdfHref = `/api/impact/report-engine?${baseQuery.toString()}&format=pdf`;
    const dashboardHref = buildDashboardHref(scopeLevel, scopeId, period);
    const html = renderPublicDashboardReportHtml({
      report,
      pdfHref,
      dashboardHref,
    });

    if (format === "html") {
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // Generate PDF using pdf-lib (no Chromium required)
    const scopeLabel = scopeLevel === "country" ? "Uganda" : scopeId;
    const reportTitle = reportType !== "General Literacy Report" ? `${reportType} - ${scopeLabel}` : `Public Impact Dashboard Report - ${scopeLabel}`;
    const pdfBuffer = await renderBrandedPdf({
      title: reportTitle,
      subtitle: `${scopeLabel} | Period: ${period}${reportCategory ? ` | ${reportCategory}` : ""}`,
      documentNumber: `IMPACT-${scopeLevel.toUpperCase()}`,
      footerNote: "Ozeki Reading Bridge Foundation - Public Impact Report",
      accentHex: "#1f2a44",
      contentHtml: html,
    });

    const filename = `public-dashboard-${scopeLevel}-${toFilenameSafe(scopeId)}-${toFilenameSafe(period)}.pdf`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate report from dashboard data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
