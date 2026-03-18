"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PortalDashboardData, PortalRecordModule } from "@/lib/types";
import { PerformanceCascade, PerformanceNode } from "@/components/dashboard/PerformanceCascade";

interface PortalDashboardClientProps {
  dashboard: PortalDashboardData;
  performanceData?: PerformanceNode;
}

const quickActions = [
  { href: "/portal/trainings?new=1", label: "New Training", icon: "🎓", color: "blue" },
  { href: "/portal/visits?new=1", label: "New School Visit", icon: "🚶", color: "green" },
  { href: "/portal/assessments?new=1", label: "New Assessment", icon: "📝", color: "orange" },
  { href: "/portal/story?new=1", label: "New 1001 Story", icon: "📖", color: "purple" },
  { href: "/portal/blog?new=1", label: "New Blog Post", icon: "✏️", color: "teal" },
  { href: "/portal/resources", label: "Upload Resource", icon: "📎", color: "blue" },
  { href: "/portal/reports", label: "Reports Workspace", icon: "📊", color: "red" },
];

const moduleRoute: Record<PortalRecordModule, string> = {
  training: "/portal/trainings",
  visit: "/portal/visits",
  assessment: "/portal/assessments",
  story: "/portal/stories",
  story_activity: "/portal/stories",
};

const moduleLabel: Record<PortalRecordModule, string> = {
  training: "Training",
  visit: "Coaching Visit",
  assessment: "Assessment",
  story: "Story Collection",
  story_activity: "Story Activity",
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function formatDay(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return `${weekdayLabels[date.getUTCDay()]} ${date.getUTCDate()} ${monthLabels[date.getUTCMonth()]}`;
}

function readQueueCount() {
  if (typeof window === "undefined") return 0;
  try {
    const portalRaw = window.localStorage.getItem("portal-offline-queue");
    const globalRaw = window.localStorage.getItem("orbf-offline-form-queue-v1");
    const portalQueue = portalRaw ? (JSON.parse(portalRaw) as unknown[]) : [];
    const globalQueue = globalRaw ? (JSON.parse(globalRaw) as unknown[]) : [];
    return (Array.isArray(portalQueue) ? portalQueue.length : 0) + (Array.isArray(globalQueue) ? globalQueue.length : 0);
  } catch {
    return 0;
  }
}

function readDraftModules() {
  if (typeof window === "undefined") return [] as string[];
  const items: string[] = [];
  (["training", "visit", "assessment", "story"] as PortalRecordModule[]).forEach((module) => {
    if (window.localStorage.getItem(`portal-form-draft-${module}`)) items.push(moduleLabel[module]);
  });
  return items;
}

function getStatusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "approved" || s === "done") return "ds-badge ds-badge-success";
  if (s === "pending" || s === "draft" || s === "in progress") return "ds-badge ds-badge-warning";
  if (s === "submitted" || s === "active") return "ds-badge ds-badge-info";
  return "ds-badge ds-badge-default";
}

