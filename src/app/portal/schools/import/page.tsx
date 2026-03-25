import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBulkImportWorkflow } from "@/components/imports/PortalBulkImportWorkflow";
import { requirePortalStaffUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PortalSchoolsImportPage() {
  const user = await requirePortalStaffUser();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title="Import Schools"
      description="Upload the official CSV or Excel template, dry-run the rows, then commit through the same PostgreSQL school write service used by the normal form."
    >
      <PortalBulkImportWorkflow
        importType="schools"
        title="Schools Bulk Import"
        description="Create or update schools in bulk from the official template. The preview validates the location hierarchy before any row is committed."
        validateUrl="/api/import/schools/validate"
        commitUrl="/api/import/schools/commit"
        csvTemplateHref="/api/import/templates/schools.csv"
        xlsxTemplateHref="/api/import/templates/schools.xlsx"
        backHref="/portal/schools"
        backLabel="Back to Schools"
      />
    </PortalShell>
  );
}
