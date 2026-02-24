"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PortalOperationalReportsData, PortalSchoolReportRow, PortalUser } from "@/lib/types";

type ReportModuleFilter =
  | "all"
  | "training"
  | "visit"
  | "story"
  | "resource"
  | "teacher-assessment"
  | "learner-assessment";

interface PortalOperationsReportsWorkspaceProps {
  data: PortalOperationalReportsData;
  user: PortalUser;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

function sanitizeQueryValue(value: string | null) {
  if (!value) return "all";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "all";
}

function getModuleCount(row: PortalSchoolReportRow, module: ReportModuleFilter) {
  if (module === "training") return row.trainings;
  if (module === "visit") return row.schoolVisits;
  if (module === "story") return row.storyActivities;
  if (module === "resource") return row.resourcesDistributed;
  if (module === "teacher-assessment") return row.teacherAssessments;
  if (module === "learner-assessment") return row.learnerAssessments;
  return (
    row.trainings +
    row.schoolVisits +
    row.storyActivities +
    row.resourcesDistributed +
    row.teacherAssessments +
    row.learnerAssessments
  );
}

function uniqueValues(rows: PortalSchoolReportRow[], getter: (row: PortalSchoolReportRow) => string | null | undefined) {
  return [...new Set(rows.map(getter).map((value) => (value ?? "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function matchesFilter(value: string | null | undefined, selected: string) {
  if (selected === "all") return true;
  return (value ?? "").trim().toLowerCase() === selected.toLowerCase();
}

const moduleOptions: Array<{ value: ReportModuleFilter; label: string }> = [
  { value: "all", label: "All tracked items" },
  { value: "training", label: "Trainings" },
  { value: "visit", label: "School visits" },
  { value: "story", label: "1001 story activities" },
  { value: "resource", label: "Resources" },
  { value: "teacher-assessment", label: "Teacher assessments" },
  { value: "learner-assessment", label: "Learner assessments" },
];

export function PortalOperationsReportsWorkspace({
  data,
  user,
}: PortalOperationsReportsWorkspaceProps) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [moduleFilter, setModuleFilter] = useState<ReportModuleFilter>(() => {
    const raw = (searchParams.get("module") ?? "all") as ReportModuleFilter;
    return moduleOptions.some((item) => item.value === raw) ? raw : "all";
  });
  const [country, setCountry] = useState(() => sanitizeQueryValue(searchParams.get("country")));
  const [region, setRegion] = useState(() => sanitizeQueryValue(searchParams.get("region")));
  const [subRegion, setSubRegion] = useState(() => sanitizeQueryValue(searchParams.get("subRegion")));
  const [district, setDistrict] = useState(() => sanitizeQueryValue(searchParams.get("district")));
  const [subCounty, setSubCounty] = useState(() => sanitizeQueryValue(searchParams.get("subCounty")));
  const [parish, setParish] = useState(() => sanitizeQueryValue(searchParams.get("parish")));
  const [village, setVillage] = useState(() => sanitizeQueryValue(searchParams.get("village")));

  const countries = useMemo(() => uniqueValues(data.schools, (row) => row.country), [data.schools]);
  const regions = useMemo(
    () =>
      uniqueValues(
        data.schools.filter((row) => matchesFilter(row.country, country)),
        (row) => row.region,
      ),
    [country, data.schools],
  );
  const subRegions = useMemo(
    () =>
      uniqueValues(
        data.schools.filter(
          (row) => matchesFilter(row.country, country) && matchesFilter(row.region, region),
        ),
        (row) => row.subRegion,
      ),
    [country, data.schools, region],
  );
  const districts = useMemo(
    () =>
      uniqueValues(
        data.schools.filter(
          (row) =>
            matchesFilter(row.country, country) &&
            matchesFilter(row.region, region) &&
            matchesFilter(row.subRegion, subRegion),
        ),
        (row) => row.district,
      ),
    [country, data.schools, region, subRegion],
  );
  const subCounties = useMemo(
    () =>
      uniqueValues(
        data.schools.filter(
          (row) =>
            matchesFilter(row.country, country) &&
            matchesFilter(row.region, region) &&
            matchesFilter(row.subRegion, subRegion) &&
            matchesFilter(row.district, district),
        ),
        (row) => row.subCounty,
      ),
    [country, data.schools, district, region, subRegion],
  );
  const parishes = useMemo(
    () =>
      uniqueValues(
        data.schools.filter(
          (row) =>
            matchesFilter(row.country, country) &&
            matchesFilter(row.region, region) &&
            matchesFilter(row.subRegion, subRegion) &&
            matchesFilter(row.district, district) &&
            matchesFilter(row.subCounty, subCounty),
        ),
        (row) => row.parish,
      ),
    [country, data.schools, district, region, subCounty, subRegion],
  );
  const villages = useMemo(
    () =>
      uniqueValues(
        data.schools.filter(
          (row) =>
            matchesFilter(row.country, country) &&
            matchesFilter(row.region, region) &&
            matchesFilter(row.subRegion, subRegion) &&
            matchesFilter(row.district, district) &&
            matchesFilter(row.subCounty, subCounty) &&
            matchesFilter(row.parish, parish),
        ),
        (row) => row.village,
      ),
    [country, data.schools, district, parish, region, subCounty, subRegion],
  );

  useEffect(() => {
    if (country !== "all" && !countries.includes(country)) {
      setCountry("all");
    }
  }, [countries, country]);

  useEffect(() => {
    if (region !== "all" && !regions.includes(region)) {
      setRegion("all");
    }
  }, [region, regions]);

  useEffect(() => {
    if (subRegion !== "all" && !subRegions.includes(subRegion)) {
      setSubRegion("all");
    }
  }, [subRegion, subRegions]);

  useEffect(() => {
    if (district !== "all" && !districts.includes(district)) {
      setDistrict("all");
    }
  }, [district, districts]);

  useEffect(() => {
    if (subCounty !== "all" && !subCounties.includes(subCounty)) {
      setSubCounty("all");
    }
  }, [subCounties, subCounty]);

  useEffect(() => {
    if (parish !== "all" && !parishes.includes(parish)) {
      setParish("all");
    }
  }, [parish, parishes]);

  useEffect(() => {
    if (village !== "all" && !villages.includes(village)) {
      setVillage("all");
    }
  }, [village, villages]);

  const filteredSchools = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.schools.filter((row) => {
      const geoMatch =
        matchesFilter(row.country, country) &&
        matchesFilter(row.region, region) &&
        matchesFilter(row.subRegion, subRegion) &&
        matchesFilter(row.district, district) &&
        matchesFilter(row.subCounty, subCounty) &&
        matchesFilter(row.parish, parish) &&
        matchesFilter(row.village, village);

      const moduleMatch = getModuleCount(row, moduleFilter) > 0 || moduleFilter === "all";
      const matchesSearch =
        query.length === 0 ||
        row.schoolName.toLowerCase().includes(query) ||
        row.schoolCode.toLowerCase().includes(query) ||
        row.accountOwner.toLowerCase().includes(query) ||
        row.district.toLowerCase().includes(query) ||
        (row.subCounty ?? "").toLowerCase().includes(query) ||
        (row.parish ?? "").toLowerCase().includes(query) ||
        (row.village ?? "").toLowerCase().includes(query) ||
        (row.primaryContact ?? "").toLowerCase().includes(query) ||
        (row.phone ?? "").toLowerCase().includes(query);
      return geoMatch && moduleMatch && matchesSearch;
    });
  }, [country, data.schools, district, moduleFilter, parish, region, search, subCounty, subRegion, village]);

  const districtBars = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredSchools.forEach((row) => {
      const value = getModuleCount(row, moduleFilter);
      grouped.set(row.district, (grouped.get(row.district) ?? 0) + value);
    });
    const entries = [...grouped.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    const max = entries.length > 0 ? Math.max(...entries.map((entry) => entry.total)) : 1;
    return { entries, max: max || 1 };
  }, [filteredSchools, moduleFilter]);

  const summary = useMemo(() => {
    const totalRecords = filteredSchools.reduce(
      (sum, row) => sum + getModuleCount(row, moduleFilter),
      0,
    );
    const schoolsWithContacts = filteredSchools.filter((row) => row.contactsCount > 0).length;
    const teacherObservationCount = filteredSchools.reduce(
      (sum, row) => sum + row.teacherObservationCount,
      0,
    );
    return {
      totalRecords,
      enrollment: filteredSchools.reduce((sum, row) => sum + row.currentEnrollment, 0),
      trainings: filteredSchools.reduce((sum, row) => sum + row.trainings, 0),
      schoolVisits: filteredSchools.reduce((sum, row) => sum + row.schoolVisits, 0),
      storyActivities: filteredSchools.reduce((sum, row) => sum + row.storyActivities, 0),
      resourcesDistributed: filteredSchools.reduce((sum, row) => sum + row.resourcesDistributed, 0),
      teacherAssessments: filteredSchools.reduce((sum, row) => sum + row.teacherAssessments, 0),
      learnerAssessments: filteredSchools.reduce((sum, row) => sum + row.learnerAssessments, 0),
      schoolsWithContacts,
      teacherObservationCount,
    };
  }, [filteredSchools, moduleFilter]);

  const schoolIds = useMemo(
    () => new Set(filteredSchools.map((row) => row.schoolId)),
    [filteredSchools],
  );

  const observationSummary = useMemo(() => {
    const scopedEvents = data.observationEvents.filter((event) => schoolIds.has(event.schoolId));
    const overallAverage =
      scopedEvents.length > 0
        ? scopedEvents.reduce((sum, event) => sum + event.overallScore, 0) / scopedEvents.length
        : null;

    const domainMap = new Map<
      string,
      { key: string; label: string; totalScore: number; totalMax: number; count: number }
    >();

    scopedEvents.forEach((event) => {
      event.indicators.forEach((indicator) => {
        const key = indicator.key || indicator.label || "domain";
        const current =
          domainMap.get(key) ?? {
            key,
            label: indicator.label || indicator.key || "Domain",
            totalScore: 0,
            totalMax: 0,
            count: 0,
          };
        current.totalScore += Number(indicator.score ?? 0);
        current.totalMax += Number(indicator.maxScore ?? 0);
        current.count += 1;
        domainMap.set(key, current);
      });
    });

    const domains = [...domainMap.values()]
      .map((domain) => ({
        key: domain.key,
        label: domain.label,
        averagePct: domain.totalMax > 0 ? (domain.totalScore / domain.totalMax) * 100 : 0,
        averageScore: domain.count > 0 ? domain.totalScore / domain.count : 0,
        sampleSize: domain.count,
      }))
      .sort((a, b) => b.averagePct - a.averagePct);

    return { overallAverage, events: scopedEvents.length, domains };
  }, [data.observationEvents, schoolIds]);

  const funnel = useMemo(() => {
    const totalSchools = filteredSchools.length;
    const trained = filteredSchools.filter((row) => row.trainings > 0).length;
    const visited = filteredSchools.filter((row) => row.schoolVisits > 0).length;
    const observed = filteredSchools.filter((row) => row.teacherAssessments > 0).length;
    const assessed = filteredSchools.filter((row) => row.learnerAssessments > 0).length;
    const denominator = totalSchools > 0 ? totalSchools : 1;

    return [
      { label: "Schools in scope", value: totalSchools, pct: 100 },
      { label: "Schools trained", value: trained, pct: Math.round((trained / denominator) * 100) },
      { label: "Schools visited", value: visited, pct: Math.round((visited / denominator) * 100) },
      {
        label: "Teacher observations",
        value: observed,
        pct: Math.round((observed / denominator) * 100),
      },
      {
        label: "Learner assessments",
        value: assessed,
        pct: Math.round((assessed / denominator) * 100),
      },
    ];
  }, [filteredSchools]);

  const canExport =
    user.role === "Staff" ||
    user.role === "Volunteer" ||
    user.role === "Admin" ||
    user.isSupervisor ||
    user.isME ||
    user.isAdmin ||
    user.isSuperAdmin;

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ format: "csv", module: moduleFilter });
    if (search.trim().length > 0) params.set("search", search.trim());
    if (country !== "all") params.set("country", country);
    if (region !== "all") params.set("region", region);
    if (subRegion !== "all") params.set("subRegion", subRegion);
    if (district !== "all") params.set("district", district);
    if (subCounty !== "all") params.set("subCounty", subCounty);
    if (parish !== "all") params.set("parish", parish);
    if (village !== "all") params.set("village", village);
    return `/api/portal/reports/schools?${params.toString()}`;
  }, [country, district, moduleFilter, parish, region, search, subCounty, subRegion, village]);

  const resetFilters = () => {
    setSearch("");
    setModuleFilter("all");
    setCountry("all");
    setRegion("all");
    setSubRegion("all");
    setDistrict("all");
    setSubCounty("all");
    setParish("all");
    setVillage("all");
  };

  return (
    <section className="card portal-report-workspace">
      <header className="portal-report-toolbar">
        <div>
          <p className="portal-overline">Report: Schools and District</p>
          <h2>School Operations Report Workspace</h2>
          <p>
            Schools, contacts, trainings, visits, assessments, 1001 story, and resources in one
            live report.
          </p>
        </div>
        <div className="portal-report-actions">
          <button type="button" className="button button-ghost" onClick={resetFilters}>
            Clear filters
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
          {canExport ? (
            <a className="button" href={exportHref}>
              Export CSV
            </a>
          ) : null}
        </div>
      </header>

      <div className="portal-report-filter-grid">
        <label>
          <span>Search</span>
          <input
            placeholder="Search school, contact, district, sub-county, parish"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span>Tracked item</span>
          <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value as ReportModuleFilter)}>
            {moduleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Country</span>
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="all">All countries</option>
            {countries.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Region</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="all">All regions</option>
            {regions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sub-region</span>
          <select value={subRegion} onChange={(event) => setSubRegion(event.target.value)}>
            <option value="all">All sub-regions</option>
            {subRegions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>District</span>
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="all">All districts</option>
            {districts.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sub-county</span>
          <select value={subCounty} onChange={(event) => setSubCounty(event.target.value)}>
            <option value="all">All sub-counties</option>
            {subCounties.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Parish</span>
          <select value={parish} onChange={(event) => setParish(event.target.value)}>
            <option value="all">All parishes</option>
            {parishes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Village</span>
          <select value={village} onChange={(event) => setVillage(event.target.value)}>
            <option value="all">All villages</option>
            {villages.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="portal-report-meta">
          <p>
            Last updated: <strong>{new Date(data.generatedAt).toLocaleString()}</strong>
          </p>
          <p>
            Showing <strong>{filteredSchools.length.toLocaleString()}</strong> of{" "}
            <strong>{data.totals.totalSchools.toLocaleString()}</strong> schools
          </p>
        </div>
      </div>

      <section className="portal-report-summary-grid">
        <article>
          <span>Total records</span>
          <strong>{summary.totalRecords.toLocaleString()}</strong>
        </article>
        <article>
          <span>Total current enrollment</span>
          <strong>{summary.enrollment.toLocaleString()}</strong>
        </article>
        <article>
          <span>Trainings</span>
          <strong>{summary.trainings.toLocaleString()}</strong>
        </article>
        <article>
          <span>School visits</span>
          <strong>{summary.schoolVisits.toLocaleString()}</strong>
        </article>
        <article>
          <span>Teacher assessments</span>
          <strong>{summary.teacherAssessments.toLocaleString()}</strong>
        </article>
        <article>
          <span>Learner assessments</span>
          <strong>{summary.learnerAssessments.toLocaleString()}</strong>
        </article>
        <article>
          <span>1001 story activities</span>
          <strong>{summary.storyActivities.toLocaleString()}</strong>
        </article>
        <article>
          <span>Resources distributed</span>
          <strong>{summary.resourcesDistributed.toLocaleString()}</strong>
        </article>
        <article>
          <span>Schools with contacts</span>
          <strong>{summary.schoolsWithContacts.toLocaleString()}</strong>
        </article>
      </section>

      <div className="portal-report-insight-grid">
        <section className="portal-report-funnel-card">
          <h3>Implementation Funnel</h3>
          <div className="portal-report-funnel-compact">
            {funnel.map((item) => (
              <div key={item.label} className="portal-report-funnel-row">
                <span>{item.label}</span>
                <div className="portal-report-funnel-track">
                  <i style={{ width: `${Math.max(4, item.pct)}%` }} />
                </div>
                <strong>{item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="portal-report-observation-card">
          <h3>Teachers&apos; Observation Outcomes</h3>
          <p className="portal-report-observation-meta">
            Observations: <strong>{observationSummary.events.toLocaleString()}</strong>{" "}
            {observationSummary.overallAverage !== null ? (
              <>
                • Average score:{" "}
                <strong>{observationSummary.overallAverage.toFixed(1)}</strong>
              </>
            ) : null}
          </p>
          {observationSummary.domains.length === 0 ? (
            <p className="portal-report-empty">No teacher observation outcomes for this filter.</p>
          ) : (
            <div className="portal-report-observation-list">
              {observationSummary.domains.map((domain) => (
                <div key={domain.key} className="portal-report-observation-row">
                  <span>{domain.label}</span>
                  <div className="portal-report-observation-track">
                    <i style={{ width: `${Math.max(4, Math.min(100, domain.averagePct))}%` }} />
                  </div>
                  <strong>
                    {domain.averagePct.toFixed(0)}% (n={domain.sampleSize})
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="portal-report-chart">
        <h3>Record Count by District</h3>
        {districtBars.entries.length === 0 ? (
          <p>No records match the current filter.</p>
        ) : (
          <div className="portal-report-chart-bars">
            {districtBars.entries.map((entry) => (
              <div key={entry.name} className="portal-report-chart-row">
                <span>{entry.name}</span>
                <div className="portal-report-chart-track">
                  <i style={{ width: `${(entry.total / districtBars.max) * 100}%` }} />
                </div>
                <strong>{entry.total.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="table-wrap portal-report-table">
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Region</th>
              <th>Sub-region</th>
              <th>District</th>
              <th>Sub-county</th>
              <th>Parish</th>
              <th>Village</th>
              <th>School ID</th>
              <th>School Code</th>
              <th>Account Owner</th>
              <th>School Name</th>
              <th>Last Activity</th>
              <th>Enrollment</th>
              <th>Status</th>
              <th>Phone</th>
              <th>Primary Contact</th>
              <th>Trainings</th>
              <th>Visits</th>
              <th>1001 Story</th>
              <th>Resources</th>
              <th>Teacher Assessments</th>
              <th>Learner Assessments</th>
              <th>Total Records</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchools.length === 0 ? (
              <tr>
                <td colSpan={23}>No schools match the selected filters.</td>
              </tr>
            ) : (
              filteredSchools.map((row) => (
                <tr key={row.schoolId}>
                  <td>{row.country ?? "Uganda"}</td>
                  <td>{row.region ?? "N/A"}</td>
                  <td>{row.subRegion ?? "N/A"}</td>
                  <td>{row.district}</td>
                  <td>{row.subCounty ?? "N/A"}</td>
                  <td>{row.parish ?? "N/A"}</td>
                  <td>{row.village ?? "N/A"}</td>
                  <td>{row.schoolId}</td>
                  <td>{row.schoolCode}</td>
                  <td>{row.accountOwner}</td>
                  <td>
                    <Link href={`/portal/schools/${row.schoolId}`}>{row.schoolName}</Link>
                  </td>
                  <td>{formatDate(row.lastActivityDate)}</td>
                  <td>{row.currentEnrollment.toLocaleString()}</td>
                  <td>{row.schoolStatus}</td>
                  <td>{row.phone ?? "N/A"}</td>
                  <td>{row.primaryContact ?? "N/A"}</td>
                  <td>{row.trainings.toLocaleString()}</td>
                  <td>{row.schoolVisits.toLocaleString()}</td>
                  <td>{row.storyActivities.toLocaleString()}</td>
                  <td>{row.resourcesDistributed.toLocaleString()}</td>
                  <td>{row.teacherAssessments.toLocaleString()}</td>
                  <td>{row.learnerAssessments.toLocaleString()}</td>
                  <td>
                    <strong>{getModuleCount(row, moduleFilter).toLocaleString()}</strong>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
