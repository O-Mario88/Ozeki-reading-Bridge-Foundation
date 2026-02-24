"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { AggregatedImpactData } from "@/lib/types";
import { ugandaRegions } from "@/lib/uganda-locations";

type ImpactHoverSnapshot = {
    schoolsSupported: number;
    teachersTrained: number;
    learnersAssessed: number;
    learnersReached: number;
    coachingVisits: number;
    assessmentCycle: number;
};

/* ───────── Skeleton placeholder ───────── */
function Skeleton({ width = "100%", height = "1.5rem" }: { width?: string; height?: string }) {
    return (
        <span
            className="impact-dash-skeleton"
            style={{ width, height, display: "inline-block" }}
            aria-hidden
        />
    );
}

/* ───────── KPI Card ───────── */
function KpiCard({
    icon,
    label,
    value,
    accent,
    suffix,
    loading,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    accent: string;
    suffix?: string;
    loading: boolean;
}) {
    return (
        <article className="impact-dash-kpi" style={{ "--kpi-accent": accent } as React.CSSProperties}>
            <div className="impact-dash-kpi-icon">{icon}</div>
            <div className="impact-dash-kpi-body">
                <span className="impact-dash-kpi-label">{label}</span>
                {loading ? (
                    <Skeleton width="5rem" height="2rem" />
                ) : (
                    <span className="impact-dash-kpi-value">
                        {typeof value === "number" ? value.toLocaleString() : value}
                        {suffix ? <small>{suffix}</small> : null}
                    </span>
                )}
            </div>
        </article>
    );
}

/* ───────── Domain Outcome Tile ───────── */
function DomainTile({
    label,
    baseline,
    endline,
    unit,
    maxScale,
    sampleSize,
    loading,
}: {
    label: string;
    baseline: number;
    endline: number;
    unit: string;
    maxScale: number;
    sampleSize: number;
    loading: boolean;
}) {
    const change = endline - baseline;
    const baseW = maxScale > 0 ? Math.max(4, (baseline / maxScale) * 100) : 0;
    const endW = maxScale > 0 ? Math.max(4, (endline / maxScale) * 100) : 0;

    return (
        <div className="impact-dash-domain">
            <div className="impact-dash-domain-head">
                <span className="impact-dash-domain-label">{label}</span>
                {!loading && (
                    <span
                        className="impact-dash-domain-change"
                        data-positive={change > 0 ? "" : undefined}
                        data-negative={change < 0 ? "" : undefined}
                    >
                        {change > 0 ? "+" : ""}
                        {change}
                        {unit}
                    </span>
                )}
            </div>
            {loading ? (
                <Skeleton width="100%" height="2.5rem" />
            ) : (
                <>
                    <div className="impact-dash-domain-bars">
                        <div className="impact-dash-domain-bar-row">
                            <span className="impact-dash-domain-bar-label">Base</span>
                            <div className="impact-dash-domain-track">
                                <div
                                    className="impact-dash-domain-fill impact-dash-domain-fill--base"
                                    style={{ width: `${baseW}%` }}
                                />
                            </div>
                            <span className="impact-dash-domain-bar-val">{baseline}{unit}</span>
                        </div>
                        <div className="impact-dash-domain-bar-row">
                            <span className="impact-dash-domain-bar-label">End</span>
                            <div className="impact-dash-domain-track">
                                <div
                                    className="impact-dash-domain-fill impact-dash-domain-fill--end"
                                    style={{ width: `${endW}%` }}
                                />
                            </div>
                            <span className="impact-dash-domain-bar-val">{endline}{unit}</span>
                        </div>
                    </div>
                    <span className="impact-dash-domain-n">n={sampleSize.toLocaleString()}</span>
                </>
            )}
        </div>
    );
}

/* ═══════════ Icons (inline SVGs) ═══════════ */
const SchoolIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);
const TeacherIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const AssessedIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);
const ReachedIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
);
const VisitIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const CycleIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);

