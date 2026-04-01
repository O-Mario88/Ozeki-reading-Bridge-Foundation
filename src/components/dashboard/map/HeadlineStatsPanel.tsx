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
    <div className={`impact-horizontal-metrics-tray ${compact ? "impact-horizontal-metrics-tray--compact" : ""}`}>
      <MetricCard
        label="Schools supported"
        value={(kpis?.schoolsSupported ?? 0).toLocaleString()}
        loading={loading}
      />
      <MetricCard
        label="Reading teachers"
        value={`${(kpis?.teachersSupportedMale ?? 0).toLocaleString()} M / ${(kpis?.teachersSupportedFemale ?? 0).toLocaleString()} F`}
        loading={loading}
      />
      <MetricCard
        label="Est. learners reached"
        value={(kpis?.enrollmentEstimatedReach ?? 0).toLocaleString()}
        loading={loading}
      />
      <MetricCard
        label="Learners assessed"
        value={(kpis?.learnersAssessedUnique ?? 0).toLocaleString()}
        helper="Unique direct"
        loading={loading}
      />
      <MetricCard
        label="Coaching visits"
        value={(kpis?.coachingVisitsCompleted ?? 0).toLocaleString()}
        loading={loading}
      />
      <MetricCard
        label="Assessments (B/P/E)"
        value={`${(kpis?.assessmentsBaselineCount ?? 0).toLocaleString()} / ${(kpis?.assessmentsProgressCount ?? 0).toLocaleString()} / ${(kpis?.assessmentsEndlineCount ?? 0).toLocaleString()}`}
        loading={loading}
      />

      {(storyActiveSchools > 0 || storySessionsTotal > 0 || storiesPublishedTotal > 0) && (
        <>
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
        </>
      )}

      {((kpis?.onlineLiveSessionsCovered ?? 0) > 0 || (kpis?.onlineTeachersSupported ?? 0) > 0) && (
        <>
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
        </>
      )}

      <article className="stat-card-action">
        <span>Explore details</span>
        <Link className="button button-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} href={detailHref}>
          View Deep Dive →
        </Link>
      </article>
    </div>
  );
}
