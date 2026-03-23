import Link from "next/link";
import { getMediaShowcase } from "@/lib/media-showcase";
import { allUgandaDistricts, inferRegionFromDistrict, ugandaRegions } from "@/lib/uganda-locations";
import { buildVideoThumbnailFallback } from "@/lib/media-placeholders";
import { CTAStrip } from "@/components/public/CTAStrip";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { Play, Sparkles } from "lucide-react";

export const metadata = {
  title: "Gallery of Impact",
  description:
    "Explore beautiful, authentic moments of change spanning classrooms, communities, and coaching sessions across Uganda.",
};

export const dynamic = "force-dynamic";

function normalizeValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

type ActivityType = "Training" | "Coaching" | "Assessments" | "Materials" | "Story Project";

function inferActivityType(caption: string, kind: "photo" | "video"): ActivityType {
  const text = caption.toLowerCase();
  if (text.includes("coach")) return "Coaching";
  if (text.includes("assessment")) return "Assessments";
  if (text.includes("story")) return "Story Project";
  if (text.includes("material") || text.includes("reader")) return "Materials";
  if (kind === "video") return "Coaching";
  return "Training";
}

function inferDistrict(caption: string) {
  const lower = caption.toLowerCase();
  return allUgandaDistricts.find((district) => lower.includes(district.toLowerCase())) ?? null;
}

function inferYear(caption: string) {
  const matched = caption.match(/(20\d{2})/);
  return matched?.[1] ?? "Unspecified";
}

function toYouTubeWatchUrl(embedUrl: string | null, videoId: string | null) {
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (!embedUrl) {
    return "https://www.youtube.com/@ozekiRead";
  }
  const matched = embedUrl.match(/\/embed\/([^?&/]+)/i);
  if (matched?.[1]) {
    return `https://www.youtube.com/watch?v=${matched[1]}`;
  }
  return "https://www.youtube.com/@ozekiRead";
}

