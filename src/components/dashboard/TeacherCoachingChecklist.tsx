"use client";

import { useState } from "react";

interface ChecklistItem {
    id: string;
    label: string;
    description?: string;
}

const COACHING_CHECKLIST: ChecklistItem[] = [
    { id: "lesson_plan", label: "Lesson plan reviewed", description: "Teacher has a written lesson plan for the observed period" },
    { id: "print_materials", label: "Print-rich environment", description: "Classroom walls display learner work, word walls, or reading charts" },
    { id: "group_reading", label: "Group reading session observed", description: "Teacher conducted structured group reading with all learners" },
    { id: "phonics_drill", label: "Phonics instruction", description: "Explicit phonics/letter-sound instruction was part of the lesson" },
    { id: "comprehension", label: "Comprehension questions asked", description: "Teacher asked at least 3 comprehension questions during read-aloud" },
    { id: "feedback_loop", label: "Corrective feedback given", description: "Teacher provided individual or group corrective feedback" },
    { id: "time_on_task", label: "Reading time ≥ 30 min", description: "Dedicated reading instruction lasted at least 30 minutes" },
    { id: "assessment_used", label: "Formative assessment used", description: "Teacher used quick checks or running records during the lesson" },
    { id: "differentiation", label: "Differentiated instruction", description: "Teacher grouped learners by level or adapted tasks for struggling readers" },
    { id: "learner_engagement", label: "All learners engaged", description: "Most learners were actively participating throughout the session" },
];

export default function TeacherCoachingChecklist({
    teacherName,
    schoolName,
    onSave,
}: {
    teacherName: string;
    schoolName: string;
    onSave?: (checked: string[], notes: string) => void;
}) {
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState("");

    function toggle(id: string) {
        setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    const score = Math.round((checked.size / COACHING_CHECKLIST.length) * 100);

    return (
        <div style={{
            background: "var(--md-sys-color-surface, #fff)", borderRadius: "16px",
            padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>📝 Coaching Checklist</h4>
                    <div style={{ fontSize: "0.8rem", color: "#888" }}>{teacherName} — {schoolName}</div>
                </div>
                <div style={{
                    fontSize: "1.25rem", fontWeight: 800,
                    color: score >= 70 ? "#16a34a" : score >= 40 ? "#e8a317" : "#dc2626",
                }}>
                    {score}%
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {COACHING_CHECKLIST.map((item) => (
                    <label
                        key={item.id}
                        style={{
                            display: "flex", alignItems: "flex-start", gap: "0.65rem",
                            padding: "0.5rem 0.65rem", borderRadius: "8px", cursor: "pointer",
                            background: checked.has(item.id) ? "#dcfce720" : "transparent",
                            transition: "background 0.15s",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={checked.has(item.id)}
                            onChange={() => toggle(item.id)}
                            style={{ marginTop: "0.15rem", accentColor: "#16a34a", width: 16, height: 16 }}
                        />
                        <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{item.label}</div>
                            {item.description && (
                                <div style={{ fontSize: "0.75rem", color: "#888" }}>{item.description}</div>
                            )}
                        </div>
                    </label>
                ))}
            </div>

            <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                    Coaching notes
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Key observations, strengths, and improvement areas…"
                    style={{
                        width: "100%", borderRadius: "8px", border: "1.5px solid #d0d0d0",
                        padding: "0.65rem", fontSize: "0.85rem", resize: "vertical",
                    }}
                />
            </div>

            <button
                onClick={() => onSave?.(Array.from(checked), notes)}
                style={{
                    marginTop: "0.75rem", padding: "0.6rem 1.5rem", borderRadius: "8px",
                    border: "none", background: "var(--md-sys-color-primary, #2563eb)",
                    color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
                }}
            >
                Save Observation
            </button>
        </div>
    );
}
