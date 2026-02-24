"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDistrictOverlayPaths,
  stableDistrictId,
  stableSubRegionId,
  UGANDA_MAP_DIMENSIONS,
  UGANDA_MAP_SUB_REGIONS,
  UGANDA_SUB_REGION_MAP_OVERLAYS_SCALED,
  UgandaMapSubRegionName,
} from "@/lib/uganda-map-taxonomy";
import { PublicImpactAggregate } from "@/lib/types";
import { FloatingMetric, FloatingStatCard } from "./FloatingStatCard";
import { MapStatsBottomSheet } from "./MapStatsBottomSheet";
import { useHoverIntent } from "./useHoverIntent";
import { useSmartPositioning } from "./useSmartPositioning";

type HoverLevel = "district" | "subregion";

type MapSelection = {
  region: string;
  subRegion: string;
  district: string;
};

type MapTarget = {
  level: "country" | "subregion" | "district";
  id: string;
  label: string;
  chip: "Country" | "Sub-region" | "District";
  profileHref?: string;
};

type UgandaImpactMapProProps = {
  periodLabel: string;
  selection: MapSelection;
  onSelectionChange: (next: MapSelection) => void;
  compact?: boolean;
  className?: string;
};

function pathForTarget(target: MapTarget, periodLabel: string) {
  const period = encodeURIComponent(periodLabel);
  if (target.level === "country") {
    return `/impact/country?period=${period}`;
  }
  if (target.level === "subregion") {
    return `/impact/subregion/${encodeURIComponent(target.id)}?period=${period}`;
  }
  return `/impact/district/${encodeURIComponent(target.id)}?period=${period}`;
}

function toFriendlyTime(value?: string) {
  if (!value) {
    return "Data not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Data not available";
  }
  return date.toLocaleString();
}

