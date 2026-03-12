import Link from "next/link";
import { listPublishedPortalResources } from "@/lib/db";

export const metadata = {
  title: "Donor Pack",
  description:
    "Download a complete due-diligence-ready donor pack with governance, safeguarding, data ethics, controls, and impact reporting samples.",
};

export const dynamic = "force-dynamic";

const donorPackContents = [
  "1-page organization profile",
  "Theory of Change (1 page)",
  "Programs overview + funding packages",
  "Sample impact report",
  "Safeguarding summary",
  "Governance summary",
  "Data privacy & ethics summary",
  "Financial controls summary",
  "Contact + partnership process",
];

export default function DonorPackPage() {
  const donorPackUploads = listPublishedPortalResources(40, {
    sections: ["Donor Pack Documents", "Compliance Documents", "Legal & Governance Documents"],
  }).slice(0, 8);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Donor resources</p>
          <h1>Download Donor Pack</h1>
          <p>
            Get a complete overview of our work, evidence standards, controls, and
            funding pathways, packaged for due diligence and fast decision-making.
          </p>
          <div className="action-row">
            <a className="inline-download-link" href="/downloads/donor-trust/ozeki-donor-pack.pdf">
              Download Donor Pack (PDF Bundle)
            </a>
            <Link className="button button-ghost" href="/partner#book-a-partner-call">
              Book a Partner Call
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Bundle contents</h2>
            <ul>
              {donorPackContents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="card">
            <h2>Quick links</h2>
            <p>
              <a className="inline-download-link" href="/downloads/donor-trust/governance-overview.pdf">
                Download Governance Summary
              </a>
            </p>
            <p>
              <a className="inline-download-link" href="/downloads/donor-trust/safeguarding-summary.pdf">
                Download Safeguarding Summary
              </a>
            </p>
            <p>
              <a className="inline-download-link" href="/downloads/donor-trust/data-privacy-ethics-summary.pdf">
                Download Data Privacy & Ethics Summary
              </a>
            </p>
            <p>
              <a className="inline-download-link" href="/downloads/donor-trust/financial-controls-anti-fraud-summary.pdf">
                Download Financial Controls Summary
              </a>
            </p>
            {donorPackUploads.length > 0 ? (
              <>
                <p className="meta-line">Latest uploaded donor documents</p>
                <ul className="uploaded-download-list">
                  {donorPackUploads.map((item) => (
                    <li key={item.id}>
                      <a href={item.externalUrl || `/api/resources/${item.id}/download`}>
                        {item.downloadLabel?.trim() || item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="uploaded-download-empty">No uploaded donor files yet.</p>
            )}
          </article>

          <article className="card">
            <h2>Next action</h2>
            <p>
              Request a concept note for your target district or package and receive
              scoped implementation and reporting options.
            </p>
            <div className="action-row">
              <Link className="button" href="/partner#request-a-proposal">
                Request Concept Note
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
