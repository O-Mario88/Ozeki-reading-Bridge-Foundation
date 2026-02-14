import Link from "next/link";
import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Partner With Us",
  description:
    "Funding pathways and implementation outcomes for donors, NGOs, and school networks.",
};

const fundingAreas = [
  "Teacher training and school coaching cycles",
  "Learner reading assessments and M&E systems",
  "Decodable readers and teaching aids production",
  "Remedial interventions for non-readers",
  "1001 Story anthology editing and printing",
  "District-level literacy strengthening",
];

export default function PartnerPage() {
  return (
    <>
      <PageHero
        kicker="Proposal-ready"
        title="Partner With Us"
        description="Fund high-impact literacy implementation with transparent reporting and measurable classroom outcomes."
      />

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Priority funding areas</h2>
            <ul>
              {fundingAreas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h2>Partner deliverables</h2>
            <ul>
              <li>Quarterly progress and implementation reports</li>
              <li>School and district-level result snapshots</li>
              <li>Monitoring tools and data collection summaries</li>
              <li>Recommendations for scaling and sustainability</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Organization profile and proposal support</h2>
          <p>
            Request a partner-ready organization profile, sample reporting format, and
            implementation budget framework.
          </p>
          <div className="action-row">
            <Link className="button" href="/contact">
              Request partner deck
            </Link>
            <Link className="button button-ghost" href="/impact">
              Review impact evidence
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
