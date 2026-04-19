import type { PublicImpactAggregate } from "@/lib/types";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(section: string, label: string, value: unknown): string {
  return [csvEscape(section), csvEscape(label), csvEscape(value)].join(",");
}

export function aggregateToCsv(payload: PublicImpactAggregate): string {
  const lines: string[] = ["Section,Metric,Value"];
  lines.push(row("Scope", "Level", payload.scope.level));
  lines.push(row("Scope", "Name", payload.scope.name));
  lines.push(row("Scope", "Period", payload.period.label));

  const k = payload.kpis;
  for (const [key, val] of Object.entries(k)) {
    lines.push(row("KPI", key, val));
  }

  for (const [domain, agg] of Object.entries(payload.outcomes)) {
    lines.push(row("Outcome", `${domain} — baseline`, agg.baseline));
    lines.push(row("Outcome", `${domain} — latest`, agg.latest));
    lines.push(row("Outcome", `${domain} — endline`, agg.endline));
    lines.push(row("Outcome", `${domain} — n`, agg.n));
  }

  lines.push(row("Funnel", "Trained", payload.funnel.trained));
  lines.push(row("Funnel", "Coached", payload.funnel.coached));
  lines.push(row("Funnel", "Baseline assessed", payload.funnel.baselineAssessed));
  lines.push(row("Funnel", "Endline assessed", payload.funnel.endlineAssessed));
  lines.push(row("Funnel", "Story active", payload.funnel.storyActive));

  if (payload.financials) {
    lines.push(row("Finance", "Total UGX received", payload.financials.totalUgxReceived));
    lines.push(row("Finance", "Total USD equivalent", payload.financials.totalUsdEquivalent));
  }

  if (payload.cohortProgression) {
    lines.push(row("Cohort", "Matched learners", payload.cohortProgression.matchedLearners));
    lines.push(row("Cohort", "Baseline composite", payload.cohortProgression.avgBaselineComposite));
    lines.push(row("Cohort", "Endline composite", payload.cohortProgression.avgEndlineComposite));
    lines.push(row("Cohort", "Composite delta", payload.cohortProgression.compositeDelta));
  }

  if (payload.trainingOutcomeCorrelation) {
    const t = payload.trainingOutcomeCorrelation;
    lines.push(row("Training Lift", "Trained schools n", t.trainedSchools.count));
    lines.push(row("Training Lift", "Trained avg delta", t.trainedSchools.avgScoreDelta));
    lines.push(row("Training Lift", "Untrained schools n", t.untrainedSchools.count));
    lines.push(row("Training Lift", "Untrained avg delta", t.untrainedSchools.avgScoreDelta));
    lines.push(row("Training Lift", "Lift", t.lift));
  }

  if (payload.rankings.atRisk) {
    for (const s of payload.rankings.atRisk) {
      lines.push(row("At-Risk School", s.name, `${s.riskScore} — ${s.riskFactors.join("; ")}`));
    }
  }

  return lines.join("\n");
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportScopeFilename(payload: PublicImpactAggregate, ext: string): string {
  const safeName = payload.scope.name.replace(/[^a-z0-9]+/gi, "_");
  const date = new Date().toISOString().slice(0, 10);
  return `OzekiRead_${payload.scope.level}_${safeName}_${date}.${ext}`;
}
