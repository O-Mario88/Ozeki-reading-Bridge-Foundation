import { AlertTriangle, ArrowRightCircle, Compass, Lightbulb, LineChart, BookOpen } from "lucide-react";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { PageHero } from "@/components/public/PageHero";

export const metadata = {
  title: "Our Story",
  description:
    "Understand the literacy problem in Uganda and how Ozeki's National Literacy Intelligence Platform turns evidence into sustained classroom improvement.",
};

export default function OurStoryPage() {
  return (
    <div className="pt-[72px] md:pt-20">
        {/* Hero Section */}
        <PageHero
          tagline={<><BookOpen className="w-4 h-4 inline mr-1" /> About Us</>}
          title="Our Story"
          subtitle="A clear national pathway from literacy challenge to measurable, school-level improvement."
          imageSrc="/photos/21.jpeg"
        />

        {/* The Problem Section */}
        <SectionWrapper theme="charius-beige" id="problem">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-4">
              <div className="w-12 h-12 rounded-full bg-[#ff7235]/10 text-[#ff7235] flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#111]">The Problem We Are Solving</h2>
            </div>

            <div className="space-y-6 text-gray-500 text-lg leading-relaxed">
              <p>
                Across Uganda, too many children are still moving through school without mastering
                the foundational skill that unlocks all other learning: reading. National evidence
                shows progress in access to education, but foundational literacy remains far too
                weak for many learners. The 2024 National Population and Housing Census reports a
                national literacy rate of about 74 percent, meaning a substantial share of Ugandans
                still lack basic literacy skills, even as Uganda remains a very young country with
                heavy pressure on the school system.
              </p>

              <blockquote className="my-10 pl-6 border-l-4 border-[#006b61] bg-[#006b61]/5 py-4 pr-6 rounded-r-2xl text-xl font-medium italic text-[#006b61] shadow-sm">
                "Reading is the gateway skill&mdash;without it, every other subject becomes harder."
              </blockquote>

              <p>
                This is not only a learner problem; it is a system problem. Many schools still lack
                the conditions needed for consistent early grade reading instruction: enough teaching
                and learning materials, sustained teacher support, and system-wide commitment to
                foundational literacy. When foundational reading is weak, children struggle in every
                subject because they cannot access written instruction, complete independent tasks, or
                understand grade-level texts. Unaddressed progression through school masks deep learning gaps.
              </p>

              <p>
                The challenge is even sharper in communities that have faced long periods of
                disruption. Northern Uganda remains an important example of how conflict can reset
                education systems for a generation. Years of insecurity and displacement severely weakened 
                teacher availability and damaged learning environments. Recovery requires more than 
                reopening schools. It requires structured teaching, rigorous follow-up, and localized measurement.
              </p>

              <div className="bg-gray-50 p-8 rounded-3xl border border-gray-200 my-10">
                <h3 className="text-xl font-bold text-brand-primary mb-3">Evidence-led Action</h3>
                <p>
                  Uganda's own early grade reading evidence shows why structured support matters.
                  Practical fluency benchmarks (20, 40, and 60 correct words per minute) track whether 
                  learners are moving from basic decoding into stronger reading fluency. Our data proves that 
                  when schools receive structured reading support, learners predictably transition into stronger fluency bands.
                </p>
              </div>

              <p>
                The deeper problem is the absence of a strong, connected literacy improvement system that can perform five pivotal sequences: 
                <strong className="text-gray-900"> identify where learners are struggling, support teachers, follow up in classrooms, verify results, and direct resources dynamically.</strong>
              </p>
            </div>
          </div>
        </SectionWrapper>

        {/* The Solution Section */}
        <SectionWrapper theme="charius-beige" id="solution">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-4">
              <div className="w-12 h-12 rounded-full bg-[#006b61]/10 text-[#006b61] flex items-center justify-center">
                <Lightbulb size={24} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#111]">Our Connected Solution</h2>
            </div>

            <div className="space-y-6 text-gray-500 text-lg leading-relaxed mb-12">
              <p>
                Ozeki's solution is built on a simple conviction: Uganda's literacy challenge will not be solved 
                by isolated activities. It will be solved by a connected system. That is the purpose of the <strong>National Literacy Intelligence Platform (NLIP)</strong>.
              </p>
            </div>

            <PremiumCard variant="charius" className="bg-white border-2 border-[#006b61]/10 p-8 md:p-12 text-center mb-12 shadow-md">
              <h3 className="text-2xl font-extrabold text-[#006b61] mb-8">The Evidence-Driven Improvement Cycle</h3>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm font-bold text-gray-800 uppercase tracking-widest">
                <div className="flex flex-col items-center"><Compass className="w-8 h-8 text-[#ff7235] mb-2" /> Train</div>
                <ArrowRightCircle className="w-5 h-5 text-gray-300 hidden md:block" />
                <div className="flex flex-col items-center"><Lightbulb className="w-8 h-8 text-[#006b61] mb-2" /> Support</div>
                <ArrowRightCircle className="w-5 h-5 text-gray-300 hidden md:block" />
                <div className="flex flex-col items-center"><LineChart className="w-8 h-8 text-[#ff7235] mb-2" /> Analyze</div>
                <ArrowRightCircle className="w-5 h-5 text-gray-300 hidden md:block" />
                <div className="flex flex-col items-center"><Compass className="w-8 h-8 text-[#006b61] mb-2" /> Sustain</div>
              </div>
            </PremiumCard>

            <div className="space-y-6 text-gray-500 text-lg leading-relaxed">
              <p>
                At its core, the solution works through a clear improvement loop: schools are not left with knowledge alone; 
                they are heavily supported until foundational reading instruction permanently transforms learner outcomes.
              </p>
              <p>
                The first step is practical, demonstration-based teacher training in structured phonics. Teachers are equipped 
                to teach reading step by step. Ozeki coaches then routinely visit schools to observe real lessons, provide 
                immediate feedback, model routines, and support teachers through structured coaching cycles.
              </p>
              <p>
                As learner assessments accumulate in our platform, it automatically translates raw scores into clear reading levels 
                and domain profiles. NLIP instantly triggers remedial actions for weak performance zones or scales back intervention 
                for rapidly graduating classrooms. 
              </p>
              <p>
                NLIP makes all of this unconditionally accountable. It produces live district and national impact reports that consolidate 
                training data, coaching evidence, learner outcomes, and reading progression into actionable intelligence for global partners.
              </p>
            </div>
          </div>
        </SectionWrapper>

        <CTAStrip 
          heading="From evidence to national progress"
          subheading="Explore verified outcomes, implementation trends, and program pathways operating across Uganda."
          primaryButtonText="View Live Dashboard"
          primaryButtonHref="/impact"
          primaryButtonColor="bg-[#006b61]"
          primaryButtonHoverColor="hover:bg-[#006b61]/90"
          secondaryButtonText="Explore Our Programs"
          secondaryButtonHref="/programs"
          theme="charius"
        />
    </div>
  );
}
