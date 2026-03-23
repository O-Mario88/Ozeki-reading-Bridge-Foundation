"use client";

import { useState, type FormEvent } from "react";
import { FormModal } from "@/components/forms";
import { SchoolDirectoryRecord } from "@/lib/types";

interface LiteracyImpactFormModalProps {
  open: boolean;
  onClose: () => void;
  school: SchoolDirectoryRecord;
  onSuccess: () => void;
}

export function LiteracyImpactFormModal({
  open,
  onClose,
  school,
  onSuccess,
}: LiteracyImpactFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const babyClassImpacted = Number(formData.get("babyClassImpacted"));
    const middleClassImpacted = Number(formData.get("middleClassImpacted"));
    const topClassImpacted = Number(formData.get("topClassImpacted"));
    const p1Impacted = Number(formData.get("p1Impacted"));
    const p2Impacted = Number(formData.get("p2Impacted"));
    const p3Impacted = Number(formData.get("p3Impacted"));

    try {
      const response = await fetch(`/api/portal/schools/${school.id}/literacy-impacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyClassImpacted,
          middleClassImpacted,
          topClassImpacted,
          p1Impacted,
          p2Impacted,
          p3Impacted,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save literacy impact data.");
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
      title={`New Literacy Impact - ${school.name}`}
      description="Record a new, standalone snapshot of learners directly impacted by the Literacy Program in early grades."
      closeLabel="Cancel"
      maxWidth="700px"
    >
      <form onSubmit={handleSubmit} className="form-grid portal-form-grid">
        {error && (
          <div className="full-width form-message error">
            {error}
          </div>
        )}

        <fieldset className="portal-fieldset full-width">
          <legend>Early Grades Impact</legend>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            <label>
              <span className="portal-field-label">Baby Class</span>
              <input name="babyClassImpacted" type="number" min={0} required defaultValue={0} />
            </label>
            <label>
              <span className="portal-field-label">Middle Class</span>
              <input name="middleClassImpacted" type="number" min={0} required defaultValue={0} />
            </label>
            <label>
              <span className="portal-field-label">Top Class</span>
              <input name="topClassImpacted" type="number" min={0} required defaultValue={0} />
            </label>
            <label>
              <span className="portal-field-label">Primary 1 (P1)</span>
              <input name="p1Impacted" type="number" min={0} required defaultValue={0} />
            </label>
            <label>
              <span className="portal-field-label">Primary 2 (P2)</span>
              <input name="p2Impacted" type="number" min={0} required defaultValue={0} />
            </label>
            <label>
              <span className="portal-field-label">Primary 3 (P3)</span>
              <input name="p3Impacted" type="number" min={0} required defaultValue={0} />
            </label>
          </div>
          <p className="portal-muted mt-2">
            Total Learners Directly Impacted is auto-calculated across the 6 early grades.
          </p>
        </fieldset>

        <div className="full-width action-row portal-form-actions mt-4">
          <button type="button" className="button button-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button" disabled={saving}>
            {saving ? "Saving..." : "Save Literacy Impact"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}
