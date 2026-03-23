import Image from "next/image";
import contentAdvocacyPhoto from "../../../public/photos/PXL_20260217_124415441.MP.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2 } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "Literacy Content Creation & Advocacy",
  description:
    "Continuous practical literacy guidance that reinforces training, coaching, and assessment standards across schools and districts.",
};

export default function LiteracyContentCreationAdvocacyPage() {
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
                Literacy Content &amp; Advocacy
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Continuous practical guidance for teachers and school leaders beyond trainings.
              </p>
              
              <div className="prose prose-lg text-gray-600">
                <p className="mb-4">
                  Literacy Content Creation &amp; Advocacy extends Ozeki Reading Bridge
                  Foundation beyond trainings and school visits by providing
                  continuous, practical guidance that teachers and school leaders can
                  use every week.
                </p>
                <p className="mb-6">
                  In many schools, improvement slows when support is not immediately
                  available. This program keeps best practice accessible, simple to
                  apply, and aligned to the same standards used in training, coaching,
                  and assessment.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> stronger consistency across
                    districts through shared access to proven routines, tools, and
                    implementation examples.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={contentAdvocacyPhoto}
                  alt="Teachers and facilitators engaging with literacy content and advocacy resources"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Content Elements */}
      <SectionWrapper theme="light" id="resources">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Implementation-Focused</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Ozeki produces resources designed for real classrooms and quick use:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Short teacher guides and lesson tips",
                "Phonics routine scripts and remediation plans",
                "Fluency and comprehension mini-lessons",
                "Assessment quick guides",
                "Leadership supervision checklists"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Built for Immediate Use</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Content is structured to be usable in minutes: clear steps, examples,
              and common mistakes with corrections.
            </p>
            <p className="text-gray-600 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              This allows teachers to improve practice without long workshops and
              supports leaders to supervise instruction effortlessly.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">3</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Leadership Guidance</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              For Headteachers and Directors of Studies, content emphasizes practical implementation:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Protecting daily reading time",
                "Supervising classroom routines",
                "Using learner data to prioritize coaching"
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

      {/* 3. Platform & Advocacy */}
      <SectionWrapper theme="off-white" id="platform">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Support System</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Within the platform, resources are organized by grade, phonics set,
              topic, and program. This turns content into a practical support
              system rather than a static repository.
            </p>
            <h3 className="text-xl font-bold text-gray-900 border-t border-gray-100 pt-6 mb-4">Targeted Recommendations</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Resources are surfaced strategically by school need:
            </p>
            <ul className="mt-2 space-y-3 mb-4">
              {[
                "Decoding gaps: blending resources",
                "Weak fluency: passage packs",
                "Catch-up flags: intervention guides"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col md:col-span-1 bg-brand-primary text-white border-none" withHover>
            <div className="flex flex-col h-full">
              <h3 className="text-2xl font-bold mb-4">National Advocacy</h3>
              <p className="text-white/90 leading-relaxed mb-6">
                As an advocacy channel, the program builds national momentum for
                evidence-based reading instruction by sharing practical guidance and
                highlighting what works based on platform evidence.
              </p>
              
              <div className="mt-auto space-y-4">
                <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
                  <h4 className="font-bold text-lg mb-2">Usage Signals</h4>
                  <p className="text-white/80 leading-relaxed text-sm">
                    Engagement tracking shows exactly what schools access, allowing us
                    to see where support demand is highest.
                  </p>
                </div>
                <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
                  <h4 className="font-bold text-lg mb-2">Program Result</h4>
                  <p className="text-white/80 leading-relaxed text-sm">
                    A national knowledge-sharing system that reinforces
                    classroom implementation and accelerates literacy gains.
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
        heading="Scale Practical Literacy Guidance"
        subheading="Partner with us to expand high-quality literacy content that is used, tracked, and linked to implementation and outcome improvement."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        secondaryButtonText="Read the Blog"
        secondaryButtonHref="/blog"
        theme="brand"
      />
    </>
  );
}
