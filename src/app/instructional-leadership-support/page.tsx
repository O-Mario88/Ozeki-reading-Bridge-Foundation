import Image from "next/image";
import leadershipPhoto from "../../../public/photos/PXL_20260217_124357146.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2 } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "Instructional Leadership Support (Headteachers & Directors of Studies)",
  description:
    "Leadership support that protects reading time, strengthens supervision, and sustains quality instruction beyond one-off trainings.",
};

export default function InstructionalLeadershipSupportPage() {
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
                Instructional Leadership Support
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Leadership systems that protect reading time and sustain instructional quality.
              </p>
              
              <div className="prose prose-lg text-gray-600">
                <p className="mb-4">
                  Instructional Leadership Support strengthens school leadership to
                  protect reading time and sustain quality instruction beyond one-off
                  trainings. Even strong teacher training can fade without consistent
                  supervision and school-level routines.
                </p>
                <p className="mb-6">
                  This program ensures literacy improvement becomes part of how a
                  school is led, monitored, and improved, term by term.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> school leaders sustain literacy
                    gains through practical supervision, evidence-led decisions, and
                    daily implementation routines.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={leadershipPhoto}
                  alt="Headteachers and Directors of Studies in instructional leadership coaching"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Supervision Tools & Routines */}
      <SectionWrapper theme="light" id="supervision">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Practical Supervision Tools</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              We equip Headteachers and Directors of Studies with simple supervision
              tools that fit into their normal schedules:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Observation checklists for structured phonics lessons",
                "Templates for supportive, specific teacher feedback",
                "Coaching conversation guides for follow-up"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Targeted Observations</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              During reading lessons, leaders are guided to track core routines:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Sound revision and new sound modeling",
                "Explicit blending and segmenting",
                "Decoding practice and correction routines",
                "Fluency practice and quick checks",
                "Learner practice time and lesson pace"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Action-Oriented Coaching</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Leaders move beyond general comments to actionable guidance linked to
              learner outcomes:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Increase learner practice time",
                "Correct blending errors immediately",
                "Align words to taught sounds",
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

      {/* 3. Evidence & Systems */}
      <SectionWrapper theme="off-white" id="evidence">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Evidence-Led Decisions</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Leaders are trained to use learner assessment and reading-level data
              for practical school decisions:
            </p>
            <ul className="mt-2 space-y-3 mb-6">
              {[
                "Which classes need catch-up groups",
                "Which teachers need coaching versus refresher training",
                "How timetables should protect daily reading routines",
                "How to monitor whether changes are working"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Lightweight Accountability</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Leaders learn to run manageable school systems that sustain gains
              even when external coaches are not present:
            </p>
            <ul className="mt-2 space-y-3 mb-6">
              {[
                "Weekly reading routine checks",
                "Simple implementation trackers",
                "Follow-up plans with clear responsibilities"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col md:col-span-2 bg-brand-primary text-white border-none" withHover>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">Measured Leadership Actions</h3>
                <p className="text-white/90 leading-relaxed mb-6">
                  Leadership actions are recorded and tracked in the platform, including
                  supervision visits completed, lesson observations logged, and routine progress.
                </p>
                <div className="p-5 bg-white/10 rounded-2xl border border-white/20">
                  <h4 className="font-bold text-lg mb-2">Accountability Chain</h4>
                  <p className="text-white/80 leading-relaxed font-medium">
                    leadership supervision strengthens classroom practice → improved
                    practice drives better reading levels
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                 <div>
                   <h4 className="font-bold text-xl mb-2">Value for Schools</h4>
                   <p className="text-white/80 leading-relaxed">
                      Improvement becomes manageable. Leaders can see what is working,
                      where support is needed, and how to keep implementation strong.
                   </p>
                 </div>
                 <div>
                   <h4 className="font-bold text-xl mb-2">Value for Partners</h4>
                   <p className="text-white/80 leading-relaxed">
                      Credible evidence that literacy improvement is sustained through
                      school-owned systems and leadership commitment.
                   </p>
                 </div>
              </div>
            </div>
          </PremiumCard>

        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Support Leadership Strengthening"
        subheading="Partner to scale Headteacher and DOS instructional leadership systems that keep reading gains protected and sustained."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        secondaryButtonText="Explore Evidence"
        secondaryButtonHref="/impact"
        theme="brand"
      />
    </>
  );
}
