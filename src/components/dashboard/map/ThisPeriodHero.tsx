"use client";

import { useEffect, useState } from "react";
import type { PublicImpactAggregate } from "@/lib/types";

type PreviousPeriodMini = {
  schoolsSupported: number;
  learnersAssessedUnique: number;
  coachingVisitsCompleted: number;
  trainingSessionsCount: number;
};

type Props = {
  payload: PublicImpactAggregate | null;
  previousPayload?: PublicImpactAggregate | null;
};

function formatDelta(current: number, previous: number): { label: string; direction: "up" | "down" | "flat" } {
  const delta = current - previous;
  if (delta === 0) return { label: "no change", direction: "flat" };
  const sign = delta > 0 ? "+" : "";
  return { label: `${sign}${delta.toLocaleString()}`, direction: delta > 0 ? "up" : "down" };
}

function generateNarrative(p: PublicImpactAggregate, prev: PreviousPeriodMini | null): string[] {
  const bullets: string[] = [];
  const k = p.kpis;
  if (prev) {
    const learnerDelta = k.learnersAssessedUnique - prev.learnersAssessedUnique;
    if (learnerDelta > 0) {
      bullets.push(`<strong>${learnerDelta.toLocaleString()}</strong> additional learners assessed vs the previous period.`);
    } else if (learnerDelta < 0) {
      bullets.push(`Assessments this period are <strong>${Math.abs(learnerDelta).toLocaleString()} below</strong> the previous period — check data-entry pipeline.`);
    }

    const coachDelta = k.coachingVisitsCompleted - prev.coachingVisitsCompleted;
    if (coachDelta !== 0) {
      bullets.push(`Coaching visits: <strong>${coachDelta > 0 ? "+" : ""}${coachDelta}</strong> vs previous period.`);
    }

    const trainDelta = k.trainingSessionsCount - prev.trainingSessionsCount;
    if (trainDelta !== 0) {
      bullets.push(`Training sessions: <strong>${trainDelta > 0 ? "+" : ""}${trainDelta}</strong> delivered.`);
    }
  } else {
    bullets.push(`<strong>${k.schoolsSupported.toLocaleString()}</strong> schools currently in the programme.`);
    bullets.push(`<strong>${k.learnersAssessedUnique.toLocaleString()}</strong> unique learners assessed in ${p.period.label}.`);
  }

  if (p.trainingOutcomeCorrelation?.lift !== null && p.trainingOutcomeCorrelation?.lift !== undefined) {
    const lift = p.trainingOutcomeCorrelation.lift;
    if (lift > 0) {
      bullets.push(`Trained schools show a <strong>+${lift.toFixed(2)} point</strong> reading composite lift over untrained peers.`);
    }
  }

  if (p.cohortProgression?.compositeDelta !== null && p.cohortProgression?.compositeDelta !== undefined) {
    const d = p.cohortProgression.compositeDelta;
    if (d !== 0) {
      bullets.push(`Matched cohort of <strong>${p.cohortProgression.matchedLearners}</strong> learners changed by <strong>${d > 0 ? "+" : ""}${d.toFixed(2)}</strong> points from baseline to endline.`);
    }
  }

  const atRiskCount = p.rankings.atRisk?.length ?? 0;
  if (atRiskCount > 0) {
    bullets.push(`<strong>${atRiskCount}</strong> school${atRiskCount === 1 ? "" : "s"} flagged as needing priority support.`);
  }

  if (bullets.length === 0) {
    bullets.push(`Programme data for ${p.scope.name} in ${p.period.label} is live.`);
  }
  return bullets;
}

export function ThisPeriodHero({ payload, previousPayload }: Props) {
  const [prevMini, setPrevMini] = useState<PreviousPeriodMini | null>(null);

  useEffect(() => {
    if (previousPayload) {
      setPrevMini({
        schoolsSupported: previousPayload.kpis.schoolsSupported,
        learnersAssessedUnique: previousPayload.kpis.learnersAssessedUnique,
        coachingVisitsCompleted: previousPayload.kpis.coachingVisitsCompleted,
        trainingSessionsCount: previousPayload.kpis.trainingSessionsCount,
      });
    }
  }, [previousPayload]);

  if (!payload) return null;

  const narrative = generateNarrative(payload, prevMini);
  const k = payload.kpis;

  const trendTiles = prevMini ? [
    { label: "Schools", current: k.schoolsSupported, previous: prevMini.schoolsSupported },
    { label: "Learners", current: k.learnersAssessedUnique, previous: prevMini.learnersAssessedUnique },
    { label: "Coaching visits", current: k.coachingVisitsCompleted, previous: prevMini.coachingVisitsCompleted },
    { label: "Trainings", current: k.trainingSessionsCount, previous: prevMini.trainingSessionsCount },
  ] : [];

  return (
    <article className="impact-hero-card card">
      <header className="impact-hero-header">
        <div>
          <small className="impact-hero-eyebrow">This period in {payload.scope.name}</small>
          <h2>{payload.period.label}</h2>
        </div>
      </header>
      <ul className="impact-hero-narrative">
        {narrative.map((b, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
        ))}
      </ul>
      {trendTiles.length > 0 ? (
        <div className="impact-hero-trends">
          {trendTiles.map((t) => {
            const d = formatDelta(t.current, t.previous);
            return (
              <div key={t.label} className={`impact-hero-trend impact-hero-trend-${d.direction}`}>
                <small>{t.label}</small>
                <strong>{t.current.toLocaleString()}</strong>
                <span>{d.direction === "up" ? "▲" : d.direction === "down" ? "▼" : "→"} {d.label}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
