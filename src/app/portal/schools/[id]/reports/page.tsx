import { PortalShell } from "@/components/portal/PortalShell";
import SchoolReportManager from "@/components/portal/reports/SchoolReportManager";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { queryPostgres } from "@/lib/server/postgres/client";

export default async function SchoolReportsPage({ params }: { params: { id: string } }) {
  const user = await requirePortalStaffUser();
  const schoolId = parseInt(params.id);

  const school = await queryPostgres("SELECT name FROM schools_directory WHERE id = $1", [schoolId]);

  return (
    <PortalShell 
      user={user} 
      activeHref={`/portal/schools/${schoolId}`} 
      title={`${school.rows[0]?.name || 'School'} Reports`}
      description="Manage governed performance reports and AI-generated literacy narratives."
    >
      <div className="max-w-4xl mx-auto py-8">
        <SchoolReportManager schoolId={schoolId} />
      </div>
    </PortalShell>
  );
}
