import type { Metadata } from "next";
import { getCurrentPortalUser } from "@/lib/auth";
import { 
  listOnlineTrainingSessionsPostgres, 
  listOnlineTrainingResourcesPostgres 
} from "@/lib/server/postgres/repositories/training";
import { queryPostgres } from "@/lib/server/postgres/client";
import { EventCard } from "@/components/events/EventCard";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { CTAStrip } from "@/components/public/CTAStrip";
import { Users, MonitorPlay, Presentation, Sparkles, Calendar, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Online Training Sessions",
  description: "Join expert-led literacy, assessment, and phonics training sessions. Free capability building for educators.",
};

export default async function OnlineTrainingPage() {
  const user = await getCurrentPortalUser();
  const allSessions = await listOnlineTrainingSessionsPostgres({ includeDrafts: false });
  
  const now = Date.now();
  const upcoming = allSessions
    .filter(s => new Date(s.startTime).getTime() >= now)
    .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
  // Sub-select the sessions to display
  const displaySessions = upcoming.length > 0 ? upcoming : allSessions.slice(0, 12);

  // Hydrate sessions with resources and current user's signup state
  const sessionsData = await Promise.all(displaySessions.map(async (s) => {
    const resources = await listOnlineTrainingResourcesPostgres(s.id);
    let isSignedUp = false;
    if (user) {
       const check = await queryPostgres(
         `SELECT 1 FROM online_training_participants WHERE session_id = $1 AND teacher_user_id = $2 LIMIT 1`,
         [s.id, user.id]
       );
       isSignedUp = check.rows.length > 0;
    }
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      audience: s.audience,
      startTime: s.startTime,
      endTime: s.endTime,
      meetJoinUrl: s.meetJoinUrl,
      resources: resources.map(r => ({ id: r.id, title: r.title })),
      isSignedUp
    };
  }));

  // Fetch true live metrics from the PostgreSQL tracker
  const totalSessions = allSessions.length;
  const attendanceRes = await queryPostgres(`SELECT SUM(attendee_count) as total FROM online_training_sessions`);
  const totalAttendees = Number(attendanceRes.rows[0]?.total || 0);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 1. Hero Section (Inspiration: Premium e-learning mockup but mission-aligned) */}
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28 bg-white border-b border-gray-100">
        {/* Abstract background blobs for a modern, friendly template-like feel */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-primary/5 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-6 max-w-7xl relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-20">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-sm mb-6 tracking-wide">
              <Sparkles size={16} />
              Ozeki Capability Building
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-brand-primary leading-tight mb-8">
              Join Ozeki Online Training Sessions
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-10 max-w-2xl">
              Learn, grow, and strengthen your literacy practice alongside industry experts. Sign up for free, interactive sessions tailored for teachers and school leaders.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a href="#sessions" className="px-8 py-4 rounded-full bg-brand-primary text-white font-bold text-lg hover:bg-brand-primary/90 transition-all shadow-xl hover:shadow-brand-primary/30 flex items-center gap-2 justify-center">
                Explore Upcoming Trainings
              </a>
              {!user && (
                 <a href="/portal/login?continue=/events" className="px-8 py-4 rounded-full bg-gray-100 text-gray-800 font-bold text-lg hover:bg-gray-200 transition-all flex items-center gap-2 justify-center">
                   Sign In to Enroll
                 </a>
              )}
            </div>
            
            <p className="mt-8 text-sm font-semibold text-gray-400 tracking-wide">
              NO FEES • CERTIFICATES PROVIDED • DB-BACKED RESOURCES
            </p>
          </div>

          <div className="flex-1 w-full max-w-md hidden md:block">
            {/* Elegant contextual graphic overlapping layout */}
            <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
              <div className="absolute inset-0 bg-brand-primary/20 animate-pulse" />
              {/* Note: In a real environment, replace this grey block with a dynamic next/image if desired, but a sleek gradient covers the aesthetic gracefully */}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary to-blue-900" />
              <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Presentation size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold">Live Mentorship</h4>
                    <p className="text-xs text-white/80">Interactive Q&A</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stats Band */}
      <section className="bg-brand-primary py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/20">
            <div className="text-center md:text-left md:pl-8 flex items-center justify-center md:justify-start gap-4">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <MonitorPlay className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-4xl font-extrabold text-white">{totalSessions}+</p>
                <p className="text-white/80 font-medium uppercase tracking-wider text-sm mt-1">Sessions Held</p>
              </div>
            </div>
            <div className="text-center md:text-left md:pl-16 pt-8 md:pt-0 flex items-center justify-center md:justify-start gap-4">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                 <p className="text-4xl font-extrabold text-white">{totalAttendees.toLocaleString()}+</p>
                 <p className="text-white/80 font-medium uppercase tracking-wider text-sm mt-1">Teachers Reached</p>
              </div>
            </div>
            <div className="text-center md:text-left md:pl-16 pt-8 md:pt-0 flex items-center justify-center md:justify-start gap-4">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div>
                 <p className="text-4xl font-extrabold text-white">100%</p>
                 <p className="text-white/80 font-medium uppercase tracking-wider text-sm mt-1">Free Access</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Session Discovery Grid */}
      <SectionWrapper theme="off-white" id="sessions" className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-bold text-brand-primary mb-4">Explore Top Sessions</h2>
              <p className="text-lg text-gray-600">
                Enroll in upcoming webinars to gain access to exclusive presentation materials and live coaching.
              </p>
            </div>
          </div>

          {sessionsData.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100 shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-brand-primary mb-2">No upcoming sessions</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Check back soon! Our staff are scheduling new literacy masterclasses right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sessionsData.map((session) => (
                <EventCard 
                  key={session.id} 
                  session={session} 
                  resources={session.resources} 
                  isSignedUp={session.isSignedUp} 
                  isLoggedIn={!!user}
                />
              ))}
            </div>
          )}
        </div>
      </SectionWrapper>

      {/* 4. Support Footer Strip */}
      <CTAStrip 
        heading="Need help choosing a session?"
        subheading="If you represent a school and wish to schedule an exclusive alignment training with our experts, reach out directly."
        primaryButtonText="Contact School Support"
        primaryButtonHref="/request-support"
        theme="brand"
      />
    </div>
  );
}
