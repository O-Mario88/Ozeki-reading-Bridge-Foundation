import Link from "next/link";
import Image from "next/image";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import {
  MapPin,
  TrendingUp,
  Users,
  BookOpen,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Target,
  GraduationCap,
  HeartHandshake,
  Globe,
} from "lucide-react";

export const metadata = {
  title: "Sponsor Literacy in a Region | Ozeki Reading Bridge Foundation",
  description:
    "Fund a two-year regional literacy partnership with NLIP-based coaching, assessments, and accountability reporting across an entire region.",
};

const WHY_SPONSOR_REASONS = [
  {
    icon: MapPin,
    title: "Regions are where gaps compound",
    body: "A struggling district within a weak region receives less local support, fewer resources, and weaker supervision. Regional sponsorship addresses the system, not just individual schools.",
  },
  {
    icon: TrendingUp,
    title: "Improvement must be coordinated",
    body: "When training happens in one district but coaching is absent in the next, gains are uneven and unsustainable. Regional investment ensures every school benefits from the same quality cycle.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence at the right level",
    body: "Regional data reveals which districts are improving and which need intensified support. This is the level where leaders make resource allocation decisions.",
  },
  {
    icon: HeartHandshake,
    title: "Partners see system-level transformation",
    body: "Funding a region means your impact story is not about one school — it is about an entire education ecosystem improving together, measurably.",
  },
];

const IMPLEMENTATION_PHASES = [
  {
    icon: GraduationCap,
    title: "Teacher capacity building",
    body: "Structured phonics training for every school in the region. Teachers learn practical, demonstration-based techniques they can implement immediately.",
  },
  {
    icon: Users,
    title: "Coaching & follow-through",
    body: "Schools receive repeated support through coaching visits. Classroom observation, demonstration lessons, teacher mentoring, and leadership check-ins to sustain routines.",
  },
  {
    icon: BookOpen,
    title: "Four assessment rounds",
    body: "Baseline → Progress checks → Endline across two years. This builds a reliable picture of improvement and supports targeted adjustments as schools progress.",
  },
  {
    icon: Target,
    title: "Priority targeting & catch-up",
    body: "NLIP flags underperforming districts and sub-regions early. Remedial interventions are activated where non-readers remain high and coaching shifts to close gaps.",
  },
];

const EXPECTED_OUTCOMES = [
  "Measurable improvement in reading levels across all 6 literacy domains",
  "Reduced proportion of non-readers in lower primary, especially P1–P3",
  "Stronger and more consistent phonics instruction in classrooms",
  "School leaders actively supervising and supporting reading instruction",
  "Districts within the region moving toward implementation independence",
  "Clear evidence trail showing baseline-to-endline improvement for every school",
];

const EVIDENCE_PACK = [
  "Assessment results and reading level movement for the region (aggregated)",
  "Teacher evaluation results (teaching quality by domain and trend over time)",
  "Coverage and credibility indicators (sample size, completeness, tool version)",
  "Early warning priority flags for districts needing intensified support",
  "REC-mapped recommendations showing what should happen next and where",
  "Sub-region and district performance comparisons",
];

