"use client";

import { useState, useEffect } from "react";

interface QualitySummary {
    scopeType: string;
    scopeId: string;
    completenessScore: number;
    schoolsMissingBaseline: number;
    schoolsMissingEndline: number;
    outlierCount: number;
    duplicateLearnersDetected: number;
    lastChecked: string;
}

function QualityGauge({ score }: { score: number }) {
    const color = score >= 80 ? "#16a34a" : score >= 50 ? "#e8a317" : "#dc2626";
    return (
        <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: `conic-gradient(${color} ${score * 3.6}deg, #e8e8e8 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <div style={{
                width: 76, height: 76, borderRadius: "50%",
                background: "var(--md-sys-color-surface, #fff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column",
            }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color }}>{score}%</span>
                <span style={{ fontSize: "0.6rem", color: "#888" }}>Complete</span>
            </div>
        </div>
    );
}

function AlertCard({ count, label, severity }: { count: number; label: string; severity: "error" | "warning" | "ok" }) {
    const colors = { error: "#dc2626", warning: "#e8a317", ok: "#16a34a" };
    const bgs = { error: "#fee2e2", warning: "#fef3c7", ok: "#dcfce7" };
    return (
        <div style={{
            padding: "1rem 1.25rem", borderRadius: "12px",
            background: count > 0 ? bgs[severity] : bgs.ok,
            display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: count > 0 ? colors[severity] : colors.ok }}>
                {count}
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333" }}>{label}</span>
        </div>
    );
}

export default function DataQualityMonitor({ defaultScope }: { defaultScope?: string }) {
    const [scope, setScope] = useState(defaultScope ?? "country");
    const [scopeId, setScopeId] = useState("Uganda");
    const [data, setData] = useState<QualitySummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const res = await fetch(`/api/impact?view=quality&level=${scope}&id=${encodeURIComponent(scopeId)}`);
                const json = await res.json();
                if (!cancelled) setData(json);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [scope, scopeId]);

    return (
        <section style={{
            background: "var(--md-sys-color-surface, #fff)", borderRadius: "16px",
            padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>🔍 Data Quality Monitor</h3>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        style={{ padding: "0.35rem 0.75rem", borderRadius: "8px", border: "1.5px solid #d0d0d0", fontSize: "0.85rem" }}
                    >
                        <option value="country">Country</option>
                        <option value="region">Region</option>
                        <option value="district">District</option>
                    </select>
                    {scope !== "country" && (
                        <input
                            value={scopeId}
                            onChange={(e) => setScopeId(e.target.value)}
                            placeholder="Enter name…"
                            style={{ padding: "0.35rem 0.75rem", borderRadius: "8px", border: "1.5px solid #d0d0d0", fontSize: "0.85rem", width: "140px" }}
                        />
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#999" }}>Loading quality checks…</div>
            ) : data ? (
                <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <QualityGauge score={data.completenessScore} />
                    <div style={{ flex: 1, minWidth: 250, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <AlertCard count={data.schoolsMissingBaseline} label="Schools missing baseline" severity="warning" />
                        <AlertCard count={data.schoolsMissingEndline} label="Schools missing endline" severity="error" />
                        <AlertCard count={data.outlierCount} label="Score outliers detected" severity="warning" />
                        <AlertCard count={data.duplicateLearnersDetected} label="Duplicate learner IDs" severity="error" />
                    </div>
                </div>
            ) : (
                <p>Unable to load data quality summary.</p>
            )}

            {data && (
                <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#999", textAlign: "right" }}>
                    Last checked: {new Date(data.lastChecked).toLocaleString()}
                </div>
            )}
        </section>
    );
}
