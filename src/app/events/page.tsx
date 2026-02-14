import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Events & Webinars",
  description:
    "Monthly literacy webinars and live teacher development sessions from Ozeki Reading Bridge Foundation.",
};

const events = [
  {
    title: "Monthly Literacy Webinar: Practical Phonics in P1-P2",
    date: "2026-03-12",
    mode: "Online (Zoom)",
    audience: "Teachers and literacy coaches",
  },
  {
    title: "School Leaders Session: Supervising Reading Instruction",
    date: "2026-03-26",
    mode: "Online (Google Meet)",
    audience: "Headteachers and Directors of Studies",
  },
  {
    title: "Assessment Clinic: Baseline to Progress Tracking",
    date: "2026-04-09",
    mode: "Online (Zoom)",
    audience: "School assessment teams",
  },
];

export default function EventsPage() {
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
                <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
              </p>
              <p>
                <strong>Mode:</strong> {event.mode}
              </p>
              <p>
                <strong>Audience:</strong> {event.audience}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
