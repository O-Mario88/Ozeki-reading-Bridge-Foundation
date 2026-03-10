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
            <p>Full two-year school package with coaching, assessments, and reporting.</p>
            <div className="action-row">
              <Link className="button" href="/sponsor-a-school">
                Open package
              </Link>
            </div>
          </article>
          <article className="card">
            <h2>Sponsor a District</h2>
            <p>District-wide two-year literacy support with sub-county and parish reporting.</p>
            <div className="action-row">
              <Link className="button" href="/sponsor-a-district">
                Open package
              </Link>
            </div>
          </article>
          <article className="card">
            <h2>Sponsor a Sub-Region</h2>
            <p>Targeted two-year sub-region partnership with district performance evidence.</p>
            <div className="action-row">
              <Link className="button" href="/sponsor-a-sub-region">
                Open package
              </Link>
            </div>
          </article>
          <article className="card">
            <h2>Sponsor a Region</h2>
            <p>Region-level implementation and accountability package over two years.</p>
            <div className="action-row">
              <Link className="button" href="/sponsor-a-region">
                Open package
              </Link>
            </div>
          </article>
          <article className="card">
            <h2>Sponsor Uganda</h2>
            <p>National two-year partnership with reports across regions and districts.</p>
            <div className="action-row">
              <Link className="button" href="/sponsor-uganda">
                Open package
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
