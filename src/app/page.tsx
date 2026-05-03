import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { organizationName, tagline } from "@/lib/content";
import { isPostgresConfigured } from "@/lib/server/postgres/client";
import { listPublishedPortalTestimonialsPostgres } from "@/lib/server/postgres/repositories/public-content";
import {
  listUpcomingPublicEventsPostgres,
  type PublicUpcomingEvent,
} from "@/lib/server/postgres/repositories/public-events";
import type { PortalTestimonialRecord } from "@/lib/types";

import { SectionWrapper } from "@/components/public/SectionWrapper";
import { getImpactSummary } from "@/services/dataService";
import {
  getHomepageProgrammeCardsPostgres,
  type HomepageProgrammeCards,
} from "@/lib/server/postgres/repositories/homepage-programmes";
import {
  getPublicReadingStageShift,
  getPublicCostPerLearnerReached,
  getPublicProgrammeOverheadSplit,
  getPublicReachFootprint,
  getPublicReadingStageDistribution,
  getPublicCoachingCompletionRate,
  getPublicStoryCollectionGrowth,
  type ReadingStageShift,
  type CostPerLearnerReached,
  type ProgrammeOverheadSplit,
  type PublicReachFootprint,
  type ReadingStageDistribution,
  type CoachingCompletionRate,
  type StoryCollectionGrowth,
} from "@/lib/server/postgres/repositories/public-metrics";
import { ChariusPillImage } from "@/components/public/ChariusPillImage";

const FOUNDING_YEAR = 2019;
const MONTH_ABBREVIATIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatEventDate(iso: string): { day: string; month: string } {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return { day: "--", month: "---" };
  return {
    day: String(d.getUTCDate()).padStart(2, "0"),
    month: MONTH_ABBREVIATIONS[d.getUTCMonth()] ?? "---",
  };
}

function formatEventTimeRange(event: PublicUpcomingEvent): string {
  if (event.scheduledStartTime && event.scheduledEndTime) {
    return `${event.scheduledStartTime} – ${event.scheduledEndTime}`;
  }
  if (event.scheduledStartTime) return `Starts ${event.scheduledStartTime}`;
  if (event.venue) return event.venue;
  if (event.district) return event.district;
  return "Details inside";
}

export const revalidate = 300;

export const metadata: Metadata = {
  title: `${organizationName} — Phonics Training, Reading Assessments & Teacher Coaching in Uganda`,
  description:
    "Ozeki Reading Bridge Foundation equips nursery and primary school teachers with evidence-based phonics training, reading assessments, in-school coaching, and decodable reading materials — so every child in Uganda can read for meaning.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${organizationName} — Reading outcomes for Ugandan schools`,
    description:
      "Evidence-based phonics training, reading assessments, coaching, and decodable materials for Uganda's nursery and primary schools.",
    url: "https://www.ozekiread.org",
    type: "website",
  },
};

const TESTIMONIAL_FIELDS = new Set([
  "how_training_changed_teaching",
  "what_you_will_do_to_improve_reading_levels",
]);

