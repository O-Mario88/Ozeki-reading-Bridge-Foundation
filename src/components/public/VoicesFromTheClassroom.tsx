import Image from "next/image";
import { PremiumCard } from "@/components/public/PremiumCard";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { listPublishedPortalTestimonialsPostgres } from "@/lib/server/postgres/repositories/public-content";

export async function VoicesFromTheClassroom() {
  const testimonials = await listPublishedPortalTestimonialsPostgres(3);

  // If no testimonials are available in the DB, we shouldn't render an empty section.
  // We can render a fallback or return null. 
  // Given the previous hardcoded ones, we will render the hardcoded ones as a robust fallback.
  if (testimonials.length === 0) {
    return (
      <SectionWrapper theme="light" id="voices">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-brand-primary mb-6 font-bold">Voices from the classroom</h2>
          <p className="text-xl text-gray-600 leading-relaxed font-sans">
            Hear directly from teachers who are transforming their classrooms using Ozeki's practical phonics and coaching.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <PremiumCard className="p-8 flex flex-col items-center text-center" withHover>
            <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-brand-primary/10 shadow-lg">
              <Image src="/photos/PXL_20260218_140233638.jpg" alt="Teacher" width={96} height={96} className="w-full h-full object-cover" />
            </div>
            <p className="text-gray-600 italic mb-6 leading-relaxed">"The phonics routines have completely transformed how my learners decode words. I see progress every single day."</p>
            <h4 className="font-bold text-brand-primary text-lg">Madam Sarah</h4>
            <span className="text-sm text-brand-primary font-medium">P.1 Teacher</span>
          </PremiumCard>
          
          <PremiumCard className="p-8 flex flex-col items-center text-center" withHover>
            <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-brand-primary/10 shadow-lg">
              <Image src="/photos/PXL_20260218_135704961.jpg" alt="Teacher" width={96} height={96} className="w-full h-full object-cover" />
            </div>
            <p className="text-gray-600 italic mb-6 leading-relaxed">"With the coaching support, I now know exactly how to correct blending errors instantly. My confidence has grown."</p>
            <h4 className="font-bold text-brand-primary text-lg">Mr. Daniel</h4>
            <span className="text-sm text-brand-primary font-medium">P.2 Teacher</span>
          </PremiumCard>

          <PremiumCard className="p-8 flex flex-col items-center text-center" withHover>
            <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-brand-primary/10 shadow-lg">
              <Image src="/photos/PXL_20260218_134438769.jpg" alt="Teacher" width={96} height={96} className="w-full h-full object-cover" />
            </div>
            <p className="text-gray-600 italic mb-6 leading-relaxed">"Our school's reading levels have improved dramatically since we implemented the daily reading routines."</p>
            <h4 className="font-bold text-brand-primary text-lg">Madam Grace</h4>
            <span className="text-sm text-brand-primary font-medium">Headteacher</span>
          </PremiumCard>
        </div>
      </SectionWrapper>
    );
  }

  // Render the real ones from DB
  return (
    <SectionWrapper theme="light" id="voices">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h2 className="font-serif text-4xl md:text-5xl text-brand-primary mb-6 font-bold">Voices from the classroom</h2>
        <p className="text-xl text-gray-600 leading-relaxed font-sans">
          Hear directly from teachers who are transforming their classrooms using Ozeki's practical phonics and coaching.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {testimonials.slice(0, 3).map((item) => (
          <PremiumCard key={item.id} className="p-8 flex flex-col items-center text-center" withHover>
            {item.photoFileName || item.photoStoredPath || item.youtubeThumbnailUrl ? (
              <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-brand-primary/10 shadow-lg shrink-0">
                <Image 
                  src={
                    item.photoFileName 
                      ? `/api/testimonials/${item.id}/photo` 
                      : (item.youtubeThumbnailUrl || "/images/placeholder-avatar.jpg")
                  } 
                  alt={item.storytellerName} 
                  width={96} 
                  height={96} 
                  className="w-full h-full object-cover" 
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-brand-primary/10 shadow-lg flex items-center justify-center bg-brand-primary/5 text-brand-primary shrink-0">
                <span className="text-3xl font-bold">{item.storytellerName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            
            <p className="text-gray-600 italic mb-6 leading-relaxed relative flex-1">
              "{item.quoteField && item.quoteField.length > 5 ? item.quoteField : item.storyText}"
            </p>
            
            <div className="mt-auto">
              <h4 className="font-bold text-brand-primary text-lg">{item.storytellerName}</h4>
              <span className="text-sm text-brand-primary font-medium">{item.storytellerRole}</span>
              {item.schoolName && (
                <div className="text-xs text-gray-500 mt-1">{item.schoolName}</div>
              )}
            </div>
          </PremiumCard>
        ))}
      </div>
    </SectionWrapper>
  );
}
