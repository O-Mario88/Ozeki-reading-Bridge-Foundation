import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";

export const metadata = {
  title: "Partner With Us",
  description:
    "Choose a sponsorship level and submit a partnership request for literacy delivery with measurable outcomes.",
};

const sponsorCards = [
  {
    title: "Sponsor a School",
    description:
      "Fund one school\u2019s complete two-year literacy journey \u2014 coaching visits, assessment rounds, teaching materials, and NLIP evidence reporting. See exactly how your support translates into reading gains.",
    href: "/sponsor-a-school",
    cta: "View School Package",
  },
  {
    title: "Sponsor a District",
    description:
      "Strengthen reading instruction across an entire district. Every school receives structured coaching, four assessment rounds, and leadership support. You receive partner-ready evidence showing district-wide improvement.",
    href: "/sponsor-a-district",
    cta: "View District Package",
  },
  {
    title: "Sponsor a Sub-Region",
    description:
      "The ideal balance of depth and scale. A sub-region is large enough to drive system-level change, but focused enough for every school to get meaningful support. Creates a replicable proof point for further investment.",
    href: "/sponsor-a-sub-region",
    cta: "View Sub-Region Package",
  },
  {
    title: "Sponsor a Region",
    description:
      "Fix the literacy system at regional scale. When improvement is coordinated across all districts and sub-regions, gains are sustainable and leadership decisions are backed by credible evidence.",
    href: "/sponsor-a-region",
    cta: "View Region Package",
  },
] as const;

export default function PartnerPage() {
  return (
    <>
      <PageHero
        kicker="Partner with us"
        title="Fund literacy that shows results"
        description="Choose a sponsorship package and submit a partnership request. Every package is tracked in NLIP with measurable implementation and reporting."
      >
        <div className="action-row" style={{ justifyContent: "center" }}>
          <Link className="button" href="/impact/calculator">
            Open Funding Calculator
          </Link>
          <Link className="button button-ghost" href="/donor-pack">
            Download Donor Pack
          </Link>
        </div>
      </PageHero>

      <section className="section">
        <div className="container">
          <div className="partner-section-head">
            <h2>Choose your sponsorship level</h2>
            <p>From a single school to a national programme — every level includes evidence-based delivery, coaching, assessment, and partner reporting.</p>
          </div>
          <div className="partner-cards-grid">
            {sponsorCards.map((card) => (
              <article className="partner-card" key={card.href}>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <div className="action-row">
                  <Link className="button" href={card.href}>
                    {card.cta}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="book-a-partner-call">
        <div className="container">
          <div className="partner-cta-card">
            <div className="partner-cta-content">
              <h2>Request a partnership discussion</h2>
              <p>Share your geography focus and timeline. The partnerships team will follow up.</p>
            </div>
            <div className="action-row" style={{ justifyContent: "center" }}>
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
        </div>
      </section>
    </>
  );
}
