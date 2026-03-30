import Image from "next/image";
import trainingPhoto from "../../../public/photos/PXL_20260217_124455266.MP.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2 } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "Teacher Professional Development (Structured Phonics)",
  description:
    "Hands-on structured phonics training pathway that links teacher practice to measurable reading outcomes through NLIP.",
};

export default function TeacherProfessionalDevelopmentPage() {
  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/10 via-brand-background to-brand-background pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-bold text-sm mb-6 shadow-sm border border-[#FA7D15]/20">
                Program Spotlight
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-brand-primary tracking-tight leading-tight mb-6">
                Teacher Professional Development
              </h1>
              <p className="text-xl text-gray-500 leading-relaxed mb-8">
                Practical, demonstration-led structured phonics training built for real Ugandan
                classrooms.
              </p>
              
              <div className="prose prose-lg text-gray-500">
                <p className="mb-4">
                  Teacher Professional Development (Structured Phonics) is our
                  hands-on training pathway that equips teachers to teach reading the
                  right way, step by step, in a sequence that aligns with how children
                  learn to read and how Ugandan classrooms actually operate.
                </p>
                <p className="mb-6">
                  It is practical, demonstration-led, and designed for real
                  constraints: large class sizes, limited materials, mixed learner
                  ability, and teachers who need routines that work the very next day.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> teacher confidence improves,
                    lesson delivery strengthens, and learner reading levels move with evidence.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={trainingPhoto}
                  alt="Teachers in a practical structured phonics training session"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Core Method */}
      <SectionWrapper theme="charius-beige" id="methodology">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Instructional Model</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              Each training series begins by aligning teachers to a clear instructional model:
            </p>
            <ol className="mt-2 space-y-3 mb-4 list-decimal list-inside text-gray-700 font-medium text-lg ml-2">
              <li>Review</li>
              <li>Teach</li>
              <li>Guided practice</li>
              <li>Independent practice</li>
              <li>Quick check</li>
            </ol>
            <p className="text-gray-500 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              This structure gives teachers repeatable routines they can apply
              immediately.
            </p>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Core Reading Engine</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              Teachers learn how to teach pure letter sounds, strengthen sound-symbol mapping, and run oral response routines.
            </p>
            <ul className="mt-2 space-y-3 mb-4">
              {[
                "Explicit blending: sound → blend → read",
                "Explicit segmenting: say word → segment → spell",
                "Decoding and spelling progression",
                "Tricky-word instruction"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Fluency + Comprehension</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              The program builds habits that accelerate reading growth: accuracy,
              pace, repeated reading, and partner reading.
            </p>
            <p className="text-gray-500 leading-relaxed mb-4">
              Teachers are supported to select texts that match taught skills,
              such as decodable and leveled passages.
            </p>
            <div className="mt-auto pt-4 border-t border-gray-100">
              <p className="text-gray-500 leading-relaxed font-medium">
                Practice is meaningful and success is visible in learner performance.
              </p>
            </div>
          </PremiumCard>
          
        </div>
      </SectionWrapper>

      {/* 3. Implementation Details */}
      <SectionWrapper theme="charius-beige" id="implementation">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Ready-to-Use Materials</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              Teachers receive practical tools that reduce preparation burden and improve consistency:
            </p>
            <ul className="mt-2 space-y-3 mb-4">
              {[
                "Lesson templates",
                "Word lists and Sound cards",
                "Blending boards",
                "Practice activities aligned to the sequence"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Implementation & Accountability</h3>
            <p className="text-gray-500 leading-relaxed mb-4">Every session closes with a simple plan:</p>
            <ul className="mt-2 space-y-3 mb-4 border-b border-gray-100 pb-4">
              {[
                "What the teacher will do daily",
                "What routines will be introduced this week",
                "What will be checked in the next visit"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-500 text-sm">A follow-up date is scheduled immediately.</p>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col md:col-span-2 bg-brand-primary text-white border-none" withHover>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-4">NLIP Measurement and Evidence</h3>
                <p className="text-white/90 leading-relaxed mb-4">
                  NLIP makes teacher training measurable and partner-ready. Attendance
                  is captured by school, role, gender, class, and subject taught.
                </p>
                <div className="p-4 bg-white/10 rounded-xl border border-white/20 mb-4">
                  <strong className="text-white block">training delivered → teaching quality improves → learner outcomes move</strong>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2">Lesson Evaluations</h4>
                <p className="text-white/80 leading-relaxed mb-6">
                  Lesson evaluations verify routine quality (sound modeling, blending, decoding practice), 
                  and learner assessments verify movement from non-reader to fluent.
                </p>
                <h4 className="font-bold text-lg mb-2">The Promise</h4>
                <p className="text-white/80 leading-relaxed">
                  Teacher Professional Development is not an isolated event. It is a structured pathway tracking 
                  instructional improvement over time.
                </p>
              </div>
            </div>
          </PremiumCard>

        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Partner to Scale Teacher Quality"
        subheading="Fund structured teacher professional development with built-in follow-up, coaching linkage, and verified literacy outcomes."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        secondaryButtonText="Explore Evidence"
        secondaryButtonHref="/impact"
        theme="charius"
      />
    </>
  );
}
