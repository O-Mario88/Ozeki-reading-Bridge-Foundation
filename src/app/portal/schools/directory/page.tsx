import { PortalSchoolsManager } from "@/components/portal/PortalSchoolsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { listSchoolDirectoryRecordsPostgres } from "@/lib/server/postgres/repositories/schools";
import { logger } from "@/lib/logger";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Schools Directory",
  description: "Manage school records, contacts, and location references.",
};

export default async function PortalSchoolsPage() {
  const user = await requirePortalStaffUser();

  // Schools directory used to throw the global PortalError page whenever the
  // database call returned an unexpected shape — catch and surface an inline
  // notice instead so the rest of the portal frame stays usable.
  let schools: Awaited<ReturnType<typeof listSchoolDirectoryRecordsPostgres>> = [];
  let loadError: string | null = null;
  try {
    schools = await listSchoolDirectoryRecordsPostgres();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
    logger.error("[portal/schools] list failed", { error: loadError });
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title="Schools Directory"
      description="Maintain unique School IDs, contacts, and location details for operations and reporting."
      actions={
        <div className="action-row">
          <Link href="/portal/schools/import" className="button">
            Import Schools
          </Link>
          <Link href="/api/import/templates/schools.xlsx" className="button button-ghost">
            Download Excel Template
          </Link>
          <Link href="/api/import/templates/schools.csv" className="button button-ghost">
            Download CSV Template
          </Link>
          <Link href="/portal/reports?module=all" className="button button-ghost">
            Open Schools Report
          </Link>
        </div>
      }
    >
      {loadError ? (
        <div className="my-4 px-5 py-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-sm leading-relaxed">
          <strong className="font-bold">Couldn’t load schools right now.</strong>{" "}
          The directory query failed — please retry in a moment. If this keeps
          happening, paste the detail below to the operator on call.
          <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-red-900/80">
            {loadError}
          </pre>
        </div>
      ) : null}
      <PortalSchoolsManager initialSchools={schools} />
    </PortalShell>
  );
}
