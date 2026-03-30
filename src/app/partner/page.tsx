import Link from "next/link";
import { PageHero } from "@/components/public/PageHero";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
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
      "Fund one school’s complete two-year literacy journey — coaching visits, assessment rounds, teaching materials, and NLIP evidence reporting. See exactly how your support translates into reading gains.",
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
        tagline="Partner with us"
        title="Fund literacy that shows results"
        subtitle="Choose a sponsorship package and submit a partnership request. Every package is tracked in NLIP with measurable implementation and reporting."
        imageSrc="/photos/PXL_20260218_133701748.jpg"
      >
        <Link className="px-8 py-3.5 rounded-full bg-[#FA7D15] text-white font-semibold hover:bg-[#E86D0B] shadow-lg transition-all" href="/impact-reports">
          Explore Impact
        </Link>
        <Link className="px-8 py-3.5 rounded-full border-2 border-white/20 text-white font-semibold hover:bg-white/10 transition-all" href="/donor-pack">
          Download Donor Pack
        </Link>
      </PageHero>

      <SectionWrapper theme="charius-beige">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-[#111] mb-6">Choose your sponsorship level</h2>
          <p className="text-xl text-gray-500 leading-relaxed">From a single school to a national programme — every level includes evidence-based delivery, coaching, assessment, and partner reporting.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {sponsorCards.map((card) => (
            <PremiumCard variant="charius" className="p-8 flex flex-col items-start" key={card.href} withHover>
              <h3 className="text-2xl font-bold text-[#111] mb-4">{card.title}</h3>
              <p className="text-gray-500 leading-relaxed text-lg flex-1 mb-8">{card.description}</p>
              <Link className="font-semibold text-[#FA7D15] hover:text-[#E86D0B] flex items-center gap-2 group mt-auto" href={card.href}>
                {card.cta} <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </PremiumCard>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper theme="charius-dark" id="book-a-partner-call">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Request a partnership discussion</h2>
          <p className="text-xl text-gray-300 leading-relaxed mb-10 max-w-2xl mx-auto">Share your geography focus and timeline. The partnerships team will follow up.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <HomeSupportRequestModal
              triggerLabel="Partner With Us"
              title="Partnership request form"
              description="Share your partnership interest and geography focus."
              triggerClassName="px-8 py-3.5 rounded-full bg-[#FA7D15] text-white font-semibold hover:bg-[#E86D0B] shadow-lg transition-all inline-flex items-center justify-center cursor-pointer"
              presetMessage="I would like to partner with Ozeki Reading Bridge Foundation."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a concept note"
              title="Concept note request"
              description="Share the sponsorship scope and we will prepare a concept note."
              triggerClassName="px-8 py-3.5 rounded-full border-2 border-white/20 text-white font-semibold hover:bg-white/10 transition-all inline-flex items-center justify-center cursor-pointer"
              presetMessage="I would like a concept note for a literacy partnership."
            />
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
