import Image from "next/image";
import storyProjectPhoto from "../../../public/photos/PXL_20260218_135704961.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2 } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "The 1001 Story Project",
  description:
    "Structured learner authorship program that strengthens writing, reinforces reading, and links participation outputs to measurable literacy outcomes.",
};

export default function StoryProjectPage() {
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
                The 1001 Story Project
              </h1>
              <p className="text-xl text-gray-500 leading-relaxed mb-8">
                Structured learner authorship that reinforces reading through meaningful writing.
              </p>
              
              <div className="prose prose-lg text-gray-500">
                <p className="mb-4">
                  The 1001 Story Project is our structured learner authorship
                  program, designed to strengthen writing while reinforcing reading
                  through purposeful, motivating practice.
                </p>
                <p className="mb-6">
                  It transforms learners from passive readers into creators of
                  meaningful text and helps schools build a culture where reading and
                  writing are normal, celebrated, and connected to measurable learning
                  outcomes.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> stronger writing quality, better
                    reading fluency and comprehension, and school-level reading culture
                    growth with evidence.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={storyProjectPhoto}
                  alt="Learners and teachers in guided story writing and read-aloud practice"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Structured Routine */}
      <SectionWrapper theme="charius-beige" id="routine">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-[#FA7D15]/10 rounded-xl flex items-center justify-center mb-6 text-[#FA7D15] font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Classroom Routine</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              At the heart of the project is a simple but powerful routine:
              learners write short stories using clear prompts and guided
              structures, then improve them through repeated cycles of drafting,
              reading aloud, revising, and editing.
            </p>
            <p className="text-gray-500 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              This moves the project beyond creative writing activities into a
              consistent literacy-development process.
            </p>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-[#FA7D15]/10 rounded-xl flex items-center justify-center mb-6 text-[#FA7D15] font-bold text-xl">2</div>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Teacher Training</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Teachers are trained to deliver story writing as structured literacy instruction, guiding learners in:
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Planning a story (characters, problem)",
                "Writing clear, connected sentences",
                "Improving spelling and punctuation",
                "Strengthening vocabulary"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-[#FA7D15]/10 rounded-xl flex items-center justify-center mb-6 text-[#FA7D15] font-bold text-xl">3</div>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Read-Aloud Cycles</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Read-aloud cycles are used strategically. Learners read their own
              work and peers' work as drafts improve, building fluency,
              confidence, and comprehension alongside writing quality.
            </p>
            <p className="text-gray-500 leading-relaxed mt-auto border-t border-gray-100 pt-4">
              Over time, sentence construction strengthens and learners gain pride
              in producing complete text.
            </p>
          </PremiumCard>
          
        </div>
      </SectionWrapper>

      {/* 3. Publication & Measurement */}
      <SectionWrapper theme="charius-beige" id="publication">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Publication and Visibility</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              The project is designed for publication. Learner stories are
              compiled into school anthologies that can be published as PDF for
              rapid release or printed when funding allows.
            </p>
            <ul className="mt-2 space-y-3 mb-6 border-b border-gray-100 pb-4">
              {[
                "Creates a strong motivation loop",
                "Provides locally relevant reading content",
                "School Story Showcases celebrate authors"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-500 leading-relaxed text-sm">
              This strengthens reading engagement and sustained classroom use.
            </p>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col bg-brand-primary text-white border-none" withHover>
            <h3 className="text-2xl font-bold mb-4">Measured Participation</h3>
            <p className="text-white/90 leading-relaxed mb-6">
              What makes this a true literacy intelligence program is measurement
              and integration. The platform tracks writing sessions, drafts, and anthologies.
            </p>
            <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
              <h4 className="font-bold text-lg mb-2">Linked to Outcomes</h4>
              <p className="text-white/80 leading-relaxed text-sm">
                Story activity is connected to broader literacy outcomes like reading-level movement 
                and fluency trends, verifying whether writing routines are strengthening reading.
              </p>
            </div>
          </PremiumCard>

        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Join or Sponsor the Project"
        subheading="Support story sessions, anthology publishing, and learner-centered literacy growth linked to measurable outcomes."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        secondaryButtonText="Explore Published Stories"
        secondaryButtonHref="/stories"
        theme="charius"
      />
    </>
  );
}
