import { queryPostgres } from "@/lib/server/postgres/client";
import { notFound } from "next/navigation";
import { VimeoTracker } from "@/components/public/lms/VimeoTracker";

interface Props {
  params: Promise<{ "lesson-slug": string }>;
}

export default async function RecordedLessonDetail({ params }: Props) {
  const { "lesson-slug": lessonSlug } = await params;

  let lesson = null;
  try {
    const res = await queryPostgres(`
      SELECT 
        l.id, l.lesson_slug, l.title, l.description, l.level, l.class_target, 
        l.vimeo_video_id, l.duration_seconds, l.thumbnail_url, l.average_rating, l.total_views,
        t.full_name as teacher_name
      FROM recorded_lessons l
      LEFT JOIN teachers_directory t ON l.teacher_id = t.id
      WHERE l.lesson_slug = $1 AND l.status = 'Published'
    `, [lessonSlug]);
    lesson = res.rows[0];
  } catch (error) {
    console.error("Failed to load lesson:", error);
  }

  if (!lesson) return notFound();

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      
      {/* Video Hero Block */}
      <div className="bg-ozeki-dark border-b border-emerald-900 shadow-lg">
        <div className="max-w-5xl mx-auto pt-8 pb-12 px-4 shadow-[0_0_100px_rgba(0,107,97,0.15)]">
          
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <span className="ozeki-badge bg-emerald-900 text-emerald-100 ring-1 ring-emerald-700/50">{lesson.level || "General"}</span>
              {lesson.class_target && <span className="ozeki-badge bg-slate-800 text-amber-500 ring-1 ring-slate-700">{lesson.class_target}</span>}
            </div>
            <div className="text-emerald-100 flex items-center gap-3 font-medium text-sm">
              <span className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">👁 {lesson.total_views} Views</span>
              <span className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700 text-amber-400">★ {lesson.average_rating || "New"}</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
            {lesson.title}
          </h1>

          {/* VIMEO TELEMETRY INTEGRATION */}
          <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            <VimeoTracker vimeoId={lesson.vimeo_video_id} lessonId={lesson.id} teacherId={0} />
          </div>

        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Description */}
          <div className="lg:col-span-2 space-y-8">
            <div className="ozeki-card">
              <h2 className="text-2xl font-bold font-display text-slate-800 mb-4 border-b pb-3">About This Lesson</h2>
              <p className="text-slate-600 leading-relaxed text-[1.05rem]">
                {lesson.description || "Join our certified Master Instructor as they demonstrate comprehensive structured literacy strategies inside a live classroom setting."}
              </p>
            </div>

            <div className="ozeki-card">
              <h2 className="text-xl font-bold font-display text-slate-800 mb-4">Complete the Learning Journey</h2>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 flex gap-4">
                <span className="text-2xl">🎓</span>
                <div>
                  <h4 className="font-bold mb-1">Earn Your Certificate</h4>
                  <p className="text-sm">To earn your certification, you must watch at least 90% of this recording. Your progress is being securely tracked. Once completed, a prompt will appear below.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Instructor Info */}
          <div className="space-y-6">
            <div className="ozeki-card">
              <h3 className="font-bold font-display text-slate-800 mb-4 border-b pb-2">Instructor</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-ozeki-primary text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                  {lesson.teacher_name ? lesson.teacher_name[0] : "O"}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{lesson.teacher_name || "Ozeki Instructor"}</h4>
                  <p className="text-slate-500 text-sm">Master Coach</p>
                </div>
              </div>
              <button className="ozeki-btn ozeki-btn-secondary w-full text-sm">View Instructor Profile</button>
            </div>

            <div className="ozeki-card border-emerald-100 bg-emerald-50/50">
              <h3 className="font-bold font-display text-emerald-900 mb-2">Request In-Person Coaching</h3>
              <p className="text-sm text-emerald-700/80 mb-4">Did you enjoy this session? Request an expert to visit your school physically.</p>
              <button className="ozeki-btn w-full bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm border border-emerald-700 text-sm">Book School Service</button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
