import { PortalShell } from "@/components/portal/PortalShell";
import { PortalTrainingParticipantCreateForm } from "@/components/imports/PortalTrainingParticipantCreateForm";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import {
  listTrainingImportLookupRows,
  listTrainingParticipantSchoolLookupRows,
} from "@/lib/server/services/training/participant-service";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getTrainingId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function PortalTrainingParticipantCreatePage({ searchParams }: PageProps) {
  const user = await requirePortalStaffUser();
  const params = await searchParams;
  const trainingId = getTrainingId(params.trainingId);
  const [trainings, schools] = await Promise.all([
    listTrainingImportLookupRows(),
    listTrainingParticipantSchoolLookupRows(),
  ]);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/trainings"
      title="Add Training Participant"
      description="Manual participant entry writes through the same PostgreSQL participant service as the bulk import flow."
    >
      <PortalTrainingParticipantCreateForm
        trainings={trainings}
        schools={schools}
        initialTrainingId={trainingId}
      />
    </PortalShell>
  );
}
