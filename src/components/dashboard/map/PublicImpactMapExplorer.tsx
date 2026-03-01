"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PublicImpactAggregate } from "@/lib/types";
import { UgandaImpactMapPro } from "./UgandaImpactMapPro";
import { HeadlineStatsPanel } from "./HeadlineStatsPanel";
import { LocationNavigator, PublicMapSelection } from "./LocationNavigator";

type PublicImpactMapExplorerProps = {
  compact?: boolean;
  syncUrl?: boolean;
  initialPeriod?: string;
  initialSelection?: Partial<PublicMapSelection>;
};

type ScopeLevel = "country" | "subregion" | "district" | "school";

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
  return { level: "country", id: "Uganda" };
}

function scopeEndpoint(level: ScopeLevel, id: string, period: string) {
  const encodedPeriod = encodeURIComponent(period);
  if (level === "country") {
    return `/impact/country?period=${encodedPeriod}`;
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
  if (level === "subregion") {
    return `/sub-regions/${encodeURIComponent(id)}`;
  }
  return "/impact";
}

function DomainOutcomeCard({
  title,
  domain,
}: {
  title: string;
  domain: PublicImpactAggregate["outcomes"]["letterSounds"];
}) {
  const baseline = domain.baseline ?? 0;
  const latest = domain.latest ?? domain.endline ?? 0;
  const change = latest - baseline;
  return (
    <article className="impact-domain-mini-card">
      <h4>{title}</h4>
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
  const [activeTab, setActiveTab] = useState<"outcomes" | "implementation" | "teaching" | "equity" | "quality">("outcomes");

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
    selection.subRegion || null,
    selection.district || null,
    selection.school
      ? payload?.navigator?.schools.find((school) => String(school.id) === selection.school)?.name ?? null
      : null,
  ].filter((value): value is string => Boolean(value));

  const detailHref = mapScopeToDetailHref(scope.level, scope.id);
  const schoolOptions = payload?.navigator?.schools ?? [];

  return (
    <section className={`impact-explorer ${compact ? "impact-explorer--compact" : ""}`}>
      <header className="impact-explorer-header">
        <div>
          <h2>Live Literacy Impact Dashboard</h2>
          <p>Aggregated, privacy-protected classroom data. Updated regularly.</p>
        </div>
        <div className="action-row">
          {compact ? (
            <>
              <Link className="button" href="/impact">
                Explore Full Dashboard
              </Link>
              <Link className="button button-ghost" href="/reports/fy-latest">
                Download FY Report
              </Link>
            </>
          ) : null}
        </div>
      </header>

      <div className="impact-explorer-breadcrumbs">
        <div className="flex items-center gap-2">
          <p>{breadcrumb.join(" > ")}</p>
          {payload?.meta.dataCompleteness === "Complete" ? (
            <span className="badge badge-success" title="All schools in this scope have submitted reports for this period">
              ✓ Data Complete
            </span>
          ) : (
            <span className="badge badge-warning" title="Some schools in this scope haven't submitted report yet">
              ⚠ Partial Data ({payload?.meta.sampleSize} reports)
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
            <div
              className="impact-domain-mini-grid"
              style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
            >
              <DomainOutcomeCard
                title="Letter Names"
                domain={
                  payload?.outcomes.letterNames ?? {
                    baseline: null,
                    latest: null,
                    endline: null,
                    benchmarkPct: null,
                    n: 0,
                  }
                }
              />
              <DomainOutcomeCard
                title="Letter Sounds"
                domain={
                  payload?.outcomes.letterSounds ?? {
                    baseline: null,
                    latest: null,
                    endline: null,
                    benchmarkPct: null,
                    n: 0,
                  }
                }
              />
              <DomainOutcomeCard
                title="Real Words"
                domain={
                  payload?.outcomes.realWords ?? {
                    baseline: null,
                    latest: null,
                    endline: null,
                    benchmarkPct: null,
                    n: 0,
                  }
                }
              />
              <DomainOutcomeCard
                title="Made Up Words"
                domain={
                  payload?.outcomes.madeUpWords ?? {
                    baseline: null,
                    latest: null,
                    endline: null,
                    benchmarkPct: null,
                    n: 0,
                  }
                }
              />
              <DomainOutcomeCard
                title="Story Reading"
                domain={
                  payload?.outcomes.storyReading ?? {
                    baseline: null,
                    latest: null,
                    endline: null,
                    benchmarkPct: null,
                    n: 0,
                  }
                }
              />
              <DomainOutcomeCard
                title="Comprehension"
                domain={
                  payload?.outcomes.comprehension ?? {
                    baseline: null,
                    latest: null,
                    endline: null,
                    benchmarkPct: null,
                    n: 0,
                  }
                }
              />
            </div>
            <p className="impact-mini-footer">
              Scores reflect average learner performance. Benchmark: 60%.
            </p>
          </article>
        )}

        {activeTab === "implementation" && (
          <article className="card">
            <h3>Program Implementation Funnel</h3>
            <div className="impact-funnel-mini">
              <div>
                <span>Schools Trained</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel.trained ?? 0).toLocaleString()}
                </strong>
                <span>Direct capacity building</span>
              </div>
              <div>
                <span>Coached / Visited</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel.coached ?? 0).toLocaleString()}
                </strong>
                <span>Ongoing field support</span>
              </div>
              <div>
                <span>Baseline Assessed</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel.baselineAssessed ?? 0).toLocaleString()}
                </strong>
                <span>Initial learner data</span>
              </div>
              <div>
                <span>Endline Assessed</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel.endlineAssessed ?? 0).toLocaleString()}
                </strong>
                <span>Impact measurement</span>
              </div>
              <div>
                <span>1001 Story Active</span>
                <strong>
                  {loading ? "Loading..." : (payload?.funnel.storyActive ?? 0).toLocaleString()}
                </strong>
                <span>Creative literacy extension</span>
              </div>
            </div>
          </article>
        )}

        {activeTab === "teaching" && (
          <article className="card">
            <h3>Teaching Quality & Fidelity</h3>
            <div className="flex gap-8 items-start">
              <div className="flex-1">
                <h4>Fidelity Score</h4>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-4xl font-bold">{payload?.fidelity.score}%</div>
                  <div className={`badge badge-${payload?.fidelity.band.toLowerCase().replace(" ", "-")}`}>
                    {payload?.fidelity.band}
                  </div>
                </div>
                <p className="mt-4 text-gray-600">
                  Combined metric of coaching coverage, assessment compliance, and observed teaching
                  standards.
                </p>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {payload?.fidelity.drivers.map((driver) => (
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
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4>Most Improved (by outcome)</h4>
                <div className="mt-2 flex flex-col gap-2">
                  {payload?.rankings.mostImproved.map((item) => (
                    <div key={item.name} className="flex justify-between p-2 border-b">
                      <span>{item.name}</span>
                      <span className="text-green-600 font-bold">+{item.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4>Support Priority Score</h4>
                <div className="mt-2 flex flex-col gap-2">
                  {payload?.rankings.prioritySupport.map((item) => (
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
            <div className="flex gap-8">
              <div className="flex-1">
                <h4>Sample Size (n)</h4>
                <div className="text-3xl font-bold mt-2">{payload?.meta.sampleSize}</div>
                <p className="text-gray-600">Total verified record submissions in this period.</p>
              </div>
              <div className="flex-1">
                <h4>Completeness Status</h4>
                <div className="mt-2">
                  {payload?.meta.dataCompleteness === "Complete" ? (
                    <span className="text-green-600 font-bold">✓ High (100% submission)</span>
                  ) : (
                    <span className="text-orange-600 font-bold">⚠ Partial (Reporting in progress)</span>
                  )}
                </div>
                <p className="text-gray-600 mt-2">
                  Last updated: {new Date(payload?.meta.lastUpdated ?? "").toLocaleDateString()}
                </p>
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
