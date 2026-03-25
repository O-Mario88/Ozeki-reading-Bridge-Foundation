import { NextResponse } from "next/server";
import { getImpactReportByCodeAsync, incrementImpactReportDownloadCountAsync } from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { buildPublicDashboardReportModel, renderPublicDashboardReportHtml } from "@/lib/public-dashboard-report-engine";
import { renderBrandedPdf } from "@/lib/server/pdf/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    const user = await getAuthenticatedPortalUser();
    const report = await getImpactReportByCodeAsync(code, user);

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const narrative = report.narrative_json;
    const factPack = report.fact_pack_json;

    if (!narrative || !factPack || Object.keys(factPack).length === 0) {
       return NextResponse.json({ error: "Report data is incomplete or still generating." }, { status: 422 });
    }

    const reportModel = buildPublicDashboardReportModel(factPack, narrative);

    const html = renderPublicDashboardReportHtml({
      report: reportModel,
      pdfHref: "#",
      dashboardHref: "#",
    });

    const pdfBuffer = await renderBrandedPdf({
      title: report.title || "Impact Report",
      subtitle: `${report.scope_value} | ${report.period_start} to ${report.period_end} | ${report.report_category || report.report_type}`,
      documentNumber: report.report_code,
      footerNote: "Ozeki Reading Bridge Foundation - Impact Report",
      accentHex: "#1f2a44",
      contentHtml: html,
    });

    await incrementImpactReportDownloadCountAsync(report.report_code);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${report.report_code}.pdf"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating Impact Report PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
