import {
    getPublicImpactAggregate,
} from "@/services/dataService";
import Link from "next/link";
import type { Metadata } from "next";
import { TeacherEvaluationPerformanceCards } from "@/components/impact/TeacherEvaluationPerformanceCards";
import {
    buildFidelityFromAggregate,
    buildImpactKpisFromAggregate,
    buildLearningGainsFromAggregate,
} from "@/lib/public-impact-views";

export const revalidate = 300;

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { id } = await params;
    const name = decodeURIComponent(id);
    return {
        title: `${name} — Impact Profile | Ozeki Reading Bridge Foundation`,
        description: `Literacy program impact data for the ${name} — schools supported, learning gains, and implementation fidelity.`,
        openGraph: {
            title: `${name} — Impact Profile`,
            description: `Literacy program data for ${name}.`,
            type: "website",
        },
    };
}

export default async function RegionPage({ params }: { params: Params }) {
    const { id } = await params;
    const name = decodeURIComponent(id);
    const aggregate = await getPublicImpactAggregate("region", name, "FY");
    const fidelity = buildFidelityFromAggregate(aggregate, "region", name);
    const gains = buildLearningGainsFromAggregate(aggregate, "region", name);
    const kpis = buildImpactKpisFromAggregate(aggregate);

    return (
        <>
            <section className="page-hero" style={{ backgroundImage: "url('/photos/Reading%20Session%20in%20Dokolo%20Greater%20Bata%20Cluster.jpeg')" }}>
                <div className="container">
                    <nav className="impact-dash-breadcrumb" aria-label="Drill-down">
                        <Link href="/impact/dashboard">Dashboard</Link>
                        <span aria-hidden>›</span>
                        <span>{name}</span>
                    </nav>
                    <p className="kicker">Region Profile</p>
                    <h1>{name}</h1>
                    <p>Aggregated literacy program data for {name} region.</p>
                </div>
            </section>

            <section className="section" style={{ backgroundColor: "var(--md-sys-color-surface-container-low, #f6f6f6)" }}>
                <div className="container" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

                    {/* KPI Cards */}
                    <div className="impact-dash-kpi-grid">
                        <article className="impact-dash-kpi" style={{ "--kpi-accent": "#D96A0F" } as React.CSSProperties}>
                            <div className="impact-dash-kpi-body">
                                <span className="impact-dash-kpi-label">Schools Supported</span>
                                <span className="impact-dash-kpi-value">{kpis.schoolsSupported}</span>
                            </div>
                        </article>
                        <article className="impact-dash-kpi" style={{ "--kpi-accent": "#2563eb" } as React.CSSProperties}>
                            <div className="impact-dash-kpi-body">
                                <span className="impact-dash-kpi-label">Teachers Trained</span>
                                <span className="impact-dash-kpi-value">{kpis.teachersSupported.toLocaleString()}</span>
                            </div>
                        </article>
                        <article className="impact-dash-kpi" style={{ "--kpi-accent": "#7c3aed" } as React.CSSProperties}>
                            <div className="impact-dash-kpi-body">
                                <span className="impact-dash-kpi-label">Learners Assessed</span>
                                <span className="impact-dash-kpi-value">{kpis.learnersAssessed.toLocaleString()}</span>
                            </div>
                        </article>
                        <article className="impact-dash-kpi" style={{
                            "--kpi-accent": fidelity.band === "Strong" ? "#FA7D15" : fidelity.band === "Developing" ? "#e8a317" : "#dc2626",
                        } as React.CSSProperties}>
                            <div className="impact-dash-kpi-body">
                                <span className="impact-dash-kpi-label">Fidelity ({fidelity.band})</span>
                                <span className="impact-dash-kpi-value">{fidelity.totalScore}/100</span>
                            </div>
                        </article>
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
                                        Baseline: {d.baselineAvg?.toFixed(0) ?? "—"} → Endline: {d.endlineAvg?.toFixed(0) ?? "—"} (n={d.sampleSize})
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <TeacherEvaluationPerformanceCards
                        scopeLabel={`${name} Region`}
                        teachingQuality={aggregate.teachingQuality}
                    />

                    <p className="note-box impact-compliance-note">
                        Data is aggregated at region level. No individual learner or school-level identifiers are published.
                    </p>
                </div>
            </section>
        </>
    );
}
