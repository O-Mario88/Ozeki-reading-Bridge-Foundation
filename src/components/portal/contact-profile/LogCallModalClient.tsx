"use client";

import { useState } from "react";
import { PhoneCall } from "lucide-react";

interface LogCallModalClientProps {
  contactId: number;
}

/**
 * Floating modal — staff records a phone call with this contact. Posts to
 * `/api/portal/contacts/[contactId]/log-call` which inserts a row into
 * `crm_interactions` (creating the bridge `crm_contacts` row first if one
 * doesn't exist). Reuses the same modal-styling pattern as
 * AddContactToTrainingModal for visual consistency.
 */
export function LogCallModalClient({ contactId }: LogCallModalClientProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [callDate, setCallDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState<string>("10");
  const [outcome, setOutcome] = useState<string>("Completed");
  const [subject, setSubject] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const reset = () => {
    setSubject("");
    setNotes("");
    setDuration("10");
    setOutcome("Completed");
    setFeedback(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/portal/contacts/${contactId}/log-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || "Phone Call",
          notes: notes.trim() || null,
          callDate: new Date(callDate).toISOString(),
          durationMinutes: Number(duration) || null,
          outcome,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setFeedback({ type: "error", message: json.error ?? "Failed to log call." });
        return;
      }
      setFeedback({ type: "success", message: "Call logged." });
      setTimeout(() => {
        setOpen(false);
        reset();
        window.location.reload();
      }, 800);
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px",
          borderRadius: 10, background: "#FFFFFF", color: "#111827", fontSize: 13, fontWeight: 600,
          border: "1px solid #E5EAF0", cursor: "pointer",
        }}
      >
        <PhoneCall size={14} />
        <span>Log Call</span>
      </button>

      {open ? (
        <div
          onClick={() => !saving && setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "95%", maxWidth: 520, borderRadius: 16, background: "#FFFFFF",
              border: "1px solid #E5EAF0", boxShadow: "0 24px 48px rgba(23,39,65,0.18)", overflow: "hidden",
              fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
            }}
          >
            <header style={{ padding: "14px 18px", borderBottom: "1px solid #E5EAF0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>Log Phone Call</h3>
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                style={{ background: "transparent", border: 0, fontSize: 18, color: "#667085", cursor: "pointer" }}
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Subject">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Follow-up on training schedule"
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Call date & time">
                  <input
                    type="datetime-local"
                    value={callDate}
                    onChange={(e) => setCallDate(e.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Duration (minutes)">
                  <input
                    type="number"
                    min="0"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Outcome">
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)} style={inputStyle}>
                  <option>Completed</option>
                  <option>Voicemail</option>
                  <option>No answer</option>
                  <option>Cancelled</option>
                </select>
              </Field>

              <Field label="Notes">
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What was discussed, next steps..."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>

              {feedback ? (
                <div
                  style={{
                    padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                    background: feedback.type === "success" ? "#ECFDF5" : "#FEF2F2",
                    color: feedback.type === "success" ? "#166534" : "#991B1B",
                    border: `1px solid ${feedback.type === "success" ? "#A7F3D0" : "#FECACA"}`,
                  }}
                >
                  {feedback.message}
                </div>
              ) : null}
            </div>

            <footer style={{ padding: "12px 18px", borderTop: "1px solid #E5EAF0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                disabled={saving}
                style={{ ...buttonGhost, opacity: saving ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : "Save call log"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#475467", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #D1D5DB",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
  color: "#111827",
  background: "#FFFFFF",
};

const buttonPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 36,
  padding: "0 14px",
  borderRadius: 10,
  background: "#066A67",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid #066A67",
  cursor: "pointer",
};

const buttonGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 36,
  padding: "0 14px",
  borderRadius: 10,
  background: "#FFFFFF",
  color: "#111827",
  fontSize: 13,
  fontWeight: 600,
  border: "1px solid #E5EAF0",
  cursor: "pointer",
};
