"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  stableDistrictId,
  stableSubRegionId,
  UGANDA_MAP_SUB_REGIONS,
  UgandaMapSubRegionName,
} from "@/lib/uganda-map-taxonomy";
import {
  GEO_DISTRICT_BOUNDARIES,
  GEO_SUBREGION_BOUNDARIES,
  GEO_MAP_VIEWBOX,
  type GeoDistrictBoundary,
} from "@/lib/uganda-geojson-boundaries";
import { PublicImpactAggregate } from "@/lib/types";
import {
  getReadingLevelPerformanceSummary,
  type ReadingLevelPerformanceSummary,
} from "@/lib/reading-level-performance";
import { FloatingMetric, FloatingStatCard } from "./FloatingStatCard";
import { MapStatsBottomSheet } from "./MapStatsBottomSheet";
import { useHoverIntent } from "./useHoverIntent";
import { useSmartPositioning } from "./useSmartPositioning";
import { useMapZoom } from "./useMapZoom";
import { DistrictSearchInput } from "./DistrictSearchInput";

/** Sub-region fill colors inspired by the UBOS reference map. */
const SUB_REGION_COLORS: Record<UgandaMapSubRegionName, string> = {
  Acholi: "rgba(173,216,230,0.45)",
  Central: "rgba(255, 170, 120, 0.40)",
  "East Central": "rgba(255,228,196,0.45)",
  Elgon: "rgba(255,182,108,0.40)",
  Karamoja: "rgba(221,160,221,0.40)",
  Lango: "rgba(176,196,222,0.45)",
  "South Western": "rgba(255,218,185,0.45)",
  Teso: "rgba(255, 190, 140, 0.40)",
  "West Nile": "rgba(255,182,193,0.40)",
  Western: "rgba(240,230,140,0.40)",
};

type HoverLevel = "district" | "subregion";

type MapSelection = {
  region: string;
  subRegion: string;
  district: string;
  school?: string;
};

type MapTarget = {
  level: "country" | "region" | "subregion" | "district" | "school";
  id: string;
  label: string;
  chip: "Country" | "Region" | "Sub-region" | "District" | "School";
  profileHref?: string;
};

type BestDistrictReadingPerformance = {
  district: string;
  performance: ReadingLevelPerformanceSummary;
};

type UgandaImpactMapProProps = {
  periodLabel: string;
  selection: MapSelection;
  activeSchoolName?: string;
  onSelectionChange: (next: MapSelection) => void;
  districtSearchOptions?: Array<{ district: string; subRegion: string }>;
  compact?: boolean;
  className?: string;
};

function pathForTarget(target: MapTarget, periodLabel: string) {
  const period = encodeURIComponent(periodLabel);
  if (target.level === "country") {
    return `/api/impact/country?period=${period}`;
  }
  if (target.level === "region") {
    return `/api/impact/region/${encodeURIComponent(target.id)}?period=${period}`;
  }
  if (target.level === "subregion") {
    return `/api/impact/subregion/${encodeURIComponent(target.id)}?period=${period}`;
  }
  if (target.level === "school") {
    return `/api/impact/school/${encodeURIComponent(target.id)}?period=${period}`;
  }
  return `/api/impact/district/${encodeURIComponent(target.id)}?period=${period}`;
}

function toFriendlyTime(value?: string) {
  if (!value) {
    return "Data not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Data not available";
  }
  return date.toLocaleString("en-GB");
}

function cycleLabel(cycle: string) {
  if (cycle === "endline") {
    return "endline";
  }
  if (cycle === "latest") {
    return "latest";
  }
  if (cycle === "progress") {
    return "progress";
  }
  return "baseline";
}

