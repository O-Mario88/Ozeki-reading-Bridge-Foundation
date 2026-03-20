"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface UpdateEnrollmentDialogProps {
  open: boolean;
  onClose: () => void;
  schoolId: number;
  schoolName: string;
  initialData: {
    enrolledBaby: number;
    enrolledMiddle: number;
    enrolledTop: number;
    enrolledP1: number;
    enrolledP2: number;
    enrolledP3: number;
    enrolledBoys: number;
    enrolledGirls: number;
  };
}

export function UpdateEnrollmentDialog({
  open,
  onClose,
  schoolId,
  schoolName,
  initialData,
}: UpdateEnrollmentDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      schoolId,
      enrolledBaby: Number(formData.get("enrolledBaby")),
      enrolledMiddle: Number(formData.get("enrolledMiddle")),
      enrolledTop: Number(formData.get("enrolledTop")),
      enrolledP1: Number(formData.get("enrolledP1")),
      enrolledP2: Number(formData.get("enrolledP2")),
      enrolledP3: Number(formData.get("enrolledP3")),
      enrolledBoys: Number(formData.get("enrolledBoys")),
      enrolledGirls: Number(formData.get("enrolledGirls")),
    };

    try {
      const response = await fetch("/api/portal/schools/enrollment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update enrollment data.");
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="school-crm-modal-backdrop">
      <div className="school-crm-modal">
        <div className="school-crm-modal-header">
          <h3>Update Enrollment for {schoolName}</h3>
          <button type="button" onClick={onClose} disabled={saving}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="school-crm-modal-body">
          {error && <div className="school-crm-modal-error">{error}</div>}

          <fieldset className="portal-fieldset full-width">
            <legend>Immediate Ozeki Impact Classes</legend>
            <div className="form-grid-3">
              <label>
                <span className="portal-field-label">Baby</span>
                <input name="enrolledBaby" type="number" min={0} defaultValue={initialData.enrolledBaby ?? 0} />
              </label>
              <label>
                <span className="portal-field-label">Middle</span>
                <input name="enrolledMiddle" type="number" min={0} defaultValue={initialData.enrolledMiddle ?? 0} />
              </label>
              <label>
                <span className="portal-field-label">Top</span>
                <input name="enrolledTop" type="number" min={0} defaultValue={initialData.enrolledTop ?? 0} />
              </label>
              <label>
                <span className="portal-field-label">P1</span>
                <input name="enrolledP1" type="number" min={0} defaultValue={initialData.enrolledP1 ?? 0} />
              </label>
              <label>
                <span className="portal-field-label">P2</span>
                <input name="enrolledP2" type="number" min={0} defaultValue={initialData.enrolledP2 ?? 0} />
              </label>
              <label>
                <span className="portal-field-label">P3</span>
                <input name="enrolledP3" type="number" min={0} defaultValue={initialData.enrolledP3 ?? 0} />
              </label>
            </div>
          </fieldset>
          <p className="full-width portal-muted">
            Directly impacted learners are auto-calculated as Baby + Middle + Top + P1 + P2 + P3.
          </p>

          <fieldset className="portal-fieldset full-width">
            <legend>Total School Enrollment</legend>
            <div className="form-grid-2">
              <label>
                <span className="portal-field-label">Total Boys</span>
                <input name="enrolledBoys" type="number" min={0} defaultValue={initialData.enrolledBoys ?? 0} />
              </label>
              <label>
                <span className="portal-field-label">Total Girls</span>
                <input name="enrolledGirls" type="number" min={0} defaultValue={initialData.enrolledGirls ?? 0} />
              </label>
            </div>
          </fieldset>
          <p className="full-width portal-muted">
            General enrollment impact is auto-calculated from Total Boys + Total Girls.
          </p>

          <div className="school-crm-modal-actions">
            <button type="button" className="school-crm-button school-crm-button-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="school-crm-button" disabled={saving}>
              {saving ? "Saving..." : "Save Enrollment"}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .school-crm-modal-backdrop {
          align-items: center;
          background: rgba(15, 23, 42, 0.4);
          bottom: 0;
          display: flex;
          justify-content: center;
          left: 0;
          padding: 1rem;
          position: fixed;
          right: 0;
          top: 0;
          z-index: 1000;
        }

        .school-crm-modal {
          background: #ffffff;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          max-height: 90vh;
          max-width: 600px;
          overflow-y: auto;
          width: 100%;
        }

        .school-crm-modal-header {
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          padding: 1rem 1.25rem;
        }

        .school-crm-modal-header h3 {
          font-size: 1.15rem;
          margin: 0;
        }

        .school-crm-modal-header button {
          background: transparent;
          border: 0;
          color: #9ca3af;
          cursor: pointer;
          font-size: 1.5rem;
          line-height: 1;
          padding: 0;
        }

        .school-crm-modal-header button:hover {
          color: #111827;
        }

        .school-crm-modal-body {
          display: grid;
          gap: 1.25rem;
          padding: 1.25rem;
        }

        .school-crm-modal-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.375rem;
          color: #b91c1c;
          padding: 0.75rem 1rem;
        }

        .school-crm-modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }

        .portal-fieldset {
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          margin: 0;
          padding: 1rem;
        }

        .portal-fieldset legend {
          color: #374151;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0 0.5rem;
        }

        .form-grid-3 {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .form-grid-2 {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        label {
          display: grid;
          gap: 0.25rem;
        }

        .portal-field-label {
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
        }

        input {
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .portal-muted {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0;
        }

        .school-crm-button {
          align-items: center;
          background: #14532d;
          border: 1px solid #14532d;
          border-radius: 0.5rem;
          color: #ffffff;
          cursor: pointer;
          display: inline-flex;
          font-size: 0.88rem;
          font-weight: 600;
          justify-content: center;
          min-height: 42px;
          padding: 0.65rem 0.9rem;
          text-decoration: none;
        }

        .school-crm-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .school-crm-button-ghost {
          background: #ffffff;
          color: #14532d;
        }
      `}</style>
    </div>
  );
}
