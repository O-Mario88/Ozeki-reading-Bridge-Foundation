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
  { href: "/portal/trainings?new=1", label: "+ New Training" },
  { href: "/portal/visits?new=1", label: "+ New School Visit" },
  { href: "/portal/assessments?new=1", label: "+ New Assessment" },
  { href: "/portal/story?new=1", label: "+ New 1001 Story" },
  { href: "/portal/resources", label: "+ Upload Resource" },
  { href: "/portal/reports", label: "Open Reports Workspace" },
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
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }
  return `${weekdayLabels[date.getUTCDay()]} ${date.getUTCDate()} ${monthLabels[date.getUTCMonth()]}`;
}

function readQueueCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const portalRaw = window.localStorage.getItem("portal-offline-queue");
    const globalRaw = window.localStorage.getItem("orbf-offline-form-queue-v1");
    const portalQueue = portalRaw ? (JSON.parse(portalRaw) as unknown[]) : [];
    const globalQueue = globalRaw ? (JSON.parse(globalRaw) as unknown[]) : [];
    const portalCount = Array.isArray(portalQueue) ? portalQueue.length : 0;
    const globalCount = Array.isArray(globalQueue) ? globalQueue.length : 0;
    return portalCount + globalCount;
  } catch {
    return 0;
  }
}

function readDraftModules() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const items: string[] = [];
  (["training", "visit", "assessment", "story"] as PortalRecordModule[]).forEach((module) => {
    const value = window.localStorage.getItem(`portal-form-draft-${module}`);
    if (value) {
      items.push(moduleLabel[module]);
    }
  });
  return items;
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
          {
            cache: "no-store",
          },
        );
        const json = (await response.json()) as {
          eligibleCount?: number;
          schools?: Array<{ schoolId: number; schoolName: string }>;
        };
        if (!response.ok || !active) {
          return;
        }
        const count = Number(json.eligibleCount ?? 0);
        setGraduationEligibleCount(count);
        setGraduationSchools(Array.isArray(json.schools) ? json.schools : []);
        if (count > 0) {
          setShowGraduationToast(true);
        }
      } catch {
        // Swallow alert-fetch failures to keep dashboard resilient.
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
      { label: "Learners Reached", value: dashboard.kpis.learnersReached.toLocaleString() },
      { label: "Trainings Logged", value: dashboard.kpis.trainingsLogged.toLocaleString() },
      { label: "School Visits", value: dashboard.kpis.schoolVisits.toLocaleString() },
      { label: "Assessments", value: dashboard.kpis.assessments.toLocaleString() },
      { label: "1001 Activities", value: dashboard.kpis.storyActivities.toLocaleString() },
      {
        label: "Schools Implementing",
        value: `${dashboard.kpis.schoolsImplementingPercent.toFixed(1)}%`,
      },
      {
        label: "Schools Not Implementing",
        value: `${dashboard.kpis.schoolsNotImplementingPercent.toFixed(1)}%`,
      },
      {
        label: "Demo Visits Conducted",
        value: dashboard.kpis.demoVisitsConducted.toLocaleString(),
      },
    ],
    [dashboard.kpis],
  );

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        {kpiCards.map((item) => (
          <article className="portal-kpi-card" key={item.label}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>Quick Actions</h2>
        <div className="action-row">
          {quickActions.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={index === 0 ? "button" : "button button-ghost"}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <p className="portal-muted">
          New training, visit, assessment, 1001 Story, enrollment, and contact updates are now
          launched from each school profile.
        </p>
        <div className="portal-status-line">
          <p>
            <strong>Drafts:</strong>{" "}
            {draftModules.length > 0 ? draftModules.join(", ") : "No saved drafts"}
          </p>
          <p>
            <strong>Offline queue:</strong> {offlineCount} item(s) waiting to sync
          </p>
        </div>
      </section>

      {graduationEligibleCount > 0 ? (
        <section className="card">
          <h2>Graduation Alerts</h2>
          <p>
            {graduationEligibleCount.toLocaleString()} schools are currently graduation-eligible
            based on live criteria.
          </p>
          <ul className="portal-list">
            {graduationSchools.map((school) => (
              <li key={school.schoolId}>
                <div>
                  <strong>{school.schoolName}</strong>
                </div>
                <Link href={`/portal/schools/${school.schoolId}`}>Review</Link>
              </li>
            ))}
          </ul>
          <div className="action-row">
            <Link href="/portal/graduation-queue" className="button">
              Open Graduation Queue
            </Link>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2>Due Follow-ups</h2>
        {dashboard.dueFollowUps.length === 0 ? (
          <p>No follow-ups due right now.</p>
        ) : (
          <ul className="portal-list">
            {dashboard.dueFollowUps.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.schoolName}</strong>
                  <span>
                    {item.recordCode} • Due {formatDay(item.followUpDate)}
                  </span>
                </div>
                <Link href={`${moduleRoute[item.module]}?record=${item.id}`}>Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {performanceData && <PerformanceCascade data={performanceData} />}


      <section className="card">
        <h2>My Week at a Glance</h2>
        {dashboard.weekAgenda.length === 0 ? (
          <p>No upcoming trainings or visits in the next 7 days.</p>
        ) : (
          <ul className="portal-list">
            {dashboard.weekAgenda.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{formatDay(item.date)}</strong>
                  <span>
                    {moduleLabel[item.module]} - {item.schoolName}
                    {item.programType ? ` (${item.programType})` : ""}
                  </span>
                </div>
                <Link href={`${moduleRoute[item.module]}?record=${item.id}`}>Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Recent Activity</h2>
        <div className="table-wrap">
          <table>
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
                  <td colSpan={5}>No recent activity found.</td>
                </tr>
              ) : (
                dashboard.recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDay(item.date)}</td>
                    <td>{moduleLabel[item.module]}</td>
                    <td>{item.schoolName}</td>
                    <td>{item.status}</td>
                    <td>
                      <Link href={`${moduleRoute[item.module]}?record=${item.id}`}>View/Edit</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showGraduationToast && graduationEligibleCount > 0 ? (
        <div className="portal-graduation-toast" role="status" aria-live="polite">
          <p>
            New: {graduationEligibleCount.toLocaleString()} school
            {graduationEligibleCount === 1 ? "" : "s"} are graduation eligible.
          </p>
          <div className="action-row">
            <Link href="/portal/graduation-queue" className="button button-ghost">
              Review now
            </Link>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setShowGraduationToast(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
