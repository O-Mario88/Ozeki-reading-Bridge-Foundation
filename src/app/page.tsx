import Link from "next/link";
import Image from "next/image";
import { organizationName, tagline } from "@/lib/content";
import { isPostgresConfigured } from "@/lib/server/postgres/client";
import { listPublishedPortalTestimonialsPostgres } from "@/lib/server/postgres/repositories/public-content";
import type { PortalTestimonialRecord } from "@/lib/types";

import { SectionWrapper } from "@/components/public/SectionWrapper";
import { getImpactSummary } from "@/services/dataService";
import { ChariusPillImage } from "@/components/public/ChariusPillImage";

export const revalidate = 300;

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
  const impactStats = { schools: "0", assessments: "0", teachers: "0" };

  if (isPostgresConfigured()) {
    try {
      testimonialRows = (await listPublishedPortalTestimonialsPostgres(90))
        .filter(
          (item) =>
            item.sourceType === "training_feedback" &&
            TESTIMONIAL_FIELDS.has(String(item.quoteField ?? "")),
        )
        .slice(0, 4); // Show 4 for the circular avatar design

      const summary = await getImpactSummary();
      const formatStat = (val: number) => {
        if (val > 1000) return `${(val / 1000).toFixed(1)}k`;
        return val.toLocaleString();
      };

      const getMetric = (labelMatched: string) => {
        const found = summary.metrics.find(m => m.label === labelMatched);
        return found && found.value > 0 ? formatStat(found.value) : null;
      };

      impactStats.schools = getMetric("Schools trained") || "120+";
      impactStats.assessments = getMetric("Learners assessed") || "15k+";
      impactStats.teachers = getMetric("Teachers trained") || "800+";

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

      {/* 3. Stat Banner */}
      <div className="w-full bg-white border-t border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100/50">
            <div className="text-center px-4">
              <div className="text-5xl font-bold text-[#111] tabular-nums mb-2">{impactStats.schools}</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Schools</div>
            </div>
            <div className="text-center px-4">
              <div className="text-5xl font-bold text-[#111] tabular-nums mb-2">{impactStats.assessments}</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Assessed</div>
            </div>
            <div className="text-center px-4">
              <div className="text-5xl font-bold text-[#111] tabular-nums mb-2">{impactStats.teachers}</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Happy Teachers</div>
            </div>
            <div className="text-center px-4">
              <div className="text-5xl font-bold text-[#111] tabular-nums mb-2">3</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Years of Impact</div>
            </div>
          </div>
        </div>
      </div>

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
          {/* Card 1 */}
          <Link href="/phonics-training" className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-shadow block">
            <div className="relative h-64 w-full">
              <Image src="/photos/26.jpeg" alt="Phonics Training" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="p-8">
              <h3 className="text-xl font-bold text-[#111] leading-snug mb-8">
                The Learners Are Waiting For Your Phonics Support.
              </h3>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div className="bg-charius-orange h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <div className="flex justify-between items-center text-[13px] font-semibold text-gray-500">
                <span>Raised: $8,500</span>
                <span>Goal: $10,000</span>
              </div>
            </div>
          </Link>
          
          {/* Card 2 */}
          <Link href="/in-school-coaching-mentorship" className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-shadow block">
            <div className="relative h-64 w-full">
              <Image src="/photos/Phonics%20Session%20for%20Teachers%20in%20Namasale%20Sub-County%20Amolatar.jpg" alt="In-school coaching" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="p-8">
              <h3 className="text-xl font-bold text-[#111] leading-snug mb-8">
                Changing lives one classroom at a time.
              </h3>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div className="bg-[#006b61] h-1.5 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <div className="flex justify-between items-center text-[13px] font-semibold text-gray-500">
                <span>Raised: 60%</span>
                <span>Goal: 100%</span>
              </div>
            </div>
          </Link>

          {/* Card 3 */}
          <Link href="/story-project" className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-shadow block">
            <div className="relative h-64 w-full">
              <Image src="/photos/Amolatar%20District%20Literacy.jpg" alt="1001 Story Project" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="p-8">
              <h3 className="text-xl font-bold text-[#111] leading-snug mb-8">
                Let&apos;s be one community in this cause.
              </h3>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
              </div>
              <div className="flex justify-between items-center text-[13px] font-semibold text-gray-500">
                <span>Trained: 450</span>
                <span>Goal: 1,000</span>
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
          <h2 className="text-[40px] font-bold text-[#111] leading-tight tracking-tight">
            Meet Our Volunteers Behind the Success Story
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
      </SectionWrapper>

      {/* 6. Upcoming Events (Charius dark green block with cards overlapping) */}
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
            {/* Event 1 */}
            <Link href="/events" className="bg-white rounded-xl overflow-hidden shadow-lg group hover:-translate-y-2 transition-transform block">
               <div className="relative h-48">
                  <Image src="/photos/12.jpeg" alt="Phonics Training Workshop" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                  <div className="absolute top-4 left-4 bg-charius-orange w-12 h-14 rounded-b-md flex flex-col items-center justify-center text-white shadow-md">
                     <span className="text-xl font-bold leading-none">22</span>
                     <span className="text-[10px] uppercase font-semibold">Jan</span>
                  </div>
               </div>
               <div className="p-6">
                 <h3 className="font-bold text-lg text-[#111] mb-2 group-hover:text-[#006b61] transition-colors">Phonics Training Workshop — Northern Uganda</h3>
                 <p className="text-gray-500 text-sm flex items-center gap-2 font-medium">
                    <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px]">⏰</span>
                    9:00am - 4:00pm
                 </p>
               </div>
            </Link>

            {/* Event 2 */}
            <Link href="/events" className="bg-white rounded-xl overflow-hidden shadow-lg group hover:-translate-y-2 transition-transform block">
               <div className="relative h-48">
                  <Image src="/photos/17.jpeg" alt="Reading Assessment Day" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                  <div className="absolute top-4 left-4 bg-[#006b61] w-12 h-14 rounded-b-md flex flex-col items-center justify-center text-white shadow-md">
                     <span className="text-xl font-bold leading-none">15</span>
                     <span className="text-[10px] uppercase font-semibold">Feb</span>
                  </div>
               </div>
               <div className="p-6">
                 <h3 className="font-bold text-lg text-[#111] mb-2 group-hover:text-[#006b61] transition-colors">Learner Reading Assessment Day — District Cluster</h3>
                 <p className="text-gray-500 text-sm flex items-center gap-2 font-medium">
                    <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px]">⏰</span>
                    10:00am - 2:00pm
                 </p>
               </div>
            </Link>

            {/* Event 3 */}
            <Link href="/events" className="bg-white rounded-xl overflow-hidden shadow-lg group hover:-translate-y-2 transition-transform block">
               <div className="relative h-48">
                  <Image src="/photos/13.jpeg" alt="Coaching and Mentorship Visit" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                  <div className="absolute top-4 left-4 bg-red-500 w-12 h-14 rounded-b-md flex flex-col items-center justify-center text-white shadow-md">
                     <span className="text-xl font-bold leading-none">05</span>
                     <span className="text-[10px] uppercase font-semibold">Mar</span>
                  </div>
               </div>
               <div className="p-6">
                 <h3 className="font-bold text-lg text-[#111] mb-2 group-hover:text-[#006b61] transition-colors">In-School Coaching & Mentorship Visit</h3>
                 <p className="text-gray-500 text-sm flex items-center gap-2 font-medium">
                    <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px]">⏰</span>
                    8:00am - 12:00pm
                 </p>
               </div>
            </Link>
         </div>
      </section>

    </>
  );
}
