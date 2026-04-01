"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PublicImpactAggregate } from "@/lib/types";

const UgandaImpactMapPro = dynamic(
  () => import("./UgandaImpactMapPro").then((m) => m.UgandaImpactMapPro),
  {
    ssr: false,
    loading: () => (
      <div className="impact-map-skeleton" aria-busy="true">
        <div className="impact-map-skeleton-inner">
          <div
            className="impact-skeleton-pulse"
            style={{
              width: "60%",
              height: 16,
              borderRadius: 8,
              marginBottom: 12,
            }}
          />
          <div
            className="impact-skeleton-pulse"
            style={{ width: "100%", height: 320, borderRadius: 16 }}
          />
          <div
            className="impact-skeleton-pulse"
            style={{ width: "40%", height: 14, borderRadius: 8, marginTop: 12 }}
          />
        </div>
      </div>
    ),
  },
);

/** Client-side response cache with TTL to avoid redundant API calls */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const responseCache = new Map<
  string,
  { data: PublicImpactAggregate; timestamp: number }
>();
function getCached(key: string): PublicImpactAggregate | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}
function setCache(key: string, data: PublicImpactAggregate) {
  // Keep cache bounded — evict oldest if > 50 entries
  if (responseCache.size > 50) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}
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
  /** Server-fetched aggregate passed as prop to avoid duplicate initial fetch */
  initialPayload?: PublicImpactAggregate | null;
};

type ScopeLevel = "country" | "region" | "subregion" | "district" | "school";

function defaultSelection(
  initial?: Partial<PublicMapSelection>,
): PublicMapSelection {
  return {
    region: initial?.region ?? "",
    subRegion: initial?.subRegion ?? "",
    district: initial?.district ?? "",
    school: initial?.school ?? "",
  };
}

