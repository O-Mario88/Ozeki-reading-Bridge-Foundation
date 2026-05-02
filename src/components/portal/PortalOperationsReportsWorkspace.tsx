"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import {
  PortalAssessmentActivityReportRow,
  PortalEvaluationActivityReportRow,
  PortalOperationalReportsData,
  PortalSchoolReportRow,
  PortalTrainingActivityReportRow,
  PortalUser,
  PortalVisitActivityReportRow,
} from "@/lib/types";

type ReportModuleFilter =
  | "all"
  | "training"
  | "visit"
  | "story"
  | "resource"
  | "evaluation"
  | "teacher-assessment"
  | "learner-assessment";

type DetailReportType = "training" | "visit" | "evaluation" | "assessment";

interface PortalOperationsReportsWorkspaceProps {
  data: PortalOperationalReportsData;
  user: PortalUser;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB");
}

function sanitizeQueryValue(value: string | null) {
  if (!value) return "all";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "all";
}

function formatLabel(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "N/A";
  return text
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => (part ? `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}` : ""))
    .join(" ");
}

function getModuleCount(row: PortalSchoolReportRow, module: ReportModuleFilter) {
  if (module === "training") return row.trainings;
  if (module === "visit") return row.schoolVisits;
  if (module === "story") return row.storyActivities;
  if (module === "resource") return row.resourcesDistributed;
  if (module === "evaluation") return row.lessonEvaluations;
  if (module === "teacher-assessment") return row.teacherAssessments;
  if (module === "learner-assessment") return row.learnerAssessments;
  return (
    row.trainings +
    row.schoolVisits +
    row.storyActivities +
    row.resourcesDistributed +
    row.lessonEvaluations +
    row.teacherAssessments +
    row.learnerAssessments
  );
}

