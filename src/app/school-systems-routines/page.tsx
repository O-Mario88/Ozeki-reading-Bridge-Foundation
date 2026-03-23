import Image from "next/image";
import schoolSystemsPhoto from "../../../public/photos/Amolatar District Literacy.jpg";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2, Download } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "School Literacy Program Strengthening (Systems & Routines)",
  description:
    "School-wide routines and accountability systems that make literacy implementation stick across classes and terms.",
};

export default function SchoolSystemsRoutinesPage() {
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
                School Literacy Program Strengthening
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                School-wide routines and accountability systems that make literacy
                implementation stick.
              </p>
              
              <div className="prose prose-lg text-gray-600">
                <p className="mb-4">
                  Great training can collapse without a school system to protect it.
                  This program helps schools move from one good teacher to school-wide
                  consistency by putting simple routines, schedules, and accountability
                  tools in place.
                </p>
                <p className="mb-6">
                  We work with school leaders and literacy champions to design practical
                  literacy timetables, establish daily and weekly reading routines, and
                  install tracking tools that keep implementation on track term after
                  term.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> Schools sustain literacy gains
                    beyond one-off training.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={schoolSystemsPhoto}
                  alt="School leaders and teachers in a literacy systems strengthening session"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. How We Do It */}
      <SectionWrapper theme="light" id="details">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">How We Do It</h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            What happens in a school when we install literacy routines.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Set the Literacy Structure</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              We help the school create a realistic literacy timetable that
              protects reading time every day and clarifies responsibility.
            </p>
            <ul className="mt-auto space-y-3">
              {[
                "Daily reading block schedule by class and grade",
                "Allocation of phonics time vs reading practice time",
                "Roles for Headteacher/DoS supervision",
                "Routine standardization across classes"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Install Daily &amp; Weekly Routines</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              We introduce repeatable routines teachers can run every day without
              overthinking.
            </p>
            <ul className="mt-auto space-y-3">
              {[
                "Daily: Sound review drill, blending practice, decodable reading",
                "Daily: Quick 2-3 minute mastery checks",
                "Weekly: Fluency routine day, spelling practice",
                "Weekly: Teacher reflection and lesson improvement focus"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Track Implementation</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              We provide simple tools to track whether routines are happening
              consistently and whether learners are progressing.
            </p>
            <ul className="mt-auto space-y-3">
              {[
                "Are reading lessons happening on schedule?",
                "Are phonics routines being used correctly?",
                "Are learners getting enough reading practice time?",
                "Which classes or teachers need coaching support?"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6 text-brand-primary font-bold text-xl">4</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Accountability (Supportive)</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              We help leaders supervise reading lessons using short checklists and
              coaching conversations, without blame.
            </p>
            <ul className="mt-auto space-y-3">
              {[
                "Weekly/biweekly lesson checks using a short rubric",
                "Feedback conversations with 1-3 priority improvements",
                "Termly literacy review meetings using learner data",
                "Action plans for weak areas"
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

      {/* 4. Resources Downloads */}
      <SectionWrapper theme="off-white" id="resources">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
            <Download size={32} />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Tools &amp; Templates Downloads</h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Direct access to the same implementation resources we use in schools.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <PremiumCard className="p-8" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Literacy Timetables</h3>
            <ul className="space-y-3">
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Literacy Timetable Template</a></li>
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Reading Block Schedule Samples</a></li>
            </ul>
          </PremiumCard>
          
          <PremiumCard className="p-8" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Daily &amp; Weekly Reading Routines</h3>
            <ul className="space-y-3">
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Daily Reading Routine Poster</a></li>
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Weekly Literacy Routine Planner</a></li>
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Structured Lesson Flow Card</a></li>
            </ul>
          </PremiumCard>
          
          <PremiumCard className="p-8" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Implementation Tracking Tools</h3>
            <ul className="space-y-3">
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Routine Tracker (Teacher/Class)</a></li>
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Term Literacy Checklist</a></li>
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Learner Progress Sheet</a></li>
            </ul>
          </PremiumCard>
          
          <PremiumCard className="p-8" withHover>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Accountability Tools</h3>
            <ul className="space-y-3">
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Headteacher Supervision Checklist</a></li>
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Coaching Conversation Guide</a></li>
              <li><a className="text-brand-primary font-medium hover:underline flex items-center gap-2" href="/resources"><Download size={16}/> Download Review Meeting Minutes</a></li>
            </ul>
          </PremiumCard>
        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Book a setup visit"
        subheading="Establish literacy routines and accountability systems directly in your school."
        primaryButtonText="Signature Program"
        primaryButtonHref="/phonics-training"
        secondaryButtonText="Open school profiles"
        secondaryButtonHref="/portal/schools"
        theme="brand"
      />
    </>
  );
}
