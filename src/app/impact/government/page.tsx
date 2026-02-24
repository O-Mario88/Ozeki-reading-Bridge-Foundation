import Link from "next/link";
import { getGovernmentViewData } from "@/lib/db";
import {
    UGANDA_GEOGRAPHY,
    UGANDA_REGIONS,
    UGANDA_SUB_REGIONS,
    REGION_COLORS,
    SUB_REGION_EMOJI,
} from "@/lib/uganda-geography";

export const metadata = {
    title: "Government & Policy View — NLIS Uganda",
    description:
        "District league tables, priority flags, and evidence-based policy insights for government stakeholders across all 135+ districts of Uganda.",
};

export const dynamic = "force-dynamic";

function priorityBadge(flag: "urgent" | "watch" | "on-track") {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
        urgent: { bg: "#fee2e2", color: "#dc2626", label: "⚠ Urgent" },
        watch: { bg: "#fef3c7", color: "#b45309", label: "◉ Watch" },
        "on-track": { bg: "#dcfce7", color: "#16a34a", label: "✓ On track" },
    };
    const s = styles[flag] ?? styles["on-track"];
    return (
        <span
            style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.2rem 0.6rem",
                borderRadius: "12px",
                background: s.bg,
                color: s.color,
                whiteSpace: "nowrap",
            }}
        >
            {s.label}
        </span>
    );
}

