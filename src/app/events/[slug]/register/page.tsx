import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTrainingEventBySlugPostgres } from "@/lib/server/postgres/repositories/training-events";
import { EventRegistrationForm } from "@/components/public/events/EventRegistrationForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getTrainingEventBySlugPostgres(resolvedParams.slug);
  return {
    title: `Register for ${event?.title || "Training Event"}`,
  };
}

export default async function PhysicalEventRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const event = await getTrainingEventBySlugPostgres(resolvedParams.slug);

  if (!event) {
    return notFound();
  }

  const isRegistrationOpen = event.status === "Published" || event.status === "Ongoing";

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 mb-8">
         <Link href={`/events/${event.slug}`} className="text-gray-500 hover:text-gray-900 inline-flex items-center gap-2 font-medium transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Event Details
         </Link>
         <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
            Register your school for {event.title}
         </h1>
         <p className="text-lg text-gray-600 mt-2">
            Please designate one administrator to register all attending teaching staff. Do not submit duplicate registrations.
         </p>
      </div>

      <div className="px-4">
        {isRegistrationOpen ? (
          <EventRegistrationForm eventId={event.id} eventTitle={event.title} />
        ) : (
          <div className="max-w-3xl mx-auto bg-white p-12 text-center rounded-2xl shadow-sm border">
            <h2 className="text-2xl font-bold mb-4">Registration Closed</h2>
            <p className="text-gray-600 mb-8">We are no longer accepting new registrants for this event.</p>
            <Link href="/events" className="btn btn-primary">Discover other upcoming events</Link>
          </div>
        )}
      </div>
    </div>
  );
}
