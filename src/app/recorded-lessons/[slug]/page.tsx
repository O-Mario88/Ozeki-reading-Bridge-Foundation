import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, GraduationCap, Clock, Share2 } from "lucide-react";
import { getRecordedLessonBySlugPostgres } from "@/lib/server/postgres/repositories/recorded-lessons";
import { queryPostgres } from "@/lib/server/postgres/client";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { TelemetryPlayer } from "@/components/public/TelemetryPlayer";
import { LessonRatingForm } from "@/components/public/LessonRatingForm";
import { LessonQuizForm } from "@/components/public/LessonQuizForm";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getRecordedLessonBySlugPostgres(slug);
  
  if (!lesson) {
    return { title: "Lesson Not Found" };
  }

  return {
    title: `${lesson.title} | OzekiRead Recorded Lessons`,
    description: lesson.description || "Watch this recorded session on OzekiRead.",
  };
}

export default async function RecordedLessonPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = await getRecordedLessonBySlugPostgres(slug);

  if (!lesson || !lesson.isPublished) {
    notFound();
  }

  // Fetch Associated Quiz block if exists for Certification
  let quizData = null;
  let questionsData = [];
  if (lesson.quizRequired || lesson.certificateEligible) {
     const quizRes = await queryPostgres(
        `SELECT id, title FROM lesson_quizzes WHERE recorded_lesson_id = $1 LIMIT 1`, 
        [lesson.id]
     );
     if (quizRes.rowCount > 0) {
        quizData = quizRes.rows[0];
        const qRes = await queryPostgres(
           `SELECT id, question_text, options_json FROM lesson_quiz_questions WHERE quiz_id = $1`, 
           [quizData.id]
        );
        questionsData = qRes.rows;
     }
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-20 pb-24">
      {/* Premium Dark Header Background for Player */}
      <div className="bg-[#0a2a34] text-white pt-12 pb-32">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
           <Link href="/recorded-lessons" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-8 font-medium text-sm">
             <ArrowLeft className="w-4 h-4 mr-2" />
             Back to Library
           </Link>
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                 <div className="flex flex-wrap gap-2 mb-4">
                   {lesson.phonicsLevel && <span className="bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-full">{lesson.phonicsLevel}</span>}
                   {lesson.classLevel && <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">{lesson.classLevel}</span>}
                 </div>
                 <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{lesson.title}</h1>
                 <div className="flex items-center gap-6 text-sm text-gray-300 font-medium">
                    {lesson.teacherName && (
                       <div className="flex items-center"><GraduationCap className="w-4 h-4 mr-2"/> Trainer: {lesson.teacherName}</div>
                    )}
                    <div className="flex items-center"><Clock className="w-4 h-4 mr-2"/> {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric'}).format(new Date(lesson.createdAt))}</div>
                 </div>
              </div>
              <button className="flex items-center justify-center bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-white/10">
                <Share2 className="w-4 h-4 mr-2"/> Share
              </button>
           </div>
        </div>
      </div>

      <SectionWrapper className="-mt-24">
        <div className="max-w-6xl mx-auto">
           {/* Main Video Player Embed Container */}
           <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 mb-8">
             {lesson.vimeoEmbedUrl ? (
                <TelemetryPlayer vimeoEmbedUrl={lesson.vimeoEmbedUrl} lessonId={lesson.id} />
             ) : (
                <div className="relative w-full pb-[56.25%] bg-gray-900 flex items-center justify-center flex-col text-center p-8">
                   <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                     <BookOpen className="w-10 h-10 text-gray-500" />
                   </div>
                   <h3 className="text-xl font-bold text-white mb-2">Video Processing</h3>
                   <p className="text-gray-400 max-w-sm mx-auto">This lesson is currently syncing from Google Drive to Vimeo. Check back shortly to watch the playback.</p>
                </div>
             )}

             <div className="p-8 md:p-12">
               <h2 className="text-2xl font-bold text-[#0a2a34] mb-6 border-b pb-4 border-gray-100">About this Session</h2>
               <div className="prose prose-lg text-gray-600 max-w-none mb-12">
                 {lesson.description ? (
                   <p className="whitespace-pre-wrap">{lesson.description}</p>
                 ) : (
                   <p className="italic text-gray-400">No detailed description has been provided for this session yet.</p>
                 )}
               </div>

               {/* Mastery Check / Certification Quizzes */}
               {quizData && questionsData.length > 0 && (
                  <LessonQuizForm 
                     lessonId={lesson.id} 
                     quizId={quizData.id} 
                     title={quizData.title} 
                     questions={questionsData} 
                  />
               )}

               {/* Post-Lesson Engagement Blocks */}
               <LessonRatingForm lessonId={lesson.id} />
             </div>
           </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
