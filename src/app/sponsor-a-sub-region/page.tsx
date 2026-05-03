import Link from "next/link";
import Image from "next/image";
import { SponsorshipWizard } from "@/components/public/SponsorshipWizard";
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
  Layers,
  Crosshair,
} from "lucide-react";

export const metadata = {
  title: "Sponsor Literacy in a Sub-Region | Ozeki Reading Bridge Foundation",
  description:
    "Fund a two-year sub-region literacy partnership with coaching, assessments, leadership support, and NLIP evidence reporting.",
};

const WHY_SPONSOR_REASONS = [
  {
    icon: Crosshair,
    title: "Focused depth, not scattered reach",
    body: "A sub-region is large enough to generate system-level change, but focused enough for every school to receive meaningful support and follow-up. This is the sweet spot for targeted investment.",
  },
  {
    icon: MapPin,
    title: "District leaders see results they trust",
    body: "Sub-regional data helps district education officers identify what is working and where to redirect resources. Your investment generates evidence that local leaders actually use.",
  },
  {
    icon: TrendingUp,
    title: "Attract further investment",
    body: "A sub-region that shows clear improvement becomes a proof point. Government and other partners are more likely to expand support when they see credible, localised evidence of what works.",
  },
  {
    icon: Layers,
    title: "Coordinated across districts",
    body: "Schools in the same sub-region share teachers, coaching resources, and leadership structures. Sponsoring at this level ensures the entire support ecosystem is strengthened together.",
  },
];

const IMPLEMENTATION_PHASES = [
  {
    icon: GraduationCap,
    title: "School support visits",
    body: "Schools receive repeated coaching support through structured visits each year. Phonics lesson observation, demonstration lessons, teacher mentoring, and leadership routines.",
  },
  {
    icon: BookOpen,
    title: "Four assessment rounds",
    body: "The sub-region completes four assessment rounds across two years: Baseline → Progress checks → Endline. Improvement is tracked, gaps identified early, and support is targeted.",
  },
  {
    icon: Users,
    title: "Leadership strengthening",
    body: "Headteachers and Directors of Studies are supported to monitor reading instruction regularly. Leaders use learner data to make decisions and schools sustain routines beyond external support.",
  },
  {
    icon: Target,
    title: "Targeted remedial activation",
    body: "Where results show high proportions of non-readers or weak decoding, NLIP triggers structured remedial and catch-up support. This ensures the weakest schools improve, not only the strongest.",
  },
];

const EXPECTED_OUTCOMES = [
  "Consistent improvement in reading levels across all districts in the sub-region",
  "Fewer non-readers in lower primary (P1–P3) within two years",
  "Teachers in every school using structured phonics instruction daily",
  "School leaders actively supervising literacy routines",
  "District-level evidence showing which schools have improved and by how much",
  "A replicable model that neighbouring sub-regions and districts can adopt",
];

const EVIDENCE_PACK = [
  "Assessment results and reading level movement (by district and sub-county)",
  "Teacher evaluation results (teaching quality by domain, improvement over time)",
  "Coverage and completeness indicators (n assessed, % coverage, tool version)",
  "Early warning flags for districts and sub-counties needing intensified support",
  "Priority recommendations (REC-mapped) for next actions by geography",
  "District and sub-county performance comparisons",
];

