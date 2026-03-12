import { fetchPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

type Report = {
  id: number;
  title: string;
  report_code: string;
  scope_value: string;
};

type Snapshot = {
  id: number;
  month: string;
  currency: string;
  summary_json: Record<string, unknown>;
};

export default async function PartnerPage() {
  let reports: Report[] = [];
  let snapshots: Snapshot[] = [];
  try {
    [reports, snapshots] = await Promise.all([
      fetchPublic<Report[]>("/api/v1/public/reports", 120),
      fetchPublic<Snapshot[]>("/api/v1/public/finance/snapshots", 120),
    ]);
  } catch {
    reports = [];
    snapshots = [];
  }

  return (
    <div className="container stack">
      <section className="hero stack">
        <h1 style={{ margin: 0 }}>Partner Data Room</h1>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          Public transparency outputs from the new production backend.
        </p>
      </section>

      <section className="card stack">
        <h2 className="section-title">Published Impact Reports</h2>
        {reports.length ? (
          reports.slice(0, 10).map((report) => (
            <div className="card" style={{ padding: "0.65rem" }} key={report.id}>
              <div style={{ fontWeight: 700 }}>{report.title}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
                {report.scope_value} · {report.report_code}
              </div>
            </div>
          ))
        ) : (
          <p style={{ margin: 0 }}>No public reports yet.</p>
        )}
      </section>

      <section className="card stack">
        <h2 className="section-title">Published Finance Snapshots</h2>
        {snapshots.length ? (
          snapshots.slice(0, 10).map((snap) => (
            <div className="card" style={{ padding: "0.65rem" }} key={snap.id}>
              <div style={{ fontWeight: 700 }}>{snap.month}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>{snap.currency}</div>
            </div>
          ))
        ) : (
          <p style={{ margin: 0 }}>No published finance snapshots.</p>
        )}
      </section>
    </div>
  );
}
