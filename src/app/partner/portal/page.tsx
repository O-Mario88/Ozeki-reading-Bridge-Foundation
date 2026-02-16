import { PartnerActionForm } from "@/components/PartnerActionForm";

export const metadata = {
  title: "Partner Portal",
  description:
    "Partners can access scoped dashboards, reports, approved evidence packs, and secure school summaries.",
};

export default function PartnerPortalAccessPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Partner portal</p>
          <h1>Partner Portal</h1>
          <p>
            Partners can access scoped dashboards, download reports, view approved
            evidence galleries, and request customized summaries.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>What partners can do</h2>
            <ul>
              <li>Download scoped reports (quarterly/FY)</li>
              <li>View partner dashboard</li>
              <li>Export charts (PNG/PDF)</li>
              <li>Access approved photos and learning briefs</li>
              <li>Request a concept note by district</li>
            </ul>
            <p className="meta-line">
              Access control is scope-based. Partners only see permitted data views.
            </p>
          </article>

          <article className="card">
            <h2>Request access</h2>
            <PartnerActionForm
              type="Partner Portal Access"
              actionLabel="Request Access"
              includeCountry
            />
          </article>
        </div>
      </section>
    </>
  );
}
