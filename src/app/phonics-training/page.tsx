import Image from "next/image";
import trainingPhoto from "../../../public/photos/PXL_20260218_124648833.MP.jpg";
import { signatureProgram } from "@/lib/content";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { CheckCircle2, MessageCircleQuestion } from "lucide-react";
import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";

export const metadata = {
  title: "Signature Program: Phonics Training & School Support",
  description:
    "Flagship NLIP implementation pathway combining training, coaching, assessment, and evidence-backed progress at scale.",
};

const faq = [
  {
    question: "How long does implementation take?",
    answer:
      "Typical implementation runs in phased cycles: baseline, training, coaching support, and progress reviews over one or more school terms.",
  },
  {
    question: "Do you support school leaders too?",
    answer:
      "Yes. We train headteachers and directors of studies to supervise reading instruction and use classroom data for decisions.",
  },
  {
    question: "Can this work for struggling readers?",
    answer:
      "Yes. We include remedial and catch-up routines focused on missing foundational skills.",
  },
];

export default function PhonicsTrainingPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

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
                Signature Program: Phonics Training &amp; School Support
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Flagship NLIP implementation pathway for stronger classroom teaching and measurable reading gains.
              </p>
              
              <div className="prose prose-lg text-gray-600">
                <p className="mb-4">
                  Signature Program: Phonics Training &amp; School Support is our flagship
                  implementation pathway for turning national literacy data into
                  stronger classroom teaching and measurable gains in how children read.
                  It is built for scale: the program equips teachers with practical,
                  step-by-step structured phonics routines, then reinforces those
                  routines through ongoing in-school coaching so the approach becomes
                  consistent daily practice, not just workshop knowledge.
                </p>
                <p className="mb-6">
                  For partners and funders, this is a complete delivery model:
                  training, implementation support, measurement, and verified progress,
                  organized around clear standards and evidence.
                </p>
                <div className="p-5 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <p className="text-gray-900 font-medium m-0">
                    <strong className="text-brand-primary font-bold">Outcome we drive:</strong> Stronger teacher practice, measurable
                    learner progress, and sustained literacy routines at school level.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <Image
                  src={trainingPhoto}
                  alt="Teachers participating in structured phonics training"
                  priority
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. Program Details */}
      <SectionWrapper theme="light" id="details">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 bg-[#FA7D15]/10 rounded-xl flex items-center justify-center mb-6 text-[#FA7D15] font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold text-brand-primary mb-4">Cycle Start: Diagnostics &amp; Training</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              At the start of each cycle, we conduct school diagnostics to understand
              what learners can and cannot do across core reading outcomes
              and to assess whether school systems protect reading time.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Teachers then receive demonstration-based professional development
              focused on the practical "how" of reading instruction:
            </p>
            <ul className="mt-2 space-y-3 mb-4">
              {[
                "Pure sound modeling and sound-symbol mapping",
                "Blending and segmenting routines",
                "Decoding and spelling (encoding)",
                "Tricky-word instruction and fluency-building practice",
                "Comprehension routines aligned to grade expectations"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col md:col-span-1 lg:col-span-1" withHover>
            <div className="w-12 h-12 bg-[#FA7D15]/10 rounded-xl flex items-center justify-center mb-6 text-[#FA7D15] font-bold text-xl">2</div>
            <h3 className="text-2xl font-bold text-brand-primary mb-4">In-School Coaching</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              The differentiator is what happens next: in-school coaching and
              follow-up. Ozeki coaches observe live reading lessons using a
              standard lesson evaluation tool, provide immediate feedback, and model
              effective routines through demonstration lessons and co-teaching.
            </p>
            <p className="text-gray-600 font-medium mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              This creates a practical loop: <strong className="text-brand-primary">observe → coach → practice → revisit</strong>.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">Coaching emphasizes the highest-impact levers:</p>
            <ul className="mt-2 space-y-3">
              {[
                "Clear sound instruction",
                "Structured decoding practice",
                "Rapid corrective feedback",
                "Time-on-task",
                "Daily routines that move learners from non-reader to fluent"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col md:col-span-1 lg:col-span-1 bg-brand-primary text-white border-none" withHover>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-white font-bold text-xl">3</div>
            <h3 className="text-2xl font-bold mb-4">Expected Outcomes</h3>
            <ul className="mt-2 space-y-4">
              {signatureProgram.outcomes.map((outcome, idx) => (
                <li key={idx} className="flex items-start gap-3 text-white/90">
                  <CheckCircle2 className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </PremiumCard>
          
        </div>
      </SectionWrapper>

      {/* 3. Evidence & Delivery */}
      <SectionWrapper theme="off-white" id="evidence">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">NLIP Data-to-Action</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              NLIP ensures improvement is measured, transparent, and actionable.
              Each cycle includes learner assessments and progress tracking that
              automatically translate results into clear reading levels and domain
              profiles, helping schools identify where learners are stuck and
              target support appropriately.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Where results show high proportions of non-readers or weak decoding,
              the platform triggers Remedial &amp; Catch-Up Reading Interventions:
              structured small-group routines that rebuild foundations and
              accelerate progress.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Where results show steady improvement, NLIP recommends next actions
              to sustain growth and move schools toward graduation readiness:
              strong learner outcomes, fluent reading levels, consistent teaching
              quality, and a culture of reading and writing reinforced through the
              1001 Story Project.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Partner Evidence Chain</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              For potential partners, this program provides what most education
              investments lack: a complete evidence chain.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Every training, coaching visit, lesson evaluation, and assessment
              generates partner-ready data:
            </p>
            <ul className="mt-2 space-y-3 mb-4">
              {[
                "Teaching quality scores",
                "Assessment coverage",
                "Reading level movement",
                "Improvement trends over time"
              ].map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <span className="text-gray-700 flex-1">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed">
              Results are reported at school, district, region, and national
              levels, making funding decisions clearer and progress easier to
              verify term by term.
            </p>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col border-brand-primary/20 bg-brand-primary/5" withHover>
            <h3 className="text-xl font-bold text-brand-primary mb-4">Our Promise</h3>
            <p className="text-gray-700 leading-relaxed text-lg font-medium">
              We do not stop at workshop delivery. Partners fund a full system that
              produces sustained classroom change, supports targeted remediation
              where needed, and demonstrates verified progress until schools can
              sustain strong literacy instruction independently.
            </p>
          </PremiumCard>

        </div>
      </SectionWrapper>

      {/* 4. FAQs */}
      <SectionWrapper theme="light" id="faq">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
            <MessageCircleQuestion size={32} />
          </div>
          <h2 className="text-4xl font-bold text-brand-primary mb-6">Frequently Asked Questions</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {faq.map((item, index) => (
            <PremiumCard key={index} className="p-8" withHover>
              <h3 className="text-xl font-bold text-brand-primary mb-3">{item.question}</h3>
              <p className="text-gray-600 leading-relaxed">{item.answer}</p>
            </PremiumCard>
          ))}
        </div>
      </SectionWrapper>

      {/* Voices from the Classroom */}
      <VoicesFromTheClassroom />

      <CTAStrip 
        heading="Implement this program"
        subheading="Discuss a country, region, district, or school implementation package for this Signature Program with clear evidence deliverables."
        primaryButtonText="Partner With Us"
        primaryButtonHref="/partner-with-us"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        secondaryButtonText="Explore Impact Evidence"
        secondaryButtonHref="/impact"
        theme="brand"
      />
    </>
  );
}
