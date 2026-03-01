import { getImpactDrilldownData, calculateFidelityScore, getLearningGainsData } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { id } = await params;
    const name = decodeURIComponent(id);
    return {
        title: `${name} — School Impact Profile | Ozeki Reading Bridge Foundation`,
        description: `Aggregated literacy program data for ${name}: enrollment, coaching visits, assessment outcomes, and implementation fidelity.`,
        openGraph: {
            title: `${name} — School Impact Profile`,
            description: `Aggregated literacy program data for ${name}.`,
            type: "website",
        },
    };
}

export default async function SchoolPage({ params }: { params: Params }) {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const drilldown = getImpactDrilldownData("school", name);
    const fidelity = calculateFidelityScore("school", name);
    const gains = getLearningGainsData("school", name);

    return (
        <>
            <section className="page-hero">
                <div className="container">
                    <nav className="impact-dash-breadcrumb" aria-label="Drill-down">
                        <Link href="/impact/dashboard">Dashboard</Link>
                        <span aria-hidden>›</span>
                        <span>{name}</span>
                    </nav>
                    <p className="kicker">School Profile</p>
                    <h1>{name}</h1>
                    <p>Aggregated implementation and outcome data.</p>
                </div>
            </section>

            <section className="section" style={{ backgroundColor: "var(--md-sys-color-surface-container-low, #f6f6f6)" }}>
                <div className="container" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

                    {/* KPI Cards */}
                    <div className="impact-dash-kpi-grid">
                        <article className="impact-dash-kpi" style={{ "--kpi-accent": "#0d7c66" } as React.CSSProperties}>
                            <div className="impact-dash-kpi-body">
                                <span className="impact-dash-kpi-label">Learners Enrolled</span>
                                <span className="impact-dash-kpi-value">{drilldown.kpis.learnersEnrolled.toLocaleString()}</span>
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
                    </div>

                    {/* Fidelity drivers */}
                    <div className="card" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginTop: 0 }}>Implementation Fidelity</h3>
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

                    {/* Learning outcomes */}
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
                                        {d.baselineAvg?.toFixed(0) ?? "—"} → {d.endlineAvg?.toFixed(0) ?? "—"} (n={d.sampleSize})
                                    </div>
                                </div>
                            ))}
                        </div>
                        {gains.schoolImprovementIndex !== null && (
                            <div style={{
                                marginTop: "1rem", textAlign: "center", padding: "0.5rem",
                                borderRadius: "12px",
                                background: gains.schoolImprovementIndex > 0 ? "#dcfce7" : "#fee2e2",
                                color: gains.schoolImprovementIndex > 0 ? "#16a34a" : "#dc2626",
                                fontWeight: 700, fontSize: "0.9rem",
                            }}>
                                School Improvement Index: {gains.schoolImprovementIndex > 0 ? "+" : ""}{gains.schoolImprovementIndex.toFixed(1)}pp
                            </div>
                        )}
                    </div>

                    <p className="note-box impact-compliance-note">
                        School profiles display group-level aggregated data only. No individual learner
                        information is shown. For learner-level data, authorized staff must access
                        the secure portal.
                    </p>
                </div>
            </section>
        </>
    );
}
