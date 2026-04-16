import Image from "next/image";
import teachingAidsPhoto from "../../../public/photos/Phonics Session for Teachers in Namasale Sub-County Amolatar.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2 } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "Teaching Aids & Instructional Resources (Teachers)",
  description:
    "Practical, high-impact teacher tools aligned to structured phonics routines, classroom implementation, and measurable learner progress.",
};

export default function TeachingAidsInstructionalResourcesTeachersPage() {
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
                Teaching Aids &amp; Instructional Resources
              </h1>
              <p className="text-xl text-gray-500 leading-relaxed mb-8">
                Practical tools that make structured phonics easier to deliver every day.
              </p>
              
              <div className="prose prose-lg text-gray-500">
                <p className="mb-4">
                  Teaching Aids &amp; Instructional Resources (Teachers) equips
                  classrooms with practical, high-impact tools that make structured
                  phonics easy to deliver consistently, especially in real-world
                  conditions where teachers manage large classes, limited preparation
                  time, and uneven access to materials.
                </p>
                <p className="mb-6">
                  Strong literacy instruction depends on routines being repeated
                  accurately every day. This program ensures teachers have the supports
                  needed to teach clearly, maintain pace, and give learners enough
                  practice to become fluent readers.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> a stronger instructional
                    environment where teachers spend less time improvising and more time
                    teaching reading effectively.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={teachingAidsPhoto}
                  alt="Teachers using structured literacy teaching aids in class"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Resources Package */}
      <SectionWrapper theme="charius-beige" id="resources-package">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-[#FA7D15]/10 rounded-xl flex items-center justify-center mb-6 text-[#FA7D15] font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Structured Teaching Aids</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Ozeki provides a package of tools aligned to the same phonics sequence and lesson routines used in training and coaching:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Sound charts for daily revision",
                "Flashcards for rapid practice",
                "Blending boards and phoneme frames",
                "Graded word lists",
                "Ready-to-use lesson templates"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-[#FA7D15]/10 rounded-xl flex items-center justify-center mb-6 text-[#FA7D15] font-bold text-xl">2</div>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Accurate Delivery Guides</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Teacher guides provide step-by-step delivery notes, sample scripts,
              common error patterns, and correction routines so lessons remain
              accurate even when teachers are still building confidence.
            </p>
            <p className="text-gray-500 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              Resources are designed to be reproducible so schools
              can sustain supply over time.
            </p>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-[#FA7D15]/10 rounded-xl flex items-center justify-center mb-6 text-[#FA7D15] font-bold text-xl">3</div>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Built for Constraints</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Resources are built for typical school realities: large class sizes,
              mixed learner ability, limited prep time, and uneven access to
              materials.
            </p>
            <p className="text-gray-500 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              The goal is to make high-quality routines workable every
              day, not only under ideal conditions.
            </p>
          </PremiumCard>
          
        </div>
      </SectionWrapper>

      {/* 3. Measurement & Feedback Loop */}
      <SectionWrapper theme="charius-beige" id="measurement">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Tracking & Accountability</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              Beyond availability, the platform makes resources measurable. 
              Materials are recorded at the school level:
            </p>
            <ul className="mt-2 space-y-3 mb-6 border-b border-gray-100 pb-4">
              {[
                "What was delivered and when",
                "Which grades received tools",
                "Visible readiness before coaching starts"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-500 leading-relaxed text-sm">
              Usage is also verified directly during lesson evaluations.
            </p>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Partner Transparency</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              For partners, this strengthens transparency. Rather than materials treated 
              as a one-time activity, we link resources to execution quality and outcomes.
            </p>
            <p className="text-gray-500 leading-relaxed border-t border-gray-100 pt-6">
              If teaching quality improves but decoding remains weak, the platform highlights 
              whether key tools are lacking or inconsistently applied.
            </p>
          </PremiumCard>

        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Support Classroom Resource Scale-Up"
        subheading="Partner to provide practical teacher tools with tracked usage and verified links to instructional quality and reading progress."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        theme="charius"
      />
    </>
  );
}
