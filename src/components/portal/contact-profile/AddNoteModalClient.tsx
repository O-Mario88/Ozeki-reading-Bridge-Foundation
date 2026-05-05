"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";

interface AddNoteModalClientProps {
  contactId: number;
}

/**
 * Floating modal — staff records a free-text note against this contact.
 * Posts to `/api/portal/contacts/[contactId]/note` which inserts a
 * `crm_interactions` row with interaction_type = 'Note'.
 */
export function AddNoteModalClient({ contactId }: AddNoteModalClientProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [subject, setSubject] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setFeedback({ type: "error", message: "Note body is required." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/portal/contacts/${contactId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || "Note",
          notes: notes.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setFeedback({ type: "error", message: json.error ?? "Failed to save note." });
        return;
      }
      setFeedback({ type: "success", message: "Note saved." });
      setTimeout(() => {
        setOpen(false);
        setSubject("");
        setNotes("");
        setFeedback(null);
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
        title="Add note"
        aria-label="Add note"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 10,
          background: "#FFFFFF", border: "1px solid #E5EAF0", color: "#475467", cursor: "pointer",
        }}
      >
        <StickyNote size={15} />
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
              width: "95%", maxWidth: 460, borderRadius: 16, background: "#FFFFFF",
              border: "1px solid #E5EAF0", boxShadow: "0 24px 48px rgba(23,39,65,0.18)", overflow: "hidden",
              fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
            }}
          >
            <header style={{ padding: "14px 18px", borderBottom: "1px solid #E5EAF0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>Add Note</h3>
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
              <Field label="Subject (optional)">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Headteacher feedback"
                  style={inputStyle}
                />
              </Field>

              <Field label="Note">
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add context, observation, or follow-up..."
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
                {saving ? "Saving…" : "Save note"}
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
