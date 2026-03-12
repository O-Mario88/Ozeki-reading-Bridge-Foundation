import { PortalEventsManager } from "@/components/portal/PortalEventsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listOnlineTrainingEvents } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal Events",
  description: "Schedule webinars and online trainings with Google Calendar and Google Meet.",
};

export default async function PortalEventsPage() {
  const user = await requirePortalStaffUser();
  const events = listOnlineTrainingEvents(120);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/events"
      title="Events & Webinar Scheduler"
      description="Create live sessions directly from dashboard, send Google Calendar invites, and launch from Meet links."
    >
      <PortalEventsManager initialEvents={events} />
    </PortalShell>
  );
}
