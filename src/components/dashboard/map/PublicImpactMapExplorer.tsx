"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PublicImpactAggregate } from "@/lib/types";
import { UgandaImpactMapPro } from "./UgandaImpactMapPro";
import { HeadlineStatsPanel } from "./HeadlineStatsPanel";
import { LocationNavigator, PublicMapSelection } from "./LocationNavigator";
import {
  READING_LEVELS,
  getReadingLevelColor,
  readingLevelFromAverage,
  readingLevelOrdinal,
} from "@/lib/reading-assessment-utils";
import { LEARNING_DOMAIN_DICTIONARY } from "@/lib/domain-dictionary";

type PublicImpactMapExplorerProps = {
  compact?: boolean;
  syncUrl?: boolean;
  initialPeriod?: string;
  initialSelection?: Partial<PublicMapSelection>;
};

type ScopeLevel = "country" | "region" | "subregion" | "district" | "school";

function defaultSelection(initial?: Partial<PublicMapSelection>): PublicMapSelection {
  return {
    region: initial?.region ?? "",
    subRegion: initial?.subRegion ?? "",
    district: initial?.district ?? "",
    school: initial?.school ?? "",
  };
}

function resolveScope(selection: PublicMapSelection): { level: ScopeLevel; id: string } {
  if (selection.school) {
    return { level: "school", id: selection.school };
  }
  if (selection.district) {
    return { level: "district", id: selection.district };
  }
  if (selection.subRegion) {
    return { level: "subregion", id: selection.subRegion };
  }
  if (selection.region) {
    return { level: "region", id: selection.region };
  }
  return { level: "country", id: "Uganda" };
}

function scopeEndpoint(level: ScopeLevel, id: string, period: string) {
  const encodedPeriod = encodeURIComponent(period);
  if (level === "country") {
    return `/impact/country?period=${encodedPeriod}`;
  }
  if (level === "region") {
    return `/impact/region/${encodeURIComponent(id)}?period=${encodedPeriod}`;
  }
  if (level === "subregion") {
    return `/impact/subregion/${encodeURIComponent(id)}?period=${encodedPeriod}`;
  }
  if (level === "district") {
    return `/impact/district/${encodeURIComponent(id)}?period=${encodedPeriod}`;
  }
  return `/impact/school/${encodeURIComponent(id)}?period=${encodedPeriod}`;
}

function mapScopeToDetailHref(level: ScopeLevel, id: string) {
  if (level === "school") {
    return `/schools/${encodeURIComponent(id)}`;
  }
  if (level === "district") {
    return `/districts/${encodeURIComponent(id)}`;
  }
  if (level === "region") {
    return `/regions/${encodeURIComponent(id)}`;
  }
  if (level === "subregion") {
    return `/sub-regions/${encodeURIComponent(id)}`;
  }
  return "/impact";
}

function DomainOutcomeCard({
  title,
  description,
  domain,
}: {
  title: string;
  description: string;
  domain: PublicImpactAggregate["outcomes"]["letterSounds"];
}) {
  const baseline = domain.baseline ?? 0;
  const latest = domain.latest ?? domain.endline ?? 0;
  const change = latest - baseline;
  return (
    <article className="impact-domain-mini-card">
      <h4>
        {title}{" "}
        <span title={description} aria-label={description} style={{ cursor: "help" }}>
          (i)
        </span>
      </h4>
      <p>
        <strong>{domain.latest ?? domain.endline ?? "Data not available"}</strong>
      </p>
      <p className="impact-domain-mini-meta">
        Baseline: {domain.baseline ?? "Data not available"} | Change:{" "}
        {typeof domain.latest === "number" && typeof domain.baseline === "number"
          ? `${change > 0 ? "+" : ""}${change.toFixed(1)}`
          : "Data not available"}
      </p>
      <p className="impact-domain-mini-meta">n = {domain.n.toLocaleString()}</p>
    </article>
  );
}