function toFloatingMetrics(
  data?: PublicImpactAggregate | null,
  bestDistrict?: BestDistrictReadingPerformance | null,
): FloatingMetric[] {
  if (!data) {
    return [
      { label: "Schools supported", value: "Data not available" },
      { label: "Learners directly impacted", value: "Data not available" },
      { label: "Overall impact", value: "Data not available" },
      { label: "Learners assessed (n)", value: "Data not available" },
      { label: "Teachers supported", value: "Data not available" },
      { label: "Assessments (B / P / E)", value: "Data not available" },
      { label: "Reading levels performance", value: "Data not available" },
      { label: "Vs best-performing district", value: "Data not available" },
      { label: "Coaching visits", value: "Data not available" },
    ];
  }

  const readingPerformance = getReadingLevelPerformanceSummary(data.readingLevels);
  const averagedReadingPerformance = data.readingLevelAverages?.scopeAveragePercent ?? null;
  const readingValue =
    averagedReadingPerformance !== null
      ? `${averagedReadingPerformance.toFixed(1)}%`
      : readingPerformance
        ? `${readingPerformance.performancePercent.toFixed(1)}%`
        : "Data not available";
  const readingHelperRows = data.readingLevelAverages?.scopeLevels ?? [];
  const readingHelper =
    readingHelperRows.length > 0
      ? `Avg by school: ${readingHelperRows
        .map((row) => `${row.label} ${row.percent.toFixed(1)}%`)
        .join(" | ")}`
      : readingPerformance
        ? `After ${cycleLabel(readingPerformance.cycle)} assessments (n=${readingPerformance.sampleSize.toLocaleString()})`
        : "Assessment distribution not available";
  const bestPerformance = bestDistrict?.performance ?? null;
  let comparisonValue = "Data not available";
  let comparisonHelper: string | undefined;

  const currentReadingPerformance = averagedReadingPerformance ?? readingPerformance?.performancePercent ?? null;
  if (currentReadingPerformance !== null && bestPerformance) {
    const delta = Number(
      (currentReadingPerformance - bestPerformance.performancePercent).toFixed(1),
    );
    const signedDelta = delta > 0 ? `+${delta.toFixed(1)} pp` : `${delta.toFixed(1)} pp`;
    comparisonValue =
      data.scope.level === "district" && data.scope.name === bestDistrict?.district
        ? "Top performer"
        : signedDelta;
    comparisonHelper = `Best district: ${bestDistrict?.district} (${bestPerformance.performancePercent.toFixed(1)}%)`;
  }

  return [
    {
      label: "Schools supported",
      value: data.kpis.schoolsSupported.toLocaleString(),
    },
    {
      label: "Learners directly impacted",
      value: data.kpis.learnersDirectlyImpacted.toLocaleString(),
      helper: "Baby, Middle, Top, P1, P2, P3",
    },
    {
      label: "Overall impact",
      value: data.kpis.enrollmentEstimatedReach.toLocaleString(),
      helper: "General enrollment (boys + girls)",
    },
    {
      label: "Learners assessed (n)",
      value: data.kpis.learnersAssessedUnique.toLocaleString(),
    },
    {
      label: "Teachers supported",
      value: `${data.kpis.teachersSupportedMale.toLocaleString()} M / ${data.kpis.teachersSupportedFemale.toLocaleString()} F`,
    },
    {
      label: "Online live sessions covered",
      value: data.kpis.onlineLiveSessionsCovered.toLocaleString(),
    },
    {
      label: "Teachers supported (online)",
      value: data.kpis.onlineTeachersSupported.toLocaleString(),
    },
    {
      label: "Assessments (B / P / E)",
      value: `${data.kpis.assessmentsBaselineCount.toLocaleString()} / ${data.kpis.assessmentsProgressCount.toLocaleString()} / ${data.kpis.assessmentsEndlineCount.toLocaleString()}`,
    },
    {
      label: "Reading levels performance",
      value: readingValue,
      helper: readingHelper,
    },
    {
      label: "Vs best-performing district",
      value: comparisonValue,
      helper: comparisonHelper,
    },
    {
      label: "Coaching visits",
      value: data.kpis.coachingVisitsCompleted.toLocaleString(),
    },
  ];
}

