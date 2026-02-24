"use client";

import type { FidelityDashboardData, FidelityScore } from "@/lib/types";

function bandColor(band: string) {
    switch (band) {
        case "Strong":
            return "var(--md-sys-color-primary)";
        case "Developing":
            return "#e8a317";
        case "Needs support":
            return "#e85d04";
        case "High priority":
            return "#d00000";
        default:
            return "#888";
    }
}

function FidelityGaugeBar({ score, label, detail }: { score: number; label: string; detail: string }) {
    return (
        <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span style={{ fontWeight: 700, color: bandColor(score >= 75 ? "Strong" : score >= 50 ? "Developing" : score >= 25 ? "Needs support" : "High priority") }}>{score}%</span>
            </div>
            <div style={{ background: "var(--md-sys-color-surface-container-high, #e0e0e0)", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(score, 100)}%`, height: "100%", borderRadius: "6px", background: `linear-gradient(90deg, ${bandColor(score >= 75 ? "Strong" : score >= 50 ? "Developing" : score >= 25 ? "Needs support" : "High priority")}, ${bandColor(score >= 75 ? "Strong" : score >= 50 ? "Developing" : score >= 25 ? "Needs support" : "High priority")}dd)`, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.15rem" }}>{detail}</div>
        </div>
    );
}

function FidelityCard({ fidelity }: { fidelity: FidelityScore }) {
    return (
        <div style={{ background: "var(--md-sys-color-surface, #fff)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: `conic-gradient(${bandColor(fidelity.band)} ${fidelity.totalScore * 3.6}deg, #e8e8e8 0deg)`,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--md-sys-color-surface, #fff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", color: bandColor(fidelity.band) }}>
                        {fidelity.totalScore}
                    </div>
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Implementation Fidelity</div>
                    <div style={{ fontSize: "0.85rem", color: bandColor(fidelity.band), fontWeight: 600 }}>{fidelity.band}</div>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>{fidelity.sampleSize} schools in scope</div>
                </div>
            </div>
            {fidelity.drivers.map((d) => (
                <FidelityGaugeBar key={d.driver} score={d.score} label={d.label} detail={d.detail} />
            ))}
        </div>
    );
}

function RankingTable({ rankings }: { rankings: FidelityDashboardData["rankings"] }) {
    if (rankings.length === 0) return null;
    return (
        <div style={{ background: "var(--md-sys-color-surface, #fff)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h4 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1rem" }}>Fidelity Rankings</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                    <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left" }}>
                        <th style={{ padding: "0.5rem 0.25rem" }}>#</th>
                        <th style={{ padding: "0.5rem 0.25rem" }}>Name</th>
                        <th style={{ padding: "0.5rem 0.25rem", textAlign: "right" }}>Score</th>
                        <th style={{ padding: "0.5rem 0.25rem", textAlign: "right" }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {rankings.map((r, i) => (
                        <tr key={r.name} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "0.5rem 0.25rem", fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: "0.5rem 0.25rem" }}>{r.name}</td>
                            <td style={{ padding: "0.5rem 0.25rem", textAlign: "right", fontWeight: 700 }}>{r.score}</td>
                            <td style={{ padding: "0.5rem 0.25rem", textAlign: "right" }}>
                                <span style={{
                                    fontSize: "0.75rem", fontWeight: 600, padding: "0.15rem 0.5rem",
                                    borderRadius: "12px", background: `${bandColor(r.band)}18`, color: bandColor(r.band)
                                }}>{r.band}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ImpactFidelitySection({
    data,
}: {
    data: FidelityDashboardData | FidelityScore;
}) {
    const isDashboard = "children" in data;
    const scope = isDashboard ? (data as FidelityDashboardData).scope : (data as FidelityScore);

    return (
        <section id="fidelity-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                📐 Implementation Fidelity Index
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: isDashboard ? "1fr 1fr" : "1fr", gap: "1.5rem" }}>
                <FidelityCard fidelity={scope} />
                {isDashboard && <RankingTable rankings={(data as FidelityDashboardData).rankings} />}
            </div>
        </section>
    );
}
