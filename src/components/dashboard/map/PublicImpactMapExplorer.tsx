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
        <p>{breadcrumb.join(" > ")}</p>
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

      <div className="cards-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <article className="card">
          <h3>Learning outcomes by domain</h3>
          <div className="impact-domain-mini-grid">
            <DomainOutcomeCard title="Sounds" domain={payload?.outcomes.letterSounds ?? { baseline: null, latest: null, endline: null, benchmarkPct: null, n: 0 }} />
            <DomainOutcomeCard title="Decoding" domain={payload?.outcomes.decoding ?? { baseline: null, latest: null, endline: null, benchmarkPct: null, n: 0 }} />
            <DomainOutcomeCard title="Fluency" domain={payload?.outcomes.fluency ?? { baseline: null, latest: null, endline: null, benchmarkPct: null, n: 0 }} />
            <DomainOutcomeCard title="Comprehension" domain={payload?.outcomes.comprehension ?? { baseline: null, latest: null, endline: null, benchmarkPct: null, n: 0 }} />
          </div>
        </article>

        <article className="card">
          <h3>Implementation funnel</h3>
          <div className="impact-funnel-mini">
            <div>
              <span>Trained</span>
              <strong>{loading ? "Loading..." : (payload?.funnel.trained ?? 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Coached / Visited</span>
              <strong>{loading ? "Loading..." : (payload?.funnel.coached ?? 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Baseline assessed</span>
              <strong>{loading ? "Loading..." : (payload?.funnel.baselineAssessed ?? 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Endline assessed</span>
              <strong>{loading ? "Loading..." : (payload?.funnel.endlineAssessed ?? 0).toLocaleString()}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
