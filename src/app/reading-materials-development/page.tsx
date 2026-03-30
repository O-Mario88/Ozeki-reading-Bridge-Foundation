import Image from "next/image";
import readingMaterialsPhoto from "../../../public/photos/PXL_20260217_110748302.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2, Download } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "Reading Materials Development (Learners)",
  description:
    "Learner-friendly texts aligned to phonics progression and classroom lessons so reading practice builds real skill.",
};

export default function ReadingMaterialsDevelopmentPage() {
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
                Reading Materials Development
              </h1>
              <p className="text-xl text-gray-500 leading-relaxed mb-8">
                Learner-friendly texts aligned to phonics progression and classroom lessons,
                so practice actually builds reading skill.
              </p>
              
              <div className="prose prose-lg text-gray-500">
                <p className="mb-4">
                  Children become readers through practice, but practice only works when
                  the text matches what they have been taught.
                </p>
                <p className="mb-6">
                  Our Reading Materials Development program produces decodable readers,
                  leveled passages, and comprehension activities that align with classroom
                  phonics lessons. This gives teachers ready-to-use materials that increase
                  reading time, accuracy, and confidence.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> More meaningful practice leads to
                    stronger fluency and comprehension.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={readingMaterialsPhoto}
                  alt="Teachers and learners using structured reading materials in class"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. What We Provide */}
      <SectionWrapper theme="charius-beige" id="focus-areas">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-[#111] mb-6">What We Provide</h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            Materials that match the learner&apos;s exact level.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-[#FA7D15]/10 rounded-xl flex items-center justify-center mb-6 text-[#FA7D15] font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold text-[#111] mb-4">Decodable Readers</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Short books where most words follow phonics patterns learners have already learned.
              Learners stop guessing and start decoding, building real reading skill.
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Phonics-sequenced stories from CVC to complex patterns",
                "Repeated target sounds and patterns for mastery",
                "Short sentences and controlled vocabulary",
                "Teacher notes with pre-reading routine"
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
            <h3 className="text-2xl font-bold text-[#111] mb-4">Leveled Passages</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Short texts organized by difficulty to build smooth reading and stamina.
              After decoding, learners need structured fluency practice to read faster and smoother.
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Passages by level: beginner, developing, and fluent",
                "Fluency routines: repeated, echo, and timed practice",
                "Optional tracking lines for accuracy",
                "10-15 minute teacher guidance"
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
            <h3 className="text-2xl font-bold text-[#111] mb-4">Comprehension Activities</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Help learners understand, retell, and respond to text without overwhelming them.
              Comprehension grows when decoding and fluency are supported.
            </p>
            <ul className="mt-auto space-y-3 pt-4 border-t border-gray-100">
              {[
                "Literal questions: who, what, where",
                "Sequencing prompts: beginning, middle, end",
                "Vocabulary-in-context tasks",
                "Retell frames and writing prompts"
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

      {/* 3. Downloads Section */}
      <SectionWrapper theme="charius-beige" id="downloads">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
            <Download size={32} />
          </div>
          <h2 className="text-4xl font-bold text-[#111] mb-6">Free Resource Library</h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            Download our decodable readers, passages, and activities directly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
             <h3 className="text-2xl font-bold text-[#111] mb-6">Decodable Readers</h3>
             <ul className="space-y-4 mb-6">
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> Download Set 1 (PDF)</a></li>
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> Download Set 2 (PDF)</a></li>
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> Download Set 3 (PDF)</a></li>
             </ul>
             <h3 className="text-2xl font-bold text-[#111] mb-6 mt-4">Classroom Materials</h3>
             <ul className="space-y-4">
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> Download Practice Sheets (PDF)</a></li>
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> Full Classroom Text Set (ZIP Array)</a></li>
             </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
             <h3 className="text-2xl font-bold text-[#111] mb-6">Leveled Passages</h3>
             <ul className="space-y-4 mb-6">
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> level - Beginner (PDF)</a></li>
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> level - Intermediate (PDF)</a></li>
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> level - Advanced (PDF)</a></li>
             </ul>
             <h3 className="text-2xl font-bold text-[#111] mb-6 mt-4">Comprehension</h3>
             <ul className="space-y-4">
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> Activities - Level 1 (PDF)</a></li>
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> Activities - Level 2 (PDF)</a></li>
                <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={18}/> Activities - Level 3 (PDF)</a></li>
             </ul>
          </PremiumCard>
        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Need more guidance?"
        subheading="Open school profiles for implementation support or visit the full resources page."
        primaryButtonText="Browse Resources"
        primaryButtonHref="/resources"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        secondaryButtonText="All Resources"
        secondaryButtonHref="/resources"
        theme="charius"
      />
    </>
  );
}
