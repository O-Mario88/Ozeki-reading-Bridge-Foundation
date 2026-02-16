import Link from "next/link";
import { getImpactSummary, listPublicImpactReports } from "@/lib/db";

export const metadata = {
  title: "Impact Methodology",
  description:
    "Learn how Ozeki assesses reading skills, defines indicators, protects data, and reports credible results.",
};

export const dynamic = "force-dynamic";

export default function ImpactMethodologyPage() {
  const latestReport = listPublicImpactReports({ limit: 1 })[0] ?? null;
  const summary = getImpactSummary();

  const learnersAssessed =
    summary.metrics.find((item) => item.label === "Learners assessed")?.value ?? 0;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact</p>
          <h1>How we measure literacy improvement</h1>
          <p>
            Clear indicators, simple tools, and honest reporting.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>A) What we measure</h2>
            <ul>
              <li>Letter-sound knowledge</li>
              <li>Blending and decoding accuracy</li>
              <li>Oral reading fluency (WCPM and accuracy where used)</li>
              <li>Comprehension (grade-appropriate)</li>
            </ul>
          </article>
          <article className="card">
            <h2>B) When we measure</h2>
            <ul>
              <li>Baseline at cycle start</li>
              <li>Progress checks during implementation</li>
              <li>Endline at cycle close where applicable</li>
              <li>Reporting windows by term, quarter, and financial year</li>
            </ul>
          </article>
          <article className="card">
            <h2>C) Sample sizes and coverage</h2>
            <ul>
              <li>Learners assessed: {learnersAssessed.toLocaleString()}</li>
              <li>
                Latest report scope: {latestReport ? `${latestReport.scopeType} - ${latestReport.scopeValue}` : "Data not available"}
              </li>
              <li>
                Assessment cycle: {latestReport ? `${latestReport.periodStart} to ${latestReport.periodEnd}` : "Data not available"}
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>D) Data quality</h2>
            <ul>
              <li>Standardized tools and scorer orientation</li>
              <li>Spot-check and verification routines</li>
              <li>Missing-data and consistency checks</li>
              <li>
                Latest public data quality note: {latestReport?.factPack.dataQuality.verificationNote ?? "Data not available"}
              </li>
            </ul>
          </article>
          <article className="card">
            <h2>E) Privacy and protection</h2>
            <ul>
              <li>Anonymous learner IDs in data systems</li>
              <li>Role-based access control in internal systems</li>
              <li>Aggregated public reporting only</li>
              <li>No learner-identifying details in public outputs</li>
            </ul>
          </article>
          <article className="card">
            <h2>Downloads</h2>
            <div className="action-row">
              <a className="button" href="/downloads/donor-trust/indicator-definitions.pdf">
                Indicator Definitions (PDF)
              </a>
              <a className="button button-ghost" href="/downloads/donor-trust/data-privacy-ethics-summary.pdf">
                Assessment Overview (PDF)
              </a>
            </div>
            <div className="action-row">
              <Link className="button button-ghost" href="/impact/reports">
                View report evidence
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
