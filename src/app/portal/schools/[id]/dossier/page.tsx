import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { SchoolDossierView } from "@/components/portal/SchoolDossierView";
import { requirePortalStaffUser } from "@/lib/auth";
import { buildSchoolDossierPostgres } from "@/lib/server/postgres/repositories/school-intelligence";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const dossier = await buildSchoolDossierPostgres(Number(id));
  return {
    title: dossier ? `${dossier.schoolName} — Intelligence Dossier` : "School Not Found",
  };
}

export default async function SchoolDossierPage({ params }: PageProps) {
  const user = await requirePortalStaffUser();
  const { id } = await params;
  const schoolId = Number(id);
  if (!Number.isInteger(schoolId) || schoolId <= 0) notFound();

  const dossier = await buildSchoolDossierPostgres(schoolId);
  if (!dossier) notFound();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title="School Intelligence Dossier"
      description={dossier.schoolName}
    >
      <div className="max-w-6xl mx-auto px-4 py-6">
        <SchoolDossierView dossier={dossier} />
      </div>
    </PortalShell>
  );
}