const OUTCOME_DOMAIN_CONFIG: Array<{
  key: keyof PublicImpactAggregate["outcomes"];
  domainKey: keyof typeof LEARNING_DOMAIN_DICTIONARY;
}> = [
  { key: "letterNames", domainKey: "letter_names" },
  { key: "letterSounds", domainKey: "letter_sounds" },
  { key: "realWords", domainKey: "real_words" },
  { key: "madeUpWords", domainKey: "made_up_words" },
  { key: "storyReading", domainKey: "story_reading" },
  { key: "comprehension", domainKey: "comprehension" },
];

function normalizeDomainScoreForReadingLevel(value: number) {
  return value > 10 ? value / 10 : value;
}

function formatCompositeScore(value: number | null) {
  if (value === null) {
    return "Data not available";
  }
  return `${value.toFixed(1)}/10`;
}

function deriveReadingLevelsFromOutcomes(outcomes?: PublicImpactAggregate["outcomes"] | null) {
  if (!outcomes) {
    return null;
  }

  const domainRows = OUTCOME_DOMAIN_CONFIG.map((item) => {
    const maybeDomain = outcomes[item.key];
    const domain =
      maybeDomain && typeof maybeDomain === "object"
        ? maybeDomain
        : {
            baseline: null,
            latest: null,
            endline: null,
          };
    return {
      label: LEARNING_DOMAIN_DICTIONARY[item.domainKey].label_short,
      baseline: domain.baseline,
      latest: domain.latest ?? domain.endline,
    };
  });

  const baselineValues = domainRows
    .map((row) => row.baseline)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .map(normalizeDomainScoreForReadingLevel);
  const latestValues = domainRows
    .map((row) => row.latest)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .map(normalizeDomainScoreForReadingLevel);

  const baselineAverage =
    baselineValues.length > 0
      ? baselineValues.reduce((sum, value) => sum + value, 0) / baselineValues.length
      : null;
  const latestAverage =
    latestValues.length > 0
      ? latestValues.reduce((sum, value) => sum + value, 0) / latestValues.length
      : null;

  const baselineLevel = baselineAverage !== null ? readingLevelFromAverage(baselineAverage) : null;
  const latestLevel = latestAverage !== null ? readingLevelFromAverage(latestAverage) : null;

  let movementLabel = "Data not available";
  if (baselineLevel && latestLevel) {
    const movement = readingLevelOrdinal(latestLevel) - readingLevelOrdinal(baselineLevel);
    if (movement > 0) {
      movementLabel = `Moved up by ${movement} level${movement > 1 ? "s" : ""}`;
    } else if (movement < 0) {
      movementLabel = `Moved down by ${Math.abs(movement)} level${Math.abs(movement) > 1 ? "s" : ""}`;
    } else {
      movementLabel = "Stayed in the same level";
    }
  }

  return {
    domainRows,
    baselineAverage,
    latestAverage,
    baselineLevel,
    latestLevel,
    movementLabel,
  };
}

function readingLevelColor(label: string, index: number) {
  if ((READING_LEVELS as string[]).includes(label)) {
    return getReadingLevelColor(label as (typeof READING_LEVELS)[number]);
  }
  const fallback = ["#c0392b", "#e67e22", "#f1c40f", "#D96A0F", "#1f5fbf", "#6b7280"];
  return fallback[index % fallback.length];
}

