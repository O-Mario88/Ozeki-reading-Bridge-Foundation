import Link from "next/link";
import type { ImpactExplorerProfiles } from "@/lib/db";
import { PortalAnalyticsData, PortalRecordModule, PortalRecordStatus, PortalUser } from "@/lib/types";

interface PortalAnalyticsDashboardProps {
  data: PortalAnalyticsData;
  explorer: ImpactExplorerProfiles;
  user: PortalUser;
}

type RegionMetric = {
  region: string;
  schools: number;
  teachers: number;
  leaders: number;
  learnersAssessed: number;
  boys: number;
  girls: number;
};

type RegionSeriesItem = {
  region: string;
  value: number;
  color: string;
};

const moduleLabels: Record<PortalRecordModule, string> = {
  training: "Training",
  visit: "Visit",
  assessment: "Assessment",
  story: "Story Collection",
  story_activity: "Story Activity",
};

const regionColors: Record<string, string> = {
  Central: "#4f9fe6",
  East: "#7b64f3",
  North: "#a583f8",
  West: "#2fb2a6",
};

const regionOrder = ["Central", "East", "North", "West"];

function shortRegionLabel(region: string) {
  const normalized = region.trim().toLowerCase();
  if (normalized.includes("central")) return "Central";
  if (normalized.includes("east")) return "East";
  if (normalized.includes("north")) return "North";
  if (normalized.includes("west")) return "West";
  return region.trim() || "Unknown";
}

function sortRegionName(a: string, b: string) {
  const aIndex = regionOrder.indexOf(a);
  const bIndex = regionOrder.indexOf(b);
  if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
  if (aIndex >= 0) return -1;
  if (bIndex >= 0) return 1;
  return a.localeCompare(b);
}

function buildRegionMetrics(explorer: ImpactExplorerProfiles) {
  const map = new Map<string, RegionMetric>();
  const ensure = (name: string) => {
    if (!map.has(name)) {
      map.set(name, {
        region: name,
        schools: 0,
        teachers: 0,
        leaders: 0,
        learnersAssessed: 0,
        boys: 0,
        girls: 0,
      });
    }
    return map.get(name) as RegionMetric;
  };

  explorer.regions.forEach((regionProfile) => {
    const key = shortRegionLabel(regionProfile.region);
    const metric = ensure(key);
    metric.schools += regionProfile.schoolsSupported;
    metric.teachers += regionProfile.participantsTeachers;
    metric.leaders += regionProfile.participantsLeaders;
    metric.learnersAssessed += regionProfile.learnersAssessed;
  });

  explorer.schools.forEach((school) => {
    const key = shortRegionLabel(school.region);
    const metric = ensure(key);
    metric.boys += school.enrolledBoys;
    metric.girls += school.enrolledGirls;
  });

  return [...map.values()]
    .filter(
      (item) =>
        item.schools > 0 ||
        item.teachers > 0 ||
        item.leaders > 0 ||
        item.learnersAssessed > 0 ||
        item.boys > 0 ||
        item.girls > 0,
    )
    .sort((a, b) => sortRegionName(a.region, b.region));
}

