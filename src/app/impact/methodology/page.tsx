import Link from "next/link";
import { getImpactSummary, listPublicImpactReportsAsync } from "@/services/dataService";
import { LEARNING_DOMAIN_DICTIONARY } from "@/lib/domain-dictionary";

export const metadata = {
  title: "Impact Methodology",
  description:
    "Learn how Ozeki assesses reading skills, defines indicators, protects data, and reports credible results.",
};

export const revalidate = 300;

export default async function ImpactMethodologyPage() {
  const latestReport = (await listPublicImpactReportsAsync({ limit: 1 }))[0] ?? null;
  const summary = await getImpactSummary();

  const learnersAssessed =
    summary.metrics.find((item) => item.label === "Learners assessed")?.value ?? 0;

  return (
    <>
      <section className="page-hero" style={{ backgroundImage: "url('/photos/Phonics%20Session%20for%20Teachers%20in%20Namasale%20Sub-County%20Amolatar.jpg')" }}>
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
            <h2>A) Learning Outcomes by Domain</h2>
            <ul>
              <li>{LEARNING_DOMAIN_DICTIONARY.letter_names.label_full}: {LEARNING_DOMAIN_DICTIONARY.letter_names.description}</li>
              <li>{LEARNING_DOMAIN_DICTIONARY.letter_sounds.label_full}: {LEARNING_DOMAIN_DICTIONARY.letter_sounds.description}</li>
              <li>{LEARNING_DOMAIN_DICTIONARY.real_words.label_full}: {LEARNING_DOMAIN_DICTIONARY.real_words.description}</li>
              <li>{LEARNING_DOMAIN_DICTIONARY.made_up_words.label_full}: {LEARNING_DOMAIN_DICTIONARY.made_up_words.description}</li>
              <li>{LEARNING_DOMAIN_DICTIONARY.story_reading.label_full}: {LEARNING_DOMAIN_DICTIONARY.story_reading.description}</li>
              <li>{LEARNING_DOMAIN_DICTIONARY.comprehension.label_full}: {LEARNING_DOMAIN_DICTIONARY.comprehension.description}</li>
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
