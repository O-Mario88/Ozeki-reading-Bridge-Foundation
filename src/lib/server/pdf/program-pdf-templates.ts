import type { ImpactReportRecord, PortalOperationalReportsData } from "@/lib/types";
import { LEARNING_DOMAIN_DICTIONARY } from "@/lib/domain-dictionary";
import { formatReportDate } from "./finance-pdf-templates";
import type { SchoolFactPack } from "@/lib/server/postgres/repositories/school-reports";

const programPdfStyles = `
  .fp-container { width: 100%; font-family: var(--pdf-font-family), sans-serif; font-size: 10.5pt; color: #1e293b; }
  .fp-header-grid { display: flex; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
  .fp-header-col h3 { margin: 0 0 6px 0; font-size: 11pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .fp-header-col p { margin: 0 0 4px 0; }
  .fp-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 9.5pt; }
  .fp-table th { text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-weight: 600; color: #334155; }
  .fp-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .fp-table .num { text-align: right; }
  .fp-notes { margin-top: 32px; padding: 16px; background: #f8fafc; border-left: 4px solid #cbd5e1; font-size: 9.5pt; color: #475569; page-break-inside: avoid; }
  .fp-title-box { background: var(--orbf-accent, #1f2a44); color: white; padding: 6px 16px; display: inline-block; font-weight: bold; font-size: 14pt; border-radius: 4px; margin-bottom: 20px; }
  
  .fp-section { margin-bottom: 28px; page-break-inside: avoid; }
  .fp-section h4 { font-size: 12pt; color: #0f172a; margin: 0 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
  .fp-list { margin: 0; padding-left: 18px; line-height: 1.6; }
  .fp-list li { margin-bottom: 4px; }
  
  .fp-kpi-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
  .fp-kpi-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; min-width: 140px; flex: 1; }
  .fp-kpi-label { font-size: 8.5pt; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; display: block; }
  .fp-kpi-val { font-size: 16pt; font-weight: 700; color: #0f172a; }
`;