function buildSeries(
  metrics: RegionMetric[],
  pickValue: (metric: RegionMetric) => number,
): RegionSeriesItem[] {
  return metrics
    .map((metric) => ({
      region: metric.region,
      value: pickValue(metric),
      color: regionColors[metric.region] ?? "#7f8da3",
    }))
    .filter((item) => item.value > 0);
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function compactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
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

function recordStatusClass(status: PortalRecordStatus) {
  if (status === "Approved") return "ok";
  if (status === "Submitted") return "pending";
  if (status === "Returned") return "warn";
  return "idle";
}

function getRoleLabel(user: PortalUser) {
  if (user.isSuperAdmin) return "Super Admin";
  if (user.isAdmin) return "Admin";
  if (user.isME) return "M&E";
  return user.role;
}

function FunnelCard({
  title,
  subtitle,
  series,
  reportHref,
  generatedAt,
}: {
  title: string;
  subtitle: string;
  series: RegionSeriesItem[];
  reportHref: string;
  generatedAt: string;
}) {
  const sorted = [...series].sort((a, b) => b.value - a.value).slice(0, 4);
  const max = sorted[0]?.value ?? 1;

  return (
    <article className="card crm-chart-card">
      <div className="crm-card-head">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="crm-funnel-layout">
        <div className="crm-funnel-chart" role="img" aria-label={`${title} by region`}>
          {sorted.length === 0 ? (
            <p className="crm-empty">No regional data available.</p>
          ) : (
            sorted.map((item, index) => {
              const width = Math.max(42, Math.round((item.value / max) * 88) - index * 6);
              return (
                <div
                  key={`${item.region}-${item.value}`}
                  className="crm-funnel-segment"
                  style={{ width: `${width}%`, backgroundColor: item.color }}
                >
                  <span>{compactNumber(item.value)}</span>
                </div>
              );
            })
          )}
        </div>
        <ul className="crm-legend">
          {sorted.map((item) => (
            <li key={`${title}-${item.region}`}>
              <i style={{ backgroundColor: item.color }} aria-hidden />
              <span>{item.region}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="crm-card-foot">
        <Link href={reportHref}>View Report ({title})</Link>
        <span>As of {formatDateTime(generatedAt)}</span>
      </div>
    </article>
  );
}

export function PortalAnalyticsDashboard({ data, explorer, user }: PortalAnalyticsDashboardProps) {
  const roleLabel = getRoleLabel(user);
  const regionMetrics = buildRegionMetrics(explorer);
  const leadershipSeries = buildSeries(regionMetrics, (item) =>
    item.leaders > 0 ? item.leaders : item.schools,
  );
  const teacherSeries = buildSeries(regionMetrics, (item) =>
    item.teachers > 0 ? item.teachers : Math.round(item.schools * 12),
  );
  const learnersSeries = buildSeries(regionMetrics, (item) =>
    item.learnersAssessed > 0 ? item.learnersAssessed : item.boys + item.girls,
  );

  const maxLeadership = Math.max(...leadershipSeries.map((item) => item.value), 1);
  const maxEnrollment = Math.max(
    ...regionMetrics.map((item) => Math.max(item.boys, item.girls)),
    1,
  );

  const statusCounts = explorer.regions.reduce(
    (acc, region) => {
      acc.onTrack += region.statusCounts.onTrack;
      acc.needsSupport += region.statusCounts.needsSupport;
      acc.highPriority += region.statusCounts.highPriority;
      return acc;
    },
    { onTrack: 0, needsSupport: 0, highPriority: 0 },
  );
  const statusTotal = statusCounts.onTrack + statusCounts.needsSupport + statusCounts.highPriority;
  const onTrackPct = statusTotal > 0 ? (statusCounts.onTrack / statusTotal) * 100 : 0;
  const needsSupportPct = statusTotal > 0 ? (statusCounts.needsSupport / statusTotal) * 100 : 0;
  const donutBackground =
    statusTotal > 0
      ? `conic-gradient(
          #4f9fe6 0% ${onTrackPct}%,
          #7b64f3 ${onTrackPct}% ${onTrackPct + needsSupportPct}%,
          #2fb2a6 ${onTrackPct + needsSupportPct}% 100%
        )`
      : "#d7dfea";

  return (
    <div className="crm-dashboard">
      <section className="card crm-shell-card">
        <div className="crm-shell-top">
          <div className="crm-shell-brand">
            <span>OR</span>
          </div>
          <div className="crm-shell-search">
            <input type="search" aria-label="Search dashboard" placeholder="Search..." />
          </div>
          <div className="crm-shell-icons" aria-hidden>
            <span>★</span>
            <span>＋</span>
            <span>?</span>
            <span>🔔</span>
          </div>
        </div>
        <nav className="crm-shell-nav" aria-label="Analytics dashboard navigation">
          <Link href="/portal/dashboard">Home</Link>
          <Link href="/portal/analytics" className="active">
            Dashboards
          </Link>
          <Link href="/portal/reports">Reports</Link>
          <Link href="/portal/profiles">Accounts</Link>
          <Link href="/portal/trainings">Trainings</Link>
          <Link href="/portal/visits">School Visits</Link>
          <Link href="/portal/assessments">Assessments</Link>
          <Link href="/portal/story">MSC Stories</Link>
          <Link href="/portal/testimonials">Testimonials</Link>
          <Link href="/portal/profiles">More</Link>
        </nav>
      </section>

      <section className="card crm-dashboard-head">
        <div>
          <p className="kicker">Dashboard</p>
          <h2>Uganda School Metrics</h2>
          <p>
            As of {formatDateTime(data.generatedAt)} • Viewing as {user.fullName} ({roleLabel}) •
            Scope: {data.scope === "all" ? "All records" : "My records"}
          </p>
        </div>
        <div className="crm-head-actions">
          <Link href="/portal/analytics" className="crm-head-button">
            Refresh
          </Link>
          <button type="button" className="crm-head-button">
            Subscribe
          </button>
        </div>
      </section>

      <section className="crm-grid-top">
        <article className="card crm-chart-card">
          <div className="crm-card-head">
            <h3>Leadership</h3>
            <p>In active schools</p>
          </div>
          <div className="crm-hbar-chart">
            {leadershipSeries.length === 0 ? (
              <p className="crm-empty">No leadership data captured yet.</p>
            ) : (
              leadershipSeries.map((item) => (
                <div key={item.region} className="crm-hbar-row">
                  <span className="crm-hbar-label">{item.region}</span>
                  <div className="crm-hbar-track">
                    <i
                      style={{
                        width: `${Math.max(4, Math.round((item.value / maxLeadership) * 100))}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <strong>{formatNumber(item.value)}</strong>
                </div>
              ))
            )}
          </div>
          <div className="crm-card-foot">
            <Link href="/portal/reports">View Report (Leadership in Uganda)</Link>
            <span>As of {formatDateTime(data.generatedAt)}</span>
          </div>
        </article>

        <FunnelCard
          title="Number Of Teachers"
          subtitle="In active schools"
          series={teacherSeries}
          reportHref="/portal/reports"
          generatedAt={data.generatedAt}
        />

        <FunnelCard
          title="Learners Assessed"
          subtitle="By region coverage"
          series={learnersSeries}
          reportHref="/portal/reports"
          generatedAt={data.generatedAt}
        />
      </section>

      <section className="crm-grid-bottom">
        <article className="card crm-chart-card">
          <div className="crm-card-head">
            <h3>School Status Mix</h3>
            <p>Across tracked school profiles</p>
          </div>
          <div className="crm-donut-layout">
            <div className="crm-donut-ring" style={{ background: donutBackground }}>
              <div className="crm-donut-hole">
                <strong>{formatNumber(statusTotal)}</strong>
                <span>Schools</span>
              </div>
            </div>
            <ul className="crm-legend">
              <li>
                <i style={{ backgroundColor: "#4f9fe6" }} aria-hidden />
                <span>On Track ({formatNumber(statusCounts.onTrack)})</span>
              </li>
              <li>
                <i style={{ backgroundColor: "#7b64f3" }} aria-hidden />
                <span>Needs Support ({formatNumber(statusCounts.needsSupport)})</span>
              </li>
              <li>
                <i style={{ backgroundColor: "#2fb2a6" }} aria-hidden />
                <span>High Priority ({formatNumber(statusCounts.highPriority)})</span>
              </li>
            </ul>
          </div>
          <div className="crm-card-foot">
            <Link href="/portal/profiles">View Profile Status Details</Link>
            <span>As of {formatDateTime(data.generatedAt)}</span>
          </div>
        </article>

        <article className="card crm-chart-card">
          <div className="crm-card-head">
            <h3>Boys/Girls Enrollment</h3>
            <p>In active schools</p>
          </div>
          <div className="crm-group-chart">
            {regionMetrics.length === 0 ? (
              <p className="crm-empty">No enrollment data available.</p>
            ) : (
              regionMetrics.map((item) => (
                <div key={`enroll-${item.region}`} className="crm-group-col">
                  <div className="crm-group-bars">
                    <div
                      className="crm-group-bar boys"
                      style={{
                        height: `${Math.max(4, Math.round((item.boys / maxEnrollment) * 100))}%`,
                      }}
                      title={`Boys: ${formatNumber(item.boys)}`}
                    />
                    <div
                      className="crm-group-bar girls"
                      style={{
                        height: `${Math.max(4, Math.round((item.girls / maxEnrollment) * 100))}%`,
                      }}
                      title={`Girls: ${formatNumber(item.girls)}`}
                    />
                  </div>
                  <strong>{item.region}</strong>
                  <span>
                    {compactNumber(item.boys)} / {compactNumber(item.girls)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="crm-card-foot">
            <Link href="/portal/schools">View Report (Enrollment by Region)</Link>
            <span>As of {formatDateTime(data.generatedAt)}</span>
          </div>
        </article>
      </section>

      <section className="crm-grid-lower">
        <article className="card crm-table-card">
          <div className="crm-card-head">
            <h3>District Summary</h3>
            <p>Top active districts by records</p>
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
                  data.districtStats.slice(0, 8).map((item) => (
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

        <article className="card crm-table-card">
          <div className="crm-card-head">
            <h3>Recent Submissions</h3>
            <p>Latest entries from portal modules</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Date</th>
                  <th>Module</th>
                  <th>District</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No recent records found.</td>
                  </tr>
                ) : (
                  data.recentRecords.slice(0, 8).map((item) => (
                    <tr key={item.id}>
                      <td>{item.recordCode}</td>
                      <td>{formatDate(item.date)}</td>
                      <td>{moduleLabels[item.module]}</td>
                      <td>{item.district}</td>
                      <td>
                        <span className={`analytics-status-pill ${recordStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
