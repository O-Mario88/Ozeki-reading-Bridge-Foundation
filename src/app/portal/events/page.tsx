import { PortalEventsManager } from "@/components/portal/PortalEventsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listOnlineTrainingEvents } from "@/lib/content-db";
import { requirePortalStaffUser } from "@/lib/auth";
import Link from "next/link";
import { Video, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal Events",
  description: "Schedule webinars and online trainings with Google Calendar and Google Meet.",
};

export default async function PortalEventsPage() {
  const user = await requirePortalStaffUser();
  const events = await listOnlineTrainingEvents(120);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/events"
      title="Events & Webinar Scheduler"
      description="Create live sessions directly from dashboard, send Google Calendar invites, and launch from Meet links."
    >
      <div className="mb-8 flex gap-2 border-b border-gray-200">
         <div className="px-6 py-3 font-bold text-[var(--accent-color)] border-b-2 border-[var(--accent-color)] flex items-center gap-2">
            <Video className="w-4 h-4" /> Live Online Sessions
         </div>
         <Link href="/portal/events/physical" className="px-6 py-3 font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> In-person / Physical Events 
         </Link>
      </div>
      <PortalEventsManager initialEvents={events} />
    </PortalShell>
  );
}
