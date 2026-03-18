import Link from "next/link";
import { getPublicImpactAggregate } from "@/services/dataService";

export const metadata = {
  title: "Methodology",
  description:
    "Indicator definitions, reading-level rules, data quality, and privacy safeguards for Ozeki public impact reporting.",
};

export const dynamic = "force-dynamic";

function formatDate(value: string | null | undefined) {
  if (!value) return "Data not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data not available";
  return parsed.toLocaleString();
}

export default async function MethodologyPage() {
  const aggregate = await getPublicImpactAggregate("country", "Uganda", "FY");
  const toolVersion = aggregate.readingLevels?.definition_version || "RLv1.0";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Methodology</p>
          <h1>How Ozeki Measures Literacy Impact</h1>
          <p>Simple definitions, transparent limits, and privacy-protected public reporting.</p>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Indicators</h2>
            <ul>
              <li>Letter sounds: learner ability to identify and produce target phonemes.</li>
              <li>Decoding: ability to blend sounds to read real and made-up words.</li>
              <li>Fluency: story reading pace and accuracy in connected text.</li>
              <li>Comprehension: ability to answer meaning questions from read text.</li>
            </ul>
          </article>

          <article className="card">
            <h2>Reading Levels</h2>
            <ul>
              <li>Classification uses versioned rules: {toolVersion}.</li>
              <li>Levels are computed from observed reading-domain performance bands.</li>
              <li>Movement compares matched learners across baseline and endline/latest cycles.</li>
            </ul>
          </article>

          <article className="card">
            <h2>Sample Size (n assessed)</h2>
            <ul>
              <li>n assessed = unique learners included in the selected aggregate scope.</li>
              <li>Current FY country sample: {aggregate.meta.sampleSize.toLocaleString()}.</li>
              <li>Larger n improves confidence and reduces volatility of reported percentages.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Assessment Cycles</h2>
            <ul>
              <li>Baseline: start-of-cycle snapshot.</li>
              <li>Progress: during-cycle checks.</li>
              <li>Endline/Latest: latest verified outcome snapshot in the cycle.</li>
            </ul>
          </article>

          <article className="card">
            <h2>Privacy and Public Safety</h2>
            <ul>
              <li>Public views are aggregated and read-only.</li>
              <li>No learner identities or personal child data are published.</li>
              <li>Role-based controls protect internal detail views and staff workflows.</li>
            </ul>
          </article>

          <article className="card">
            <h2>Tool Version + Update Handling</h2>
            <ul>
              <li>Current tool/rule version: {toolVersion}.</li>
              <li>Version changes are disclosed in data trust widgets and reports.</li>
              <li>Last aggregate refresh: {formatDate(aggregate.meta.lastUpdated)}.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Limitations</h2>
            <ul>
              <li>Incomplete baseline/endline coverage reduces trend confidence.</li>
              <li>Some scope-period combinations may show "Data not available".</li>
              <li>Comparisons are constrained to verified submissions in the selected period.</li>
            </ul>
          </article>

          <article className="card">
            <h2>Quick Links</h2>
            <div className="action-row">
              <Link className="button" href="/impact">
                Open Live Impact Dashboard
              </Link>
              <Link className="button button-ghost" href="/impact#reports">
                View Reports
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
