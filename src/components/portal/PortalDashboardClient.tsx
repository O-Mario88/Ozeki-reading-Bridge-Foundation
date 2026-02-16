"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PortalDashboardData, PortalRecordModule } from "@/lib/types";

interface PortalDashboardClientProps {
  dashboard: PortalDashboardData;
}

const quickActions = [
  { href: "/portal/trainings?new=1", label: "+ New Training" },
  { href: "/portal/visits?new=1", label: "+ New School Visit" },
  { href: "/portal/assessments?new=1", label: "+ New Assessment" },
  { href: "/portal/story?new=1", label: "+ New 1001 Story Support" },
];

const moduleRoute: Record<PortalRecordModule, string> = {
  training: "/portal/trainings",
  visit: "/portal/visits",
  assessment: "/portal/assessments",
  story: "/portal/story",
};

const moduleLabel: Record<PortalRecordModule, string> = {
  training: "Training",
  visit: "Visit",
  assessment: "Assessment",
  story: "1001 Story",
};

function formatDay(dateValue: string) {
  const date = new Date(dateValue);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function readQueueCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem("portal-offline-queue");
    if (!raw) {
      return 0;
    }
    const queue = JSON.parse(raw) as unknown[];
    return Array.isArray(queue) ? queue.length : 0;
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

export function PortalDashboardClient({ dashboard }: PortalDashboardClientProps) {
  const [offlineCount, setOfflineCount] = useState(0);
  const [draftModules, setDraftModules] = useState<string[]>([]);

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

  const kpiCards = useMemo(
    () => [
      { label: "Trainings Logged", value: dashboard.kpis.trainingsLogged },
      { label: "School Visits", value: dashboard.kpis.schoolVisits },
      { label: "Assessments", value: dashboard.kpis.assessments },
      { label: "1001 Activities", value: dashboard.kpis.storyActivities },
    ],
    [dashboard.kpis],
  );

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        {kpiCards.map((item) => (
          <article className="portal-kpi-card" key={item.label}>
            <p>{item.label}</p>
            <strong>{item.value.toLocaleString()}</strong>
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
    </div>
  );
}
