"use client";

import React from "react";
import type { ReadingLevelsBlock } from "@/lib/types";

interface ReadingLevelMovementVisualProps {
    data: ReadingLevelsBlock;
}

export function ReadingLevelMovementVisual({ data }: ReadingLevelMovementVisualProps) {
    const levels = data.levels.sort((a, b) => a.level - b.level);

    // Find baseline and latest/endline distributions
    const baseline = data.distribution.find(d => d.cycle === "baseline");
    const latest = data.distribution.find(d => d.cycle === "latest") || data.distribution.find(d => d.cycle === "endline");

    if (!baseline || !latest) {
        return (
            <div className="portal-muted" style={{ padding: "1rem", textAlign: "center" }}>
                Insufficient data for reading level movement visualization.
            </div>
        );
    }

    const levelColors: Record<string, string> = {
        "Non-reader": "#fee2e2", // red-100
        "Emergent": "#fef3c7",    // amber-100
        "Transitional": "#dcfce7", // green-100
        "Fluent": "#dbeafe",      // blue-100
        "Advanced": "#f3e8ff",    // purple-100
    };

    const levelTextColors: Record<string, string> = {
        "Non-reader": "#dc2626", // red-600
        "Emergent": "#d97706",    // amber-600
        "Transitional": "#16a34a", // green-600
        "Fluent": "#2563eb",      // blue-600
        "Advanced": "#7c3aed",    // purple-600
    };

    return (
        <div className="reading-level-movement-card" style={{
            background: "var(--md-sys-color-surface, #fff)",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            border: "1px solid rgba(0,0,0,0.05)"
        }}>
            <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: 700 }}>
                    Reading Level Distribution Shift
                </h4>
                <p className="portal-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                    Tracking movement from baseline to latest assessment (n={latest.n})
                </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {/* Baseline Row */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#666" }}>BASELINE</span>
                        <span style={{ fontSize: "0.75rem", color: "#999" }}>n={baseline.n}</span>
                    </div>
                    <div style={{
                        display: "flex",
                        height: "32px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        background: "#f0f0f0"
                    }}>
                        {levels.map(level => {
                            const pct = baseline.percents[level.label] || 0;
                            if (pct === 0) return null;
                            return (
                                <div
                                    key={`base-${level.level}`}
                                    style={{
                                        width: `${pct}%`,
                                        background: levelColors[level.label] || "#eee",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        color: levelTextColors[level.label] || "#333",
                                        borderRight: "1px solid rgba(255,255,255,0.3)"
                                    }}
                                    title={`${level.label}: ${pct}%`}
                                >
                                    {pct > 10 ? `${pct}%` : ""}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mid-point Transition Indicators (Arrows) */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    margin: "-1rem 0",
                    color: "var(--md-sys-color-primary, #2563eb)",
                    fontSize: "1.2rem",
                    opacity: 0.6
                }}>
                    ↓↓↓
                </div>

                {/* Latest Row */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--md-sys-color-primary, #2563eb)" }}>LATEST</span>
                        <span style={{ fontSize: "0.75rem", color: "#999" }}>n={latest.n}</span>
                    </div>
                    <div style={{
                        display: "flex",
                        height: "40px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        background: "#f0f0f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}>
                        {levels.map(level => {
                            const pct = latest.percents[level.label] || 0;
                            if (pct === 0) return null;
                            return (
                                <div
                                    key={`latest-${level.level}`}
                                    style={{
                                        width: `${pct}%`,
                                        background: levelColors[level.label] || "#eee",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.8rem",
                                        fontWeight: 800,
                                        color: levelTextColors[level.label] || "#333",
                                        borderRight: "1px solid rgba(255,255,255,0.3)"
                                    }}
                                    title={`${level.label}: ${pct}%`}
                                >
                                    {pct > 8 ? `${pct}%` : ""}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{
                marginTop: "1.5rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid #f0f0f0"
            }}>
                {levels.map(level => (
                    <div key={`legend-${level.level}`} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: levelColors[level.label] || "#eee" }}></div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#555" }}>{level.label}</span>
                    </div>
                ))}
            </div>

            {data.movement && (
                <div style={{
                    marginTop: "1.5rem",
                    padding: "1rem",
                    background: "var(--md-sys-color-primary-container, #f0f7ff)",
                    borderRadius: "12px",
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    textAlign: "center"
                }}>
                    <div>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--md-sys-color-primary, #2563eb)" }}>
                            {data.movement.moved_up_1plus_percent.toFixed(0)}%
                        </div>
                        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#666" }}>MOVED UP 1+ LEVEL</div>
                    </div>
                    <div style={{ width: "1px", height: "24px", background: "rgba(0,0,0,0.1)" }}></div>
                    <div>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#16a34a" }}>
                            {data.movement.n_matched}
                        </div>
                        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#666" }}>MATCHED LEARNERS</div>
                    </div>
                </div>
            )}
        </div>
    );
}
