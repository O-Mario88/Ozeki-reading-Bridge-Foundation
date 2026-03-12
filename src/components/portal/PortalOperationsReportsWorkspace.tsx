"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
            <a className="button" href={exportHref}>
              Export school summary
            </a>
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
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Training name</th>
                  <th>Location</th>
                  <th>District</th>
                  <th>Schools attended</th>
                  <th>Total participants</th>
                  <th>Teachers F</th>
                  <th>Teachers M</th>
                  <th>Leaders F</th>
                  <th>Leaders M</th>
                  <th>Trainer</th>
                  <th>Funded by</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainingActivities.length === 0 ? (
                  <tr>
                    <td colSpan={12}>No training records match the current filters.</td>
                  </tr>
                ) : (
                  filteredTrainingActivities.map((row: PortalTrainingActivityReportRow) => (
                    <tr key={row.recordId}>
                      <td>{formatDate(row.date)}</td>
                      <td><TableCell value={row.trainingName} className="is-wide" /></td>
                      <td><TableCell value={row.location} className="is-wide" /></td>
                      <td><TableCell value={row.district} /></td>
                      <td>{row.schoolsAttended.toLocaleString()}</td>
                      <td>{row.participantsTotal.toLocaleString()}</td>
                      <td>{row.teachersFemale.toLocaleString()}</td>
                      <td>{row.teachersMale.toLocaleString()}</td>
                      <td>{row.leadersFemale.toLocaleString()}</td>
                      <td>{row.leadersMale.toLocaleString()}</td>
                      <td><TableCell value={row.trainerName} /></td>
                      <td><TableCell value={row.fundedBy ?? "N/A"} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {detailReportType === "visit" ? (
          <div className="table-wrap portal-report-table portal-table-compact">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>School</th>
                  <th>District</th>
                  <th>Visit type</th>
                  <th>Implementation</th>
                  <th>Pathway</th>
                  <th>Focus areas</th>
                  <th>Coach</th>
                  <th>Follow-up</th>
                  <th>Funded by</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitActivities.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No visit records match the current filters.</td>
                  </tr>
                ) : (
                  filteredVisitActivities.map((row: PortalVisitActivityReportRow) => (
                    <tr key={row.visitId}>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <Link href={`/portal/schools/${row.schoolId}`}>
                          <TableCell value={row.schoolName} className="is-wide" />
                        </Link>
                      </td>
                      <td><TableCell value={row.district} /></td>
                      <td><TableCell value={row.visitType} /></td>
                      <td>{formatLabel(row.implementationStatus)}</td>
                      <td>{formatLabel(row.visitPathway)}</td>
                      <td><TableCell value={row.focusAreas} className="is-wide" /></td>
                      <td><TableCell value={row.coachName} /></td>
                      <td>{formatDate(row.followUpDate)}</td>
                      <td><TableCell value={row.fundedBy ?? "N/A"} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {detailReportType === "evaluation" ? (
          <div className="table-wrap portal-report-table portal-table-compact">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>School</th>
                  <th>Teacher</th>
                  <th>Grade</th>
                  <th>Class size</th>
                  <th>Score</th>
                  <th>Level</th>
                  <th>Top strength</th>
                  <th>Priority gap</th>
                  <th>Observer</th>
                  <th>Next coaching action</th>
                  <th>Funded by</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvaluationActivities.length === 0 ? (
                  <tr>
                    <td colSpan={12}>No evaluation records match the current filters.</td>
                  </tr>
                ) : (
                  filteredEvaluationActivities.map((row: PortalEvaluationActivityReportRow) => (
                    <tr key={row.evaluationId}>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <Link href={`/portal/schools/${row.schoolId}`}>
                          <TableCell value={row.schoolName} className="is-wide" />
                        </Link>
                      </td>
                      <td><TableCell value={row.teacherName} /></td>
                      <td>{row.grade}</td>
                      <td>{row.classSize?.toLocaleString() ?? "N/A"}</td>
                      <td>{numberOrDash(row.overallScore)}</td>
                      <td>{row.overallLevel}</td>
                      <td><TableCell value={row.topStrengthDomain ?? "N/A"} /></td>
                      <td><TableCell value={row.topGapDomain ?? "N/A"} /></td>
                      <td><TableCell value={row.observerName} /></td>
                      <td><TableCell value={row.nextCoachingAction} className="is-wide" /></td>
                      <td><TableCell value={row.fundedBy ?? "N/A"} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {detailReportType === "assessment" ? (
          <div className="table-wrap portal-report-table portal-table-compact">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>School</th>
                  <th>District</th>
                  <th>Assessment type</th>
                  <th>Class</th>
                  <th>Learners assessed</th>
                  <th>Letter sounds</th>
                  <th>Decoding</th>
                  <th>Fluency</th>
                  <th>Comprehension</th>
                  <th>Assessor</th>
                  <th>Funded by</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssessmentActivities.length === 0 ? (
                  <tr>
                    <td colSpan={12}>No assessment records match the current filters.</td>
                  </tr>
                ) : (
                  filteredAssessmentActivities.map((row: PortalAssessmentActivityReportRow) => (
                    <tr key={row.sessionId}>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <Link href={`/portal/schools/${row.schoolId}`}>
                          <TableCell value={row.schoolName} className="is-wide" />
                        </Link>
                      </td>
                      <td><TableCell value={row.district} /></td>
                      <td>{formatLabel(row.assessmentType)}</td>
                      <td>{row.classGrade}</td>
                      <td>{row.learnersAssessed.toLocaleString()}</td>
                      <td>{numberOrDash(row.averageLetterSounds)}</td>
                      <td>{numberOrDash(row.averageDecoding)}</td>
                      <td>{numberOrDash(row.averageFluency)}</td>
                      <td>{numberOrDash(row.averageComprehension)}</td>
                      <td><TableCell value={row.assessorName} /></td>
                      <td><TableCell value={row.fundedBy ?? "N/A"} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                <th>Account owner</th>
                <th>School name</th>
                <th>Last activity</th>
                <th>Enrollment</th>
                <th>Status</th>
                <th>Phone</th>
                <th>Primary contact</th>
                <th>Trainings</th>
                <th>Visits</th>
                <th>1001 story</th>
                <th>Resources</th>
                <th>Lesson evaluations</th>
                <th>Teacher assessments</th>
                <th>Learner assessments</th>
                <th>Impl started</th>
                <th>Impl not started</th>
                <th>Impl partial</th>
                <th>Demo visits</th>
                <th>Latest impl status</th>
                <th>Latest visit pathway</th>
                <th>Total records</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={30}>No schools match the selected filters.</td>
                </tr>
              ) : (
                filteredSchools.map((row) => (
                  <tr key={row.schoolId}>
                    <td>{row.country ?? "Uganda"}</td>
                    <td>{row.region ?? "N/A"}</td>
                    <td>{row.subRegion ?? "N/A"}</td>
                    <td><TableCell value={row.district} /></td>
                    <td><TableCell value={row.subCounty ?? "N/A"} /></td>
                    <td><TableCell value={row.parish ?? "N/A"} /></td>
                    <td><TableCell value={row.village ?? "N/A"} /></td>
                    <td>{row.schoolId}</td>
                    <td><TableCell value={row.schoolCode} className="is-code" /></td>
                    <td><TableCell value={row.accountOwner} /></td>
                    <td>
                      <Link href={`/portal/schools/${row.schoolId}`}>
                        <TableCell value={row.schoolName} className="is-school-name" />
                      </Link>
                    </td>
                    <td>{formatDate(row.lastActivityDate)}</td>
                    <td>{row.currentEnrollment.toLocaleString()}</td>
                    <td>{row.schoolStatus}</td>
                    <td><TableCell value={row.phone ?? "N/A"} /></td>
                    <td><TableCell value={row.primaryContact ?? "N/A"} className="is-contact" /></td>
                    <td>{row.trainings.toLocaleString()}</td>
                    <td>{row.schoolVisits.toLocaleString()}</td>
                    <td>{row.storyActivities.toLocaleString()}</td>
                    <td>{row.resourcesDistributed.toLocaleString()}</td>
                    <td>{row.lessonEvaluations.toLocaleString()}</td>
                    <td>{row.teacherAssessments.toLocaleString()}</td>
                    <td>{row.learnerAssessments.toLocaleString()}</td>
                    <td>{row.implementationStartedVisits.toLocaleString()}</td>
                    <td>{row.implementationNotStartedVisits.toLocaleString()}</td>
                    <td>{row.implementationPartialVisits.toLocaleString()}</td>
                    <td>{row.demoVisits.toLocaleString()}</td>
                    <td>{row.latestImplementationStatus ? formatLabel(row.latestImplementationStatus) : "N/A"}</td>
                    <td>{row.latestVisitPathway ? formatLabel(row.latestVisitPathway) : "N/A"}</td>
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
    </section>
  );
}
