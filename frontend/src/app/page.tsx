import Link from "next/link";

import { fetchPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

type PublicSummary = {
  kpis: {
    schools_supported: number;
    training_sessions_total: number;
    teachers_supported: number;
    learners_assessed_unique: number;
    visits_total: number;
  };
  reports: Array<{ id: number; report_code: string; title: string; scope_value: string; published_at: string | null }>;
};

export default async function HomePage() {
  let summary: PublicSummary | null = null;
  try {
    summary = await fetchPublic<PublicSummary>("/api/v1/public/impact/summary");
  } catch {
    summary = null;
  }

  return (
    <div className="container stack">
      <section className="hero stack">
        <span className="pill">Production rebuild: Next.js + Django + PostgreSQL</span>
        <h1 style={{ margin: 0 }}>National Literacy Intelligence Platform</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: 760 }}>
          This production architecture separates a lightweight Next.js frontend from a Django REST backend,
          with public-safe aggregates and protected staff operations.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="button" href="/impact">
            View Impact
          </Link>
          <Link className="button secondary" href="/portal/login">
            Staff Portal
          </Link>
        </div>
      </section>

      <section className="stack">
        <h2 className="section-title">Live Public KPIs</h2>
        <div className="grid grid-4">
          <article className="card">
            <h3>Schools Supported</h3>
            <div className="metric">{summary?.kpis.schools_supported ?? "-"}</div>
          </article>
          <article className="card">
            <h3>Training Sessions</h3>
            <div className="metric">{summary?.kpis.training_sessions_total ?? "-"}</div>
          </article>
          <article className="card">
            <h3>Teachers Supported</h3>
            <div className="metric">{summary?.kpis.teachers_supported ?? "-"}</div>
          </article>
          <article className="card">
            <h3>Learners Assessed</h3>
            <div className="metric">{summary?.kpis.learners_assessed_unique ?? "-"}</div>
          </article>
        </div>
      </section>

      <section className="card stack">
        <h2 className="section-title">Latest Public Reports</h2>
        <div className="stack">
          {summary?.reports?.length ? (
            summary.reports.slice(0, 6).map((report) => (
              <div key={report.id} className="card" style={{ padding: "0.65rem" }}>
                <div style={{ fontWeight: 700 }}>{report.title}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  {report.scope_value} · {report.report_code}
                </div>
              </div>
            ))
          ) : (
            <p style={{ margin: 0 }}>No public reports published yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
