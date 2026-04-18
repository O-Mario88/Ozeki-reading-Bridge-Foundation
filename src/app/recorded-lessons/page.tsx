import Link from "next/link";
import { queryPostgres } from "@/lib/server/postgres/client";

export const metadata = {
  title: "Recorded Lessons Library",
  description: "Browse high-quality phonics and instructional leadership recordings for continuous professional development.",
};

// Next.js config to force dynamic fetching for Live LMS grids
export const dynamic = "force-dynamic";

interface LessonRow {
  lesson_slug: string;
  title: string;
  description: string | null;
  level: string | null;
  class_target: string | null;
  duration_seconds: number;
  thumbnail_url: string | null;
  average_rating: number | null;
  total_views: number;
  teacher_name: string | null;
}

export default async function RecordedLessonsIndex() {
  let lessons: LessonRow[] = [];
  try {
    const res = await queryPostgres(`
      SELECT 
        l.lesson_slug, l.title, l.description, l.level, l.class_target, 
        l.duration_seconds, l.thumbnail_url, l.average_rating, l.total_views,
        t.full_name as teacher_name
      FROM recorded_lessons l
      LEFT JOIN teachers_directory t ON l.teacher_id = t.id
      WHERE l.status = 'Published'
      ORDER BY l.created_at DESC
    `);
    lessons = (res.rows || []) as LessonRow[];
  } catch (error) {
    console.error("Failed to fetch recorded lessons:", error);
    // Ignore error for visual rendering, will display empty state natively.
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="bg-ozeki-dark text-white pt-24 pb-16 px-6 lg:px-12 relative overflow-hidden">
        {/* Abstract Deco */}
        <div className="absolute top-0 inset-x-0 h-full w-full pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight mb-6 text-white text-balance">
            Premium Recorded Lessons Library
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto font-medium">
            Extend your literacy impact. Watch expertly crafted demonstrations and structured pedagogy strategies anywhere, anytime.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        
        {/* Premium Tools Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-12 justify-between items-center">
          <div className="w-full md:w-96 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search by title, level, or topic..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2 self-start md:self-auto">
            <select className="py-3 px-4 rounded-xl border border-slate-200 bg-white shadow-sm font-medium focus:ring-2 focus:ring-emerald-600">
              <option>All Levels</option>
              <option>Primary 1</option>
              <option>Primary 2</option>
              <option>Leadership</option>
            </select>
            <select className="py-3 px-4 rounded-xl border border-slate-200 bg-white shadow-sm font-medium focus:ring-2 focus:ring-emerald-600">
              <option>Most Recent</option>
              <option>Highest Rated</option>
              <option>Most Viewed</option>
            </select>
          </div>
        </div>

        {/* LMS Grid System */}
        {lessons.length === 0 ? (
          <div className="ozeki-card text-center py-20 flex flex-col items-center justify-center border-dashed border-2">
            <span className="text-5xl mb-4">📚</span>
            <h3 className="text-2xl font-bold font-display text-slate-800 mb-2">No Lessons Available Yet</h3>
            <p className="text-slate-500 max-w-md">Our expert coaches are actively recording structural literacy lessons. Please check back next week for fresh content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lessons.map((lesson) => (
              <Link key={lesson.lesson_slug} href={`/recorded-lessons/${lesson.lesson_slug}`} className="group relative block focus:outline-none">
                <article className="ozeki-card h-full flex flex-col p-0 overflow-hidden transform duration-300 hover:shadow-xl hover:-translate-y-2 border-0 shadow-md ring-1 ring-slate-100">
                  {/* Thumbnail Wrapper */}
                  <div className="relative aspect-video bg-slate-200 overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 bg-emerald-900 mix-blend-multiply opacity-20 group-hover:opacity-10 transition-opacity z-10" />
                    {lesson.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-ozeki-green to-ozeki-dark flex items-center justify-center text-white">
                        <span className="text-opacity-20 text-6xl">▶</span>
                      </div>
                    )}
                    <span className="absolute bottom-3 right-3 bg-slate-900/80 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm z-20">
                      {Math.floor(lesson.duration_seconds / 60)}:{(lesson.duration_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span className="ozeki-badge ozeki-badge-info">{lesson.level || "General"}</span>
                      {lesson.class_target && <span className="ozeki-badge bg-amber-100 text-amber-800">{lesson.class_target}</span>}
                    </div>
                    
                    <h3 className="font-display font-bold text-xl leading-tight text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                      {lesson.title}
                    </h3>
                    
                    <p className="text-slate-600 text-sm line-clamp-2 mb-4 flex-grow">
                      {lesson.description || "Master pedagogical strategies with guided demonstrations from our top-tier expert coaching panel."}
                    </p>

                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500 font-medium mt-auto">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">{lesson.teacher_name || "Ozeki Instructor"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1" title="Views">👁 {lesson.total_views}</span>
                        <span className="flex items-center gap-1 text-amber-600">★ {lesson.average_rating || "New"}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
