import { NextResponse } from "next/server";
import { getPortalUserOrRedirect } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { generateAcademicReportPdf, AcademicReportData } from "@/lib/server/pdf/academic-report-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const user = await getPortalUserOrRedirect();
    const params = await props.params;

    const schoolId = Number(params.id);
    const reportId = Number(params.reportId);

    if (!schoolId || !reportId || isNaN(schoolId) || isNaN(reportId)) {
      return new NextResponse("Invalid ID", { status: 400 });
    }

    // Only allow verified users to download
    const hasAccess =
      user.role === "Volunteer" ||
      user.role === "Staff" ||
      user.role === "Admin" ||
      user.isAdmin ||
      user.isSuperAdmin;

    if (!hasAccess) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const res = await queryPostgres(
      "SELECT fact_pack_json, ai_narrative_json, staff_summary_override FROM school_performance_reports WHERE id = $1 AND school_id = $2 AND status = 'approved'",
      [reportId, schoolId]
    );

    if (res.rows.length === 0) {
      return new NextResponse("Approved report not found", { status: 404 });
    }

    const report = res.rows[0];
    const factPack = report.fact_pack_json;
    const narrative = report.ai_narrative_json;
    const staffSummary = report.staff_summary_override;

    const academicData: AcademicReportData = {
      title: "School Performance Report",
      subtitle: `${factPack.schoolName} | Period: ${factPack.periodStart} to ${factPack.periodEnd}`,
      author: "Ozeki Performance Validation Engine",
      date: new Date().toLocaleDateString(),
      recipient: "Operations Quality Assurance",
      sections: {
        executiveSummary: staffSummary || narrative?.executiveSummary || "No executive summary provided.",
        introduction: narrative?.introduction || `This report details the operational and literacy performance of ${factPack.schoolName}.`,
        methodology: narrative?.methodology || `Data collected via live internal assessments, visit logs, and evaluation entries.`,
        findings: (narrative?.findings || "No findings analyzed.") + 
          `\n\n### Metric Summary\n` +
          `- Total Learners Assessed: **${factPack.assessments.totalLearners}**\n` +
          `- Total School Visits: **${factPack.visits.total}**\n` +
          `- Lesson Evaluations Conducted: **${factPack.evaluations.total}**\n` +
          `- Average Teacher Quality: **${factPack.evaluations.avgLevel}**`,
        conclusion: narrative?.conclusion || "Report concluded.",
        recommendations: narrative?.recommendations || "Review school dashboard for granular data.",
        references: narrative?.references || "Internal Fact Pack System.",
      }
    };

    const pdfBuffer = await generateAcademicReportPdf(academicData, {
      documentNumber: `SRP-${schoolId}-${reportId}`,
      accentHex: "#1f2a44",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="School_Performance_${factPack.schoolName.replace(/[^a-zA-Z0-9]/g, "_")}_${factPack.periodEnd}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating School Performance PDF:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
