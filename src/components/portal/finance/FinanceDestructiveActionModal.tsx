"use client";

import { FormEvent, useEffect, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";

type FinanceDestructiveActionModalProps = {
  open: boolean;
  title: string;
  impactText: string;
  confirmLabel: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function FinanceDestructiveActionModal({
  open,
  title,
  impactText,
  confirmLabel,
  loading = false,
  onClose,
  onConfirm,
}: FinanceDestructiveActionModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      setError("");
    }
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Reason is required (minimum 3 characters).");
      return;
    }
    setError("");
    void onConfirm(trimmed);
  }

  return (
    <FloatingSurface
      open={open}
      onClose={onClose}
      title={title}
      description={impactText}
      closeLabel="Cancel"
      maxWidth="560px"
    >
      <form className="form-grid portal-form-grid" onSubmit={handleSubmit}>
        <label className="full-width">
          <span className="portal-field-label">Reason</span>
          <textarea
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Enter a clear reason for this action."
            required
          />
          <small className="portal-field-help">{reason.length}/500</small>
          {error ? <small className="portal-danger-text">{error}</small> : null}
        </label>
        <div className="full-width action-row portal-form-actions">
          <button type="button" className="button button-ghost button-sm" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="button button-danger button-sm" type="submit" disabled={loading}>
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </form>
    </FloatingSurface>
  );
}
