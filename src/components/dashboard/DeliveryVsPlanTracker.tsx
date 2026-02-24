"use client";

interface PlanItem {
    label: string;
    target: number;
    actual: number;
    unit: string;
}

function progressColor(pct: number) {
    if (pct >= 90) return "#16a34a";
    if (pct >= 60) return "#e8a317";
    return "#dc2626";
}

export default function DeliveryVsPlanTracker({
    period,
    items,
}: {
    period: string;
    items: PlanItem[];
}) {
    return (
        <div style={{
            background: "var(--md-sys-color-surface, #fff)", borderRadius: "16px",
            padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>📊 Delivery vs Plan</h4>
                <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600 }}>{period}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {items.map((item) => {
                    const pct = item.target > 0 ? Math.round((item.actual / item.target) * 100) : 0;
                    const color = progressColor(pct);
                    return (
                        <div key={item.label}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.2rem" }}>
                                <span style={{ fontWeight: 600 }}>{item.label}</span>
                                <span>
                                    <span style={{ fontWeight: 700, color }}>{item.actual.toLocaleString()}</span>
                                    <span style={{ color: "#999" }}> / {item.target.toLocaleString()} {item.unit}</span>
                                    <span style={{ marginLeft: "0.5rem", fontWeight: 700, color, fontSize: "0.75rem" }}>({pct}%)</span>
                                </span>
                            </div>
                            <div style={{ height: "6px", borderRadius: "4px", background: "#e8e8e8", overflow: "hidden" }}>
                                <div style={{
                                    width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: "4px",
                                    background: `linear-gradient(90deg, ${color}bb, ${color})`,
                                    transition: "width 0.5s ease",
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
