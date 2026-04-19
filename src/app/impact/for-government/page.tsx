import Link from "next/link";
import {
  getNationalKpiSnapshotPostgres,
  listDistrictKpiSnapshotsPostgres,
} from "@/lib/server/postgres/repositories/kpi-snapshots";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata = {
  title: "For Government · Ozeki Reading Bridge Foundation",
  description: "Policy-grade national literacy benchmarks, district-level performance, and verified evidence for the Ministry of Education.",
};

export default async function GovernmentPage() {
  const [national, districts] = await Promise.all([
    getNationalKpiSnapshotPostgres(),
    listDistrictKpiSnapshotsPostgres(),
  ]);

  return (
    <main className="stakeholder-page">
      <header className="stakeholder-hero">
        <span className="stakeholder-eyebrow">For Ministry of Education · UNEB · District Education Officers</span>
        <h1>National Literacy Benchmarks, Verified.</h1>
        <p>
          Ozeki&apos;s platform aggregates classroom-level evidence from every participating school into policy-grade
          indicators. All data is triangulated from in-classroom observations, learner-level assessments, and independent coaching visits.
        </p>
      </header>

      {national && (
        <section className="stakeholder-kpis">
          <article><span>Schools covered</span><strong>{national.schoolsCount.toLocaleString()}</strong></article>
          <article><span>Districts covered</span><strong>{national.districtsCount.toLocaleString()}</strong></article>
          <article><span>Learners assessed</span><strong>{national.totalLearnersAssessed.toLocaleString()}</strong></article>
          <article><span>Teachers supported</span><strong>{national.totalTeachersSupported.toLocaleString()}</strong></article>
          <article><span>Classroom observations</span><strong>{national.totalObservations.toLocaleString()}</strong></article>
          <article><span>Coaching visits</span><strong>{national.totalVisits.toLocaleString()}</strong></article>
          <article className="is-highlight">
            <span>National avg composite (endline)</span>
            <strong>
              {national.avgCompositeEndline !== null
                ? national.avgCompositeEndline.toFixed(2)
                : "—"}
            </strong>
            <small>Weighted across all active schools</small>
          </article>
          <article className={national.atRiskSchools > 0 ? "is-alert" : ""}>
            <span>Priority-support schools</span>
            <strong>{national.atRiskSchools}</strong>
            <small>Flagged by algorithm for coordinated support</small>
          </article>
        </section>
      )}

      <section className="stakeholder-section">
        <h2>District league table</h2>
        <p className="stakeholder-desc">
          Districts ordered by the composite health score (0–100). Lower scores indicate priority for additional
          teacher training, coaching, or resource allocation.
        </p>
        <table className="stakeholder-table">
          <thead>
            <tr>
              <th>District</th>
              <th>Region</th>
              <th>Schools</th>
              <th>At-risk</th>
              <th>Learners assessed</th>
              <th>Coaching visits</th>
              <th>Coverage</th>
              <th>Health score</th>
              <th>Avg Δ</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d.district} className={(d.avgHealthScore ?? 100) < 50 ? "stakeholder-row-alert" : ""}>
                <td><strong>{d.district}</strong></td>
                <td>{d.region ?? "—"}</td>
                <td>{d.schoolsCount}</td>
                <td>{d.atRiskSchools > 0 ? <span className="stakeholder-badge-alert">{d.atRiskSchools}</span> : "—"}</td>
                <td>{d.totalLearnersAssessed.toLocaleString()}</td>
                <td>{d.totalVisits}</td>
                <td>{d.coveragePct !== null ? `${d.coveragePct}%` : "—"}</td>
                <td><strong>{d.avgHealthScore ?? "—"}</strong></td>
                <td className={d.avgCompositeDelta !== null ? (d.avgCompositeDelta > 0 ? "stakeholder-positive" : d.avgCompositeDelta < 0 ? "stakeholder-negative" : "") : ""}>
                  {d.avgCompositeDelta !== null
                    ? `${d.avgCompositeDelta > 0 ? "+" : ""}${d.avgCompositeDelta.toFixed(2)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="stakeholder-section stakeholder-exports">
        <h2>Official downloads</h2>
        <p>All data below is exportable for ministerial briefings, parliamentary submissions, and district reports.</p>
        <div className="stakeholder-downloads">
          <a href="/api/impact/export?format=csv" className="stakeholder-download-btn">📥 National CSV</a>
          <a href="/api/impact/report-engine?level=country&id=Uganda&format=pdf" className="stakeholder-download-btn">📄 National PDF brief</a>
          <Link href="/impact/for-researchers" className="stakeholder-download-btn">🔬 Researcher API</Link>
          <Link href="/impact" className="stakeholder-download-btn">🗺 Full impact map</Link>
        </div>
      </section>

      <section className="stakeholder-section stakeholder-method">
        <h2>Methodology</h2>
        <ul>
          <li><strong>Assessment instrument:</strong> 6-domain reading composite (letter ID, sound ID, decodable words, made-up words, story reading, comprehension)</li>
          <li><strong>Classroom observation:</strong> 13-item structured rubric scored 1–4 per item, post-lesson fidelity rating</li>
          <li><strong>Coaching cadence:</strong> 4 visits per school per term, each with implementation pathway tracking</li>
          <li><strong>Data flow:</strong> Triggered cascades keep snapshots fresh in real time; no manual reconciliation</li>
          <li><strong>Inter-rater reliability:</strong> Cross-observer variance monitored per school</li>
        </ul>
      </section>
    </main>
  );
}
