import Link from "next/link";
import {
  PortalAnalyticsData,
  PortalAnalyticsModuleStatus,
  PortalRecordModule,
  PortalRecordStatus,
} from "@/lib/types";

interface PortalAnalyticsDashboardProps {
  data: PortalAnalyticsData;
}

const moduleLabels: Record<PortalRecordModule, string> = {
  training: "Trainings",
  visit: "School Visits",
  assessment: "Assessments",
  story: "1001 Story",
};

const moduleLinks: Record<PortalRecordModule, string> = {
  training: "/portal/trainings",
  visit: "/portal/visits",
  assessment: "/portal/assessments",
  story: "/portal/story",
};

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildPath(values: number[], width: number, height: number, padding = 22) {
  const max = Math.max(...values, 1);
  const spanX = Math.max(1, width - padding * 2);
  const spanY = Math.max(1, height - padding * 2);
  const stepX = values.length > 1 ? spanX / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - (value / max) * spanY;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function statusClass(status: PortalRecordStatus) {
  if (status === "Approved") return "ok";
  if (status === "Submitted") return "pending";
  if (status === "Returned") return "warn";
  return "idle";
}

function moduleCompletion(module: PortalAnalyticsModuleStatus) {
  if (module.total <= 0) {
    return 0;
  }
  return Math.round((module.approved / module.total) * 100);
}

export function PortalAnalyticsDashboard({ data }: PortalAnalyticsDashboardProps) {
  const recordTrend = data.monthly.map((point) => point.records);
  const evidenceTrend = data.monthly.map((point) => point.evidence);
  const testimonialTrend = data.monthly.map((point) => point.testimonials);
  const chartWidth = 860;
  const chartHeight = 260;

  return (
    <div className="analytics-admin-shell">
      <aside className="card analytics-sidebar">
        <p className="kicker">Navigator</p>
        <h2>Data Dashboard</h2>
        <p>
          Monitoring every submission stream from trainings, visits, assessments,
          1001 Story, testimonials, media uploads, and partner engagement forms.
        </p>
        <nav aria-label="Dashboard sections" className="analytics-nav-list">
          <Link href="#overview">Overview</Link>
          <Link href="#trend">Submission Trend</Link>
          <Link href="#modules">Module Performance</Link>
          <Link href="#districts">District Coverage</Link>
          <Link href="#users">Team Activity</Link>
          <Link href="#records">Recent Records</Link>
        </nav>
        <div className="analytics-sidebar-meta">
          <p>
            <strong>Scope:</strong> {data.scope === "all" ? "All staff data" : "My submissions"}
          </p>
          <p>
            <strong>Generated:</strong> {formatDateTime(data.generatedAt)}
          </p>
        </div>
      </aside>

      <div className="analytics-main">
        <section className="card analytics-top-strip" id="overview">
          <div>
            <p className="kicker">Portal intelligence</p>
            <h2>Operations and M&amp;E Command Dashboard</h2>
            <p>
              Live operational snapshot across data entry, implementation quality, and evidence
              capture.
            </p>
          </div>
          <div className="action-row">
            <Link className="button" href="/portal/reports">
              Open reports
            </Link>
            <Link className="button button-ghost" href="/portal/trainings?new=1">
              New training entry
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="analytics-card-header">
            <div>
              <p className="kicker">Public profile explorer</p>
              <h3>Open live dashboard by profile level</h3>
            </div>
          </div>
          <p className="analytics-muted">
            Use these shortcuts to validate what public users see in Country, Region, District, and
            School profile views.
          </p>
          <div className="action-row">
            <Link className="button button-ghost" href="/impact/dashboard?profile=country" target="_blank">
              Country
            </Link>
            <Link className="button button-ghost" href="/impact/dashboard?profile=region" target="_blank">
              Region
            </Link>
            <Link className="button button-ghost" href="/impact/dashboard?profile=district" target="_blank">
              District
            </Link>
            <Link className="button button-ghost" href="/impact/dashboard?profile=school" target="_blank">
              School
            </Link>
          </div>
        </section>

        <section className="analytics-kpi-grid">
          <article className="analytics-kpi-card tone-primary">
            <p>Total records</p>
            <strong>{formatNumber(data.totals.portalRecords)}</strong>
            <span>Across all portal modules</span>
          </article>
          <article className="analytics-kpi-card tone-teal">
            <p>Schools covered</p>
            <strong>{formatNumber(data.totals.schoolsCovered)}</strong>
            <span>Unique schools with logged activity</span>
          </article>
          <article className="analytics-kpi-card tone-orange">
            <p>Participants captured</p>
            <strong>{formatNumber(data.participants.total)}</strong>
            <span>
              Teachers {formatNumber(data.participants.teachers)} • Leaders{" "}
              {formatNumber(data.participants.leaders)}
            </span>
          </article>
          <article className="analytics-kpi-card tone-navy">
            <p>Learners assessed</p>
            <strong>{formatNumber(data.totals.learnersAssessed)}</strong>
            <span>Assessment and portal summaries combined</span>
          </article>
          <article className="analytics-kpi-card tone-cyan">
            <p>Stories published</p>
            <strong>{formatNumber(data.totals.storiesPublished)}</strong>
            <span>Assessment + 1001 Story publication outputs</span>
          </article>
          <article className="analytics-kpi-card tone-primary-soft">
            <p>Evidence uploads</p>
            <strong>{formatNumber(data.totals.evidenceUploads)}</strong>
            <span>Photos, videos, and supporting documents</span>
          </article>
          <article className="analytics-kpi-card tone-teal">
            <p>Resources uploaded</p>
            <strong>{formatNumber(data.totals.resourcesUploaded)}</strong>
            <span>Library files/links configured from staff portal</span>
          </article>
          <article className="analytics-kpi-card tone-cyan">
            <p>Blog posts published</p>
            <strong>{formatNumber(data.totals.blogPostsPublished)}</strong>
            <span>Knowledge-sharing articles posted by staff</span>
          </article>
          <article className="analytics-kpi-card tone-orange-soft">
            <p>Testimonials</p>
            <strong>{formatNumber(data.totals.testimonials)}</strong>
            <span>Published story submissions from the field</span>
          </article>
          <article className="analytics-kpi-card tone-slate">
            <p>Training sessions completed</p>
            <strong>{formatNumber(data.totals.trainingSessionsCompleted)}</strong>
            <span>Legacy + portal + online sessions</span>
          </article>
          <article className="analytics-kpi-card tone-orange-soft">
            <p>Online training impact</p>
            <strong>{formatNumber(data.totals.onlineTrainingEvents)}</strong>
            <span>
              Sessions • Teachers {formatNumber(data.totals.onlineTeachersTrained)} • Leaders{" "}
              {formatNumber(data.totals.onlineSchoolLeadersTrained)}
            </span>
          </article>
          <article className="analytics-kpi-card tone-muted">
            <p>Follow-ups due</p>
            <strong>{formatNumber(data.totals.followUpsDue)}</strong>
            <span>Not approved and due by today</span>
          </article>
          <article className="analytics-kpi-card tone-muted-2">
            <p>Lead pipeline</p>
            <strong>
              {formatNumber(
                data.totals.bookingRequests + data.totals.partnerInquiries + data.totals.toolkitLeads,
              )}
            </strong>
            <span>
              Bookings {data.totals.bookingRequests} • Contacts {data.totals.partnerInquiries} •
              Downloads {data.totals.toolkitLeads}
            </span>
          </article>
        </section>

        <section className="analytics-grid-two" id="trend">
          <article className="card analytics-chart-card">
            <div className="analytics-card-header">
              <div>
                <p className="kicker">Submission trend</p>
                <h3>Monthly volume across records, evidence, and testimonials</h3>
              </div>
              <p className="analytics-muted">{data.monthly.length} month window</p>
            </div>
            <div className="analytics-line-chart">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label="Monthly trend chart"
              >
                <path d={buildPath(recordTrend, chartWidth, chartHeight)} className="line records" />
                <path d={buildPath(evidenceTrend, chartWidth, chartHeight)} className="line evidence" />
                <path
                  d={buildPath(testimonialTrend, chartWidth, chartHeight)}
                  className="line testimonials"
                />
              </svg>
              <div className="analytics-chart-legend">
                <span>
                  <i className="legend records" />
                  Records
                </span>
                <span>
                  <i className="legend evidence" />
                  Evidence
                </span>
                <span>
                  <i className="legend testimonials" />
                  Testimonials
                </span>
              </div>
              <div className="analytics-month-grid">
                {data.monthly.map((point) => (
                  <div key={point.key}>
                    <strong>{point.month}</strong>
                    <span>{point.records} rec</span>
                    <span>{point.evidence} evd</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="card analytics-pipeline-card" id="modules">
            <div className="analytics-card-header">
              <div>
                <p className="kicker">Workflow health</p>
                <h3>Module status performance</h3>
              </div>
            </div>
            <div className="analytics-module-list">
              {data.moduleStatus.map((item) => (
                <div key={item.module} className="analytics-module-row">
                  <div className="analytics-module-label">
                    <strong>{moduleLabels[item.module]}</strong>
                    <span>{item.total} total submissions</span>
                  </div>
                  <div className="analytics-module-bar" aria-hidden>
                    <span style={{ width: `${moduleCompletion(item)}%` }} />
                  </div>
                  <div className="analytics-module-metrics">
                    <span className="ok">Approved {item.approved}</span>
                    <span className="pending">Submitted {item.submitted}</span>
                    <span className="warn">Returned {item.returned}</span>
                    <span className="idle">Draft {item.draft}</span>
                  </div>
                  <Link href={moduleLinks[item.module]}>Open module</Link>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="analytics-grid-three">
          <article className="card" id="districts">
            <div className="analytics-card-header">
              <div>
                <p className="kicker">District footprint</p>
                <h3>Top districts by logged activity</h3>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>District</th>
                    <th>Records</th>
                    <th>Schools</th>
                    <th>Testimonials</th>
                  </tr>
                </thead>
                <tbody>
                  {data.districtStats.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No district activity found.</td>
                    </tr>
                  ) : (
                    data.districtStats.map((item) => (
                      <tr key={item.district}>
                        <td>{item.district}</td>
                        <td>{formatNumber(item.records)}</td>
                        <td>{formatNumber(item.schools)}</td>
                        <td>{formatNumber(item.testimonials)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card" id="users">
            <div className="analytics-card-header">
              <div>
                <p className="kicker">Team activity</p>
                <h3>Data entry by user</h3>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Records</th>
                    <th>Evidence</th>
                    <th>Testimonials</th>
                  </tr>
                </thead>
                <tbody>
                  {data.userStats.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No team activity available.</td>
                    </tr>
                  ) : (
                    data.userStats.map((item) => (
                      <tr key={item.userId}>
                        <td>{item.fullName}</td>
                        <td>{item.role}</td>
                        <td>{formatNumber(item.records)}</td>
                        <td>{formatNumber(item.evidence)}</td>
                        <td>{formatNumber(item.testimonials)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card">
            <div className="analytics-card-header">
              <div>
                <p className="kicker">Upcoming actions</p>
                <h3>Due follow-ups</h3>
              </div>
            </div>
            <ul className="analytics-followups">
              {data.followUps.length === 0 ? (
                <li>No due follow-ups right now.</li>
              ) : (
                data.followUps.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.schoolName}</strong>
                      <span>
                        {item.recordCode} • {moduleLabels[item.module]}
                      </span>
                    </div>
                    <span>{formatDate(item.followUpDate)}</span>
                  </li>
                ))
              )}
            </ul>
            <div className="action-row">
              <Link className="button" href="/portal/dashboard">
                Open staff dashboard
              </Link>
            </div>
          </article>
        </section>

        <section className="card analytics-table-card" id="records">
          <div className="analytics-card-header">
            <div>
              <p className="kicker">Submission stream</p>
              <h3>Recent records entered</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Date</th>
                  <th>Module</th>
                  <th>District</th>
                  <th>School</th>
                  <th>Status</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {data.recentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No recent records found.</td>
                  </tr>
                ) : (
                  data.recentRecords.map((item) => (
                    <tr key={item.id}>
                      <td>{item.recordCode}</td>
                      <td>{formatDate(item.date)}</td>
                      <td>{moduleLabels[item.module]}</td>
                      <td>{item.district}</td>
                      <td>{item.schoolName}</td>
                      <td>
                        <span className={`analytics-status-pill ${statusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.createdByName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="analytics-grid-two">
          <article className="card">
            <div className="analytics-card-header">
              <div>
                <p className="kicker">Evidence locker</p>
                <h3>Most recent uploads</h3>
              </div>
            </div>
            <ul className="analytics-media-list">
              {data.recentEvidence.length === 0 ? (
                <li>No evidence uploads available.</li>
              ) : (
                data.recentEvidence.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.fileName}</strong>
                      <span>
                        {moduleLabels[item.module]} • {item.schoolName}
                      </span>
                    </div>
                    <span>{formatDate(item.createdAt)}</span>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="card">
            <div className="analytics-card-header">
              <div>
                <p className="kicker">Voice of schools</p>
                <h3>Latest testimonials</h3>
              </div>
            </div>
            <ul className="analytics-media-list">
              {data.recentTestimonials.length === 0 ? (
                <li>No testimonials captured yet.</li>
              ) : (
                data.recentTestimonials.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.storytellerName}</strong>
                      <span>
                        {item.storytellerRole} • {item.schoolName}, {item.district}
                      </span>
                    </div>
                    <span>{formatDate(item.createdAt)}</span>
                  </li>
                ))
              )}
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}