export function PortalDashboardClient({ dashboard, performanceData }: PortalDashboardClientProps) {
  const [offlineCount, setOfflineCount] = useState(0);
  const [draftModules, setDraftModules] = useState<string[]>([]);
  const [graduationEligibleCount, setGraduationEligibleCount] = useState(0);
  const [graduationSchools, setGraduationSchools] = useState<Array<{ schoolId: number; schoolName: string }>>([]);
  const [showGraduationToast, setShowGraduationToast] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setOfflineCount(readQueueCount());
      setDraftModules(readDraftModules());
    };
    refresh();
    window.addEventListener("storage", refresh);
    const interval = window.setInterval(refresh, 3000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadGraduationAlerts(refresh: boolean) {
      try {
        const response = await fetch(
          `/api/portal/graduation/queue?summary=1&limit=5&refresh=${refresh ? "1" : "0"}`,
          { cache: "no-store" },
        );
        const json = (await response.json()) as {
          eligibleCount?: number;
          schools?: Array<{ schoolId: number; schoolName: string }>;
        };
        if (!response.ok || !active) return;
        const count = Number(json.eligibleCount ?? 0);
        setGraduationEligibleCount(count);
        setGraduationSchools(Array.isArray(json.schools) ? json.schools : []);
        if (count > 0) setShowGraduationToast(true);
      } catch {
        /* keep dashboard resilient */
      }
    }
    loadGraduationAlerts(true);
    const interval = window.setInterval(() => loadGraduationAlerts(false), 90_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const kpiCards = useMemo(
    () => [
      { label: "Learners Reached", value: dashboard.kpis.learnersReached.toLocaleString(), trend: null },
      { label: "Trainings Logged", value: dashboard.kpis.trainingsLogged.toLocaleString(), trend: null },
      { label: "Assessments", value: dashboard.kpis.assessments.toLocaleString(), trend: null },
      { label: "Demo Visits", value: dashboard.kpis.demoVisitsConducted.toLocaleString(), trend: null },
    ],
    [dashboard.kpis],
  );

  return (
    <div className="ds-dashboard-grid">
      {/* Graduation Alert Banner */}
      {graduationEligibleCount > 0 && (
        <div className="ds-alert-banner warning">
          🎓 {graduationEligibleCount.toLocaleString()} school{graduationEligibleCount === 1 ? "" : "s"} are graduation eligible.
          <div className="ds-alert-banner-actions">
            <Link href="/portal/graduation-queue">Review now</Link>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <section className="ds-kpi-grid">
        {kpiCards.map((item) => (
          <article className="ds-kpi-card" key={item.label}>
            <div className="ds-kpi-header">
              <p className="ds-kpi-label">{item.label}</p>
              {item.trend !== null && (
                <span className={`ds-kpi-trend ${Number(item.trend) >= 0 ? "up" : "down"}`}>
                  {Number(item.trend) >= 0 ? "↑" : "↓"} {Math.abs(Number(item.trend))}%
                </span>
              )}
              {item.trend === null && <span className="ds-kpi-trend neutral">N/A</span>}
            </div>
            <p className="ds-kpi-value">{item.value}</p>
            <div className="ds-kpi-sparkline" />
          </article>
        ))}
      </section>

      {/* Two-Column: Recent Activity + Quick Actions */}
      <div className="ds-two-col">
        {/* Recent Activity Table */}
        <section className="ds-card">
          <div className="ds-card-header">
            <h2 className="ds-card-title">Recent Activity</h2>
            <Link href="/portal/reports" className="ds-card-action">View all</Link>
          </div>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>School</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="ds-empty">No recent activity found.</div>
                    </td>
                  </tr>
                ) : (
                  dashboard.recentActivity.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDay(item.date)}</td>
                      <td>{moduleLabel[item.module]}</td>
                      <td>{item.schoolName}</td>
                      <td>
                        <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
                      </td>
                      <td>
                        <Link href={`${moduleRoute[item.module]}?record=${item.id}`} className="ds-list-item-action">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="ds-status-row">
            <span>Drafts: {draftModules.length > 0 ? draftModules.join(", ") : "None"}</span>
            <span>Offline queue: {offlineCount} item(s)</span>
          </div>
        </section>

        {/* Quick Actions Card */}
        <section className="ds-card">
          <div className="ds-card-header">
            <h2 className="ds-card-title">Quick Actions</h2>
          </div>
          <div className="ds-quick-actions">
            {quickActions.map((item) => (
              <Link key={item.href} href={item.href} className="ds-quick-action-link">
                <span className={`ds-quick-action-icon ${item.color}`}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Two-Column: Follow-ups + Week Agenda */}
      <div className="ds-two-col">
        {/* Due Follow-ups */}
        <section className="ds-card">
          <div className="ds-card-header">
            <h2 className="ds-card-title">Due Follow-ups</h2>
            <span className="ds-kpi-trend neutral">{dashboard.dueFollowUps.length} items</span>
          </div>
          {dashboard.dueFollowUps.length === 0 ? (
            <div className="ds-empty">No follow-ups due right now.</div>
          ) : (
            <ul className="ds-list">
              {dashboard.dueFollowUps.map((item) => (
                <li key={item.id} className="ds-list-item">
                  <div className="ds-list-item-content">
                    <p className="ds-list-item-title">{item.schoolName}</p>
                    <p className="ds-list-item-meta">{item.recordCode} • Due {formatDay(item.followUpDate)}</p>
                  </div>
                  <Link href={`${moduleRoute[item.module]}?record=${item.id}`} className="ds-list-item-action">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Week at a Glance */}
        <section className="ds-card">
          <div className="ds-card-header">
            <h2 className="ds-card-title">My Week at a Glance</h2>
            <span className="ds-kpi-trend neutral">{dashboard.weekAgenda.length} items</span>
          </div>
          {dashboard.weekAgenda.length === 0 ? (
            <div className="ds-empty">No upcoming events in the next 7 days.</div>
          ) : (
            <ul className="ds-list">
              {dashboard.weekAgenda.map((item) => (
                <li key={item.id} className="ds-list-item">
                  <div className="ds-list-item-content">
                    <p className="ds-list-item-title">{formatDay(item.date)}</p>
                    <p className="ds-list-item-meta">
                      {moduleLabel[item.module]} - {item.schoolName}
                      {item.programType ? ` (${item.programType})` : ""}
                    </p>
                  </div>
                  <Link href={`${moduleRoute[item.module]}?record=${item.id}`} className="ds-list-item-action">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Performance Cascade */}
      {performanceData && <PerformanceCascade data={performanceData} />}

      {/* Additional KPIs Row */}
      <div className="ds-two-col">
        <section className="ds-card">
          <div className="ds-card-header">
            <h2 className="ds-card-title">Program Coverage</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
            <div>
              <p className="ds-kpi-label">Schools Implementing</p>
              <p className="ds-kpi-value" style={{ fontSize: "1.5rem" }}>
                {dashboard.kpis.schoolsImplementingPercent.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="ds-kpi-label">Not Implementing</p>
              <p className="ds-kpi-value" style={{ fontSize: "1.5rem" }}>
                {dashboard.kpis.schoolsNotImplementingPercent.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="ds-kpi-label">School Visits</p>
              <p className="ds-kpi-value" style={{ fontSize: "1.5rem" }}>
                {dashboard.kpis.schoolVisits.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="ds-kpi-label">1001 Activities</p>
              <p className="ds-kpi-value" style={{ fontSize: "1.5rem" }}>
                {dashboard.kpis.storyActivities.toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        {/* Graduation Schools */}
        {graduationEligibleCount > 0 && (
          <section className="ds-card">
            <div className="ds-card-header">
              <h2 className="ds-card-title">Graduation Eligible</h2>
              <Link href="/portal/graduation-queue" className="ds-card-action">View all</Link>
            </div>
            <ul className="ds-list">
              {graduationSchools.map((school) => (
                <li key={school.schoolId} className="ds-list-item">
                  <div className="ds-list-item-content">
                    <p className="ds-list-item-title">{school.schoolName}</p>
                  </div>
                  <Link href={`/portal/schools/${school.schoolId}`} className="ds-list-item-action">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Graduation Toast */}
      {showGraduationToast && graduationEligibleCount > 0 && (
        <div className="ds-toast" role="status" aria-live="polite">
          🎓 {graduationEligibleCount.toLocaleString()} school{graduationEligibleCount === 1 ? "" : "s"} are graduation eligible.
          <div className="ds-toast-actions">
            <Link href="/portal/graduation-queue">Review</Link>
            <button type="button" onClick={() => setShowGraduationToast(false)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
