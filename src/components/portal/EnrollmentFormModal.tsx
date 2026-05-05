"use client";

import { useRef, type FormEvent } from "react";
import { FormModal } from "@/components/forms";
import { SchoolDirectoryRecord } from "@/lib/types";
import { submitJson, useFormSubmit } from "@/lib/forms/useFormSubmit";
import { SubmitButton } from "@/components/forms/SubmitButton";

interface EnrollmentFormModalProps {
  open: boolean;
  onClose: () => void;
  school: SchoolDirectoryRecord;
  onSuccess: () => void;
}

export function EnrollmentFormModal({
  open,
  onClose,
  school,
  onSuccess,
}: EnrollmentFormModalProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitter = useFormSubmit({
    onSuccess: () => {
      formRef.current?.reset();
      setTimeout(() => { onSuccess(); onClose(); }, 1000);
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    formRef.current = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    const payload = {
      boysCount: Number(formData.get("boysCount")),
      girlsCount: Number(formData.get("girlsCount")),
      updatedFrom: String(formData.get("updatedFrom")),
      academicTerm: null,
    };
    await submitter.submit(async () =>
      submitJson(`/api/portal/schools/${school.id}/enrollments`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`New Enrollment Record - ${school.name}`}
      description="Record a new, standalone snapshot of the school's overall population."
      closeLabel="Cancel"
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="form-grid portal-form-grid" ref={formRef}>
        {submitter.status === "failed" && submitter.message && (
          <div className="full-width form-message error">
            {submitter.message}
          </div>
        )}

        <fieldset className="portal-fieldset full-width">
          <legend>General Population</legend>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <label>
              <span className="portal-field-label">Number of Boys</span>
              <input name="boysCount" type="number" min={0} required defaultValue={0} />
            </label>
            <label>
              <span className="portal-field-label">Number of Girls</span>
              <input name="girlsCount" type="number" min={0} required defaultValue={0} />
            </label>
          </div>
          <p className="portal-muted mt-2">
            Total Enrollment is auto-calculated as Boys + Girls.
          </p>
        </fieldset>

        <fieldset className="portal-fieldset full-width">
          <legend>Metadata</legend>
          <label className="full-width">
            <span className="portal-field-label">Updated From (Source)</span>
            <select name="updatedFrom" required defaultValue="School Data">
              <option value="School Data">School Data</option>
              <option value="Ozeki Staff">Ozeki Staff</option>
              <option value="School Staff">School Staff</option>
            </select>
          </label>
        </fieldset>

        <div className="full-width action-row portal-form-actions mt-4">
          <button type="button" className="button button-outline" onClick={onClose} disabled={submitter.isSubmitting}>
            Cancel
          </button>
          <SubmitButton state={submitter} type="submit" idleLabel="Save Enrollment" className="button" />
        </div>
      </form>
    </FormModal>
  );
}
