"use client";

import { useRouter } from "next/navigation";
import { FormModal } from "@/components/forms";
import PhonicsObservationForm from "@/components/portal/PhonicsObservationForm";
import type { TeacherLessonObservation } from "@/lib/server/postgres/repositories/phonics-observations";

type Props =
  | {
      mode: "create";
      existingObservation?: undefined;
      title?: string;
      description?: string;
    }
  | {
      mode: "edit";
      existingObservation: TeacherLessonObservation;
      title?: string;
      description?: string;
    };

/**
 * Floating shell for the multi-step Lesson Observation form. The form
 * itself is the same multi-step UI used elsewhere — this wrapper just
 * lifts it into a wide FormModal so it floats over the dashboard like
 * every other "New …" form. Closing the modal returns to the
 * Observations list.
 */
export function ObservationFormModalShell(props: Props) {
  const router = useRouter();
  const close = () => {
    router.push("/portal/observations");
    router.refresh();
  };
  const titleFromProps = props.title;
  const title = titleFromProps
    ?? (props.mode === "create"
      ? "New Lesson Observation"
      : `Edit Observation${props.existingObservation?.observationCode ? ` · ${props.existingObservation.observationCode}` : ""}`);
  const description = props.description
    ?? "Section A–F instrument. Auto-saves drafts; submit when complete to publish into the public Teaching Quality dashboard.";

  return (
    <FormModal
      open
      onClose={close}
      title={title}
      description={description}
      closeLabel="Close form"
      maxWidth="1180px"
      panelClassName="orbf-observation-modal-panel"
    >
      {props.mode === "create" ? (
        <PhonicsObservationForm mode="create" />
      ) : (
        <PhonicsObservationForm mode="edit" existingObservation={props.existingObservation} />
      )}
    </FormModal>
  );
}
