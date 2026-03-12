import { fetchPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

type PublicSummary = {
  kpis: Record<string, number>;
};

export default async function ImpactPage() {
  let summary: PublicSummary = { kpis: {} };
  try {
    summary = await fetchPublic<PublicSummary>("/api/v1/public/impact/summary");
  } catch {
    summary = { kpis: {} };
  }

  return (
    <div className="container stack">
      <section className="hero">
        <h1 style={{ margin: 0 }}>Public Impact Dashboard</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Aggregated, privacy-safe indicators only. No learner-level or teacher-level personal data is exposed.
        </p>
      </section>
      <section className="grid grid-4">
        {Object.entries(summary.kpis).map(([key, value]) => (
          <article key={key} className="card">
            <h3>{key.replaceAll("_", " ")}</h3>
            <div className="metric">{value}</div>
          </article>
        ))}
        {!Object.keys(summary.kpis).length ? (
          <article className="card">
            <h3>Service Status</h3>
            <div style={{ color: "var(--text-muted)" }}>
              Impact API is currently unavailable.
            </div>
          </article>
        ) : null}
      </section>
    </div>
  );
}