function getTargetFromSelection(selection: MapSelection): MapTarget {
  if (selection.district) {
    return {
      level: "district",
      id: selection.district,
      label: selection.district,
      chip: "District",
      profileHref: `/districts/${encodeURIComponent(selection.district)}`,
    };
  }
  if (selection.subRegion) {
    return {
      level: "subregion",
      id: selection.subRegion,
      label: selection.subRegion,
      chip: "Sub-region",
      profileHref: `/sub-regions/${encodeURIComponent(selection.subRegion)}`,
    };
  }
  if (selection.region) {
    return {
      level: "region",
      id: selection.region,
      label: selection.region,
      chip: "Region",
      profileHref: `/regions/${encodeURIComponent(selection.region)}`,
    };
  }
  return {
    level: "country",
    id: "Uganda",
    label: "Uganda",
    chip: "Country",
    profileHref: "/impact",
  };
}

export function UgandaImpactMapPro({
  periodLabel,
  selection,
  activeSchoolName,
  onSelectionChange,
  districtSearchOptions = [],
  compact = false,
  className,
}: UgandaImpactMapProProps) {
  const {
    containerRef,
    svgGroupRef,
    scale,
    zoomIn,
    zoomOut,
    resetView,
    fitBounds,
  } = useMapZoom({ minScale: 1, maxScale: 5 });
  const [hoverLevel, setHoverLevel] = useState<HoverLevel>("district");
  const [hoveredTarget, setHoveredTarget] = useState<MapTarget | null>(null);
  const [pinnedTarget, setPinnedTarget] = useState<MapTarget | null>(null);
  const [floatingPosition, setFloatingPosition] = useState<{ left: number; top: number } | null>(null);
  const [floatingCardSize, setFloatingCardSize] = useState<{ width: number; height: number }>(() => ({
    width: compact ? 300 : 330,
    height: compact ? 250 : 300,
  }));
  const [mobileSheetTarget, setMobileSheetTarget] = useState<MapTarget | null>(null);
  const [statsCache, setStatsCache] = useState<Record<string, PublicImpactAggregate>>({});
  const [bestDistrictStats, setBestDistrictStats] = useState<BestDistrictReadingPerformance | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mapMode, setMapMode] = useState<"coverage" | "improvement" | "fidelity">("coverage");

  const { isOpen, scheduleOpen, scheduleClose, forceOpen, forceClose } = useHoverIntent({
    openDelayMs: 95,
    closeDelayMs: 300,
  });
  const smartPosition = useSmartPositioning();
  const hoverCardGap = compact ? 24 : 32;

  useEffect(() => {
    setFloatingCardSize({
      width: compact ? 300 : 330,
      height: compact ? 250 : 300,
    });
  }, [compact]);

  const handleFloatingCardSizeChange = useCallback(
    (next: { width: number; height: number }) => {
      const minWidth = compact ? 300 : 330;
      const minHeight = compact ? 240 : 280;
      const width = Math.max(minWidth, Math.round(next.width));
      const height = Math.max(minHeight, Math.round(next.height));
      setFloatingCardSize((previous) => {
        if (previous.width === width && previous.height === height) {
          return previous;
        }
        return { width, height };
      });
    },
    [compact],
  );

  /** Compute bounding box of district paths for fitBounds. */
  const computePathsBbox = useCallback((districts: GeoDistrictBoundary[]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const d of districts) {
      const nums = d.pathData.match(/[\d.]+/g);
      if (!nums) continue;
      for (let i = 0; i < nums.length - 1; i += 2) {
        const x = parseFloat(nums[i] as string);
        const y = parseFloat(nums[i + 1] as string);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, []);

  useEffect(() => {
    const updateMedia = () => {
      setIsMobile(window.matchMedia("(max-width: 900px)").matches);
    };
    updateMedia();
    window.addEventListener("resize", updateMedia);
    return () => {
      window.removeEventListener("resize", updateMedia);
    };
  }, []);

  const hasDistrictSelection = Boolean(selection.district);
  const activeSubRegionFilter = hasDistrictSelection ? "" : selection.subRegion;

  const districtPaths: GeoDistrictBoundary[] = useMemo(() => {
    if (activeSubRegionFilter) {
      return GEO_DISTRICT_BOUNDARIES.filter(
        (d) => d.subRegion === activeSubRegionFilter,
      );
    }
    return GEO_DISTRICT_BOUNDARIES;
  }, [activeSubRegionFilter]);

  /* ── Fixed viewBox — zoom/pan is handled by CSS transform ── */
  const viewBox = `0 0 ${GEO_MAP_VIEWBOX.width} ${GEO_MAP_VIEWBOX.height}`;

  /* ── Compute font size for district labels scaled inversely to zoom ── */
  const districtLabelSize = useMemo(() => {
    // At higher zoom, shrink SVG-unit font so labels stay readable
    if (scale >= 4) return 4;
    if (scale >= 2.5) return 5;
    if (scale >= 1.5) return 6;
    return 8;
  }, [scale]);

  const currentTarget = pinnedTarget ?? hoveredTarget ?? getTargetFromSelection(selection);
  const currentKey = `${currentTarget.level}:${currentTarget.id}:${periodLabel}`;
  const currentStats = statsCache[currentKey] ?? null;

  const fetchStats = useCallback(
    async (target: MapTarget) => {
      const key = `${target.level}:${target.id}:${periodLabel}`;
      if (statsCache[key]) {
        return statsCache[key];
      }

      const response = await fetch(pathForTarget(target, periodLabel), { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load map stats");
      }
      const payload = (await response.json()) as PublicImpactAggregate;
      setStatsCache((previous) => ({ ...previous, [key]: payload }));
      return payload;
    },
    [periodLabel, statsCache],
  );

  useEffect(() => {
    const selected = getTargetFromSelection(selection);
    fetchStats(selected).catch(() => {
      // keep map interactive even when one fetch fails
    });
  }, [fetchStats, selection]);

  useEffect(() => {
    let cancelled = false;
    setBestDistrictStats(null);
    const loadBestDistrict = async () => {
      const period = encodeURIComponent(periodLabel);
      const response = await fetch(`/api/impact/best-district?period=${period}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load best district comparison");
      }
      const payload = (await response.json()) as {
        bestDistrict?: BestDistrictReadingPerformance | null;
      };
      if (!cancelled) {
        setBestDistrictStats(payload.bestDistrict ?? null);
      }
    };
    loadBestDistrict().catch(() => {
      if (!cancelled) {
        setBestDistrictStats(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [periodLabel]);

  useEffect(() => {
    if (!hoveredTarget || !isOpen) {
      return;
    }
    fetchStats(hoveredTarget).catch(() => {
      // noop
    });
  }, [fetchStats, hoveredTarget, isOpen]);

  const beginHover = useCallback(
    (event: React.MouseEvent<SVGElement>, target: MapTarget) => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      setHoveredTarget(target);
      setFloatingPosition(
        smartPosition({
          clientX: event.clientX,
          clientY: event.clientY,
          containerRect: rect,
          cardWidth: floatingCardSize.width,
          cardHeight: floatingCardSize.height,
          offsetX: hoverCardGap,
          offsetY: hoverCardGap,
        }),
      );
      scheduleOpen();
    },
    [floatingCardSize.height, floatingCardSize.width, hoverCardGap, scheduleOpen, smartPosition],
  );

  const moveHover = useCallback(
    (event: React.MouseEvent<SVGElement>) => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      setFloatingPosition(
        smartPosition({
          clientX: event.clientX,
          clientY: event.clientY,
          containerRect: rect,
          cardWidth: floatingCardSize.width,
          cardHeight: floatingCardSize.height,
          offsetX: hoverCardGap,
          offsetY: hoverCardGap,
        }),
      );
    },
    [floatingCardSize.height, floatingCardSize.width, hoverCardGap, smartPosition],
  );

  const endHover = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const clearSelection = useCallback(() => {
    setPinnedTarget(null);
    setHoveredTarget(null);
    forceClose();
    onSelectionChange({ region: "", subRegion: "", district: "" });
    resetView();
  }, [forceClose, onSelectionChange, resetView]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      clearSelection();
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [clearSelection]);

  const handleCanvasClickReset = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(".impact-map-zoom-controls") ||
        target.closest(".impact-map-floating-card")
      ) {
        return;
      }
      clearSelection();
    },
    [clearSelection],
  );

  const selectSubRegion = useCallback(
    (subRegion: UgandaMapSubRegionName) => {
      const region = UGANDA_MAP_SUB_REGIONS.find((entry) => entry.subRegion === subRegion)?.region ?? "";
      const target: MapTarget = {
        level: "subregion",
        id: subRegion,
        label: subRegion,
        chip: "Sub-region",
        profileHref: `/sub-regions/${encodeURIComponent(subRegion)}`,
      };
      setPinnedTarget(target);
      setHoveredTarget(target);
      forceOpen();
      onSelectionChange({ region, subRegion, district: "" });
      fetchStats(target).catch(() => {
        // noop
      });
      // Fit map to sub-region bounding box
      const srDistricts = GEO_DISTRICT_BOUNDARIES.filter((d) => d.subRegion === subRegion);
      const bbox = computePathsBbox(srDistricts);
      if (bbox) fitBounds(bbox, 0.15);
    },
    [computePathsBbox, fetchStats, fitBounds, forceOpen, onSelectionChange],
  );

  const selectDistrict = useCallback(
    (district: string, subRegion: string) => {
      const region = UGANDA_MAP_SUB_REGIONS.find((entry) => entry.subRegion === subRegion)?.region ?? "";
      const target: MapTarget = {
        level: "district",
        id: district,
        label: district,
        chip: "District",
        profileHref: `/districts/${encodeURIComponent(district)}`,
      };
      setPinnedTarget(target);
      setHoveredTarget(target);
      forceOpen();
      onSelectionChange({ region, subRegion, district });
      fetchStats(target).catch(() => {
        // noop
      });
      // Fit map to district bounding box
      const dMatch = GEO_DISTRICT_BOUNDARIES.filter((d) => d.name === district);
      const bbox = computePathsBbox(dMatch);
      if (bbox) fitBounds(bbox, 0.42);
    },
    [computePathsBbox, fetchStats, fitBounds, forceOpen, onSelectionChange],
  );

  const mobileOpenTarget = useCallback(
    (target: MapTarget) => {
      if (!isMobile) {
        return;
      }
      setMobileSheetTarget(target);
      fetchStats(target).catch(() => {
        // noop
      });
    },
    [fetchStats, isMobile],
  );

  const selectedSubRegionId = selection.subRegion
    ? stableSubRegionId(selection.subRegion as UgandaMapSubRegionName)
    : "";
  const selectedDistrictId = selection.district ? stableDistrictId(selection.district) : "";

  const shareHref = useMemo(() => {
    const query = new URLSearchParams();
    query.set("period", periodLabel);
    if (selection.region) {
      query.set("region", selection.region);
    }
    if (selection.subRegion) {
      query.set("subRegion", selection.subRegion);
    }
    if (selection.district) {
      query.set("district", selection.district);
    }
    return `/impact?${query.toString()}`;
  }, [periodLabel, selection.district, selection.region, selection.subRegion]);

  const completeness = currentStats?.meta.dataCompleteness ?? "Complete";

  useEffect(() => {
    if (selection.district) {
      const districtMatch = GEO_DISTRICT_BOUNDARIES.filter((district) => district.name === selection.district);
      const districtBbox = computePathsBbox(districtMatch);
      if (districtBbox) {
        fitBounds(districtBbox, 0.42);
      }
      return;
    }

    if (selection.subRegion) {
      const subRegionDistricts = GEO_DISTRICT_BOUNDARIES.filter(
        (district) => district.subRegion === selection.subRegion,
      );
      const subRegionBbox = computePathsBbox(subRegionDistricts);
      if (subRegionBbox) {
        fitBounds(subRegionBbox, 0.15);
      }
      return;
    }

    resetView();
  }, [computePathsBbox, fitBounds, resetView, selection.district, selection.subRegion]);

  return (
      <article className={`impact-map-card ${compact ? "impact-map-card--compact" : ""} ${className ?? ""}`.trim()}>
      <header className="impact-map-card-header">
        <div className="impact-map-card-heading">
          <h3>Where We Work (Live)</h3>
          <p>Map credit: UBOS</p>
        </div>
        <p className="impact-map-card-updated">Last updated: {toFriendlyTime(currentStats?.meta.lastUpdated)}</p>
      </header>

      <div className="impact-map-controls-row">
        <div className="impact-map-hover-toggle" role="group" aria-label="Hover level">
          <button
            type="button"
            data-active={hoverLevel === "district" ? "" : undefined}
            onClick={() => setHoverLevel("district")}
          >
            District
          </button>
          <button
            type="button"
            data-active={hoverLevel === "subregion" ? "" : undefined}
            onClick={() => setHoverLevel("subregion")}
          >
            Sub-region
          </button>
        </div>

        <div className="impact-map-hover-toggle" role="group" aria-label="View mode">
          <button type="button" data-active={mapMode === "coverage" ? "" : undefined} onClick={() => setMapMode("coverage")}>Coverage</button>
          <button type="button" data-active={mapMode === "improvement" ? "" : undefined} onClick={() => setMapMode("improvement")}>Improvement</button>
          <button type="button" data-active={mapMode === "fidelity" ? "" : undefined} onClick={() => setMapMode("fidelity")}>Fidelity</button>
        </div>
      </div>

      <div className="impact-map-breadcrumb-row">
        <p>
          All districts
          {selection.subRegion ? ` > ${selection.subRegion}` : ""}
          {selection.district ? ` > ${selection.district}` : ""}
        </p>
        <button type="button" className="impact-map-clear-link" onClick={clearSelection}>
          Clear
        </button>
      </div>

      <DistrictSearchInput
        districtOptions={districtSearchOptions}
        onSelectDistrict={(name, subRegion) => selectDistrict(name, subRegion)}
        className="impact-map-search-above"
      />

      <div
        ref={containerRef}
        className="impact-map-canvas"
        onMouseLeave={endHover}
        onClick={handleCanvasClickReset}
      >
        {/* Zoom controls */}
        <div className="impact-map-zoom-controls" onClick={(event) => event.stopPropagation()}>
          <button type="button" title="Zoom in" aria-label="Zoom in" onClick={zoomIn}>+</button>
          <button type="button" title="Zoom out" aria-label="Zoom out" onClick={zoomOut}>−</button>
          <button type="button" title="Reset zoom" aria-label="Reset zoom" onClick={() => { resetView(); clearSelection(); }}>⟲</button>
        </div>
        <p className="impact-map-hint">Scroll to zoom · Drag to pan</p>

        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="impact-map-svg"
          role="img"
          aria-label="Uganda literacy implementation map"
        >
          <g ref={svgGroupRef}>
            {/* Sub-region filled shapes (real GeoJSON boundaries) */}
            <g className={`impact-map-subregions impact-map-subregions--${mapMode}`}>
              {GEO_SUBREGION_BOUNDARIES.map((overlay) => {
                const srId = stableSubRegionId(overlay.subRegion);
                const active = selectedSubRegionId === srId;
                const dimmed = hasDistrictSelection
                  ? selection.subRegion !== overlay.subRegion
                  : selection.subRegion && !active;
                const target: MapTarget = {
                  level: "subregion",
                  id: overlay.subRegion,
                  label: overlay.subRegion,
                  chip: "Sub-region",
                  profileHref: `/sub-regions/${encodeURIComponent(overlay.subRegion)}`,
                };

                return (
                  <g key={overlay.subRegion} style={dimmed ? { opacity: 0.12 } : undefined}>
                    <path
                      d={overlay.pathData}
                      className="impact-map-subregion-shape"
                      style={{ fill: SUB_REGION_COLORS[overlay.subRegion] }}
                      data-subregion-id={srId}
                      data-subregion-name={overlay.subRegion}
                      data-selected={active ? "" : undefined}
                      role="button"
                      tabIndex={dimmed ? -1 : 0}
                      aria-label={`${overlay.subRegion} sub-region. Click to view aggregated impact stats and filter dashboard.`}
                      onMouseEnter={(event) => {
                        if (hoverLevel === "subregion" && !dimmed) {
                          beginHover(event, target);
                        }
                      }}
                      onMouseMove={(event) => {
                        if (hoverLevel === "subregion" && !dimmed) {
                          moveHover(event);
                        }
                      }}
                      onFocus={() => {
                        if (!dimmed) {
                          setHoveredTarget(target);
                          forceOpen();
                        }
                      }}
                      onBlur={() => {
                        endHover();
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (dimmed) return;
                        if (isMobile) {
                          mobileOpenTarget(target);
                        }
                        selectSubRegion(overlay.subRegion);
                      }}
                      onKeyDown={(event) => {
                        if (dimmed) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectSubRegion(overlay.subRegion);
                        }
                      }}
                    />
                    {!dimmed && (
                      <text
                        x={overlay.labelX}
                        y={overlay.labelY}
                        className="impact-map-subregion-label"
                        textAnchor="middle"
                      >
                        {overlay.subRegion}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* District boundary shapes (real GeoJSON boundaries) */}
            <g
              className={`impact-map-district-shapes impact-map-district-shapes--${mapMode}`}
              data-visible={hoverLevel === "district" ? "" : undefined}
            >
              {districtPaths.map((districtShape) => {
                const dId = stableDistrictId(districtShape.name);
                const srId = stableSubRegionId(districtShape.subRegion);
                const isSelectedSchoolMarker = Boolean(selection.school && selectedDistrictId === dId);
                const markerTarget: MapTarget = isSelectedSchoolMarker
                  ? {
                      level: "school",
                      id: selection.school as string,
                      label: activeSchoolName ?? "Selected School",
                      chip: "School",
                      profileHref: `/schools/${encodeURIComponent(selection.school as string)}`,
                    }
                  : {
                      level: "district",
                      id: districtShape.name,
                      label: districtShape.name,
                      chip: "District",
                      profileHref: `/districts/${encodeURIComponent(districtShape.name)}`,
                    };
                const selected = selectedDistrictId === dId;
                const hiddenBySubRegion =
                  !hasDistrictSelection &&
                  activeSubRegionFilter &&
                  activeSubRegionFilter !== districtShape.subRegion;
                const dimmedByDistrictSelection = hasDistrictSelection && !selected;
                const inFocusedSubRegion = hasDistrictSelection ||
                  !activeSubRegionFilter ||
                  activeSubRegionFilter === districtShape.subRegion;

                return (
                  <g key={`${districtShape.subRegion}-${districtShape.name}`}>
                    <path
                      d={districtShape.pathData}
                      className="impact-map-district-shape"
                      style={{
                        fill: hiddenBySubRegion
                          ? "transparent"
                          : dimmedByDistrictSelection
                            ? "rgba(148, 163, 184, 0.42)"
                            : SUB_REGION_COLORS[districtShape.subRegion],
                        opacity: hiddenBySubRegion ? 0.08 : dimmedByDistrictSelection ? 0.9 : undefined,
                      }}
                      data-district-id={dId}
                      data-district-name={districtShape.name}
                      data-subregion-id={srId}
                      data-subregion-name={districtShape.subRegion}
                      data-selected={selected ? "" : undefined}
                      data-dimmed={dimmedByDistrictSelection ? "" : undefined}
                      role="button"
                      tabIndex={hiddenBySubRegion ? -1 : 0}
                      aria-label={`${districtShape.name} District. Click to view aggregated impact stats and filter dashboard.`}
                      onMouseEnter={(event) => {
                        if (!hiddenBySubRegion) beginHover(event, markerTarget);
                      }}
                      onMouseMove={(event) => {
                        if (!hiddenBySubRegion) moveHover(event);
                      }}
                      onFocus={() => {
                        if (!hiddenBySubRegion) {
                          setHoveredTarget(markerTarget);
                          forceOpen();
                        }
                      }}
                      onBlur={() => {
                        endHover();
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (hiddenBySubRegion) return;
                        if (isMobile) {
                          mobileOpenTarget(markerTarget);
                        }
                        selectDistrict(districtShape.name, districtShape.subRegion);
                      }}
                      onKeyDown={(event) => {
                        if (hiddenBySubRegion) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectDistrict(districtShape.name, districtShape.subRegion);
                        }
                      }}
                    />
                    {/* District label */}
                    {inFocusedSubRegion && !isSelectedSchoolMarker && (
                      <text
                        x={districtShape.centroidX}
                        y={districtShape.centroidY}
                        className="impact-map-district-label"
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{ fontSize: selection.subRegion ? districtLabelSize : 5.5 }}
                      >
                        {districtShape.name}
                      </text>
                    )}
                    {/* Virtual School Marker Popup Target */}
                    {isSelectedSchoolMarker && (
                      <g className="impact-map-school-marker-group" style={{ pointerEvents: "none" }}>
                        <circle
                          cx={districtShape.centroidX}
                          cy={districtShape.centroidY - (selection.subRegion ? 4 : 2)}
                          r={selection.subRegion ? 4 : 1.5}
                          style={{ fill: "var(--md-sys-color-primary)", stroke: "#fff", strokeWidth: 1 }}
                        />
                        <text
                          x={districtShape.centroidX}
                          y={districtShape.centroidY + (selection.subRegion ? 5 : 2.5)}
                          className="impact-map-district-label"
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{ fontSize: selection.subRegion ? districtLabelSize * 0.9 : 4.5, fill: "var(--md-sys-color-primary)", fontWeight: "bold" }}
                        >
                          {activeSchoolName}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        <FloatingStatCard
          open={isOpen && !isMobile}
          pinned={Boolean(pinnedTarget)}
          title={currentTarget.label}
          chip={currentTarget.chip}
          periodLabel={currentStats?.period.label ?? periodLabel}
          lastUpdatedFriendly={toFriendlyTime(currentStats?.meta.lastUpdated)}
          position={floatingPosition}
          metrics={toFloatingMetrics(currentStats, bestDistrictStats)}
          profileHref={currentTarget.profileHref}
          dataCompleteness={completeness}
          onClearSelection={clearSelection}
          onSizeChange={handleFloatingCardSizeChange}
        />
      </div>

      <MapStatsBottomSheet
        open={Boolean(mobileSheetTarget)}
        title={mobileSheetTarget?.label ?? ""}
        chip={mobileSheetTarget?.chip ?? "District"}
        metrics={toFloatingMetrics(
          mobileSheetTarget
            ? statsCache[`${mobileSheetTarget.level}:${mobileSheetTarget.id}:${periodLabel}`]
            : null,
          bestDistrictStats,
        )}
        profileHref={mobileSheetTarget?.profileHref}
        periodLabel={
          mobileSheetTarget
            ? statsCache[`${mobileSheetTarget.level}:${mobileSheetTarget.id}:${periodLabel}`]?.period
              .label ?? periodLabel
            : periodLabel
        }
        lastUpdatedFriendly={
          toFriendlyTime(
            mobileSheetTarget
              ? statsCache[`${mobileSheetTarget.level}:${mobileSheetTarget.id}:${periodLabel}`]?.meta
                .lastUpdated
              : undefined,
          )
        }
        dataCompleteness={
          mobileSheetTarget
            ? statsCache[`${mobileSheetTarget.level}:${mobileSheetTarget.id}:${periodLabel}`]?.meta
              .dataCompleteness
            : "Complete"
        }
        onClose={() => setMobileSheetTarget(null)}
        onClearSelection={clearSelection}
      />

      <footer className="impact-map-card-footer">
        <a className="inline-download-link" href={shareHref}>
          Share this view
        </a>
      </footer>
    </article>
  );
}
