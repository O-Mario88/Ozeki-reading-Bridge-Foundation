
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { HelpCircle } from "lucide-react";

export const metadata = {
  title: "FAQs | Ozeki Reading Bridge Foundation",
  description:
    "Frequently asked questions about literacy support, partnerships, assessments, and reporting.",
};

const faqs = [
  {
    question: "What kind of schools do you support?",
    answer:
      "We support primary schools with literacy implementation needs, with focus on practical teacher support, coaching follow-through, and measurable reading outcomes.",
  },
  {
    question: "Do you provide one-off training only?",
    answer:
      "No. We use a cycle approach: train, coach, assess, improve, and sustain. The model is designed for measurable change over time.",
  },
  {
    question: "How do you measure improvement?",
    answer:
      "We track learner reading levels, assessment outcomes by domain, and teaching quality through structured lesson evaluation and follow-up records.",
  },
  {
    question: "Can a partner fund one school, a district, or a region?",
    answer:
      "Yes. Funding options include school-level, district-level, sub-region, region, and national support packages with a consistent 2-year model.",
  },
  {
    question: "What reports do partners receive?",
    answer:
      "Partners receive aggregated, privacy-protected reports including implementation coverage, teaching quality trends, assessment movement, and recommendations.",
  },
  {
    question: "Where can I access financial and annual reports?",
    answer:
      "Financial reports are published on our Financial Transparency page. Program and annual reports are available through the Impact Reports section.",
  },
] as const;

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SiteHeader />
      <main className="flex-grow pt-[72px] md:pt-20">
        <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-24 border-b border-gray-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#006b61]/10 via-brand-background to-brand-background pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-bold text-sm mb-6 shadow-sm border border-[#FA7D15]/20">
              <HelpCircle className="w-4 h-4" /> Support
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-brand-primary tracking-tight leading-tight mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Quick answers about school support requests, partnerships, reporting, and accountability.
            </p>
          </div>
        </section>

        <SectionWrapper theme="off-white">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {faqs.map((item) => (
              <PremiumCard key={item.question} className="p-8 bg-white" withHover>
                <h3 className="text-xl font-bold text-[#006b61] mb-4">{item.question}</h3>
                <p className="text-gray-600 leading-relaxed text-lg">{item.answer}</p>
              </PremiumCard>
            ))}
          </div>
        </SectionWrapper>

        <CTAStrip 
          heading="Need a specific answer?"
          subheading="Our team is ready to provide any additional details regarding our operations, financial standing, and program metrics."
          primaryButtonText="Contact Us"
          primaryButtonHref="/contact"
          primaryButtonColor="bg-[#FA7D15]"
          primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
          secondaryButtonText="Back to About"
          secondaryButtonHref="/about"
          theme="light"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
