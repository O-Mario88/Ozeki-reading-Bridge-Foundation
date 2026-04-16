import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { listTrainingEventsPostgres } from "@/lib/server/postgres/repositories/training-events";
import { PortalPhysicalEventsManager } from "@/components/portal/events/PortalPhysicalEventsManager";
import Link from "next/link";
import { Video, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "In-Person Training Admin",
};

export default async function PhysicalEventsAdminPage() {
  const user = await requirePortalStaffUser();
  
  // List all physical events, including Drafts
  const events = await listTrainingEventsPostgres();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/events"
      title="Training Events Control"
      description="Administrative tools for coordinating capability building workshops."
    >
      <div className="mb-8 flex gap-2 border-b border-gray-200">
         <Link href="/portal/events" className="px-6 py-3 font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2">
            <Video className="w-4 h-4" /> Live Online Sessions
         </Link>
         <div className="px-6 py-3 font-bold text-[var(--accent-color)] border-b-2 border-[var(--accent-color)] flex items-center gap-2">
            <MapPin className="w-4 h-4" /> In-person / Physical Events 
         </div>
      </div>

      <PortalPhysicalEventsManager events={events} />
    </PortalShell>
  );
}
