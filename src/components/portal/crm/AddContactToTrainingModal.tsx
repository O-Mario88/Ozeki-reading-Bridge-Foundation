"use client";

import { useCallback, useEffect, useState } from "react";

interface TrainingSession {
  id: number;
  recordCode: string;
  trainingName: string;
  date: string | null;
  location: string | null;
}

interface AddContactToTrainingModalProps {
  contactId: number;
}

export function AddContactToTrainingModal({ contactId }: AddContactToTrainingModalProps) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/portal/contacts/training-sessions");
      const json = (await res.json()) as { sessions?: TrainingSession[] };
      setSessions(json.sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSessions();
      setSelectedId(null);
      setFeedback(null);
    }
  }, [open, fetchSessions]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/portal/contacts/add-to-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, trainingRecordId: selectedId }),
      });
      const json = (await res.json()) as { success?: boolean; result?: { action: string }; error?: { message: string } };
      if (!res.ok) {
        setFeedback({ type: "error", message: json.error?.message ?? "Failed to add contact to training." });
        return;
      }
      if (json.result?.action === "ALREADY_REGISTERED") {
        setFeedback({ type: "error", message: "This contact is already registered for the selected training session." });
        return;
      }
      setFeedback({ type: "success", message: "Contact added to training session successfully." });
      setTimeout(() => {
        setOpen(false);
        window.location.reload();
      }, 1200);
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return date;
    }
  };

  return (
    <>
      {/* Inline styling so the trigger matches the rest of the action bar
          (New Observation / Update Contact / New Coaching) regardless of
          which contact view mounts it. The legacy .portal-crm-button class
          only exists inside PortalCrmProfileView's scoped <style jsx>, so
          relying on it left the button unstyled in the new ContactProfileView. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 36,
          padding: "0 14px",
          borderRadius: 10,
          background: "#066A67",
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: 700,
          border: "1px solid #066A67",
          cursor: "pointer",
          fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
        }}
      >
        Add to Training
      </button>

      {open ? (
        <div className="att-modal-overlay" onClick={() => setOpen(false)}>
          <div className="att-modal" onClick={(e) => e.stopPropagation()}>
            <header className="att-modal-header">
              <h3>Add Contact to Training Session</h3>
              <button type="button" className="att-modal-close" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </header>

            <div className="att-modal-body">
              {loading ? (
                <p className="att-modal-empty">Loading training sessions…</p>
              ) : sessions.length === 0 ? (
                <p className="att-modal-empty">No training sessions found. Create a training session first.</p>
              ) : (
                <label className="att-modal-label">
                  <span>Select Training Session</span>
                  <select
                    className="att-modal-select"
                    value={selectedId ?? ""}
                    onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— Choose a training session —</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.trainingName}
                        {session.date ? ` — ${formatDate(session.date)}` : ""}
                        {session.location ? ` — ${session.location}` : ""}
                      </option>
                    ))}
                  </select>
                  <small className="att-modal-hint">Showing the {sessions.length} most recent training sessions.</small>
                </label>
              )}

              {feedback ? (
                <div className={`att-modal-feedback att-modal-feedback--${feedback.type}`}>
                  {feedback.message}
                </div>
              ) : null}
            </div>

            <footer className="att-modal-footer">
              <button
                type="button"
                className="att-modal-btn att-modal-btn--ghost"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="att-modal-btn att-modal-btn--primary"
                onClick={handleSave}
                disabled={!selectedId || saving || loading}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .att-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(6px);
        }
        .att-modal {
          width: 95%;
          max-width: 540px;
          border-radius: 18px;
          background: #f7f8fa;
          border: 1px solid rgba(78, 108, 136, 0.24);
          box-shadow: 0 24px 48px rgba(23, 39, 65, 0.18);
          overflow: hidden;
          font-family: var(--portal-backend-font);
        }
        .att-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.15rem 1.35rem;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(180deg, #fdfefe 0%, #f1f5f9 100%);
        }
        .att-modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #1f2937;
        }
        .att-modal-close {
          border: 0;
          background: transparent;
          font-size: 1.25rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0.15rem 0.4rem;
          border-radius: 6px;
        }
        .att-modal-close:hover {
          background: rgba(0, 0, 0, 0.06);
        }
        .att-modal-body {
          padding: 1.35rem;
        }
        .att-modal-label {
          display: grid;
          gap: 0.45rem;
        }
        .att-modal-label span {
          font-weight: 700;
          font-size: 0.95rem;
          color: #374151;
        }
        .att-modal-select {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          font: inherit;
          font-size: 0.95rem;
          color: #1f2937;
          background: #fff;
          cursor: pointer;
        }
        .att-modal-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .att-modal-hint {
          color: #6b7280;
          font-size: 0.85rem;
        }
        .att-modal-empty {
          color: #6b7280;
          text-align: center;
          padding: 1rem 0;
        }
        .att-modal-feedback {
          margin-top: 0.95rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
        }
        .att-modal-feedback--success {
          background: #ecfdf5;
          color: #044f4d;
          border: 1px solid #a7f3d0;
        }
        .att-modal-feedback--error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .att-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.35rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .att-modal-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0.6rem 1.25rem;
          border-radius: 10px;
          font: inherit;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .att-modal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .att-modal-btn--primary {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }
        .att-modal-btn--primary:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .att-modal-btn--ghost {
          background: transparent;
          color: #1f2937;
          border-color: rgba(78, 108, 136, 0.32);
        }
        .att-modal-btn--ghost:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.04);
        }
      `}</style>
    </>
  );
}
