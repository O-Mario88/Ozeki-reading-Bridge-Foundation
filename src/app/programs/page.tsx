import Link from "next/link";
import { getImpactSummary } from "@/services/dataService";
import { PROGRAM_DIRECTORY_DETAILS } from "@/lib/home-static-data";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { BarChart3, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Programs & Services",
  description:
    "Professional overview of all Ozeki Reading Bridge Foundation programs with direct links to each detailed service page.",
};

export const dynamic = "force-dynamic";

const headlineMetricLabels = [
  "Schools trained",
  "Teachers trained",
  "Learners assessed",
  "Stories published",
  "Training sessions completed",
];

export default async function ProgramsPage() {
  const summary = await getImpactSummary();
  const headlineMetrics = headlineMetricLabels
    .map((label) => summary.metrics.find((metric) => metric.label === label))
    .filter((metric): metric is { label: string; value: number } => Boolean(metric));

  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/10 via-brand-background to-brand-background pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-brand-primary font-semibold text-sm mb-6 shadow-sm border border-brand-primary/10">
            What We Do
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
            Programs & Services
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl leading-relaxed">
            Our full implementation support stack for nursery and primary literacy improvement. Evidence-backed and scalable.
          </p>
        </div>
      </section>

      {/* 2. Real-time Impact Metrics */}
      <SectionWrapper theme="off-white">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
            <BarChart3 size={32} />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Real-Time Impact</h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Live headline metrics from the backend data system demonstrating our current reach.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {headlineMetrics.map((metric) => (
            <PremiumCard className="p-6 text-center flex flex-col items-center justify-center" key={metric.label}>
              <strong className="text-4xl font-extrabold text-brand-primary mb-2 tracking-tight">
                {metric.value.toLocaleString()}
              </strong>
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {metric.label}
              </span>
            </PremiumCard>
          ))}
        </div>
      </SectionWrapper>

      {/* 3. Program Directory */}
      <SectionWrapper theme="light" id="directory">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Program Directory</h2>
          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            The detailed program narratives below outline the full NLIP implementation
            pathways, serving as the single source of truth for our literacy interventions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {PROGRAM_DIRECTORY_DETAILS.map((program) => (
            <PremiumCard className="p-8 md:p-10 flex flex-col" key={program.href} withHover>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{program.title}</h3>
              <p className="text-gray-600 leading-relaxed mb-6 flex-grow">{program.description}</p>
              
              <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-bold text-gray-900 block mb-1">Evidence generated:</span> 
                <span className="text-brand-primary font-medium text-sm">{program.evidence}</span>
              </div>
              
              <div className="mt-auto">
                <Link 
                  href={program.href}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors w-full sm:w-auto"
                >
                  Explore Program <ArrowRight size={18} />
                </Link>
              </div>
            </PremiumCard>
          ))}
        </div>
      </SectionWrapper>

      {/* 4. Bottom CTA */}
      <CTAStrip 
        heading="Need a customized school or district package?"
        subheading="We can combine training, coaching, learner assessment, and reporting into a phased implementation plan."
        primaryButtonText="Book a diagnostic visit"
        primaryButtonHref="/book-visit"
        secondaryButtonText="Discuss partnership"
        secondaryButtonHref="/partner"
        theme="brand"
      />
    </>
  );
}
