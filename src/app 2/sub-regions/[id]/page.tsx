import { getImpactDrilldownData, calculateFidelityScore, getLearningGainsData } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { id } = await params;
    const name = decodeURIComponent(id);
    return {
        title: `${name} Sub-Region — Impact Profile | Ozeki Reading Bridge Foundation`,
        description: `Sub-Region level literacy implementation data for ${name} — fidelity scores, learning gains, and school coverage.`,
        openGraph: {
            title: `${name} Sub-Region — Impact Profile`,
            description: `Sub-Region level literacy data for ${name}.`,
            type: "website",
        },
    };
}

export default async function SubRegionPage({ params }: { params: Params }) {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const drilldown = getImpactDrilldownData("sub_region", name);
    const fidelity = calculateFidelityScore("region", name); // Fallback to region for now if sub_region not fully supported in calculateFidelityScore
    const gains = getLearningGainsData("region", name);

    return (
        <>
            <section className="page-hero">
                <div className="container">
                    <nav className="impact-dash-breadcrumb" aria-label="Drill-down">
                        <Link href="/impact/dashboard">Dashboard</Link>
                        <span aria-hidden>›</span>
                        <span>{name} Sub-Region</span>
                    </nav>
                    <p className="kicker">Sub-Region Profile</p>
                    <h1>{name}</h1>
                    <p>Implementation and outcome data for {name} sub-region.</p>
                </div>
            </section>

            <section className="section" style={{ backgroundColor: "var(--md-sys-color-surface-container-low, #f6f6f6)" }}>
                <div className="container" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

                    {/* KPI Cards */}
                    <div className="impact-dash-kpi-grid">
                        <article className="impact-dash-kpi" style={{ "--kpi-accent": "#0d7c66" } as React.CSSProperties}>
                            <div className="impact-dash-kpi-body">
                                <span className="impact-dash-kpi-label">Schools</span>
                                <span className="impact-dash-kpi-value">{drilldown.kpis.schoolsSupported}</span>
                            </div>
                        </article>
                        <article className="impact-dash-kpi" style={{ "--kpi-accent": "#7c3aed" } as React.CSSProperties}>
                            <div className="impact-dash-kpi-body">
                                <span className="impact-dash-kpi-label">Learners Assessed</span>
                                <span className="impact-dash-kpi-value">{drilldown.kpis.learnersAssessed.toLocaleString()}</span>
                            </div>
                        </article>
                        <article className="impact-dash-kpi" style={{
                            "--kpi-accent": fidelity.band === "Strong" ? "#16a34a" : fidelity.band === "Developing" ? "#e8a317" : "#dc2626",
                        } as React.CSSProperties}>
                            <div className="impact-dash-kpi-body">
                                <span className="impact-dash-kpi-label">Fidelity ({fidelity.band})</span>
                                <span className="impact-dash-kpi-value">{fidelity.totalScore}/100</span>
                            </div>
                        </article>
                        {gains.schoolImprovementIndex !== null && (
                            <article className="impact-dash-kpi" style={{
                                "--kpi-accent": gains.schoolImprovementIndex > 0 ? "#16a34a" : "#dc2626",
                            } as React.CSSProperties}>
                                <div className="impact-dash-kpi-body">
                                    <span className="impact-dash-kpi-label">Improvement Index</span>
                                    <span className="impact-dash-kpi-value">
                                        {gains.schoolImprovementIndex > 0 ? "+" : ""}{gains.schoolImprovementIndex.toFixed(1)}pp
                                    </span>
                                </div>
                            </article>
                        )}
                    </div>

                    {/* Fidelity Drivers */}
                    <div className="card" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginTop: 0 }}>Fidelity Drivers</h3>
                        {fidelity.drivers.map((d) => (
                            <div key={d.driver} style={{ marginBottom: "0.75rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                                    <span style={{ fontWeight: 600 }}>{d.label}</span>
                                    <span style={{ fontWeight: 700, color: d.score >= 75 ? "#16a34a" : d.score >= 50 ? "#e8a317" : "#dc2626" }}>{d.score}%</span>
                                </div>
                                <div style={{ height: "6px", borderRadius: "4px", background: "#e8e8e8", overflow: "hidden", marginTop: "0.15rem" }}>
                                    <div style={{ width: `${d.score}%`, height: "100%", borderRadius: "4px", background: d.score >= 75 ? "#16a34a" : d.score >= 50 ? "#e8a317" : "#dc2626" }} />
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#999" }}>{d.detail}</div>
                            </div>
                        ))}
                    </div>

                    {/* Learning Outcomes */}
                    <div className="card" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginTop: 0 }}>Learning Outcomes</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                            {gains.domains.map((d) => (
                                <div key={d.domain} className="impact-dash-domain">
                                    <div className="impact-dash-domain-head">
                                        <span className="impact-dash-domain-label">{d.domain}</span>
                                        {d.change !== null && (
                                            <span
                                                className="impact-dash-domain-change"
                                                data-positive={d.change > 0 ? "" : undefined}
                                                data-negative={d.change < 0 ? "" : undefined}
                                            >
                                                {d.change > 0 ? "+" : ""}{d.change.toFixed(1)}pp
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "#666" }}>
                                        Baseline: {d.baselineAvg?.toFixed(0) ?? "—"} → Endline: {d.endlineAvg?.toFixed(0) ?? "—"} (n={d.sampleSize})
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="note-box impact-compliance-note">
                        This page shows aggregated sub-region-level data only.
                    </p>
                </div>
            </section>
        </>
    );
}
