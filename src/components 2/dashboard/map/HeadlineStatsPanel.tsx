"use client";

import Link from "next/link";
import type { PublicImpactAggregate } from "@/lib/types";

type HeadlineStatsPanelProps = {
  data: PublicImpactAggregate | null;
  loading: boolean;
  detailHref: string;
  compact?: boolean;
};

function MetricCard({
  label,
  value,
  helper,
  loading,
}: {
  label: string;
  value: string;
  helper?: string;
  loading: boolean;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{loading ? "Loading..." : value}</strong>
      {helper ? <span>{helper}</span> : null}
    </article>
  );
}

export function HeadlineStatsPanel({
  data,
  loading,
  detailHref,
  compact = false,
}: HeadlineStatsPanelProps) {
  const kpis = data?.kpis;

  return (
    <aside className={`headline-stats-panel ${compact ? "headline-stats-panel--compact" : ""}`}>
      <header>
        <h3>Headline Stats</h3>
        <p>Updated instantly from published aggregate submissions.</p>
      </header>

      <div className="headline-stats-grid">
        <MetricCard
          label="Schools supported"
          value={(kpis?.schoolsSupported ?? 0).toLocaleString()}
          loading={loading}
        />
        <MetricCard
          label="Reading teachers supported"
          value={`${(kpis?.teachersSupportedMale ?? 0).toLocaleString()} M / ${(kpis?.teachersSupportedFemale ?? 0).toLocaleString()} F`}
          loading={loading}
        />
        <MetricCard
          label="Enrollment (estimated reach)"
          value={(kpis?.enrollmentEstimatedReach ?? 0).toLocaleString()}
          loading={loading}
        />
        <MetricCard
          label="Learners assessed (direct)"
          value={(kpis?.learnersAssessedUnique ?? 0).toLocaleString()}
          helper="Unique learners (n)"
          loading={loading}
        />
        <MetricCard
          label="Coaching visits"
          value={(kpis?.coachingVisitsCompleted ?? 0).toLocaleString()}
          loading={loading}
        />
        <MetricCard
          label="Assessments (B / P / E)"
          value={`${(kpis?.assessmentsBaselineCount ?? 0).toLocaleString()} / ${(kpis?.assessmentsProgressCount ?? 0).toLocaleString()} / ${(kpis?.assessmentsEndlineCount ?? 0).toLocaleString()}`}
          loading={loading}
        />
      </div>

      <div className="headline-stats-actions">
        <Link className="button" href={detailHref}>
          View Detailed Analysis
        </Link>
      </div>
    </aside>
  );
}
