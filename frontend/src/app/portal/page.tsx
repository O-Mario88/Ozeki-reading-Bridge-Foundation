import Link from "next/link";

const cards = [
  { href: "/portal/schools", title: "Schools & Contacts", body: "Manage school profiles and staff rosters." },
  { href: "/portal/trainings", title: "Trainings", body: "Record sessions and participant attendance." },
  { href: "/portal/visits", title: "Visits & Evaluations", body: "Track school visits and coaching quality." },
  { href: "/portal/assessments", title: "Assessments", body: "Capture learner assessment sessions and results." },
  { href: "/portal/finance", title: "Finance", body: "Handle invoices, receipts, expenses, and ledger flows." },
  { href: "/portal/reports", title: "Reports", body: "Publish impact reports and public-safe aggregates." },
];

export default function PortalDashboardPage() {
  return (
    <>
      <section className="hero stack">
        <span className="pill">Staff Workspace</span>
        <h1 style={{ margin: 0 }}>Operations Dashboard</h1>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          Django backend APIs enforce role-based access. Use modules below for daily workflows.
        </p>
      </section>
      <section className="grid grid-4">
        {cards.map((card) => (
          <article className="card stack" key={card.href}>
            <h2 style={{ margin: 0, fontSize: "1rem" }}>{card.title}</h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.86rem" }}>{card.body}</p>
            <Link className="button secondary" href={card.href}>
              Open
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
