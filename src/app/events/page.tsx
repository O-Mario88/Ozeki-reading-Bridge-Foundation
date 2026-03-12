import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { listOnlineTrainingEvents } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events & Webinars",
  description:
    "Monthly literacy webinars and live teacher development sessions from Ozeki Reading Bridge Foundation.",
};

export default function EventsPage() {
  const allEvents = listOnlineTrainingEvents(60)
    .slice()
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    .map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.startDateTime,
      mode: "Online (Google Meet)",
      audience: event.audience,
      calendarLink: event.calendarLink,
      meetLink: event.meetLink,
    }));
  const now = Date.now();
  const upcomingEvents = allEvents.filter((event) => new Date(event.date).getTime() >= now);
  const events = upcomingEvents.length > 0 ? upcomingEvents : allEvents;

  const leadEvent = events[0];

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: leadEvent?.title,
    startDate: leadEvent?.date,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: "Ozeki Reading Bridge Foundation",
    },
  };

  return (
    <>
      {leadEvent ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
      ) : null}
      <PageHero
        kicker="Live learning"
        title="Events & Webinars"
        description="Join monthly sessions on phonics, fluency, assessment, and school literacy systems."
      />

      <section className="section">
        <div className="container cards-grid">
          {events.length === 0 ? (
            <article className="card">
              <h2>No events scheduled yet</h2>
              <p>
                Upcoming webinars appear here automatically after staff schedule them
                in the portal.
              </p>
            </article>
          ) : (
            events.map((event) => (
              <article className="card" key={event.id}>
                <h2>{event.title}</h2>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(event.date).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p>
                  <strong>Mode:</strong> {event.mode}
                </p>
                <p>
                  <strong>Audience:</strong> {event.audience}
                </p>
                {event.description ? <p>{event.description}</p> : null}
                <div className="action-row">
                  {event.calendarLink ? (
                    <a className="button button-ghost" href={event.calendarLink} target="_blank" rel="noreferrer">
                      Calendar
                    </a>
                  ) : null}
                  {event.meetLink ? (
                    <a className="button" href={event.meetLink} target="_blank" rel="noreferrer">
                      Join meet
                    </a>
                  ) : (
                    <span className="meta-line">Google Meet link pending calendar sync.</span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Staff scheduling</h2>
          <p>
            Volunteers and staff can schedule live online sessions from the portal with
            Google Calendar invites and Google Meet links.
          </p>
          <div className="action-row">
            <Link className="button" href="/portal/login">
              Open training portal
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
