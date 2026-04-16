import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalUnifiedEventsForm } from "@/components/portal/events/PortalUnifiedEventsForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Schedule Unified Event | Ozeki Portal",
};

export default async function ScheduleUnifiedEventPage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/events"
      title="Unified Event Scheduling"
      description="Deploy capacity building programs routing into either Online Google Networks or localized Physical Venues."
    >
      <div className="mb-6">
        <Link href="/portal/events" className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 w-fit">
           <ArrowLeft className="w-4 h-4" /> Back to Event Management
        </Link>
      </div>
      
      <div className="max-w-4xl">
        <PortalUnifiedEventsForm />
      </div>
    </PortalShell>
  );
}
