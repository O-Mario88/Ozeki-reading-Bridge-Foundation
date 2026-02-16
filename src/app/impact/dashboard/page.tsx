import Link from "next/link";
import { getImpactSummary, getImpactReportFilterFacets, listPublicImpactReports } from "@/lib/db";
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
  };

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
        <div className="container card impact-filter-card">
          <h2>Filters</h2>
          <form method="GET" className="filters impact-filter-grid">
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
