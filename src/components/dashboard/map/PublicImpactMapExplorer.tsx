"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PublicImpactAggregate } from "@/lib/types";
import { UgandaImpactMapPro } from "./UgandaImpactMapPro";
import { HeadlineStatsPanel } from "./HeadlineStatsPanel";
import { LocationNavigator, PublicMapSelection } from "./LocationNavigator";
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






export function PublicImpactMapExplorer({
  compact = true,
  syncUrl = false,
  initialPeriod = "FY",
  initialSelection,
}: PublicImpactMapExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchSnapshot = searchParams.toString();
  const [period, setPeriod] = useState(initialPeriod);
  const [selection, setSelection] = useState<PublicMapSelection>(
    defaultSelection(initialSelection),
  );
  const [selectionHistory, setSelectionHistory] = useState<PublicMapSelection[]>([]);
  const [payload, setPayload] = useState<PublicImpactAggregate | null>(null);
  const [navigatorSnapshot, setNavigatorSnapshot] = useState<PublicImpactAggregate["navigator"] | null>(null);
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
          cache: "no-store",
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
    let active = true;
    async function fetchNavigatorSnapshot() {
      try {
        const response = await fetch(`/api/impact/country?period=${encodeURIComponent(period)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("navigator-unavailable");
        }
        const json = (await response.json()) as PublicImpactAggregate;
        if (active) {
          setNavigatorSnapshot(json.navigator ?? null);
        }
      } catch {
        if (active) {
          setNavigatorSnapshot(null);
        }
      }
    }
    fetchNavigatorSnapshot();
    return () => {
      active = false;
    };
  }, [period]);

  useEffect(() => {
    if (!syncUrl) {
      return;
    }
    const query = new URLSearchParams(searchSnapshot);
    query.set("period", period);

    if (selection.region) {
      query.set("region", selection.region);
    } else {
      query.delete("region");
    }
    if (selection.subRegion) {
      query.set("subRegion", selection.subRegion);
    } else {
      query.delete("subRegion");
    }
    if (selection.district) {
      query.set("district", selection.district);
    } else {
      query.delete("district");
    }
    if (selection.school) {
      query.set("school", selection.school);
      query.set("schoolId", selection.school);
    } else {
      query.delete("school");
      query.delete("schoolId");
    }

    // Keep report filters aligned with map drill-down scope.
    if (selection.district) {
      query.set("reportType", "District Report");
      query.set("scopeType", "District");
      query.set("scopeValue", selection.district);
    } else if (selection.subRegion) {
      query.set("reportType", "Sub-region Report");
      query.set("scopeType", "Sub-region");
      query.set("scopeValue", selection.subRegion);
    } else if (selection.region) {
      query.set("reportType", "Regional Impact Report");
      query.set("scopeType", "Region");
      query.set("scopeValue", selection.region);
    } else {
      query.delete("reportType");
      query.set("scopeType", "National");
      query.delete("scopeValue");
    }

    const nextQuery = query.toString();
    if (nextQuery === searchSnapshot) {
      return;
    }
    router.replace(`${pathname}?${nextQuery}`, { scroll: false });
  }, [pathname, period, router, searchSnapshot, selection, syncUrl]);

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
    setSelection({ region: "", subRegion: "", district: "", school: "" });
  };


  const navigatorSchools = navigatorSnapshot?.schools ?? payload?.navigator?.schools ?? [];
  const selectedSchoolName = selection.school
    ? navigatorSchools.find((school) => String(school.id) === selection.school)?.name ?? null
    : null;
  const breadcrumb = [
    selection.region || "All locations",
    selection.subRegion || null,
    selection.district || null,
    selectedSchoolName,
  ].filter((value): value is string => Boolean(value));

  const detailHref = mapScopeToDetailHref(scope.level, scope.id);
  const reportEngineQuery = useMemo(() => {
    const query = new URLSearchParams();
    query.set("scopeLevel", scope.level);
    query.set("scopeId", scope.id);
    query.set("period", period);
    return query.toString();
  }, [period, scope.id, scope.level]);
  const reportEngineHtmlHref = `/api/impact/report-engine?${reportEngineQuery}&format=html`;
  const reportEnginePdfHref = `/api/impact/report-engine?${reportEngineQuery}&format=pdf`;
  const districtSearchOptions = useMemo(() => {
    const districtToSubRegion = new Map<string, string>();
    navigatorSchools.forEach((school) => {
      const district = school.district?.trim();
      if (!district) {
        return;
      }
      if (!districtToSubRegion.has(district)) {
        districtToSubRegion.set(district, school.subRegion ?? "");
      }
    });
    return [...districtToSubRegion.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([district, subRegion]) => ({ district, subRegion }));
  }, [navigatorSchools]);
  const readingLevelsLatestCycle =
    payload?.readingLevels?.distribution.find((item) => item.cycle === "endline") ??
    payload?.readingLevels?.distribution.find((item) => item.cycle === "latest") ??
    null;
  const masteryDomains = payload?.masteryDomains ?? null;
  const fluentReaderShare =
    readingLevelsLatestCycle?.percents?.Fluent ??
    readingLevelsLatestCycle?.percents?.["Transitional"] ??
    null;
  const teachingQuality = payload?.teachingQuality;
  const teachingLearningAlignment = payload?.teachingLearningAlignment;
  const teachingLearningAlignmentPoints = teachingLearningAlignment?.points ?? [];
  const fidelityDrivers = payload?.fidelity?.drivers ?? [];
  const mostImprovedRankings = payload?.rankings?.mostImproved ?? [];
  const prioritySupportRankings = payload?.rankings?.prioritySupport ?? [];
  const kpis = payload?.kpis;
  const teachersSupportedTotal =
    (kpis?.teachersSupportedMale ?? 0) + (kpis?.teachersSupportedFemale ?? 0);

  const topMasteryDomains = Object.entries(masteryDomains ?? {})
    .map(([key, value]) => ({
      key,
      label: LEARNING_DOMAIN_DICTIONARY[key as keyof typeof LEARNING_DOMAIN_DICTIONARY]?.label_short ?? key,
      green: value.green.percent,
      n: value.n,
    }))
    .sort((a, b) => b.green - a.green)
    .slice(0, 3);

  const readingStageRows = (payload?.readingStageDistribution ?? [])
    .sort((a, b) => a.order - b.order);




  return (
    <section className={`impact-explorer ${compact ? "impact-explorer--compact" : ""}`}>
      {compact && (
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
      )}

      <div className="impact-explorer-breadcrumbs">
        <div className="impact-explorer-status">
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
        <div className="impact-report-actions">
          <a
            className="button button-ghost"
            href={reportEngineHtmlHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open A4 Report
          </a>
          <a
            className="button"
            href={reportEnginePdfHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download A4 PDF
          </a>
        </div>
        <button type="button" className="impact-map-clear-link" onClick={onReset}>
          Clear
        </button>
      </div>

      <section className="compact-dashboard-grid mt-4">
        <article className="glass-card impact-attract-card compact">
          <span className="stat-label-compact">Schools Supported</span>
          <div className="stat-value-compact">{(kpis?.schoolsSupported ?? 0).toLocaleString()}</div>
        </article>
        <article className="glass-card impact-attract-card compact">
          <span className="stat-label-compact">Teachers Supported</span>
          <div className="stat-value-compact">{teachersSupportedTotal.toLocaleString()}</div>
        </article>
        <article className="glass-card impact-attract-card compact">
          <span className="stat-label-compact">Sub-counties Reached</span>
          <div className="stat-value-compact">{(kpis?.subCountiesReached ?? 0).toLocaleString()}</div>
        </article>
      </section>

      <article className="glass-card horizontal-progress-card mt-4">
        <div className="horizontal-progress-left">
          <header className="compact">
            <h3 className="compact">Reading Progress Tracker</h3>
            <p className="stat-label-compact mt-2">Total Books Read</p>
            <div className="stat-value-compact">{(kpis?.totalBooksRead ?? 0).toLocaleString()}</div>
          </header>
        </div>
        <div className="horizontal-progress-right">
          <span className="stat-label-compact">Fluent Reader Share</span>
          <div className="progress-bar-sleek">
            <div
              className="progress-bar-fill"
              style={{ width: `${fluentReaderShare ?? 0}%` }}
            />
          </div>
          <span className="progress-pct-badge">
            {typeof fluentReaderShare === "number" ? `${fluentReaderShare.toFixed(1)}%` : "0%"}
          </span>
        </div>
      </article>

      <article className="glass-card horizontal-progress-card mt-4">
        <div className="horizontal-progress-left">
          <header className="compact">
            <h3 className="compact">Strongest Mastery Domains</h3>
            <p className="stat-label-compact mt-2">Top Domain Mastery</p>
            <div className="stat-value-compact">
              {topMasteryDomains[0] ? `${topMasteryDomains[0].green.toFixed(1)}%` : "N/A"}
            </div>
          </header>
        </div>
        <div className="horizontal-progress-right">
          <div className="flex flex-col gap-2 w-full">
            {topMasteryDomains.map((domain) => (
              <div key={domain.key} className="flex items-center gap-2">
                <span className="text-[10px] font-bold w-20 truncate">{domain.label}</span>
                <div className="progress-bar-sleek h-1.5 flex-1">
                  <div
                    className="progress-bar-fill bg-green-500"
                    style={{ width: `${domain.green}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold">{domain.green.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="glass-card horizontal-progress-card mt-4">
        <div className="horizontal-progress-left">
          <header className="compact">
            <h3 className="compact">Latest Reading Stage Mix</h3>
            <p className="stat-label-compact mt-2">Total Sample (n)</p>
            <div className="stat-value-compact">{(kpis?.learnersAssessedUnique ?? 0).toLocaleString()}</div>
          </header>
        </div>
        <div className="horizontal-progress-right">
          <div className="flex w-full h-3 rounded overflow-hidden">
            {readingStageRows.map((stage, i) => (
              <div
                key={stage.label}
                title={`${stage.label}: ${stage.percent}%`}
                style={{
                  width: `${stage.percent}%`,
                  backgroundColor: ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71", "#9b59b6"][i % 5]
                }}
              />
            ))}
          </div>
          <div className="flex justify-between w-full mt-2">
             {readingStageRows.slice(0, 3).map((stage, i) => (
               <div key={stage.label} className="flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71", "#9b59b6"][i % 5] }} />
                 <span className="text-[9px] font-bold truncate max-w-[60px]">{stage.label}</span>
                 <span className="text-[9px] text-gray-500">{stage.percent.toFixed(0)}%</span>
               </div>
             ))}
          </div>
        </div>
      </article>

      <div className="impact-explorer-layout mt-6">
        <LocationNavigator
          period={period}
          onPeriodChange={setPeriod}
          selection={selection}
          navigatorSchools={navigatorSchools}
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
            districtSearchOptions={districtSearchOptions}
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

      <div className="impact-tabs mt-8">
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
              Scores reflect average learner performance. Benchmark interpretation follows mastery progression by domain.
            </p>
            {masteryDomains && (
              <>
                <h4 style={{ marginTop: "1rem" }}>Mastery Traffic-Light Distribution</h4>
                <div className="impact-domain-mini-grid">
                  {OUTCOME_DOMAIN_CONFIG.map((item) => {
                    const domainMap: Record<string, keyof typeof masteryDomains> = {
                      letterNames: "phonemic_awareness",
                      letterSounds: "grapheme_phoneme_correspondence",
                      realWords: "blending_decoding",
                      madeUpWords: "word_recognition_fluency",
                      storyReading: "sentence_paragraph_construction",
                      comprehension: "comprehension",
                    };
                    const masteryKey = domainMap[item.key] ?? "comprehension";
                    const mastery = masteryDomains[masteryKey];
                    if (!mastery) return null;
                    return (
                      <div key={item.key} className="impact-domain-mini-card">
                        <h4>{LEARNING_DOMAIN_DICTIONARY[item.domainKey].label_short}</h4>
                        <div className="flex gap-1 mt-2 height-4 rounded overflow-hidden">
                          <div
                            style={{ width: `${mastery.green.percent}%`, background: "#2ecc71" }}
                          />
                          <div
                            style={{ width: `${mastery.amber.percent}%`, background: "#f1c40f" }}
                          />
                          <div style={{ width: `${mastery.red.percent}%`, background: "#e74c3c" }} />
                        </div>
                        <div className="flex justify-between text-[10px] mt-1 uppercase font-bold">
                          <span className="text-green-600">{mastery.green.percent}%</span>
                          <span className="text-yellow-600">{mastery.amber.percent}%</span>
                          <span className="text-red-600">{mastery.red.percent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </article>
        )}

        {activeTab === "readingLevels" && (
          <article className="card">
            <h3>Reading Level Transitions</h3>
            {payload?.readingLevels ? (
              <div className="impact-auto-grid">
                <div className="impact-domain-mini-card">
                  <h4>Movement (Matched Learners)</h4>
                  <div className="text-3xl font-bold mt-2">
                    {payload.readingLevels.movement?.moved_up_1plus_percent}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Learners moved up 1+ levels</p>
                </div>
                <div className="impact-domain-mini-card">
                  <h4>Fluent reader share</h4>
                  <div className="text-3xl font-bold mt-2">
                    {readingLevelsLatestCycle?.percents?.Fluent ?? 0}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Latest endline cycle</p>
                </div>
              </div>
            ) : (
              <p>Reading level data not available for this scope.</p>
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
                      ? new Date(teachingQuality.lastUpdated).toLocaleDateString("en-GB")
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
                  Last updated: {new Date(payload?.meta?.lastUpdated ?? "").toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