const mapRegions = [
    {
        region: "Northern",
        label: "North",
        points: "128,24 232,30 282,118 226,200 122,184 84,96",
        labelX: 176,
        labelY: 104,
    },
    {
        region: "Western",
        label: "West",
        points: "46,136 122,184 112,298 44,336 18,248 24,160",
        labelX: 76,
        labelY: 236,
    },
    {
        region: "Eastern",
        label: "East",
        points: "282,118 352,154 372,254 314,344 238,294 226,200",
        labelX: 304,
        labelY: 238,
    },
    {
        region: "Central",
        label: "Central",
        points: "122,184 226,200 238,294 174,358 112,298",
        labelX: 176,
        labelY: 272,
    },
] as const;

function toImpactHoverSnapshot(payload: AggregatedImpactData | null | undefined): ImpactHoverSnapshot {
    const targetSchools = payload?.funnel.targetSchools ?? 0;
    const baselineSchools = payload?.funnel.schoolsAssessedBaseline ?? 0;
    const endlineSchools = payload?.funnel.schoolsAssessedEndline ?? 0;
    const assessmentCycle =
        targetSchools > 0
            ? Math.round(((baselineSchools + endlineSchools) / (targetSchools * 2)) * 100)
            : 0;

    return {
        schoolsSupported: payload?.kpis.schoolsSupported ?? 0,
        teachersTrained: payload?.kpis.teachersTrained ?? 0,
        learnersAssessed: payload?.kpis.learnersAssessed ?? 0,
        learnersReached: payload?.kpis.learnersEnrolled ?? 0,
        coachingVisits: payload?.funnel.schoolsVisited ?? 0,
        assessmentCycle,
    };
}

