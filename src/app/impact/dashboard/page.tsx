import Link from "next/link";
import {
  getImpactExplorerProfiles,
  getImpactSummary,
  getImpactReportFilterFacets,
  listPublicImpactReports,
} from "@/lib/db";
import { ImpactReportProgramType } from "@/lib/types";

export const metadata = {
  title: "Live Impact Dashboard",
  description:
    "View aggregated, public-facing impact data across regions and districts—coverage, coaching, assessments, learner outcomes, and resource usage.",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  year?: string;
  term?: string;
  region?: string;
  district?: string;
  program?: string;
  profile?: string;
  profileRegion?: string;
  profileDistrict?: string;
  profileSchool?: string;
};

function normalizeValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function formatMetric(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return "Data not available";
}

function formatMaybeNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Data not available";
  }
  return `${value.toLocaleString()}${suffix}`;
}

function toLevel(value: string | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "region") return "region";
  if (normalized === "district") return "district";
  if (normalized === "school") return "school";
  return "country";
}

export default async function ImpactDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = await searchParams;
  const selected: SearchParams = {
    year: normalizeValue(filters.year),
    term: normalizeValue(filters.term),
    region: normalizeValue(filters.region),
    district: normalizeValue(filters.district),
    program: normalizeValue(filters.program),
    profile: normalizeValue(filters.profile),
    profileRegion: normalizeValue(filters.profileRegion),
    profileDistrict: normalizeValue(filters.profileDistrict),
    profileSchool: normalizeValue(filters.profileSchool),
  };

  const profileLevel = toLevel(selected.profile);

  const facets = getImpactReportFilterFacets();
  const validProgramFilters: ImpactReportProgramType[] = [
    "training",
    "visit",
    "assessment",
    "story",
    "resources",
    "online-training",
  ];
  const programFilter = validProgramFilters.includes(selected.program as ImpactReportProgramType)
    ? (selected.program as ImpactReportProgramType)
    : undefined;

  const reports = listPublicImpactReports({
    year: selected.year && /^\d{4}$/.test(selected.year) ? selected.year : undefined,
    scopeType: selected.district
      ? "District"
      : selected.region
        ? "Region"
        : undefined,
    scopeValue: selected.district || selected.region || undefined,
    limit: 120,
  });

  const filteredReports = programFilter
    ? reports.filter((report) => report.programsIncluded.includes(programFilter))
    : reports;

  const latest = filteredReports[0] ?? null;
  const summary = getImpactSummary();
  const explorer = getImpactExplorerProfiles();
  const summaryMap = new Map(summary.metrics.map((metric) => [metric.label, metric.value]));

  const coverageTotals = [
    {
      label: "Schools impacted",
      value:
        latest?.factPack.coverageDelivery.schoolsImpacted ??
        summaryMap.get("Schools trained") ??
        null,
    },
    {
      label: "Schools coached/visited",
      value: latest?.factPack.coverageDelivery.schoolsCoachedVisited ?? null,
    },
    {
      label: "Teachers trained",
      value:
        latest?.factPack.coverageDelivery.teachersTrained ??
        summaryMap.get("Teachers trained") ??
        null,
    },
    {
      label: "School leaders trained",
      value: latest?.factPack.coverageDelivery.schoolLeadersTrained ?? null,
    },
    {
      label: "Learners reached",
      value:
        latest?.factPack.coverageDelivery.learnersReached ??
        summaryMap.get("Learners enrolled") ??
        summaryMap.get("Learners assessed") ??
        null,
    },
    {
      label: "Learners enrolled",
      value: summaryMap.get("Learners enrolled") ?? null,
    },
    {
      label: "Learners assessed",
      value: summaryMap.get("Learners assessed") ?? null,
    },
  ];

  const assessmentCoverage = latest?.factPack.coverageDelivery.assessmentsConducted ?? {
    baseline: 0,
    progress: 0,
    endline: 0,
  };

  const downloadByType = latest?.factPack.engagement.downloadsByType ?? [];

  const scopeRows = filteredReports.slice(0, 12).map((report) => ({
    scopeType: report.scopeType,
    scopeValue: report.scopeValue,
    schools: report.factPack.coverageDelivery.schoolsImpacted,
    learners: report.factPack.coverageDelivery.learnersReached,
  }));

  const regionOptions = explorer.regions.map((region) => region.region);
  const selectedProfileRegion = regionOptions.includes(selected.profileRegion || "")
    ? (selected.profileRegion as string)
    : (regionOptions[0] ?? "");
  const districtOptions = explorer.districts.filter((district) =>
    selectedProfileRegion ? district.region === selectedProfileRegion : true,
  );
  const districtOptionNames = districtOptions.map((district) => district.district);
  const selectedProfileDistrict = districtOptionNames.includes(selected.profileDistrict || "")
    ? (selected.profileDistrict as string)
    : (districtOptionNames[0] ?? "");
  const schoolOptions = explorer.schools.filter((school) => {
    if (profileLevel === "region") {
      return !selectedProfileRegion || school.region === selectedProfileRegion;
    }
    if (profileLevel === "district") {
      return !selectedProfileDistrict || school.district === selectedProfileDistrict;
    }
    return true;
  });
  const selectedSchoolId = Number(selected.profileSchool || "");
  const selectedSchoolProfile =
    schoolOptions.find((school) => school.id === selectedSchoolId) ??
    schoolOptions.find((school) => school.id !== null) ??
    schoolOptions[0] ??
    null;

  const selectedRegionProfile =
    explorer.regions.find((region) => region.region === selectedProfileRegion) ?? null;
  const selectedDistrictProfile =
    explorer.districts.find((district) => district.district === selectedProfileDistrict) ?? null;

  const persistentParams = [
    ["year", selected.year],
    ["term", selected.term],
    ["region", selected.region],
    ["district", selected.district],
    ["program", selected.program],
    ["profileRegion", selectedProfileRegion],
    ["profileDistrict", selectedProfileDistrict],
    ["profileSchool", selectedSchoolProfile?.id ? String(selectedSchoolProfile.id) : ""],
  ] as Array<[string, string | undefined]>;

  const buildProfileHref = (level: "country" | "region" | "district" | "school") => {
    const params = new URLSearchParams();
    persistentParams.forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    params.set("profile", level);
    return `/impact/dashboard?${params.toString()}`;
  };

  const schoolReport = selectedSchoolProfile
    ? filteredReports.find(
        (report) =>
          report.scopeType === "School" &&
          report.scopeValue.trim().toLowerCase() === selectedSchoolProfile.name.trim().toLowerCase(),
      )
    : null;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact</p>
          <h1>Live Impact Dashboard (Aggregated)</h1>
          <p>
            Public, evidence-first results updated from verified program data.
          </p>
          <p className="note-box impact-compliance-note">
            This dashboard displays aggregated results only. Learner identities are
            anonymized and never published.
          </p>
          <div className="action-row">
            <Link className="inline-download-link" href="/impact/reports">
              Download Latest Report
            </Link>
            <Link className="button button-ghost" href="/partner/portal">
              Request Partner Access (Portal)
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <p className="meta-pill">Explore by profile</p>
          <h2>Country → Region → District → School</h2>
          <p className="meta-line">
            Public dashboard access is read-only and aggregated. Use profile drill-down to follow
            implementation from national view down to each supported school.
          </p>
          <div className="action-row impact-profile-switch">
            <Link
              className={profileLevel === "country" ? "button" : "button button-ghost"}
              href={buildProfileHref("country")}
            >
              Country
            </Link>
            <Link
              className={profileLevel === "region" ? "button" : "button button-ghost"}
              href={buildProfileHref("region")}
            >
              Region
            </Link>
            <Link
              className={profileLevel === "district" ? "button" : "button button-ghost"}
              href={buildProfileHref("district")}
            >
              District
            </Link>
            <Link
              className={profileLevel === "school" ? "button" : "button button-ghost"}
              href={buildProfileHref("school")}
            >
              School
            </Link>
          </div>

          {profileLevel === "country" ? (
            <div className="impact-profile-stack">
              <div className="impact-kpi-grid">
                <article className="card impact-kpi-card">
                  <strong>{explorer.country.regionsCovered.toLocaleString()}</strong>
                  <span>Regions covered (of {explorer.country.regionsTotal})</span>
                </article>
                <article className="card impact-kpi-card">
                  <strong>{explorer.country.districtsCovered.toLocaleString()}</strong>
                  <span>Districts covered (of {explorer.country.districtsTotal})</span>
                </article>
                <article className="card impact-kpi-card">
                  <strong>{explorer.country.schoolsSupported.toLocaleString()}</strong>
                  <span>Schools with logged implementation</span>
                </article>
                <article className="card impact-kpi-card">
                  <strong>{explorer.country.learnersAssessed.toLocaleString()}</strong>
                  <span>Learners assessed</span>
                </article>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Schools supported</th>
                      <th>Visits</th>
                      <th>Assessments</th>
                      <th>Learners assessed</th>
                      <th>Status (On track / Needs support / High priority)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {explorer.regions.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No regional profile data available.</td>
                      </tr>
                    ) : (
                      explorer.regions.map((region) => (
                        <tr key={region.region}>
                          <td>{region.region}</td>
                          <td>{region.schoolsSupported.toLocaleString()}</td>
                          <td>{region.visits.toLocaleString()}</td>
                          <td>{region.assessments.toLocaleString()}</td>
                          <td>{region.learnersAssessed.toLocaleString()}</td>
                          <td>
                            {region.statusCounts.onTrack} / {region.statusCounts.needsSupport} /{" "}
                            {region.statusCounts.highPriority}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {profileLevel === "region" ? (
            <div className="impact-profile-stack">
              <form method="GET" className="impact-profile-picker">
                {persistentParams.map(([key, value]) =>
                  key === "profileRegion" || key === "profileDistrict" || key === "profileSchool" ? null : value ? (
                    <input key={key} type="hidden" name={key} value={value} />
                  ) : null,
                )}
                <input type="hidden" name="profile" value="region" />
                <input type="hidden" name="profileDistrict" value="" />
                <input
                  type="hidden"
                  name="profileSchool"
                  value={selectedSchoolProfile?.id ? String(selectedSchoolProfile.id) : ""}
                />
                <label>
                  <span>Region profile</span>
                  <select name="profileRegion" defaultValue={selectedProfileRegion}>
                    {regionOptions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-ghost" type="submit">
                  Open region profile
                </button>
              </form>

              {selectedRegionProfile ? (
                <>
                  <div className="impact-kpi-grid">
                    <article className="card impact-kpi-card">
                      <strong>{selectedRegionProfile.districtsCovered.toLocaleString()}</strong>
                      <span>Districts covered in region</span>
                    </article>
                    <article className="card impact-kpi-card">
                      <strong>{selectedRegionProfile.schoolsSupported.toLocaleString()}</strong>
                      <span>Schools supported</span>
                    </article>
                    <article className="card impact-kpi-card">
                      <strong>{selectedRegionProfile.visits.toLocaleString()}</strong>
                      <span>School visits completed</span>
                    </article>
                    <article className="card impact-kpi-card">
                      <strong>{selectedRegionProfile.learnersAssessed.toLocaleString()}</strong>
                      <span>Learners assessed</span>
                    </article>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>District</th>
                          <th>Schools supported</th>
                          <th>Visits</th>
                          <th>Assessments</th>
                          <th>Learners assessed</th>
                          <th>Status (On track / Needs support / High priority)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {districtOptions.length === 0 ? (
                          <tr>
                            <td colSpan={6}>No district data found for this region.</td>
                          </tr>
                        ) : (
                          districtOptions.map((district) => (
                            <tr key={district.district}>
                              <td>{district.district}</td>
                              <td>{district.schoolsSupported.toLocaleString()}</td>
                              <td>{district.visits.toLocaleString()}</td>
                              <td>{district.assessments.toLocaleString()}</td>
                              <td>{district.learnersAssessed.toLocaleString()}</td>
                              <td>
                                {district.statusCounts.onTrack} / {district.statusCounts.needsSupport}{" "}
                                / {district.statusCounts.highPriority}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="meta-line">No region profile data available.</p>
              )}
            </div>
          ) : null}

          {profileLevel === "district" ? (
            <div className="impact-profile-stack">
              <form method="GET" className="impact-profile-picker impact-profile-picker-wide">
                {persistentParams.map(([key, value]) =>
                  key === "profileRegion" || key === "profileDistrict" || key === "profileSchool" ? null : value ? (
                    <input key={key} type="hidden" name={key} value={value} />
                  ) : null,
                )}
                <input type="hidden" name="profile" value="district" />
                <label>
                  <span>Region</span>
                  <select name="profileRegion" defaultValue={selectedProfileRegion}>
                    {regionOptions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>District</span>
                  <select name="profileDistrict" defaultValue={selectedProfileDistrict}>
                    {districtOptions.map((district) => (
                      <option key={district.district} value={district.district}>
                        {district.district}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-ghost" type="submit">
                  Open district profile
                </button>
              </form>

              {selectedDistrictProfile ? (
                <>
                  <div className="impact-kpi-grid">
                    <article className="card impact-kpi-card">
                      <strong>{selectedDistrictProfile.schoolsSupported.toLocaleString()}</strong>
                      <span>Schools supported</span>
                    </article>
                    <article className="card impact-kpi-card">
                      <strong>{selectedDistrictProfile.visits.toLocaleString()}</strong>
                      <span>School visits completed</span>
                    </article>
                    <article className="card impact-kpi-card">
                      <strong>{selectedDistrictProfile.assessments.toLocaleString()}</strong>
                      <span>Assessments completed</span>
                    </article>
                    <article className="card impact-kpi-card">
                      <strong>{selectedDistrictProfile.learnersAssessed.toLocaleString()}</strong>
                      <span>Learners assessed</span>
                    </article>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>School</th>
                          <th>Enrollment</th>
                          <th>Visits</th>
                          <th>Assessments</th>
                          <th>Teacher quality</th>
                          <th>Learner outcomes snapshot</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schoolOptions.filter((school) => school.district === selectedDistrictProfile.district)
                          .length === 0 ? (
                          <tr>
                            <td colSpan={7}>No schools found for this district.</td>
                          </tr>
                        ) : (
                          schoolOptions
                            .filter((school) => school.district === selectedDistrictProfile.district)
                            .sort((a, b) => {
                              const statusOrder: Record<string, number> = {
                                "High priority": 0,
                                "Needs support": 1,
                                "On track": 2,
                              };
                              return (
                                (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) ||
                                b.learnersAssessed - a.learnersAssessed
                              );
                            })
                            .map((school) => (
                              <tr key={`${school.id ?? school.schoolCode}-${school.name}`}>
                                <td>{school.name}</td>
                                <td>{school.enrolledLearners.toLocaleString()}</td>
                                <td>{school.visits.toLocaleString()}</td>
                                <td>{school.assessments.toLocaleString()}</td>
                                <td>{formatMaybeNumber(school.teacherObservationAverage, "%")}</td>
                                <td>
                                  LS {formatMaybeNumber(school.outcomes.letterSound)} | Dec{" "}
                                  {formatMaybeNumber(school.outcomes.decoding)} | Flu{" "}
                                  {formatMaybeNumber(school.outcomes.fluency)} | Comp{" "}
                                  {formatMaybeNumber(school.outcomes.comprehension)}
                                </td>
                                <td>{school.status}</td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="meta-line">No district profile data available.</p>
              )}
            </div>
          ) : null}

          {profileLevel === "school" ? (
            <div className="impact-profile-stack">
              <form method="GET" className="impact-profile-picker impact-profile-picker-wide">
                {persistentParams.map(([key, value]) =>
                  key === "profileRegion" || key === "profileDistrict" || key === "profileSchool" ? null : value ? (
                    <input key={key} type="hidden" name={key} value={value} />
                  ) : null,
                )}
                <input type="hidden" name="profile" value="school" />
                <label>
                  <span>Region</span>
                  <select name="profileRegion" defaultValue={selectedProfileRegion}>
                    {regionOptions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>District</span>
                  <select name="profileDistrict" defaultValue={selectedProfileDistrict}>
                    {districtOptions.map((district) => (
                      <option key={district.district} value={district.district}>
                        {district.district}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>School</span>
                  <select
                    name="profileSchool"
                    defaultValue={selectedSchoolProfile?.id ? String(selectedSchoolProfile.id) : ""}
                  >
                    {schoolOptions.map((school) => (
                      <option
                        key={`${school.id ?? school.schoolCode}-${school.name}`}
                        value={school.id ? String(school.id) : ""}
                      >
                        {school.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-ghost" type="submit">
                  Open school profile
                </button>
              </form>

              {selectedSchoolProfile ? (
                <div className="cards-grid">
                  <article className="card">
                    <h3>School Overview</h3>
                    <p>
                      <strong>{selectedSchoolProfile.name}</strong> • {selectedSchoolProfile.district},{" "}
                      {selectedSchoolProfile.region}
                    </p>
                    <ul>
                      <li>School code: {selectedSchoolProfile.schoolCode}</li>
                      <li>
                        Enrollment: {selectedSchoolProfile.enrolledLearners.toLocaleString()} learners
                      </li>
                      <li>
                        Boys/Girls: {selectedSchoolProfile.enrolledBoys.toLocaleString()} /{" "}
                        {selectedSchoolProfile.enrolledGirls.toLocaleString()}
                      </li>
                      <li>
                        Location: {selectedSchoolProfile.subCounty || "-"} /{" "}
                        {selectedSchoolProfile.parish || "-"}
                        {selectedSchoolProfile.village
                          ? ` / ${selectedSchoolProfile.village}`
                          : ""}
                      </li>
                    </ul>
                  </article>

                  <article className="card">
                    <h3>Program Implementation Timeline</h3>
                    <ul>
                      <li>Training sessions: {selectedSchoolProfile.trainings.toLocaleString()}</li>
                      <li>School visits: {selectedSchoolProfile.visits.toLocaleString()}</li>
                      <li>Coaching cycles: {selectedSchoolProfile.coachingCycles.toLocaleString()}</li>
                      <li>Assessments: {selectedSchoolProfile.assessments.toLocaleString()}</li>
                      <li>
                        Baseline / Progress / Endline: {selectedSchoolProfile.baselineAssessments} /{" "}
                        {selectedSchoolProfile.progressAssessments} /{" "}
                        {selectedSchoolProfile.endlineAssessments}
                      </li>
                      <li>1001 Story activities: {selectedSchoolProfile.storyActivities.toLocaleString()}</li>
                    </ul>
                  </article>

                  <article className="card">
                    <h3>Teacher Instruction Quality</h3>
                    <ul>
                      <li>
                        Observation average:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.teacherObservationAverage, "%")}
                      </li>
                      <li>
                        Lesson structure:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.keyIndicators.lessonStructure, "%")}
                      </li>
                      <li>
                        Sound accuracy:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.keyIndicators.soundAccuracy, "%")}
                      </li>
                      <li>
                        Blending routine:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.keyIndicators.blendingRoutine, "%")}
                      </li>
                      <li>
                        Error correction:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.keyIndicators.errorCorrection, "%")}
                      </li>
                      <li>
                        Learner engagement:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.keyIndicators.learnerEngagement, "%")}
                      </li>
                    </ul>
                  </article>

                  <article className="card">
                    <h3>Learner Reading Outcomes</h3>
                    <ul>
                      <li>
                        Letter-sound knowledge:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.outcomes.letterSound)}
                      </li>
                      <li>
                        Blending/decoding:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.outcomes.decoding)}
                      </li>
                      <li>
                        Oral reading fluency:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.outcomes.fluency)}
                      </li>
                      <li>
                        Comprehension:{" "}
                        {formatMaybeNumber(selectedSchoolProfile.outcomes.comprehension)}
                      </li>
                      <li>
                        Learners assessed sample:{" "}
                        {selectedSchoolProfile.outcomes.sampleSize.toLocaleString()}
                      </li>
                    </ul>
                  </article>

                  <article className="card">
                    <h3>Evidence &amp; Downloads</h3>
                    <ul>
                      <li>Evidence uploads: {selectedSchoolProfile.evidenceUploads.toLocaleString()}</li>
                      <li>Learners assessed (total): {selectedSchoolProfile.learnersAssessed.toLocaleString()}</li>
                      <li>Stories published: {selectedSchoolProfile.storiesPublished.toLocaleString()}</li>
                    </ul>
                    <div className="action-row">
                      <Link className="inline-download-link" href="/impact/reports">
                        Download district/region reports
                      </Link>
                      {schoolReport ? (
                        <Link
                          className="inline-download-link"
                          href={`/impact/reports/${schoolReport.reportCode}`}
                        >
                          Open school report
                        </Link>
                      ) : null}
                    </div>
                  </article>

                  <article className="card">
                    <h3>Status &amp; Next Actions</h3>
                    <p>
                      <strong>Status:</strong> {selectedSchoolProfile.status}
                    </p>
                    <p>
                      <strong>Next follow-up date:</strong>{" "}
                      {selectedSchoolProfile.nextFollowUpDate ?? "Not scheduled"}
                    </p>
                    <p>
                      <strong>Top gaps:</strong>{" "}
                      {selectedSchoolProfile.topGaps.length > 0
                        ? selectedSchoolProfile.topGaps.join("; ")
                        : "No critical gaps flagged from available records."}
                    </p>
                    {selectedSchoolProfile.recommendedActions.length > 0 ? (
                      <ul>
                        {selectedSchoolProfile.recommendedActions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                </div>
              ) : (
                <p className="meta-line">No school profile data available.</p>
              )}

              {selectedSchoolProfile ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Module</th>
                        <th>Program Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSchoolProfile.timeline.length === 0 ? (
                        <tr>
                          <td colSpan={4}>No logged activities for this school yet.</td>
                        </tr>
                      ) : (
                        selectedSchoolProfile.timeline.map((item) => (
                          <tr key={`${item.module}-${item.date}-${item.programType}`}>
                            <td>{new Date(item.date).toLocaleDateString()}</td>
                            <td>{item.module}</td>
                            <td>{item.programType}</td>
                            <td>{item.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="container card impact-filter-card">
          <h2>Filters</h2>
          <form method="GET" className="filters impact-filter-grid">
            <input type="hidden" name="profile" value={profileLevel} />
            <input type="hidden" name="profileRegion" value={selectedProfileRegion} />
            <input type="hidden" name="profileDistrict" value={selectedProfileDistrict} />
            <input
              type="hidden"
              name="profileSchool"
              value={selectedSchoolProfile?.id ? String(selectedSchoolProfile.id) : ""}
            />
            <label>
              <span>Year</span>
              <select name="year" defaultValue={selected.year || ""}>
                <option value="">All years</option>
                {facets.years.map((year) => (
                  <option value={year} key={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Term</span>
              <select name="term" defaultValue={selected.term || ""}>
                <option value="">All terms</option>
                <option value="Q1">Quarter 1</option>
                <option value="Q2">Quarter 2</option>
                <option value="Q3">Quarter 3</option>
                <option value="Q4">Quarter 4</option>
              </select>
            </label>
            <label>
              <span>Region</span>
              <select name="region" defaultValue={selected.region || ""}>
                <option value="">All regions</option>
                {facets.regions.map((region) => (
                  <option value={region} key={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>District</span>
              <select name="district" defaultValue={selected.district || ""}>
                <option value="">All districts</option>
                {facets.scopeValues.map((scopeValue) => (
                  <option value={scopeValue} key={scopeValue}>
                    {scopeValue}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Program component</span>
              <select name="program" defaultValue={selected.program || ""}>
                <option value="">All components</option>
                <option value="training">Training</option>
                <option value="visit">Coaching</option>
                <option value="assessment">Assessments</option>
                <option value="story">1001 Story</option>
                <option value="resources">Resources</option>
                <option value="online-training">Online Training</option>
              </select>
            </label>
            <button className="button" type="submit">
              Apply filters
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container impact-kpi-grid">
          {coverageTotals.map((metric) => (
            <article className="card impact-kpi-card" key={metric.label}>
              <strong>{formatMetric(metric.value)}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Coaching and assessment coverage</h3>
            <ul>
              <li>
                Coaching visits completed: {formatMetric(latest?.factPack.coverageDelivery.coachingVisitsCompleted)}
              </li>
              <li>
                Coaching visits planned: {formatMetric(latest?.factPack.coverageDelivery.coachingVisitsPlanned)}
              </li>
              <li>Baseline assessments: {assessmentCoverage.baseline.toLocaleString()}</li>
              <li>Progress assessments: {assessmentCoverage.progress.toLocaleString()}</li>
              <li>Endline assessments: {assessmentCoverage.endline.toLocaleString()}</li>
            </ul>
          </article>

          <article className="card">
            <h3>Learning outcomes (aggregated)</h3>
            <ul>
              <li>
                Letter-sound change: {formatMetric(latest?.factPack.learningOutcomes.letterSoundKnowledge.change)}
              </li>
              <li>
                Decoding change: {formatMetric(latest?.factPack.learningOutcomes.decodingAccuracy.change)}
              </li>
              <li>
                Oral fluency change: {formatMetric(latest?.factPack.learningOutcomes.oralReadingFluencyWcpm.change)}
              </li>
              <li>
                Comprehension change: {formatMetric(latest?.factPack.learningOutcomes.comprehension.change)}
              </li>
              <li>
                Proficiency movement: {formatMetric(latest?.factPack.learningOutcomes.proficiencyBandMovementPercent)}
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Resource downloads (by type)</h3>
            {downloadByType.length === 0 ? (
              <p className="meta-line">Data not available for this period.</p>
            ) : (
              <ul>
                {downloadByType.slice(0, 8).map((item) => (
                  <li key={item.type}>
                    {item.type}: {item.downloads.toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Region and district map view (table summary)</h2>
          <p className="meta-line">
            Public view shows aggregated scope shading by region or district from available reports.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Scope type</th>
                  <th>Scope value</th>
                  <th>Schools impacted</th>
                  <th>Learners reached</th>
                </tr>
              </thead>
              <tbody>
                {scopeRows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Data not available for current filters.</td>
                  </tr>
                ) : (
                  scopeRows.map((row, index) => (
                    <tr key={`${row.scopeType}-${row.scopeValue}-${index + 1}`}>
                      <td>{row.scopeType}</td>
                      <td>{row.scopeValue}</td>
                      <td>{row.schools.toLocaleString()}</td>
                      <td>{row.learners.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
