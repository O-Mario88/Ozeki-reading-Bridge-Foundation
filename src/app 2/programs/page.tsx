import { CtaBand } from "@/components/CtaBand";
import { PageHero } from "@/components/PageHero";
import Link from "next/link";
import { getImpactSummary } from "@/lib/db";
import { PROGRAM_DIRECTORY_DETAILS } from "@/lib/home-static-data";

export const metadata = {
  title: "Programs & Services",
  description:
    "Professional overview of all Ozeki Reading Bridge Foundation programs with direct links to each detailed service page.",
};

export const dynamic = "force-dynamic";

const headlineMetricLabels = [
  "Schools trained",
  "Teachers trained",
  "Learners assessed",
  "Stories published",
  "Training sessions completed",
];

export default async function ProgramsPage() {
  const summary = getImpactSummary();
  const headlineMetrics = headlineMetricLabels
    .map((label) => summary.metrics.find((metric) => metric.label === label))
    .filter((metric): metric is { label: string; value: number } => Boolean(metric));

  return (
    <>
      <PageHero
        title="Programs & Services"
        description="Our full implementation support stack for nursery and primary literacy improvement."
      />

      <section className="section program-headline-metrics">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <p className="kicker">REAL-TIME IMPACT</p>
            <h2 className="tpd-page-title">Headline Metrics</h2>
            <p>Live values from the backend data system.</p>
          </div>
          <div className="program-metrics-grid">
            {headlineMetrics.map((metric) => (
              <article className="card program-metric-card" key={metric.label}>
                <strong>{metric.value.toLocaleString()}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <p className="kicker">WHAT WE DO</p>
            <h2 className="tpd-page-title">Program Directory</h2>
            <p style={{ textAlign: 'center', maxWidth: '600px' }}>
              The detailed program narratives below are the full NLIP implementation
              pathways, migrated from the former homepage cards so this page is the
              single source of truth.
            </p>
          </div>
          <div className="program-directory-list">
            {PROGRAM_DIRECTORY_DETAILS.map((program) => (
              <article className="program-directory-item" key={program.href}>
                <h3>{program.title}</h3>
                <p>{program.description}</p>
                <p>
                  <strong>Evidence generated:</strong> {program.evidence}
                </p>
                <div className="action-row">
                  <Link className="button button-compact" href={program.href}>
                    Explore Program
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Need a customized school or district package?"
        body="We can combine training, coaching, learner assessment, and reporting into a phased implementation plan."
        primaryHref="/book-visit"
        primaryLabel="Book a diagnostic visit"
        secondaryHref="/partner"
        secondaryLabel="Discuss partnership"
      />
    </>
  );
}