export function PublicImpactMapExplorer({
  compact = false,
  syncUrl = false,
  initialPeriod = "FY",
  initialSelection,
}: PublicImpactMapExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [period, setPeriod] = useState(initialPeriod);
  const [selection, setSelection] = useState<PublicMapSelection>(
    defaultSelection(initialSelection),
  );
  const [selectionHistory, setSelectionHistory] = useState<PublicMapSelection[]>([]);
  const [payload, setPayload] = useState<PublicImpactAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"outcomes" | "readingLevels" | "implementation" | "teaching" | "equity" | "quality">("outcomes");

  const scope = useMemo(() => resolveScope(selection), [selection]);

  useEffect(() => {
    let active = true;
    async function fetchAggregate() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(scopeEndpoint(scope.level, scope.id, period), {
          cache: "force-cache",
        });
        if (!response.ok) {
          throw new Error("stats-unavailable");
        }
        const json = (await response.json()) as PublicImpactAggregate;
        if (active) {
          setPayload(json);
        }
      } catch {
        if (active) {
          setError("Stats temporarily unavailable");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchAggregate();
    return () => {
      active = false;
    };
  }, [period, scope.id, scope.level]);

  useEffect(() => {
    if (!syncUrl) {
      return;
    }
    const query = new URLSearchParams();
    query.set("period", period);
    if (selection.region) query.set("region", selection.region);
    if (selection.subRegion) query.set("subRegion", selection.subRegion);
    if (selection.district) query.set("district", selection.district);
    if (selection.school) query.set("school", selection.school);
    router.replace(`${pathname}?${query.toString()}`);
  }, [pathname, period, router, selection, syncUrl]);

  const onSelectionChange = (next: PublicMapSelection) => {
    setSelectionHistory((previous) => [...previous.slice(-8), selection]);
    setSelection(next);
  };

  const onBack = () => {
    if (selectionHistory.length > 0) {
      const previous = selectionHistory[selectionHistory.length - 1];
      setSelectionHistory((current) => current.slice(0, -1));
      setSelection(previous);
      return;
    }
    if (selection.school) {
      setSelection({ ...selection, school: "" });
      return;
    }
    if (selection.district) {
      setSelection({ ...selection, district: "", school: "" });
      return;
    }
    if (selection.subRegion) {
      setSelection({ ...selection, subRegion: "", district: "", school: "" });
      return;
    }
    if (selection.region) {
      setSelection({ region: "", subRegion: "", district: "", school: "" });
    }
  };

  const onReset = () => {
    setSelectionHistory([]);
    setSelection({ region: "", subRegion: "", district: "", school: "" });
  };

  const breadcrumb = [
    "Uganda",
    selection.region || null,
    selection.subRegion || null,
    selection.district || null,
    selection.school
      ? payload?.navigator?.schools.find((school) => String(school.id) === selection.school)?.name ?? null
      : null,
  ].filter((value): value is string => Boolean(value));

  const detailHref = mapScopeToDetailHref(scope.level, scope.id);
  const schoolOptions = payload?.navigator?.schools ?? [];
  const derivedReadingLevels = useMemo(
    () => deriveReadingLevelsFromOutcomes(payload?.outcomes),
    [payload?.outcomes],
  );
  const readingLevelsBaselineCycle =
    payload?.readingLevels?.distribution.find((item) => item.cycle === "baseline") ?? null;
  const readingLevelsLatestCycle =
    payload?.readingLevels?.distribution.find((item) => item.cycle === "endline") ??
    payload?.readingLevels?.distribution.find((item) => item.cycle === "latest") ??
    null;
  const readingLevelLabels =
    payload?.readingLevels?.levels?.map((item) => item.label) ??
    READING_LEVELS;
  const teachingQuality = payload?.teachingQuality;
  const teachingLearningAlignment = payload?.teachingLearningAlignment;
  const teachingLearningAlignmentPoints = teachingLearningAlignment?.points ?? [];
  const fidelityDrivers = payload?.fidelity?.drivers ?? [];
  const mostImprovedRankings = payload?.rankings?.mostImproved ?? [];
  const prioritySupportRankings = payload?.rankings?.prioritySupport ?? [];

  return (
    <section className={`impact-explorer ${compact ? "impact-explorer--compact" : ""}`}>
      {compact ? (
        <header className="impact-explorer-header">
          <div>
            <h2>Live Literacy Impact Dashboard</h2>
            <p>Aggregated, privacy-protected classroom data. Updated regularly.</p>
          </div>
          <div className="action-row">
            <Link className="button" href="/impact">
              Explore Full Dashboard
            </Link>
            <Link className="button button-ghost" href="/reports/fy-latest">
              Download FY Report
            </Link>
          </div>
        </header>
      ) : null}

      <div className="impact-explorer-breadcrumbs">
        <div className="flex items-center gap-2">
          <p>{breadcrumb.join(" > ")}</p>
          {payload?.meta?.dataCompleteness === "Complete" ? (
            <span className="badge badge-success" title="All schools in this scope have submitted reports for this period">
              ✓ Data Complete
            </span>
          ) : (
            <span className="badge badge-warning" title="Some schools in this scope haven't submitted report yet">
              ⚠ Partial Data ({payload?.meta?.sampleSize} reports)
            </span>
          )}
        </div>
        <button type="button" className="impact-map-clear-link" onClick={onReset}>
          Clear
        </button>
      </div>

      <div className="impact-explorer-layout">
        <LocationNavigator
          period={period}
          onPeriodChange={setPeriod}
          selection={selection}
          schoolOptions={schoolOptions.map((school) => ({ id: school.id, name: school.name }))}
          onSelectionChange={onSelectionChange}
          onReset={onReset}
          onBack={onBack}
        />

        <div className="impact-map-column">
          <UgandaImpactMapPro
            periodLabel={period}
            selection={{
              region: selection.region,
              subRegion: selection.subRegion,
              district: selection.district,
            }}
            onSelectionChange={(next) =>
              onSelectionChange({
                region: next.region,
                subRegion: next.subRegion,
                district: next.district,
                school: "",
              })
            }
            compact={compact}
          />
        </div>

        <HeadlineStatsPanel
          data={payload}
          loading={loading}
          detailHref={detailHref}
          compact={compact}
        />
      </div>

      {error ? (
        <article className="card impact-error-card">
          <h3>Stats temporarily unavailable</h3>
          <p>Please try again. You can still explore using filters.</p>
        </article>
      ) : null}

      {payload && payload.kpis.schoolsSupported === 0 ? (
        <article className="card impact-empty-card">
          <h3>No published data yet</h3>
          <p>
            We don&apos;t have reported activity for {payload.scope.name} in {payload.period.label}. Try
            another district or check back later.
          </p>
        </article>
      ) : null}

      <div className="impact-tabs">
        <button
          className={activeTab === "outcomes" ? "active" : ""}
          onClick={() => setActiveTab("outcomes")}
        >
          Learning Outcomes
        </button>
        <button
          className={activeTab === "readingLevels" ? "active" : ""}
          onClick={() => setActiveTab("readingLevels")}
        >
          Reading Levels
        </button>
        <button
          className={activeTab === "implementation" ? "active" : ""}
          onClick={() => setActiveTab("implementation")}
        >
          Implementation Funnel
        </button>
        <button
          className={activeTab === "teaching" ? "active" : ""}
          onClick={() => setActiveTab("teaching")}
        >
          Teaching Quality
        </button>
        <button
          className={activeTab === "equity" ? "active" : ""}
          onClick={() => setActiveTab("equity")}
        >
          Equity & Segments
        </button>
        <button
          className={activeTab === "quality" ? "active" : ""}
          onClick={() => setActiveTab("quality")}
        >
          Data Completeness
        </button>
      </div>

      <div className="impact-tab-content">
        {activeTab === "outcomes" && (
          <article className="card">
            <h3>Learning Outcomes by Domain</h3>
            <div className="impact-domain-mini-grid">
              {OUTCOME_DOMAIN_CONFIG.map((item) => {
                const descriptor = LEARNING_DOMAIN_DICTIONARY[item.domainKey];
                const domain = payload?.outcomes?.[item.key] ?? {
                  baseline: null,
                  latest: null,
                  endline: null,
                  benchmarkPct: null,
                  n: 0,
                };
                return (
                  <DomainOutcomeCard
                    key={item.key}
                    title={descriptor.label_short}
                    description={descriptor.description}
                    domain={domain}
                  />
                );
              })}
            </div>
            <p className="impact-mini-footer">
              Scores reflect average learner performance. Benchmark: 60%.
            </p>
          </article>
        )}

        {activeTab === "readingLevels" && (
          <article className="card">
            <h3>Reading Levels (Calculated from Domain Outcomes)</h3>
            {loading ? (
              <p>Loading reading levels...</p>
            ) : derivedReadingLevels ? (
              <div className="impact-reading-level-panel">
                <div className="impact-reading-level-summary-grid">
                  <article>
                    <span>Baseline level</span>
                    <strong>{derivedReadingLevels.baselineLevel ?? "Data not available"}</strong>
                    <small>{formatCompositeScore(derivedReadingLevels.baselineAverage)}</small>
                  </article>
                  <article>
                    <span>Latest level</span>
                    <strong>{derivedReadingLevels.latestLevel ?? "Data not available"}</strong>
                    <small>{formatCompositeScore(derivedReadingLevels.latestAverage)}</small>
                  </article>
                  <article>
                    <span>Movement</span>
                    <strong>{derivedReadingLevels.movementLabel}</strong>
                    <small>Derived from baseline vs latest domain profile</small>
                  </article>
                </div>

                {readingLevelsBaselineCycle && readingLevelsLatestCycle ? (
                  <div className="impact-reading-level-distribution">
                    <div>
                      <div className="impact-reading-level-distribution-head">
                        <span>Baseline distribution</span>
                        <strong>n={readingLevelsBaselineCycle.n.toLocaleString()}</strong>
                      </div>
                      <div className="impact-reading-level-stack" role="img" aria-label="Baseline reading-level distribution">
                        {readingLevelLabels.map((label, index) => {
                          const percent = readingLevelsBaselineCycle.percents[label] ?? 0;
                          return (
                            <i
                              key={`baseline-${label}`}
                              style={{
                                width: `${Math.max(percent, percent > 0 ? 2 : 0)}%`,
                                background: readingLevelColor(label, index),
                              }}
                              title={`${label}: ${percent}%`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="impact-reading-level-distribution-head">
                        <span>Latest distribution</span>
                        <strong>n={readingLevelsLatestCycle.n.toLocaleString()}</strong>
                      </div>
                      <div className="impact-reading-level-stack" role="img" aria-label="Latest reading-level distribution">
                        {readingLevelLabels.map((label, index) => {
                          const percent = readingLevelsLatestCycle.percents[label] ?? 0;
                          return (
                            <i
                              key={`latest-${label}`}
                              style={{
                                width: `${Math.max(percent, percent > 0 ? 2 : 0)}%`,
                                background: readingLevelColor(label, index),
                              }}
                              title={`${label}: ${percent}%`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="impact-reading-level-legend">
                      {readingLevelLabels.map((label, index) => (
                        <span key={`legend-${label}`}>
                          <i style={{ background: readingLevelColor(label, index) }} />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="impact-reading-level-domain-table-wrap">
                  <table className="impact-reading-level-domain-table">
                    <thead>
                      <tr>
                        <th>Domain</th>
                        <th>Baseline</th>
                        <th>Latest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {derivedReadingLevels.domainRows.map((row) => (
                        <tr key={row.label}>
                          <td>{row.label}</td>
                          <td>{typeof row.baseline === "number" ? row.baseline.toFixed(1) : "Data not available"}</td>
                          <td>{typeof row.latest === "number" ? row.latest.toFixed(1) : "Data not available"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="impact-mini-footer">
                  Reading levels are computed from the six assessment outcome domains:
                  {" "}
                  {OUTCOME_DOMAIN_CONFIG.map(
                    (item) => LEARNING_DOMAIN_DICTIONARY[item.domainKey].label_short,
                  ).join(", ")}
                  .
                </p>
              </div>
            ) : (
              <p>Data not available.</p>
            )}
          </article>
        )}

        {activeTab === "implementation" && (
          <article className="card">
            <h3>Program Implementation Funnel</h3>
            <div className="impact-funnel-mini">
              <div>
                <span>Schools Trained</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel?.trained ?? 0).toLocaleString()}
                </strong>
                <span>Direct capacity building</span>
              </div>
              <div>
                <span>Coached / Visited</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel?.coached ?? 0).toLocaleString()}
                </strong>
                <span>Ongoing field support</span>
              </div>
              <div>
                <span>Baseline Assessed</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel?.baselineAssessed ?? 0).toLocaleString()}
                </strong>
                <span>Initial learner data</span>
              </div>
              <div>
                <span>Endline Assessed</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel?.endlineAssessed ?? 0).toLocaleString()}
                </strong>
                <span>Impact measurement</span>
              </div>
              <div>
                <span>1001 Story Active</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel?.storyActive ?? 0).toLocaleString()}
                </strong>
                <span>Creative literacy extension</span>
              </div>
            </div>
          </article>
        )}

        {activeTab === "teaching" && (
          <article className="card impact-teaching-card">
            <h3>Teaching Quality (Lesson Evaluations)</h3>
            <p className="impact-mini-footer impact-teaching-scope">
              Scope: {payload?.scope?.name ?? "Uganda"} ({payload?.scope?.level ?? "country"})
            </p>
            {teachingQuality?.evaluationsCount ? (
              <div className="impact-teaching-quality-grid">
                <article className="impact-domain-mini-card">
                  <h4>Evaluations</h4>
                  <p>
                    <strong>{teachingQuality.evaluationsCount.toLocaleString()}</strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Average score:{" "}
                    {typeof teachingQuality.avgOverallScore === "number"
                      ? `${teachingQuality.avgOverallScore.toFixed(2)}/4`
                      : "Data not available"}
                  </p>
                  <p className="impact-domain-mini-meta">
                    Last updated:{" "}
                    {teachingQuality.lastUpdated
                      ? new Date(teachingQuality.lastUpdated).toLocaleDateString()
                      : "Data not available"}
                  </p>
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Overall Levels</h4>
                  <p className="impact-domain-mini-meta">
                    Strong: <strong>{teachingQuality.levelDistribution?.strong?.percent ?? 0}%</strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Good: <strong>{teachingQuality.levelDistribution?.good?.percent ?? 0}%</strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Developing:{" "}
                    <strong>{teachingQuality.levelDistribution?.developing?.percent ?? 0}%</strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Needs support:{" "}
                    <strong>{teachingQuality.levelDistribution?.needsSupport?.percent ?? 0}%</strong>
                  </p>
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Domain Averages (/4)</h4>
                  {[
                    ["Setup & Review", teachingQuality.domainAverages?.setup ?? null],
                    ["New Sound/Skill", teachingQuality.domainAverages?.newSound ?? null],
                    ["Decoding", teachingQuality.domainAverages?.decoding ?? null],
                    ["Reading Practice", teachingQuality.domainAverages?.readingPractice ?? null],
                    ["Tricky Words", teachingQuality.domainAverages?.trickyWords ?? null],
                    ["Check & Next Steps", teachingQuality.domainAverages?.checkNext ?? null],
                  ].map(([label, value]) => (
                    <p className="impact-domain-mini-meta" key={label}>
                      {label}: <strong>{typeof value === "number" ? value.toFixed(2) : "N/A"}</strong>
                    </p>
                  ))}
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Top Coaching Focus Areas</h4>
                  {(teachingQuality.topCoachingFocusAreas ?? []).length > 0 ? (
                    (teachingQuality.topCoachingFocusAreas ?? []).map((area) => (
                      <p className="impact-domain-mini-meta" key={area}>
                        • {area}
                      </p>
                    ))
                  ) : (
                    <p className="impact-domain-mini-meta">Data not available</p>
                  )}
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Improvement Since Baseline</h4>
                  <p className="impact-domain-mini-meta">
                    Teachers improved:{" "}
                    <strong>
                      {typeof teachingQuality.improvedTeachersPercent === "number"
                        ? `${teachingQuality.improvedTeachersPercent.toFixed(1)}%`
                        : "Data not available"}
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Avg delta overall:{" "}
                    <strong>
                      {typeof teachingQuality.deltaOverall === "number"
                        ? `${teachingQuality.deltaOverall > 0 ? "+" : ""}${teachingQuality.deltaOverall.toFixed(2)}`
                        : "Data not available"}
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Schools improving:{" "}
                    <strong>
                      {typeof teachingQuality.schoolsImprovedPercent === "number"
                        ? `${teachingQuality.schoolsImprovedPercent.toFixed(1)}%`
                        : "Data not available"}
                    </strong>
                  </p>
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Domain Change (Baseline → Latest)</h4>
                  {[
                    ["Setup & Review", teachingQuality.domainDeltas?.setup ?? null],
                    ["New Sound/Skill", teachingQuality.domainDeltas?.newSound ?? null],
                    ["Decoding", teachingQuality.domainDeltas?.decoding ?? null],
                    ["Reading Practice", teachingQuality.domainDeltas?.readingPractice ?? null],
                    ["Tricky Words", teachingQuality.domainDeltas?.trickyWords ?? null],
                    ["Check & Next Steps", teachingQuality.domainDeltas?.checkNext ?? null],
                  ].map(([label, value]) => (
                    <p className="impact-domain-mini-meta" key={label}>
                      {label}:{" "}
                      <strong>
                        {typeof value === "number"
                          ? `${value > 0 ? "+" : ""}${value.toFixed(2)}`
                          : "N/A"}
                      </strong>
                    </p>
                  ))}
                </article>
              </div>
            ) : (
              <p>Data not available for lesson evaluations in this scope/period.</p>
            )}

            <h3 className="impact-teaching-subtitle">Teaching → Learning Alignment</h3>
            {teachingLearningAlignmentPoints.length ? (
              <div className="impact-domain-mini-grid impact-domain-mini-grid--teaching">
                <article className="impact-domain-mini-card impact-domain-mini-card--compact">
                  <h4>Aligned trend summary</h4>
                  <p className="impact-domain-mini-meta">
                    Teaching quality delta:{" "}
                    <strong>
                      {typeof teachingLearningAlignment?.summary?.teachingDelta === "number"
                        ? `${teachingLearningAlignment.summary.teachingDelta > 0 ? "+" : ""}${teachingLearningAlignment.summary.teachingDelta.toFixed(2)}`
                        : "Data not available"}
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Non-reader reduction:{" "}
                    <strong>
                      {typeof teachingLearningAlignment?.summary?.nonReaderReductionPp === "number"
                        ? `${teachingLearningAlignment.summary.nonReaderReductionPp.toFixed(2)} pp`
                        : "Data not available"}
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    20+ CWPM delta:{" "}
                    <strong>
                      {typeof teachingLearningAlignment?.summary?.cwpm20PlusDeltaPp === "number"
                        ? `${teachingLearningAlignment.summary.cwpm20PlusDeltaPp > 0 ? "+" : ""}${teachingLearningAlignment.summary.cwpm20PlusDeltaPp.toFixed(2)} pp`
                        : "Data not available"}
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    1001 Story sessions (latest):{" "}
                    <strong>{teachingLearningAlignment?.summary?.storySessionsLatest ?? 0}</strong>
                  </p>
                </article>

                <article className="impact-domain-mini-card impact-domain-mini-card--wide">
                  <h4>Aligned timeline</h4>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Teaching quality</th>
                          <th>Decoding</th>
                          <th>Fluency</th>
                          <th title={LEARNING_DOMAIN_DICTIONARY.comprehension.description}>
                            {LEARNING_DOMAIN_DICTIONARY.comprehension.label_short}
                          </th>
                          <th>Non-reader %</th>
                          <th>20+ CWPM %</th>
                          <th>Story sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachingLearningAlignmentPoints.slice(-8).map((point) => (
                          <tr key={point.period}>
                            <td>{point.period}</td>
                            <td>
                              {typeof point.teachingQualityAvg === "number"
                                ? point.teachingQualityAvg.toFixed(2)
                                : "N/A"}
                            </td>
                            <td>{typeof point.decodingAvg === "number" ? point.decodingAvg.toFixed(2) : "N/A"}</td>
                            <td>{typeof point.fluencyAvg === "number" ? point.fluencyAvg.toFixed(2) : "N/A"}</td>
                            <td>
                              {typeof point.comprehensionAvg === "number"
                                ? point.comprehensionAvg.toFixed(2)
                                : "N/A"}
                            </td>
                            <td>{typeof point.nonReaderPct === "number" ? `${point.nonReaderPct.toFixed(1)}%` : "N/A"}</td>
                            <td>{typeof point.cwpm20PlusPct === "number" ? `${point.cwpm20PlusPct.toFixed(1)}%` : "N/A"}</td>
                            <td>{point.storySessionsCount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="impact-mini-footer">
                    {teachingLearningAlignment?.caveat ?? "Data reflects aligned trend points only."}
                  </p>
                </article>
              </div>
            ) : (
              <p>Data not available for aligned teaching, learner, and story trends in this scope.</p>
            )}

            <h3 className="impact-teaching-subtitle">Implementation Fidelity</h3>
            <div className="impact-auto-grid impact-auto-grid--teaching">
              <div className="impact-domain-mini-card">
                <h4>Fidelity Score</h4>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-4xl font-bold">{payload?.fidelity?.score ?? 0}%</div>
                  <div
                    className={`badge badge-${String(payload?.fidelity?.band ?? "developing")
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {payload?.fidelity?.band ?? "Developing"}
                  </div>
                </div>
                <p className="mt-4 text-gray-600">
                  Combined metric of coaching coverage, assessment compliance, and observed teaching
                  standards.
                </p>
              </div>
              <div className="impact-domain-mini-card" style={{ display: "grid", gap: "0.45rem" }}>
                {fidelityDrivers.map((driver) => (
                  <div key={driver.key} className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>{driver.label}</span>
                    <span className="font-bold">{driver.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        )}

        {activeTab === "equity" && (
          <article className="card">
            <h3>Equity & Geographic Insights</h3>
            <div className="impact-auto-grid">
              <div>
                <h4>Most Improved (by outcome)</h4>
                <div className="mt-2 flex flex-col gap-2">
                  {mostImprovedRankings.map((item) => (
                    <div key={item.name} className="flex justify-between p-2 border-b">
                      <span>{item.name}</span>
                      <span className="text-orange-600 font-bold">+{item.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4>Support Priority Score</h4>
                <div className="mt-2 flex flex-col gap-2">
                  {prioritySupportRankings.map((item) => (
                    <div key={item.name} className="flex justify-between p-2 border-b">
                      <span>{item.name}</span>
                      <span className="text-orange-600 font-bold">{item.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        )}

        {activeTab === "quality" && (
          <article className="card">
            <h3>Data Completeness & Audit</h3>
            <div className="impact-auto-grid">
              <div className="impact-domain-mini-card">
                <h4>Sample Size (n)</h4>
                <div className="text-3xl font-bold mt-2">{payload?.meta?.sampleSize ?? 0}</div>
                <p className="text-gray-600">Total verified record submissions in this period.</p>
              </div>
              <div className="impact-domain-mini-card">
                <h4>Completeness Status</h4>
                <div className="mt-2">
                  {payload?.meta?.dataCompleteness === "Complete" ? (
                    <span className="text-orange-600 font-bold">✓ High (100% submission)</span>
                  ) : (
                    <span className="text-orange-600 font-bold">⚠ Partial (Reporting in progress)</span>
                  )}
                </div>
                <p className="text-gray-600 mt-2">
                  Last updated: {new Date(payload?.meta?.lastUpdated ?? "").toLocaleDateString()}
                </p>
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
