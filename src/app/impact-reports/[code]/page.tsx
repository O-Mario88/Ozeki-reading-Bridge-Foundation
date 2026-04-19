import Link from "next/link";
import { notFound } from "next/navigation";
import { getImpactReportByCodeAsync, incrementImpactReportViewCountAsync } from "@/services/dataService";
import { LEARNING_DOMAIN_DICTIONARY } from "@/lib/domain-dictionary";
import type { ImpactReportFactPack, ImpactReportLearningOutcomeMetric, ImpactReportNarrative } from "@/lib/types";

export const revalidate = 300;

type ChartDatum = {
  label: string;
  value: number;
  color: string;
  helper?: string;
};

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatPercent(value: number, total: number) {
  if (total <= 0) {
    return "0.0%";
  }
  return `${((value / total) * 100).toFixed(1)}%`;
}

function ReportDonutChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: ChartDatum[];
}) {
  const total = data.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  const slices = data.map((item) => ({ ...item, value: Math.max(item.value, 0) }));
  let cursor = 0;
  const gradientStops = slices.map((item) => {
    const start = cursor;
    const angle = total > 0 ? (item.value / total) * 360 : 0;
    cursor += angle;
    return `${item.color} ${start.toFixed(2)}deg ${cursor.toFixed(2)}deg`;
  });
  const chartBackground =
    total > 0 ? `conic-gradient(${gradientStops.join(", ")})` : "conic-gradient(#d5dde7 0deg 360deg)";

  return (
    <article className="card report-chart-panel">
      <h3>{title}</h3>
      <p className="meta-line">{subtitle}</p>
      <div className="report-chart-donut-wrap">
        <div className="report-chart-donut" style={{ background: chartBackground }} aria-hidden="true">
          <span>{formatCount(total)}</span>
          <small>Total</small>
        </div>
        <ul className="report-chart-legend">
          {slices.map((item) => (
            <li key={`${title}-${item.label}`}>
              <i style={{ background: item.color }} aria-hidden="true" />
              <div>
                <strong>{item.label}</strong>
                <p>
                  {formatCount(item.value)} ({formatPercent(item.value, total)})
                </p>
                {item.helper ? <small>{item.helper}</small> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function ReportBarChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: ChartDatum[];
}) {
  const values = data.map((item) => Math.max(item.value, 0));
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const safeMax = maxValue > 0 ? maxValue : 1;

  return (
    <article className="card report-chart-panel">
      <h3>{title}</h3>
      <p className="meta-line">{subtitle}</p>
      <ul className="report-bar-chart">
        {data.map((item) => {
          const normalized = Math.max(item.value, 0);
          const widthPercent = (normalized / safeMax) * 100;
          return (
            <li key={`${title}-${item.label}`}>
              <div className="report-bar-row-head">
                <strong>{item.label}</strong>
                <span>{formatCount(normalized)}</span>
              </div>
              <div className="report-bar-track">
                <span style={{ width: `${widthPercent}%`, background: item.color }} />
              </div>
              {item.helper ? <small>{item.helper}</small> : null}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default async function ImpactReportDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const report = await getImpactReportByCodeAsync(code, null);
  if (!report) {
    notFound();
  }
  await incrementImpactReportViewCountAsync(code);

  const factPack = report.fact_pack_json as ImpactReportFactPack;
  const narrative = report.narrative_json as ImpactReportNarrative;

  const outcomes = factPack.learningOutcomes;
  const outcomeRows: { label: string; description: string; value: ImpactReportLearningOutcomeMetric }[] = [
    {
      label: LEARNING_DOMAIN_DICTIONARY.letter_names.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.letter_names.description,
      value: outcomes.letterIdentification,
    },
    {
      label: LEARNING_DOMAIN_DICTIONARY.letter_sounds.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.letter_sounds.description,
      value: outcomes.soundIdentification,
    },
    {
      label: LEARNING_DOMAIN_DICTIONARY.real_words.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.real_words.description,
      value: outcomes.decodableWords,
    },
    {
      label: LEARNING_DOMAIN_DICTIONARY.made_up_words.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.made_up_words.description,
      value: outcomes.madeUpWords,
    },
    {
      label: LEARNING_DOMAIN_DICTIONARY.story_reading.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.story_reading.description,
      value: outcomes.storyReading,
    },
    {
      label: LEARNING_DOMAIN_DICTIONARY.comprehension.label_full,
      description: LEARNING_DOMAIN_DICTIONARY.comprehension.description,
      value: outcomes.readingComprehension,
    },
  ];

  const trainingCount = Math.max(
    0,
    factPack.coverageDelivery.teachersTrained + factPack.coverageDelivery.schoolLeadersTrained,
  );
  const visitCount = Math.max(0, factPack.coverageDelivery.coachingVisitsCompleted);
  const assessmentCount = Math.max(
    0,
    factPack.coverageDelivery.assessmentsConducted.baseline +
      factPack.coverageDelivery.assessmentsConducted.progress +
      factPack.coverageDelivery.assessmentsConducted.endline,
  );
  const activityMixData: ChartDatum[] = [
    { label: "Trainings", value: trainingCount, color: "#0b7285", helper: "Teachers + school leaders trained" },
    { label: "Visits", value: visitCount, color: "#f08c00", helper: "Completed coaching visits" },
    { label: "Assessments", value: assessmentCount, color: "#6f42c1", helper: "Baseline + progress + endline" },
  ];

  const assessmentCycleData: ChartDatum[] = [
    {
      label: "Baseline",
      value: Math.max(0, factPack.coverageDelivery.assessmentsConducted.baseline),
      color: "#468faf",
    },
    {
      label: "Progress",
      value: Math.max(0, factPack.coverageDelivery.assessmentsConducted.progress),
      color: "#2a9d8f",
    },
    {
      label: "Endline",
      value: Math.max(0, factPack.coverageDelivery.assessmentsConducted.endline),
      color: "#e76f51",
    },
  ];

  const teachersCompared = Math.max(0, factPack.teacherImprovementSummary?.teachersCompared ?? 0);
  const improvedTeachers = Math.max(0, factPack.teacherImprovementSummary?.improvedTeachersCount ?? 0);
  const notYetImproved = Math.max(0, teachersCompared - improvedTeachers);
  const improvementData: ChartDatum[] = [
    {
      label: "Improved",
      value: improvedTeachers,
      color: "#2a9d8f",
      helper: "Teachers with positive overall delta",
    },
    {
      label: "Not yet improved",
      value: notYetImproved,
      color: "#f4a261",
      helper: "Teachers needing additional support",
    },
  ];

  return (
    <>
      <section className="section">
        <div className="container card">
          <p className="meta-pill">{report.report_type}</p>
          <h1>{report.title}</h1>
          {report.partner_name ? (
            <p className="meta-line">Partner scope: {report.partner_name}</p>
          ) : null}
          <p className="meta-line">
            {report.scope_type}: {report.scope_value}
          </p>
          <p className="meta-line">
            Report ID: {report.report_code} • Version: {report.version} • Generated{" "}
            {new Date(report.generated_at).toLocaleString()}
          </p>
          <p className="meta-line">
            Category: {report.report_category ?? "Not specified"} • Period type:{" "}
            {report.period_type ?? "FY"} • Audience: {report.audience ?? "Public-safe"} • Output:{" "}
            {report.output ?? "PDF"}
          </p>
          <div className="action-row">
            <a className="inline-download-link" href={`/api/impact-reports/${report.report_code}/download`}>
              Download PDF
            </a>
            <a className="inline-download-link" href={`/api/impact-reports/${report.report_code}`}>
              View JSON Fact Pack
            </a>
            <Link className="inline-download-link" href="/impact#reports">
              Back to reports
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Template Variant</h2>
            <p>
              <strong>{narrative.variant}</strong>
            </p>
            <p className="meta-line">{narrative.template?.masterTemplateName}</p>
            <p className="meta-line">{narrative.factsLockInstruction}</p>
          </article>
          <article className="card">
            <h2>Table of Contents</h2>
            <ul>
              {(narrative.template?.tableOfContents ?? []).map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h2>AI Writing Rules</h2>
            <ul>
              {(narrative.template?.aiWritingRules ?? []).map((rule: string) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </article>

          <article className="card">
            <h2>Executive Summary</h2>
            <p>{narrative.executiveSummary}</p>
          </article>
          <article className="card">
            <h2>Biggest Improvements</h2>
            <ul>
              {(narrative.biggestImprovements ?? []).map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h2>Key Challenges</h2>
            <ul>
              {(narrative.keyChallenges ?? []).map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <ReportDonutChart
            title="Program Activity Mix"
            subtitle="Training, visits, and assessments reported in this scope."
            data={activityMixData}
          />
          <ReportBarChart
            title="Assessment Coverage by Cycle"
            subtitle="Comparison of baseline, progress, and endline reporting."
            data={assessmentCycleData}
          />
          <ReportDonutChart
            title="Teacher Improvement Comparison"
            subtitle={
              teachersCompared > 0
                ? `Compared teachers: ${teachersCompared.toLocaleString()}`
                : "Teacher comparison data not yet available."
            }
            data={improvementData}
          />
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Section Narratives</h2>
          <div className="cards-grid">
            {(narrative.sectionNarratives ?? []).map((section: { sectionId: string; title: string; summary: string }) => (
              <article className="card" key={section.sectionId}>
                <h3>{section.title}</h3>
                <p>{section.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Coverage &amp; Delivery</h3>
            <ul>
              <li>Schools impacted: {factPack.coverageDelivery.schoolsImpacted.toLocaleString()}</li>
              <li>
                Schools coached/visited:{" "}
                {factPack.coverageDelivery.schoolsCoachedVisited.toLocaleString()}
              </li>
              <li>Teachers trained: {factPack.coverageDelivery.teachersTrained.toLocaleString()}</li>
              <li>
                School leaders trained:{" "}
                {factPack.coverageDelivery.schoolLeadersTrained.toLocaleString()}
              </li>
              <li>Learners reached: {factPack.coverageDelivery.learnersReached.toLocaleString()}</li>
              <li>
                Coaching completion: {factPack.coverageDelivery.coachingVisitsCompleted}/
                {factPack.coverageDelivery.coachingVisitsPlanned}
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Assessment Coverage</h3>
            <ul>
              <li>
                Baseline:{" "}
                {factPack.coverageDelivery.assessmentsConducted.baseline.toLocaleString()}
              </li>
              <li>
                Progress:{" "}
                {factPack.coverageDelivery.assessmentsConducted.progress.toLocaleString()}
              </li>
              <li>
                Endline: {factPack.coverageDelivery.assessmentsConducted.endline.toLocaleString()}
              </li>
              <li>
                Learners reached definition: {factPack.definitions.learnersReached}
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Resource Utilization</h3>
            <ul>
              <li>
                Total resources downloaded:{" "}
                {factPack.engagement.resourcesDownloaded.toLocaleString()}
              </li>
              <li>Booking requests: {factPack.engagement.bookingRequests.toLocaleString()}</li>
            </ul>
            <h4>Top downloads</h4>
            <ul>
              {factPack.engagement.topDownloads.length === 0 ? (
                <li>Data not available</li>
              ) : (
                factPack.engagement.topDownloads.map((item: { slug: string; title: string; downloads: number }) => (
                  <li key={item.slug}>
                    {item.title}: {item.downloads.toLocaleString()}
                  </li>
                ))
              )}
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Learning Outcomes (Baseline to Endline)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Baseline</th>
                  <th>Progress</th>
                  <th>Endline</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {outcomeRows.map((row) => (
                  <tr key={row.label}>
                    <td>
                      <strong>{row.label}</strong>
                      <br />
                      <small>{row.description}</small>
                    </td>
                    <td>{row.value?.baseline ?? "Data not available"}</td>
                    <td>{row.value?.progress ?? "Data not available"}</td>
                    <td>{row.value?.endline ?? "Data not available"}</td>
                    <td>{row.value?.change ?? "Data not available"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul>
            <li>
              Proficiency movement (%):{" "}
              {outcomes.proficiencyBandMovementPercent ?? "Data not available"}
            </li>
            <li>
              Reduction in non-readers (%):{" "}
              {outcomes.reductionInNonReadersPercent ?? "Data not available"}
            </li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Instruction Quality & Sustainability</h3>
            <ul>
              <li>
                Routine adoption rate:{" "}
                {factPack.instructionQuality.routineAdoptionRate ?? "Data not available"}
              </li>
              <li>
                Observation score change:{" "}
                {factPack.instructionQuality.observationScoreChange ?? "Data not available"}
              </li>
            </ul>
            <h4>Top 5 gaps</h4>
            <ul>
              {factPack.instructionQuality.topGaps.length > 0 ? (
                factPack.instructionQuality.topGaps.map((gap: string) => <li key={gap}>{gap}</li>)
              ) : (
                <li>Data not available</li>
              )}
            </ul>
          </article>

          <article className="card">
            <h3>Next Priorities</h3>
            <ul>
              {narrative.nextPriorities.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="card">
            <h3>Evidence Appendix</h3>
            <p>
              <strong>Methods:</strong> {narrative.methodsNote}
            </p>
            <p>
              <strong>Limitations:</strong> {narrative.limitations}
            </p>
            <p>
              <strong>Data quality:</strong> approved{" "}
              {factPack.dataQuality.approvedRecords.toLocaleString()} of{" "}
              {factPack.dataQuality.totalRecords.toLocaleString()} records; missing payload
              rate {factPack.dataQuality.missingPayloadRate}%.
            </p>
            <p>
              <strong>Data trust:</strong>{" "}
              {factPack.dataTrust
                ? `n=${factPack.dataTrust.n.toLocaleString()}, completeness=${factPack.dataTrust.completenessPercent.toFixed(1)}%, tool_version=${factPack.dataTrust.toolVersion}, last_updated=${factPack.dataTrust.lastUpdated}`
                : "Data not available"}
              .
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
