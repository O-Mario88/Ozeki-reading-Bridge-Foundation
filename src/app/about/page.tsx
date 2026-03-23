import Link from "next/link";
import { mission, organizationName, vision } from "@/lib/content";
import { listPortalCoreValuesPostgres } from "@/lib/server/postgres/repositories/public-content";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { Target, Eye, Heart } from "lucide-react";

export const metadata = {
  title: "About",
  description:
    "Learn about Ozeki Reading Bridge Foundation's vision, mission, and practical literacy implementation model.",
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  let coreValues: Awaited<ReturnType<typeof listPortalCoreValuesPostgres>> = [];
  try {
    coreValues = await listPortalCoreValuesPostgres();
  } catch {
    // Table may not exist yet — show fallback
  }

  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-brand-primary/10 via-brand-background to-brand-background pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-semibold text-sm mb-6 shadow-sm border border-brand-primary/10">
            Who we are
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
            {organizationName}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            A literacy-focused organization based in Gulu City, Northern Uganda, strengthening how reading is taught in primary schools through practical classroom support and measurable outcomes.
          </p>
        </div>
      </section>

      {/* 2. Quick Navigation Buttons */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <ul className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
            <li>
              <a href="#mission-vision" className="inline-block px-6 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-brand-primary hover:text-brand-primary hover:shadow-sm transition-all text-sm font-bold">
                Mission & Vision
              </a>
            </li>
            <li>
              <Link href="/about/leadership-team" className="inline-block px-6 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-brand-primary hover:text-brand-primary hover:shadow-sm transition-all text-sm font-bold">
                Leadership Team
              </Link>
            </li>
            <li>
              <a href="#core-values" className="inline-block px-6 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-brand-primary hover:text-brand-primary hover:shadow-sm transition-all text-sm font-bold">
                Core Values
              </a>
            </li>
            <li>
              <Link href="/transparency/financials" className="inline-block px-6 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-brand-primary hover:text-brand-primary hover:shadow-sm transition-all text-sm font-bold">
                Financial Transparency
              </Link>
            </li>
            <li>
              <Link href="/faqs" className="inline-block px-6 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-brand-primary hover:text-brand-primary hover:shadow-sm transition-all text-sm font-bold">
                FAQs
              </Link>
            </li>
            <li>
              <Link href="/contact" className="inline-block px-6 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-brand-primary hover:text-brand-primary hover:shadow-sm transition-all text-sm font-bold">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* 3. Mission & Vision (Split panels) */}
      <SectionWrapper theme="light" id="mission-vision">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-stretch max-w-5xl mx-auto">
          <PremiumCard className="p-10 md:p-12 flex flex-col items-start bg-brand-primary text-white border-none" withHover>
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-6">Our Vision</h2>
            <p className="text-xl leading-relaxed text-white/90">
              {vision}
            </p>
          </PremiumCard>
          
          <PremiumCard className="p-10 md:p-12 flex flex-col items-start bg-white" withHover>
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-8">
              <Target className="w-8 h-8 text-brand-primary" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-xl leading-relaxed text-gray-600">
              {mission}
            </p>
          </PremiumCard>
        </div>
      </SectionWrapper>

      {/* 4. Core Values */}
      <SectionWrapper theme="off-white" id="core-values">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
            <Heart size={32} />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Core Values</h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            These values shape how we measure progress, support schools, work with
            partners, and serve children across Uganda.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {coreValues.length === 0 ? (
            <PremiumCard className="p-8 col-span-3 text-center border-dashed border-2 bg-transparent shadow-none">
              <h3 className="text-xl font-bold text-gray-400 mb-2">Core values will appear here</h3>
              <p className="text-gray-500">Publish the organization&apos;s core values from the staff portal.</p>
            </PremiumCard>
          ) : (
            coreValues.map((value, index) => (
              <PremiumCard className="p-8 flex flex-col" key={value.id} withHover>
                <div className="text-5xl font-extrabold text-gray-100 mb-4 tracking-tighter">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed break-words">{value.description}</p>
              </PremiumCard>
            ))
          )}
        </div>

        {/* Values CTA */}
        <div className="mt-16 max-w-4xl mx-auto">
          <PremiumCard className="p-8 md:p-12 bg-gray-900 text-white flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-4">Evidence-led values in practice</h3>
              <p className="text-gray-400 text-lg">
                See how these values translate into classroom support, measurable
                learning outcomes, and partner accountability.
              </p>
            </div>
            <Link href="/impact" className="px-8 py-4 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all shrink-0">
              Explore the Impact Hub
            </Link>
          </PremiumCard>
        </div>
      </SectionWrapper>



      {/* 6. Bottom CTA */}
      <CTAStrip 
        heading="Need our full approach?"
        subheading="Learn how our model adapts to different districts and scales to the national level."
        primaryButtonText="Learn about our programs"
        primaryButtonHref="/programs"
        theme="brand"
      />
    </>
  );
}
