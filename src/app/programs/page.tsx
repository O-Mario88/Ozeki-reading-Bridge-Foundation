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
  // Graceful degradation: if DB is unreachable at build, show shell without
  // KPI values rather than crashing the whole build.
  const now = new Date().toISOString();
  let summary: Awaited<ReturnType<typeof getImpactSummary>> = {
    metrics: [],
    engagement: {
      bookingRequests: 0,
      partnerInquiries: 0,
      toolkitLeads: 0,
      newsletterSubscribers: 0,
    },
    generatedAt: now,
    lastUpdated: now,
  };
  try {
    summary = await getImpactSummary();
  } catch (err) {
    console.error("[programs] impact summary unavailable at build/request time", err);
  }
  const headlineMetrics = headlineMetricLabels
    .map((label) => summary.metrics.find((metric) => metric.label === label))
    .filter((metric): metric is { label: string; value: number } => Boolean(metric));

  const programsSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: PROGRAM_DIRECTORY_DETAILS.map((program, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "EducationalOccupationalProgram",
        name: program.title,
        description: program.description,
        url: `https://www.ozekiread.org${program.href}`,
        provider: {
          "@type": "Organization",
          name: "Ozeki Reading Bridge Foundation",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(programsSchema) }}
      />
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-brand-background pt-32 pb-20 md:pt-40 md:pb-28 border-b border-gray-100">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ff7235]/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#006b61]/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/3 pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff7235]/10 text-[#ff7235] font-bold text-sm mb-8 shadow-sm border border-[#ff7235]/20">
            <span className="w-2 h-2 rounded-full bg-[#ff7235] animate-pulse" />
            What We Do
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-brand-primary tracking-tight leading-[1.1] mb-6">
            Programs &amp; Services
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed mb-10">
            Our full implementation support stack for nursery and primary literacy improvement. Evidence-backed and scalable.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="#directory"
              className="btn-orange inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold tracking-wide"
            >
              Browse Programs <ArrowRight size={18} />
            </Link>
            <Link
              href="/partner-with-us"
              className="btn-green inline-flex items-center justify-center px-8 py-4 rounded-full font-bold tracking-wide"
            >
              Partner With Us
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Real-time Impact Metrics */}
      <SectionWrapper theme="charius-beige">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="w-16 h-16 bg-[#ff7235]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#ff7235]">
            <BarChart3 size={32} />
          </div>
          <h2 className="text-4xl font-bold text-[#111] mb-6">Real-Time Impact</h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            Live headline metrics from the backend data system demonstrating our current reach.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {headlineMetrics.map((metric) => (
            <PremiumCard variant="charius" className="p-6 text-center flex flex-col items-center justify-center" key={metric.label}>
              <strong className="text-4xl font-extrabold text-[#111] mb-2 tracking-tight">
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
      <SectionWrapper theme="charius-beige" id="directory">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-[#111] mb-6">Program Directory</h2>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
            The detailed program narratives below outline the full NLIP implementation
            pathways, serving as the single source of truth for our literacy interventions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {PROGRAM_DIRECTORY_DETAILS.map((program) => (
            <PremiumCard variant="charius" className="p-8 md:p-10 flex flex-col" key={program.href} withHover>
              <h3 className="text-2xl font-bold text-[#111] mb-4">{program.title}</h3>
              <p className="text-gray-500 leading-relaxed mb-6 flex-grow">{program.description}</p>
              
              <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-bold text-gray-900 block mb-1">Evidence generated:</span> 
                <span className="text-[#ff7235] font-medium text-sm">{program.evidence}</span>
              </div>
              
              <div className="mt-auto">
                <Link
                  href={program.href}
                  className="btn-orange inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold w-full sm:w-auto"
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
        theme="charius"
      />
    </>
  );
}
