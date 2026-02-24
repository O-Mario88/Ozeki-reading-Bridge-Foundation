"use client";

import { useState } from "react";
import type { CostEffectivenessData, ImpactCalculatorResult } from "@/lib/types";

function MetricCard({ label, value, prefix }: { label: string; value: number | null; prefix?: string }) {
    return (
        <div style={{
            background: "var(--md-sys-color-surface, #fff)", borderRadius: "12px", padding: "1.25rem",
            boxShadow: "0 1px 8px rgba(0,0,0,0.04)", textAlign: "center"
        }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--md-sys-color-primary, #2563eb)" }}>
                {value !== null ? `${prefix ?? "$"}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem", fontWeight: 500 }}>{label}</div>
        </div>
    );
}

function CostBreakdownBar({ breakdown }: { breakdown: CostEffectivenessData["breakdown"] }) {
    const total = breakdown.reduce((s, b) => s + b.amount, 0);
    if (total === 0) return <div style={{ fontSize: "0.85rem", color: "#999", fontStyle: "italic" }}>No cost data recorded yet</div>;

    const catColors: Record<string, string> = {
        transport: "#3b82f6", meals: "#f59e0b", printing: "#8b5cf6", staff_time: "#10b981",
        materials: "#ec4899", training: "#06b6d4", assessment: "#f97316", other: "#6b7280",
    };

    return (
        <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>Cost Breakdown</div>
            <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", height: "20px" }}>
                {breakdown.map((b) => (
                    <div
                        key={b.category}
                        title={`${b.category}: $${b.amount.toLocaleString()}`}
                        style={{
                            width: `${(b.amount / total) * 100}%`, background: catColors[b.category] ?? "#888",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.6rem", fontWeight: 700, color: "#fff",
                            minWidth: (b.amount / total) > 0.08 ? undefined : 0,
                        }}
                    >
                        {(b.amount / total) > 0.08 ? b.category.replace("_", " ") : ""}
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                {breakdown.map((b) => (
                    <span key={b.category} style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: catColors[b.category] ?? "#888", display: "inline-block" }} />
                        {b.category.replace("_", " ")}: ${b.amount.toLocaleString()}
                    </span>
                ))}
            </div>
        </div>
    );
}

function ImpactCalculator({ scopeType, scopeId }: { scopeType: string; scopeId: string }) {
    const [amount, setAmount] = useState<number>(10000);
    const [result, setResult] = useState<ImpactCalculatorResult | null>(null);
    const [loading, setLoading] = useState(false);

    async function calculate() {
        setLoading(true);
        try {
            const res = await fetch(`/api/impact?view=calculator&amount=${amount}&level=${scopeType}&id=${encodeURIComponent(scopeId)}`);
            const data = await res.json();
            setResult(data);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ background: "var(--md-sys-color-surface, #fff)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h4 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>💡 Impact Calculator</h4>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Investment amount ($)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        min={100}
                        style={{
                            padding: "0.5rem 0.75rem", borderRadius: "8px",
                            border: "1.5px solid #d0d0d0", fontSize: "1rem", width: "160px",
                        }}
                    />
                </div>
                <button
                    onClick={calculate}
                    disabled={loading}
                    style={{
                        padding: "0.5rem 1.25rem", borderRadius: "8px", border: "none",
                        background: "var(--md-sys-color-primary, #2563eb)", color: "#fff",
                        fontWeight: 700, cursor: loading ? "wait" : "pointer", fontSize: "0.9rem",
                    }}
                >
                    {loading ? "Calculating…" : "Calculate Impact"}
                </button>
            </div>
            {result && (
                <div style={{ marginTop: "1.25rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                        <MetricCard label="Schools" value={result.estimatedSchools} prefix="" />
                        <MetricCard label="Teachers" value={result.estimatedTeachers} prefix="" />
                        <MetricCard label="Learners" value={result.estimatedLearners} prefix="" />
                    </div>
                    <p style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "#444" }}>{result.estimatedOutcomes}</p>
                    <details style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.5rem" }}>
                        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Methodology & Assumptions</summary>
                        <p style={{ marginTop: "0.5rem" }}>{result.methodology}</p>
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            {result.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    </details>
                </div>
            )}
        </div>
    );
}

export default function CostEffectivenessSection({
    data,
    scopeType,
    scopeId,
}: {
    data: CostEffectivenessData;
    scopeType: string;
    scopeId: string;
}) {
    return (
        <section id="cost-effectiveness-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                💰 Cost-Effectiveness & Impact ROI
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                <MetricCard label="Total Investment" value={data.totalCost} />
                <MetricCard label="Cost / School" value={data.costPerSchool} />
                <MetricCard label="Cost / Teacher" value={data.costPerTeacher} />
                <MetricCard label="Cost / Learner Assessed" value={data.costPerLearnerAssessed} />
            </div>

            <CostBreakdownBar breakdown={data.breakdown} />

            <ImpactCalculator scopeType={scopeType} scopeId={scopeId} />

            <div style={{ fontSize: "0.75rem", color: "#999", textAlign: "right" }}>
                Period: {data.period}
            </div>
        </section>
    );
}
