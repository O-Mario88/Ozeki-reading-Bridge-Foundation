import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import EventsWebinarScheduler from "@/components/portal/events/EventsWebinarScheduler";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events & Webinar Scheduler | Ozeki Portal",
  description: "Schedule webinars and online trainings with Google Calendar and Google Meet.",
};

const PAGE_BG = "#f8fafc";

export default async function PortalEventsPage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell user={user} activeHref="/portal/events" hideFrame>
      <div
        className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1700px] mx-auto"
        style={{ backgroundColor: PAGE_BG }}
      >
        <EventsWebinarScheduler />
      </div>
    </PortalShell>
  );
}
