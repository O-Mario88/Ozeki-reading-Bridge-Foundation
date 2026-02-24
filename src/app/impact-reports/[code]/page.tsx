import Link from "next/link";
import { notFound } from "next/navigation";
import { getImpactReportByCode, incrementImpactReportViewCount } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ImpactReportDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const report = getImpactReportByCode(code, null);
  if (!report) {
    notFound();
  }
  incrementImpactReportViewCount(code);

  const outcomes = report.factPack.learningOutcomes;
  const outcomeRows = [
    { label: "Letter Identification", value: outcomes.letterIdentification },
    { label: "Sound Identification", value: outcomes.soundIdentification },
    { label: "Decodable Words", value: outcomes.decodableWords },
    { label: "Undecodable Words", value: outcomes.undecodableWords },
    { label: "Made Up Words", value: outcomes.madeUpWords },
    { label: "Story Reading", value: outcomes.storyReading },
    { label: "Reading Comprehension", value: outcomes.readingComprehension },
  ];

  return (
    <>
      <section className="section">
        <div className="container card">
          <p className="meta-pill">{report.reportType}</p>
          <h1>{report.title}</h1>
          {report.partnerName ? (
            <p className="meta-line">Partner scope: {report.partnerName}</p>
          ) : null}
          <p className="meta-line">
            {report.scopeType}: {report.scopeValue}
          </p>
          <p className="meta-line">
            Report ID: {report.reportCode} • Version: {report.version} • Generated{" "}
            {new Date(report.generatedAt).toLocaleString()}
          </p>
          <div className="action-row">
            <a className="inline-download-link" href={`/api/impact-reports/${report.reportCode}/download`}>
              Download PDF
            </a>
            <a className="inline-download-link" href={`/api/impact-reports/${report.reportCode}`}>
              View JSON Fact Pack
            </a>
            <Link className="inline-download-link" href="/impact/reports">
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
              <strong>{report.narrative.variant}</strong>
            </p>
            <p className="meta-line">{report.narrative.template.masterTemplateName}</p>
            <p className="meta-line">{report.narrative.factsLockInstruction}</p>
          </article>
          <article className="card">
            <h2>Table of Contents</h2>
            <ul>
              {report.narrative.template.tableOfContents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h2>AI Writing Rules</h2>
            <ul>
              {report.narrative.template.aiWritingRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </article>

          <article className="card">
            <h2>Executive Summary</h2>
            <p>{report.narrative.executiveSummary}</p>
          </article>
          <article className="card">
            <h2>Biggest Improvements</h2>
            <ul>
              {report.narrative.biggestImprovements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h2>Key Challenges</h2>
            <ul>
              {report.narrative.keyChallenges.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Section Narratives</h2>
          <div className="cards-grid">
            {report.narrative.sectionNarratives.map((section) => (
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
            <h3>Coverage & Delivery</h3>
            <ul>
              <li>Schools impacted: {report.factPack.coverageDelivery.schoolsImpacted.toLocaleString()}</li>
              <li>
                Schools coached/visited:{" "}
                {report.factPack.coverageDelivery.schoolsCoachedVisited.toLocaleString()}
              </li>
              <li>Teachers trained: {report.factPack.coverageDelivery.teachersTrained.toLocaleString()}</li>
              <li>
                School leaders trained:{" "}
                {report.factPack.coverageDelivery.schoolLeadersTrained.toLocaleString()}
              </li>
              <li>Learners reached: {report.factPack.coverageDelivery.learnersReached.toLocaleString()}</li>
              <li>
                Coaching completion: {report.factPack.coverageDelivery.coachingVisitsCompleted}/
                {report.factPack.coverageDelivery.coachingVisitsPlanned}
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Assessment Coverage</h3>
            <ul>
              <li>
                Baseline:{" "}
                {report.factPack.coverageDelivery.assessmentsConducted.baseline.toLocaleString()}
              </li>
              <li>
                Progress:{" "}
                {report.factPack.coverageDelivery.assessmentsConducted.progress.toLocaleString()}
              </li>
              <li>
                Endline: {report.factPack.coverageDelivery.assessmentsConducted.endline.toLocaleString()}
              </li>
              <li>
                Learners reached definition: {report.factPack.definitions.learnersReached}
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Resource Utilization</h3>
            <ul>
              <li>
                Total resources downloaded:{" "}
                {report.factPack.engagement.resourcesDownloaded.toLocaleString()}
              </li>
              <li>Booking requests: {report.factPack.engagement.bookingRequests.toLocaleString()}</li>
            </ul>
            <h4>Top downloads</h4>
            <ul>
              {report.factPack.engagement.topDownloads.length === 0 ? (
                <li>Data not available</li>
              ) : (
                report.factPack.engagement.topDownloads.map((item) => (
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
                    <td>{row.label}</td>
                    <td>{row.value.baseline ?? "Data not available"}</td>
                    <td>{row.value.progress ?? "Data not available"}</td>
                    <td>{row.value.endline ?? "Data not available"}</td>
                    <td>{row.value.change ?? "Data not available"}</td>
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
                {report.factPack.instructionQuality.routineAdoptionRate ?? "Data not available"}
              </li>
              <li>
                Observation score change:{" "}
                {report.factPack.instructionQuality.observationScoreChange ?? "Data not available"}
              </li>
            </ul>
            <h4>Top 5 gaps</h4>
            <ul>
              {report.factPack.instructionQuality.topGaps.length > 0 ? (
                report.factPack.instructionQuality.topGaps.map((gap) => <li key={gap}>{gap}</li>)
              ) : (
                <li>Data not available</li>
              )}
            </ul>
          </article>

          <article className="card">
            <h3>Next Priorities</h3>
            <ul>
              {report.narrative.nextPriorities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="card">
            <h3>Evidence Appendix</h3>
            <p>
              <strong>Methods:</strong> {report.narrative.methodsNote}
            </p>
            <p>
              <strong>Limitations:</strong> {report.narrative.limitations}
            </p>
            <p>
              <strong>Data quality:</strong> approved{" "}
              {report.factPack.dataQuality.approvedRecords.toLocaleString()} of{" "}
              {report.factPack.dataQuality.totalRecords.toLocaleString()} records; missing payload
              rate {report.factPack.dataQuality.missingPayloadRate}%.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
