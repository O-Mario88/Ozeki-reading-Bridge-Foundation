"use client";

import { useRouter } from "next/navigation";
import { FormModal } from "@/components/forms";
import { PortalTrainingParticipantCreateForm } from "@/components/imports/PortalTrainingParticipantCreateForm";

type TrainingLookup = Parameters<typeof PortalTrainingParticipantCreateForm>[0]["trainings"];
type SchoolLookup = Parameters<typeof PortalTrainingParticipantCreateForm>[0]["schools"];

type Props = {
  trainings: TrainingLookup;
  schools: SchoolLookup;
  initialTrainingId: number | null;
};

export function TrainingParticipantFormModalShell({ trainings, schools, initialTrainingId }: Props) {
  const router = useRouter();
  const close = () => {
    router.push(initialTrainingId ? `/portal/trainings/${initialTrainingId}` : "/portal/trainings");
    router.refresh();
  };
  return (
    <FormModal
      open
      onClose={close}
      title="Add Training Participant"
      description="Manual entry writes through the same service as the bulk import flow."
      closeLabel="Close form"
      maxWidth="780px"
    >
      <PortalTrainingParticipantCreateForm
        trainings={trainings}
        schools={schools}
        initialTrainingId={initialTrainingId}
      />
    </FormModal>
  );
}
