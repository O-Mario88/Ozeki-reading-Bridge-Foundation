import Link from "next/link";
import Image from "next/image";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import {
  Globe2,
  TrendingUp,
  Users,
  BookOpen,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Target,
  GraduationCap,
  Building2,
  Landmark,
} from "lucide-react";

export const metadata = {
  title: "Sponsor Literacy in Uganda | Ozeki Reading Bridge Foundation",
  description:
    "Fund a national two-year literacy partnership in Uganda with NLIP-based implementation support, assessments, and accountability reporting across all regions.",
};

const WHY_SPONSOR_REASONS = [
  {
    icon: Globe2,
    title: "National problems need national solutions",
    body: "Literacy failure is not confined to one district or one region — it is a system-level challenge. Fragmented interventions create islands of improvement surrounded by unaddressed need. National investment builds a literacy operating system for the country.",
  },
  {
    icon: Building2,
    title: "Government alignment",
    body: "A national partnership aligns with Uganda's education sector priorities and strengthens the evidence base that government needs for policy and budget decisions. Your investment supports decision-making at the highest level.",
  },
  {
    icon: TrendingUp,
    title: "Maximum efficiency, maximum impact",
    body: "Training systems, coaching networks, and assessment infrastructure are built once and deployed everywhere. National scale reduces per-school costs and maximises the return on every dollar invested.",
  },
  {
    icon: Landmark,
    title: "A legacy of systemic change",
    body: "Sponsoring at country level creates permanent institutional capacity. You are not funding a project — you are funding a national literacy intelligence infrastructure that will outlast external support.",
  },
];

const IMPLEMENTATION_PHASES = [
  {
    icon: GraduationCap,
    title: "Nationwide teacher capacity building",
    body: "Structured phonics training deployed across all regions. Teachers receive practical, demonstration-based techniques with immediate classroom application and follow-up plans.",
  },
  {
    icon: Users,
    title: "Coaching & implementation follow-through",
    body: "Schools across every region receive repeated coaching cycles — classroom observation, demonstration lessons, teacher mentoring, and leadership routines to protect reading time.",
  },
  {
    icon: BookOpen,
    title: "Four national assessment rounds",
    body: "Baseline → Progress checks → Endline across two years. National progress measured consistently, gaps identified early, and support targeted where needed most.",
  },
  {
    icon: Target,
    title: "Priority targeting & catch-up",
    body: "NLIP identifies priority areas at every level — regions, districts, sub-counties. Remedial interventions are deployed where non-readers remain high and teaching quality is weakest.",
  },
];

const EXPECTED_OUTCOMES = [
  "System-level improvement in reading levels across all regions and districts",
  "National reduction in the proportion of non-readers in lower primary (P1–P3)",
  "Consistent phonics instruction in classrooms from northern to central to western Uganda",
  "School leaders across the country equipped to supervise and sustain reading improvement",
  "Government has credible, granular evidence for literacy policy and budget decisions",
  "Regional comparisons that reveal what is working and where to invest next",
  "A proven national model that can be sustained and replicated in other countries",
];

const EVIDENCE_PACK = [
  "National assessment results and reading level movement (aggregated by region)",
  "National teaching quality summary (teacher evaluation by domain, aggregated)",
  "Coverage and credibility indicators (n, completeness, tool version, last updated)",
  "Early warning flags identifying priority districts and sub-counties nationwide",
  "REC-mapped recommendations showing what should happen next and where",
  "Regional, sub-regional, and district performance comparisons",
];

