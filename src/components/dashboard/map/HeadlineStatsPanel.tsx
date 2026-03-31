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
  const storyTimelinePoints = data?.teachingLearningAlignment?.points ?? [];
  const storySessionsTotal = storyTimelinePoints.reduce(
    (sum, point) => sum + Number(point.storySessionsCount ?? 0),
    0,
  );
  const storiesPublishedTotal = storyTimelinePoints.reduce(
    (sum, point) => sum + Number(point.storyPublishedCount ?? 0),
    0,
  );
  const storyActiveSchools = data?.funnel?.storyActive ?? 0;
  const storyCoverage =
    (kpis?.schoolsSupported ?? 0) > 0
      ? `${((storyActiveSchools / Math.max(kpis?.schoolsSupported ?? 1, 1)) * 100).toFixed(1)}% coverage`
      : "0.0% coverage";

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

      {(storyActiveSchools > 0 || storySessionsTotal > 0 || storiesPublishedTotal > 0) && (
        <div className="headline-stats-subsection">
          <h4>1001 Story Statistics</h4>
          <div className="headline-stats-grid">
            <MetricCard
              label="Story-active schools"
              value={storyActiveSchools.toLocaleString()}
              helper={storyCoverage}
              loading={loading}
            />
            <MetricCard
              label="Story sessions logged"
              value={storySessionsTotal.toLocaleString()}
              loading={loading}
            />
            <MetricCard
              label="Stories published"
              value={storiesPublishedTotal.toLocaleString()}
              loading={loading}
            />
          </div>
        </div>
      )}

      {((kpis?.onlineLiveSessionsCovered ?? 0) > 0 || (kpis?.onlineTeachersSupported ?? 0) > 0) && (
        <div className="headline-stats-subsection">
          <h4>Online Training</h4>
          <div className="headline-stats-grid">
            <MetricCard
              label="Online sessions held"
              value={(kpis?.onlineLiveSessionsCovered ?? 0).toLocaleString()}
              helper="Live & completed virtual sessions"
              loading={loading}
            />
            <MetricCard
              label="Online participants"
              value={(kpis?.onlineTeachersSupported ?? 0).toLocaleString()}
              helper="Teachers trained online"
              loading={loading}
            />
            <MetricCard
              label="Schools reached online"
              value={(kpis?.onlineSchoolsReachedCount ?? 0).toLocaleString()}
              helper="Unique schools with online participants"
              loading={loading}
            />
          </div>
        </div>
      )}

      <div className="headline-stats-actions">
        <Link className="button" href={detailHref}>
          View Detailed Analysis
        </Link>
      </div>
    </aside>
  );
}