function toFloatingMetrics(data?: PublicImpactAggregate | null): FloatingMetric[] {
  if (!data) {
    return [
      { label: "Schools supported", value: "Data not available" },
      { label: "Learners assessed (n)", value: "Data not available", helper: "Direct impact" },
      { label: "Teachers supported", value: "Data not available" },
      { label: "Enrollment (estimated reach)", value: "Data not available" },
      { label: "Assessments (B / P / E)", value: "Data not available" },
      { label: "Coaching visits", value: "Data not available" },
    ];
  }

  return [
    {
      label: "Schools supported",
      value: data.kpis.schoolsSupported.toLocaleString(),
    },
    {
      label: "Learners assessed (n)",
      value: data.kpis.learnersAssessedUnique.toLocaleString(),
      helper: "Direct impact",
    },
    {
      label: "Teachers supported",
      value: `${data.kpis.teachersSupportedMale.toLocaleString()} M / ${data.kpis.teachersSupportedFemale.toLocaleString()} F`,
    },
    {
      label: "Enrollment (estimated reach)",
      value: data.kpis.enrollmentEstimatedReach.toLocaleString(),
    },
    {
      label: "Assessments (B / P / E)",
      value: `${data.kpis.assessmentsBaselineCount.toLocaleString()} / ${data.kpis.assessmentsProgressCount.toLocaleString()} / ${data.kpis.assessmentsEndlineCount.toLocaleString()}`,
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
  onSelectionChange,
  compact = false,
  className,
}: UgandaImpactMapProProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverLevel, setHoverLevel] = useState<HoverLevel>("district");
  const [hoveredTarget, setHoveredTarget] = useState<MapTarget | null>(null);
  const [pinnedTarget, setPinnedTarget] = useState<MapTarget | null>(null);
  const [floatingPosition, setFloatingPosition] = useState<{ left: number; top: number } | null>(null);
  const [mobileSheetTarget, setMobileSheetTarget] = useState<MapTarget | null>(null);
  const [statsCache, setStatsCache] = useState<Record<string, PublicImpactAggregate>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [mapMode, setMapMode] = useState<"coverage" | "improvement" | "fidelity">("coverage");
  const [inlineMapMarkup, setInlineMapMarkup] = useState("");

  const { isOpen, scheduleOpen, scheduleClose, forceOpen, forceClose } = useHoverIntent({
    openDelayMs: 95,
    closeDelayMs: 300,
  });
  const smartPosition = useSmartPositioning();

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

  useEffect(() => {
    let active = true;
    async function loadInlineMapMarkup() {
      try {
        const response = await fetch("/maps/uganda-live-impact.svg", { cache: "force-cache" });
        if (!response.ok) {
          return;
        }
        const svgText = await response.text();
        const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        const innerMarkup = match?.[1]?.trim() ?? svgText;
        if (active) {
          setInlineMapMarkup(innerMarkup);
        }
      } catch {
        if (active) {
          setInlineMapMarkup("");
        }
      }
    }
    loadInlineMapMarkup();
    return () => {
      active = false;
    };
  }, []);

  const districtPaths = useMemo(() => {
    if (selection.subRegion) {
      return getDistrictOverlayPaths(selection.subRegion as UgandaMapSubRegionName);
    }
    return getDistrictOverlayPaths();
  }, [selection.subRegion]);

  const currentTarget = pinnedTarget ?? hoveredTarget ?? getTargetFromSelection(selection);
  const currentKey = `${currentTarget.level}:${currentTarget.id}:${periodLabel}`;
  const currentStats = statsCache[currentKey] ?? null;

  const fetchStats = useCallback(
    async (target: MapTarget) => {
      const key = `${target.level}:${target.id}:${periodLabel}`;
      if (statsCache[key]) {
        return statsCache[key];
      }

      const response = await fetch(pathForTarget(target, periodLabel), { cache: "force-cache" });
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
          cardWidth: compact ? 300 : 330,
          cardHeight: compact ? 220 : 240,
          offsetX: 14,
          offsetY: 14,
        }),
      );
      scheduleOpen();
    },
    [compact, scheduleOpen, smartPosition],
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
          cardWidth: compact ? 300 : 330,
          cardHeight: compact ? 220 : 240,
          offsetX: 14,
          offsetY: 14,
        }),
      );
    },
    [compact, smartPosition],
  );

  const endHover = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const clearSelection = useCallback(() => {
    setPinnedTarget(null);
    setHoveredTarget(null);
    forceClose();
    onSelectionChange({ region: "", subRegion: "", district: "" });
  }, [forceClose, onSelectionChange]);

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
    },
    [fetchStats, forceOpen, onSelectionChange],
  );

  const selectDistrict = useCallback(
    (district: string, subRegion: UgandaMapSubRegionName) => {
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
    },
    [fetchStats, forceOpen, onSelectionChange],
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

  return (
    <article className={`impact-map-card ${compact ? "impact-map-card--compact" : ""} ${className ?? ""}`.trim()}>
      <header className="impact-map-card-header">
        <div>
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
          Uganda
          {selection.subRegion ? ` > ${selection.subRegion}` : ""}
          {selection.district ? ` > ${selection.district}` : ""}
        </p>
        <button type="button" className="impact-map-clear-link" onClick={clearSelection}>
          Clear
        </button>
      </div>

      <div ref={containerRef} className="impact-map-canvas" onMouseLeave={endHover}>
        <svg
          viewBox={`0 0 ${UGANDA_MAP_DIMENSIONS.targetWidth} ${UGANDA_MAP_DIMENSIONS.targetHeight}`}
          className="impact-map-svg"
          role="img"
          aria-label="Uganda literacy implementation map"
        >
          {inlineMapMarkup ? (
            <g className="impact-map-base-layer" dangerouslySetInnerHTML={{ __html: inlineMapMarkup }} />
          ) : null}

          <g className={`impact-map-subregions impact-map-subregions--${mapMode}`}>
            {UGANDA_SUB_REGION_MAP_OVERLAYS_SCALED.map((overlay) => {
              const active = selectedSubRegionId === overlay.subRegionId;
              const target: MapTarget = {
                level: "subregion",
                id: overlay.subRegion,
                label: overlay.subRegion,
                chip: "Sub-region",
                profileHref: `/sub-regions/${encodeURIComponent(overlay.subRegion)}`,
              };

              return (
                <g key={overlay.subRegion}>
                  <polygon
                    points={overlay.pointsScaled}
                    className="impact-map-subregion-shape"
                    data-subregion-id={overlay.subRegionId}
                    data-subregion-name={overlay.subRegion}
                    data-selected={active ? "" : undefined}
                    role="button"
                    tabIndex={0}
                    aria-label={`${overlay.subRegion} sub-region. Click to view aggregated impact stats and filter dashboard.`}
                    onMouseEnter={(event) => {
                      if (hoverLevel === "subregion") {
                        beginHover(event, target);
                      }
                    }}
                    onMouseMove={(event) => {
                      if (hoverLevel === "subregion") {
                        moveHover(event);
                      }
                    }}
                    onFocus={() => {
                      setHoveredTarget(target);
                      forceOpen();
                    }}
                    onBlur={() => {
                      endHover();
                    }}
                    onClick={() => {
                      if (isMobile) {
                        mobileOpenTarget(target);
                      }
                      selectSubRegion(overlay.subRegion);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectSubRegion(overlay.subRegion);
                      }
                    }}
                  />
                  <text x={overlay.labelXScaled} y={overlay.labelYScaled} className="impact-map-subregion-label" textAnchor="middle">
                    {overlay.label}
                  </text>
                </g>
              );
            })}
          </g>

          <g
            className={`impact-map-district-shapes impact-map-district-shapes--${mapMode}`}
            data-visible={hoverLevel === "district" ? "" : undefined}
          >
            {hoverLevel === "district"
              ? districtPaths.map((districtShape) => {
                  const markerTarget: MapTarget = {
                    level: "district",
                    id: districtShape.district,
                    label: districtShape.district,
                    chip: "District",
                    profileHref: `/districts/${encodeURIComponent(districtShape.district)}`,
                  };
                  const selected = selectedDistrictId === districtShape.districtId;
                  const hiddenBySubRegion =
                    selection.subRegion && selection.subRegion !== districtShape.subRegion;

                  if (hiddenBySubRegion) {
                    return null;
                  }

                  return (
                    <path
                      key={`${districtShape.subRegion}-${districtShape.district}`}
                      d={districtShape.pathData}
                      className="impact-map-district-shape"
                      data-district-id={districtShape.districtId}
                      data-district-name={districtShape.district}
                      data-subregion-id={districtShape.subRegionId}
                      data-subregion-name={districtShape.subRegion}
                      data-selected={selected ? "" : undefined}
                      role="button"
                      tabIndex={0}
                      aria-label={`${districtShape.district} District. Click to view aggregated impact stats and filter dashboard.`}
                      onMouseEnter={(event) => beginHover(event, markerTarget)}
                      onMouseMove={(event) => moveHover(event)}
                      onFocus={() => {
                        setHoveredTarget(markerTarget);
                        forceOpen();
                      }}
                      onBlur={() => {
                        endHover();
                      }}
                      onClick={() => {
                        if (isMobile) {
                          mobileOpenTarget(markerTarget);
                        }
                        selectDistrict(districtShape.district, districtShape.subRegion);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectDistrict(districtShape.district, districtShape.subRegion);
                        }
                      }}
                    />
                  );
                })
              : null}
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
          metrics={toFloatingMetrics(currentStats)}
          profileHref={currentTarget.profileHref}
          dataCompleteness={completeness}
          onClearSelection={clearSelection}
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
