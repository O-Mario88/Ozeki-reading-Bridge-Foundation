import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTrainingEventBySlugPostgres } from "@/lib/server/postgres/repositories/training-events";
import { PageHero } from "@/components/public/PageHero";
import { MapPin, CalendarClock, Users, BookOpen } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getTrainingEventBySlugPostgres(resolvedParams.slug);
  return {
    title: event?.title || "Training Event",
  };
}

export default async function PhysicalEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const event = await getTrainingEventBySlugPostgres(resolvedParams.slug);

  if (!event) {
    return notFound();
  }

  const isRegistrationOpen = event.status === "Published" || event.status === "Ongoing";

  return (
    <div className="bg-charius-beige min-h-screen">
      <PageHero
        tagline={<><BookOpen className="w-4 h-4 inline" /> In-person Training Hub</>}
        title={event.title}
        subtitle={event.description || "Join us for an exclusive capability building training session."}
        imageSrc="/photos/18.jpeg"
      >
        {isRegistrationOpen && (
          <Link href={`/events/${event.slug}/register`} className="px-8 py-4 rounded-full bg-[var(--primary-color)] text-white font-bold text-lg hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center">
            Register Your School
          </Link>
        )}
      </PageHero>

      <section className="py-12 max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="card p-8">
              <h2 className="text-2xl font-bold mb-4">Event Details</h2>
              <div className="prose prose-lg text-gray-700">
                <p>{event.description}</p>
                <p className="mt-4"><strong>Target Audience:</strong> {event.targetAudience || "All Teachers"}</p>
                <p><strong>Training Grade:</strong> {event.level || "General"}</p>
                <p><strong>Module Type:</strong> {event.trainingType || "General Literacy"}</p>
              </div>
            </div>
            {event.contactName && (
              <div className="bg-white p-6 rounded-xl border border-gray-100 flex items-start gap-4">
                 <div className="w-12 h-12 bg-[var(--accent-color)]/10 rounded-full flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-[var(--accent-color)]" />
                 </div>
                 <div>
                    <h3 className="font-bold text-lg">Contact Organizer</h3>
                    <p className="text-gray-600">{event.contactName}</p>
                    {event.contactPhone && <p className="text-sm text-gray-500 font-mono mt-1">{event.contactPhone}</p>}
                    {event.contactEmail && <p className="text-sm text-[var(--primary-color)] mt-1">{event.contactEmail}</p>}
                 </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--border-color)]">
              <h3 className="font-bold text-gray-400 uppercase tracking-wider text-xs mb-4">Logistics</h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <CalendarClock className="w-6 h-6 text-[var(--accent-color)] shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Date & Time</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {event.startDatetime ? new Date(event.startDatetime).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) : "TBD"}
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <MapPin className="w-6 h-6 text-[var(--accent-color)] shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Venue</p>
                    <p className="text-sm text-gray-600 mt-1">{event.venueName || "To be confirmed"}</p>
                    {(event.district || event.subCounty) && (
                      <p className="text-sm text-gray-500 mt-1">{event.subCounty ? `${event.subCounty},` : ''} {event.district}</p>
                    )}
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border">
              <h3 className="font-bold text-gray-900 mb-2">Registration Status</h3>
              {isRegistrationOpen ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">Slots are currently open for school administrators to register their teaching staff.</p>
                  <Link href={`/events/${event.slug}/register`} className="btn btn-primary w-full text-center py-3">Register Now</Link>
                </>
              ) : (
                <div className="bg-gray-200 text-gray-700 font-bold text-center py-3 rounded-lg w-full">Registration Closed</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
