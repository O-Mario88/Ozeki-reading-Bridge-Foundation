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
  const scheduledEvents = listOnlineTrainingEvents(30).map((event) => ({
    title: event.title,
    date: event.startDateTime,
    mode: event.meetLink ? "Online (Google Meet)" : "Online session",
    audience: event.audience,
    calendarLink: event.calendarLink,
    meetLink: event.meetLink,
  }));
  const events =
    scheduledEvents.length > 0
      ? scheduledEvents
      : [
          {
            title: "Monthly Literacy Webinar: Practical Phonics in P1-P2",
            date: "2026-03-12T10:00:00",
            mode: "Online (Google Meet)",
            audience: "Teachers and literacy coaches",
            calendarLink: null,
            meetLink: null,
          },
        ];

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: events[0]?.title,
    startDate: events[0]?.date,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: "Ozeki Reading Bridge Foundation",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      <PageHero
        kicker="Live learning"
        title="Events & Webinars"
        description="Join monthly sessions on phonics, fluency, assessment, and school literacy systems."
      />

      <section className="section">
        <div className="container cards-grid">
          {events.map((event) => (
            <article className="card" key={event.title}>
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
                ) : null}
              </div>
            </article>
          ))}
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
