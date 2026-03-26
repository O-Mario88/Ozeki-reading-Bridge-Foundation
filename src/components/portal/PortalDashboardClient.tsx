"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PortalDashboardData, PortalRecordModule } from "@/lib/types";
import { PerformanceCascade, PerformanceNode } from "@/components/dashboard/PerformanceCascade";

interface PortalDashboardClientProps {
  dashboard: PortalDashboardData;
  performanceData?: PerformanceNode;
}

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



function getStatusProps(status: string) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "approved" || s === "done" || s === "delivered") return { color: "success", text: status };
  if (s === "pending" || s === "draft" || s === "in progress") return { color: "warning", text: status };
  return { color: "info", text: status };
}

function formatDay(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return `${date.getUTCDate().toString().padStart(2, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCFullYear()}`;
}



function ConceptDoughnutChart({ implement, notImplement }: { implement: number, notImplement: number }) {
  const total = implement + notImplement;
  const percentage = total === 0 ? 0 : (implement / total) * 100;
  
  // 251.2 is the circumference of a circle with radius 40 (2 * pi * 40)
  const strokeDasharray = `${(percentage / 100) * 251.2} 251.2`;
  
  return (
    <div className="concept-doughnut-wrap">
      <svg width="200" height="200" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b92a5" strokeWidth="16" />
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#5e72e4" strokeWidth="16" strokeDasharray={strokeDasharray} strokeDashoffset="0" />
      </svg>
    </div>
  );
}