function uniqueValues(
  rows: PortalSchoolReportRow[],
  getter: (row: PortalSchoolReportRow) => string | null | undefined,
) {
  return [...new Set(rows.map(getter).map((value) => (value ?? "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function matchesFilter(value: string | null | undefined, selected: string) {
  if (selected === "all") return true;
  return (value ?? "").trim().toLowerCase() === selected.toLowerCase();
}

function normalizeModuleFilter(value: string | null): ReportModuleFilter {
  const normalized = String(value ?? "all").trim().toLowerCase();
  if (normalized === "training") return "training";
  if (normalized === "visit") return "visit";
  if (normalized === "story") return "story";
  if (normalized === "resource") return "resource";
  if (normalized === "evaluation") return "evaluation";
  if (normalized === "teacher-assessment") return "teacher-assessment";
  if (normalized === "assessment" || normalized === "learner-assessment") return "learner-assessment";
  return "all";
}

function normalizeDetailReportType(value: string | null): DetailReportType {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "visit") return "visit";
  if (normalized === "evaluation" || normalized === "teacher-assessment") return "evaluation";
  if (normalized === "assessment" || normalized === "learner-assessment") return "assessment";
  return "training";
}

function detailTypeToModuleFilter(detailType: DetailReportType): ReportModuleFilter {
  if (detailType === "training") return "training";
  if (detailType === "visit") return "visit";
  if (detailType === "evaluation") return "evaluation";
  return "learner-assessment";
}

function numberOrDash(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "N/A";
  return Number(value).toFixed(digits);
}

function TableCell({
  value,
  className,
}: {
  value: string | number | null | undefined;
  className?: string;
}) {
  const text = String(value ?? "N/A");
  return (
    <span className={`portal-table-cell-ellipsis ${className ?? ""}`.trim()} title={text}>
      {text}
    </span>
  );
}

const moduleOptions: Array<{ value: ReportModuleFilter; label: string }> = [
  { value: "all", label: "All tracked items" },
  { value: "training", label: "Trainings" },
  { value: "visit", label: "School visits" },
  { value: "story", label: "1001 story activities" },
  { value: "resource", label: "Resources" },
  { value: "evaluation", label: "Lesson evaluations" },
  { value: "teacher-assessment", label: "Teacher assessments" },
  { value: "learner-assessment", label: "Learner assessments" },
];

const detailReportOptions: Array<{ value: DetailReportType; label: string; description: string }> = [
  {
    value: "training",
    label: "Training report",
    description:
      "Date, training name, location, schools reached, participants by role and gender, trainer, and funding source.",
  },
  {
    value: "visit",
    label: "Visit report",
    description:
      "Date, school, visit type, implementation status, pathway, focus areas, coach, follow-up date, and funding source.",
  },
  {
    value: "evaluation",
    label: "Evaluation report",
    description:
      "Date, school, teacher, grade, class size, evaluation score and level, coaching actions, observer, and funding source.",
  },
  {
    value: "assessment",
    label: "Assessment report",
    description:
      "Date, school, assessment type, class, learners assessed, average domain scores, assessor, and funding source.",
  },
];

export function PortalOperationsReportsWorkspace({
  data,
  user,
}: PortalOperationsReportsWorkspaceProps) {
  const searchParams = useSearchParams();
  const rawModuleQuery = searchParams.get("module");
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [moduleFilter, setModuleFilter] = useState<ReportModuleFilter>(() =>
    normalizeModuleFilter(rawModuleQuery),
  );
  const [detailReportType, setDetailReportType] = useState<DetailReportType>(() =>
    normalizeDetailReportType(rawModuleQuery),
  );
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
    if (country !== "all" && !countries.includes(country)) setCountry("all");
  }, [countries, country]);

  useEffect(() => {
    if (region !== "all" && !regions.includes(region)) setRegion("all");
  }, [region, regions]);

  useEffect(() => {
    if (subRegion !== "all" && !subRegions.includes(subRegion)) setSubRegion("all");
  }, [subRegion, subRegions]);

  useEffect(() => {
    if (district !== "all" && !districts.includes(district)) setDistrict("all");
  }, [district, districts]);

  useEffect(() => {
    if (subCounty !== "all" && !subCounties.includes(subCounty)) setSubCounty("all");
  }, [subCounties, subCounty]);

  useEffect(() => {
    if (parish !== "all" && !parishes.includes(parish)) setParish("all");
  }, [parish, parishes]);

  useEffect(() => {
    if (village !== "all" && !villages.includes(village)) setVillage("all");
  }, [village, villages]);

  const normalizedSearch = search.trim().toLowerCase();

  const matchesGeoScope = (row: {
    country?: string | null;
    region?: string | null;
    subRegion?: string | null;
    district: string;
    subCounty?: string | null;
    parish?: string | null;
    village?: string | null;
  }) =>
    matchesFilter(row.country, country) &&
    matchesFilter(row.region, region) &&
    matchesFilter(row.subRegion, subRegion) &&
    matchesFilter(row.district, district) &&
    matchesFilter(row.subCounty, subCounty) &&
    matchesFilter(row.parish, parish) &&
    matchesFilter(row.village, village);

  const filteredSchools = useMemo(() => {
    return data.schools.filter((row) => {
      const moduleMatch = getModuleCount(row, moduleFilter) > 0 || moduleFilter === "all";
      const searchMatch =
        normalizedSearch.length === 0 ||
        row.schoolName.toLowerCase().includes(normalizedSearch) ||
        row.schoolCode.toLowerCase().includes(normalizedSearch) ||
        row.accountOwner.toLowerCase().includes(normalizedSearch) ||
        row.district.toLowerCase().includes(normalizedSearch) ||
        (row.subCounty ?? "").toLowerCase().includes(normalizedSearch) ||
        (row.parish ?? "").toLowerCase().includes(normalizedSearch) ||
        (row.village ?? "").toLowerCase().includes(normalizedSearch) ||
        (row.primaryContact ?? "").toLowerCase().includes(normalizedSearch) ||
        (row.phone ?? "").toLowerCase().includes(normalizedSearch);
      return matchesGeoScope(row) && moduleMatch && searchMatch;
    });
  }, [
    data.schools,
    district,
    moduleFilter,
    normalizedSearch,
    parish,
    region,
    country,
    subCounty,
    subRegion,
    village,
  ]);

  const filteredTrainingActivities = useMemo(
    () =>
      data.trainingActivities.filter((row) => {
        const searchMatch =
          normalizedSearch.length === 0 ||
          row.trainingName.toLowerCase().includes(normalizedSearch) ||
          row.trainerName.toLowerCase().includes(normalizedSearch) ||
          row.location.toLowerCase().includes(normalizedSearch) ||
          row.district.toLowerCase().includes(normalizedSearch) ||
          (row.fundedBy ?? "").toLowerCase().includes(normalizedSearch);
        return matchesGeoScope(row) && searchMatch;
      }),
    [data.trainingActivities, district, normalizedSearch, parish, region, country, subCounty, subRegion, village],
  );

  const filteredVisitActivities = useMemo(
    () =>
      data.visitActivities.filter((row) => {
        const searchMatch =
          normalizedSearch.length === 0 ||
          row.schoolName.toLowerCase().includes(normalizedSearch) ||
          row.schoolCode.toLowerCase().includes(normalizedSearch) ||
          row.visitType.toLowerCase().includes(normalizedSearch) ||
          row.focusAreas.toLowerCase().includes(normalizedSearch) ||
          row.coachName.toLowerCase().includes(normalizedSearch) ||
          row.district.toLowerCase().includes(normalizedSearch) ||
          (row.fundedBy ?? "").toLowerCase().includes(normalizedSearch);
        return matchesGeoScope(row) && searchMatch;
      }),
    [data.visitActivities, district, normalizedSearch, parish, region, country, subCounty, subRegion, village],
  );

  const filteredEvaluationActivities = useMemo(
    () =>
      data.evaluationActivities.filter((row) => {
        const searchMatch =
          normalizedSearch.length === 0 ||
          row.schoolName.toLowerCase().includes(normalizedSearch) ||
          row.schoolCode.toLowerCase().includes(normalizedSearch) ||
          row.teacherName.toLowerCase().includes(normalizedSearch) ||
          row.grade.toLowerCase().includes(normalizedSearch) ||
          row.observerName.toLowerCase().includes(normalizedSearch) ||
          row.district.toLowerCase().includes(normalizedSearch) ||
          (row.fundedBy ?? "").toLowerCase().includes(normalizedSearch);
        return matchesGeoScope(row) && searchMatch;
      }),
    [data.evaluationActivities, district, normalizedSearch, parish, region, country, subCounty, subRegion, village],
  );

  const filteredAssessmentActivities = useMemo(
    () =>
      data.assessmentActivities.filter((row) => {
        const searchMatch =
          normalizedSearch.length === 0 ||
          row.schoolName.toLowerCase().includes(normalizedSearch) ||
          row.schoolCode.toLowerCase().includes(normalizedSearch) ||
          row.assessmentType.toLowerCase().includes(normalizedSearch) ||
          row.classGrade.toLowerCase().includes(normalizedSearch) ||
          row.assessorName.toLowerCase().includes(normalizedSearch) ||
          row.district.toLowerCase().includes(normalizedSearch) ||
          (row.fundedBy ?? "").toLowerCase().includes(normalizedSearch);
        return matchesGeoScope(row) && searchMatch;
      }),
    [data.assessmentActivities, district, normalizedSearch, parish, region, country, subCounty, subRegion, village],
  );

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
    const totalRecords = filteredSchools.reduce((sum, row) => sum + getModuleCount(row, moduleFilter), 0);
    const schoolsWithContacts = filteredSchools.filter((row) => row.contactsCount > 0).length;
    const teacherObservationCount = filteredSchools.reduce(
      (sum, row) => sum + row.teacherObservationCount,
      0,
    );
    const implementationStartedVisits = filteredSchools.reduce(
      (sum, row) => sum + row.implementationStartedVisits,
      0,
    );
    const implementationNotStartedVisits = filteredSchools.reduce(
      (sum, row) => sum + row.implementationNotStartedVisits,
      0,
    );
    const implementationPartialVisits = filteredSchools.reduce(
      (sum, row) => sum + row.implementationPartialVisits,
      0,
    );
    const demoVisits = filteredSchools.reduce((sum, row) => sum + row.demoVisits, 0);
    const schoolsWithImplementationData = filteredSchools.filter(
      (row) => row.latestImplementationStatus !== null,
    ).length;
    const schoolsImplementing = filteredSchools.filter(
      (row) =>
        row.latestImplementationStatus === "started" ||
        row.latestImplementationStatus === "partial",
    ).length;
    const schoolsNotImplementing = filteredSchools.filter(
      (row) => row.latestImplementationStatus === "not_started",
    ).length;
    const schoolsImplementingPct =
      schoolsWithImplementationData > 0
        ? Number(((schoolsImplementing / schoolsWithImplementationData) * 100).toFixed(1))
        : 0;
    const schoolsNotImplementingPct =
      schoolsWithImplementationData > 0
        ? Number(((schoolsNotImplementing / schoolsWithImplementationData) * 100).toFixed(1))
        : 0;

    return {
      totalRecords,
      enrollment: filteredSchools.reduce((sum, row) => sum + row.currentEnrollment, 0),
      trainings: filteredSchools.reduce((sum, row) => sum + row.trainings, 0),
      schoolVisits: filteredSchools.reduce((sum, row) => sum + row.schoolVisits, 0),
      storyActivities: filteredSchools.reduce((sum, row) => sum + row.storyActivities, 0),
      resourcesDistributed: filteredSchools.reduce((sum, row) => sum + row.resourcesDistributed, 0),
      lessonEvaluations: filteredSchools.reduce((sum, row) => sum + row.lessonEvaluations, 0),
      teacherAssessments: filteredSchools.reduce((sum, row) => sum + row.teacherAssessments, 0),
      learnerAssessments: filteredSchools.reduce((sum, row) => sum + row.learnerAssessments, 0),
      schoolsWithContacts,
      teacherObservationCount,
      implementationStartedVisits,
      implementationNotStartedVisits,
      implementationPartialVisits,
      demoVisits,
      schoolsWithImplementationData,
      schoolsImplementingPct,
      schoolsNotImplementingPct,
    };
  }, [filteredSchools, moduleFilter]);

  const schoolIds = useMemo(() => new Set(filteredSchools.map((row) => row.schoolId)), [filteredSchools]);

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
    const evaluated = filteredSchools.filter((row) => row.lessonEvaluations > 0).length;
    const assessed = filteredSchools.filter((row) => row.learnerAssessments > 0).length;
    const denominator = totalSchools > 0 ? totalSchools : 1;

    return [
      { label: "Schools in scope", value: totalSchools, pct: 100 },
      { label: "Schools trained", value: trained, pct: Math.round((trained / denominator) * 100) },
      { label: "Schools visited", value: visited, pct: Math.round((visited / denominator) * 100) },
      {
        label: "Lesson evaluations",
        value: evaluated,
        pct: Math.round((evaluated / denominator) * 100),
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
    setDetailReportType("training");
    setCountry("all");
    setRegion("all");
    setSubRegion("all");
    setDistrict("all");
    setSubCounty("all");
    setParish("all");
    setVillage("all");
  };

  const detailRowsCount =
    detailReportType === "training"
      ? filteredTrainingActivities.length
      : detailReportType === "visit"
        ? filteredVisitActivities.length
        : detailReportType === "evaluation"
          ? filteredEvaluationActivities.length
          : filteredAssessmentActivities.length;

  return (
    <section className="card portal-report-workspace">
      <header className="portal-report-toolbar">
        <div>
          <p className="portal-overline">Report: Schools and District</p>
          <h2>School Operations Report Workspace</h2>
          <p>
            Real backend records for schools, contacts, trainings, visits, evaluations, assessments,
            1001 story, and resources in one reporting workspace.
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
            <>
              <a className="button" href={exportHref}>
                Export CSV
              </a>
              <a className="button button-ghost" href="/api/portal/reports/operations/pdf" target="_blank" rel="noreferrer">
                Download PDF Summary
              </a>
            </>
          ) : null}
        </div>
      </header>

      <section className="card">
        <h3>Report Profile Modules</h3>
        <p>
          National reports, school reading performance guidance, training reports, and public
          dashboard-aligned impact reports are managed from this unified report profile.
        </p>
        <div className="action-row">
          <Link href="/portal/reports?tab=impact-reports" className="button button-ghost">
            Impact Reports
          </Link>
          <Link href="/portal/reports?tab=training-reports" className="button button-ghost">
            Training Reports
          </Link>
          <Link href="/portal/reports?tab=national-reports" className="button button-ghost">
            National Reports
          </Link>
          <Link href="/portal/reports?tab=school-reading-performance" className="button button-ghost">
            School Reading Performance
          </Link>
          <Link href="/impact" className="button button-ghost">
            Public Live Dashboard
          </Link>
        </div>
      </section>

      <div className="portal-report-filter-grid">
        <label>
          <span>Search</span>
          <input
            placeholder="Search school, trainer, assessor, coach, district"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span>Tracked item</span>
          <select
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value as ReportModuleFilter)}
          >
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
          <p>
            Detail rows: <strong>{detailRowsCount.toLocaleString()}</strong>
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
          <span>Lesson evaluations</span>
          <strong>{summary.lessonEvaluations.toLocaleString()}</strong>
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
        <article>
          <span>Schools implementing</span>
          <strong>{summary.schoolsImplementingPct.toFixed(1)}%</strong>
        </article>
        <article>
          <span>Schools not implementing</span>
          <strong>{summary.schoolsNotImplementingPct.toFixed(1)}%</strong>
        </article>
        <article>
          <span>Demo visits conducted</span>
          <strong>{summary.demoVisits.toLocaleString()}</strong>
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
                • Average score: <strong>{observationSummary.overallAverage.toFixed(1)}</strong>
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

      <section className="portal-report-detail-panel">
        <div className="portal-report-detail-header">
          <div>
            <p className="portal-overline">Detailed activity reports</p>
            <h3>Operational report tables</h3>
            <p>
              These tables read directly from the backend records entered by the team. No demo or
              generated rows are used here.
            </p>
          </div>
          <div className="portal-report-detail-switches">
            {detailReportOptions.map((option) => {
              const active = detailReportType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={active ? "button" : "button button-ghost"}
                  onClick={() => {
                    setDetailReportType(option.value);
                    setModuleFilter(detailTypeToModuleFilter(option.value));
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="portal-report-detail-description">
          {detailReportOptions.find((option) => option.value === detailReportType)?.description}
        </p>

        {detailReportType === "training" ? (
          <div className="table-wrap portal-report-table portal-table-compact">
            <DashboardListHeader template="100px minmax(0,1.4fr) minmax(0,1.4fr) minmax(0,1fr) 100px 110px 90px 90px 90px 90px minmax(0,1fr) minmax(0,1fr)">
              <span>Date</span>
              <span>Training name</span>
              <span>Location</span>
              <span>District</span>
              <span>Schools attended</span>
              <span>Total participants</span>
              <span>Teachers F</span>
              <span>Teachers M</span>
              <span>Leaders F</span>
              <span>Leaders M</span>
              <span>Trainer</span>
              <span>Funded by</span>
            </DashboardListHeader>
            {filteredTrainingActivities.length === 0 ? (
              <div className="py-3">No training records match the current filters.</div>
            ) : (
              filteredTrainingActivities.map((row: PortalTrainingActivityReportRow) => (
                <DashboardListRow
                  key={row.recordId}
                  template="100px minmax(0,1.4fr) minmax(0,1.4fr) minmax(0,1fr) 100px 110px 90px 90px 90px 90px minmax(0,1fr) minmax(0,1fr)"
                >
                  <span>{formatDate(row.date)}</span>
                  <span className="min-w-0"><TableCell value={row.trainingName} className="is-wide" /></span>
                  <span className="min-w-0"><TableCell value={row.location} className="is-wide" /></span>
                  <span className="min-w-0"><TableCell value={row.district} /></span>
                  <span>{row.schoolsAttended.toLocaleString()}</span>
                  <span>{row.participantsTotal.toLocaleString()}</span>
                  <span>{row.teachersFemale.toLocaleString()}</span>
                  <span>{row.teachersMale.toLocaleString()}</span>
                  <span>{row.leadersFemale.toLocaleString()}</span>
                  <span>{row.leadersMale.toLocaleString()}</span>
                  <span className="min-w-0"><TableCell value={row.trainerName} /></span>
                  <span className="min-w-0"><TableCell value={row.fundedBy ?? "N/A"} /></span>
                </DashboardListRow>
              ))
            )}
          </div>
        ) : null}

        {detailReportType === "visit" ? (
          <div className="table-wrap portal-report-table portal-table-compact">
            <DashboardListHeader template="100px minmax(0,1.4fr) minmax(0,1fr) 110px 130px 110px minmax(0,1.4fr) minmax(0,1fr) 110px minmax(0,1fr)">
              <span>Date</span>
              <span>School</span>
              <span>District</span>
              <span>Visit type</span>
              <span>Implementation</span>
              <span>Pathway</span>
              <span>Focus areas</span>
              <span>Coach</span>
              <span>Follow-up</span>
              <span>Funded by</span>
            </DashboardListHeader>
            {filteredVisitActivities.length === 0 ? (
              <div className="py-3">No visit records match the current filters.</div>
            ) : (
              filteredVisitActivities.map((row: PortalVisitActivityReportRow) => (
                <DashboardListRow
                  key={row.visitId}
                  template="100px minmax(0,1.4fr) minmax(0,1fr) 110px 130px 110px minmax(0,1.4fr) minmax(0,1fr) 110px minmax(0,1fr)"
                >
                  <span>{formatDate(row.date)}</span>
                  <span className="min-w-0">
                    <Link href={`/portal/schools/${row.schoolId}`}>
                      <TableCell value={row.schoolName} className="is-wide" />
                    </Link>
                  </span>
                  <span className="min-w-0"><TableCell value={row.district} /></span>
                  <span className="min-w-0"><TableCell value={row.visitType} /></span>
                  <span>{formatLabel(row.implementationStatus)}</span>
                  <span>{formatLabel(row.visitPathway)}</span>
                  <span className="min-w-0"><TableCell value={row.focusAreas} className="is-wide" /></span>
                  <span className="min-w-0"><TableCell value={row.coachName} /></span>
                  <span>{formatDate(row.followUpDate)}</span>
                  <span className="min-w-0"><TableCell value={row.fundedBy ?? "N/A"} /></span>
                </DashboardListRow>
              ))
            )}
          </div>
        ) : null}

        {detailReportType === "evaluation" ? (
          <div className="table-wrap portal-report-table portal-table-compact">
            <DashboardListHeader template="100px minmax(0,1.4fr) minmax(0,1fr) 80px 90px 70px 90px minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr)">
              <span>Date</span>
              <span>School</span>
              <span>Teacher</span>
              <span>Grade</span>
              <span>Class size</span>
              <span>Score</span>
              <span>Level</span>
              <span>Top strength</span>
              <span>Priority gap</span>
              <span>Observer</span>
              <span>Next coaching action</span>
              <span>Funded by</span>
            </DashboardListHeader>
            {filteredEvaluationActivities.length === 0 ? (
              <div className="py-3">No evaluation records match the current filters.</div>
            ) : (
              filteredEvaluationActivities.map((row: PortalEvaluationActivityReportRow) => (
                <DashboardListRow
                  key={row.evaluationId}
                  template="100px minmax(0,1.4fr) minmax(0,1fr) 80px 90px 70px 90px minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr)"
                >
                  <span>{formatDate(row.date)}</span>
                  <span className="min-w-0">
                    <Link href={`/portal/schools/${row.schoolId}`}>
                      <TableCell value={row.schoolName} className="is-wide" />
                    </Link>
                  </span>
                  <span className="min-w-0"><TableCell value={row.teacherName} /></span>
                  <span>{row.grade}</span>
                  <span>{row.classSize?.toLocaleString() ?? "N/A"}</span>
                  <span>{numberOrDash(row.overallScore)}</span>
                  <span>{row.overallLevel}</span>
                  <span className="min-w-0"><TableCell value={row.topStrengthDomain ?? "N/A"} /></span>
                  <span className="min-w-0"><TableCell value={row.topGapDomain ?? "N/A"} /></span>
                  <span className="min-w-0"><TableCell value={row.observerName} /></span>
                  <span className="min-w-0"><TableCell value={row.nextCoachingAction} className="is-wide" /></span>
                  <span className="min-w-0"><TableCell value={row.fundedBy ?? "N/A"} /></span>
                </DashboardListRow>
              ))
            )}
          </div>
        ) : null}

        {detailReportType === "assessment" ? (
          <div className="table-wrap portal-report-table portal-table-compact">
            <DashboardListHeader template="100px minmax(0,1.4fr) minmax(0,1fr) 130px 80px 110px 100px 100px 90px 110px minmax(0,1fr) minmax(0,1fr)">
              <span>Date</span>
              <span>School</span>
              <span>District</span>
              <span>Assessment type</span>
              <span>Class</span>
              <span>Learners assessed</span>
              <span>Letter sounds</span>
              <span>Decoding</span>
              <span>Fluency</span>
              <span>Comprehension</span>
              <span>Assessor</span>
              <span>Funded by</span>
            </DashboardListHeader>
            {filteredAssessmentActivities.length === 0 ? (
              <div className="py-3">No assessment records match the current filters.</div>
            ) : (
              filteredAssessmentActivities.map((row: PortalAssessmentActivityReportRow) => (
                <DashboardListRow
                  key={row.sessionId}
                  template="100px minmax(0,1.4fr) minmax(0,1fr) 130px 80px 110px 100px 100px 90px 110px minmax(0,1fr) minmax(0,1fr)"
                >
                  <span>{formatDate(row.date)}</span>
                  <span className="min-w-0">
                    <Link href={`/portal/schools/${row.schoolId}`}>
                      <TableCell value={row.schoolName} className="is-wide" />
                    </Link>
                  </span>
                  <span className="min-w-0"><TableCell value={row.district} /></span>
                  <span>{formatLabel(row.assessmentType)}</span>
                  <span>{row.classGrade}</span>
                  <span>{row.learnersAssessed.toLocaleString()}</span>
                  <span>{numberOrDash(row.averageLetterSounds)}</span>
                  <span>{numberOrDash(row.averageDecoding)}</span>
                  <span>{numberOrDash(row.averageFluency)}</span>
                  <span>{numberOrDash(row.averageComprehension)}</span>
                  <span className="min-w-0"><TableCell value={row.assessorName} /></span>
                  <span className="min-w-0"><TableCell value={row.fundedBy ?? "N/A"} /></span>
                </DashboardListRow>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section className="portal-report-school-table-section">
        <div className="portal-report-detail-header">
          <div>
            <p className="portal-overline">School directory summary</p>
            <h3>School-level operations table</h3>
            <p>
              Clean one-row school records with enrollment, contacts, activity totals, implementation
              status, and latest activity markers.
            </p>
          </div>
        </div>

        <div className="table-wrap portal-report-table portal-table-compact">
          <DashboardListHeader template="80px 100px 110px 110px 110px 110px 110px 80px 110px 110px minmax(0,1.4fr) 110px 100px 90px 110px minmax(0,1fr) 90px 80px 90px 90px 110px 110px 110px 100px 110px 100px 90px 130px 130px 100px">
            <span>Country</span><span>Region</span><span>Sub-region</span>
            <span>District</span><span>Sub-county</span><span>Parish</span><span>Village</span>
            <span>School ID</span><span>School Code</span><span>Account owner</span>
            <span>School name</span><span>Last activity</span><span>Enrollment</span>
            <span>Status</span><span>Phone</span><span>Primary contact</span>
            <span>Trainings</span><span>Visits</span><span>1001 story</span>
            <span>Resources</span><span>Lesson evaluations</span><span>Teacher assessments</span>
            <span>Learner assessments</span><span>Impl started</span><span>Impl not started</span>
            <span>Impl partial</span><span>Demo visits</span><span>Latest impl status</span>
            <span>Latest visit pathway</span><span>Total records</span>
          </DashboardListHeader>
          {filteredSchools.length === 0 ? (
            <div className="py-3">No schools match the selected filters.</div>
          ) : (
            filteredSchools.map((row) => (
              <DashboardListRow
                key={row.schoolId}
                template="80px 100px 110px 110px 110px 110px 110px 80px 110px 110px minmax(0,1.4fr) 110px 100px 90px 110px minmax(0,1fr) 90px 80px 90px 90px 110px 110px 110px 100px 110px 100px 90px 130px 130px 100px"
              >
                <span>{row.country ?? "Uganda"}</span>
                <span>{row.region ?? "N/A"}</span>
                <span>{row.subRegion ?? "N/A"}</span>
                <span><TableCell value={row.district} /></span>
                <span><TableCell value={row.subCounty ?? "N/A"} /></span>
                <span><TableCell value={row.parish ?? "N/A"} /></span>
                <span><TableCell value={row.village ?? "N/A"} /></span>
                <span>{row.schoolId}</span>
                <span><TableCell value={row.schoolCode} className="is-code" /></span>
                <span><TableCell value={row.accountOwner} /></span>
                <span className="min-w-0">
                  <Link href={`/portal/schools/${row.schoolId}`}>
                    <TableCell value={row.schoolName} className="is-school-name" />
                  </Link>
                </span>
                <span>{formatDate(row.lastActivityDate)}</span>
                <span>{row.currentEnrollment.toLocaleString()}</span>
                <span>{row.schoolStatus}</span>
                <span><TableCell value={row.phone ?? "N/A"} /></span>
                <span className="min-w-0"><TableCell value={row.primaryContact ?? "N/A"} className="is-contact" /></span>
                <span>{row.trainings.toLocaleString()}</span>
                <span>{row.schoolVisits.toLocaleString()}</span>
                <span>{row.storyActivities.toLocaleString()}</span>
                <span>{row.resourcesDistributed.toLocaleString()}</span>
                <span>{row.lessonEvaluations.toLocaleString()}</span>
                <span>{row.teacherAssessments.toLocaleString()}</span>
                <span>{row.learnerAssessments.toLocaleString()}</span>
                <span>{row.implementationStartedVisits.toLocaleString()}</span>
                <span>{row.implementationNotStartedVisits.toLocaleString()}</span>
                <span>{row.implementationPartialVisits.toLocaleString()}</span>
                <span>{row.demoVisits.toLocaleString()}</span>
                <span>{row.latestImplementationStatus ? formatLabel(row.latestImplementationStatus) : "N/A"}</span>
                <span>{row.latestVisitPathway ? formatLabel(row.latestVisitPathway) : "N/A"}</span>
                <span>
                  <strong>{getModuleCount(row, moduleFilter).toLocaleString()}</strong>
                </span>
              </DashboardListRow>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
