import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  getPortalOperationalReportsData,
  listPortalImpactReports,
} from "@/lib/db";
import { PortalImpactReportsManager } from "@/components/portal/PortalImpactReportsManager";
import { requirePortalUser, getPortalHomePath } from "@/lib/portal-auth";
import { redirect } from "next/navigation";
import { PortalOperationsReportsWorkspace } from "@/components/portal/PortalOperationsReportsWorkspace";
import { PortalTrainingReportsManager } from "@/components/portal/PortalTrainingReportsManager";
import { listTrainingReportArtifacts } from "@/lib/training-report-automation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Report Profile",
  description:
    "Unified report profile for operations, impact, training, national, visit, and assessment reporting.",
};

type ReportsTab =
  | "operations"
  | "impact-reports"
  | "training-reports"
  | "national-reports"
  | "school-reading-performance";

function normalizeQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function resolveTab(value: string | string[] | undefined): ReportsTab {
  const normalized = normalizeQueryValue(value).trim().toLowerCase();
  if (normalized === "impact" || normalized === "impact-reports") {
    return "impact-reports";
  }
  if (normalized === "training" || normalized === "training-reports") {
    return "training-reports";
  }
  if (normalized === "national" || normalized === "national-reports") {
    return "national-reports";
  }
  if (normalized === "school-reading-performance" || normalized === "school-reading") {
    return "school-reading-performance";
  }
  return "operations";
}

export default async function PortalReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePortalUser();
  const params = await searchParams;
  const activeTab = resolveTab(params.tab);

  const hasAccess =
    user.role === "Volunteer" ||
    user.role === "Staff" ||
    user.role === "Admin" ||
    user.isAdmin ||
    user.isSuperAdmin;

  if (!hasAccess) {
    redirect(getPortalHomePath(user));
  }

  const canOpenNationalReports = user.role !== "Volunteer";
  const canAccessTrainingReports =
    user.isAdmin || user.isSuperAdmin || user.role === "Staff" || user.role === "Admin";

  const reportsData =
    activeTab === "operations"
      ? getPortalOperationalReportsData(user)
      : null;
  const impactReports =
    activeTab === "impact-reports" || activeTab === "school-reading-performance"
      ? listPortalImpactReports(user, 180)
      : [];
  const trainingReports =
    activeTab === "training-reports" && canAccessTrainingReports
      ? listTrainingReportArtifacts({ limit: 40 })
      : [];

  return (
    <PortalShell
      user={user}
      activeHref="/portal/reports"
      title="Report Profile"
      description="Unified reporting workspace across operations, impact, training, school reading performance, and national report packs."
      actions={
        <div className="action-row">
          <Link
            href="/portal/reports?tab=operations"
            className={activeTab === "operations" ? "button" : "button button-ghost"}
          >
            Operations
          </Link>
          <Link
            href="/portal/reports?tab=impact-reports"
            className={activeTab === "impact-reports" ? "button" : "button button-ghost"}
          >
            Impact Reports
          </Link>
          <Link
            href="/portal/reports?tab=training-reports"
            className={activeTab === "training-reports" ? "button" : "button button-ghost"}
          >
            Training Reports
          </Link>
          <Link
            href="/portal/reports?tab=school-reading-performance"
            className={
              activeTab === "school-reading-performance"
                ? "button"
                : "button button-ghost"
            }
          >
            School Reading Performance
          </Link>
          <Link
            href="/portal/reports?tab=national-reports"
            className={activeTab === "national-reports" ? "button" : "button button-ghost"}
          >
            National Reports
          </Link>
          <Link href="/portal/reports?tab=operations&module=visit" className="button button-ghost">
            Visit Reports
          </Link>
          <Link
            href="/portal/reports?tab=operations&module=learner-assessment"
            className="button button-ghost"
          >
            Assessment Reports
          </Link>
          <Link href="/impact" className="button button-ghost">
            Public Live Dashboard
          </Link>
        </div>
      }
    >
      <div className="portal-grid">
        {activeTab === "operations" && reportsData ? (
          <PortalOperationsReportsWorkspace data={reportsData} user={user} />
        ) : null}

        {activeTab === "impact-reports" ? (
          <PortalImpactReportsManager initialReports={impactReports} />
        ) : null}

        {activeTab === "training-reports" && canAccessTrainingReports ? (
          <PortalTrainingReportsManager initialReports={trainingReports} />
        ) : null}

        {activeTab === "training-reports" && !canAccessTrainingReports ? (
          <section className="card">
            <h2>Training Reports</h2>
            <p>
              Training report generation is available to staff and admin roles. Schools and
              volunteers should request a staff member to generate and share the report.
            </p>
            <div className="action-row">
              <Link href="/request-support" className="button">
                Request Staff Support
              </Link>
            </div>
          </section>
        ) : null}

        {activeTab === "school-reading-performance" ? (
          <section className="card">
            <h2>School Reading Performance Report Access</h2>
            <p>
              Learner and teacher names with performance details are not generated for public
              dashboards. Schools should request a staff member to generate and share the detailed
              report.
            </p>
            <ul className="portal-list">
              <li>
                <span>Use this tab to enforce privacy-safe handling for school-level reading data.</span>
              </li>
              <li>
                <span>
                  Public links only show aggregated results. Detailed named school reports are
                  staff-generated and shared through controlled channels.
                </span>
              </li>
            </ul>
            <div className="action-row">
              {user.role === "Volunteer" ? (
                <Link href="/request-support" className="button">
                  Request Staff Support
                </Link>
              ) : (
                <Link href="/portal/reports?tab=impact-reports" className="button">
                  Generate Staff School Report
                </Link>
              )}
              <Link href="/impact" className="button button-ghost">
                Open Public Live Dashboard
              </Link>
            </div>

            {impactReports.length > 0 ? (
              <div className="table-wrap" style={{ marginTop: "1rem" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Report</th>
                      <th>Scope</th>
                      <th>Audience</th>
                      <th>Visibility</th>
                      <th>Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impactReports
                      .filter(
                        (report) =>
                          report.scopeType === "School" ||
                          report.reportCategory === "School Profile Report (Headteacher Pack)",
                      )
                      .slice(0, 20)
                      .map((report) => (
                        <tr key={report.reportCode}>
                          <td>{report.reportCode}</td>
                          <td>{report.scopeValue}</td>
                          <td>{report.audience ?? "Public-safe"}</td>
                          <td>{report.isPublic ? "Public" : "Internal"}</td>
                          <td>{new Date(report.generatedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "national-reports" ? (
          <section className="card">
            <h2>National Reports</h2>
            <p>
              National report packs are managed in the Data Quality Center and now linked from this
              Report Profile workspace.
            </p>
            <div className="action-row">
              {canOpenNationalReports ? (
                <Link href="/portal/data-quality?tab=reports" className="button">
                  Open National Reports Workspace
                </Link>
              ) : (
                <Link href="/request-support" className="button">
                  Request Staff to Generate National Report
                </Link>
              )}
              <Link href="/impact" className="button button-ghost">
                Open Public Live Dashboard
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}
