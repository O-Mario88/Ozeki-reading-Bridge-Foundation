import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { 
  listRegistrationsForEventPostgres, 
  getTrainingEventBySlugPostgres,
  listTrainingEventsPostgres
} from "@/lib/server/postgres/repositories/training-events";
import { PortalPhysicalEventDetails } from "@/components/portal/events/PortalPhysicalEventDetails";
import { notFound } from "next/navigation";
import { queryPostgres } from "@/lib/server/postgres/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Event Attendance",
};

export default async function PhysicalEventDetailsAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePortalStaffUser();
  const resolvedParams = await params;
  const eventId = Number(resolvedParams.id);
  
  // Need to get the event title from DB (using direct query since we only have getBySlug exported)
  const eventCheck = await queryPostgres(`SELECT title, slug FROM training_events WHERE id = $1 LIMIT 1`, [eventId]);
  if (eventCheck.rows.length === 0) return notFound();
  
  const eventTitle = String(eventCheck.rows[0].title);
  const eventStatus = String(eventCheck.rows[0].status || 'Published');
  const attendees = await listRegistrationsForEventPostgres(eventId);
  
  // Pull available Digital Learning sessions from the Unified Database
  const allEvents = await listTrainingEventsPostgres();
  const onlineLessons = allEvents.filter(e => e.deliveryType === 'online');

  return (
    <PortalShell
      user={user}
      activeHref="/portal/events"
      title="Attendance Tracking"
      description="Mark Day-Of attendance for teachers registered by their schools."
    >
      <div className="mb-6">
        <Link href="/portal/events/physical" className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 w-fit">
           <ArrowLeft className="w-4 h-4" /> Back to All Events
        </Link>
      </div>
      
      <PortalPhysicalEventDetails 
         eventId={eventId}
         eventStatus={eventStatus}
         attendees={attendees} 
         eventTitle={eventTitle} 
         recordedLessons={onlineLessons.map(l => ({ id: l.id, title: l.title }))}
      />
    </PortalShell>
  );
}