function escapeHtml(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildOperationsWorkspaceHtml(data: PortalOperationalReportsData): { html: string; css: string } {
  const totals = data.totals;

  const html = `
    <div class="fp-container">
      <div class="fp-header-grid">
        <div class="fp-header-col">
          <h3>Operations Summary Report</h3>
          <p style="font-size: 11pt; font-weight: 600; color: #0f172a;">Ozeki Reading Bridge Foundation</p>
        </div>
        <div class="fp-header-col" style="text-align: right;">
          <p><strong>Generated At:</strong> ${formatReportDate(data.generatedAt)}</p>
          <p><strong>Total Schools Tracked:</strong> ${totals.totalSchools.toLocaleString()}</p>
          <p><strong>Total Current Enrollment:</strong> ${totals.totalEnrollment.toLocaleString()}</p>
        </div>
      </div>

      <div class="fp-kpi-grid">
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Trainings</span>
          <span class="fp-kpi-val">${totals.trainings.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">School Visits</span>
          <span class="fp-kpi-val">${totals.schoolVisits.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Lesson Evals</span>
          <span class="fp-kpi-val">${totals.lessonEvaluations.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Learner Assessments</span>
          <span class="fp-kpi-val">${totals.learnerAssessments.toLocaleString()}</span>
        </div>
      </div>

      <div class="fp-kpi-grid">
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Schools Implementing</span>
          <span class="fp-kpi-val">${totals.schoolsImplementingPercent}%</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Schools Not Implementing</span>
          <span class="fp-kpi-val">${totals.schoolsNotImplementingPercent}%</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">1001 Story Activities</span>
          <span class="fp-kpi-val">${totals.storyActivities.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Resources Distributed</span>
          <span class="fp-kpi-val">${totals.resourcesDistributed.toLocaleString()}</span>
        </div>
      </div>

      <div class="fp-section">
        <h4>District Breakdown</h4>
        <table class="fp-table">
          <thead>
            <tr>
              <th>District</th>
              <th class="num">Schools</th>
              <th class="num">Enrollment</th>
              <th class="num">Trainings</th>
              <th class="num">Visits</th>
            </tr>
          </thead>
          <tbody>
            ${data.districts.sort((a, b) => b.schools - a.schools).map(d => `
              <tr>
                <td>${escapeHtml(d.district)}</td>
                <td class="num">${d.schools.toLocaleString()}</td>
                <td class="num">${d.enrollment.toLocaleString()}</td>
                <td class="num">${d.trainings.toLocaleString()}</td>
                <td class="num">${d.schoolVisits.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="fp-notes">
        <strong>About This Report</strong><br/>
        This Operations Workspace Summary pulls directly from live backend records. 
        It reflects the aggregate total across all registered districts, sub-counties, and individual schools.
      </div>
    </div>
  `;

  return { html, css: programPdfStyles };
}

export function buildImpactReportHtml(report: ImpactReportRecord): { html: string; css: string } {
  const narrative = report.narrative;
  const factPack = report.factPack;
  const coverage = factPack.coverageDelivery;
  
  const learningOutcomesHtml = `
    <ul class="fp-list">
      <li><strong>${LEARNING_DOMAIN_DICTIONARY.letter_names.label_full}:</strong> ${factPack.learningOutcomes.letterIdentification.baseline ?? "N/A"} -> ${factPack.learningOutcomes.letterIdentification.endline ?? "N/A"} (${factPack.learningOutcomes.letterIdentification.change ?? "N/A"})</li>
      <li><strong>${LEARNING_DOMAIN_DICTIONARY.letter_sounds.label_full}:</strong> ${factPack.learningOutcomes.soundIdentification.baseline ?? "N/A"} -> ${factPack.learningOutcomes.soundIdentification.endline ?? "N/A"} (${factPack.learningOutcomes.soundIdentification.change ?? "N/A"})</li>
      <li><strong>${LEARNING_DOMAIN_DICTIONARY.real_words.label_full}:</strong> ${factPack.learningOutcomes.decodableWords.baseline ?? "N/A"} -> ${factPack.learningOutcomes.decodableWords.endline ?? "N/A"} (${factPack.learningOutcomes.decodableWords.change ?? "N/A"})</li>
      <li><strong>${LEARNING_DOMAIN_DICTIONARY.comprehension.label_full}:</strong> ${factPack.learningOutcomes.readingComprehension.baseline ?? "N/A"} -> ${factPack.learningOutcomes.readingComprehension.endline ?? "N/A"} (${factPack.learningOutcomes.readingComprehension.change ?? "N/A"})</li>
      <li><strong>Proficiency Band Movement:</strong> ${factPack.learningOutcomes.proficiencyBandMovementPercent ?? "N/A"}%</li>
      <li><strong>Reduction in Non-Readers:</strong> ${factPack.learningOutcomes.reductionInNonReadersPercent ?? "N/A"}%</li>
    </ul>
  `;

  const instructionQualityHtml = `
    <ul class="fp-list">
      <li><strong>Routine Adoption Rate:</strong> ${factPack.instructionQuality.routineAdoptionRate ?? "N/A"}</li>
      <li><strong>Observation Score Change:</strong> ${factPack.instructionQuality.observationScoreChange ?? "N/A"}</li>
      <li><strong>Top Actionable Gaps:</strong> ${factPack.instructionQuality.topGaps.join(", ") || "N/A"}</li>
    </ul>
  `;

  let teacherEvalHtml = "";
  if (factPack.teacherLessonEvaluation) {
    const teacherEval = factPack.teacherLessonEvaluation;
    teacherEvalHtml = `
      <div class="fp-section">
        <h4>Teacher Lesson Evaluation Summary</h4>
        <ul class="fp-list">
          <li><strong>Total Evaluations:</strong> ${teacherEval.totalEvaluations.toLocaleString()}</li>
          <li><strong>Avg Overall Score:</strong> ${teacherEval.averageOverallScore ?? "N/A"}</li>
          <li><strong>Level Distribution:</strong> Strong (${teacherEval.levelDistribution.strong}), Good (${teacherEval.levelDistribution.good}), Developing (${teacherEval.levelDistribution.developing}), Needs Support (${teacherEval.levelDistribution.needsSupport})</li>
          <li><strong>Top Coaching Focus:</strong> ${teacherEval.topGapDomains.join(", ") || "N/A"}</li>
        </ul>
      </div>
    `;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionsHtml = narrative.sectionNarratives.map((section: any) => `
    <div class="fp-section">
      <h4>${escapeHtml(section.title)}</h4>
      <p style="white-space: pre-wrap;">${escapeHtml(section.summary)}</p>
    </div>
  `).join("");

  const html = `
    <div class="fp-container">
      <div class="fp-header-grid">
        <div class="fp-header-col">
          <h3>Impact Report</h3>
          <p style="font-size: 11pt; font-weight: 600; color: #0f172a;">${escapeHtml(report.title)}</p>
          ${report.partnerName ? `<p style="color: #64748b;">Prepared for: ${escapeHtml(report.partnerName)}</p>` : ""}
        </div>
        <div class="fp-header-col" style="text-align: right;">
          <p><strong>Report Code:</strong> ${escapeHtml(report.reportCode)}</p>
          <p><strong>Scope:</strong> ${escapeHtml(report.scopeType)} (${escapeHtml(report.scopeValue)})</p>
          <p><strong>Period:</strong> ${formatReportDate(report.periodStart)} to ${formatReportDate(report.periodEnd)}</p>
          <p><strong>Visibility:</strong> ${report.isPublic ? 'Public' : 'Internal'}</p>
        </div>
      </div>

      <div class="fp-section" style="font-size: 11pt; font-weight: 500; color: #334155; border-left: 3px solid #cbd5e1; padding-left: 12px;">
        ${escapeHtml(narrative.executiveSummary)}
      </div>

      <div class="fp-kpi-grid">
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Schools Impacted</span>
          <span class="fp-kpi-val">${coverage.schoolsImpacted.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Teachers Trained</span>
          <span class="fp-kpi-val">${coverage.teachersTrained.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Schools Visited</span>
          <span class="fp-kpi-val">${coverage.schoolsCoachedVisited.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Learners Reached</span>
          <span class="fp-kpi-val">${coverage.learnersReached.toLocaleString()}</span>
        </div>
      </div>

      <div class="fp-section">
        <h4>Learning Outcomes (Baseline to Endline)</h4>
        ${learningOutcomesHtml}
      </div>

      <div class="fp-section">
        <h4>Instruction Quality</h4>
        ${instructionQualityHtml}
      </div>

      ${teacherEvalHtml}

      ${sectionsHtml}

      <div class="fp-notes">
        <strong>Data Trust & Methodology</strong><br/>
        Sample size (n): ${factPack.dataTrust?.n?.toLocaleString() || "N/A"}. Completeness: ${factPack.dataTrust?.completenessPercent?.toFixed(1) || 0}%.<br/>
        ${escapeHtml(narrative.methodsNote)}
      </div>
    </div>
  `;

  return { html, css: programPdfStyles };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSchoolPerformanceReportHtml(factPack: SchoolFactPack, narrative: any, staffSummary?: string | null): { html: string; css: string } {
  const html = `
    <div class="fp-container">
      <div class="fp-header-grid">
        <div class="fp-header-col">
          <h3>School Performance Report</h3>
          <p style="font-size: 11pt; font-weight: 600; color: #0f172a;">${escapeHtml(factPack.schoolName)}</p>
        </div>
        <div class="fp-header-col" style="text-align: right;">
          <p><strong>Period:</strong> ${formatReportDate(factPack.periodStart)} to ${formatReportDate(factPack.periodEnd)}</p>
          <p><strong>Visibility:</strong> Internal Data Quality Controlled</p>
        </div>
      </div>

      <div class="fp-section" style="font-size: 11pt; font-weight: 500; color: #334155; border-left: 3px solid #cbd5e1; padding-left: 12px;">
        ${escapeHtml(staffSummary || narrative?.executiveSummary || "No executive summary provided.")}
      </div>

      <div class="fp-kpi-grid">
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Learners Assessed</span>
          <span class="fp-kpi-val">${factPack.assessments.totalLearners.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Total Visits</span>
          <span class="fp-kpi-val">${factPack.visits.total.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Lesson Evaluations</span>
          <span class="fp-kpi-val">${factPack.evaluations.total.toLocaleString()}</span>
        </div>
        <div class="fp-kpi-box">
          <span class="fp-kpi-label">Avg Teacher Quality</span>
          <span class="fp-kpi-val">${factPack.evaluations.avgLevel}</span>
        </div>
      </div>

      <div class="fp-section">
        <h4>Literacy Progress Analysis</h4>
        <p style="white-space: pre-wrap; margin-bottom: 12px;">${escapeHtml(narrative?.literacyProgressNarrative || "N/A")}</p>
        <ul class="fp-list">
          <li><strong>Avg 1001 Story Score:</strong> ${factPack.assessments.avgStoryScore.toFixed(1)} / 6.0</li>
          <li><strong>Avg Comprehension Score:</strong> ${factPack.assessments.avgComprehensionScore.toFixed(1)} / 5.0</li>
        </ul>
      </div>

      <div class="fp-section">
        <h4>Operational Health & Teacher Support</h4>
        <p style="white-space: pre-wrap; margin-bottom: 12px;">${escapeHtml(narrative?.operationalEfficiency || "N/A")}</p>
        <ul class="fp-list">
          <li><strong>Last Visit Date:</strong> ${formatReportDate(factPack.visits.lastVisitDate)}</li>
        </ul>
      </div>

      <div class="fp-notes">
        <strong>Data Governance Note</strong><br/>
        This performance report was generated securely using live Ozeki platform data. It has been verified and approved by Ozeki Reading Bridge Foundation staff.
      </div>
    </div>
  `;

  return { html, css: programPdfStyles };
}
