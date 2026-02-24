import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getImpactReportByCode, incrementImpactReportDownloadCount } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

function wrapText(text: string, maxChars = 95) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if ((current + " " + word).trim().length > maxChars) {
      if (current.trim()) {
        lines.push(current.trim());
      }
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });

  if (current.trim()) {
    lines.push(current.trim());
  }
  return lines;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const user = await getAuthenticatedPortalUser();
  const report = getImpactReportByCode(code, user);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 1191]); // A4 landscape-ish readability
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 1145;
  const left = 36;
  const lineHeight = 15;

  const drawLine = (text: string, size = 11, isBold = false, color = rgb(0.05, 0.09, 0.2)) => {
    page.drawText(text, {
      x: left,
      y,
      size,
      font: isBold ? bold : font,
      color,
    });
    y -= lineHeight;
  };

  const drawSection = (heading: string, lines: string[]) => {
    if (y < 120) return;
    y -= 6;
    drawLine(heading, 13, true, rgb(0.04, 0.31, 0.4));
    lines.forEach((line) => {
      if (y < 90) return;
      drawLine(line, 10, false, rgb(0.1, 0.1, 0.1));
    });
  };

  drawLine("Ozeki Reading Bridge Foundation", 16, true, rgb(0.04, 0.31, 0.4));
  drawLine("Impact Report", 13, true, rgb(0.04, 0.31, 0.4));
  y -= 4;
  drawLine(`Report Code: ${report.reportCode}`, 10);
  drawLine(`Title: ${report.title}`, 10);
  drawLine(`Type: ${report.reportType}`, 10);
  drawLine(`Variant: ${report.narrative.variant}`, 10);
  if (report.partnerName) {
    drawLine(`Partner: ${report.partnerName}`, 10);
  }
  drawLine(`Scope: ${report.scopeType} - ${report.scopeValue}`, 10);
  drawLine(`Period: ${report.periodStart} to ${report.periodEnd}`, 10);
  drawLine(`Version: ${report.version}`, 10);
  drawLine(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 10);
  drawLine(`Template: ${report.narrative.template.masterTemplateId}`, 10);

  drawSection("Executive Summary", wrapText(report.narrative.executiveSummary));
  drawSection(
    "Table of Contents",
    report.narrative.template.tableOfContents.slice(0, 12).map((item) => `- ${item}`),
  );
  drawSection(
    "AI Writing Rules",
    report.narrative.template.aiWritingRules.map((item) => `- ${item}`),
  );

  const coverage = report.factPack.coverageDelivery;
  drawSection("Coverage & Delivery", [
    `Schools impacted: ${coverage.schoolsImpacted.toLocaleString()}`,
    `Schools coached/visited: ${coverage.schoolsCoachedVisited.toLocaleString()}`,
    `Teachers trained: ${coverage.teachersTrained.toLocaleString()}`,
    `School leaders trained: ${coverage.schoolLeadersTrained.toLocaleString()}`,
    `Learners reached (standardized): ${coverage.learnersReached.toLocaleString()}`,
    `Coaching visits completed/planned: ${coverage.coachingVisitsCompleted}/${coverage.coachingVisitsPlanned}`,
    `Assessments baseline/progress/endline: ${coverage.assessmentsConducted.baseline}/${coverage.assessmentsConducted.progress}/${coverage.assessmentsConducted.endline}`,
  ]);

  const outcomes = report.factPack.learningOutcomes;
  const formatMetric = (label: string, value: { baseline: number | null; endline: number | null; change: number | null }) =>
    `${label}: baseline=${value.baseline ?? "Data not available"}, endline=${value.endline ?? "Data not available"}, change=${value.change ?? "Data not available"}`;
  drawSection("Learning Outcomes", [
    formatMetric("Letter Identification", outcomes.letterIdentification),
    formatMetric("Sound Identification", outcomes.soundIdentification),
    formatMetric("Decodable Words", outcomes.decodableWords),
    formatMetric("Undecodable Words", outcomes.undecodableWords),
    formatMetric("Made Up Words", outcomes.madeUpWords),
    formatMetric("Story Reading", outcomes.storyReading),
    formatMetric("Reading Comprehension", outcomes.readingComprehension),
    `Proficiency band movement (%): ${outcomes.proficiencyBandMovementPercent ?? "Data not available"}`,
    `Reduction in non-readers (%): ${outcomes.reductionInNonReadersPercent ?? "Data not available"}`,
  ]);

  drawSection("Instruction Quality", [
    `Routine adoption rate: ${report.factPack.instructionQuality.routineAdoptionRate ?? "Data not available"}`,
    `Observation score change: ${report.factPack.instructionQuality.observationScoreChange ?? "Data not available"}`,
    `Top gaps: ${report.factPack.instructionQuality.topGaps.length > 0
      ? report.factPack.instructionQuality.topGaps.join(", ")
      : "Data not available"
    }`,
  ]);

  drawSection("Priorities", report.narrative.nextPriorities.flatMap((item) => wrapText(`- ${item}`)));
  drawSection(
    "Section Narratives",
    report.narrative.sectionNarratives.slice(0, 8).flatMap((section) => [
      `${section.title}:`,
      ...wrapText(section.summary, 90),
    ]),
  );
  drawSection("Methods & Limitations", [
    ...wrapText(report.narrative.methodsNote),
    ...wrapText(report.narrative.limitations),
  ]);

  const bytes = await doc.save();
  incrementImpactReportDownloadCount(report.reportCode);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.reportCode}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
