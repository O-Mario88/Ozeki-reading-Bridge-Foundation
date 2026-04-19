"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RadarEntry = {
  schoolId: number;
  schoolName: string;
  district: string;
  region: string;
  healthScore: number | null;
  priorityScore: number;
  reasons: string[];
};

type Projection = {
  currentValue: number;
  projectedValue6mo: number | null;
  projectedValue12mo: number | null;
  confidenceBand: "high" | "medium" | "low" | "insufficient";
  trend: "improving" | "declining" | "stable";
  projectionNote: string;
  periodsObserved: number;
};

export function AtRiskRadar() {
  const [radar, setRadar] = useState<RadarEntry[]>([]);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/impact/at-risk-radar?limit=5")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!active || !json) return;
        setRadar(json.radar ?? []);
        setProjection(json.projection ?? null);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return null;
  if (radar.length === 0 && !projection) return null;

  return (
    <section className="at-risk-radar card">
      <header className="at-risk-header">
        <h3>🎯 At-Risk Radar & 12-Month Projection</h3>
        <small>Auto-generated from materialised KPI snapshots — refreshed by triggers.</small>
      </header>

      {projection && (
        <div className={`projection-card projection-${projection.trend}`}>
          <div>
            <small>National reading composite</small>
            <strong>
              {projection.currentValue.toFixed(2)}
              {projection.projectedValue12mo !== null && (
                <span className="projection-arrow">
                  → {projection.projectedValue12mo.toFixed(2)}
                  <em> in 12 months</em>
                </span>
              )}
            </strong>
          </div>
          <div className="projection-meta">
            <span className={`projection-confidence confidence-${projection.confidenceBand}`}>
              {projection.confidenceBand} confidence
            </span>
            <p>{projection.projectionNote}</p>
          </div>
        </div>
      )}

      {radar.length > 0 && (
        <div className="radar-list">
          <header><h4>Top {radar.length} schools needing priority support this week</h4></header>
          <ul>
            {radar.map((e, i) => (
              <li key={e.schoolId} className="radar-item">
                <div className="radar-rank">#{i + 1}</div>
                <div className="radar-body">
                  <Link href={`/schools/${e.schoolId}`}>
                    <strong>{e.schoolName}</strong>
                  </Link>
                  <small>{e.district}{e.region ? ` · ${e.region}` : ""} · Health {e.healthScore ?? "—"}/100</small>
                  <ul className="radar-reasons">
                    {e.reasons.slice(0, 3).map((r, j) => <li key={j}>{r}</li>)}
                  </ul>
                </div>
                <div className="radar-score">
                  <strong>{e.priorityScore}</strong>
                  <small>priority</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
