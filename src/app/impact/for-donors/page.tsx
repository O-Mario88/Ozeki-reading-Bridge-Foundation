import Link from "next/link";
import { getAllDonorROIAggregatePostgres } from "@/lib/server/postgres/repositories/donor-roi";
import { getNationalKpiSnapshotPostgres } from "@/lib/server/postgres/repositories/kpi-snapshots";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata = {
  title: "Your Impact as a Donor · Ozeki Reading Bridge Foundation",
  description: "See exactly how your contribution reaches specific schools and learners, with outcome evidence.",
};

export default async function DonorImpactPage() {
  const [aggregate, national] = await Promise.all([
    getAllDonorROIAggregatePostgres(),
    getNationalKpiSnapshotPostgres(),
  ]);

  return (
    <main className="stakeholder-page">
      <header className="stakeholder-hero">
        <span className="stakeholder-eyebrow">For Donors & Funders</span>
        <h1>Every shilling. Every school. Every outcome.</h1>
        <p>
          Ozeki Reading Bridge Foundation is the first literacy programme in the region to publish
          a full donor-to-outcome chain. Your contribution is allocated to specific schools; those schools&apos;
          reading outcomes are tracked and reported back. No black box.
        </p>
      </header>

      <section className="stakeholder-kpis">
        <article>
          <span>Total donors</span>
          <strong>{aggregate.totalDonors.toLocaleString()}</strong>
        </article>
        <article>
          <span>Total raised (UGX)</span>
          <strong>{aggregate.totalRaised.toLocaleString()}</strong>
        </article>
        <article>
          <span>Schools funded</span>
          <strong>{aggregate.totalSchoolsReached.toLocaleString()}</strong>
        </article>
        <article>
          <span>Learners reached</span>
          <strong>{aggregate.totalLearnersReached.toLocaleString()}</strong>
        </article>
        <article className="is-highlight">
          <span>Cost per learner</span>
          <strong>
            {aggregate.avgCostPerLearner !== null
              ? `UGX ${aggregate.avgCostPerLearner.toLocaleString()}`
              : "—"}
          </strong>
          <small>Programme delivery only</small>
        </article>
        <article className="is-highlight">
          <span>Avg score lift (funded schools)</span>
          <strong>
            {aggregate.avgCompositeDelta !== null
              ? `${aggregate.avgCompositeDelta > 0 ? "+" : ""}${aggregate.avgCompositeDelta.toFixed(2)}`
              : "—"}
          </strong>
          <small>Composite reading score · baseline → endline</small>
        </article>
      </section>

      <section className="stakeholder-section">
        <h2>How your contribution becomes outcome</h2>
        <ol className="stakeholder-flow">
          <li><strong>1. Pledge</strong><br /><small>You donate or sponsor a school, district, or region via the secure payment portal.</small></li>
          <li><strong>2. Allocation</strong><br /><small>A database trigger automatically splits district/region sponsorships across active schools in that area.</small></li>
          <li><strong>3. Delivery</strong><br /><small>Coaches, trainings, assessments, and resources flow into those schools.</small></li>
          <li><strong>4. Measurement</strong><br /><small>Every 4 months, learners are re-assessed. Outcomes are computed automatically.</small></li>
          <li><strong>5. Reporting</strong><br /><small>You receive a personalised ROI report showing exactly which schools improved and by how much.</small></li>
        </ol>
      </section>

      {aggregate.topDonors.length > 0 && (
        <section className="stakeholder-section">
          <h2>Top contributors</h2>
          <table className="stakeholder-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Contribution (UGX)</th>
                <th>Schools reached</th>
              </tr>
            </thead>
            <tbody>
              {aggregate.topDonors.map((d) => (
                <tr key={d.donorName}>
                  <td>{d.donorName}</td>
                  <td>{d.amount.toLocaleString()}</td>
                  <td>{d.schoolsReached}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {national && (
        <section className="stakeholder-section stakeholder-evidence">
          <h2>Programme-level evidence</h2>
          <p>All funded schools are rolled into the national programme aggregate:</p>
          <ul>
            <li><strong>{national.schoolsCount}</strong> schools active across <strong>{national.districtsCount}</strong> districts</li>
            <li><strong>{national.totalLearnersAssessed.toLocaleString()}</strong> unique learners assessed</li>
            <li><strong>{national.totalTeachersSupported.toLocaleString()}</strong> teachers supported</li>
            <li><strong>{national.totalCertificatesIssued.toLocaleString()}</strong> certificates issued</li>
            {national.avgCompositeDelta !== null && (
              <li>Programme-wide composite delta: <strong>{national.avgCompositeDelta > 0 ? "+" : ""}{national.avgCompositeDelta.toFixed(2)}</strong> points</li>
            )}
          </ul>
        </section>
      )}

      <section className="stakeholder-cta">
        <h2>See your own impact</h2>
        <p>Already contributed? Look up your personalised outcome report using your sponsorship reference.</p>
        <form action="/impact/for-donors/lookup" method="get" className="stakeholder-lookup">
          <input type="text" name="ref" placeholder="OZK-SPN-YYYY-XXXXXX" required aria-label="Your sponsorship reference" />
          <button type="submit">View my impact →</button>
        </form>
        <p className="stakeholder-fine">Or <Link href="/sponsor">start a new sponsorship</Link>.</p>
      </section>
    </main>
  );
}
