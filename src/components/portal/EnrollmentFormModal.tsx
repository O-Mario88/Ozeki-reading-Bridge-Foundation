"use client";

import { useState, type FormEvent } from "react";
import { FormModal } from "@/components/forms";
import { SchoolDirectoryRecord } from "@/lib/types";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const boysCount = Number(formData.get("boysCount"));
    const girlsCount = Number(formData.get("girlsCount"));
    const updatedFrom = String(formData.get("updatedFrom"));
    
    // Auto calculate
    const _totalEnrollment = boysCount + girlsCount;

    try {
      const response = await fetch(`/api/portal/schools/${school.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boysCount,
          girlsCount,
          updatedFrom,
          academicTerm: null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save enrollment data.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setSaving(false);
    }
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
      <form onSubmit={handleSubmit} className="form-grid portal-form-grid">
        {error && (
          <div className="full-width form-message error">
            {error}
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
          <button type="button" className="button button-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button" disabled={saving}>
            {saving ? "Saving..." : "Save Enrollment"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}
