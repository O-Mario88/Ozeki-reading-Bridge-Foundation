import Image from "next/image";
import remedialPhoto from "../../../public/photos/PXL_20260217_124358059.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2 } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "Remedial & Catch-Up Reading Interventions",
  description:
    "Targeted recovery pathway for non-readers and below-benchmark learners using evidence-led grouping, routines, and progress tracking.",
};

export default function RemedialCatchUpReadingInterventionsPage() {
  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/10 via-brand-background to-brand-background pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-brand-primary font-semibold text-sm mb-6 shadow-sm border border-brand-primary/10">
                Program Spotlight
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
                Remedial &amp; Catch-Up Interventions
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Targeted recovery pathway for learners still below foundational reading benchmarks.
              </p>
              
              <div className="prose prose-lg text-gray-600">
                <p className="mb-4">
                  Remedial &amp; Catch-Up Reading Interventions is our targeted
                  recovery pathway for schools where a significant share of learners
                  are still non-readers or remain below the minimum fluency benchmark.
                </p>
                <p className="mb-6">
                  It is designed to prevent children from being left behind as the
                  curriculum advances by rebuilding foundational reading skills quickly
                  and systematically, using evidence to guide exactly what is taught.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> rapid foundational recovery and a
                    realistic pathway from non-reader status to fluent reading.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={remedialPhoto}
                  alt="Small-group catch-up reading intervention session"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Intervention Elements */}
      <SectionWrapper theme="light" id="approach">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Diagnosis Before Delivery</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Real learner data identifies missing skills. Assessment results automatically
              identify learners who are non-readers or struggling in specific domains.
            </p>
            <p className="text-gray-600 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              This replaces generic remediation with targeted catch-up.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">2</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Skill-Based Grouping</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              The platform connects the diagnosis to specific learning needs:
            </p>
            <ul className="mt-2 space-y-3 mb-6">
              {[
                "Learners needing sound mastery",
                "Learners needing blending practice",
                "Learners needing decoding fluency"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-4">High-Frequency Delivery</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Catch-up runs through short, high-frequency small-group lessons,
              daily or several times per week, in a clear sequence.
            </p>
            <ul className="mt-2 space-y-3 mb-6">
              {[
                "Revise sounds, Blend and segment",
                "Decode short words, Read phrases",
                "Build accuracy, then meaning"
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

      {/* 3. Materials, Coaching & Tracking */}
      <SectionWrapper theme="off-white" id="support">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Aligned Materials</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Teachers receive intervention materials aligned to taught skills so
              practice is meaningful:
            </p>
            <ul className="mt-2 space-y-3 mb-4 border-b border-gray-100 pb-4">
              {[
                "Sound cards",
                "Blending boards",
                "Decodable word lists",
                "Short aligned reading passages"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed">
              This prevents mismatch between instruction and practice materials.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Coaching Support</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Ozeki coaches help schools establish grouping plans, intervention schedules, 
              and delivery quality. Coaches model strategies for grouped instruction and 
              reinforce simple progress monitoring.
            </p>
            <h3 className="text-xl font-bold text-gray-900 border-t border-gray-100 pt-6 mb-4">Transition Strategy</h3>
            <p className="text-gray-600 leading-relaxed">
              The goal is rapid recovery, not permanent remediation. As learners gain decoding ability,
              they transition into broader reading practice. Evidence dashboards guide when to exit or adapt.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col md:col-span-2 bg-brand-primary text-white border-none" withHover>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">Accountable by Design</h3>
                <p className="text-white/90 leading-relaxed mb-6">
                  Each cycle tracks learners, addressed skills, delivered routines, and progress markers. 
                  The platform emphasizes moving learners out of non-reader bands and into fluent reading.
                </p>
              </div>
              <div className="p-6 bg-white/10 rounded-2xl border border-white/20">
                <h4 className="font-bold text-lg mb-2">Equity Result</h4>
                <p className="text-white/80 leading-relaxed text-sm">
                  Remedial and catch-up interventions become a strategic,
                  evidence-led equity engine. Every child gets a realistic path to
                  fluent reading and stronger success across the curriculum.
                </p>
              </div>
            </div>
          </PremiumCard>

        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Support Catch-Up Expansion"
        subheading="Partner to scale structured catch-up cycles with verified learner movement, accountable delivery, and targeted coaching support."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        secondaryButtonText="Explore Evidence"
        secondaryButtonHref="/impact"
        theme="brand"
      />
    </>
  );
}
