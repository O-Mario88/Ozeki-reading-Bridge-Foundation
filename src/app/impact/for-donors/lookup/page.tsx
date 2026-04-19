import Link from "next/link";
import { getDonorROIPostgres } from "@/lib/server/postgres/repositories/donor-roi";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Sponsorship Impact · Ozeki Reading Bridge Foundation",
  robots: { index: false, follow: false },
};

export default async function DonorLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const roi = ref ? await getDonorROIPostgres({ sponsorshipReference: ref }) : null;

  return (
    <main className="stakeholder-page">
      <header className="stakeholder-hero">
        <span className="stakeholder-eyebrow">Donor Impact Report</span>
        <h1>{roi ? `Thank you, ${roi.donorName}.` : "Look up your impact"}</h1>
        {!roi && (
          <p>Enter the sponsorship reference on your confirmation email (format: <code>OZK-SPN-YYYY-XXXXXX</code>).</p>
        )}
      </header>

      {!ref && (
        <section className="stakeholder-cta">
          <form action="/impact/for-donors/lookup" method="get" className="stakeholder-lookup">
            <input type="text" name="ref" placeholder="OZK-SPN-YYYY-XXXXXX" required aria-label="Sponsorship reference" />
            <button type="submit">View my impact →</button>
          </form>
        </section>
      )}

      {ref && !roi && (
        <section className="stakeholder-section">
          <p className="stakeholder-error">
            We couldn&apos;t find a sponsorship with reference <code>{ref}</code>. The payment may still be processing.
            If you believe this is a mistake, email us at <a href="mailto:accounts@ozekiread.org">accounts@ozekiread.org</a>.
          </p>
          <Link href="/impact/for-donors">← Back to donor impact overview</Link>
        </section>
      )}

      {roi && (
        <>
          <section className="stakeholder-kpis">
            <article className="is-highlight">
              <span>Your contribution</span>
              <strong>UGX {roi.totalAmountUgx.toLocaleString()}</strong>
            </article>
            <article>
              <span>Schools reached</span>
              <strong>{roi.schoolsReached}</strong>
            </article>
            <article>
              <span>Learners touched</span>
              <strong>{roi.learnersReached.toLocaleString()}</strong>
            </article>
            <article>
              <span>Cost per learner</span>
              <strong>
                {roi.costPerLearner !== null
                  ? `UGX ${roi.costPerLearner.toLocaleString()}`
                  : "—"}
              </strong>
            </article>
            <article className="is-highlight">
              <span>Avg score lift</span>
              <strong>
                {roi.avgCompositeDelta !== null
                  ? `${roi.avgCompositeDelta > 0 ? "+" : ""}${roi.avgCompositeDelta.toFixed(2)}`
                  : "—"}
              </strong>
              <small>Composite reading score across your schools</small>
            </article>
            <article>
              <span>Coaching visits delivered</span>
              <strong>{roi.totalVisits}</strong>
            </article>
          </section>

          <section className="stakeholder-section">
            <h2>Schools your funding reached</h2>
            <table className="stakeholder-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>District</th>
                  <th>Allocated</th>
                  <th>Learners assessed</th>
                  <th>Composite Δ</th>
                  <th>Health score</th>
                  <th>Trajectory</th>
                </tr>
              </thead>
              <tbody>
                {roi.outcomes.map((o) => (
                  <tr key={o.schoolId}>
                    <td><Link href={`/schools/${o.schoolId}`}><strong>{o.schoolName}</strong></Link></td>
                    <td>{o.district}</td>
                    <td>{o.currency} {o.allocationAmount.toLocaleString()}</td>
                    <td>{o.learnersAssessed}</td>
                    <td className={o.compositeDelta !== null ? (o.compositeDelta > 0 ? "stakeholder-positive" : o.compositeDelta < 0 ? "stakeholder-negative" : "") : ""}>
                      {o.compositeDelta !== null
                        ? `${o.compositeDelta > 0 ? "+" : ""}${o.compositeDelta.toFixed(2)}`
                        : "—"}
                    </td>
                    <td>{o.healthScore !== null ? `${o.healthScore}/100` : "—"}</td>
                    <td><em>{o.trajectoryBand ?? "—"}</em></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="stakeholder-cta">
            <h2>Share your impact</h2>
            <p>Your contribution is changing lives in measurable ways. <Link href="/sponsor">Sponsor again</Link> and help more schools reach grade-level reading.</p>
          </section>
        </>
      )}
    </main>
  );
}