export default function SponsorRegionPage() {
  return (
    <>
      {/* 1. Premium Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/photos/22.jpeg"
            alt="Teachers and learners in a literacy coaching session"
            fill
            sizes="100vw"
            priority
            quality={90}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-brand-primary/85 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-primary/40 to-brand-primary/95" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white font-semibold text-sm mb-6 shadow-sm border border-white/20">
            <Globe size={16} />
            Regional Partnership Package
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Sponsor Literacy in a Region
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl leading-relaxed mb-4">
            Fund a complete two-year literacy improvement cycle across all districts and
            sub-regions within one region — with measurable outcomes and transparent reporting.
          </p>
          <p className="text-lg text-white/70 max-w-2xl leading-relaxed mb-10">
            $1,100 per school · 2-year commitment · NLIP-powered evidence
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <HomeSupportRequestModal
              triggerLabel="Fund a Region"
              title="Fund a region request form"
              description="Share your region focus and timeline, and our partnerships team will follow up."
              triggerClassName="px-8 py-4 rounded-full bg-white text-brand-primary font-bold flex items-center gap-2 hover:bg-gray-50 transition-all hover:-translate-y-0.5 shadow-lg"
              presetMessage="I want to fund a region under the 2-year literacy partnership package."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a Concept Note"
              title="Regional concept note request"
              description="Tell us your region focus and we will prepare a concept note."
              triggerClassName="px-8 py-4 rounded-full bg-transparent text-white font-bold flex items-center gap-2 border-2 border-white/40 hover:bg-white/10 transition-all hover:-translate-y-0.5"
              presetMessage="Please prepare a regional concept note for a 2-year literacy partnership."
            />
          </div>
        </div>
      </section>

      {/* 2. Why Sponsor a Region */}
      <SectionWrapper theme="light">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-brand-primary mb-6">
            Why sponsor a region?
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Reading failure is not random — it clusters geographically. Where teacher support
            is weakest and supervision is absent, entire communities of children fall behind.
            Regional investment fixes the system, not just symptoms.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {WHY_SPONSOR_REASONS.map((reason) => (
            <PremiumCard key={reason.title} className="p-8" withHover>
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-6">
                <reason.icon size={24} />
              </div>
              <h3 className="text-xl font-bold text-brand-primary mb-3">{reason.title}</h3>
              <p className="text-gray-600 leading-relaxed">{reason.body}</p>
            </PremiumCard>
          ))}
        </div>
      </SectionWrapper>

      {/* 3. What You Fund (Implementation) */}
      <SectionWrapper theme="off-white">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-brand-primary mb-6">
            What happens over 2 years
          </h2>
          <p className="text-xl text-gray-600">
            A structured, repeating cycle: train → coach → assess → improve → verify.
            Every school in the region follows this pathway.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {IMPLEMENTATION_PHASES.map((phase, index) => (
            <PremiumCard key={phase.title} className="p-8" withHover>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center text-lg font-bold">
                  {index + 1}
                </div>
                <phase.icon size={20} className="text-brand-primary" />
              </div>
              <h3 className="text-lg font-bold text-brand-primary mb-3">{phase.title}</h3>
              <p className="text-gray-600 leading-relaxed">{phase.body}</p>
            </PremiumCard>
          ))}
        </div>
      </SectionWrapper>

      {/* 4. Expected Outcomes */}
      <SectionWrapper theme="light">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold text-brand-primary mb-6 tracking-tight">
              Expected outcomes
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              By the end of the two-year cycle, your investment will have produced measurable,
              verifiable improvements across the entire region. These are not projections —
              they are tracked through NLIP and reported with credibility indicators.
            </p>
            <ul className="space-y-4">
              {EXPECTED_OUTCOMES.map((outcome) => (
                <li key={outcome} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-brand-primary/5 rounded-[2.5rem] transform -rotate-3 scale-105" />
            <div className="relative rounded-[2rem] overflow-hidden aspect-[4/5] shadow-2xl">
              <Image
                src="/photos/Reading Session in Dokolo Greater Bata Cluster.jpeg"
                alt="Reading session showing literacy improvement in a Ugandan school"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 500px"
              />
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* 5. Evidence & Reporting */}
      <SectionWrapper theme="off-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-6">
              <BarChart3 size={32} />
            </div>
            <h2 className="text-4xl font-bold text-brand-primary mb-4">
              Evidence you receive
            </h2>
            <p className="text-lg text-gray-600">
              Regional Evidence Pack — Dashboard access + PDF reports with credibility markers.
            </p>
          </div>
          <PremiumCard className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-6">
              {EVIDENCE_PACK.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm font-medium leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                All reports include credibility markers: sample size (n), completeness, tool version, and last updated.
                Progress snapshots available quarterly or termly.
              </p>
            </div>
          </PremiumCard>
        </div>
      </SectionWrapper>

      {/* 6. Costing */}
      <SectionWrapper theme="light">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-brand-primary mb-6">
            Simple, transparent costing
          </h2>
          <PremiumCard className="p-8 md:p-12 text-center">
            <p className="text-6xl font-extrabold text-brand-primary mb-2">$1,100</p>
            <p className="text-xl text-gray-600 mb-6">per school · full 2-year support cycle</p>
            <p className="text-gray-500 leading-relaxed max-w-xl mx-auto mb-8">
              When you select a region, NLIP automatically calculates the total based on the
              number of schools. No manual calculations required. The cost covers training,
              coaching visits, assessment rounds, materials, leadership support, and all
              NLIP evidence and reporting.
            </p>
            <Link
              href="/impact/calculator"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all hover:-translate-y-0.5 shadow-lg"
            >
              Open Funding Calculator <ArrowRight size={16} />
            </Link>
          </PremiumCard>
        </div>
      </SectionWrapper>

      {/* 7. Other Sponsorship Levels */}
      <SectionWrapper theme="off-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-brand-primary mb-4">
            Other sponsorship levels
          </h2>
          <p className="text-gray-600">
            Choose the geographic level that matches your impact goals.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { label: "School", href: "/sponsor-a-school", desc: "One school, full support" },
            { label: "District", href: "/sponsor-a-district", desc: "District-wide coverage" },
            { label: "Sub-Region", href: "/sponsor-a-sub-region", desc: "Multi-district focus" },
            { label: "Country", href: "/sponsor-uganda", desc: "National transformation" },
          ].map((tier) => (
            <Link key={tier.label} href={tier.href}>
              <PremiumCard className="p-6 text-center h-full cursor-pointer" withHover>
                <h3 className="text-lg font-bold text-brand-primary mb-2">{tier.label}</h3>
                <p className="text-sm text-gray-500">{tier.desc}</p>
              </PremiumCard>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* 8. Bottom CTA */}
      <CTAStrip
        heading="Ready to sponsor a region?"
        subheading="Your investment builds a regional literacy operating system — measurable, accountable, and designed to outlast external support."
        primaryButtonText="Fund a Region"
        primaryButtonHref="/contact"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        secondaryButtonText="All Partnership Options"
        secondaryButtonHref="/partner"
        theme="brand"
      />
    </>
  );
}
