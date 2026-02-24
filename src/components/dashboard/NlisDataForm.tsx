"use client";

import { useState } from "react";

type FormMode = "rubric" | "material" | "cost" | "consent" | "intervention" | "safeguarding";

interface NlisFormProps {
    mode: FormMode;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    schoolId?: number;
}

const FORM_CONFIGS: Record<FormMode, { title: string; emoji: string; fields: Array<{ name: string; label: string; type: string; required?: boolean; options?: string[] }> }> = {
    rubric: {
        title: "Teacher Observation Rubric",
        emoji: "📝",
        fields: [
            { name: "teacherUid", label: "Teacher ID / Name", type: "text", required: true },
            { name: "date", label: "Date", type: "date", required: true },
            { name: "lessonType", label: "Lesson Type", type: "select", options: ["Reading", "Phonics", "Comprehension", "Writing", "Other"], required: true },
            { name: "score1", label: "Lesson planning (1-4)", type: "number", required: true },
            { name: "score2", label: "Classroom management (1-4)", type: "number", required: true },
            { name: "score3", label: "Phonics instruction (1-4)", type: "number", required: true },
            { name: "score4", label: "Comprehension strategies (1-4)", type: "number", required: true },
            { name: "score5", label: "Differentiation (1-4)", type: "number", required: true },
            { name: "strengths", label: "Strengths observed", type: "textarea" },
            { name: "gaps", label: "Areas for improvement", type: "textarea" },
            { name: "coachingActions", label: "Coaching actions", type: "textarea" },
        ],
    },
    material: {
        title: "Material Distribution",
        emoji: "📦",
        fields: [
            { name: "date", label: "Distribution Date", type: "date", required: true },
            { name: "materialType", label: "Material Type", type: "select", options: ["Reading books", "Decodable readers", "Teacher guides", "Posters/charts", "Assessment tools", "Other"], required: true },
            { name: "quantity", label: "Quantity", type: "number", required: true },
            { name: "notes", label: "Notes", type: "textarea" },
        ],
    },
    cost: {
        title: "Cost Entry",
        emoji: "💰",
        fields: [
            { name: "scopeType", label: "Scope", type: "select", options: ["country", "region", "district", "school"], required: true },
            { name: "scopeValue", label: "Scope Name", type: "text", required: true },
            { name: "period", label: "Period (e.g. 2025-Q1)", type: "text", required: true },
            { name: "category", label: "Category", type: "select", options: ["transport", "meals", "printing", "staff_time", "materials", "training", "assessment", "other"], required: true },
            { name: "amount", label: "Amount ($)", type: "number", required: true },
            { name: "notes", label: "Notes", type: "textarea" },
        ],
    },
    consent: {
        title: "Consent Record",
        emoji: "🔒",
        fields: [
            { name: "consentType", label: "Consent Type", type: "select", options: ["photo", "video", "story"], required: true },
            { name: "source", label: "Source / Guardian Name", type: "text", required: true },
            { name: "date", label: "Date", type: "date", required: true },
            { name: "allowedUsage", label: "Allowed Usage", type: "select", options: ["public", "partner", "internal"], required: true },
            { name: "linkedFiles", label: "Linked Files (URLs)", type: "text" },
            { name: "expiryDate", label: "Expiry Date", type: "date" },
        ],
    },
    intervention: {
        title: "Intervention Group",
        emoji: "🎯",
        fields: [
            { name: "grade", label: "Grade", type: "text", required: true },
            { name: "targetSkill", label: "Target Skill", type: "select", options: ["Letter-sound", "Blending", "Fluency", "Comprehension", "Vocabulary"], required: true },
            { name: "schedule", label: "Schedule", type: "text" },
            { name: "startDate", label: "Start Date", type: "date", required: true },
            { name: "endDate", label: "End Date", type: "date" },
        ],
    },
    safeguarding: {
        title: "Safeguarding Incident Report",
        emoji: "🛡️",
        fields: [
            { name: "date", label: "Incident Date", type: "date", required: true },
            { name: "incidentType", label: "Incident Type", type: "select", options: ["Physical harm", "Verbal abuse", "Neglect", "Discrimination", "Other"], required: true },
            { name: "severity", label: "Severity", type: "select", options: ["Low", "Medium", "High", "Critical"], required: true },
            { name: "description", label: "Description", type: "textarea", required: true },
            { name: "actionTaken", label: "Immediate Action Taken", type: "textarea", required: true },
            { name: "referredTo", label: "Referred To", type: "text" },
            { name: "followUpDate", label: "Follow-up Date", type: "date" },
        ],
    },
};

export default function NlisDataForm({ mode, onSubmit, schoolId }: NlisFormProps) {
    const config = FORM_CONFIGS[mode];
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    function update(name: string, value: string) {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setSuccess(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await onSubmit({ ...formData, schoolId });
            setSuccess(true);
            setFormData({});
        } finally {
            setSaving(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                background: "var(--md-sys-color-surface, #fff)", borderRadius: "16px",
                padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
        >
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 700 }}>
                {config.emoji} {config.title}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                {config.fields.map((field) => (
                    <div key={field.name} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", gridColumn: field.type === "textarea" ? "1 / -1" : undefined }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                            {field.label}
                            {field.required && <span style={{ color: "#dc2626" }}> *</span>}
                        </label>
                        {field.type === "textarea" ? (
                            <textarea
                                value={formData[field.name] ?? ""}
                                onChange={(e) => update(field.name, e.target.value)}
                                required={field.required}
                                rows={3}
                                style={{
                                    borderRadius: "8px", border: "1.5px solid #d0d0d0",
                                    padding: "0.5rem 0.75rem", fontSize: "0.85rem", resize: "vertical",
                                }}
                            />
                        ) : field.type === "select" ? (
                            <select
                                value={formData[field.name] ?? ""}
                                onChange={(e) => update(field.name, e.target.value)}
                                required={field.required}
                                style={{
                                    borderRadius: "8px", border: "1.5px solid #d0d0d0",
                                    padding: "0.5rem 0.75rem", fontSize: "0.85rem",
                                }}
                            >
                                <option value="">Select…</option>
                                {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : (
                            <input
                                type={field.type}
                                value={formData[field.name] ?? ""}
                                onChange={(e) => update(field.name, e.target.value)}
                                required={field.required}
                                min={field.type === "number" ? 0 : undefined}
                                max={field.type === "number" && field.name.startsWith("score") ? 4 : undefined}
                                style={{
                                    borderRadius: "8px", border: "1.5px solid #d0d0d0",
                                    padding: "0.5rem 0.75rem", fontSize: "0.85rem",
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.5rem" }}>
                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        padding: "0.6rem 1.5rem", borderRadius: "8px", border: "none",
                        background: "var(--md-sys-color-primary, #2563eb)", color: "#fff",
                        fontWeight: 700, cursor: saving ? "wait" : "pointer", fontSize: "0.9rem",
                    }}
                >
                    {saving ? "Saving…" : "Submit"}
                </button>
                {success && (
                    <span style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>
                        ✓ Saved successfully
                    </span>
                )}
            </div>
        </form>
    );
}