/* ═══════════ AVAILABLE GEOGRAPHY ═══════════ */
// Loaded from ugandaRegions automatically

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function LiveImpactDashboard() {
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedSubRegion, setSelectedSubRegion] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");

    const [data, setData] = useState<AggregatedImpactData | null>(null);
    const [loading, setLoading] = useState(true);
    const [regionSnapshots, setRegionSnapshots] = useState<Record<string, ImpactHoverSnapshot>>({});
    const [mapLoading, setMapLoading] = useState(true);
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

    const availableSubRegions = useMemo(() => {
        if (!selectedRegion) return [];
        return ugandaRegions.find(r => r.region === selectedRegion)?.subRegions || [];
    }, [selectedRegion]);

    const availableDistricts = useMemo(() => {
        if (selectedSubRegion) {
            return availableSubRegions.find(sr => sr.subRegion === selectedSubRegion)?.districts || [];
        }
        if (selectedRegion) {
            return availableSubRegions.flatMap(sr => sr.districts);
        }
        // If no region is selected, show all districts
        return ugandaRegions.flatMap(r => r.subRegions.flatMap(sr => sr.districts)).sort();
    }, [selectedRegion, selectedSubRegion, availableSubRegions]);

    // Handle cascading resets
    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRegion(e.target.value);
        setSelectedSubRegion("");
        setSelectedDistrict("");
    };

    const handleSubRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSubRegion(e.target.value);
        setSelectedDistrict("");
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let level = "country";
            let id = "Uganda";

            if (selectedDistrict) {
                level = "district";
                id = selectedDistrict;
            } else if (selectedSubRegion) {
                level = "sub_region";
                id = selectedSubRegion;
            } else if (selectedRegion) {
                level = "region";
                id = selectedRegion;
            }

            const res = await fetch(`/api/impact?level=${level}&id=${encodeURIComponent(id)}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error("Failed to load impact data", err);
        } finally {
            setLoading(false);
        }
    }, [selectedRegion, selectedSubRegion, selectedDistrict]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        let mounted = true;
        async function fetchMapRegionSnapshots() {
            setMapLoading(true);
            const snapshots = await Promise.all(
                ugandaRegions.map(async (entry) => {
                    try {
                        const response = await fetch(
                            `/api/impact?level=region&id=${encodeURIComponent(entry.region)}`,
                            {
                                cache: "force-cache",
                            },
                        );
                        if (!response.ok) {
                            throw new Error("Region lookup failed");
                        }
                        const payload = (await response.json()) as AggregatedImpactData;
                        return [entry.region, toImpactHoverSnapshot(payload)] as const;
                    } catch {
                        return [entry.region, toImpactHoverSnapshot(null)] as const;
                    }
                }),
            );

            if (!mounted) {
                return;
            }
            setRegionSnapshots(Object.fromEntries(snapshots));
            setMapLoading(false);
        }
        fetchMapRegionSnapshots();
        return () => {
            mounted = false;
        };
    }, []);

    const kpis = data?.kpis;
    const funnel = data?.funnel;
    const outcomes = data?.outcomesByDomain;

    const cycleCompletion =
        funnel && funnel.targetSchools > 0
            ? Math.round(
                ((funnel.schoolsAssessedBaseline + funnel.schoolsAssessedEndline) /
                    (funnel.targetSchools * 2)) *
                100,
            )
            : 0;

    const currentSnapshot = useMemo(() => toImpactHoverSnapshot(data), [data]);
    const activeHoverSnapshot =
        (hoveredRegion ? regionSnapshots[hoveredRegion] : null) ?? currentSnapshot;

    const maxRegionSchools = useMemo(() => {
        const values = Object.values(regionSnapshots).map((item) => item.schoolsSupported);
        return values.length ? Math.max(...values, 1) : 1;
    }, [regionSnapshots]);

    const hoverMetrics = useMemo(
        () => [
            { label: "Schools Supported", value: activeHoverSnapshot.schoolsSupported.toLocaleString() },
            { label: "Teachers Trained", value: activeHoverSnapshot.teachersTrained.toLocaleString() },
            { label: "Learners Assessed", value: activeHoverSnapshot.learnersAssessed.toLocaleString() },
            { label: "Learners Reached", value: activeHoverSnapshot.learnersReached.toLocaleString() },
            { label: "Coaching Visits", value: activeHoverSnapshot.coachingVisits.toLocaleString() },
            { label: "Assessment Cycle", value: `${activeHoverSnapshot.assessmentCycle}%` },
        ],
        [activeHoverSnapshot],
    );

    const setHoverFromPointer = useCallback(
        (event: React.MouseEvent<SVGPolygonElement>, regionName: string) => {
            const svg = event.currentTarget.ownerSVGElement;
            if (!svg) {
                return;
            }
            const rect = svg.getBoundingClientRect();
            const x = Math.min(Math.max(10, event.clientX - rect.left + 12), rect.width - 230);
            const y = Math.min(Math.max(10, event.clientY - rect.top + 10), rect.height - 170);
            setHoveredRegion(regionName);
            setTooltipPosition({ x, y });
        },
        [],
    );

    const clearMapHover = useCallback(() => {
        setHoveredRegion(null);
        setTooltipPosition(null);
    }, []);

    return (
        <section className="impact-dash" id="live-impact-dashboard">
            {/* ─── HEADER ─── */}
            <header className="impact-dash-header">
                <div className="impact-dash-header-text">
                    <p className="impact-dash-kicker">Live Impact Explorer</p>
                    <h2 className="impact-dash-title">
                        {selectedDistrict
                            ? `${selectedDistrict} District`
                            : selectedSubRegion
                                ? `${selectedSubRegion} Sub-Region`
                                : selectedRegion
                                    ? selectedRegion
                                    : "Uganda National Overview"}
                    </h2>
                    <p className="impact-dash-subtitle">
                        Aggregated, privacy-protected classroom data. Updated regularly.
                    </p>
                </div>

                <div className="impact-dash-controls" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <select
                        className="impact-dash-select"
                        value={selectedRegion}
                        onChange={handleRegionChange}
                        aria-label="Select Region"
                    >
                        <option value="">All Regions</option>
                        {ugandaRegions.map((r) => (
                            <option key={r.region} value={r.region}>{r.region}</option>
                        ))}
                    </select>

                    <select
                        className="impact-dash-select"
                        value={selectedSubRegion}
                        onChange={handleSubRegionChange}
                        aria-label="Select Sub-Region"
                        disabled={!selectedRegion}
                    >
                        <option value="">All Sub-Regions</option>
                        {availableSubRegions.map((sr) => (
                            <option key={sr.subRegion} value={sr.subRegion}>{sr.subRegion}</option>
                        ))}
                    </select>

                    <select
                        className="impact-dash-select"
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        aria-label="Select district"
                    >
                        <option value="">All Districts</option>
                        {availableDistricts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>

                    {(selectedRegion || selectedSubRegion || selectedDistrict) && (
                        <button
                            className="impact-dash-clear"
                            onClick={() => {
                                setSelectedRegion("");
                                setSelectedSubRegion("");
                                setSelectedDistrict("");
                            }}
                            type="button"
                        >
                            ✕ Clear
                        </button>
                    )}
                </div>
            </header>

            <div className="impact-dash-map-layout">
                <article className="impact-dash-map-card">
                    <div className="impact-dash-map-heading">
                        <h3>Uganda impact map</h3>
                        <p>Hover a region to view impact numbers.</p>
                    </div>
                    <div className="impact-dash-map-canvas" onMouseLeave={clearMapHover}>
                        <svg
                            viewBox="0 0 390 380"
                            role="img"
                            aria-label="Uganda impact map by region"
                            className="impact-dash-map-svg"
                        >
                            {mapRegions.map((shape) => {
                                const regionSnapshot =
                                    regionSnapshots[shape.region] ?? toImpactHoverSnapshot(null);
                                const intensity =
                                    0.24 +
                                    (maxRegionSchools > 0
                                        ? (regionSnapshot.schoolsSupported / maxRegionSchools) * 0.58
                                        : 0);
                                const isActive =
                                    hoveredRegion === shape.region || selectedRegion === shape.region;
                                return (
                                    <g key={shape.region}>
                                        <polygon
                                            points={shape.points}
                                            fill={`rgba(8,79,102,${Math.min(0.9, intensity)})`}
                                            stroke={isActive ? "#ff8a00" : "#cad4df"}
                                            strokeWidth={isActive ? 2.3 : 1.4}
                                            className="impact-dash-map-region"
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`Filter by ${shape.region}`}
                                            onMouseEnter={(event) =>
                                                setHoverFromPointer(event, shape.region)
                                            }
                                            onMouseMove={(event) =>
                                                setHoverFromPointer(event, shape.region)
                                            }
                                            onFocus={() => {
                                                setHoveredRegion(shape.region);
                                                setTooltipPosition({ x: shape.labelX + 10, y: shape.labelY - 30 });
                                            }}
                                            onBlur={clearMapHover}
                                            onClick={() => {
                                                setSelectedRegion(shape.region);
                                                setSelectedSubRegion("");
                                                setSelectedDistrict("");
                                            }}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    setSelectedRegion(shape.region);
                                                    setSelectedSubRegion("");
                                                    setSelectedDistrict("");
                                                }
                                            }}
                                        />
                                        <text
                                            x={shape.labelX}
                                            y={shape.labelY}
                                            textAnchor="middle"
                                            className="impact-dash-map-label"
                                        >
                                            {shape.label}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                        {tooltipPosition && hoveredRegion ? (
                            <aside
                                className="impact-dash-map-tooltip"
                                style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
                            >
                                <p className="impact-dash-map-tooltip-title">{hoveredRegion}</p>
                                <ul>
                                    {hoverMetrics.map((metric) => (
                                        <li key={`${hoveredRegion}-${metric.label}`}>
                                            <span>{metric.label}</span>
                                            <strong>{metric.value}</strong>
                                        </li>
                                    ))}
                                </ul>
                            </aside>
                        ) : null}
                    </div>
                    {mapLoading ? (
                        <p className="impact-dash-map-note">
                            <Skeleton width="180px" height="0.9rem" />
                        </p>
                    ) : (
                        <p className="impact-dash-map-note">
                            Region shading is based on schools supported; darker regions have higher
                            current activity.
                        </p>
                    )}
                </article>
            </div>

            {/* ─── KPI GRID ─── */}
            <div className="impact-dash-kpi-grid">
                <KpiCard
                    icon={SchoolIcon}
                    label="Schools Supported"
                    value={kpis?.schoolsSupported ?? 0}
                    accent="#0d7c66"
                    loading={loading}
                />
                <KpiCard
                    icon={TeacherIcon}
                    label="Teachers Trained"
                    value={kpis?.teachersTrained ?? 0}
                    accent="#2563eb"
                    loading={loading}
                />
                <KpiCard
                    icon={AssessedIcon}
                    label="Learners Assessed"
                    value={kpis?.learnersAssessed ?? 0}
                    accent="#7c3aed"
                    suffix=" direct"
                    loading={loading}
                />
                <KpiCard
                    icon={ReachedIcon}
                    label="Learners Reached"
                    value={kpis?.learnersEnrolled ?? 0}
                    accent="#0891b2"
                    suffix=" est."
                    loading={loading}
                />
                <KpiCard
                    icon={VisitIcon}
                    label="Coaching Visits"
                    value={funnel?.schoolsVisited ?? 0}
                    accent="#ca8a04"
                    loading={loading}
                />
                <KpiCard
                    icon={CycleIcon}
                    label="Assessment Cycle"
                    value={`${cycleCompletion}%`}
                    accent="#059669"
                    loading={loading}
                />
            </div>

            {/* ─── CHARTS ROW ─── */}
            <div className="impact-dash-charts">
                {/* Domain Outcome Tiles */}
                <div className="impact-dash-panel">
                    <h3 className="impact-dash-panel-title">
                        Learning Outcomes by Domain
                    </h3>
                    <div className="impact-dash-domain-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                        <DomainTile
                            label="Letter Id"
                            baseline={outcomes?.letterIdentification.baselineScore ?? 0}
                            endline={outcomes?.letterIdentification.endlineScore ?? 0}
                            unit="%"
                            maxScale={100}
                            sampleSize={outcomes?.letterIdentification.sampleSize ?? 0}
                            loading={loading}
                        />
                        <DomainTile
                            label="Sound Id"
                            baseline={outcomes?.soundIdentification.baselineScore ?? 0}
                            endline={outcomes?.soundIdentification.endlineScore ?? 0}
                            unit="%"
                            maxScale={100}
                            sampleSize={outcomes?.soundIdentification.sampleSize ?? 0}
                            loading={loading}
                        />
                        <DomainTile
                            label="Decodable"
                            baseline={outcomes?.decodableWords.baselineScore ?? 0}
                            endline={outcomes?.decodableWords.endlineScore ?? 0}
                            unit="%"
                            maxScale={100}
                            sampleSize={outcomes?.decodableWords.sampleSize ?? 0}
                            loading={loading}
                        />
                        <DomainTile
                            label="Undecodable"
                            baseline={outcomes?.undecodableWords.baselineScore ?? 0}
                            endline={outcomes?.undecodableWords.endlineScore ?? 0}
                            unit="%"
                            maxScale={100}
                            sampleSize={outcomes?.undecodableWords.sampleSize ?? 0}
                            loading={loading}
                        />
                        <DomainTile
                            label="Made Up"
                            baseline={outcomes?.madeUpWords.baselineScore ?? 0}
                            endline={outcomes?.madeUpWords.endlineScore ?? 0}
                            unit="%"
                            maxScale={100}
                            sampleSize={outcomes?.madeUpWords.sampleSize ?? 0}
                            loading={loading}
                        />
                        <DomainTile
                            label="Story"
                            baseline={outcomes?.storyReading.baselineScore ?? 0}
                            endline={outcomes?.storyReading.endlineScore ?? 0}
                            unit="%"
                            maxScale={100}
                            sampleSize={outcomes?.storyReading.sampleSize ?? 0}
                            loading={loading}
                        />
                        <DomainTile
                            label="Comp"
                            baseline={outcomes?.readingComprehension.baselineScore ?? 0}
                            endline={outcomes?.readingComprehension.endlineScore ?? 0}
                            unit="%"
                            maxScale={100}
                            sampleSize={outcomes?.readingComprehension.sampleSize ?? 0}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>

            {/* ─── CTA BAR ─── */}
            <div className="impact-dash-cta-bar">
                <Link className="button" href="/impact/dashboard">
                    Explore Full Dashboard
                </Link>
                <Link className="button button-ghost" href="/impact/reports">
                    Download FY Report
                </Link>
                <Link className="button button-ghost" href="/donor-pack">
                    Donor Pack
                </Link>
            </div>

            {/* ─── EMPTY STATE ─── */}
            {!loading && data && data.kpis.schoolsSupported === 0 && selectedDistrict && (
                <p className="impact-dash-empty">
                    No published data yet for {selectedDistrict} district.
                </p>
            )}

            <p className="impact-dash-privacy">
                All public statistics are aggregated. No learner personal data is shared.
            </p>
        </section>
    );
}
