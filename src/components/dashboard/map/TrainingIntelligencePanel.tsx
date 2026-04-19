"use client";

import { useEffect, useState } from "react";

type EffectivenessRow = {
  portalRecordId: number;
  schoolName: string;
  district: string;
  trainingDate: string;
  trainingTopic: string | null;
  facilitatorName: string | null;
  attendeeCount: number;
  baselineCompositePre: number | null;
  baselineCompositePost: number | null;
  scoreDelta: number | null;
  assessmentsPre: number;
  assessmentsPost: number;
};

type FacilitatorRow = {
  facilitatorUserId: number;
  facilitatorName: string;
  sessionsLed: number;
  schoolsTrained: number;
  teachersTrained: number;
  certificatesIssued: number;
  avgScoreLift: number | null;
  lastTrainingDate: string | null;
};

type CoverageGapRow = {
  schoolId: number;
  schoolName: string;
  district: string;
  region: string;
  lastTrainingDate: string | null;
  daysSinceLastTraining: number | null;
  coverageGapSeverity: "critical" | "warning" | "fresh" | "never";
};

type UpcomingRow = {
  id: number;
  topic: string;
  scheduledDate: string;
  scheduledStartTime: string | null;
  venue: string | null;
  district: string | null;
  facilitatorName: string | null;
  capacity: number | null;
  registeredCount: number;
  status: string;
};

type BundleResponse = {
  effectiveness: EffectivenessRow[];
  facilitators: FacilitatorRow[];
  coverageGaps: CoverageGapRow[];
  upcoming: UpcomingRow[];
  lastUpdated: string;
};

function sevClass(sev: CoverageGapRow["coverageGapSeverity"]): string {
  switch (sev) {
    case "never": return "impact-gap-never";
    case "critical": return "impact-gap-critical";
    case "warning": return "impact-gap-warning";
    default: return "impact-gap-fresh";
  }
}

function deltaClass(n: number | null): string {
  if (n === null || n === undefined) return "impact-delta-neutral";
  if (n > 0) return "impact-delta-positive";
  if (n < 0) return "impact-delta-negative";
  return "impact-delta-neutral";
}

