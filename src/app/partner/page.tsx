import Link from "next/link";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";

export const metadata = {
  title: "Partner With Us",
  description:
    "Choose a sponsorship level and submit a partnership request for literacy delivery with measurable outcomes.",
};

export default function PartnerPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Partner with us</p>
          <h1>Fund literacy by school, district, sub-region, region, or country</h1>
          <p>
            Choose a sponsorship package and submit a partnership request. Every package is
            tracked in NLIP with measurable implementation and reporting.
          </p>
          <div className="action-row">
            <Link className="button" href="/impact/calculator">
              Open Funding Calculator
            </Link>
            <Link className="button button-ghost" href="/donor-pack">
              Download Donor Pack
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Sponsor a School</h2>
            <p>
              Fund one school&apos;s complete two-year literacy journey — coaching visits,
              assessment rounds, teaching materials, and NLIP evidence reporting. See exactly
              how your support translates into reading gains.
            </p>
            <div className="action-row">
              <Link className="button" href="/sponsor-a-school">
                View School Package
              </Link>
            </div>
          </article>
          <article className="card">
            <h2>Sponsor a District</h2>
            <p>
              Strengthen reading instruction across an entire district. Every school receives
              structured coaching, four assessment rounds, and leadership support. You receive
              partner-ready evidence showing district-wide improvement.
            </p>
            <div className="action-row">
              <Link className="button" href="/sponsor-a-district">
                View District Package
              </Link>
            </div>
          </article>
          <article className="card">
            <h2>Sponsor a Sub-Region</h2>
            <p>
              The ideal balance of depth and scale. A sub-region is large enough to drive
              system-level change, but focused enough for every school to get meaningful
              support. Creates a replicable proof point for further investment.
            </p>
            <div className="action-row">
              <Link className="button" href="/sponsor-a-sub-region">
                View Sub-Region Package
              </Link>
            </div>
          </article>
          <article className="card">
            <h2>Sponsor a Region</h2>
            <p>
              Fix the literacy system at regional scale. When improvement is coordinated
              across all districts and sub-regions, gains are sustainable and leadership
              decisions are backed by credible evidence.
            </p>
            <div className="action-row">
              <Link className="button" href="/sponsor-a-region">
                View Region Package
              </Link>
            </div>
          </article>
          <article className="card">
            <h2>Sponsor Uganda</h2>
            <p>
              The highest-impact tier. Build a national literacy operating system across all
              regions and districts. Your investment creates permanent institutional capacity
              and provides government with evidence for policy decisions.
            </p>
            <div className="action-row">
              <Link className="button" href="/sponsor-uganda">
                View Country Package
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section" id="book-a-partner-call">
        <div className="container card">
          <h2>Request a partnership discussion</h2>
          <p>Share your geography focus and timeline. The partnerships team will follow up.</p>
          <div className="action-row">
            <HomeSupportRequestModal
              triggerLabel="Partner With Us"
              title="Partnership request form"
              description="Share your partnership interest and geography focus."
              triggerClassName="button"
              presetMessage="I would like to partner with Ozeki Reading Bridge Foundation."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a concept note"
              title="Concept note request"
              description="Share the sponsorship scope and we will prepare a concept note."
              triggerClassName="button button-ghost"
              presetMessage="I would like a concept note for a literacy partnership."
            />
          </div>
        </div>
      </section>
    </>
  );
}