export default function SponsorSubRegionPage() {
  return (
    <>
      {/* 1. Premium Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/photos/PXL_20260219_095934420.jpg"
            alt="Literacy coaching session in a Ugandan classroom"
            fill
            sizes="100vw"
            priority
            quality={90}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#1a4d47]/88 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a4d47]/40 to-[#1a4d47]/95" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#ff7235]/15 via-transparent to-transparent pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white font-semibold text-sm mb-6 shadow-sm border border-white/20">
            <Crosshair size={16} />
            Sub-Region Partnership Package
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Sponsor Literacy in a Sub-Region
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl leading-relaxed mb-4">
            Targeted, measurable literacy improvement across one sub-region. Every school,
            every teacher, every learner — coached, assessed, and supported for two years.
          </p>
          <p className="text-lg text-white/70 max-w-2xl leading-relaxed mb-10">
            $1,100 per school · 2-year commitment · NLIP-powered evidence
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#sponsorship-checkout" className="btn-orange px-8 py-4 rounded-full font-bold flex items-center gap-2">
              Fund a Sub-Region
            </a>
            <Link href="/partner" className="btn-green px-8 py-4 rounded-full font-bold flex items-center gap-2">
              All Partnership Options
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Why Sponsor a Sub-Region */}
      <SectionWrapper theme="charius-beige">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-[#111] mb-6">
            Why sponsor a sub-region?
          </h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            A sub-region is the ideal unit for high-impact literacy investment. Large enough to
            generate system-level change, focused enough to ensure every school gets meaningful
            support. Your investment creates a proof point that local leaders and future partners
            can build on.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {WHY_SPONSOR_REASONS.map((reason) => (
            <PremiumCard variant="charius" key={reason.title} className="p-8" withHover>
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-6">
                <reason.icon size={24} />
              </div>
              <h3 className="text-xl font-bold text-brand-primary mb-3">{reason.title}</h3>
              <p className="text-gray-500 leading-relaxed">{reason.body}</p>
            </PremiumCard>
          ))}
        </div>
      </SectionWrapper>

      {/* 3. What You Fund (Implementation) */}
      <SectionWrapper theme="charius-beige">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-[#111] mb-6">
            What happens over 2 years
          </h2>
          <p className="text-xl text-gray-500">
            Structured support with follow-through: train → coach → assess → improve → verify,
            repeated consistently until strong reading instruction becomes routine.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {IMPLEMENTATION_PHASES.map((phase, index) => (
            <PremiumCard variant="charius" key={phase.title} className="p-8" withHover>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center text-lg font-bold">
                  {index + 1}
                </div>
                <phase.icon size={20} className="text-brand-primary" />
              </div>
              <h3 className="text-lg font-bold text-brand-primary mb-3">{phase.title}</h3>
              <p className="text-gray-500 leading-relaxed">{phase.body}</p>
            </PremiumCard>
          ))}
        </div>
      </SectionWrapper>

      {/* 4. Expected Outcomes */}
      <SectionWrapper theme="charius-beige">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="absolute inset-0 bg-brand-primary/5 rounded-[2.5rem] transform rotate-3 scale-105" />
            <div className="relative rounded-[2rem] overflow-hidden aspect-[4/5] shadow-2xl">
              <Image
                src="/photos/Reading%20Session%20in%20Dokolo%20Greater%20Bata%20Cluster.jpeg"
                alt="Learners showing reading progress during a sub-region assessment"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 500px"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-4xl font-bold text-[#111] mb-6 tracking-tight">
              Expected outcomes
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              After two years of structured support, your sub-region will have measurable
              literacy improvements — tracked through NLIP and reported with full credibility
              markers so you can trust every data point.
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
        </div>
      </SectionWrapper>

      {/* 5. Evidence & Reporting */}
      <SectionWrapper theme="charius-beige">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-6">
              <BarChart3 size={32} />
            </div>
            <h2 className="text-4xl font-bold text-[#111] mb-4">
              Evidence you receive
            </h2>
            <p className="text-lg text-gray-500">
              Sub-Region Evidence Pack — Dashboard access + PDF reports with credibility markers.
            </p>
          </div>
          <PremiumCard variant="charius" className="p-8 md:p-12">
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
      <SectionWrapper theme="charius-beige">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-[#111] mb-6">
            Simple, transparent costing
          </h2>
          <PremiumCard variant="charius" className="p-8 md:p-12 text-center">
            <p className="text-6xl font-extrabold text-brand-primary mb-2">$1,100</p>
            <p className="text-xl text-gray-500 mb-6">per school · full 2-year support cycle</p>
            <p className="text-gray-500 leading-relaxed max-w-xl mx-auto mb-8">
              When you select a sub-region, NLIP automatically calculates the total based on the
              number of schools. No manual calculations required. The cost covers training,
              coaching, assessments, materials, leadership support, and NLIP reporting.
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
      <SectionWrapper theme="charius-beige">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#111] mb-4">
            Other sponsorship levels
          </h2>
          <p className="text-gray-500">
            Choose the geographic level that matches your impact goals.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { label: "School", href: "/sponsor-a-school", desc: "One school, full support" },
            { label: "District", href: "/sponsor-a-district", desc: "District-wide coverage" },
            { label: "Region", href: "/sponsor-a-region", desc: "Region-wide impact" },
          ].map((tier) => (
            <Link key={tier.label} href={tier.href}>
              <PremiumCard variant="charius" className="p-6 text-center h-full cursor-pointer" withHover>
                <h3 className="text-lg font-bold text-brand-primary mb-2">{tier.label}</h3>
                <p className="text-sm text-gray-500">{tier.desc}</p>
              </PremiumCard>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* 8. Bottom CTA */}
      <CTAStrip
        heading="Ready to sponsor a sub-region?"
        subheading="Your investment creates a focused proof point for literacy improvement — deep enough to transform, visible enough to inspire."
        primaryButtonText="Fund a Sub-Region"
        primaryButtonHref="#sponsorship-checkout"
        primaryButtonColor="bg-[#ff7235]"
        primaryButtonHoverColor="hover:bg-[#ff7235]/90"
        secondaryButtonText="All Partnership Options"
        secondaryButtonHref="/partner"
        theme="charius"
      />
      <section className="section bg-gray-50 pt-16 pb-24" id="sponsorship-checkout">
        <div className="container" style={{ maxWidth: '800px' }}>
           <h2 className="text-center text-4xl mb-8 font-bold text-[#111]">Secure Gateway</h2>
           <SponsorshipWizard level="sub-region" />
        </div>
      </section>
    </>
  );
}
