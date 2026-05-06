"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

interface Props {
  /** Optional pre-fill for the New Plan dialog. */
  defaults?: {
    region?: string;
    type?: string;
  };
}

const SCOPE_TYPES = ["Country", "Region", "District", "Cluster", "School"] as const;
const PLAN_TYPES = [
  "Coaching Cycles",
  "Remedial Reading",
  "Materials Support",
  "Leadership Support",
  "Data Quality Fixes",
] as const;
const STATUSES = ["Planned", "Approved", "In Progress", "At Risk", "Completed", "Verified"] as const;
const RISKS = ["Low", "Medium", "High"] as const;

/**
 * NewInterventionPlanModal — minimal client wrapper that posts to
 * /api/portal/interventions and refreshes the route. The form fields
 * mirror intervention_plans columns (title / scope / type / owner /
 * due / status / risk / region / schools) so a Reading Coordinator
 * can capture the plan in one step from the Interventions dashboard.
 */
export function NewInterventionPlanModal({ defaults = {} }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    const data = new FormData(event.currentTarget);
    const payload = {
      title: String(data.get("title") ?? "").trim(),
      scopeType: String(data.get("scopeType") ?? "Country"),
      scopeName: String(data.get("scopeName") ?? "").trim() || undefined,
      type: String(data.get("type") ?? "") || undefined,
      ownerName: String(data.get("ownerName") ?? "").trim() || undefined,
      status: String(data.get("status") ?? "Planned"),
      progressPct: Number(data.get("progressPct") ?? 0),
      dueDate: String(data.get("dueDate") ?? "").trim() || undefined,
      risk: String(data.get("risk") ?? "Low"),
      region: String(data.get("region") ?? "").trim() || undefined,
      schoolsCount: Number(data.get("schoolsCount") ?? 0),
    };

    try {
      const res = await fetch("/api/portal/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setFeedback({ tone: "error", message: json.error ?? "Failed to create plan." });
        return;
      }
      setFeedback({ tone: "success", message: "Plan created." });
      setTimeout(() => {
        setOpen(false);
        setFeedback(null);
        router.refresh();
      }, 700);
    } catch {
      setFeedback({ tone: "error", message: "Network error. Please try again." });
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
          display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px",
          borderRadius: 10, background: "#066A67", color: "#fff", fontSize: 13, fontWeight: 700,
          border: "1px solid #066A67", cursor: "pointer",
          fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
        }}
      >
        <Plus size={14} /> New Plan
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
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            style={{
              width: "95%", maxWidth: 640, maxHeight: "90vh", overflow: "auto",
              borderRadius: 16, background: "#FFFFFF", border: "1px solid #E5EAF0",
              boxShadow: "0 24px 48px rgba(23,39,65,0.18)",
              fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
            }}
          >
            <header style={{ padding: "14px 18px", borderBottom: "1px solid #E5EAF0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>New Reading Intervention Plan</h3>
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                style={{ background: "transparent", border: 0, fontSize: 18, color: "#667085", cursor: "pointer" }}
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Plan title" full>
                <input name="title" required minLength={2} maxLength={280} placeholder="e.g. P3 Phonics Recovery — Lango Region" style={inputStyle} />
              </Field>

              <Field label="Scope">
                <select name="scopeType" defaultValue="Country" style={inputStyle}>
                  {SCOPE_TYPES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </Field>
              <Field label="Scope name">
                <input name="scopeName" placeholder="e.g. Lango Region" style={inputStyle} />
              </Field>

              <Field label="Plan type">
                <select name="type" defaultValue={defaults.type ?? "Coaching Cycles"} style={inputStyle}>
                  <option value="">(none)</option>
                  {PLAN_TYPES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select name="status" defaultValue="Planned" style={inputStyle}>
                  {STATUSES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </Field>

              <Field label="Owner (display name)">
                <input name="ownerName" placeholder="Defaults to your account" style={inputStyle} />
              </Field>
              <Field label="Region">
                <input name="region" defaultValue={defaults.region ?? ""} placeholder="e.g. Northern" style={inputStyle} />
              </Field>

              <Field label="Due date">
                <input name="dueDate" type="date" style={inputStyle} />
              </Field>
              <Field label="Risk">
                <select name="risk" defaultValue="Low" style={inputStyle}>
                  {RISKS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </Field>

              <Field label="Progress %">
                <input name="progressPct" type="number" min={0} max={100} defaultValue={0} style={inputStyle} />
              </Field>
              <Field label="Schools covered">
                <input name="schoolsCount" type="number" min={0} defaultValue={0} style={inputStyle} />
              </Field>

              {feedback ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                    background: feedback.tone === "success" ? "#ECFDF5" : "#FEF2F2",
                    color: feedback.tone === "success" ? "#166534" : "#991B1B",
                    border: `1px solid ${feedback.tone === "success" ? "#A7F3D0" : "#FECACA"}`,
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
              <button type="submit" disabled={saving} style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Create plan"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1 / -1" : undefined }}>
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
  display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px",
  borderRadius: 10, background: "#066A67", color: "#fff", fontSize: 13, fontWeight: 700,
  border: "1px solid #066A67", cursor: "pointer",
};
const buttonGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px",
  borderRadius: 10, background: "#FFFFFF", color: "#111827", fontSize: 13, fontWeight: 600,
  border: "1px solid #E5EAF0", cursor: "pointer",
};
