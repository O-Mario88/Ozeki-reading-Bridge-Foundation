import Link from "next/link";
import { listPublicImpactReports, getImpactSummary } from "@/lib/db";

export const metadata = {
    title: "Partner Data Room — Ozeki Reading Bridge Foundation",
    description:
        "Methodology documentation, data codebook, program evidence, and downloadable reports for funding and implementation partners.",
};

export const dynamic = "force-dynamic";

export default function PartnerDataRoomPage() {
    const reports = listPublicImpactReports({ limit: 20 });
    const summary = getImpactSummary();
    const metrics = new Map(summary.metrics.map((m) => [m.label, m.value]));

    return (
        <>
            <section className="page-hero">
                <div className="container">
                    <p className="kicker">Partner Data Room</p>
                    <h1>Evidence &amp; Data Center</h1>
                    <p>
                        Transparent, donor-grade documentation of our methodology, data
                        standards, and program evidence. Everything partners need to
                        evaluate, co-fund, or scale the Ozeki Reading Bridge model.
                    </p>
                    <div className="action-row">
                        <Link className="inline-download-link" href="/impact/methodology">
                            Read Methodology
                        </Link>
                        <Link className="button button-ghost" href="/api/impact/export?format=csv">
                            ⬇ Export Data (CSV)
                        </Link>
                    </div>
                </div>
            </section>

            {/* At-a-glance */}
            <section className="section" style={{ backgroundColor: "var(--md-sys-color-surface-container-low, #f6f6f6)" }}>
                <div className="container" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    <h2>Program Snapshot</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                        {[
                            { label: "Schools supported", value: metrics.get("Schools trained") ?? 0 },
                            { label: "Teachers trained", value: metrics.get("Teachers trained") ?? 0 },
                            { label: "Learners assessed", value: metrics.get("Learners assessed") ?? 0 },
                            { label: "Resources distributed", value: metrics.get("Resources downloaded") ?? 0 },
                        ].map((stat) => (
                            <article key={stat.label} className="card impact-kpi-card">
                                <strong>{Number(stat.value).toLocaleString()}</strong>
                                <span>{stat.label}</span>
                            </article>
                        ))}
                    </div>

                    {/* Methodology */}
                    <div className="card" style={{ padding: "2rem" }}>
                        <h3 style={{ marginTop: 0 }}>📑 Methodology &amp; Codebook</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                            <div>
                                <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Assessment Design</h4>
                                <ul style={{ fontSize: "0.85rem", color: "#444", lineHeight: 1.7 }}>
                                    <li>Four literacy domains: letter-sound knowledge, blending/decoding, oral reading fluency, comprehension</li>
                                    <li>Baseline–endline paired design with unique learner IDs</li>
                                    <li>Benchmark thresholds: ≥70% = proficient; 42–69% = approaching; &lt;42% = below</li>
                                    <li>Minimum sample: 30 learners per school</li>
                                </ul>
                            </div>
                            <div>
                                <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Fidelity Index</h4>
                                <ul style={{ fontSize: "0.85rem", color: "#444", lineHeight: 1.7 }}>
                                    <li>Coaching coverage (35%): % schools visited per cycle</li>
                                    <li>Rubric adoption (25%): average teacher practice score</li>
                                    <li>Assessment completeness (25%): % schools with both baseline + endline</li>
                                    <li>Post-training observation (15%): % teachers observed after training</li>
                                </ul>
                            </div>
                        </div>
                        <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
                            <Link className="button" href="/impact/methodology">Full Methodology</Link>
                            <Link className="button button-ghost" href="/impact/dashboard">Live Dashboard</Link>
                        </div>
                    </div>

                    {/* Downloadable Reports */}
                    <div className="card" style={{ padding: "2rem" }}>
                        <h3 style={{ marginTop: 0 }}>📊 Published Reports</h3>
                        {reports.length === 0 ? (
                            <p style={{ color: "#888" }}>No published reports available yet.</p>
                        ) : (
                            <div className="table-wrap" style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left" }}>
                                            <th style={{ padding: "0.5rem" }}>Title</th>
                                            <th style={{ padding: "0.5rem" }}>Scope</th>
                                            <th style={{ padding: "0.5rem" }}>Period</th>
                                            <th style={{ padding: "0.5rem", textAlign: "right" }}>Downloads</th>
                                            <th style={{ padding: "0.5rem" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reports.map((report) => (
                                            <tr key={report.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                                <td style={{ padding: "0.5rem", fontWeight: 600 }}>{report.title}</td>
                                                <td style={{ padding: "0.5rem" }}>{report.scopeType}: {report.scopeValue}</td>
                                                <td style={{ padding: "0.5rem", fontSize: "0.8rem", color: "#666" }}>
                                                    {report.periodStart} – {report.periodEnd}
                                                </td>
                                                <td style={{ padding: "0.5rem", textAlign: "right" }}>{report.downloadCount}</td>
                                                <td style={{ padding: "0.5rem" }}>
                                                    <Link
                                                        href={`/impact-reports/${report.reportCode}`}
                                                        className="inline-download-link"
                                                        style={{ fontSize: "0.8rem" }}
                                                    >
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Data Privacy */}
                    <div className="card" style={{ padding: "2rem", borderLeft: "4px solid var(--md-sys-color-primary, #2563eb)" }}>
                        <h3 style={{ marginTop: 0 }}>🔒 Data Privacy &amp; Access</h3>
                        <ul style={{ fontSize: "0.85rem", color: "#444", lineHeight: 1.8 }}>
                            <li><strong>Public APIs</strong> return aggregated data only — no child names, IDs, or school-level learner data</li>
                            <li><strong>Partner access</strong> unlocks school-level aggregates (not individual learner records)</li>
                            <li><strong>Child-level data</strong> is accessible only by authorized M&amp;E staff with audit logging</li>
                            <li><strong>Consent</strong> is tracked per-school for photo, video, and story usage</li>
                            <li><strong>All access</strong> to sensitive tables is logged in the audit trail</li>
                        </ul>
                    </div>
                </div>
            </section>
        </>
    );
}
