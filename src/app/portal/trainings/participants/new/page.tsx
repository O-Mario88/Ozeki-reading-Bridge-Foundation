import { PortalShell } from "@/components/portal/PortalShell";
import { TrainingParticipantFormModalShell } from "@/components/portal/TrainingParticipantFormModalShell";
import { requirePortalStaffUser } from "@/lib/auth";
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
    <PortalShell user={user} activeHref="/portal/trainings" hideFrame>
      <TrainingParticipantFormModalShell
        trainings={trainings}
        schools={schools}
        initialTrainingId={trainingId}
      />
    </PortalShell>
  );
}
