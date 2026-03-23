import Image from "next/image";
import Link from "next/link";
import mAndEPhoto from "../../../public/photos/PXL_20260218_133341852.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2 } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "Monitoring, Evaluation & Reporting",
  description:
    "End-to-end data systems that link operational delivery (training, coaching, resources) to verifiable instructional quality and learner reading outcomes.",
};

export default function MonitoringEvaluationReportingPage() {
  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/10 via-brand-background to-brand-background pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-brand-primary font-semibold text-sm mb-6 shadow-sm border border-brand-primary/10">
                Data &amp; Evidence
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
                Monitoring, Evaluation &amp; Reporting
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Turning fragmented activities into a unified view of literacy progress.
              </p>
              
              <div className="prose prose-lg text-gray-600">
                <p className="mb-4">
                  Too often in education programming, training is tracked in one
                  place, coaching in another, and reading outcomes in a report 
                  months after the fact.
                </p>
                <p className="mb-6">
                  Our Monitoring, Evaluation &amp; Reporting system integrates these
                  into a single continuous narrative: linking operational delivery
                  to instructional quality, and ultimately to learner reading progress.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> actionable, transparent
                    evidence mapping exactly what interventions lead to measurable
                    reading improvement across partner school networks.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={mAndEPhoto}
                  alt="Coaches and stakeholders reviewing literacy data via mobile tools"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. The Literacy Data Pipeline */}
      <SectionWrapper theme="light" id="pipeline">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Operational Delivery</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              The foundation of evidence rests on what actually happens in schools. 
              The platform tracks:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Teacher participation in training",
                "Distribution of teaching aids",
                "Frequency of school coaching visits",
                "Intervention sessions delivered"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">2</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Instructional Quality</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Delivery alone does not equal impact. Data must verify if training
              changes teaching behavior. Using standardized rubrics, coaches evaluate routines like:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Sound delivery accuracy",
                "Pacing of blending practice",
                "Error correction consistency",
                "Inclusive participation"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">3</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Learner Reading Progress</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              The ultimate measure is learner capability. Assessment tools (like
              EGRA and internal benchmarks) capture:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Letter-sound identification rates",
                "Non-word decoding fluency",
                "Oral reading fluency (WCPM)",
                "Reading comprehension"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>
          
        </div>
      </SectionWrapper>

      {/* 3. Visibility and Synthesis */}
      <SectionWrapper theme="off-white" id="visibility">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Public Dashboards & Transparency</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Ozeki builds public dashboards that share aggregated insights
              from network schools. This transforms isolated program data into
              sector-wide intelligence.
            </p>
            <ul className="mt-2 space-y-3 mb-6 border-b border-gray-100 pb-4">
              {[
                "Share progress with sponsors",
                "Highlight regional trends",
                "Showcase evidence-based reading interventions"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed text-sm">
              We believe data should advocate for effective literacy practices.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col bg-brand-primary text-white border-none" withHover>
            <h3 className="text-2xl font-bold mb-4">Partner Intelligence Portals</h3>
            <p className="text-white/90 leading-relaxed mb-6">
              For active partners and large-scale funders, we provide dedicated
              portals offering deeper access to specific cohort data.
            </p>
            <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
              <h4 className="font-bold text-lg mb-2">Granular Visibility</h4>
              <p className="text-white/80 leading-relaxed text-sm">
                Partners can see exactly which district interventions move reading 
                outcomes fastest, and track the ROI of coaching hours and material distribution.
              </p>
            </div>
          </PremiumCard>

        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Evidence-Based Partnership"
        subheading="Support interventions validated by clear operational data, verified instructional changes, and robust assessment outcomes."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        secondaryButtonText="View Impact Dashboard"
        secondaryButtonHref="/impact"
        theme="brand"
      />
    </>
  );
}
