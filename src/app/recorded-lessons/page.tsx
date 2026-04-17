import { Metadata } from "next";
import Link from "next/link";
import { PlayCircle, GraduationCap, Video } from "lucide-react";
import { listRecordedLessonsPostgres } from "@/lib/server/postgres/repositories/recorded-lessons";
import { SectionWrapper } from "@/components/public/SectionWrapper";

export const metadata: Metadata = {
  title: "Recorded Lessons Library | OzekiRead",
  description: "Replay past phonics and literacy training sessions directly from our embedded digital library.",
};

export const revalidate = 60; // 1 minute cache

export default async function RecordedLessonsIndex() {
  let lessons: Record<string, unknown>[] = [];
  try {
    // Only fetch published ones for the public
    lessons = await listRecordedLessonsPostgres({ isPublished: true });
  } catch (error) {
    console.error("Failed to load recorded lessons", error);
  }

  return (
    <div className="bg-white min-h-screen pt-20 pb-24">
       <SectionWrapper theme="off-white">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#0a2a34] tracking-tight mb-4">
              Recorded Lessons Library
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Missed a live Phonics training or classroom demonstration? Catch up through our structured video library.
            </p>
          </div>

          {lessons.length === 0 ? (
             <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
               <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
               <h3 className="text-xl font-bold text-gray-900 mb-2">No Videos Available</h3>
               <p className="text-gray-500">Recordings are currently being processed or no sessions have been published yet.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {lessons.map(lesson => (
                 <Link href={`/recorded-lessons/${lesson.slug}`} key={lesson.id} className="group block h-full">
                    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
                       
                       {/* Video Thumbnail Placeholder (Uses default gradient if no vimeo thumbnail detected) */}
                       <div className="aspect-video bg-gradient-to-tr from-brand-primary/90 to-[#2A5C55] w-full relative flex items-center justify-center overflow-hidden">
                          {lesson.thumbnailUrl && (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img src={lesson.thumbnailUrl} alt={lesson.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                          )}
                          <PlayCircle className="w-16 h-16 text-white opacity-90 group-hover:scale-110 transition-transform shadow-sm rounded-full" />
                          
                          {/* Badges */}
                          <div className="absolute top-4 left-4 flex flex-col gap-2">
                             {lesson.phonicsLevel && (
                               <span className="bg-white text-brand-primary text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                                 {lesson.phonicsLevel}
                               </span>
                             )}
                          </div>
                          {lesson.duration && (
                             <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded backdrop-blur-md">
                               {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                             </div>
                          )}
                       </div>

                       <div className="p-6 flex-grow flex flex-col">
                          <h3 className="text-xl font-bold text-[#0a2a34] mb-2 line-clamp-2">{lesson.title}</h3>
                          
                          {lesson.teacherName && (
                            <div className="flex items-center text-sm font-medium text-gray-500 mb-4">
                              <GraduationCap className="w-4 h-4 mr-1.5" />
                              {lesson.teacherName}
                            </div>
                          )}

                          <p className="text-gray-600 text-sm line-clamp-3 mb-6 flex-grow">
                             {lesson.description || "No description provided."}
                          </p>

                          <div className="flex items-center justify-between text-xs font-semibold text-gray-400 mt-auto pt-4 border-t border-gray-50">
                             <span>{lesson.classLevel || 'General Concept'}</span>
                             <span>{new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric'}).format(new Date(lesson.createdAt))}</span>
                          </div>
                       </div>
                    </div>
                 </Link>
              ))}
            </div>
          )}
       </SectionWrapper>
    </div>
  );
}
