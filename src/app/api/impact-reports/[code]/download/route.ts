import { NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import { getImpactReportByCodeAsync, incrementImpactReportDownloadCountAsync } from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { embedPdfSerifFonts } from "@/lib/pdf-fonts";
import {
  drawBrandFooter,
  drawBrandFrame,
  drawBrandHeader,
  drawBrandWatermark,
  loadBrandLogo,
} from "@/lib/pdf-branding";
import { LEARNING_DOMAIN_DICTIONARY } from "@/lib/domain-dictionary";

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
  const report = await getImpactReportByCodeAsync(code, user);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const doc = await PDFDocument.create();
  const pageWidth = 595.28; // A4 portrait
  const pageHeight = 841.89;
  const firstPageStartY = 600;
  const continuationPageStartY = pageHeight - 74;
  const minBottomY = 92;
  const serifFonts = await embedPdfSerifFonts(doc);
  const font = serifFonts.regular;
  const bold = serifFonts.bold;
  const logo = await loadBrandLogo(doc);

  const createBrandedPage = (includeHeader: boolean) => {
    const nextPage = doc.addPage([pageWidth, pageHeight]);
    drawBrandFrame(nextPage);
    drawBrandWatermark(nextPage, logo);
    if (includeHeader) {
      drawBrandHeader({
        page: nextPage,
        font,
        fontBold: bold,
        logo,
        title: "IMPACT REPORT",
        documentNumber: report.reportCode,
        subtitle: `${report.scopeType} • ${report.scopeValue} • ${report.periodStart} to ${report.periodEnd}`,
        titleColor: rgb(0.04, 0.31, 0.4),
        titleSize: 24,
        numberSize: 14,
        subtitleSize: 9.5,
      });
    }
    return nextPage;
  };

  let page = createBrandedPage(true);
  let y = firstPageStartY;
  const left = 36;
  const lineHeight = 15;
  const ensureSpace = (requiredHeight: number) => {
    if (y - requiredHeight < minBottomY) {
      page = createBrandedPage(false);
      y = continuationPageStartY;
    }
  };

  const drawLine = (text: string, size = 11, isBold = false, color = rgb(0.05, 0.09, 0.2)) => {
    ensureSpace(lineHeight);
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
    y -= 6;
    ensureSpace(lineHeight);
    drawLine(heading, 13, true, rgb(0.04, 0.31, 0.4));
    lines.forEach((line) => {
      wrapText(line, 86).forEach((wrappedLine) => {
        drawLine(wrappedLine, 10, false, rgb(0.1, 0.1, 0.1));
      });
    });
  };

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

  if (report.factPack.sponsorship && report.factPack.sponsorship.topSponsors.length > 0) {
    drawSection("Sponsorship Attribution", [
      `Attributed activities: ${report.factPack.sponsorship.totalAttributedActivities.toLocaleString()}`,
      `Unique sponsors: ${report.factPack.sponsorship.uniqueSponsors.toLocaleString()}`,
      ...report.factPack.sponsorship.topSponsors.slice(0, 8).map((entry) =>
        `${entry.sponsoredBy} (${entry.sponsorType}) - ${entry.activities} activities [${entry.modules.join(", ")}]`,
      ),
    ]);
  }

  const outcomes = report.factPack.learningOutcomes;
  const formatMetric = (
    label: string,
    description: string,
    value: { baseline: number | null; endline: number | null; change: number | null },
  ) =>
    `${label} - ${description} baseline=${value.baseline ?? "Data not available"}, endline=${value.endline ?? "Data not available"}, change=${value.change ?? "Data not available"}`;
  drawSection("Learning Outcomes", [
    formatMetric(
      LEARNING_DOMAIN_DICTIONARY.letter_names.label_full,
      LEARNING_DOMAIN_DICTIONARY.letter_names.description,
      outcomes.letterIdentification,
    ),
    formatMetric(
      LEARNING_DOMAIN_DICTIONARY.letter_sounds.label_full,
      LEARNING_DOMAIN_DICTIONARY.letter_sounds.description,
      outcomes.soundIdentification,
    ),
    formatMetric(
      LEARNING_DOMAIN_DICTIONARY.real_words.label_full,
      LEARNING_DOMAIN_DICTIONARY.real_words.description,
      outcomes.decodableWords,
    ),
    formatMetric(
      `${LEARNING_DOMAIN_DICTIONARY.real_words.label_full} (Extended Set)`,
      LEARNING_DOMAIN_DICTIONARY.real_words.description,
      outcomes.undecodableWords,
    ),
    formatMetric(
      LEARNING_DOMAIN_DICTIONARY.made_up_words.label_full,
      LEARNING_DOMAIN_DICTIONARY.made_up_words.description,
      outcomes.madeUpWords,
    ),
    formatMetric(
      LEARNING_DOMAIN_DICTIONARY.story_reading.label_full,
      LEARNING_DOMAIN_DICTIONARY.story_reading.description,
      outcomes.storyReading,
    ),
    formatMetric(
      LEARNING_DOMAIN_DICTIONARY.comprehension.label_full,
      LEARNING_DOMAIN_DICTIONARY.comprehension.description,
      outcomes.readingComprehension,
    ),
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

  if (report.factPack.visitPathways) {
    const pathways = report.factPack.visitPathways;
    drawSection("Visit Pathways", [
      `Observation visits: ${pathways.observationVisits.toLocaleString()}`,
      `Demo + meeting visits: ${pathways.demoAndMeetingVisits.toLocaleString()}`,
      `Mixed visits: ${pathways.mixedVisits.toLocaleString()}`,
      `Implementation status - started/not started/partial: ${pathways.startedVisits}/${pathways.notStartedVisits}/${pathways.partialVisits}`,
      `Demo visits conducted: ${pathways.demoVisitsConducted.toLocaleString()}`,
      `Demo summaries logged: ${Number(pathways.demoSummariesLogged ?? 0).toLocaleString()}`,
      `Implementation start plans logged: ${Number(pathways.implementationStartPlansLogged ?? 0).toLocaleString()}`,
      `Leadership meetings logged: ${Number(pathways.leadershipMeetingsLogged ?? 0).toLocaleString()}`,
      `Leadership agreements logged: ${Number(pathways.leadershipAgreementsLogged ?? 0).toLocaleString()}`,
    ]);
  }

  if (report.factPack.teacherLessonEvaluation) {
    const teacherEval = report.factPack.teacherLessonEvaluation;
    drawSection("Teacher Lesson Evaluation", [
      `Total evaluations: ${teacherEval.totalEvaluations.toLocaleString()}`,
      `Average overall score: ${teacherEval.averageOverallScore ?? "Data not available"}`,
      `Level distribution: Strong ${teacherEval.levelDistribution.strong}, Good ${teacherEval.levelDistribution.good}, Developing ${teacherEval.levelDistribution.developing}, Needs Support ${teacherEval.levelDistribution.needsSupport}`,
      `Top coaching focus: ${teacherEval.topGapDomains.join(", ") || "Data not available"}`,
      `What we observed: ${teacherEval.narrative.whatWeObserved || "Data not available."}`,
      `What it means: ${teacherEval.narrative.whatItMeans || "Data not available."}`,
      `What to do next (30 days): ${teacherEval.narrative.whatToDoNext30Days || "Data not available."}`,
      `How to check next visit: ${teacherEval.narrative.howToCheckNextVisit || "Data not available."}`,
    ]);

    if (teacherEval.records.length > 0) {
      drawSection(
        "Teacher Observation Records (Private)",
        teacherEval.records.slice(0, 12).flatMap((record, index) => [
          `${index + 1}. ${record.teacherName} • ${record.classObserved} • ${record.lessonDate} • ${record.overallLevel} (${record.overallScore}/4)`,
          ...wrapText(`Strength: ${record.strengthsText}`, 86),
          ...wrapText(`Gap: ${record.priorityGapText}`, 86),
          ...wrapText(`Next action: ${record.nextCoachingAction}`, 86),
          ...wrapText(`Teacher commitment: ${record.teacherCommitment}`, 86),
        ]),
      );
    }
  }

  if (report.factPack.teacherImprovementSummary) {
    const summary = report.factPack.teacherImprovementSummary;
    drawSection("Teacher Improvement Since First Visit", [
      `Teachers compared: ${summary.teachersCompared.toLocaleString()}`,
      `Improved teachers: ${summary.improvedTeachersCount.toLocaleString()} (${summary.improvedTeachersPercent ?? "Data not available"}%)`,
      `Average overall delta: ${summary.averageOverallDelta ?? "Data not available"}`,
      `Schools improving (%): ${summary.schoolImprovedPercent ?? "Data not available"}`,
      `Top improving domains: ${summary.topImprovingDomains.length > 0
        ? summary.topImprovingDomains.map((entry) => `${entry.domain} (+${entry.avgDelta})`).join(", ")
        : "Data not available"
      }`,
      `Note: ${summary.disclaimer}`,
    ]);

    if (summary.teacherComparisons.length > 0) {
      drawSection(
        "Teacher Improvement Records (Private)",
        summary.teacherComparisons.slice(0, 12).flatMap((entry, index) => [
          `${index + 1}. ${entry.teacherName} • ${entry.classObserved} • Δ overall ${entry.deltaOverall > 0 ? "+" : ""}${entry.deltaOverall.toFixed(2)} • ${entry.improvementStatus}`,
          `Baseline: ${entry.baselineDate} • Comparison: ${entry.comparisonDate} • Latest: ${entry.latestDate}`,
        ]),
      );
    }
  }

  if (report.factPack.teachingLearningAlignment) {
    const alignment = report.factPack.teachingLearningAlignment;
    drawSection("Teaching → Learning Alignment", [
      `Teaching quality delta: ${alignment.summary.teachingDelta ?? "Data not available"}`,
      `Non-reader reduction (pp): ${alignment.summary.nonReaderReductionPp ?? "Data not available"}`,
      `20+ CWPM delta (pp): ${alignment.summary.cwpm20PlusDeltaPp ?? "Data not available"}`,
      `Story sessions (latest period): ${alignment.summary.storySessionsLatest.toLocaleString()}`,
      alignment.caveat,
    ]);
    if (alignment.points.length > 0) {
      drawSection(
        "Aligned Timeline Points",
        alignment.points.slice(-8).flatMap((point) => [
          `${point.period}: Teaching ${point.teachingQualityAvg ?? "N/A"} | Decoding ${point.decodingAvg ?? "N/A"} | Fluency ${point.fluencyAvg ?? "N/A"} | ${LEARNING_DOMAIN_DICTIONARY.comprehension.label_full} ${point.comprehensionAvg ?? "N/A"}`,
          `Non-reader ${point.nonReaderPct ?? "N/A"}% | 20+ CWPM ${point.cwpm20PlusPct ?? "N/A"}% | Story sessions ${point.storySessionsCount}`,
        ]),
      );
    }
  }

  drawSection("Priorities", report.narrative.nextPriorities.flatMap((item) => wrapText(`- ${item}`)));
  drawSection(
    "Section Narratives",
    report.narrative.sectionNarratives.slice(0, 8).flatMap((section) => [
      `${section.title}:`,
      ...wrapText(section.summary, 90),
    ]),
  );
  if (report.factPack.dataTrust) {
    drawSection("Data Trust", [
      `n: ${report.factPack.dataTrust.n.toLocaleString()}`,
      `Completeness: ${report.factPack.dataTrust.completenessPercent.toFixed(1)}%`,
      `Tool version: ${report.factPack.dataTrust.toolVersion}`,
      `Last updated: ${report.factPack.dataTrust.lastUpdated}`,
    ]);
  }
  drawSection("Methods & Limitations", [
    ...wrapText(report.narrative.methodsNote),
    ...wrapText(report.narrative.limitations),
  ]);

  const pages = doc.getPages();
  const totalPages = pages.length;
  pages.forEach((pdfPage, index) => {
    drawBrandFooter({
      page: pdfPage,
      font,
      footerNote: "Aggregated, privacy-protected impact report.",
      pageNumber: index + 1,
      totalPages,
      mutedColor: rgb(0.2, 0.24, 0.3),
    });
  });

  const bytes = await doc.save();
  await incrementImpactReportDownloadCountAsync(report.reportCode);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.reportCode}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