export default async function ImpactGalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedYear = normalizeValue(params.year);
  const selectedRegion = normalizeValue(params.region);
  const selectedActivity = normalizeValue(params.activity);

  const mediaShowcase = await getMediaShowcase();
  const items = mediaShowcase.featuredItems.map((item) => {
    const district = inferDistrict(item.caption);
    const region = district ? inferRegionFromDistrict(district) : null;
    return {
      ...item,
      activity: inferActivityType(item.caption, item.kind),
      district,
      region,
      year: inferYear(item.caption),
    };
  });

  const years = [...new Set(items.map((item) => item.year))].sort((a, b) => b.localeCompare(a));
  const activities: ActivityType[] = ["Training", "Coaching", "Assessments", "Materials", "Story Project"];

  const filtered = items.filter((item) => {
    const yearOk = !selectedYear || selectedYear === item.year;
    const regionOk = !selectedRegion || selectedRegion === item.region;
    const activityOk = !selectedActivity || selectedActivity === item.activity;
    return yearOk && regionOk && activityOk;
  });

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[var(--tw-colors-brand-background,#FAFAFA)]">
      <main className="flex-grow pt-[72px] md:pt-20">
        
        {/* Cinematic Hero Section */}
        <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-white via-brand-background to-brand-background pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FA7D15]/5 blur-3xl pointer-events-none" />
          
          <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#006b61] font-bold text-xs uppercase tracking-widest mb-8 shadow-sm border border-gray-100">
              <Sparkles className="w-4 h-4 text-[#FA7D15]" /> Gallery of Impact
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-8">
              Moments <br className="hidden sm:block" />
              <span className="text-gray-400 font-light italic">of</span> Change
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
              Beautiful, verified glimpses of our literacy mission spanning classrooms, communities, and coaching sessions across Uganda.
            </p>
          </div>
        </section>

        {/* Elegant Discovery UI */}
        <section className="py-6 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-[72px] md:top-20 z-40 shadow-sm transition-all">
          <div className="container mx-auto px-4 max-w-[1400px]">
            <form method="GET" className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest hidden lg:block shrink-0">
                Filter Gallery
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide flex-nowrap">
                <select name="year" defaultValue={selectedYear} className="bg-white border border-gray-200 text-gray-600 font-medium text-sm rounded-full px-5 py-2.5 outline-none hover:border-[#FA7D15] hover:text-gray-900 transition-colors focus:ring-4 focus:ring-[#FA7D15]/10 appearance-none cursor-pointer">
                  <option value="">All Years</option>
                  {years.map((year) => <option value={year} key={year}>{year}</option>)}
                </select>
                
                <select name="region" defaultValue={selectedRegion} className="bg-white border border-gray-200 text-gray-600 font-medium text-sm rounded-full px-5 py-2.5 outline-none hover:border-[#FA7D15] hover:text-gray-900 transition-colors focus:ring-4 focus:ring-[#FA7D15]/10 appearance-none cursor-pointer">
                  <option value="">All Regions</option>
                  {ugandaRegions.map((region) => <option value={region.region} key={region.region}>{region.region}</option>)}
                </select>
                
                <select name="activity" defaultValue={selectedActivity} className="bg-white border border-gray-200 text-gray-600 font-medium text-sm rounded-full px-5 py-2.5 outline-none hover:border-[#FA7D15] hover:text-gray-900 transition-colors focus:ring-4 focus:ring-[#FA7D15]/10 appearance-none cursor-pointer">
                  <option value="">All Categories</option>
                  {activities.map((activity) => <option value={activity} key={activity}>{activity}</option>)}
                </select>

                <button type="submit" className="shrink-0 bg-gray-900 text-white font-bold text-sm rounded-full px-7 py-2.5 hover:bg-[#FA7D15] hover:shadow-lg hover:shadow-[#FA7D15]/20 transition-all ml-1">
                  Apply
                </button>

                {(selectedYear || selectedRegion || selectedActivity) && (
                  <Link href="/impact/gallery" className="shrink-0 text-sm font-semibold text-gray-400 hover:text-gray-900 px-3 transition-colors underline-offset-4 hover:underline">
                    Clear
                  </Link>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* Spacious Masonry Gallery */}
        <section className="py-16 lg:py-24 px-4 container mx-auto max-w-[1400px]">
          
          <div className="mb-12 flex items-center justify-between border-b border-gray-100 pb-4">
             <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <span>{filtered.length} {filtered.length === 1 ? 'Moment' : 'Moments'} Documented</span>
                {selectedRegion && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <span className="text-[#006b61]">{selectedRegion} Region</span>
                  </>
                )}
             </div>
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
            {filtered.map((item) => (
              <PremiumCard 
                key={item.id} 
                className="break-inside-avoid p-0 overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:border-gray-200 transition-all duration-300 group rounded-[1.5rem]" 
                withHover={false}
              >
                {/* Visual Asset Wrapper */}
                <div className="relative overflow-hidden bg-gray-50 aspect-[4/3] sm:aspect-auto">
                  {item.kind === "photo" ? (
                    <img 
                      src={item.url} 
                      alt={item.alt} 
                      loading="lazy" 
                      decoding="async" 
                      className="w-full h-full object-cover block group-hover:scale-105 transition-transform duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)]" 
                    />
                  ) : (
                    <a
                      className="block absolute inset-0 group-hover:scale-105 transition-transform duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
                      href={toYouTubeWatchUrl(item.youtubeEmbedUrl, item.youtubeVideoId)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Watch ${item.alt} on YouTube`}
                    >
                      <img
                        src={
                          item.youtubeThumbnailUrl ||
                          (item.youtubeVideoId
                            ? `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`
                            : buildVideoThumbnailFallback(`impact-gallery-${item.id}`, "Video thumbnail unavailable"))
                        }
                        alt={item.alt}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover block"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 group-hover:bg-gray-900/30 transition-colors duration-500">
                        <div className="w-16 h-16 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-[#FA7D15] shadow-xl transform group-hover:scale-110 group-hover:bg-[#FA7D15] group-hover:text-white transition-all duration-300">
                          <Play className="w-6 h-6 ml-1" fill="currentColor" />
                        </div>
                      </div>
                    </a>
                  )}
                </div>

                {/* Editorial Content */}
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-bold tracking-[0.15em] uppercase text-[#FA7D15]">
                    <span>{item.activity}</span>
                    {item.year !== 'Unspecified' && (
                       <>
                         <span className="text-gray-300">•</span>
                         <span className="text-[#006b61]">{item.year}</span>
                       </>
                    )}
                  </div>
                  
                  <p className="text-gray-900 leading-snug font-medium mb-6 text-[1.1rem]">
                    {item.caption}
                  </p>
                  
                  {item.quote && (
                    <div className="border-l-[3px] border-gray-100 pl-4 mb-6 relative">
                      <span className="absolute -left-3 -top-2 text-4xl text-gray-200 font-serif leading-none">"</span>
                      <p className="italic text-gray-500 font-medium text-[0.95rem] leading-relaxed relative z-10 w-full pt-2">
                        {item.quote}
                      </p>
                    </div>
                  )}
                  
                  <div className="pt-5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                     <span className="flex flex-col gap-1">
                       <strong className="text-gray-900 block">{item.person}</strong>
                       {item.role && <span className="font-medium text-gray-400">{item.role}</span>}
                     </span>
                     {item.region && (
                       <span className="text-right flex flex-col gap-1">
                         <span className="text-gray-400 font-medium">Region</span>
                         <span className="text-[#006b61]">{item.region}</span>
                       </span>
                     )}
                  </div>
                </div>
              </PremiumCard>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-32 max-w-lg mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Sparkles className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-2xl font-bold text-gray-900 mb-3">No moments found</h3>
               <p className="text-gray-500 text-lg leading-relaxed">
                 We couldn't find any media matching your exact filters. Try broadening your selection.
               </p>
               <button 
                 onClick={() => { window.location.href = "/impact/gallery"; }} 
                 className="mt-8 text-[#006b61] font-bold hover:underline underline-offset-4"
               >
                 Clear all filters
               </button>
            </div>
          )}
        </section>

        {/* Stories & Closing CTA */}
        <CTAStrip 
          heading="Dive deeper into the stories."
          subheading="Read complete field reports and learner-authored pieces in the 1001 Story Library."
          primaryButtonText="Read the Stories"
          primaryButtonHref="/stories"
          secondaryButtonText="Partner With Us"
          secondaryButtonHref="/partner-with-us"
          theme="brand"
        />

      </main>
    </div>
  );
}
