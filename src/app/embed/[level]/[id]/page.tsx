import type { Metadata } from "next";
import { getPublicImpactAggregate } from "@/services/dataService";
import type { PublicImpactAggregate } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type RouteParams = { level: string; id: string };
type SearchParams = { period?: string; variant?: string };

type PageProps = {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
};

function normalizeLevel(raw: string): PublicImpactAggregate["scope"]["level"] | null {
  if (raw === "country" || raw === "region" || raw === "subregion" || raw === "district" || raw === "school") {
    return raw;
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { level, id } = await params;
  return {
    title: `Ozeki Read — ${decodeURIComponent(id)} scorecard`,
    robots: { index: false, follow: false },
    other: { "x-frame-options": "ALLOWALL" },
  };
}

function KpiTile({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="embed-kpi-tile">
      <span className="embed-kpi-label">{label}</span>
      <strong className="embed-kpi-value">{value}</strong>
      {helper ? <small className="embed-kpi-helper">{helper}</small> : null}
    </div>
  );
}

export default async function EmbedScorecardPage({ params, searchParams }: PageProps) {
  const { level: rawLevel, id: rawId } = await params;
  const { period = "FY", variant = "scorecard" } = await searchParams;
  const level = normalizeLevel(rawLevel);
  const id = decodeURIComponent(rawId);

  if (!level) {
    return (
      <main className="embed-root">
        <div className="embed-error">Invalid scope.</div>
      </main>
    );
  }

  let payload: PublicImpactAggregate | null = null;
  try {
    payload = await getPublicImpactAggregate(level, level === "country" ? "Uganda" : id, period);
  } catch (_e) {
    payload = null;
  }

  if (!payload) {
    return (
      <main className="embed-root">
        <div className="embed-error">Data temporarily unavailable for {id}.</div>
      </main>
    );
  }

  const k = payload.kpis;
  const teachersSupported = (k.teachersSupportedMale ?? 0) + (k.teachersSupportedFemale ?? 0);

  return (
    <main className="embed-root">
      <header className="embed-header">
        <h1>{payload.scope.name}</h1>
        <span className="embed-period">{payload.period.label}</span>
      </header>

      {variant === "scorecard" ? (
        <section className="embed-grid embed-grid-scorecard">
          <KpiTile label="Schools supported" value={k.schoolsSupported.toLocaleString()} />
          <KpiTile label="Learners assessed" value={k.learnersAssessedUnique.toLocaleString()} />
          <KpiTile label="Teachers supported" value={teachersSupported.toLocaleString()} helper={`${k.teachersSupportedFemale ?? 0}F / ${k.teachersSupportedMale ?? 0}M`} />
          <KpiTile label="Teachers trained" value={(k.teachersTrainedTotal ?? 0).toLocaleString()} />
          <KpiTile label="Coaching visits" value={k.coachingVisitsCompleted.toLocaleString()} />
          <KpiTile label="Assessment completion" value={`${k.assessmentCycleCompletionPct}%`} />
        </section>
      ) : null}

      {variant === "kpis" ? (
        <section className="embed-grid embed-grid-kpis">
          <KpiTile label="Schools supported" value={k.schoolsSupported.toLocaleString()} />
          <KpiTile label="Sub-counties reached" value={k.subCountiesReached.toLocaleString()} />
          <KpiTile label="Learners assessed" value={k.learnersAssessedUnique.toLocaleString()} />
          <KpiTile label="Learners directly impacted" value={k.learnersDirectlyImpacted.toLocaleString()} />
          <KpiTile label="Teachers supported" value={teachersSupported.toLocaleString()} />
          <KpiTile label="Teachers trained" value={(k.teachersTrainedTotal ?? 0).toLocaleString()} />
          <KpiTile label="School leaders trained" value={(k.schoolLeadersTrained ?? 0).toLocaleString()} />
          <KpiTile label="Training sessions" value={(k.trainingSessionsCount ?? 0).toLocaleString()} />
          <KpiTile label="Certificates issued" value={(k.certificatesIssued ?? 0).toLocaleString()} />
          <KpiTile label="Coaching visits" value={k.coachingVisitsCompleted.toLocaleString()} />
          <KpiTile label="Online sessions" value={k.onlineLiveSessionsCovered.toLocaleString()} />
          <KpiTile label="Recorded lesson views" value={(k.recordedLessonsViews ?? 0).toLocaleString()} />
          <KpiTile label="Assessment completion" value={`${k.assessmentCycleCompletionPct}%`} />
          <KpiTile label="Baseline n" value={k.assessmentsBaselineCount.toLocaleString()} />
          <KpiTile label="Endline n" value={k.assessmentsEndlineCount.toLocaleString()} />
          <KpiTile label="Books read" value={k.totalBooksRead.toLocaleString()} />
          <KpiTile label="Funds (USD)" value={payload.financials ? `$${payload.financials.totalUsdEquivalent.toLocaleString()}` : "—"} />
        </section>
      ) : null}

      {variant === "funnel" ? (
        <section className="embed-funnel">
          <div className="embed-funnel-step"><span>Trained</span><strong>{payload.funnel.trained}</strong></div>
          <div className="embed-funnel-arrow">→</div>
          <div className="embed-funnel-step"><span>Coached</span><strong>{payload.funnel.coached}</strong></div>
          <div className="embed-funnel-arrow">→</div>
          <div className="embed-funnel-step"><span>Baseline</span><strong>{payload.funnel.baselineAssessed}</strong></div>
          <div className="embed-funnel-arrow">→</div>
          <div className="embed-funnel-step"><span>Endline</span><strong>{payload.funnel.endlineAssessed}</strong></div>
          <div className="embed-funnel-arrow">→</div>
          <div className="embed-funnel-step"><span>Story active</span><strong>{payload.funnel.storyActive}</strong></div>
        </section>
      ) : null}

      <footer className="embed-footer">
        <small>
          Live data from Ozeki Reading Bridge Foundation · Updated{" "}
          {new Date(payload.meta.lastUpdated).toLocaleDateString("en-GB")}
        </small>
      </footer>
    </main>
  );
}
