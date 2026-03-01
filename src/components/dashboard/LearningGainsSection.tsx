"use client";

import type { LearningGainsData, DomainGainData } from "@/lib/types";
import { ReadingLevelMovementVisual } from "./ReadingLevelMovementVisual";

function GainIndicator({ value }: { value: number | null }) {
    if (value === null) return <span style={{ color: "#aaa" }}>—</span>;
    const color = value > 0 ? "#16a34a" : value < 0 ? "#dc2626" : "#666";
    const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "→";
    return <span style={{ color, fontWeight: 700 }}>{arrow} {Math.abs(value).toFixed(1)}pp</span>;
}

function domainColor(index: number) {
    const palette = ["#2563eb", "#7c3aed", "#0891b2", "#059669"];
    return palette[index % palette.length];
}

function SlopegraphRow({ domain, index }: { domain: DomainGainData; index: number }) {
    const color = domainColor(index);
    const baseVal = domain.baselineAvg ?? 0;
    const endVal = domain.endlineAvg ?? 0;
    const maxVal = Math.max(baseVal, endVal, 1);

    return (
        <div style={{ background: "var(--md-sys-color-surface, #fff)", borderRadius: "12px", padding: "1.25rem", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{domain.domain}</span>
                <GainIndicator value={domain.change} />
            </div>

            {/* Baseline → Endline bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.7rem", width: "50px", color: "#888" }}>Baseline</span>
                    <div style={{ flex: 1, background: "#e8e8e8", borderRadius: "4px", height: "10px", overflow: "hidden" }}>
                        <div style={{ width: `${(baseVal / Math.max(maxVal, 100)) * 100}%`, height: "100%", borderRadius: "4px", background: `${color}60`, transition: "width 0.5s ease" }} />
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, width: "36px", textAlign: "right" }}>{domain.baselineAvg !== null ? domain.baselineAvg.toFixed(0) : "–"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.7rem", width: "50px", color: "#888" }}>Endline</span>
                    <div style={{ flex: 1, background: "#e8e8e8", borderRadius: "4px", height: "10px", overflow: "hidden" }}>
                        <div style={{ width: `${(endVal / Math.max(maxVal, 100)) * 100}%`, height: "100%", borderRadius: "4px", background: color, transition: "width 0.5s ease" }} />
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, width: "36px", textAlign: "right" }}>{domain.endlineAvg !== null ? domain.endlineAvg.toFixed(0) : "–"}</span>
                </div>
            </div>

            {/* Distribution shift */}
            {domain.atBenchmarkPct !== null && (
                <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.25rem" }}>Proficiency distribution (endline)</div>
                    <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", height: "14px", fontSize: "0.65rem", fontWeight: 600 }}>
                        <div
                            style={{ width: `${domain.belowBenchmarkPct}%`, background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", minWidth: (domain.belowBenchmarkPct ?? 0) > 8 ? undefined : 0 }}
                            title={`Below: ${domain.belowBenchmarkPct}%`}
                        >
                            {(domain.belowBenchmarkPct ?? 0) > 8 ? `${domain.belowBenchmarkPct}%` : ""}
                        </div>
                        <div
                            style={{ width: `${domain.approachingPct}%`, background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", minWidth: (domain.approachingPct ?? 0) > 8 ? undefined : 0 }}
                            title={`Approaching: ${domain.approachingPct}%`}
                        >
                            {(domain.approachingPct ?? 0) > 8 ? `${domain.approachingPct}%` : ""}
                        </div>
                        <div
                            style={{ width: `${domain.atBenchmarkPct}%`, background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", minWidth: (domain.atBenchmarkPct ?? 0) > 8 ? undefined : 0 }}
                            title={`At benchmark: ${domain.atBenchmarkPct}%`}
                        >
                            {(domain.atBenchmarkPct ?? 0) > 8 ? `${domain.atBenchmarkPct}%` : ""}
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#999", marginTop: "0.15rem" }}>
                        <span>Below</span>
                        <span>Approaching</span>
                        <span>At benchmark</span>
                    </div>
                </div>
            )}

            <div style={{ fontSize: "0.7rem", color: "#aaa", marginTop: "0.5rem" }}>n = {domain.sampleSize.toLocaleString()}</div>
        </div>
    );
}

export default function LearningGainsSection({ data }: { data: LearningGainsData }) {
    return (
        <section id="learning-gains-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                    📈 Learning Gains Dashboard
                </h3>
                {data.schoolImprovementIndex !== null && (
                    <div style={{
                        background: data.schoolImprovementIndex > 0 ? "#dcfce7" : "#fee2e2",
                        color: data.schoolImprovementIndex > 0 ? "#16a34a" : "#dc2626",
                        padding: "0.35rem 0.75rem", borderRadius: "20px", fontWeight: 700, fontSize: "0.85rem"
                    }}>
                        School Improvement Index: {data.schoolImprovementIndex > 0 ? "+" : ""}{data.schoolImprovementIndex.toFixed(1)}pp
                    </div>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                {data.domains.map((d, i) => (
                    <SlopegraphRow key={d.domain} domain={d} index={i} />
                ))}
            </div>

            {data.readingLevels && (
                <div style={{ marginTop: "2rem" }}>
                    <ReadingLevelMovementVisual data={data.readingLevels} />
                </div>
            )}

            <div style={{ fontSize: "0.75rem", color: "#999", textAlign: "right", marginTop: "1rem" }}>
                Period: {data.period} · Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
            </div>
        </section>
    );
}
