import { PortalSchoolsManager } from "@/components/portal/PortalSchoolsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { listSchoolDirectoryRecordsPostgres } from "@/lib/server/postgres/repositories/schools";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add New School | Ozeki Portal",
  description: "Create a new school account directly from the Schools dashboard.",
};

/**
 * Dedicated route for the "Add School" flow. The Schools Overview
 * dashboard's "Add School" button points here so users land straight
 * on the input form instead of the directory listing. The manager
 * renders in `createOnly` mode — the directory grid and profile pane
 * are hidden, the New School modal opens automatically, and the
 * Cancel/close button returns to /portal/schools.
 */
export default async function PortalSchoolsNewPage() {
  const user = await requirePortalStaffUser();

  // We still need an initial schools array so PortalSchoolsManager
  // can hydrate its state — even in createOnly mode the upsertSchool
  // path runs after a successful save so it can route to the new
  // school's dashboard. Failure here falls back to an empty list.
  let schools: Awaited<ReturnType<typeof listSchoolDirectoryRecordsPostgres>> = [];
  try {
    schools = await listSchoolDirectoryRecordsPostgres();
  } catch (e) {
    logger.warn("[portal/schools/new] hydration list failed; continuing with empty list", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title="Add New School"
      description="Add a new school account and baseline metadata. Cancel returns to the Schools dashboard."
    >
      <PortalSchoolsManager initialSchools={schools} createOnly />
    </PortalShell>
  );
}
