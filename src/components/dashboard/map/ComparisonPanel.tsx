"use client";

import type { PublicImpactAggregate } from "@/lib/types";

type Props = {
  primary: PublicImpactAggregate | null;
  comparison: PublicImpactAggregate | null;
  comparisonLabel: string;
  loading: boolean;
};

type MetricRow = {
  label: string;
  primary: number | null;
  comparison: number | null;
  format?: "integer" | "decimal" | "percent" | "currency";
  isPpGain?: boolean;
};

function formatValue(v: number | null, fmt: MetricRow["format"]): string {
  if (v === null || v === undefined) return "—";
  if (fmt === "percent") return `${v}%`;
  if (fmt === "currency") return `$${v.toLocaleString()}`;
  if (fmt === "decimal") return v.toFixed(2);
  return v.toLocaleString();
}

function formatDelta(a: number | null, b: number | null, fmt: MetricRow["format"]): string {
  if (a === null || b === null) return "—";
  const d = a - b;
  const sign = d > 0 ? "+" : "";
  if (fmt === "percent") return `${sign}${d}pp`;
  if (fmt === "currency") return `${sign}$${d.toLocaleString()}`;
  if (fmt === "decimal") return `${sign}${d.toFixed(2)}`;
  return `${sign}${d.toLocaleString()}`;
}

function deltaClass(a: number | null, b: number | null): string {
  if (a === null || b === null) return "impact-delta-neutral";
  const d = a - b;
  if (d > 0) return "impact-delta-positive";
  if (d < 0) return "impact-delta-negative";
  return "impact-delta-neutral";
}

export function ComparisonPanel({ primary, comparison, comparisonLabel, loading }: Props) {
  if (!primary || !comparison) {
    return (
      <article className="card impact-comparison-panel">
        <h3>Side-by-side comparison</h3>
        <p className="text-gray-600">
          {loading ? "Loading comparison data..." : "Select a district or period to compare."}
        </p>
      </article>
    );
  }

  const rows: MetricRow[] = [
    { label: "Schools supported", primary: primary.kpis.schoolsSupported, comparison: comparison.kpis.schoolsSupported },
    { label: "Learners assessed (unique)", primary: primary.kpis.learnersAssessedUnique, comparison: comparison.kpis.learnersAssessedUnique },
    {
      label: "Teachers supported",
      primary: (primary.kpis.teachersSupportedMale ?? 0) + (primary.kpis.teachersSupportedFemale ?? 0),
      comparison: (comparison.kpis.teachersSupportedMale ?? 0) + (comparison.kpis.teachersSupportedFemale ?? 0),
    },
    { label: "Teachers trained", primary: primary.kpis.teachersTrainedTotal, comparison: comparison.kpis.teachersTrainedTotal },
    { label: "School leaders trained", primary: primary.kpis.schoolLeadersTrained, comparison: comparison.kpis.schoolLeadersTrained },
    { label: "Coaching visits completed", primary: primary.kpis.coachingVisitsCompleted, comparison: comparison.kpis.coachingVisitsCompleted },
    { label: "Training sessions", primary: primary.kpis.trainingSessionsCount, comparison: comparison.kpis.trainingSessionsCount },
    { label: "Certificates issued", primary: primary.kpis.certificatesIssued, comparison: comparison.kpis.certificatesIssued },
    { label: "Assessment completion %", primary: primary.kpis.assessmentCycleCompletionPct, comparison: comparison.kpis.assessmentCycleCompletionPct, format: "percent" },
    { label: "Recorded lesson views", primary: primary.kpis.recordedLessonsViews ?? 0, comparison: comparison.kpis.recordedLessonsViews ?? 0 },
    { label: "Funds received (USD)", primary: primary.financials?.totalUsdEquivalent ?? null, comparison: comparison.financials?.totalUsdEquivalent ?? null, format: "currency" },
    { label: "Cohort composite delta", primary: primary.cohortProgression?.compositeDelta ?? null, comparison: comparison.cohortProgression?.compositeDelta ?? null, format: "decimal" },
    { label: "Training → outcome lift", primary: primary.trainingOutcomeCorrelation?.lift ?? null, comparison: comparison.trainingOutcomeCorrelation?.lift ?? null, format: "decimal" },
  ];

  return (
    <article className="card impact-comparison-panel">
      <header className="impact-comparison-header">
        <h3>Side-by-side comparison</h3>
        <div className="impact-comparison-legend">
          <span className="impact-comparison-primary">
            <strong>{primary.scope.name}</strong>
            <small>{primary.period.label}</small>
          </span>
          <span className="impact-comparison-vs">vs</span>
          <span className="impact-comparison-secondary">
            <strong>{comparison.scope.name}</strong>
            <small>{comparisonLabel}</small>
          </span>
        </div>
      </header>
      <div className="impact-comparison-table">
        <div className="impact-comparison-row impact-comparison-row-head">
          <span>Metric</span>
          <span>{primary.scope.name}</span>
          <span>{comparison.scope.name}</span>
          <span>Δ</span>
        </div>
        {rows.map((row) => (
          <div className="impact-comparison-row" key={row.label}>
            <span className="impact-comparison-label">{row.label}</span>
            <span className="impact-comparison-cell impact-comparison-cell-primary">
              {formatValue(row.primary, row.format)}
            </span>
            <span className="impact-comparison-cell">
              {formatValue(row.comparison, row.format)}
            </span>
            <span className={`impact-comparison-cell ${deltaClass(row.primary, row.comparison)}`}>
              {formatDelta(row.primary, row.comparison, row.format)}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