export default function SponsorUgandaPage() {
  return (
    <>
      {/* 1. Premium Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/photos/22.jpeg"
            alt="Uganda national literacy improvement program"
            fill
            sizes="100vw"
            priority
            quality={90}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#0f2b26]/90 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#FA7D15]/15 via-transparent to-[#0f2b26]/60" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/20 text-[#FA7D15] font-bold text-sm mb-6 shadow-sm border border-[#FA7D15]/30">
            <Globe2 size={16} />
            National Partnership Package
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Sponsor Literacy in Uganda
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl leading-relaxed mb-4">
            Fund a complete national literacy improvement system — every region, every district,
            every school. Two years of structured support with transparent, verifiable results.
          </p>
          <p className="text-lg text-white/70 max-w-2xl leading-relaxed mb-10">
            $1,100 per school · 2-year commitment · NLIP-powered national evidence
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <HomeSupportRequestModal
              triggerLabel="Fund Uganda"
              title="Fund Uganda national partnership request form"
              description="Share your partnership timeline and we will follow up with implementation options."
              triggerClassName="px-8 py-4 rounded-full bg-[#FA7D15] text-white font-bold flex items-center gap-2 hover:bg-[#FA7D15]/90 transition-all hover:-translate-y-0.5 shadow-lg"
              presetMessage="I want to sponsor literacy in Uganda through a national 2-year partnership."
            />
            <HomeSupportRequestModal
              triggerLabel="Request a National Concept Note"
              title="National concept note request"
              description="Tell us your goals and we will prepare a national concept note."
              triggerClassName="px-8 py-4 rounded-full bg-transparent text-white font-bold flex items-center gap-2 border-2 border-white/40 hover:bg-white/10 transition-all hover:-translate-y-0.5"
              presetMessage="Please prepare a national concept note for a 2-year Uganda literacy partnership."
            />
          </div>
        </div>
      </section>

      {/* 2. Why Sponsor Uganda */}
      <SectionWrapper theme="light">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-brand-primary mb-6">
            Why sponsor the whole country?
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Uganda has made significant strides in education access, but reading proficiency
            remains critically low. The gap between being in school and being able to read
            requires a national approach — one that strengthens teachers, measures results, and
            acts on evidence at every level of the system.
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

      {/* 3. What Happens Over 2 Years */}
      <SectionWrapper theme="off-white">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-brand-primary mb-6">
            What happens over 2 years
          </h2>
          <p className="text-xl text-gray-600">
            This is not a campaign. It is a national improvement system: train → coach →
            assess → act → verify, repeated consistently across regions and districts.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {IMPLEMENTATION_PHASES.map((phase, index) => (
            <PremiumCard key={phase.title} className="p-8" withHover>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#FA7D15]/10 text-[#FA7D15] flex items-center justify-center text-lg font-bold">
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
              A national partnership is the highest-impact sponsorship tier. After two years, Uganda will
              have a functioning literacy intelligence system, measurable improvements across regions,
              and credible evidence that can guide education policy for years to come.
            </p>
            <ul className="space-y-4">
              {EXPECTED_OUTCOMES.map((outcome) => (
                <li key={outcome} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#FA7D15] shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-[#FA7D15]/5 rounded-[2.5rem] transform -rotate-3 scale-105" />
            <div className="relative rounded-[2rem] overflow-hidden aspect-[4/5] shadow-2xl">
              <Image
                src="/photos/Reading Session in Dokolo Greater Bata Cluster.jpeg"
                alt="National literacy programme impacting classrooms across Uganda"
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
              National Evidence Pack — Dashboard access + PDF reports + regional breakdowns.
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
                National progress snapshots available quarterly or termly. Reports cover regions, sub-regions, districts, and sub-counties.
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
              National funding follows the same clear unit cost. NLIP calculates the total
              automatically based on the number of schools across all regions. The cost covers
              training, coaching, assessments, materials, leadership support, and
              comprehensive national NLIP reporting.
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
            Start smaller or go deeper in a specific geography.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { label: "School", href: "/sponsor-a-school", desc: "One school, full support" },
            { label: "District", href: "/sponsor-a-district", desc: "District-wide coverage" },
            { label: "Sub-Region", href: "/sponsor-a-sub-region", desc: "Multi-district focus" },
            { label: "Region", href: "/sponsor-a-region", desc: "Region-wide impact" },
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
        heading="Ready to sponsor literacy in Uganda?"
        subheading="Your investment builds a national literacy operating system — the highest-impact partnership level available."
        primaryButtonText="Fund Uganda"
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
