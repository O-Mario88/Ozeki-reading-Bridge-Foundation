import Link from "next/link";
import { getImpactExplorerProfiles } from "@/lib/db";
import { inferSubRegionFromDistrict, ugandaRegions } from "@/lib/uganda-locations";

export const metadata = {
  title: "Live Impact Dashboard",
  description:
    "View aggregated, public-facing impact data across regions and districts—coverage, coaching, assessments, learner outcomes, and resource usage.",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  country?: string;
  region?: string;
  subRegion?: string;
  district?: string;
  subCounty?: string;
  parish?: string;
  school?: string;
};

type StatusLabel = "On track" | "Needs support" | "High priority";

const mapRegions = [
  {
    region: "Northern Region",
    label: "North",
    points: "128,24 232,30 282,118 226,200 122,184 84,96",
    labelX: 176,
    labelY: 104,
  },
  {
    region: "Western Region",
    label: "West",
    points: "46,136 122,184 112,298 44,336 18,248 24,160",
    labelX: 76,
    labelY: 236,
  },
  {
    region: "Eastern Region",
    label: "East",
    points: "282,118 352,154 372,254 314,344 238,294 226,200",
    labelX: 304,
    labelY: 238,
  },
  {
    region: "Central Region",
    label: "Central",
    points: "122,184 226,200 238,294 174,358 112,298",
    labelX: 176,
    labelY: 272,
  },
] as const;

function normalizeValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function parseSchoolId(value: string | undefined) {
  const parsed = Number(value ?? "");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isSupportedSchool(school: {
  trainings: number;
  visits: number;
  assessments: number;
  storyActivities: number;
}) {
  return school.trainings + school.visits + school.assessments + school.storyActivities > 0;
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Data not available";
  }
  return `${value.toLocaleString()}${suffix}`;
}

function toPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

type OutcomeKey =
  | "letterIdentification"
  | "soundIdentification"
  | "decodableWords"
  | "undecodableWords"
  | "madeUpWords"
  | "storyReading"
  | "readingComprehension";

const outcomeMeta: Array<{ key: OutcomeKey; label: string }> = [
  { key: "letterIdentification", label: "Letter Identification" },
  { key: "soundIdentification", label: "Sound Identification" },
  { key: "decodableWords", label: "Decodable Words" },
  { key: "undecodableWords", label: "Undecodable Words" },
  { key: "madeUpWords", label: "Made Up Words" },
  { key: "storyReading", label: "Story Reading" },
  { key: "readingComprehension", label: "Reading Comprehension" },
];

function weightedOutcome(
  schools: Array<{
    outcomes: {
      sampleSize: number;
      letterIdentification: number | null;
      soundIdentification: number | null;
      decodableWords: number | null;
      undecodableWords: number | null;
      madeUpWords: number | null;
      storyReading: number | null;
      readingComprehension: number | null;
    };
  }>,
  key: OutcomeKey,
) {
  let weightedSum = 0;
  let weightedDenominator = 0;
  let sampleSize = 0;

  schools.forEach((school) => {
    const value = school.outcomes[key];
    if (value === null || value === undefined) {
      return;
    }
    const weight = Math.max(1, school.outcomes.sampleSize || 0);
    weightedSum += value * weight;
    weightedDenominator += weight;
    sampleSize += school.outcomes.sampleSize || 0;
  });

  if (weightedDenominator === 0) {
    return { score: null, sampleSize: 0 };
  }

  return {
    score: Number((weightedSum / weightedDenominator).toFixed(1)),
    sampleSize,
  };
}

function statusCounts(
  schools: Array<{
    status: StatusLabel;
  }>,
) {
  return schools.reduce(
    (acc, school) => {
      if (school.status === "On track") acc.onTrack += 1;
      if (school.status === "Needs support") acc.needsSupport += 1;
      if (school.status === "High priority") acc.highPriority += 1;
      return acc;
    },
    { onTrack: 0, needsSupport: 0, highPriority: 0 },
  );
}

