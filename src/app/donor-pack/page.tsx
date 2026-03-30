import Link from "next/link";
import { listPublishedPortalResources } from "@/lib/content-db";
import { PageHero } from "@/components/public/PageHero";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";

export const metadata = {
  title: "Donor Pack",
  description:
    "Download a complete due-diligence-ready donor pack with governance, safeguarding, data ethics, controls, and impact reporting samples.",
};

export const revalidate = 300;

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

export default async function DonorPackPage() {
  const donorPackUploads = (await listPublishedPortalResources(40, {
    sections: ["Donor Pack Documents", "Compliance Documents", "Legal & Governance Documents"],
  })).slice(0, 8);

  return (
    <>
      <PageHero
        tagline="Donor resources"
        title="Download Donor Pack"
        subtitle="Get a complete overview of our work, evidence standards, controls, and funding pathways, packaged for due diligence and fast decision-making."
        imageSrc="/photos/PXL_20260218_133448048.jpg"
      >
        <a className="px-8 py-3.5 rounded-full bg-[#FA7D15] text-white font-semibold hover:bg-[#E86D0B] shadow-lg transition-all" href="/downloads/donor-trust/ozeki-donor-pack.pdf">
          Download Donor Pack (PDF Bundle)
        </a>
        <Link className="px-8 py-3.5 rounded-full border-2 border-white/20 text-white font-semibold hover:bg-white/10 transition-all" href="/partner#book-a-partner-call">
          Book a Partner Call
        </Link>
      </PageHero>

      <SectionWrapper theme="charius-beige">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <PremiumCard variant="charius" className="p-8">
            <h2 className="text-2xl font-bold text-[#111] mb-6">Bundle contents</h2>
            <ul className="space-y-3">
              {donorPackContents.map((item) => (
                <li key={item} className="flex items-start gap-3 text-gray-500">
                  <span className="text-[#FA7D15] font-bold mt-0.5">•</span> {item}
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8">
            <h2 className="text-2xl font-bold text-[#111] mb-6">Quick links</h2>
            <div className="space-y-4">
              <p>
                <a className="text-[#FA7D15] font-semibold hover:text-[#E86D0B] transition-colors" href="/downloads/donor-trust/governance-overview.pdf">
                  Download Governance Summary →
                </a>
              </p>
              <p>
                <a className="text-[#FA7D15] font-semibold hover:text-[#E86D0B] transition-colors" href="/downloads/donor-trust/safeguarding-summary.pdf">
                  Download Safeguarding Summary →
                </a>
              </p>
              <p>
                <a className="text-[#FA7D15] font-semibold hover:text-[#E86D0B] transition-colors" href="/downloads/donor-trust/data-privacy-ethics-summary.pdf">
                  Download Data Privacy & Ethics Summary →
                </a>
              </p>
              <p>
                <a className="text-[#FA7D15] font-semibold hover:text-[#E86D0B] transition-colors" href="/downloads/donor-trust/financial-controls-anti-fraud-summary.pdf">
                  Download Financial Controls Summary →
                </a>
              </p>
              {donorPackUploads.length > 0 ? (
                <>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-8 mb-4">Latest uploaded donor documents</p>
                  <ul className="space-y-3">
                    {donorPackUploads.map((item) => (
                      <li key={item.id}>
                        <a className="text-[#FA7D15] font-semibold hover:text-[#E86D0B] transition-colors" href={item.externalUrl || `/api/resources/${item.id}/download`}>
                          {item.downloadLabel?.trim() || item.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-6 italic">No uploaded donor files yet.</p>
              )}
            </div>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 bg-charius-dark text-white">
            <h2 className="text-2xl font-bold mb-4">Next action</h2>
            <p className="text-gray-300 leading-relaxed mb-8">
              Request a concept note for your target district or package and receive
              scoped implementation and reporting options.
            </p>
            <div className="flex flex-col">
              <Link className="px-6 py-3 rounded-full bg-[#FA7D15] text-white text-center font-semibold hover:bg-[#E86D0B] shadow-lg transition-all" href="/partner#request-a-proposal">
                Request Concept Note
              </Link>
            </div>
          </PremiumCard>
        </div>
      </SectionWrapper>
    </>
  );
}
