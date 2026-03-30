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
import { PageHero } from "@/components/public/PageHero";
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
    <div className="bg-charius-beige min-h-screen">
      <PageHero
        tagline={<><Sparkles className="w-4 h-4 inline" /> Ozeki Capability Building</>}
        title="Join Ozeki Online Training Sessions"
        subtitle="Learn, grow, and strengthen your literacy practice alongside industry experts. Sign up for free, interactive sessions tailored for teachers and school leaders."
        imageSrc="/photos/PXL_20260218_124656123.jpg"
      >
        <a href="#sessions" className="px-8 py-4 rounded-full bg-[#FA7D15] text-white font-bold text-lg hover:bg-[#E86D0B] transition-all shadow-lg hover:shadow-xl flex items-center gap-2 justify-center">
          Explore Upcoming Trainings
        </a>
      </PageHero>

      {/* 2. Stats Band */}
      <section className="bg-charius-dark py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="text-center md:text-left md:pl-8 flex items-center justify-center md:justify-start gap-4">
              <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                <MonitorPlay className="w-8 h-8 text-[#FA7D15]" />
              </div>
              <div>
                <p className="text-4xl font-extrabold text-white">{totalSessions}+</p>
                <p className="text-gray-400 font-medium uppercase tracking-wider text-sm mt-1">Sessions Held</p>
              </div>
            </div>
            <div className="text-center md:text-left md:pl-16 pt-8 md:pt-0 flex items-center justify-center md:justify-start gap-4">
              <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                <Users className="w-8 h-8 text-[#FA7D15]" />
              </div>
              <div>
                 <p className="text-4xl font-extrabold text-white">{totalAttendees.toLocaleString()}+</p>
                 <p className="text-gray-400 font-medium uppercase tracking-wider text-sm mt-1">Teachers Reached</p>
              </div>
            </div>
            <div className="text-center md:text-left md:pl-16 pt-8 md:pt-0 flex items-center justify-center md:justify-start gap-4">
              <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                <CheckCircle2 className="w-8 h-8 text-[#FA7D15]" />
              </div>
              <div>
                 <p className="text-4xl font-extrabold text-white">100%</p>
                 <p className="text-gray-400 font-medium uppercase tracking-wider text-sm mt-1">Free Access</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Session Discovery Grid */}
      <SectionWrapper theme="charius-beige" id="sessions" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-0">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-bold text-[#111] mb-4">Explore Top Sessions</h2>
              <p className="text-lg text-gray-500">
                Enroll in upcoming webinars to gain access to exclusive presentation materials and live coaching.
              </p>
            </div>
          </div>

          {sessionsData.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-[#111] mb-2">No upcoming sessions</h3>
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
        theme="charius"
      />
    </div>
  );
}