export function PortalDashboardClient({ dashboard, performanceData }: PortalDashboardClientProps) {
  const [graduationEligibleCount, setGraduationEligibleCount] = useState(0);


  useEffect(() => {
    let active = true;
    async function loadGraduationAlerts() {
      try {
        const response = await fetch(`/api/portal/graduation/queue?summary=1&limit=5&refresh=1`);
        const json = (await response.json()) as { eligibleCount?: number };
        if (!response.ok || !active) return;
        setGraduationEligibleCount(Number(json.eligibleCount ?? 0));
      } catch {
        /* silent */
      }
    }
    loadGraduationAlerts();
    return () => { active = false; };
  }, []);

  const kpiCards = useMemo(
    () => [
      // Top row - Pastel
      { label: "Learners Reached", value: dashboard.kpis.learnersReached.toLocaleString(), sub: "Total impacting", color: "pink", icon: "👥" },
      { label: "Trainings Logged", value: dashboard.kpis.trainingsLogged.toLocaleString(), sub: "All time", color: "blue", icon: "🎓" },
      { label: "Assessments", value: dashboard.kpis.assessments.toLocaleString(), sub: "Total records", color: "purple", icon: "📝" },
      { label: "Demo Visits", value: dashboard.kpis.demoVisitsConducted.toLocaleString(), sub: "Conducted", color: "green", icon: "🎙️" },
      // Bottom row - Gray
      { label: "School Visits", value: dashboard.kpis.schoolVisits.toLocaleString(), sub: "Tracking", color: "", icon: "🏫" },
      { label: "Story Activities", value: dashboard.kpis.storyActivities.toLocaleString(), sub: "Collected", color: "", icon: "📖" },
      { label: "Implementing", value: `${dashboard.kpis.schoolsImplementingPercent}%`, sub: "Schools active", color: "", icon: "📈" },
      { label: "Not Implementing", value: `${dashboard.kpis.schoolsNotImplementingPercent}%`, sub: "Schools inactive", color: "", icon: "⚠️" },
    ],
    [dashboard.kpis],
  );

  const newQuickActions = useMemo(() => [
    { href: "/portal/trainings?new=1", label: "Log Training", sub: "Record a new training", color: "pink", icon: "🎓" },
    { href: "/portal/visits?new=1", label: "School Visit", sub: "Log a coaching visit", color: "blue", icon: "🚶" },
    { href: "/portal/assessments?new=1", label: "Assessment", sub: "Upload learner scores", color: "purple", icon: "📝" },
    { href: "/portal/story?new=1", label: "1001 Story", sub: "Capture a story", color: "green", icon: "📖" },
    { href: "/portal/blog?new=1", label: "Blog Post", sub: "Publish an update", color: "orange", icon: "✏️" },
    { href: "/portal/resources", label: "Resources", sub: "Upload evidence", color: "blue", icon: "📎" },
    { href: "/portal/schools", label: "Programs", sub: "View school data", color: "purple", icon: "🏫" },
    { href: "/portal/national-intelligence", label: "Insights", sub: "View global stats", color: "green", icon: "💡" },
  ], []);

  return (
    <div style={{ minWidth: 0 }}>
      {/* Sleek Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1f2937", margin: 0, letterSpacing: "-0.02em" }}>Program DashboardWorkspace</h1>
        <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0.25rem 0 0" }}>Complete the following steps to track and manage school deployments effectively.</p>
      </div>

      {graduationEligibleCount > 0 && (
        <div className="ds-alert-banner warning" style={{ marginBottom: "1.5rem" }}>
          🎓 {graduationEligibleCount.toLocaleString()} school{graduationEligibleCount === 1 ? "" : "s"} are graduation eligible.
          <div className="ds-alert-banner-actions">
            <Link href="/portal/graduation-queue">Review now</Link>
          </div>
        </div>
      )}

      {/* 8-Grid KPIs */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1f2937", margin: "0 0 1rem" }}>Today's data</h2>
        <div className="ds-metric-grid">
          {kpiCards.map((item) => (
            <div className={`ds-metric-card ${item.color}`} key={item.label}>
              <div className="ds-metric-content">
                <span className="ds-metric-title">{item.label}</span>
                <span className="ds-metric-value">{item.value}</span>
                <span className="ds-metric-sub">{item.sub}</span>
              </div>
              <div className="ds-metric-icon">{item.icon}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions (Operations Assistant) */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 className="ds-action-section-title">Operations Assistant</h2>
        <div className="ds-action-grid">
          {newQuickActions.map((action) => (
            <Link key={action.href} href={action.href} className={`ds-action-card ${action.color}`}>
              <div className="ds-action-icon">{action.icon}</div>
              <div className="ds-action-text">
                <span className="ds-action-title">{action.label}</span>
                <span className="ds-action-subtitle">{action.sub}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {performanceData && (
        <div style={{ marginBottom: "2rem" }}>
          <PerformanceCascade data={performanceData} />
        </div>
      )}

      {/* Implementation Coverage & Recent Activity */}
      <div className="ds-two-col">
        {/* Left Table Section */}
        <section className="ds-card" style={{ padding: "0" }}>
          <div className="ds-card-header" style={{ padding: "1.5rem 1.5rem 0", marginBottom: "1rem" }}>
            <h2 className="ds-card-title">Recent Network Activity</h2>
          </div>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>School Name</th>
                  <th>Type</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentActivity.length === 0 ? (
                  <tr><td colSpan={6} className="ds-empty">No recent activity found.</td></tr>
                ) : (
                  dashboard.recentActivity.slice(0, 8).map((item, idx) => {
                    const statusProps = getStatusProps(item.status);
                    return (
                      <tr key={item.id}>
                        <td style={{ color: "#9ca3af" }}>{idx + 1}</td>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.schoolName}>
                            {item.schoolName}
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{moduleLabel[item.module]}</td>
                        <td style={{ color: "#6b7280", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                          {formatDay(item.date)}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span className={`ds-badge ds-badge-${statusProps.color}`}>
                            {statusProps.text}
                          </span>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <Link href={`${moduleRoute[item.module]}?record=${item.id}`} className="ds-card-action">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Sidebar Section */}
        <section className="ds-card">
          <div className="ds-card-header">
            <h2 className="ds-card-title">Program Implementation Coverage</h2>
          </div>
          <div style={{ padding: "2rem 0" }}>
            <ConceptDoughnutChart 
              implement={dashboard.kpis.schoolsImplementingPercent} 
              notImplement={dashboard.kpis.schoolsNotImplementingPercent} 
            />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", paddingBottom: "1rem" }}>
            <div style={{ fontSize: "0.8125rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#5e72e4", display: "inline-block" }}></span> Implementing
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#e2e8f0", display: "inline-block" }}></span> Not Started
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
