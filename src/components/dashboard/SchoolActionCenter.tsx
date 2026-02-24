"use client";

import { useState, useEffect } from "react";

interface SchoolActionData {
    schoolId: number;
    schoolName: string;
    fidelity: { totalScore: number; band: string };
    gains: {
        domains: Array<{
            domain: string;
            baselineAvg: number | null;
            endlineAvg: number | null;
            change: number | null;
            sampleSize: number;
        }>;
        schoolImprovementIndex: number | null;
    };
}

function ActionCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
    return (
        <div style={{
            background: "var(--md-sys-color-surface, #fff)", borderRadius: "14px",
            padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            borderTop: `4px solid ${accent ?? "var(--md-sys-color-primary, #2563eb)"}`,
        }}>
            <h4 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>{title}</h4>
            {children}
        </div>
    );
}

function GapTag({ domain, change }: { domain: string; change: number | null }) {
    if (change === null) return null;
    const color = change > 0 ? "#16a34a" : change < -5 ? "#dc2626" : "#b45309";
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.3rem",
            fontSize: "0.8rem", padding: "0.2rem 0.65rem", borderRadius: "12px",
            background: `${color}12`, color, fontWeight: 600, margin: "0.15rem",
        }}>
            {domain}: {change > 0 ? "+" : ""}{change.toFixed(1)}pp
        </span>
    );
}

export default function SchoolActionCenter({
    schoolId,
    schoolName,
}: {
    schoolId: number;
    schoolName: string;
}) {
    const [data, setData] = useState<SchoolActionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const [fRes, gRes] = await Promise.all([
                    fetch(`/api/impact?view=fidelity&level=school&id=${encodeURIComponent(schoolName)}`),
                    fetch(`/api/impact?view=gains&level=school&id=${encodeURIComponent(schoolName)}`),
                ]);
                const fidelity = await fRes.json();
                const gains = await gRes.json();
                if (!cancelled) {
                    setData({ schoolId, schoolName, fidelity, gains });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [schoolId, schoolName]);

    if (loading) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
                Loading School Action Center…
            </div>
        );
    }

    if (!data) return null;

    const weakestDomains = [...(data.gains.domains ?? [])]
        .filter((d) => d.change !== null)
        .sort((a, b) => (a.change ?? 0) - (b.change ?? 0))
        .slice(0, 2);

    const strongestDomains = [...(data.gains.domains ?? [])]
        .filter((d) => d.change !== null)
        .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
        .slice(0, 2);

    const coachingActions: string[] = [];
    if (data.fidelity.totalScore < 50) {
        coachingActions.push("Schedule additional coaching visit this term");
    }
    weakestDomains.forEach((d) => {
        if ((d.change ?? 0) < 5) {
            coachingActions.push(`Focus coaching on ${d.domain} — gains below target`);
        }
    });
    if (data.gains.schoolImprovementIndex !== null && data.gains.schoolImprovementIndex < 0) {
        coachingActions.push("Review teaching methodology — overall decline detected");
    }
    if (coachingActions.length === 0) {
        coachingActions.push("Continue current approach — results are positive");
    }

    return (
        <section id="school-action-center" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                🏫 School Action Center — {schoolName}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                {/* Fidelity snapshot */}
                <ActionCard title="Implementation Fidelity" accent={
                    data.fidelity.band === "Strong" ? "#16a34a" :
                        data.fidelity.band === "Developing" ? "#e8a317" :
                            data.fidelity.band === "Needs support" ? "#e85d04" : "#dc2626"
                }>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{
                            fontSize: "2rem", fontWeight: 800,
                            color: data.fidelity.band === "Strong" ? "#16a34a" :
                                data.fidelity.band === "Developing" ? "#e8a317" : "#dc2626",
                        }}>
                            {data.fidelity.totalScore}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{data.fidelity.band}</div>
                            <div style={{ fontSize: "0.8rem", color: "#888" }}>Composite fidelity score</div>
                        </div>
                    </div>
                </ActionCard>

                {/* Learning gaps & strengths */}
                <ActionCard title="Learning Gaps & Strengths">
                    <div style={{ marginBottom: "0.5rem" }}>
                        <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>Weakest domains:</div>
                        {weakestDomains.map((d) => <GapTag key={d.domain} domain={d.domain} change={d.change} />)}
                    </div>
                    <div>
                        <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>Strongest domains:</div>
                        {strongestDomains.map((d) => <GapTag key={d.domain} domain={d.domain} change={d.change} />)}
                    </div>
                </ActionCard>

                {/* Coaching actions */}
                <ActionCard title="📋 Recommended Actions" accent="#7c3aed">
                    <ul style={{ paddingLeft: "1.25rem", fontSize: "0.85rem", lineHeight: 1.8, color: "#333", margin: 0 }}>
                        {coachingActions.map((action, i) => (
                            <li key={i}>{action}</li>
                        ))}
                    </ul>
                </ActionCard>
            </div>

            {data.gains.schoolImprovementIndex !== null && (
                <div style={{
                    textAlign: "center", fontSize: "0.85rem", padding: "0.5rem 1rem",
                    borderRadius: "12px",
                    background: data.gains.schoolImprovementIndex > 0 ? "#dcfce7" : "#fee2e2",
                    color: data.gains.schoolImprovementIndex > 0 ? "#16a34a" : "#dc2626",
                    fontWeight: 700,
                }}>
                    School Improvement Index: {data.gains.schoolImprovementIndex > 0 ? "+" : ""}
                    {data.gains.schoolImprovementIndex.toFixed(1)}pp
                </div>
            )}
        </section>
    );
}
