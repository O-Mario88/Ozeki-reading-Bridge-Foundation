"use client";

import { useRouter } from "next/navigation";
import { FormModal } from "@/components/forms";
import { CoachingVisitForm } from "@/components/portal/CoachingVisitForm";

type SchoolOption = { id: number; name: string; district: string };
type CoachOption = { id: number; fullName: string; email: string };

type Props = {
  schools: SchoolOption[];
  coaches: CoachOption[];
  defaultSchoolId?: number;
  defaultCoachId?: number;
};

export function CoachingVisitFormModalShell({ schools, coaches, defaultSchoolId, defaultCoachId }: Props) {
  const router = useRouter();
  const close = () => {
    router.push("/portal/visits");
    router.refresh();
  };
  return (
    <FormModal
      open
      onClose={close}
      title="New Coaching Visit"
      description="Record a coaching visit to a school. Photos auto-attach with GPS evidence on save."
      closeLabel="Close form"
      maxWidth="1080px"
    >
      <CoachingVisitForm
        schools={schools}
        coaches={coaches}
        defaultSchoolId={defaultSchoolId}
        defaultCoachId={defaultCoachId}
      />
    </FormModal>
  );
}
