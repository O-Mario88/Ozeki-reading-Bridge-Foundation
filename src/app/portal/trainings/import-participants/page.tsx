import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBulkImportWorkflow } from "@/components/imports/PortalBulkImportWorkflow";
import { requirePortalStaffUser } from "@/lib/auth";
import { listTrainingImportLookupRows } from "@/lib/server/services/training/participant-service";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getTrainingId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function PortalTrainingParticipantsImportPage({ searchParams }: PageProps) {
  const user = await requirePortalStaffUser();
  const params = await searchParams;
  const trainingId = getTrainingId(params.trainingId);
  const trainings = await listTrainingImportLookupRows();
  const selectedTraining = trainingId ? trainings.find((training) => training.id === trainingId) ?? null : null;
  const templateQuery = trainingId ? `?trainingId=${trainingId}` : "";

  return (
    <PortalShell
      user={user}
      activeHref="/portal/trainings"
      title="Import Training Participants"
      description="Upload the official participant template, validate every row against PostgreSQL training and school records, then commit only when the preview is clean."
    >
      <PortalBulkImportWorkflow
        importType="training_participants"
        title="Training Participants Bulk Import"
        description="Participants are linked to existing trainings and existing schools only. Missing schools are surfaced during preview so you can download a schools template and import them first."
        validateUrl="/api/import/training-participants/validate"
        commitUrl="/api/import/training-participants/commit"
        csvTemplateHref={`/api/import/templates/training-participants.csv${templateQuery}`}
        xlsxTemplateHref={`/api/import/templates/training-participants.xlsx${templateQuery}`}
        backHref={trainingId ? `/portal/trainings/${trainingId}` : "/portal/trainings"}
        backLabel={trainingId ? "Back to Training" : "Back to Trainings"}
        trainingId={trainingId}
        contextLabel={
          selectedTraining ? `${selectedTraining.trainingCode} - ${selectedTraining.trainingTitle}` : null
        }
      />
    </PortalShell>
  );
}