export function TrainingIntelligencePanel() {
  const [data, setData] = useState<BundleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/impact/training-intelligence")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((json: BundleResponse) => { if (active) setData(json); })
      .catch((e) => { if (active) setError(String(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <article className="card"><p>Loading training intelligence…</p></article>;
  }
  if (error || !data) {
    return <article className="card"><p className="text-gray-500">Training intelligence temporarily unavailable.</p></article>;
  }

  const { effectiveness, facilitators, coverageGaps, upcoming } = data;
  const gapsOnly = coverageGaps.filter(g => g.coverageGapSeverity === "critical" || g.coverageGapSeverity === "never").slice(0, 12);

  return (
    <div className="impact-auto-grid" style={{ gap: "1.5rem" }}>
      {/* 1. Training Effectiveness */}
      <article className="card">
        <h3>Training Effectiveness — Score Lift Per Session</h3>
        <p className="text-gray-500 text-sm mb-3">
          For each training, compares the average reading composite 90 days before vs 90 days after, at the same school.
          Positive delta suggests the training shifted outcomes.
        </p>
        {effectiveness.length === 0 ? (
          <p className="text-gray-400">No training sessions with matched pre/post assessments yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #fed7aa", color: "#6b7280" }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>School / District</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Topic</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Facilitator</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Attendees</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Pre</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Post</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Δ</th>
                </tr>
              </thead>
              <tbody>
                {effectiveness.map((row) => (
                  <tr key={row.portalRecordId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: "0.78rem" }}>{row.trainingDate}</td>
                    <td style={{ padding: "6px 8px" }}>{row.schoolName}<br /><small style={{ color: "#9ca3af" }}>{row.district}</small></td>
                    <td style={{ padding: "6px 8px", color: "#6b7280" }}>{row.trainingTopic ?? "—"}</td>
                    <td style={{ padding: "6px 8px", color: "#6b7280" }}>{row.facilitatorName ?? "—"}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{row.attendeeCount}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{row.baselineCompositePre ?? "—"}<br /><small style={{ color: "#9ca3af" }}>n={row.assessmentsPre}</small></td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{row.baselineCompositePost ?? "—"}<br /><small style={{ color: "#9ca3af" }}>n={row.assessmentsPost}</small></td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }} className={deltaClass(row.scoreDelta)}>
                      {row.scoreDelta !== null ? (row.scoreDelta > 0 ? "+" : "") + row.scoreDelta.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* 2. Facilitator League Table */}
      <article className="card">
        <h3>Facilitator League Table</h3>
        <p className="text-gray-500 text-sm mb-3">
          Sessions led, reach, certificates, and average score lift across all sessions delivered by each facilitator.
        </p>
        {facilitators.length === 0 ? (
          <p className="text-gray-400">No facilitator data yet. Attach facilitators to training records to populate this table.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #fed7aa", color: "#6b7280" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>#</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Facilitator</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Sessions</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Schools</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Teachers</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Certificates</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Avg Lift</th>
              </tr>
            </thead>
            <tbody>
              {facilitators.map((f, idx) => (
                <tr key={f.facilitatorUserId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 8px", color: "#9ca3af" }}>{idx + 1}</td>
                  <td style={{ padding: "6px 8px", fontWeight: 600 }}>{f.facilitatorName}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{f.sessionsLed}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{f.schoolsTrained}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{f.teachersTrained}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{f.certificatesIssued}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }} className={deltaClass(f.avgScoreLift)}>
                    {f.avgScoreLift !== null ? (f.avgScoreLift > 0 ? "+" : "") + f.avgScoreLift.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      {/* 3. Training Coverage Gaps */}
      <article className="card">
        <h3>Training Coverage Gaps</h3>
        <p className="text-gray-500 text-sm mb-3">
          Schools that have received no training in 6+ months, ordered by urgency. These schools should be prioritised in the next training cycle.
        </p>
        {gapsOnly.length === 0 ? (
          <p className="text-gray-400">All active schools have recent training. Nice work.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
            {gapsOnly.map((g) => (
              <div key={g.schoolId} className={`impact-gap-card ${sevClass(g.coverageGapSeverity)}`}>
                <strong>{g.schoolName}</strong>
                <small>{g.district}{g.region ? ` · ${g.region}` : ""}</small>
                <div className="impact-gap-meta">
                  {g.coverageGapSeverity === "never"
                    ? "Never trained"
                    : `${g.daysSinceLastTraining} days since last training`}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      {/* 4. Upcoming Training Calendar */}
      <article className="card">
        <h3>Upcoming Training Calendar</h3>
        <p className="text-gray-500 text-sm mb-3">
          Forward-looking schedule. Schools can pre-register via the public training page.
        </p>
        {upcoming.length === 0 ? (
          <p className="text-gray-400">No upcoming trainings scheduled.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #fed7aa", color: "#6b7280" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>Date</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Topic</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Venue</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Facilitator</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Registered</th>
                <th style={{ padding: "8px", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: "0.78rem" }}>
                    {u.scheduledDate}{u.scheduledStartTime ? ` · ${u.scheduledStartTime.slice(0, 5)}` : ""}
                  </td>
                  <td style={{ padding: "6px 8px", fontWeight: 600 }}>{u.topic}</td>
                  <td style={{ padding: "6px 8px", color: "#6b7280" }}>{u.venue ?? "—"}<br /><small style={{ color: "#9ca3af" }}>{u.district ?? ""}</small></td>
                  <td style={{ padding: "6px 8px", color: "#6b7280" }}>{u.facilitatorName ?? "—"}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>
                    {u.registeredCount}{u.capacity ? ` / ${u.capacity}` : ""}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <span className={`impact-status-pill impact-status-${u.status.replace("_", "-")}`}>{u.status.replace("_", " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  );
}