export default async function ImpactDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const explorer = getImpactExplorerProfiles();
  const params = await searchParams;

  const selected: SearchParams = {
    country: normalizeValue(params.country),
    region: normalizeValue(params.region),
    subRegion: normalizeValue(params.subRegion),
    district: normalizeValue(params.district),
    subCounty: normalizeValue(params.subCounty),
    parish: normalizeValue(params.parish),
    school: normalizeValue(params.school),
  };

  const selectedCountry = "Uganda";
  const regionOptions = ugandaRegions.map((entry) => entry.region);
  const selectedRegion =
    selected.region && regionOptions.includes(selected.region) ? selected.region : "";

  const subRegionOptions = (
    selectedRegion
      ? ugandaRegions.find((entry) => entry.region === selectedRegion)?.subRegions ?? []
      : ugandaRegions.flatMap((entry) => entry.subRegions)
  ).map((entry) => entry.subRegion);
  const selectedSubRegion =
    selected.subRegion && subRegionOptions.includes(selected.subRegion)
      ? selected.subRegion
      : "";

  const districtOptions = (
    selectedRegion
      ? ugandaRegions
          .filter((entry) => entry.region === selectedRegion)
          .flatMap((entry) => entry.subRegions)
      : ugandaRegions.flatMap((entry) => entry.subRegions)
  )
    .filter((entry) => !selectedSubRegion || entry.subRegion === selectedSubRegion)
    .flatMap((entry) => entry.districts);
  const uniqueDistrictOptions = [...new Set(districtOptions)].sort((a, b) =>
    a.localeCompare(b),
  );
  const selectedDistrict =
    selected.district && uniqueDistrictOptions.includes(selected.district)
      ? selected.district
      : "";

  const scopedByGeo = explorer.schools.filter((school) => {
    const schoolSubRegion = inferSubRegionFromDistrict(school.district) ?? "";
    if (selectedRegion && school.region !== selectedRegion) return false;
    if (selectedSubRegion && schoolSubRegion !== selectedSubRegion) return false;
    if (selectedDistrict && school.district !== selectedDistrict) return false;
    return true;
  });

  const subCountyOptions = [
    ...new Set(scopedByGeo.map((school) => school.subCounty).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  const selectedSubCounty =
    selected.subCounty && subCountyOptions.includes(selected.subCounty)
      ? selected.subCounty
      : "";

  const parishOptions = [
    ...new Set(
      scopedByGeo
        .filter((school) => !selectedSubCounty || school.subCounty === selectedSubCounty)
        .map((school) => school.parish)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const selectedParish =
    selected.parish && parishOptions.includes(selected.parish) ? selected.parish : "";

  const schoolOptions = scopedByGeo
    .filter((school) => !selectedSubCounty || school.subCounty === selectedSubCounty)
    .filter((school) => !selectedParish || school.parish === selectedParish)
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedSchoolId = parseSchoolId(selected.school);
  const selectedSchool =
    selectedSchoolId !== null
      ? schoolOptions.find((school) => school.id === selectedSchoolId) ?? null
      : null;

  const filteredSchools = selectedSchool ? [selectedSchool] : schoolOptions;
  const filteredSupportedSchools = filteredSchools.filter((school) => isSupportedSchool(school));

  const summary = {
    regionsCovered: new Set(filteredSupportedSchools.map((school) => school.region)).size,
    districtsCovered: new Set(filteredSupportedSchools.map((school) => school.district)).size,
    schoolsSupported: filteredSupportedSchools.length,
    learnersAssessed: filteredSchools.reduce((sum, school) => sum + school.learnersAssessed, 0),
  };

  const teachersSupported = filteredSchools.reduce(
    (sum, school) => sum + school.participantsTeachers,
    0,
  );
  const learnersReached = filteredSchools.reduce(
    (sum, school) => sum + school.enrolledLearners,
    0,
  );
  const coachingVisits = filteredSchools.reduce((sum, school) => sum + school.visits, 0);
  const schoolsWithCycle = filteredSupportedSchools.filter(
    (school) => school.baselineAssessments > 0 && school.endlineAssessments > 0,
  ).length;
  const assessmentCyclePct =
    filteredSupportedSchools.length > 0
      ? (schoolsWithCycle / filteredSupportedSchools.length) * 100
      : 0;

  const kpiCards = [
    { label: "Schools Supported", value: formatNumber(summary.schoolsSupported) },
    { label: "Teachers Trained", value: formatNumber(teachersSupported) },
    { label: "Learners Assessed", value: formatNumber(summary.learnersAssessed) },
    { label: "Learners Reached", value: formatNumber(learnersReached) },
    { label: "Coaching Visits", value: formatNumber(coachingVisits) },
    { label: "Assessment Cycle", value: toPercent(assessmentCyclePct) },
  ];

  const outcomeCards = outcomeMeta.map((domain) => {
    const aggregate = weightedOutcome(filteredSchools, domain.key);
    return {
      ...domain,
      score: aggregate.score,
      sampleSize: aggregate.sampleSize,
    };
  });

  const hierarchyRows = filteredSchools
    .map((school) => ({
      region: school.region,
      subRegion: inferSubRegionFromDistrict(school.district) ?? "-",
      district: school.district,
      subCounty: school.subCounty || "-",
      parish: school.parish || "-",
      schoolName: school.name,
      schoolsSupported: isSupportedSchool(school) ? 1 : 0,
      visits: school.visits,
      assessments: school.assessments,
      learnersAssessed: school.learnersAssessed,
      status: school.status,
    }))
    .sort((a, b) => {
      return (
        a.region.localeCompare(b.region) ||
        a.subRegion.localeCompare(b.subRegion) ||
        a.district.localeCompare(b.district) ||
        a.subCounty.localeCompare(b.subCounty) ||
        a.parish.localeCompare(b.parish) ||
        a.schoolName.localeCompare(b.schoolName)
      );
    });

  const overallStatuses = statusCounts(filteredSchools);

  const regionMetricMap = new Map(
    mapRegions.map((regionShape) => {
      const regionSchools = filteredSchools.filter(
        (school) => school.region === regionShape.region,
      );
      const regionSupported = regionSchools.filter((school) => isSupportedSchool(school));
      const regionCycle =
        regionSupported.length > 0
          ? (regionSupported.filter(
              (school) => school.baselineAssessments > 0 && school.endlineAssessments > 0,
            ).length /
              regionSupported.length) *
            100
          : 0;

      return [
        regionShape.region,
        {
          schoolsSupported: regionSupported.length,
          teachersTrained: regionSchools.reduce(
            (sum, school) => sum + school.participantsTeachers,
            0,
          ),
          learnersAssessed: regionSchools.reduce(
            (sum, school) => sum + school.learnersAssessed,
            0,
          ),
          learnersReached: regionSchools.reduce(
            (sum, school) => sum + school.enrolledLearners,
            0,
          ),
          coachingVisits: regionSchools.reduce((sum, school) => sum + school.visits, 0),
          assessmentCycle: Math.round(regionCycle),
        },
      ] as const;
    }),
  );

  const maxMapSupported = Math.max(
    1,
    ...Array.from(regionMetricMap.values()).map((entry) => entry.schoolsSupported),
  );

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact</p>
          <h1>Live Literacy Impact Dashboard</h1>
          <p>
            Aggregated, read-only implementation data across Country → Region → Sub-Region →
            District → Sub-County → Parish → School.
          </p>
          <p className="note-box impact-compliance-note">
            Public dashboard access is read-only and aggregated. Learner names are not
            displayed in public outputs.
          </p>
          <div className="action-row">
            <Link className="inline-download-link" href="/impact/reports">
              Download Latest Report
            </Link>
            <Link className="button button-ghost" href="/partner/portal">
              Request Partner Access
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container card impact-filter-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ marginBottom: 0 }}>Dashboard Filters</h2>
          <form method="GET" className="filters impact-filter-grid">
            <label>
              <span>Country</span>
              <select name="country" defaultValue={selectedCountry}>
                <option value="Uganda">Uganda</option>
              </select>
            </label>

            <label>
              <span>Region</span>
              <select name="region" defaultValue={selectedRegion}>
                <option value="">All Regions</option>
                {regionOptions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Sub-Region</span>
              <select name="subRegion" defaultValue={selectedSubRegion}>
                <option value="">All Sub-Regions</option>
                {subRegionOptions.map((subRegion) => (
                  <option key={subRegion} value={subRegion}>
                    {subRegion}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>District</span>
              <select name="district" defaultValue={selectedDistrict}>
                <option value="">All Districts</option>
                {uniqueDistrictOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Sub-County</span>
              <select name="subCounty" defaultValue={selectedSubCounty}>
                <option value="">All Sub-Counties</option>
                {subCountyOptions.map((subCounty) => (
                  <option key={subCounty} value={subCounty}>
                    {subCounty}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Parish</span>
              <select name="parish" defaultValue={selectedParish}>
                <option value="">All Parishes</option>
                {parishOptions.map((parish) => (
                  <option key={parish} value={parish}>
                    {parish}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>School</span>
              <select name="school" defaultValue={selectedSchool?.id ? String(selectedSchool.id) : ""}>
                <option value="">All Schools</option>
                {schoolOptions.map((school) => (
                  <option key={`${school.id}-${school.name}`} value={school.id ?? ""}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="action-row" style={{ alignItems: "end" }}>
              <button className="button" type="submit">
                Apply filters
              </button>
              <Link className="button button-ghost" href="/impact/dashboard">
                Reset
              </Link>
            </div>
          </form>
        </div>
      </section>

      <section className="section bg-surface-container" style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}>
        <div className="container" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p className="meta-pill">Explore by profile</p>
          <h2 style={{ marginBottom: 0 }}>
            Country → Region → Sub-Region → District → Sub-County → Parish → School
          </h2>
          <p className="meta-line">
            Public dashboard access is read-only and aggregated. Use profile drill-down to follow implementation from national view down to each supported school.
          </p>

          <div className="impact-kpi-grid">
            <article className="card impact-kpi-card">
              <strong>{summary.regionsCovered.toLocaleString()}</strong>
              <span>Regions covered (of {regionOptions.length})</span>
            </article>
            <article className="card impact-kpi-card">
              <strong>{summary.districtsCovered.toLocaleString()}</strong>
              <span>Districts covered (of {new Set(explorer.schools.map((s) => s.district)).size})</span>
            </article>
            <article className="card impact-kpi-card">
              <strong>{summary.schoolsSupported.toLocaleString()}</strong>
              <span>Schools with logged implementation</span>
            </article>
            <article className="card impact-kpi-card">
              <strong>{summary.learnersAssessed.toLocaleString()}</strong>
              <span>Learners assessed</span>
            </article>
          </div>

          <div className="table-wrap card" style={{ padding: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Sub-Region</th>
                  <th>District</th>
                  <th>Sub-County</th>
                  <th>Parish</th>
                  <th>School</th>
                  <th>Schools supported</th>
                  <th>Visits</th>
                  <th>Assessments</th>
                  <th>Learners assessed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hierarchyRows.length === 0 ? (
                  <tr>
                    <td colSpan={11}>No schools matched the current filters.</td>
                  </tr>
                ) : (
                  hierarchyRows.map((row, index) => (
                    <tr key={`${row.schoolName}-${index}`}>
                      <td>{row.region}</td>
                      <td>{row.subRegion}</td>
                      <td>{row.district}</td>
                      <td>{row.subCounty}</td>
                      <td>{row.parish}</td>
                      <td>{row.schoolName}</td>
                      <td>{row.schoolsSupported.toLocaleString()}</td>
                      <td>{row.visits.toLocaleString()}</td>
                      <td>{row.assessments.toLocaleString()}</td>
                      <td>{row.learnersAssessed.toLocaleString()}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="meta-line">
            Status distribution in current scope: {overallStatuses.onTrack} On track / {overallStatuses.needsSupport} Needs support / {overallStatuses.highPriority} High priority
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)" }}>
          <article className="card" style={{ padding: "1rem" }}>
            <h3>Uganda Impact Map</h3>
            <p className="meta-line">Hover each region to see filtered impact numbers linked to the KPI cards.</p>
            <div className="impact-dash-map-canvas" style={{ minHeight: "360px" }}>
              <svg
                viewBox="0 0 390 380"
                role="img"
                aria-label="Uganda impact map by region"
                className="impact-dash-map-svg"
              >
                {mapRegions.map((shape) => {
                  const metrics = regionMetricMap.get(shape.region) ?? {
                    schoolsSupported: 0,
                    teachersTrained: 0,
                    learnersAssessed: 0,
                    learnersReached: 0,
                    coachingVisits: 0,
                    assessmentCycle: 0,
                  };
                  const intensity =
                    0.2 + Math.min(0.65, (metrics.schoolsSupported / maxMapSupported) * 0.65);

                  return (
                    <g key={shape.region}>
                      <polygon
                        points={shape.points}
                        fill={`rgba(8,79,102,${intensity})`}
                        stroke={selectedRegion === shape.region ? "#ff8a00" : "#cad4df"}
                        strokeWidth={selectedRegion === shape.region ? 2.4 : 1.3}
                        className="impact-dash-map-region"
                      >
                        <title>
                          {`${shape.region}\nSchools Supported: ${metrics.schoolsSupported}\nTeachers Trained: ${metrics.teachersTrained}\nLearners Assessed: ${metrics.learnersAssessed}\nLearners Reached: ${metrics.learnersReached}\nCoaching Visits: ${metrics.coachingVisits}\nAssessment Cycle: ${metrics.assessmentCycle}%`}
                        </title>
                      </polygon>
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
            </div>
          </article>

          <div className="impact-kpi-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", alignSelf: "start" }}>
            {kpiCards.map((card) => (
              <article key={card.label} className="card impact-kpi-card">
                <strong>{card.value}</strong>
                <span>{card.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2>Learning Outcomes by Domain</h2>
          <p className="meta-line">
            Domain averages are aggregated from schools in the current filter scope (sample sizes shown per domain).
          </p>

          <div className="cards-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
            {outcomeCards.map((card) => (
              <article key={card.key} className="card" style={{ padding: "1rem" }}>
                <h3 style={{ marginBottom: "0.4rem" }}>{card.label}</h3>
                <p style={{ margin: 0 }}>
                  <strong>{formatNumber(card.score)}</strong>
                </p>
                <p className="meta-line" style={{ marginTop: "0.35rem" }}>
                  Sample size (n): {card.sampleSize.toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
