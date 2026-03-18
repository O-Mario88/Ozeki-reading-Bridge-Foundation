import { NextResponse } from "next/server";
import { getImpactReportByCodeAsync, incrementImpactReportDownloadCountAsync } from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { generateAcademicReportPdf, AcademicReportData } from "@/lib/server/pdf/academic-report-template";

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

    const narrative = report.narrative;
    const factPack = report.factPack;
    const coverage = factPack.coverageDelivery;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectionsHtml = narrative.sectionNarratives.map((section: any) => `
      <h4>${section.title}</h4>
      <p style="white-space: pre-wrap;">${section.summary}</p>
    `).join("");

    const learningOutcomesHtml = `
      <ul>
        <li><strong>Letter Names:</strong> ${factPack.learningOutcomes.letterIdentification.baseline ?? "N/A"} -> ${factPack.learningOutcomes.letterIdentification.endline ?? "N/A"}</li>
        <li><strong>Letter Sounds:</strong> ${factPack.learningOutcomes.soundIdentification.baseline ?? "N/A"} -> ${factPack.learningOutcomes.soundIdentification.endline ?? "N/A"}</li>
        <li><strong>Decodable Words:</strong> ${factPack.learningOutcomes.decodableWords.baseline ?? "N/A"} -> ${factPack.learningOutcomes.decodableWords.endline ?? "N/A"}</li>
        <li><strong>Comprehension:</strong> ${factPack.learningOutcomes.readingComprehension.baseline ?? "N/A"} -> ${factPack.learningOutcomes.readingComprehension.endline ?? "N/A"}</li>
      </ul>
    `;

    const academicData: AcademicReportData = {
      title: "Impact Report",
      subtitle: `${report.title} | ${report.scopeType}: ${report.scopeValue}`,
      author: "Ozeki Foundation Analytics",
      date: new Date().toLocaleDateString(),
      recipient: report.partnerName || (report.isPublic ? "Public Audience" : "Internal Review"),
      sections: {
        executiveSummary: narrative.executiveSummary || "No summary provided.",
        introduction: `This report evaluates the impact of Ozeki programs spanning ${report.periodStart} to ${report.periodEnd}.`,
        methodology: `Data drawn from verified assessments representing n=${factPack.dataTrust?.n} with completeness of ${factPack.dataTrust?.completenessPercent?.toFixed(1) || 0}%. \n\n${narrative.methodsNote || ""}`,
        findings: `
          ### 6.1 Coverage & Delivery
          - Schools Impacted: **${coverage.schoolsImpacted}**
          - Teachers Trained: **${coverage.teachersTrained}**
          - Schools Visited: **${coverage.schoolsCoachedVisited}**
          - Learners Reached: **${coverage.learnersReached}**

          ### 6.2 Learning Outcomes
          ${learningOutcomesHtml}
          
          ### 6.3 Program Narrative
          ${sectionsHtml}
        `,
        conclusion: `Data validation confirms an assessment completeness of ${factPack.dataTrust?.completenessPercent?.toFixed(1) || 0}%.`,
        recommendations: "Review specific metrics for actionable gaps in instruction quality.",
        references: `Report Code: ${report.reportCode}`,
      }
    };

    const pdfBuffer = await generateAcademicReportPdf(academicData, {
      documentNumber: report.reportCode,
      accentHex: "#1f2a44",
    });

    await incrementImpactReportDownloadCountAsync(report.reportCode);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${report.reportCode}.pdf"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating Impact Report PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
