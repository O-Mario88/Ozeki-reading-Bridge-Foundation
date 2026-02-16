import Link from "next/link";
import { MediaTestimonialGrid } from "@/components/MediaTestimonialGrid";
import { getImpactSummary, listPublicImpactReports } from "@/lib/db";
import { getMediaShowcase } from "@/lib/media-showcase";

export const metadata = {
  title: "Impact",
  description:
    "Explore verified literacy impact—schools supported, teachers trained, coaching visits completed, learner outcomes improved, and downloadable reports for partners.",
};

export const dynamic = "force-dynamic";

function asNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatValue(value: number | string | null) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return "Data not available";
}

export default async function ImpactHubPage() {
  const summary = getImpactSummary();
  const reports = listPublicImpactReports({ limit: 24 });
  const latestReport = reports[0] ?? null;
  const mediaShowcase = await getMediaShowcase();

  const summaryMap = new Map(summary.metrics.map((metric) => [metric.label, metric.value]));
  const outcomes = latestReport?.factPack.learningOutcomes;

  const averageImprovement = (() => {
    if (!outcomes) {
      return "Data not available";
    }
    const changes = [
      outcomes.letterSoundKnowledge.change,
      outcomes.decodingAccuracy.change,
      outcomes.oralReadingFluencyWcpm.change,
      outcomes.comprehension.change,
    ].filter((value): value is number => typeof value === "number");

    if (changes.length === 0) {
      return "Data not available";
    }

    const average = changes.reduce((sum, value) => sum + value, 0) / changes.length;
    return `${average.toFixed(1)} avg change`;
  })();

  const kpis = [
    {
      label: "Schools impacted",
      value:
        latestReport?.factPack.coverageDelivery.schoolsImpacted ??
        summaryMap.get("Schools trained") ??
        null,
    },
    {
      label: "Schools coached/visited",
      value: latestReport?.factPack.coverageDelivery.schoolsCoachedVisited ?? null,
    },
    {
      label: "Teachers trained",
      value:
        latestReport?.factPack.coverageDelivery.teachersTrained ??
        summaryMap.get("Teachers trained") ??
        null,
    },
    {
      label: "School leaders trained",
      value: latestReport?.factPack.coverageDelivery.schoolLeadersTrained ?? null,
    },
    {
      label: "Learners reached",
      value:
        latestReport?.factPack.coverageDelivery.learnersReached ??
        summaryMap.get("Learners enrolled") ??
        summaryMap.get("Learners assessed") ??
        null,
    },
    {
      label: "Learners enrolled",
      value: summaryMap.get("Learners enrolled") ?? null,
    },
    {
      label: "Resources downloaded",
      value:
        latestReport?.factPack.engagement.resourcesDownloaded ??
        summary.engagement.toolkitLeads,
    },
    {
      label: "Learners assessed",
      value: summaryMap.get("Learners assessed") ?? null,
    },
    {
      label: "Average improvement (key skills)",
      value: averageImprovement,
    },
  ];

  const trendBlocks = [
    {
      label: "Letter-sound knowledge",
      metric: outcomes?.letterSoundKnowledge ?? null,
    },
    {
      label: "Blending/decoding accuracy",
      metric: outcomes?.decodingAccuracy ?? null,
    },
    {
      label: "Oral reading fluency",
      metric: outcomes?.oralReadingFluencyWcpm ?? null,
    },
    {
      label: "Comprehension",
      metric: outcomes?.comprehension ?? null,
    },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact hub</p>
          <h1>Evidence-Based Literacy Impact</h1>
          <p>
            We track delivery, teaching quality, and learner outcomes, then publish
            credible reports partners can verify.
          </p>
          <div className="action-row">
            <Link className="button" href="/impact/dashboard">
              View Live Impact Dashboard
            </Link>
            <Link className="button button-ghost" href="/impact/reports">
              Download Latest Impact Report
            </Link>
            <Link className="button button-ghost" href="/impact/case-studies">
              Explore Case Studies
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Headline metrics</h2>
          </div>
          <div className="impact-kpi-grid">
            {kpis.map((kpi) => (
              <article className="card impact-kpi-card" key={kpi.label}>
                <strong>{formatValue(kpi.value)}</strong>
                <span>{kpi.label}</span>
              </article>
            ))}
          </div>
          <p className="meta-line impact-trust-line">
            All public statistics are aggregated. No learner personal data is shared.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Results snapshot</h2>
            <p>
              Baseline to endline learning trends from public reports, where available.
            </p>
          </div>
          <div className="cards-grid impact-trend-grid">
            {trendBlocks.map((block) => {
              const values = [
                asNumber(block.metric?.baseline),
                asNumber(block.metric?.progress),
                asNumber(block.metric?.endline),
              ];
              const numericValues = values.filter((value): value is number => value !== null);
              const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 1;
              return (
                <article className="card" key={block.label}>
                  <h3>{block.label}</h3>
                  {numericValues.length === 0 ? (
                    <p className="meta-line">Data not available for this period.</p>
                  ) : (
                    <div className="impact-trend-stack">
                      {[
                        { label: "Baseline", value: values[0] },
                        { label: "Progress", value: values[1] },
                        { label: "Endline", value: values[2] },
                      ].map((point) => (
                        <div className="impact-trend-row" key={`${block.label}-${point.label}`}>
                          <span>{point.label}</span>
                          <div className="impact-trend-track" aria-hidden>
                            <i
                              style={{
                                width:
                                  typeof point.value === "number"
                                    ? `${Math.max(7, (point.value / maxValue) * 100)}%`
                                    : "0%",
                              }}
                            />
                          </div>
                          <strong>
                            {typeof point.value === "number"
                              ? point.value.toLocaleString()
                              : "N/A"}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Download reports</h2>
          </div>
          <div className="cards-grid">
            {reports.slice(0, 3).map((report) => (
              <article className="card" key={report.reportCode}>
                <p className="meta-pill">{report.reportType}</p>
                <h3>{report.title}</h3>
                <p className="meta-line">
                  {report.scopeType}: {report.scopeValue} | {report.periodStart} to {report.periodEnd}
                </p>
                <ul>
                  <li>
                    Schools impacted: {report.factPack.coverageDelivery.schoolsImpacted.toLocaleString()}
                  </li>
                  <li>
                    Teachers trained: {report.factPack.coverageDelivery.teachersTrained.toLocaleString()}
                  </li>
                  <li>
                    Learners assessed: {report.factPack.coverageDelivery.assessmentsConducted.endline.toLocaleString()}
                  </li>
                </ul>
                <div className="action-row">
                  <a className="button" href={`/api/impact-reports/${report.reportCode}/download`}>
                    Download PDF
                  </a>
                  <Link className="button button-ghost" href={`/impact/reports/${report.reportCode}`}>
                    View web version
                  </Link>
                </div>
              </article>
            ))}
            {reports.length === 0 ? (
              <article className="card">
                <h3>No public reports yet</h3>
                <p>
                  Public reports appear here once a report is generated and marked as
                  public from the staff dashboard.
                </p>
              </article>
            ) : null}
          </div>
          <div className="action-row">
            <Link className="button button-ghost" href="/impact/reports">
              View All Reports
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Proof from the field</h2>
            <p>
              Evidence gallery preview with captions, location context, and dates from
              implementation activity.
            </p>
          </div>
          <MediaTestimonialGrid items={mediaShowcase.featuredItems.slice(0, 3)} />
          <div className="action-row">
            <Link className="button" href="/impact/gallery">
              View Impact Gallery
            </Link>
            <Link className="button button-ghost" href="/partner">
              Partner With Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