function resolveScope(selection: PublicMapSelection): {
  level: ScopeLevel;
  id: string;
} {
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
        <span
          title={description}
          aria-label={description}
          style={{ cursor: "help" }}
        >
          (i)
        </span>
      </h4>
      <p>
        <strong>
          {domain.latest ?? domain.endline ?? "Data not available"}
        </strong>
      </p>
      <p className="impact-domain-mini-meta">
        Baseline: {domain.baseline ?? "Data not available"} | Change:{" "}
        {typeof domain.latest === "number" &&
        typeof domain.baseline === "number"
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

function deriveReadingLevelsFromOutcomes(
  outcomes?: PublicImpactAggregate["outcomes"] | null,
) {
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
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    )
    .map(normalizeDomainScoreForReadingLevel);
  const latestValues = domainRows
    .map((row) => row.latest)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    )
    .map(normalizeDomainScoreForReadingLevel);

  const baselineAverage =
    baselineValues.length > 0
      ? baselineValues.reduce((sum, value) => sum + value, 0) /
        baselineValues.length
      : null;
  const latestAverage =
    latestValues.length > 0
      ? latestValues.reduce((sum, value) => sum + value, 0) /
        latestValues.length
      : null;

  const baselineLevel =
    baselineAverage !== null ? readingLevelFromAverage(baselineAverage) : null;
  const latestLevel =
    latestAverage !== null ? readingLevelFromAverage(latestAverage) : null;

  let movementLabel = "Data not available";
  if (baselineLevel && latestLevel) {
    const movement =
      readingLevelOrdinal(latestLevel) - readingLevelOrdinal(baselineLevel);
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
  const fallback = [
    "#c0392b",
    "#e67e22",
    "#f1c40f",
    "#D96A0F",
    "#1f5fbf",
    "#6b7280",
  ];
  return fallback[index % fallback.length];
}

function formatSignedDelta(
  value: number | null | undefined,
  {
    digits = 1,
    suffix = "",
  }: {
    digits?: number;
    suffix?: string;
  } = {},
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Data not available";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

export function PublicImpactMapExplorer({
  compact = false,
  syncUrl = false,
  initialPeriod = "FY",
  initialSelection,
  initialPayload = null,
}: PublicImpactMapExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchSnapshot = searchParams.toString();
  const [period, setPeriod] = useState(initialPeriod);
  const [selection, setSelection] = useState<PublicMapSelection>(
    defaultSelection(initialSelection),
  );
  const [selectionHistory, setSelectionHistory] = useState<
    PublicMapSelection[]
  >([]);
  const [payload, setPayload] = useState<PublicImpactAggregate | null>(
    initialPayload,
  );
  const [navigatorSnapshot, setNavigatorSnapshot] = useState<
    PublicImpactAggregate["navigator"] | null
  >(initialPayload?.navigator ?? null);
  const [loading, setLoading] = useState(!initialPayload);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "outcomes"
    | "readingLevels"
    | "implementation"
    | "teaching"
    | "equity"
    | "quality"
  >("outcomes");
  const initialPayloadUsed = useRef(!!initialPayload);

  const scope = useMemo(() => resolveScope(selection), [selection]);

  // Single fetch effect — uses client cache, skips initial load when server data is available
  useEffect(() => {
    // Skip the first fetch if we already have server-provided data for the initial scope
    if (initialPayloadUsed.current) {
      initialPayloadUsed.current = false;
      return;
    }
    let active = true;
    const cacheKey = `${scope.level}:${scope.id}:${period}`;
    async function fetchAggregate() {
      // Check client-side cache first
      const cached = getCached(cacheKey);
      if (cached) {
        setPayload(cached);
        // Also update navigator from cached country-level data if available
        if (cached.navigator) {
          setNavigatorSnapshot(cached.navigator);
        }
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          scopeEndpoint(scope.level, scope.id, period),
        );
        if (!response.ok) {
          throw new Error("stats-unavailable");
        }
        const json = (await response.json()) as PublicImpactAggregate;
        // Cache the response
        setCache(cacheKey, json);
        if (active) {
          setPayload(json);
          // Use navigator data from any response to populate dropdowns
          if (json.navigator) {
            setNavigatorSnapshot((prev) => {
              // Country-level navigator has the most comprehensive data
              if (scope.level === "country" || !prev) return json.navigator;
              return prev;
            });
          }
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

  // Fetch country-level navigator only once for comprehensive dropdown data
  // (only if we don't already have it from initialPayload)
  useEffect(() => {
    if (navigatorSnapshot && navigatorSnapshot.schools.length > 0) {
      return; // Already have comprehensive navigator data
    }
    let active = true;
    const cacheKey = `country:Uganda:${period}`;
    async function fetchNavigatorSnapshot() {
      const cached = getCached(cacheKey);
      if (cached?.navigator) {
        if (active) setNavigatorSnapshot(cached.navigator);
        return;
      }
      try {
        const response = await fetch(
          `/api/impact/country?period=${encodeURIComponent(period)}`,
        );
        if (!response.ok) return;
        const json = (await response.json()) as PublicImpactAggregate;
        setCache(cacheKey, json);
        if (active) {
          setNavigatorSnapshot(json.navigator ?? null);
        }
      } catch {
        // Navigator is non-critical; keep going
      }
    }
    fetchNavigatorSnapshot();
    return () => {
      active = false;
    };
  }, [period, navigatorSnapshot]);

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
    setSelectionHistory([]);
    setSelection({ region: "", subRegion: "", district: "", school: "" });
  };

  const navigatorSchools =
    navigatorSnapshot?.schools ?? payload?.navigator?.schools ?? [];
  const selectedSchoolName = selection.school
    ? (navigatorSchools.find((school) => String(school.id) === selection.school)
        ?.name ?? null)
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
  const derivedReadingLevels = useMemo(
    () => deriveReadingLevelsFromOutcomes(payload?.outcomes),
    [payload?.outcomes],
  );
  const readingLevelsBaselineCycle =
    payload?.readingLevels?.distribution.find(
      (item) => item.cycle === "baseline",
    ) ?? null;
  const readingLevelsLatestCycle =
    payload?.readingLevels?.distribution.find(
      (item) => item.cycle === "endline",
    ) ??
    payload?.readingLevels?.distribution.find(
      (item) => item.cycle === "latest",
    ) ??
    null;
  const masteryDomains = payload?.masteryDomains ?? null;
  const readingStageDistribution = payload?.readingStageDistribution ?? [];
  const benchmarkStatus = payload?.benchmarkStatus ?? null;
  const trafficLightExplanations = payload?.publicExplanation ?? {
    green: "Green means the learner has mastered the skill.",
    amber:
      "Amber means the learner is developing but needs more speed or consistency.",
    red: "Red means the learner needs targeted support.",
  };
  const readingLevelLabels =
    payload?.readingLevels?.levels?.map((item) => item.label) ?? READING_LEVELS;
  const fluentReaderShare =
    readingLevelsLatestCycle?.percents?.Fluent ??
    readingLevelsLatestCycle?.percents?.["Transitional"] ??
    null;
  const benchmarkShare = benchmarkStatus
    ? (benchmarkStatus.atExpected.percent ?? 0) +
      (benchmarkStatus.aboveExpected.percent ?? 0)
    : null;
  const movedUpShare =
    payload?.readingLevels?.movement?.moved_up_1plus_percent ?? null;
  const masteryDomainRows = Object.entries(masteryDomains ?? {})
    .map(([key, value]) => ({
      key,
      label:
        LEARNING_DOMAIN_DICTIONARY[
          key as keyof typeof LEARNING_DOMAIN_DICTIONARY
        ]?.label_short ?? key,
      green: value.green.percent,
      amber: value.amber.percent,
      red: value.red.percent,
      n: value.n,
    }))
    .sort((left, right) => right.green - left.green)
    .slice(0, 4);
  const topReadingStages = readingStageDistribution.slice(0, 4);
  const teachingQuality = payload?.teachingQuality;
  const teachingLearningAlignment = payload?.teachingLearningAlignment;
  const teachingLearningAlignmentPoints =
    teachingLearningAlignment?.points ?? [];
  const fidelityDrivers = payload?.fidelity?.drivers ?? [];
  const mostImprovedRankings = payload?.rankings?.mostImproved ?? [];
  const prioritySupportRankings = payload?.rankings?.prioritySupport ?? [];
  const kpis = payload?.kpis;
  const teachersSupportedTotal =
    (kpis?.teachersSupportedMale ?? 0) + (kpis?.teachersSupportedFemale ?? 0);
  const alignmentSummary = teachingLearningAlignment?.summary;
  const latestAlignmentPoint =
    teachingLearningAlignmentPoints.length > 0
      ? teachingLearningAlignmentPoints[
          teachingLearningAlignmentPoints.length - 1
        ]
      : null;
  const previousAlignmentPoint =
    teachingLearningAlignmentPoints.length > 1
      ? teachingLearningAlignmentPoints[
          teachingLearningAlignmentPoints.length - 2
        ]
      : null;
  const storySessionsDelta =
    latestAlignmentPoint && previousAlignmentPoint
      ? latestAlignmentPoint.storySessionsCount -
        previousAlignmentPoint.storySessionsCount
      : null;

  const momentumCards = [
    {
      label: "Schools supported",
      value: (kpis?.schoolsSupported ?? 0).toLocaleString(),
      helper: "Current implementation footprint",
    },
    {
      label: "Learners assessed",
      value: (kpis?.learnersAssessedUnique ?? 0).toLocaleString(),
      helper: "Directly assessed learners (n)",
    },
    {
      label: "Teachers supported",
      value: teachersSupportedTotal.toLocaleString(),
      helper: "Male + female reading teachers",
    },
    {
      label: "Teaching quality change",
      value: formatSignedDelta(alignmentSummary?.teachingDelta, { digits: 2 }),
      helper: "Average lesson quality delta",
    },
    {
      label: "Non-reader reduction",
      value: formatSignedDelta(alignmentSummary?.nonReaderReductionPp, {
        digits: 1,
        suffix: " pp",
      }),
      helper: "Baseline to latest period",
    },
    {
      label: "20+ CWPM gain",
      value: formatSignedDelta(alignmentSummary?.cwpm20PlusDeltaPp, {
        digits: 1,
        suffix: " pp",
      }),
      helper: "Fluency benchmark movement",
    },
    {
      label: "Story sessions change",
      value:
        typeof storySessionsDelta === "number"
          ? formatSignedDelta(storySessionsDelta, { digits: 0 })
          : "Data not available",
      helper: previousAlignmentPoint
        ? "Latest period vs prior period"
        : "Need at least 2 periods",
    },
    {
      label: "Assessment completion",
      value: `${(kpis?.assessmentCycleCompletionPct ?? 0).toFixed(1)}%`,
      helper: "Scope-level cycle completion",
    },
    {
      label: "At / above benchmark",
      value:
        typeof benchmarkShare === "number" && Number.isFinite(benchmarkShare)
          ? `${benchmarkShare.toFixed(1)}%`
          : "Data not available",
      helper: "Directly from learner outcome records",
    },
    {
      label: "Moved up 1+ reading level",
      value:
        typeof movedUpShare === "number" && Number.isFinite(movedUpShare)
          ? `${movedUpShare.toFixed(1)}%`
          : "Data not available",
      helper: "Matched baseline-to-latest learners",
    },
    {
      label: "Online sessions",
      value: (kpis?.onlineLiveSessionsCovered ?? 0).toLocaleString(),
      helper: "Live & completed virtual sessions",
    },
  ];

  const funnelStages = [
    {
      label: "Schools trained",
      value: payload?.funnel?.trained ?? 0,
      helper: "Capacity-building entry point",
    },
    {
      label: "Coached / visited",
      value: payload?.funnel?.coached ?? 0,
      helper: "Ongoing implementation support",
    },
    {
      label: "Baseline assessed",
      value: payload?.funnel?.baselineAssessed ?? 0,
      helper: "Initial learner evidence",
    },
    {
      label: "Endline assessed",
      value: payload?.funnel?.endlineAssessed ?? 0,
      helper: "Measured outcome follow-through",
    },
    {
      label: "Story active schools",
      value: payload?.funnel?.storyActive ?? 0,
      helper: "Reading culture extension",
    },
    {
      label: "Online sessions reached",
      value: payload?.kpis?.onlineSchoolsReachedCount ?? 0,
      helper: "Schools reached via virtual sessions",
    },
  ];
  const funnelBaseline = Math.max(funnelStages[0]?.value ?? 0, 1);
  const funnelPeak = Math.max(1, ...funnelStages.map((item) => item.value));
  const funnelRows = funnelStages.map((stage, index) => {
    const previous =
      index === 0 ? stage.value : (funnelStages[index - 1]?.value ?? 0);
    const stepRate =
      previous > 0 ? (stage.value / previous) * 100 : index === 0 ? 100 : 0;
    const cumulativeRate = (stage.value / funnelBaseline) * 100;
    return {
      ...stage,
      stepRate,
      cumulativeRate,
      widthPct: (stage.value / funnelPeak) * 100,
    };
  });

  const teachingTrendPoints = (payload?.teachingQuality?.trend ?? [])
    .filter(
      (point) =>
        typeof point.averageScore === "number" &&
        Number.isFinite(point.averageScore),
    )
    .slice(-8);
  const teachingTrendMax = Math.max(
    1,
    ...teachingTrendPoints.map((point) => point.averageScore ?? 0),
  );

  return (
    <section
      className={`impact-explorer ${compact ? "impact-explorer--compact" : ""}`}
    >
      {compact ? (
        <header className="impact-explorer-header">
          <div>
            <h2>Live Literacy Impact Dashboard</h2>
            <p>
              Aggregated, privacy-protected classroom data. Updated regularly.
            </p>
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
        <div className="impact-explorer-status">
          <p>{breadcrumb.join(" > ")}</p>
          {payload?.meta?.dataCompleteness === "Complete" ? (
            <span
              className="badge badge-success"
              title="All schools in this scope have submitted reports for this period"
            >
              ✓ Data Complete
            </span>
          ) : (
            <span
              className="badge badge-warning"
              title="Some schools in this scope haven't submitted report yet"
            >
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
            Open Report
          </a>
          <a
            className="button"
            href={reportEnginePdfHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download PDF
          </a>
        </div>
        <button
          type="button"
          className="impact-map-clear-link"
          onClick={onReset}
        >
          Clear
        </button>
      </div>

      <div className="impact-explorer-layout">
        <div className="mb-2">
          <HeadlineStatsPanel
            data={payload}
            loading={loading}
            detailHref={detailHref}
            compact={compact}
          />
        </div>

        <div className="impact-top-canvas">
          <UgandaImpactMapPro
            periodLabel={period}
            selection={{
              region: selection.region,
              subRegion: selection.subRegion,
              district: selection.district,
              school: selection.school,
            }}
            activeSchoolName={
              navigatorSchools.find((s) => s.id.toString() === selection.school)
                ?.name
            }
            onSelectionChange={(next) =>
              onSelectionChange({
                region: next.region,
                subRegion: next.subRegion,
                district: next.district,
                school: next.school ?? "",
              })
            }
            districtSearchOptions={districtSearchOptions}
            compact={compact}
          />
        </div>

        <div className="impact-metrics-trio-wrapper">
          {error ? (
            <article className="card impact-error-card mt-3">
              <h3>Stats temporarily unavailable</h3>
              <p>Please try again. You can still explore using filters.</p>
            </article>
          ) : null}
          {payload && payload.kpis.schoolsSupported === 0 ? (
            <article className="card impact-empty-card mt-3">
              <h3>No published data yet</h3>
              <p>
                We don&apos;t have reported activity for {payload.scope.name} in{" "}
                {payload.period.label}. Try another district or check back
                later.
              </p>
            </article>
          ) : null}
          <div className="impact-metrics-trio">
            {/* Column 1: Location Navigator */}
            <div className="impact-trio-col">
              <LocationNavigator
                period={period}
                onPeriodChange={setPeriod}
                selection={selection}
                navigatorSchools={navigatorSchools}
                onSelectionChange={onSelectionChange}
                onReset={onReset}
                onBack={onBack}
              />
            </div>

            {/* Column 2: Momentum & Progress */}
            <div className="impact-trio-col">
              {!compact ? (
                <article className="card impact-attract-card impact-attract-card--momentum">
                  <header>
                    <h3>What Changed This Period</h3>
                    <p>
                      Quick momentum indicators to understand impact movement at
                      a glance.
                    </p>
                  </header>
                  <div className="impact-attract-momentum-grid">
                    {momentumCards.map((item) => (
                      <article key={item.label}>
                        <span>{item.label}</span>
                        <strong>{loading ? "Loading..." : item.value}</strong>
                        <small>{item.helper}</small>
                      </article>
                    ))}
                  </div>
                </article>
              ) : null}
              {!compact ? (
                <div className="impact-tracker-banner">
                  <article className="card impact-attract-card impact-attract-card--progress">
                    <header>
                      <h3>Reading Progress Tracker</h3>
                      <p>
                        Assessment-domain evidence tied directly to reading
                        stages and benchmark status.
                      </p>
                    </header>
                    <div className="impact-attract-progress-grid">
                      <article>
                        <span>Fluent reader share</span>
                        <strong>
                          {loading
                            ? "Loading..."
                            : typeof fluentReaderShare === "number"
                              ? `${fluentReaderShare.toFixed(1)}%`
                              : "Data not available"}
                        </strong>
                        <small>Latest reading-level distribution</small>
                      </article>
                      <article>
                        <span>At / above benchmark</span>
                        <strong>
                          {loading
                            ? "Loading..."
                            : typeof benchmarkShare === "number"
                              ? `${benchmarkShare.toFixed(1)}%`
                              : "Data not available"}
                        </strong>
                        <small>Expected-vs-actual status from the DB</small>
                      </article>
                      <article>
                        <span>Moved up 1+ level</span>
                        <strong>
                          {loading
                            ? "Loading..."
                            : typeof movedUpShare === "number"
                              ? `${movedUpShare.toFixed(1)}%`
                              : "Data not available"}
                        </strong>
                        <small>Matched learners only</small>
                      </article>
                      <article>
                        <span>Tracked reading stages</span>
                        <strong>
                          {loading
                            ? "Loading..."
                            : readingStageDistribution.length.toLocaleString()}
                        </strong>
                        <small>Stage bands currently computed</small>
                      </article>
                    </div>
                    {(masteryDomainRows.length > 0 ||
                      topReadingStages.length > 0) && (
                      <div className="impact-attract-progress-lists">
                        {masteryDomainRows.length > 0 && (
                          <div>
                            <h4>Strongest Mastery Domains</h4>
                            {masteryDomainRows.map((row) => (
                              <div
                                key={row.key}
                                className="impact-attract-progress-row"
                              >
                                <strong>{row.label}</strong>
                                <span>
                                  Green {row.green.toFixed(1)}% • Amber{" "}
                                  {row.amber.toFixed(1)}% • Red{" "}
                                  {row.red.toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {topReadingStages.length > 0 && (
                          <div>
                            <h4>Latest Reading Stage Mix</h4>
                            {topReadingStages.map((row) => (
                              <div
                                key={row.label}
                                className="impact-attract-progress-row"
                              >
                                <strong>{row.label}</strong>
                                <span>
                                  {row.percent.toFixed(1)}% • n=
                                  {row.count.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                </div>
              ) : null}
            </div>

            {/* Column 3: Trust, Funnel, Tabs */}
            <div className="impact-trio-col">
              {!compact ? (
                <article className="card impact-attract-card impact-attract-card--trust">
                  <header>
                    <h3>Data Trust & Action Center</h3>
                    <p>
                      Transparency details and next actions for partners and
                      supporters.
                    </p>
                  </header>
                  <div className="impact-attract-trust-stats">
                    <p>
                      Completeness:{" "}
                      <strong>
                        {loading
                          ? "Loading..."
                          : payload?.meta?.dataCompleteness === "Complete"
                            ? "Complete"
                            : "Partial"}
                      </strong>
                    </p>
                    <p>
                      Sample size (n):{" "}
                      <strong>
                        {loading
                          ? "Loading..."
                          : (payload?.meta?.sampleSize ?? 0).toLocaleString()}
                      </strong>
                    </p>
                    <p>
                      Last updated:{" "}
                      <strong>
                        {loading
                          ? "Loading..."
                          : payload?.meta?.lastUpdated
                            ? new Date(payload.meta.lastUpdated).toLocaleString(
                                "en-GB",
                              )
                            : "Data not available"}
                      </strong>
                    </p>
                  </div>
                  {teachingTrendPoints.length > 0 ? (
                    <div
                      className="impact-attract-trend"
                      role="img"
                      aria-label="Teaching quality trend over recent periods"
                    >
                      {teachingTrendPoints.map((point) => {
                        const average = point.averageScore ?? 0;
                        const heightPct = (average / teachingTrendMax) * 100;
                        return (
                          <div
                            key={point.period}
                            className="impact-attract-trend-bar"
                          >
                            <i
                              style={{ height: `${Math.max(heightPct, 8)}%` }}
                            />
                            <span>{point.period}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="impact-mini-footer">
                      Trend data not available for this scope/period.
                    </p>
                  )}
                  <p className="impact-mini-footer">
                    {teachingLearningAlignment?.caveat ??
                      "Data is aggregated from verified submissions only."}
                  </p>
                  <div className="impact-attract-actions">
                    <Link className="button" href="/sponsor-a-district">
                      Sponsor a District
                    </Link>
                    <Link
                      className="button button-ghost"
                      href="/impact#reports"
                    >
                      Download Reports
                    </Link>
                    <Link
                      className="inline-download-link"
                      href="/impact/case-studies"
                    >
                      Read Change Stories
                    </Link>
                  </div>
                </article>
              ) : null}
              {!compact ? (
                <article className="card impact-attract-card impact-attract-card--funnel">
                  <header>
                    <h3>Implementation Conversion Funnel</h3>
                    <p>
                      From initial training to measured endline outcomes and
                      story activation.
                    </p>
                  </header>
                  <div className="impact-attract-funnel-list">
                    {funnelRows.map((row) => (
                      <article key={row.label}>
                        <div className="impact-attract-funnel-head">
                          <strong>{row.label}</strong>
                          <span>
                            {loading
                              ? "Loading..."
                              : row.value.toLocaleString()}
                          </span>
                        </div>
                        <div
                          className="impact-attract-funnel-track"
                          aria-hidden="true"
                        >
                          <i
                            style={{
                              width: `${Math.max(row.widthPct, row.value > 0 ? 6 : 0)}%`,
                            }}
                          />
                        </div>
                        <p>
                          {row.helper} • Step retention:{" "}
                          <strong>
                            {loading
                              ? "Loading..."
                              : `${row.stepRate.toFixed(1)}%`}
                          </strong>{" "}
                          • Cumulative:{" "}
                          <strong>
                            {loading
                              ? "Loading..."
                              : `${row.cumulativeRate.toFixed(1)}%`}
                          </strong>
                        </p>
                      </article>
                    ))}
                  </div>
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
            </div>
          </div>
        </div>
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
              Scores reflect average learner performance. Benchmark
              interpretation follows mastery progression by domain.
            </p>
            {masteryDomains ? (
              <>
                <h4 style={{ marginTop: "1rem" }}>
                  Mastery Traffic-Light Distribution
                </h4>
                <div className="impact-domain-mini-grid">
                  {OUTCOME_DOMAIN_CONFIG.map((item) => {
                    const domainMap: Record<
                      string,
                      keyof typeof masteryDomains
                    > = {
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
                      <article
                        className="impact-domain-mini-card"
                        key={`mastery-${item.key}`}
                      >
                        <h4>
                          {
                            LEARNING_DOMAIN_DICTIONARY[item.domainKey]
                              .label_short
                          }
                        </h4>
                        <p className="impact-domain-mini-meta">
                          Green: <strong>{mastery.green.percent}%</strong> (
                          {mastery.green.count})
                        </p>
                        <p className="impact-domain-mini-meta">
                          Amber: <strong>{mastery.amber.percent}%</strong> (
                          {mastery.amber.count})
                        </p>
                        <p className="impact-domain-mini-meta">
                          Red: <strong>{mastery.red.percent}%</strong> (
                          {mastery.red.count})
                        </p>
                        <p className="impact-domain-mini-meta">
                          n = {mastery.n.toLocaleString()}
                        </p>
                      </article>
                    );
                  })}
                </div>
                {benchmarkStatus ? (
                  <p className="impact-mini-footer">
                    Benchmark status: Below expected{" "}
                    {benchmarkStatus.belowExpected.percent}%, At expected{" "}
                    {benchmarkStatus.atExpected.percent}%, Above expected{" "}
                    {benchmarkStatus.aboveExpected.percent}% (n=
                    {benchmarkStatus.n}).
                  </p>
                ) : null}
                <p className="impact-mini-footer">
                  {trafficLightExplanations.green}{" "}
                  {trafficLightExplanations.amber}{" "}
                  {trafficLightExplanations.red}
                </p>
              </>
            ) : null}
          </article>
        )}

        {activeTab === "readingLevels" && (
          <article className="card">
            <h3>Reading Stages & Benchmark Alignment</h3>
            {loading ? (
              <p>Loading reading levels...</p>
            ) : derivedReadingLevels ? (
              <div className="impact-reading-level-panel">
                {readingStageDistribution.length > 0 ? (
                  <div className="impact-reading-level-summary-grid">
                    {readingStageDistribution.map((row) => (
                      <article key={`stage-${row.label}`}>
                        <span>{row.label}</span>
                        <strong>{row.percent.toFixed(1)}%</strong>
                        <small>{row.count.toLocaleString()} learners</small>
                      </article>
                    ))}
                  </div>
                ) : null}
                {benchmarkStatus ? (
                  <p className="impact-mini-footer">
                    Expected benchmark alignment: Below{" "}
                    {benchmarkStatus.belowExpected.percent}%, At{" "}
                    {benchmarkStatus.atExpected.percent}%, Above{" "}
                    {benchmarkStatus.aboveExpected.percent}%.
                  </p>
                ) : null}
                <div className="impact-reading-level-summary-grid">
                  <article>
                    <span>Baseline level</span>
                    <strong>
                      {derivedReadingLevels.baselineLevel ??
                        "Data not available"}
                    </strong>
                    <small>
                      {formatCompositeScore(
                        derivedReadingLevels.baselineAverage,
                      )}
                    </small>
                  </article>
                  <article>
                    <span>Latest level</span>
                    <strong>
                      {derivedReadingLevels.latestLevel ?? "Data not available"}
                    </strong>
                    <small>
                      {formatCompositeScore(derivedReadingLevels.latestAverage)}
                    </small>
                  </article>
                  <article>
                    <span>Movement</span>
                    <strong>{derivedReadingLevels.movementLabel}</strong>
                    <small>
                      Derived from baseline vs latest domain profile
                    </small>
                  </article>
                </div>

                {readingLevelsBaselineCycle && readingLevelsLatestCycle ? (
                  <div className="impact-reading-level-distribution">
                    <div>
                      <div className="impact-reading-level-distribution-head">
                        <span>Baseline distribution</span>
                        <strong>
                          n={readingLevelsBaselineCycle.n.toLocaleString()}
                        </strong>
                      </div>
                      <div
                        className="impact-reading-level-stack"
                        role="img"
                        aria-label="Baseline reading-level distribution"
                      >
                        {readingLevelLabels.map((label, index) => {
                          const percent =
                            readingLevelsBaselineCycle.percents[label] ?? 0;
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
                        <strong>
                          n={readingLevelsLatestCycle.n.toLocaleString()}
                        </strong>
                      </div>
                      <div
                        className="impact-reading-level-stack"
                        role="img"
                        aria-label="Latest reading-level distribution"
                      >
                        {readingLevelLabels.map((label, index) => {
                          const percent =
                            readingLevelsLatestCycle.percents[label] ?? 0;
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
                          <i
                            style={{
                              background: readingLevelColor(label, index),
                            }}
                          />
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
                          <td>
                            {typeof row.baseline === "number"
                              ? row.baseline.toFixed(1)
                              : "Data not available"}
                          </td>
                          <td>
                            {typeof row.latest === "number"
                              ? row.latest.toFixed(1)
                              : "Data not available"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="impact-mini-footer">
                  Reading levels are computed from the six assessment outcome
                  domains:{" "}
                  {OUTCOME_DOMAIN_CONFIG.map(
                    (item) =>
                      LEARNING_DOMAIN_DICTIONARY[item.domainKey].label_short,
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
                  {loading
                    ? "Loading..."
                    : (payload?.funnel?.trained ?? 0).toLocaleString()}
                </strong>
                <span>Direct capacity building</span>
              </div>
              <div>
                <span>Coached / Visited</span>
                <strong>
                  {loading
                    ? "Loading..."
                    : (payload?.funnel?.coached ?? 0).toLocaleString()}
                </strong>
                <span>Ongoing field support</span>
              </div>
              <div>
                <span>Baseline Assessed</span>
                <strong>
                  {loading
                    ? "Loading..."
                    : (payload?.funnel?.baselineAssessed ?? 0).toLocaleString()}
                </strong>
                <span>Initial learner data</span>
              </div>
              <div>
                <span>Endline Assessed</span>
                <strong>
                  {loading
                    ? "Loading..."
                    : (payload?.funnel?.endlineAssessed ?? 0).toLocaleString()}
                </strong>
                <span>Impact measurement</span>
              </div>
              <div>
                <span>1001 Story Active</span>
                <strong>
                  {loading
                    ? "Loading..."
                    : (payload?.funnel?.storyActive ?? 0).toLocaleString()}
                </strong>
                <span>Creative literacy extension</span>
              </div>
              <div>
                <span>Online Sessions</span>
                <strong>
                  {loading
                    ? "Loading..."
                    : (
                        payload?.kpis?.onlineLiveSessionsCovered ?? 0
                      ).toLocaleString()}
                </strong>
                <span>Virtual training sessions held</span>
              </div>
            </div>
          </article>
        )}

        {activeTab === "teaching" && (
          <article className="card impact-teaching-card">
            <h3>Teaching Quality (Lesson Evaluations)</h3>
            <p className="impact-mini-footer impact-teaching-scope">
              Scope: {payload?.scope?.name ?? "Uganda"} (
              {payload?.scope?.level ?? "country"})
            </p>
            {teachingQuality?.evaluationsCount ? (
              <div className="impact-teaching-quality-grid">
                <article className="impact-domain-mini-card">
                  <h4>Evaluations</h4>
                  <p>
                    <strong>
                      {teachingQuality.evaluationsCount.toLocaleString()}
                    </strong>
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
                      ? new Date(
                          teachingQuality.lastUpdated,
                        ).toLocaleDateString("en-GB")
                      : "Data not available"}
                  </p>
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Overall Levels</h4>
                  <p className="impact-domain-mini-meta">
                    Strong:{" "}
                    <strong>
                      {teachingQuality.levelDistribution?.strong?.percent ?? 0}%
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Good:{" "}
                    <strong>
                      {teachingQuality.levelDistribution?.good?.percent ?? 0}%
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Developing:{" "}
                    <strong>
                      {teachingQuality.levelDistribution?.developing?.percent ??
                        0}
                      %
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Needs support:{" "}
                    <strong>
                      {teachingQuality.levelDistribution?.needsSupport
                        ?.percent ?? 0}
                      %
                    </strong>
                  </p>
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Domain Averages (/4)</h4>
                  {[
                    [
                      "Setup & Review",
                      teachingQuality.domainAverages?.setup ?? null,
                    ],
                    [
                      "New Sound/Skill",
                      teachingQuality.domainAverages?.newSound ?? null,
                    ],
                    [
                      "Decoding",
                      teachingQuality.domainAverages?.decoding ?? null,
                    ],
                    [
                      "Reading Practice",
                      teachingQuality.domainAverages?.readingPractice ?? null,
                    ],
                    [
                      "Tricky Words",
                      teachingQuality.domainAverages?.trickyWords ?? null,
                    ],
                    [
                      "Check & Next Steps",
                      teachingQuality.domainAverages?.checkNext ?? null,
                    ],
                  ].map(([label, value]) => (
                    <p className="impact-domain-mini-meta" key={label}>
                      {label}:{" "}
                      <strong>
                        {typeof value === "number" ? value.toFixed(2) : "N/A"}
                      </strong>
                    </p>
                  ))}
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Top Coaching Focus Areas</h4>
                  {(teachingQuality.topCoachingFocusAreas ?? []).length > 0 ? (
                    (teachingQuality.topCoachingFocusAreas ?? []).map(
                      (area) => (
                        <p className="impact-domain-mini-meta" key={area}>
                          • {area}
                        </p>
                      ),
                    )
                  ) : (
                    <p className="impact-domain-mini-meta">
                      Data not available
                    </p>
                  )}
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Improvement Since Baseline</h4>
                  <p className="impact-domain-mini-meta">
                    Teachers improved:{" "}
                    <strong>
                      {typeof teachingQuality.improvedTeachersPercent ===
                      "number"
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
                      {typeof teachingQuality.schoolsImprovedPercent ===
                      "number"
                        ? `${teachingQuality.schoolsImprovedPercent.toFixed(1)}%`
                        : "Data not available"}
                    </strong>
                  </p>
                </article>

                <article className="impact-domain-mini-card">
                  <h4>Domain Change (Baseline → Latest)</h4>
                  {[
                    [
                      "Setup & Review",
                      teachingQuality.domainDeltas?.setup ?? null,
                    ],
                    [
                      "New Sound/Skill",
                      teachingQuality.domainDeltas?.newSound ?? null,
                    ],
                    [
                      "Decoding",
                      teachingQuality.domainDeltas?.decoding ?? null,
                    ],
                    [
                      "Reading Practice",
                      teachingQuality.domainDeltas?.readingPractice ?? null,
                    ],
                    [
                      "Tricky Words",
                      teachingQuality.domainDeltas?.trickyWords ?? null,
                    ],
                    [
                      "Check & Next Steps",
                      teachingQuality.domainDeltas?.checkNext ?? null,
                    ],
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
              <p>
                Data not available for lesson evaluations in this scope/period.
              </p>
            )}

            <h3 className="impact-teaching-subtitle">
              Teaching → Learning Alignment
            </h3>
            {teachingLearningAlignmentPoints.length ? (
              <div className="impact-domain-mini-grid impact-domain-mini-grid--teaching">
                <article className="impact-domain-mini-card impact-domain-mini-card--compact">
                  <h4>Aligned trend summary</h4>
                  <p className="impact-domain-mini-meta">
                    Teaching quality delta:{" "}
                    <strong>
                      {typeof teachingLearningAlignment?.summary
                        ?.teachingDelta === "number"
                        ? `${teachingLearningAlignment.summary.teachingDelta > 0 ? "+" : ""}${teachingLearningAlignment.summary.teachingDelta.toFixed(2)}`
                        : "Data not available"}
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    Non-reader reduction:{" "}
                    <strong>
                      {typeof teachingLearningAlignment?.summary
                        ?.nonReaderReductionPp === "number"
                        ? `${teachingLearningAlignment.summary.nonReaderReductionPp.toFixed(2)} pp`
                        : "Data not available"}
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    20+ CWPM delta:{" "}
                    <strong>
                      {typeof teachingLearningAlignment?.summary
                        ?.cwpm20PlusDeltaPp === "number"
                        ? `${teachingLearningAlignment.summary.cwpm20PlusDeltaPp > 0 ? "+" : ""}${teachingLearningAlignment.summary.cwpm20PlusDeltaPp.toFixed(2)} pp`
                        : "Data not available"}
                    </strong>
                  </p>
                  <p className="impact-domain-mini-meta">
                    1001 Story sessions (latest):{" "}
                    <strong>
                      {teachingLearningAlignment?.summary
                        ?.storySessionsLatest ?? 0}
                    </strong>
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
                          <th
                            title={
                              LEARNING_DOMAIN_DICTIONARY.comprehension
                                .description
                            }
                          >
                            {
                              LEARNING_DOMAIN_DICTIONARY.comprehension
                                .label_short
                            }
                          </th>
                          <th>Non-reader %</th>
                          <th>20+ CWPM %</th>
                          <th>Story sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachingLearningAlignmentPoints
                          .slice(-8)
                          .map((point) => (
                            <tr key={point.period}>
                              <td>{point.period}</td>
                              <td>
                                {typeof point.teachingQualityAvg === "number"
                                  ? point.teachingQualityAvg.toFixed(2)
                                  : "N/A"}
                              </td>
                              <td>
                                {typeof point.decodingAvg === "number"
                                  ? point.decodingAvg.toFixed(2)
                                  : "N/A"}
                              </td>
                              <td>
                                {typeof point.fluencyAvg === "number"
                                  ? point.fluencyAvg.toFixed(2)
                                  : "N/A"}
                              </td>
                              <td>
                                {typeof point.comprehensionAvg === "number"
                                  ? point.comprehensionAvg.toFixed(2)
                                  : "N/A"}
                              </td>
                              <td>
                                {typeof point.nonReaderPct === "number"
                                  ? `${point.nonReaderPct.toFixed(1)}%`
                                  : "N/A"}
                              </td>
                              <td>
                                {typeof point.cwpm20PlusPct === "number"
                                  ? `${point.cwpm20PlusPct.toFixed(1)}%`
                                  : "N/A"}
                              </td>
                              <td>
                                {point.storySessionsCount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="impact-mini-footer">
                    {teachingLearningAlignment?.caveat ??
                      "Data reflects aligned trend points only."}
                  </p>
                </article>
              </div>
            ) : (
              <p>
                Data not available for aligned teaching, learner, and story
                trends in this scope.
              </p>
            )}

            <h3 className="impact-teaching-subtitle">
              Implementation Fidelity
            </h3>
            <div className="impact-auto-grid impact-auto-grid--teaching">
              <div className="impact-domain-mini-card">
                <h4>Fidelity Score</h4>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-4xl font-bold">
                    {payload?.fidelity?.score ?? 0}%
                  </div>
                  <div
                    className={`badge badge-${String(
                      payload?.fidelity?.band ?? "developing",
                    )
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {payload?.fidelity?.band ?? "Developing"}
                  </div>
                </div>
                <p className="mt-4 text-gray-600">
                  Combined metric of coaching coverage, assessment compliance,
                  and observed teaching standards.
                </p>
              </div>
              <div
                className="impact-domain-mini-card"
                style={{ display: "grid", gap: "0.45rem" }}
              >
                {fidelityDrivers.map((driver) => (
                  <div
                    key={driver.key}
                    className="flex justify-between p-2 bg-gray-50 rounded"
                  >
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
                    <div
                      key={item.name}
                      className="flex justify-between p-2 border-b"
                    >
                      <span>{item.name}</span>
                      <span className="text-orange-600 font-bold">
                        +{item.score} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4>Support Priority Score</h4>
                <div className="mt-2 flex flex-col gap-2">
                  {prioritySupportRankings.map((item) => (
                    <div
                      key={item.name}
                      className="flex justify-between p-2 border-b"
                    >
                      <span>{item.name}</span>
                      <span className="text-orange-600 font-bold">
                        {item.score}
                      </span>
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
                <div className="text-3xl font-bold mt-2">
                  {payload?.meta?.sampleSize ?? 0}
                </div>
                <p className="text-gray-600">
                  Total verified record submissions in this period.
                </p>
              </div>
              <div className="impact-domain-mini-card">
                <h4>Completeness Status</h4>
                <div className="mt-2">
                  {payload?.meta?.dataCompleteness === "Complete" ? (
                    <span className="text-orange-600 font-bold">
                      ✓ High (100% submission)
                    </span>
                  ) : (
                    <span className="text-orange-600 font-bold">
                      ⚠ Partial (Reporting in progress)
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mt-2">
                  Last updated:{" "}
                  {new Date(
                    payload?.meta?.lastUpdated ?? "",
                  ).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
