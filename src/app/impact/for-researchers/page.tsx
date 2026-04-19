import Link from "next/link";
import { getNationalKpiSnapshotPostgres } from "@/lib/server/postgres/repositories/kpi-snapshots";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata = {
  title: "For Researchers · Ozeki Reading Bridge Foundation",
  description: "Open data endpoints, methodology, and collaboration pathways for academic and policy researchers.",
};

export default async function ResearcherPage() {
  const national = await getNationalKpiSnapshotPostgres();

  return (
    <main className="stakeholder-page">
      <header className="stakeholder-hero">
        <span className="stakeholder-eyebrow">For Academic & Policy Researchers</span>
        <h1>Open data. Reproducible outcomes.</h1>
        <p>
          Ozeki&apos;s platform offers one of the largest longitudinal literacy datasets in East Africa.
          We actively invite researchers from Makerere, universities across East Africa, and international
          institutions to partner on studies that advance the field of early-grade reading.
        </p>
      </header>

      {national && (
        <section className="stakeholder-kpis">
          <article><span>Schools in dataset</span><strong>{national.schoolsCount.toLocaleString()}</strong></article>
          <article><span>Districts</span><strong>{national.districtsCount.toLocaleString()}</strong></article>
          <article><span>Learners assessed</span><strong>{national.totalLearnersAssessed.toLocaleString()}</strong></article>
          <article><span>Classroom observations</span><strong>{national.totalObservations.toLocaleString()}</strong></article>
          <article><span>Coaching visits</span><strong>{national.totalVisits.toLocaleString()}</strong></article>
          <article><span>Training sessions</span><strong>{national.totalTrainings.toLocaleString()}</strong></article>
        </section>
      )}

      <section className="stakeholder-section">
        <h2>Open API endpoints</h2>
        <p className="stakeholder-desc">
          All endpoints return aggregated data only. No learner-level identifiers are exposed.
          For learner-level de-identified data for research studies, request partner access below.
        </p>
        <table className="stakeholder-table">
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Returns</th>
              <th>Cache</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GET /api/impact/country?period=FY</code></td>
              <td>National aggregate including KPIs, outcomes by domain, cohort progression</td>
              <td>15 min</td>
            </tr>
            <tr>
              <td><code>GET /api/impact/district/{"{id}"}?period=FY</code></td>
              <td>District-level aggregate with school-scoped breakdown</td>
              <td>15 min</td>
            </tr>
            <tr>
              <td><code>GET /api/impact/region/{"{id}"}</code></td>
              <td>Regional aggregate with district navigator</td>
              <td>15 min</td>
            </tr>
            <tr>
              <td><code>GET /api/impact/choropleth?metric=...</code></td>
              <td>District-level intensity values for a specified KPI</td>
              <td>15 min</td>
            </tr>
            <tr>
              <td><code>GET /api/impact/training-intelligence</code></td>
              <td>Training effectiveness, facilitator performance, coverage gaps</td>
              <td>10 min</td>
            </tr>
            <tr>
              <td><code>GET /api/impact/donor-roi</code></td>
              <td>Donor-to-outcome chain aggregates</td>
              <td>10 min</td>
            </tr>
            <tr>
              <td><code>GET /api/impact/export?format=csv</code></td>
              <td>CSV of all active districts with league-table ranks</td>
              <td>On request</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="stakeholder-section">
        <h2>Data schema (high-level)</h2>
        <ul>
          <li><strong>assessment_records</strong> — learner-level scores across 6 reading domains + mastery status traffic-lights</li>
          <li><strong>teacher_lesson_observations</strong> — 13-item rubric, scored 1–4, plus structured notes and fidelity rating</li>
          <li><strong>coaching_visits</strong> — visit pathway, focus areas, implementation status</li>
          <li><strong>lesson_view_sessions</strong> — telemetry from recorded-lesson library (per-session duration, completion)</li>
          <li><strong>portal_training_attendance</strong> — participant-level training records with gender and role</li>
          <li><strong>school_kpi_snapshot</strong> — denormalised per-school health score updated by database triggers</li>
        </ul>
        <p className="stakeholder-desc">
          Full schema documentation is available to approved research partners.
        </p>
      </section>

      <section className="stakeholder-section">
        <h2>Research collaborations</h2>
        <p>
          We welcome proposals for:
        </p>
        <ul>
          <li>Quasi-experimental studies of instructional interventions</li>
          <li>Longitudinal cohort tracking</li>
          <li>Gender parity and equity research</li>
          <li>Teacher professional-development ROI studies</li>
          <li>Item-level diagnostic analyses</li>
          <li>Replications and external validation</li>
        </ul>
        <p>
          Partnerships include co-authorship, advisory on research design, access to de-identified
          learner-level data, and integration of agreed instruments into our routine data collection.
        </p>
      </section>

      <section className="stakeholder-cta">
        <h2>Get in touch</h2>
        <p>
          To request research-partner access, email <a href="mailto:research@ozekiread.org">research@ozekiread.org</a> with:
        </p>
        <ul className="stakeholder-list-inline">
          <li>Your institutional affiliation</li>
          <li>A brief research question</li>
          <li>Data access requirements (aggregate vs learner-level)</li>
          <li>Your ethics-review status</li>
        </ul>
        <p>Response within 7 working days. <Link href="/impact">Back to full impact dashboard</Link>.</p>
      </section>
    </main>
  );
}