export default function GovernmentViewPage() {
    const data = getGovernmentViewData();

    const urgentCount = data.leagueTable.filter((r) => r.priorityFlag === "urgent").length;
    const watchCount = data.leagueTable.filter((r) => r.priorityFlag === "watch").length;
    const onTrackCount = data.leagueTable.filter((r) => r.priorityFlag === "on-track").length;

    return (
        <>
            <section className="page-hero">
                <div className="container">
                    <p className="kicker">National Literacy Intelligence System</p>
                    <h1>Government &amp; Policy View</h1>
                    <p>
                        District-level league tables with implementation fidelity scores, learning
                        outcomes, and priority flags across all {UGANDA_GEOGRAPHY.length} districts of Uganda —
                        designed for evidence-based policy decisions.
                    </p>
                    <div className="action-row">
                        <Link className="inline-download-link" href="/api/impact/export?format=csv">
                            ⬇ Export CSV (EMIS-ready)
                        </Link>
                        <Link className="button button-ghost" href="/impact/dashboard">
                            Full Dashboard
                        </Link>
                    </div>
                </div>
            </section>

            {/* Region Overview Cards */}
            <section
                className="section"
                style={{ backgroundColor: "var(--md-sys-color-surface-container, #f0eee8)" }}
            >
                <div className="container" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    <h2 style={{ marginBottom: 0 }}>Regional Overview</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
                        {UGANDA_REGIONS.map((region) => {
                            const districts = UGANDA_GEOGRAPHY.filter((d) => d.region === region);
                            const subRegions = UGANDA_SUB_REGIONS[region] ?? [];
                            const color = REGION_COLORS[region] ?? "#888";
                            return (
                                <div
                                    key={region}
                                    className="card"
                                    style={{
                                        padding: "1.5rem",
                                        borderLeft: `5px solid ${color}`,
                                        borderRadius: "var(--shape-md)",
                                    }}
                                >
                                    <h3 style={{
                                        margin: "0 0 0.5rem",
                                        fontSize: "1.1rem",
                                        color,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                    }}>
                                        {region === "Central" ? "🇺🇬" : region === "Eastern" ? "🌅" : region === "Northern" ? "🌍" : "🌄"}
                                        {region} Region
                                    </h3>
                                    <div style={{ fontSize: "0.85rem", color: "#444", marginBottom: "0.75rem" }}>
                                        <strong>{districts.length}</strong> districts · <strong>{subRegions.length}</strong> sub-regions
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                                        {subRegions.map((sr) => (
                                            <span
                                                key={sr}
                                                style={{
                                                    fontSize: "0.72rem",
                                                    fontWeight: 600,
                                                    padding: "0.15rem 0.5rem",
                                                    borderRadius: "12px",
                                                    background: `${color}14`,
                                                    color,
                                                }}
                                            >
                                                {SUB_REGION_EMOJI[sr] ?? ""} {sr}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Summary KPIs */}
            <section
                className="section"
                style={{ backgroundColor: "var(--md-sys-color-surface-container-low, #f6f6f0)" }}
            >
                <div className="container" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                        <article className="card impact-kpi-card">
                            <strong>{UGANDA_GEOGRAPHY.length}</strong>
                            <span>Total districts</span>
                        </article>
                        <article className="card impact-kpi-card">
                            <strong>{data.leagueTable.length}</strong>
                            <span>Districts with data</span>
                        </article>
                        <article className="card impact-kpi-card" style={{ borderLeft: "4px solid #16a34a" }}>
                            <strong>{onTrackCount}</strong>
                            <span>On track</span>
                        </article>
                        <article className="card impact-kpi-card" style={{ borderLeft: "4px solid #b45309" }}>
                            <strong>{watchCount}</strong>
                            <span>Watch</span>
                        </article>
                        <article className="card impact-kpi-card" style={{ borderLeft: "4px solid #dc2626" }}>
                            <strong>{urgentCount}</strong>
                            <span>Urgent attention</span>
                        </article>
                    </div>

                    {/* League table */}
                    <div className="table-wrap card" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginTop: 0 }}>District League Table</h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--md-sys-color-on-surface-variant)", marginBottom: "1rem" }}>
                            Ranked by combined fidelity + outcomes score. Generated{" "}
                            {new Date(data.generatedAt).toLocaleDateString()}.
                        </p>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid var(--md-sys-color-outline, #c8d1d0)", textAlign: "left" }}>
                                        <th style={{ padding: "0.6rem 0.5rem" }}>#</th>
                                        <th style={{ padding: "0.6rem 0.5rem" }}>District</th>
                                        <th style={{ padding: "0.6rem 0.5rem" }}>Region</th>
                                        <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Fidelity</th>
                                        <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Outcomes</th>
                                        <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Schools</th>
                                        <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Learners</th>
                                        <th style={{ padding: "0.6rem 0.5rem", textAlign: "center" }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.leagueTable.map((row) => (
                                        <tr
                                            key={row.district}
                                            style={{
                                                borderBottom: "1px solid var(--md-sys-color-outline-variant, #e4ebea)",
                                                transition: "background 0.15s",
                                            }}
                                        >
                                            <td style={{ padding: "0.5rem", fontWeight: 600, color: "var(--md-sys-color-on-surface-variant)" }}>{row.rank}</td>
                                            <td style={{ padding: "0.5rem" }}>
                                                <Link
                                                    href={`/districts/${encodeURIComponent(row.district)}`}
                                                    style={{ fontWeight: 600, color: "var(--md-sys-color-primary)", textDecoration: "none" }}
                                                >
                                                    {row.district}
                                                </Link>
                                            </td>
                                            <td style={{ padding: "0.5rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                                                <span style={{ color: REGION_COLORS[row.region] ?? "#888", fontWeight: 600 }}>
                                                    {row.region}
                                                </span>
                                            </td>
                                            <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 700 }}>
                                                {row.fidelityScore ?? "—"}
                                            </td>
                                            <td style={{ padding: "0.5rem", textAlign: "right" }}>
                                                {row.outcomesScore !== null ? (
                                                    <span style={{ color: row.outcomesScore > 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                                                        {row.outcomesScore > 0 ? "+" : ""}{row.outcomesScore.toFixed(1)}pp
                                                    </span>
                                                ) : "—"}
                                            </td>
                                            <td style={{ padding: "0.5rem", textAlign: "right" }}>
                                                {row.schoolsSupported.toLocaleString()}
                                            </td>
                                            <td style={{ padding: "0.5rem", textAlign: "right" }}>
                                                {row.learnersAssessed.toLocaleString()}
                                            </td>
                                            <td style={{ padding: "0.5rem", textAlign: "center" }}>
                                                {priorityBadge(row.priorityFlag)}
                                            </td>
                                        </tr>
                                    ))}
                                    {data.leagueTable.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
                                                No district-level data available yet. As implementation data is collected, districts will appear in this table.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Privacy notice */}
                    <p className="note-box impact-compliance-note">
                        This view presents aggregated district-level data only. No individual school
                        or learner identifiers are exposed. For school-level detail, contact the M&amp;E
                        team and demonstrate authorized access.
                    </p>
                </div>
            </section>
        </>
    );
}
