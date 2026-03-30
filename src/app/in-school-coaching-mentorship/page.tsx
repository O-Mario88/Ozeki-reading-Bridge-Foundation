import Image from "next/image";
import coachingPhoto from "../../../public/photos/PXL_20260217_110739688.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2 } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "In-School Coaching & Mentorship",
  description:
    "Classroom implementation engine that converts training into consistent routines and measurable learner reading improvement.",
};

export default function InSchoolCoachingMentorshipPage() {
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
                In-School Coaching &amp; Mentorship
              </h1>
              <p className="text-xl text-gray-500 leading-relaxed mb-8">
                Classroom implementation engine for daily routines and sustained reading gains.
              </p>
              
              <div className="prose prose-lg text-gray-500">
                <p className="mb-4">
                  In-School Coaching &amp; Mentorship is our classroom implementation
                  engine, designed to make sure training translates into daily
                  instruction, consistent routines, and sustained learner improvement.
                </p>
                <p className="mb-6">
                  In many education programs, training ends at the workshop; in the
                  platform, training is only the beginning. Coaching is where teachers
                  shift from knowing phonics to delivering phonics accurately,
                  confidently, and consistently, so learners experience real change in
                  reading ability.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> measurable instructional change
                    that links classroom practice to learner outcomes.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={coachingPhoto}
                  alt="In-school reading lesson coaching session"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Coaching Deep Dive */}
      <SectionWrapper theme="charius-beige" id="approach">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Classroom Observation Focus</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              Ozeki coaches work directly inside classrooms and observe real
              reading lessons using a standard lesson evaluation tool. The tool
              focuses on practices that matter most:
            </p>
            <ul className="mt-2 space-y-3 mb-4">
              {[
                "Quick revision of previously taught sounds",
                "Clear modeling of new sounds and letter formation",
                "Explicit blending and segmenting routines",
                "Structured decoding practice",
                "High time-on-task",
                "Effective error correction"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col md:col-span-1 lg:col-span-1" withHover>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Coaching, Not Inspection</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              Observation is never inspection. It is a coaching moment.
              Coaches provide immediate and specific feedback that identifies:
            </p>
            <ul className="mt-2 space-y-3 mb-6">
              {[
                "What the teacher did well",
                "What is limiting learner success",
                "What to improve in the next lesson"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-500 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              Where needed, coaches demonstrate routines through model lessons,
              co-teaching, and guided rehearsal so teachers can see exactly how to
              run routines.
            </p>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col md:col-span-1 lg:col-span-1 bg-brand-primary text-white border-none" withHover>
            <h3 className="text-2xl font-bold mb-4">Structured Coaching Cycle</h3>
            <p className="text-white/90 leading-relaxed mb-6">Mentorship is delivered through repeatable coaching cycles:</p>
            <div className="p-4 bg-white/10 rounded-xl border border-white/20 mb-6">
              <strong className="text-white block">observe → coach → model/practise → agree next actions → follow-up</strong>
            </div>
            <p className="text-white/90 leading-relaxed mt-auto">This makes improvement predictable and measurable across visits.</p>
          </PremiumCard>
          
        </div>
      </SectionWrapper>

      {/* 3. Outcomes & Evidence */}
      <SectionWrapper theme="charius-beige" id="outcomes">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Daily Routines Repaired</h3>
            <ul className="mt-2 space-y-3 mb-4 border-b border-gray-100 pb-4">
              {[
                "Accurate sound teaching",
                "Fast-paced choral response",
                "Blending practice that prevents guessing",
                "Segmenting practice that strengthens spelling",
                "Fluency routines that build automaticity",
                "Quick checks to identify catch-up needs"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-500 leading-relaxed font-medium">
              Because classroom realities vary, coaching includes strategies for large classes and mixed-ability groups.
            </p>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Evidence and Accountability</h3>
            <p className="text-gray-500 leading-relaxed mb-4">Each coaching visit generates structured data:</p>
            <ul className="mt-2 space-y-3 mb-4 border-b border-gray-100 pb-4">
              {[
                "Teaching quality scores by domain",
                "Item-level strengths and gaps",
                "Prioritized action plan"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-500 leading-relaxed font-medium">
              Teacher improvement is tracked from first visit through follow-up visits, enabling targeted support instead of generic support.
            </p>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Linked to Learner Outcomes</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              Coaching results connect directly to learner assessment data:
            </p>
            <ul className="mt-2 space-y-3 mb-4 border-b border-gray-100 pb-4">
              {[
                "Fewer non-readers",
                "More learners at minimum fluency benchmarks",
                "Stronger decoding accuracy",
                "Improved comprehension"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
           <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
              <h3 className="text-xl font-bold text-brand-primary mb-4">School System Strengthening</h3>
              <p className="text-gray-500 leading-relaxed mb-4">
                Where leadership support is included, Headteachers and Directors of Studies are guided to supervise instruction, protect reading time, and use data dashboards.
              </p>
           </PremiumCard>
           <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
              <h3 className="text-xl font-bold text-brand-primary mb-4">Pathway to Graduation</h3>
              <p className="text-gray-500 leading-relaxed mb-4">
                Over time, schools move from intensive coaching to lighter follow-up and, when performance thresholds are met, toward graduation readiness.
              </p>
           </PremiumCard>
        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Partner for Coaching Scale"
        subheading="Support coaching cycles that are tracked, verified, and directly linked to learner reading gains."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        secondaryButtonText="Explore Impact Evidence"
        secondaryButtonHref="/impact"
        theme="charius"
      />
    </>
  );
}
