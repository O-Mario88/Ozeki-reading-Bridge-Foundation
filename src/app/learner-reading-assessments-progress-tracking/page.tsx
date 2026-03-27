import Image from "next/image";
import assessmentPhoto from "../../../public/photos/PXL_20260218_133343618.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2 } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "Learner Assessments & Progress Tracking",
  description:
    "Measurement backbone for baseline-progress-endline literacy tracking, reading level bands, and targeted instructional decisions.",
};

export default function LearnerReadingAssessmentsProgressTrackingPage() {
  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/10 via-brand-background to-brand-background pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-semibold text-sm mb-6 shadow-sm border border-brand-primary/10">
                Program Spotlight
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-brand-primary tracking-tight leading-tight mb-6">
                Learner Assessments &amp; Progress Tracking
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Measurement backbone for reliable reading evidence and practical next actions.
              </p>
              
              <div className="prose prose-lg text-gray-600">
                <p className="mb-4">
                  Learner Assessments &amp; Progress Tracking is our measurement
                  backbone, designed to give schools, districts, and partners simple,
                  reliable evidence of whether children are actually learning to read
                  and what to do next.
                </p>
                <p className="mb-6">
                  In literacy improvement, good intentions are not enough. The system
                  must answer at any point: How many learners can decode? How many are
                  fluent? Who is stuck? What is improving? What requires urgent
                  catch-up? The platform turns these questions into consistent data
                  that informs instruction and proves progress over time.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> schools and partners make faster,
                    evidence-based literacy decisions with transparent progress tracking.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={assessmentPhoto}
                  alt="Learner reading assessment and classroom review session"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Core Components */}
      <SectionWrapper theme="light" id="details">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-2xl font-bold text-brand-primary mb-4">Assessment Outcomes Domains</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Ozeki supports schools to run baseline, progress, and endline cycles
              using outcome areas aligned with EGRA-style reporting and classroom
              practice.
            </p>
            <ul className="mt-2 space-y-3 mb-4">
              {[
                "Phonemic Awareness (i)",
                "Grapheme-Phoneme Correspondence (i)",
                "Blending & Decoding (i)",
                "Word Recognition & Fluency (i)",
                "Sentence & Paragraph Construction (i)",
                "Reading Comprehension (i)"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              Assessments are practical enough for real school conditions while
              structured enough to generate credible, comparable results.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-2xl font-bold text-brand-primary mb-4">Automatic Reading Levels</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Each learner&apos;s scores are entered once. The platform then
              automatically calculates reading level bands (for example,
              non-reader to fluent) using standardized CWPM and related
              thresholds.
            </p>
            <p className="text-gray-600 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              This removes guesswork, reduces manual errors, and ensures schools
              and districts are compared using the same definitions.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col md:col-span-2 lg:col-span-1" withHover>
            <h3 className="text-2xl font-bold text-brand-primary mb-4">School-Level Profiles</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Once entered, data becomes immediately actionable for teachers and
              school leaders:
            </p>
            <ul className="mt-2 space-y-3 mb-4">
              {[
                "Proportion of non-readers, emergent, minimum benchmark, and fluent readers",
                "Domain-by-domain strengths and gaps",
                "Comprehension proficiency by class and grade"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed mt-auto border-t border-gray-100 pt-4 font-medium">
              This is not data for reporting only. It directly informs what to
              reteach, who needs catch-up, and how to target lesson routines.
            </p>
          </PremiumCard>
          
        </div>
      </SectionWrapper>

      {/* 3. Tracking & Integration */}
      <SectionWrapper theme="off-white" id="tracking">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Progress Tracking by Term</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Over time, schools can see whether interventions are working:
            </p>
            <ul className="mt-2 space-y-3 mb-4 border-b border-gray-100 pb-4">
              {[
                "Are non-readers reducing?",
                "Are more learners reaching minimum benchmark?",
                "Is comprehension improving alongside fluency?"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed">
              The platform shows movement term by term, making school-level
              planning and accountability clearer.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">District Dashboards</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              At district and regional levels, school data aggregates into
              dashboards that support planning and resource targeting.
              Partners can view coverage alongside outcomes:
            </p>
            <ul className="mt-2 space-y-3 mb-4 border-b border-gray-100 pb-4">
              {[
                "Schools assessed and sample sizes",
                "Assessment completeness",
                "Reading level distributions and domain outcomes",
                "Movement from baseline to endline"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed font-medium">
              Data Quality Signals (sample size, completeness) strengthen credibility.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col md:col-span-2 bg-brand-primary text-white border-none" withHover>
            <h3 className="text-2xl font-bold mb-4">National Evidence System Result</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-white/90 leading-relaxed mb-4">
                  The platform advantage is integration. Assessment data is not
                  isolated; it is linked to teacher training attendance, coaching
                  visits, lesson evaluation scores, and follow-up plans.
                </p>
                <p className="text-white/90 leading-relaxed">
                  This turns assessment into a national evidence system that guides
                  decisions, triggers early warning flags, monitors improvement across
                  cycles, and provides transparent proof of progress.
                </p>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                <h4 className="font-bold text-lg mb-2">Recommendation Logic</h4>
                <p className="text-white/80 text-sm leading-relaxed">
                  If teaching quality improves but learner decoding does not, the
                  platform flags likely implementation gaps and recommends targeted
                  catch-up interventions. If a school shows strong reading movement,
                  recommendations shift to sustaining systems.
                </p>
              </div>
            </div>
          </PremiumCard>

        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Launch an Assessment Cycle"
        subheading="Start a baseline-progress-endline cycle and convert results into targeted teaching, catch-up plans, and partner-ready reporting."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        theme="brand"
      />
    </>
  );
}