function clipQuote(text: string, maxChars: number) {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).trimEnd()}...`;
}

export default async function HomePage() {
  let testimonialRows: PortalTestimonialRecord[] = [];
  let upcomingEvents: PublicUpcomingEvent[] = [];
  let programmeCards: HomepageProgrammeCards | null = null;
  let readingShift: ReadingStageShift | null = null;
  let costPerLearner: CostPerLearnerReached | null = null;
  let programmeSplit: ProgrammeOverheadSplit | null = null;
  let reachFootprint: PublicReachFootprint | null = null;
  let stageDistribution: ReadingStageDistribution | null = null;
  let coachingCompletion: CoachingCompletionRate | null = null;
  let storyGrowth: StoryCollectionGrowth | null = null;
  const impactStats: {
    schools: string | null;
    assessments: string | null;
    teachers: string | null;
    years: string;
  } = {
    schools: null,
    assessments: null,
    teachers: null,
    years: String(Math.max(1, new Date().getUTCFullYear() - FOUNDING_YEAR)),
  };

  if (isPostgresConfigured()) {
    try {
      const [
        testimonialsResult, summary, events, cards,
        shift, perLearner, split,
        reach, distribution, completion, growth,
      ] = await Promise.all([
        listPublishedPortalTestimonialsPostgres(90),
        getImpactSummary(),
        listUpcomingPublicEventsPostgres(3),
        getHomepageProgrammeCardsPostgres(),
        getPublicReadingStageShift().catch(() => null),
        getPublicCostPerLearnerReached().catch(() => null),
        getPublicProgrammeOverheadSplit().catch(() => null),
        getPublicReachFootprint().catch(() => null),
        getPublicReadingStageDistribution().catch(() => null),
        getPublicCoachingCompletionRate().catch(() => null),
        getPublicStoryCollectionGrowth().catch(() => null),
      ]);
      programmeCards = cards;
      readingShift = shift;
      costPerLearner = perLearner;
      programmeSplit = split;
      reachFootprint = reach;
      stageDistribution = distribution;
      coachingCompletion = completion;
      storyGrowth = growth;

      testimonialRows = testimonialsResult
        .filter(
          (item) =>
            item.sourceType === "training_feedback" &&
            TESTIMONIAL_FIELDS.has(String(item.quoteField ?? "")),
        )
        .slice(0, 4);

      upcomingEvents = events;

      const formatStat = (val: number) => {
        if (val > 1000) return `${(val / 1000).toFixed(1)}k`;
        return val.toLocaleString();
      };

      const getMetric = (labelMatched: string) => {
        const found = summary.metrics.find((m) => m.label === labelMatched);
        return found && found.value > 0 ? formatStat(found.value) : null;
      };

      // Live values only; the UI suppresses the KPI row if any is null so we
      // never show a misleading placeholder like "120+" when the DB is empty.
      impactStats.schools = getMetric("Schools trained");
      impactStats.assessments = getMetric("Learners assessed");
      impactStats.teachers = getMetric("Teachers trained");
    } catch (error) {
      console.error("Failed to load homepage data.", error);
    }
  }

  const SITE_URL = "https://www.ozekiread.org";

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: organizationName,
    alternateName: "Ozeki Reading Bridge",
    legalName: organizationName,
    description: tagline,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    image: `${SITE_URL}/opengraph-image`,
    areaServed: { "@type": "Country", name: "Uganda" },
    foundingDate: "2019",
    knowsAbout: [
      "Phonics instruction",
      "Early grade reading",
      "Teacher training",
      "Reading assessments",
      "Literacy coaching",
      "Decodable readers",
      "Remedial reading",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: "+256-773-397-375",
        email: "support@ozekiread.org",
        areaServed: "UG",
        availableLanguage: ["en"],
      },
    ],
    sameAs: [
      "https://www.facebook.com/ozekiread",
      "https://www.linkedin.com/company/ozeki-reading-bridge-foundation",
      "https://x.com/ozekiread",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE_URL,
    name: organizationName,
    description: tagline,
    inLanguage: "en-UG",
    publisher: { "@type": "NGO", name: organizationName, url: SITE_URL },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/blog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />


      {/* 2. Overlapping Pill Section (You're the Hope of Others) */}
      <SectionWrapper theme="light" className="overflow-hidden py-24">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center max-w-6xl mx-auto">
          {/* Left: Component with diagonal pills */}
          <div className="relative w-full">
            <ChariusPillImage 
              src="/photos/PXL_20260217_110748302.jpg" 
              alt="Reading Session" 
            />
          </div>
          
          {/* Right: Content */}
          <div className="flex flex-col gap-6">
            <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase">
              Welcome To Ozeki
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#111] leading-[1.15] tracking-tight mb-4">
              You&apos;re the Hope of Others.
            </h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              Across Uganda, reading is the single skill determining whether children 
              can access the rest of the curriculum. Yet national evidence shows too 
              many learners still not mastering literacy early enough. 
            </p>
            <p className="text-gray-600 leading-relaxed text-lg">
              Years of disrupted schooling left many classrooms with limited materials. 
              Recovery requires systematic instruction and repeated practice. We train 
              teachers to bridge this gap.
            </p>
            
            <div className="mt-6 flex items-center gap-8">
              <Link 
                href="/about" 
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-charius-orange text-white font-bold tracking-wide hover:bg-[#e06b0b] transition-colors"
              >
                Discover More
              </Link>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center">
                    <span className="text-charius-orange">📞</span>
                 </div>
                 <div>
                    <span className="block text-xs text-gray-500 uppercase font-semibold">Call Us</span>
                    <span className="block text-[15px] font-bold text-[#111]">+256 773 397 375</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* 3. Stat Banner — only rendered when live data is available.
          When `reachFootprint` is live we surface districts + regions in
          place of "Years of Impact" because geographic reach is a far
          stronger trust signal than years operating. */}
      {(impactStats.schools || impactStats.assessments || impactStats.teachers || reachFootprint) && (
        <div className="w-full bg-white border-t border-gray-100 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100/50">
              <div className="text-center px-4">
                <div className="text-5xl font-bold text-[#111] tabular-nums mb-2">{impactStats.schools ?? "—"}</div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Schools</div>
              </div>
              <div className="text-center px-4">
                <div className="text-5xl font-bold text-[#111] tabular-nums mb-2">{impactStats.assessments ?? "—"}</div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Assessed</div>
              </div>
              <div className="text-center px-4">
                <div className="text-5xl font-bold text-[#111] tabular-nums mb-2">{impactStats.teachers ?? "—"}</div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Happy Teachers</div>
              </div>
              {reachFootprint ? (
                <div className="text-center px-4">
                  <div className="text-5xl font-bold text-[#111] tabular-nums mb-2">{reachFootprint.districtsReached}</div>
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Districts {reachFootprint.regionsReached > 0 && (
                      <span className="block text-xs text-gray-400 normal-case font-normal mt-1">
                        across {reachFootprint.regionsReached} region{reachFootprint.regionsReached === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center px-4">
                  <div className="text-5xl font-bold text-[#111] tabular-nums mb-2">{impactStats.years}</div>
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Years of Impact</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3b. Live transparency band — only renders metrics that have data.
          Each tile is omitted when its underlying query returns null
          (early-days / sample too small / no posted journals yet). */}
      {(readingShift || costPerLearner || programmeSplit || coachingCompletion || storyGrowth) && (
        <SectionWrapper theme="light" className="py-16 border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-10">
              <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase block mb-3">
                Live Transparency
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#111] leading-tight tracking-tight">
                What your support is producing
              </h2>
              <p className="text-gray-500 mt-3 text-base max-w-2xl mx-auto">
                Refreshed from our database. We publish each number only when the underlying sample is large enough to be honest.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {readingShift && readingShift.deltaPoints != null && (
                <article className="bg-white border border-gray-100 rounded-2xl p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Avg learner reading-stage shift
                  </p>
                  <p className="text-4xl font-extrabold text-[#111] tabular-nums">
                    {readingShift.deltaPoints > 0 ? "+" : ""}{readingShift.deltaPoints} pts
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Baseline → endline composite, paired across {readingShift.endlineLearners.toLocaleString()} learners.
                    {readingShift.improvedSharePct != null && (
                      <> <span className="font-semibold text-emerald-700">{readingShift.improvedSharePct}%</span> improved by at least one stage.</>
                    )}
                  </p>
                </article>
              )}
              {costPerLearner && (
                <article className="bg-white border border-gray-100 rounded-2xl p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Programme cost per learner reached
                  </p>
                  <p className="text-4xl font-extrabold text-[#111] tabular-nums">
                    ${costPerLearner.costPerLearnerUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    UGX {costPerLearner.costPerLearnerUgx.toLocaleString()} per learner across {costPerLearner.learnersReached.toLocaleString()} assessed.
                  </p>
                </article>
              )}
              {programmeSplit && (
                <article className="bg-white border border-gray-100 rounded-2xl p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Reaching learners directly
                  </p>
                  <p className="text-4xl font-extrabold text-[#111] tabular-nums">
                    {programmeSplit.programmeSharePct}%
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    of total spend is programme delivery; {programmeSplit.overheadSharePct}% is general &amp; administrative overhead.
                  </p>
                </article>
              )}
              {coachingCompletion && (
                <article className="bg-white border border-gray-100 rounded-2xl p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Coaching delivery rate (90 days)
                  </p>
                  <p className="text-4xl font-extrabold text-[#111] tabular-nums">
                    {coachingCompletion.completionPct}%
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {coachingCompletion.completedLast90d.toLocaleString()} of {coachingCompletion.scheduledLast90d.toLocaleString()} scheduled coaching visits delivered.
                  </p>
                </article>
              )}
              {storyGrowth && (
                <article className="bg-white border border-gray-100 rounded-2xl p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    1001 Story collection
                  </p>
                  <p className="text-4xl font-extrabold text-[#111] tabular-nums">
                    {storyGrowth.totalPublished.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    learner-authored stories published.
                    {storyGrowth.newThisMonth > 0 && (
                      <> <span className="font-semibold text-emerald-700">+{storyGrowth.newThisMonth}</span> this month
                        {storyGrowth.monthOnMonthDeltaPct != null && (
                          <>{" "}
                            ({storyGrowth.monthOnMonthDeltaPct >= 0 ? "+" : ""}
                            {storyGrowth.monthOnMonthDeltaPct}% vs prior).
                          </>
                        )}
                      </>
                    )}
                  </p>
                </article>
              )}
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">
              Source: posted journal entries, paired assessments, coaching-visit log, story library. Updated continuously.{" "}
              <Link href="/transparency" className="text-charius-orange font-semibold hover:underline">
                See methodology →
              </Link>
            </p>
          </div>
        </SectionWrapper>
      )}

      {/* 3c. Reading-stage distribution band. Renders only with ≥30 learners
          assessed; shows the share of learners at each stage as horizontal
          bars + counts. Powered by getPublicReadingStageDistribution. */}
      {stageDistribution && (
        <SectionWrapper theme="charius-beige" className="py-16 border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-8">
              <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase block mb-3">
                Where Learners Stand Today
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#111] leading-tight tracking-tight">
                Reading-stage distribution across {stageDistribution.totalLearners.toLocaleString()} learners
              </h2>
              <p className="text-gray-500 mt-3 text-base max-w-2xl mx-auto">
                Each learner counted once at their most-recent assessment. The lower the proficient share, the more support is needed.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
              {stageDistribution.bands.map((band) => (
                <div key={band.key} className="grid grid-cols-[160px_1fr_auto] items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">{band.label}</span>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-charius-orange rounded-full"
                      style={{ width: `${Math.max(band.sharePct, band.count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#111] tabular-nums whitespace-nowrap">
                    {band.sharePct}% <span className="text-gray-400 font-normal">({band.count.toLocaleString()})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* 4. Find the popular cause (Programs) */}
      <SectionWrapper theme="charius-beige" className="py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase block mb-3">
            Featured Programs
          </span>
          <h2 className="text-[40px] font-bold text-[#111] leading-tight tracking-tight">
            Find the popular cause
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Card 1 — Phonics: amount received from partners via finance_receipts */}
          <Link href="/phonics-training" className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-shadow block">
            <div className="relative h-64 w-full">
              <Image src="/photos/26.jpeg" alt="Phonics Training" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="p-8">
              <h3 className="text-xl font-bold text-[#111] leading-snug mb-8">
                The Learners Are Waiting For Your Phonics Support.
              </h3>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div
                  className="bg-charius-orange h-1.5 rounded-full transition-all"
                  style={{ width: `${programmeCards?.phonics.percent ?? 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[13px] font-semibold text-gray-500">
                <span>Raised: {programmeCards ? programmeCards.phonics.currentLabel : "—"}</span>
                <span>Goal: {programmeCards ? programmeCards.phonics.goalLabel : "—"}</span>
              </div>
            </div>
          </Link>

          {/* Card 2 — Coaching: completed coaching visits from portal_records */}
          <Link href="/in-school-coaching-mentorship" className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-shadow block">
            <div className="relative h-64 w-full">
              <Image src="/photos/Phonics%20Session%20for%20Teachers%20in%20Namasale%20Sub-County%20Amolatar.jpg" alt="In-school coaching" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="p-8">
              <h3 className="text-xl font-bold text-[#111] leading-snug mb-8">
                Changing lives one classroom at a time.
              </h3>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div
                  className="bg-[#006b61] h-1.5 rounded-full transition-all"
                  style={{ width: `${programmeCards?.coaching.percent ?? 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[13px] font-semibold text-gray-500">
                <span>Visits: {programmeCards ? programmeCards.coaching.currentLabel : "—"}</span>
                <span>Goal: {programmeCards ? programmeCards.coaching.goalLabel : "—"}</span>
              </div>
            </div>
          </Link>

          {/* Card 3 — Story Project: teachers trained on the 1001 Story programme */}
          <Link href="/story-project" className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-shadow block">
            <div className="relative h-64 w-full">
              <Image src="/photos/Amolatar%20District%20Literacy.jpg" alt="1001 Story Project" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="p-8">
              <h3 className="text-xl font-bold text-[#111] leading-snug mb-8">
                Let&apos;s be one community in this cause.
              </h3>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div
                  className="bg-red-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${programmeCards?.storyProject.percent ?? 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[13px] font-semibold text-gray-500">
                <span>Trained: {programmeCards ? programmeCards.storyProject.currentLabel : "—"}</span>
                <span>Goal: {programmeCards ? programmeCards.storyProject.goalLabel : "—"}</span>
              </div>
            </div>
          </Link>
        </div>
      </SectionWrapper>

      {/* 5. Volunteer / Testimonial Avatars */}
      <SectionWrapper theme="light" className="py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase block mb-3">
            Voices from the classroom
          </span>
          <h2 className="text-[40px] font-bold text-[#006b61] leading-tight tracking-tight">
            Read The Story of Change Happening in Schools
          </h2>
        </div>

        {/* Circular Avatars Row */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-16">
          {testimonialRows.length > 0 ? testimonialRows.map((q) => (
             <div key={q.id} className="flex flex-col items-center group">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-charius-orange transition-all shadow-md">
                   {/* Fallback avatar block for real data */}
                   <div className="w-full h-full bg-[#006b61]/10 flex items-center justify-center text-2xl font-bold text-[#006b61]">
                      {q.storytellerName?.[0] || "T"}
                   </div>
                </div>
                <div className="text-center">
                   <div className="font-bold text-[#111]">{q.storytellerName?.split(" ")[0]}</div>
                   <div className="text-xs text-gray-500 font-semibold">{q.storytellerRole || "Teacher"}</div>
                </div>
             </div>
          )) : (
             <div className="text-gray-500 font-medium">Stories are currently being curated.</div>
          )}
        </div>

        {/* Testimonial Quote Boxes Row */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
           {testimonialRows.slice(0, 3).map((q) => (
              <div key={q.id} className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm">
                 <div className="w-10 h-10 rounded-full bg-charius-orange text-white flex items-center justify-center font-serif text-2xl mb-6">
                   &quot;
                 </div>
                 <p className="text-gray-600 leading-relaxed text-[15px] mb-6 min-h-[100px]">
                   {clipQuote(q.storyText, 140)}
                 </p>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-[#111] font-bold text-sm">
                      {q.storytellerName?.[0]}
                    </div>
                    <div>
                       <div className="text-sm font-bold text-[#111]">{q.storytellerName}</div>
                       <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{q.schoolName || "Learner Impact"}</div>
                    </div>
                 </div>
              </div>
           ))}
        </div>

        {/* Call to Action for Schools */}
        <div className="mt-16 text-center flex justify-center">
          <Link
            href="/partner"
            className="relative inline-flex group"
          >
            {/* Glowing animated backing */}
            <div className="absolute transition-all duration-1000 opacity-60 -inset-px bg-gradient-to-r from-charius-orange via-[#ff7235] to-[#f49342] rounded-full blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-pulse"></div>
            {/* Core button */}
            <div className="relative inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white transition-all duration-200 bg-[#006b61] hover:bg-[#005a51] rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006b61] shadow-xl shadow-[#006b61]/30">
              Be Part of the Next Success Story!
              <svg className="w-6 h-6 ml-2 transition-transform duration-300 group-hover:translate-x-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </Link>
        </div>
      </SectionWrapper>

      {/* 6. Upcoming Events — rendered only when the schedule has real rows */}
      {upcomingEvents.length > 0 && (
        <section className="bg-[#006b61] py-24 relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-charius-beige" />
          <div className="max-w-6xl mx-auto px-6 relative z-10 text-center mb-12">
            <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase block mb-3">
              Let&apos;s help them together
            </span>
            <h2 className="text-[40px] font-bold text-white leading-tight tracking-tight">
              Join Our Upcoming Events
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6 relative z-20">
            {upcomingEvents.map((event, index) => {
              const { day, month } = formatEventDate(event.scheduledDate);
              const badgeColor =
                index === 0 ? "bg-charius-orange" : index === 1 ? "bg-[#006b61]" : "bg-red-500";
              const image =
                index === 0
                  ? "/photos/12.jpeg"
                  : index === 1
                  ? "/photos/17.jpeg"
                  : "/photos/13.jpeg";
              return (
                <Link
                  key={event.id}
                  href="/events"
                  className="bg-white rounded-xl overflow-hidden shadow-lg group hover:-translate-y-2 transition-transform block"
                >
                  <div className="relative h-48">
                    <Image
                      src={image}
                      alt={event.topic}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                    <div
                      className={`absolute top-4 left-4 ${badgeColor} w-12 h-14 rounded-b-md flex flex-col items-center justify-center text-white shadow-md`}
                    >
                      <span className="text-xl font-bold leading-none">{day}</span>
                      <span className="text-[10px] uppercase font-semibold">{month}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-[#111] mb-2 group-hover:text-[#006b61] transition-colors">
                      {event.topic}
                      {event.district ? ` — ${event.district}` : ""}
                    </h3>
                    <p className="text-gray-500 text-sm flex items-center gap-2 font-medium">
                      <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px]">
                        ⏰
                      </span>
                      {formatEventTimeRange(event)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </>
  );
}
