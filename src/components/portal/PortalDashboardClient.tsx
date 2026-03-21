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

const moduleIconColor: Record<string, { bg: string; color: string; icon: string }> = {
  training: { bg: "rgba(94,114,228,0.1)", color: "#5e72e4", icon: "🎓" },
  visit: { bg: "rgba(45,206,137,0.1)", color: "#2dce89", icon: "🚶" },
  assessment: { bg: "rgba(251,99,64,0.1)", color: "#fb6340", icon: "📝" },
  story: { bg: "rgba(245,54,92,0.1)", color: "#f5365c", icon: "📖" },
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

const sparklineColors = ["#5e72e4", "#2dce89", "#f5365c", "#11cdef"];
const sparklinePaths = [
  "M0,40 Q20,30 40,40 T80,30 T120,40 T160,20 T200,40 T240,10 L240,60 L0,60 Z",
  "M0,50 Q20,40 40,50 T80,40 T120,50 T160,30 T200,50 T240,20 L240,60 L0,60 Z",
  "M0,20 Q20,30 40,20 T80,40 T120,30 T160,50 T200,40 T240,50 L240,60 L0,60 Z",
  "M0,30 Q20,20 40,30 T80,20 T120,40 T160,30 T200,50 T240,20 L240,60 L0,60 Z"
];

function ConceptSparkline({ index }: { index: number }) {
  const color = sparklineColors[index % sparklineColors.length];
  const path = sparklinePaths[index % sparklinePaths.length];
  return (
    <svg className="concept-kpi-sparkline" viewBox="0 0 240 60" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
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

  const quickActions = useMemo(() => [
    { href: "/portal/trainings?new=1", label: "New Training", icon: "🎓" },
    { href: "/portal/visits?new=1", label: "New School Visit", icon: "🚶" },
    { href: "/portal/assessments?new=1", label: "New Assessment", icon: "📝" },
    { href: "/portal/story?new=1", label: "New 1001 Story", icon: "📖" },
    { href: "/portal/blog?new=1", label: "New Blog Post", icon: "✏️" },
    { href: "/portal/resources", label: "Upload Resource", icon: "📎" },
  ], []);

  useEffect(() => {
    let active = true;
    async function loadGraduationAlerts() {
      try {
        const response = await fetch(`/api/portal/graduation/queue?summary=1&limit=5&refresh=1`, { cache: "no-store" });
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
      { label: "Total Reached", value: dashboard.kpis.learnersReached.toLocaleString(), trend: "5.86", up: true },
      { label: "Trainings Logged", value: dashboard.kpis.trainingsLogged.toLocaleString(), trend: "3.24", up: true },
      { label: "Assessments", value: dashboard.kpis.assessments.toLocaleString(), trend: null, up: null },
      { label: "Demo Visits", value: dashboard.kpis.demoVisitsConducted.toLocaleString(), trend: "-2.00", up: false },
    ],
    [dashboard.kpis],
  );

  return (
    <div style={{ minWidth: 0 }}>
      {/* Concept Header */}
      <div className="concept-page-header">
        <h1 className="concept-page-title">Program Dashboard Workspace</h1>
        <p className="concept-page-subtitle">Overview of program performance, recent activities, and upcoming events across all schools.</p>
        <div className="concept-breadcrumbs">
          <Link href="/portal/dashboard">Dashboard</Link> / <span>Program Dashboard Workspace</span>
        </div>
      </div>

      {graduationEligibleCount > 0 && (
        <div className="ds-alert-banner warning" style={{ marginBottom: "1.5rem" }}>
          🎓 {graduationEligibleCount.toLocaleString()} school{graduationEligibleCount === 1 ? "" : "s"} are graduation eligible.
          <div className="ds-alert-banner-actions">
            <Link href="/portal/graduation-queue">Review now</Link>
          </div>
        </div>
      )}

      {/* Concept KPI Row */}
      <div className="concept-kpi-grid">
        {kpiCards.map((item, idx) => (
          <article className="concept-kpi" key={item.label}>
            <div className="concept-kpi-header">
              <p className="concept-kpi-label" style={{ fontWeight: 600, textTransform: "uppercase" }}>{item.label}</p>
              {item.trend ? (
                <span className={`concept-badge ${item.up ? "up" : "down"}`}>
                  {item.up ? "↑" : "↓"} {Math.abs(Number(item.trend))}%
                </span>
              ) : (
                <span className="concept-badge neutral">N/A</span>
              )}
            </div>
            <p className="concept-kpi-value">{item.value}</p>
            <ConceptSparkline index={idx} />
          </article>
        ))}
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        {performanceData && <PerformanceCascade data={performanceData} />}
      </div>

      {/* Dashboard Main layout: Table & Pie Chart */}
      <div className="concept-layout">
        
        {/* Left Table Section */}
        <section className="concept-card" style={{ minWidth: 0 }}>
          <div className="concept-card-header">
            <h2 className="concept-card-title">Recent Network Activity</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="concept-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Image</th>
                  <th>School Name</th>
                  <th>Log ID</th>
                  <th>Type</th>
                  <th>Timestamp</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentActivity.length === 0 ? (
                  <tr><td colSpan={9}>No recent activity found.</td></tr>
                ) : (
                  dashboard.recentActivity.slice(0, 10).map((item, idx) => {
                    const iconSettings = moduleIconColor[item.module.split('_')[0]] || moduleIconColor.training;
                    const statusProps = getStatusProps(item.status);
                    
                    return (
                      <tr key={item.id}>
                        <td style={{ color: "#8b92a5" }}>{idx + 1}</td>
                        <td>
                          <div className="concept-icon-box" style={{ background: iconSettings.bg, color: iconSettings.color }}>
                            {iconSettings.icon}
                          </div>
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.schoolName}>
                            {item.schoolName}
                          </div>
                        </td>
                        <td style={{ color: "#8b92a5" }}>REC-{item.id.toString().padStart(6, '0')}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{moduleLabel[item.module]}</td>
                        <td style={{ color: "#8b92a5", whiteSpace: "nowrap" }}>
                          {formatDay(item.date)}<br/>
                          <span style={{ fontSize: "10px" }}>Active Log</span>
                        </td>
                        <td style={{ color: "#8b92a5" }}>
                          <div style={{ maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            Reviewer
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span className={`concept-status-dot ${statusProps.color}`}></span>
                          {statusProps.text}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <Link href={`${moduleRoute[item.module]}?record=${item.id}`} style={{ color: "#5e72e4", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 600 }}>
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
        <section className="concept-card" style={{ minWidth: 0 }}>
          <div className="concept-card-header">
            <h2 className="concept-card-title">Program Implementation Coverage</h2>
          </div>
          
          <ConceptDoughnutChart 
            implement={dashboard.kpis.schoolsImplementingPercent} 
            notImplement={dashboard.kpis.schoolsNotImplementingPercent} 
          />

          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", paddingBottom: "2rem" }}>
            <div style={{ fontSize: "0.8125rem", color: "#8b92a5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#5e72e4", display: "inline-block" }}></span> Implementing
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#8b92a5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#8b92a5", display: "inline-block" }}></span> Not Started
            </div>
          </div>
        </section>

        {/* Quick Actions Restored */}
        <section className="concept-card" style={{ minWidth: 0 }}>
          <div className="concept-card-header" style={{ paddingBottom: "1rem" }}>
            <h2 className="concept-card-title">Quick Actions</h2>
          </div>
          <div style={{ padding: "0 1.5rem 1.5rem 1.5rem" }}>
            <div className="concept-quick-actions">
              {quickActions.map((item) => (
                <Link key={item.href} href={item.href} className="concept-quick-action-link">
                  <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
