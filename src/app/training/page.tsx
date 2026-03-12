import Link from "next/link";
import { BookOpen, Calendar as CalendarIcon, CheckCircle2, Video } from "lucide-react";
import { listOnlineTrainingSessions } from "@/lib/training-db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Our Courses | Ozeki Reading Bridge",
  description: "Join live training sessions, access past recordings, and browse educational resources.",
};

export default async function TrainingCatalogPage() {
  let sessions: Record<string, unknown>[] = [];
  try {
    sessions = await listOnlineTrainingSessions({
      includeDrafts: false,
      limit: 120,
    }) as unknown as Record<string, unknown>[];
  } catch {
    sessions = [];
  }

  return (
    <div className="training-catalog-page font-sans bg-white min-h-[80vh] pb-24">
      {/* Header Section */}
      <div className="training-catalog-container">
        <div className="training-catalog-header">
          <h1>Our Courses</h1>
          <p>You can start learning these courses and get certified within days</p>
        </div>

        {/* Filter Pills */}
        <div className="training-filters">
          <button className="training-filter-pill active">All Courses</button>
          <button className="training-filter-pill">Pedagogy Essentials</button>
          <button className="training-filter-pill">Literacy & Phonics</button>
          <button className="training-filter-pill">Digital Assessment</button>
          <button className="training-filter-pill">Leadership</button>
          <button className="training-filter-pill">Interactive Workshops</button>
        </div>

        {/* Catalog Grid */}
        {sessions.length === 0 ? (
          <div className="training-empty-state">
            <BookOpen className="training-empty-icon" size={48} />
            <h3>No Courses Found</h3>
            <p>Check back soon for new training opportunities.</p>
          </div>
        ) : (
          <div className="training-grid">
            {sessions.map((session: Record<string, unknown>) => {

              // Format the time range
              const startDate = new Date(session.start_time as string);
              const endDate = new Date(session.end_time as string);

              const timeString = `${startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} - ${endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
              const dateString = startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });

              // Use a generic placeholder image for now, later we can add image logic
              // Using stable images based on ID so they don't jump around
              const imageId = (session.id as number) % 5 + 1;

              return (
                <article key={session.id as number} className="training-card">

                  {/* Image Area */}
                  <div className="training-card-image">
                    {/* Using Unsplash source for high quality placeholder testing - in prod this would be your asset */}
                    <img
                      src={`https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=600&h=400&sig=${imageId}`}
                      alt={session.title as string}
                    />

                    {/* Status Badge Overlays - like the price badge in reference */}
                    {session.status === 'live' && (
                      <div className="training-status-badge training-status-badge--live" title="Live Now">
                        <Video size={18} />
                      </div>
                    )}
                    {session.status === 'completed' && (
                      <div className="training-status-badge training-status-badge--completed" title="Recorded">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                    {session.status === 'scheduled' && (
                      <div className="training-status-badge" style={{ background: 'var(--md-sys-color-primary)', color: 'white' }} title="Upcoming">
                        <CalendarIcon size={18} />
                      </div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="training-card-content">
                    <h3 className="training-card-title">{session.title as string}</h3>
                    <div className="training-card-desc">
                      {session.agenda as string}
                    </div>

                    {/* Meta Data Row (Age / Time / Capacity in reference) */}
                    {/* We adapt this for Date / Time / Format */}
                    <div className="training-meta-row">
                      <div className="training-meta-item">
                        <span className="training-meta-label">Date</span>
                        <span className="training-meta-value">{dateString}</span>
                      </div>
                      <div className="training-meta-divider"></div>
                      <div className="training-meta-item">
                        <span className="training-meta-label">Time</span>
                        <span className="training-meta-value">{timeString}</span>
                      </div>
                      <div className="training-meta-divider"></div>
                      <div className="training-meta-item" style={{ textAlign: 'right' }}>
                        <span className="training-meta-label">Format</span>
                        <span className="training-meta-value" style={{ textTransform: 'capitalize' }}>
                          {session.status as string}
                        </span>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="training-action-area">
                      <Link href={`/training/${session.id}`} className="training-btn">
                        {session.status === 'live' ? 'Join Live Session' :
                          session.status === 'completed' ? 'Watch Recording' :
                            'View Details'}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
