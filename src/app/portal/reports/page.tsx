import { PortalShell } from "@/components/portal/PortalShell";
import {
  getImpactSummary,
  listPortalImpactReports,
  listPortalRecords,
} from "@/lib/db";
import { PortalImpactReportsManager } from "@/components/portal/PortalImpactReportsManager";
import { portalModuleConfigs } from "@/lib/portal-config";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { PortalRecordStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports",
  description: "Exportable operations and M&E reporting from the staff portal.",
};

function countStatus(rows: Array<{ status: PortalRecordStatus }>, status: PortalRecordStatus) {
  return rows.filter((row) => row.status === status).length;
}

export default async function PortalReportsPage() {
  const user = await requirePortalStaffUser();
  const impact = getImpactSummary();
  const impactReports = listPortalImpactReports(user, 120);

  const moduleRows = portalModuleConfigs.map((config) => {
    const rows = listPortalRecords({ module: config.module }, user);
    return {
      config,
      total: rows.length,
      draft: countStatus(rows, "Draft"),
      submitted: countStatus(rows, "Submitted"),
      returned: countStatus(rows, "Returned"),
      approved: countStatus(rows, "Approved"),
    };
  });

  return (
    <PortalShell
      user={user}
      activeHref="/portal/reports"
      title="Reports"
      description="Generate module reports, monitor submission quality, and prepare partner-ready summaries."
    >
      <div className="portal-grid">
        <section className="card">
          <h2>Impact Snapshot</h2>
          <div className="metric-grid">
            {impact.metrics.map((metric) => (
              <article key={metric.label}>
                <strong>{metric.value.toLocaleString()}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Module Exports</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Total</th>
                  <th>Draft</th>
                  <th>Submitted</th>
                  <th>Returned</th>
                  <th>Approved</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {moduleRows.map((row) => (
                  <tr key={row.config.module}>
                    <td>{row.config.pageTitle}</td>
                    <td>{row.total}</td>
                    <td>{row.draft}</td>
                    <td>{row.submitted}</td>
                    <td>{row.returned}</td>
                    <td>{row.approved}</td>
                    <td>
                      <a
                        href={`/api/portal/records/export?module=${row.config.module}`}
                        className="button button-ghost"
                      >
                        Export CSV
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>Reporting Notes</h2>
          <ul>
            <li>Use approved records for donor and partner reporting.</li>
            <li>Use returned records list to coach staff on data quality improvements.</li>
            <li>Evidence uploads are stored by school and date through module forms.</li>
            <li>Export filters are available directly in each module page.</li>
          </ul>
        </section>

        <PortalImpactReportsManager initialReports={impactReports} />
      </div>
    </PortalShell>
  );
}
