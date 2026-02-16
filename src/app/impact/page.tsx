import { PageHero } from "@/components/PageHero";
import { caseStudies } from "@/lib/content";
import { getImpactSummary } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Impact",
  description:
    "Track teachers trained, schools trained, learner assessment reach, stories published, and implementation case studies.",
};

export default function ImpactPage() {
  const summary = getImpactSummary();

  return (
    <>
      <PageHero
        kicker="Impact dashboard"
        title="Evidence of implementation and learning gains"
        description="Updated metrics, case snapshots, and clear reporting on program outcomes."
      />

      <section className="section">
        <div className="container metric-grid">
          {summary.metrics.map((metric) => (
            <article key={metric.label}>
              <strong>{metric.value.toLocaleString()}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          {caseStudies.map((study) => (
            <article key={study.slug} className="card">
              <h3>
                {study.school} - {study.district}
              </h3>
              <p>
                <strong>Challenge:</strong> {study.challenge}
              </p>
              <p>
                <strong>Results:</strong>
              </p>
              <ul>
                {study.results.map((result) => (
                  <li key={result}>{result}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>How we measure learning gains</h2>
          <ul>
            <li>Baseline, progress, and endline reading checks</li>
            <li>Teacher practice observation and implementation scoring</li>
            <li>School leadership supervision and routine adherence</li>
            <li>Partner-ready monitoring and evaluation summaries</li>
          </ul>
        </div>
      </section>
    </>
  );
}
