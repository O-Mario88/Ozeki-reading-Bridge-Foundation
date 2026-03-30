import Link from "next/link";
import Image from "next/image";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";
import { organizationName, tagline } from "@/lib/content";
import {
  INTELLIGENCE_LOOP,
  PARTNERSHIP_OPTIONS,
} from "@/lib/home-static-data";
import { isPostgresConfigured } from "@/lib/server/postgres/client";
import { listPublishedPortalTestimonialsPostgres } from "@/lib/server/postgres/repositories/public-content";
import type { PortalTestimonialRecord } from "@/lib/types";

import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { ImpactStat } from "@/components/public/ImpactStat";
import { CTAStrip } from "@/components/public/CTAStrip";
import { PlayCircle, ArrowRight, Quote } from "lucide-react";
import { getImpactSummary } from "@/services/dataService";

export const revalidate = 300;

const TESTIMONIAL_FIELDS = new Set([
  "how_training_changed_teaching",
  "what_you_will_do_to_improve_reading_levels",
]);

const WORKING_PARTNERS = [
  {
    name: "Edify",
    href: "https://edify.org/uganda/",
    logoSrc: "/partners/edify-logo.svg",
    width: 140,
    height: 48,
  },
];

function clipQuote(text: string, maxChars: number) {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).trimEnd()}...`;
}

export default async function HomePage() {
  let testimonialRows: PortalTestimonialRecord[] = [];
  const impactStats = { schools: "...", assessments: "...", teachers: "..." };

  if (isPostgresConfigured()) {
    try {
      testimonialRows = (await listPublishedPortalTestimonialsPostgres(90))
        .filter(
          (item) =>
            item.sourceType === "training_feedback" &&
            TESTIMONIAL_FIELDS.has(String(item.quoteField ?? "")),
        )
        .slice(0, 3); // Show top 3 for cleaner layout

      const summary = await getImpactSummary();
      const formatStat = (val: number) => {
        return val.toLocaleString();
      };

      const getMetric = (labelMatched: string) => {
         const found = summary.metrics.find(m => m.label === labelMatched);
         return found && found.value > 0 ? formatStat(found.value) : null;
      };

      const dbSchools = getMetric("Schools trained");
      if (dbSchools) impactStats.schools = dbSchools;

      const dbAssessments = getMetric("Learners assessed");
      if (dbAssessments) impactStats.assessments = dbAssessments;

      const dbTeachers = getMetric("Teachers trained");
      if (dbTeachers) impactStats.teachers = dbTeachers;

    } catch (error) {
      console.error("Failed to load homepage data.", error);
    }
  }

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "NonProfit",
    name: organizationName,
    description: tagline,
    url: "https://www.ozekiread.org",
    areaServed: "Uganda",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-white pt-24 pb-32 md:pt-32 md:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-secondary/20 via-white to-white pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-7xl relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary font-semibold text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
            National Literacy Intelligence Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-brand-primary tracking-tight max-w-5xl leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
            Building confident readers across Uganda.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            Practical phonics. Strong teachers. Measured outcomes. We turn real
            classroom data into targeted action where it matters most.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <Link 
              href="/impact/dashboard"
              className="px-8 py-4 rounded-full bg-brand-primary text-white font-semibold flex items-center gap-2 hover:bg-brand-primary/90 hover:shadow-xl hover:shadow-brand-primary/20 transition-all hover:-translate-y-0.5"
            >
              View Live Impact Dashboard
              <ArrowRight size={18} />
            </Link>
            <Link 
              href="/programs"
              className="px-8 py-4 rounded-full bg-white text-gray-900 font-semibold flex items-center gap-2 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all hover:-translate-y-0.5"
            >
              <PlayCircle size={18} className="text-gray-400" />
              Explore Programs
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Impact Stats Band */}
      <SectionWrapper theme="dark" className="!py-12 border-y border-gray-100 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-200">
          <ImpactStat value={impactStats.schools} label="Schools Reached" />
          <ImpactStat value={impactStats.assessments} label="Reading Assessments" />
          <ImpactStat value={impactStats.teachers} label="Teachers Trained" />
          <ImpactStat value="100%" label="Data Privacy" />
        </div>
      </SectionWrapper>

      {/* 3. The Problem & Narrative (Split Storytelling Layout) */}
      <SectionWrapper theme="charius-beige" className="overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-primary/5 rounded-[2.5rem] transform -rotate-3 scale-105 transition-transform duration-500 hover:rotate-0" />
            <div className="relative rounded-[2rem] overflow-hidden aspect-[4/5] md:aspect-[3/4] shadow-2xl">
              <Image
                src="/photos/classroom-learners-writing.jpg"
                alt="Primary school learners practising writing in a classroom in Uganda."
                fill
                className="object-cover object-center transform hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 100vw, 800px"
              />
            </div>
          </div>
          <div className="flex flex-col gap-6 lg:pl-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-brand-primary tracking-tight leading-tight">
              Reading is the gateway. We cannot afford weak foundations.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Across Uganda, reading is the single skill determining whether children
              can access the rest of the curriculum. Yet national evidence shows too
              many learners still not mastering literacy early enough.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Years of disrupted schooling left many classrooms with limited materials 
              and large class sizes. Recovery requires systematic instruction and repeated 
              practice. 
            </p>
            <div className="mt-8">
              <Link href="/about" className="text-brand-primary font-bold inline-flex items-center gap-2 hover:gap-3 transition-all">
                Read our full story <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* 4. The Loop Grid */}
      <SectionWrapper theme="charius-beige">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-brand-primary mb-6">How our platform works</h2>
          <p className="text-xl text-gray-600">
            We strengthen teachers through structured phonics, measure progress through transparent outcomes, and turn data into targeted action.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {INTELLIGENCE_LOOP.map((step, index) => (
            <PremiumCard variant="charius" key={step.title} withHover className="p-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xl font-bold mb-6">
                {index + 1}
              </div>
              <h3 className="text-xl font-bold text-brand-primary mb-4">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.body}</p>
            </PremiumCard>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/impact/dashboard" className="inline-flex items-center gap-2 font-semibold text-brand-primary hover:text-brand-primary/80 transition-colors">
            Explore the public impact map <ArrowRight size={16} />
          </Link>
        </div>
      </SectionWrapper>

      {/* 5. Live Stories / Testimonials */}
      <SectionWrapper theme="charius-beige">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-brand-primary mb-4">Voices from the classroom</h2>
          <p className="text-lg text-gray-600 mb-8">
            Hear directly from teachers who are transforming their classrooms using Ozeki&apos;s practical phonics and coaching.
          </p>
          <Link href="/stories" className="px-6 py-3 rounded-full border-2 border-gray-200 font-semibold text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors">
            View All Stories
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonialRows.length > 0 ? (
            testimonialRows.map((quote) => (
              <PremiumCard variant="charius" key={quote.id} className="p-8 flex flex-col bg-brand-background/20" withHover>
                <Quote className="text-brand-primary opacity-20 w-10 h-10 mb-6" />
                <p className="text-lg text-gray-800 leading-relaxed mb-8 flex-1 font-medium">
                  &quot;{clipQuote(quote.storyText, 220)}&quot;
                </p>
                <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-auto">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 text-sm">{quote.storytellerRole}</span>
                    <span className="text-brand-primary text-xs uppercase tracking-wider font-semibold mt-1">
                      {quote.district}
                    </span>
                  </div>
                </div>
              </PremiumCard>
            ))
          ) : (
             <PremiumCard variant="charius" className="p-8 col-span-3 text-center bg-gray-50 border-dashed border-2">
               <p className="text-gray-500 font-medium">Stories and testimonials are currently being curated.</p>
             </PremiumCard>
          )}
        </div>
      </SectionWrapper>

      {/* 6. Partner/Support Grid */}
      <SectionWrapper theme="charius-beige">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-brand-primary mb-6">Join the movement</h2>
          <p className="text-xl text-gray-600">
            Whether you are a school looking for support, or an organization eager to fund literacy by geography, we have a pathway for you.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {PARTNERSHIP_OPTIONS.slice(0, 2).map((option) => (
            <PremiumCard variant="charius" key={option.title} className="p-8 md:p-12 text-center flex flex-col items-center">
              <h3 className="text-2xl font-bold text-brand-primary mb-4">{option.title}</h3>
              <p className="text-gray-600 mb-8 flex-1">
                {option.href ? "Invest directly in teacher training and classroom resources." : "Support a cluster of schools in your chosen geography."}
              </p>
              {option.href ? (
                <Link className="px-6 py-3 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-colors w-full" href={option.href}>
                  View Details
                </Link>
              ) : (
                <HomeSupportRequestModal
                  triggerLabel="Partner With Us"
                  title="Partnership request form"
                  description="Share your partnership interest and geography focus."
                  triggerClassName="px-6 py-3 rounded-full bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors w-full block"
                  presetMessage="I would like to partner with Ozeki Reading Bridge Foundation."
                />
              )}
            </PremiumCard>
          ))}
        </div>
      </SectionWrapper>

      {/* 7. Partner Logo Strip */}
      <section className="py-12 border-t border-gray-100 bg-white">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <p className="text-sm font-semibold tracking-wider text-gray-400 uppercase mb-8">Trusted by</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 hover:opacity-100 transition-opacity">
            {WORKING_PARTNERS.map((partner) => (
              <a
                key={partner.name}
                href={partner.href}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:scale-105 transition-transform"
              >
                <Image
                  src={partner.logoSrc}
                  alt={partner.name}
                  width={partner.width}
                  height={partner.height}
                  className="object-contain"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Bottom CTA */}
      <CTAStrip 
        heading="Ready to improve literacy outcomes?"
        subheading="Join our live training sessions or explore evidence-based interventions for your school."
        primaryButtonText="Request School Support"
        primaryButtonHref="/contact"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        secondaryButtonText="View Impact Hub"
        secondaryButtonHref="/impact/dashboard"
        theme="charius"
      />
    </>
  );
}
