import type { Metadata } from "next";
import Link from "next/link";
import { PublicImpactMapExplorer } from "@/components/dashboard/map/PublicImpactMapExplorer";
import { ImpactReportFilters } from "@/components/impact/ImpactReportFilters";
import { PublicStatsBar } from "@/components/impact/PublicStatsBar";
import { getPublicImpactMetrics } from "@/lib/server/postgres/repositories/public-metrics";
import { getImpactReportFilterFacetsAsync, listPublicImpactReportsAsync } from "@/services/dataService";
import {
  ImpactReportOutput,
  ImpactReportPeriodType,
  ImpactReportScopeType,
  ImpactReportType,
  ReportCategory,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Impact",
  description:
    "Explore live aggregated literacy impact and download reports by region, district, and school.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function parseReportType(value: string): ImpactReportType | undefined {
  const allowed: ImpactReportType[] = [
    "FY Impact Report",
    "Regional Impact Report",
    "Sub-region Report",
    "District Report",
    "School Report",
    "School Coaching Pack",
    "Headteacher Summary",
    "Partner Snapshot Report",
  ];
  return (allowed as string[]).includes(value) ? (value as ImpactReportType) : undefined;
}

function parseReportCategory(value: string): ReportCategory | undefined {
  const allowed: ReportCategory[] = [
    "Assessment Report",
    "Training Report",
    "School Coaching Visit Report",
    "Teaching Quality Report (Lesson Evaluations)",
    "Remedial & Catch-Up Intervention Report",
    "1001 Story Project Report",
    "Implementation Fidelity & Coverage Report",
    "District Literacy Brief",
    "Graduation Readiness & Alumni Monitoring Report",
    "Partner/Donor Report (Scoped)",
    "Data Quality & Credibility Report",
    "School Profile Report (Headteacher Pack)",
  ];
  return (allowed as string[]).includes(value) ? (value as ReportCategory) : undefined;
}

function parsePeriodType(value: string): ImpactReportPeriodType | undefined {
  const allowed: ImpactReportPeriodType[] = ["FY", "Term", "Quarter", "Custom"];
  return (allowed as string[]).includes(value) ? (value as ImpactReportPeriodType) : undefined;
}

function parseOutput(value: string): ImpactReportOutput | undefined {
  const allowed: ImpactReportOutput[] = ["PDF", "HTML preview"];
  return (allowed as string[]).includes(value) ? (value as ImpactReportOutput) : undefined;
}

function parseScopeType(value: string): ImpactReportScopeType | undefined {
  const allowed: ImpactReportScopeType[] = [
    "National",
    "Region",
    "Sub-region",
    "District",
    "Sub-county",
    "Parish",
    "School",
  ];
  return (allowed as string[]).includes(value) ? (value as ImpactReportScopeType) : undefined;
}

function resolveReportYear(rawYear: string, availableYears: string[]) {
  const parsed = Number(rawYear);
  if (Number.isFinite(parsed) && parsed >= 2025 && parsed <= 2050) {
    return String(parsed);
  }
  const nowYear = new Date().getFullYear();
  if (nowYear >= 2025 && nowYear <= 2050) {
    return String(nowYear);
  }
  const latestDataYear = availableYears
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];
  if (latestDataYear && latestDataYear >= 2025 && latestDataYear <= 2050) {
    return String(latestDataYear);
  }
  return "2025";
}

function buildFallbackReportFacets() {
  return {
    reportTypes: [] as string[],
    reportCategories: [] as string[],
    periodTypes: ["FY", "Term", "Quarter", "Custom"] as string[],
    audiences: ["Public-safe", "Staff-only"] as string[],
    outputs: ["PDF", "HTML preview"] as string[],
    scopeTypes: [] as string[],
    years: Array.from({ length: 2050 - 2025 + 1 }, (_, index) => String(2025 + index)),
    dataYears: [] as string[],
    scopeValues: [] as string[],
    regions: [] as string[],
    subRegions: [] as string[],
    districts: [] as string[],
    schools: [] as Array<{ id: number; name: string; district: string }>,
  };
}

export default async function ImpactDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  /* ── Report filters ── */
  const selectedYearParam = firstValue(params.year);
  const selectedType = firstValue(params.reportType);
  const selectedCategory = firstValue(params.reportCategory);
  const selectedPeriodType = firstValue(params.periodType);
  const selectedOutput = firstValue(params.output);
  const selectedScopeType = firstValue(params.scopeType);
  const selectedScopeValue = firstValue(params.scopeValue);
  const selectedRegion = firstValue(params.region);
  const selectedSubRegion = firstValue(params.subRegion);
  const selectedDistrict = firstValue(params.district);
  const selectedSchoolId = firstValue(params.schoolId) || firstValue(params.school);

  let reportDataWarning = false;
  let facets = buildFallbackReportFacets();
  let reports: Awaited<ReturnType<typeof listPublicImpactReportsAsync>> = [];

  try {
    facets = await getImpactReportFilterFacetsAsync();
    const selectedYear = resolveReportYear(selectedYearParam, facets.years);
    reports = await listPublicImpactReportsAsync({
      year: selectedYear,
      reportType: parseReportType(selectedType),
      reportCategory: parseReportCategory(selectedCategory),
      periodType: parsePeriodType(selectedPeriodType),
      audience: "Public-safe",
      output: parseOutput(selectedOutput),
      scopeType: parseScopeType(selectedScopeType),
      scopeValue: selectedScopeValue || undefined,
      region: selectedRegion || undefined,
      subRegion: selectedSubRegion || undefined,
      district: selectedDistrict || undefined,
      schoolId: selectedSchoolId ? parseInt(selectedSchoolId, 10) : undefined,
      limit: 200,
    });
  } catch (error) {
    reportDataWarning = true;
    console.error("[impact] Failed to load report facets/list:", error);
  }

  const liveMetrics = await getPublicImpactMetrics({
    asOf: new Date().toISOString().split("T")[0]
  });

  const selectedYear = resolveReportYear(selectedYearParam, facets.years);

  const topFilteredReport = reports[0] ?? null;
  const hasMultipleFilteredReports = reports.length > 1;

  return (
    <>
      <div className="impact-live-compact-zone">
        {/* ═══ Hero ═══ */}
        <section className="page-hero impact-page-hero">
          <div className="container impact-page-hero-container">
            <div className="impact-page-hero-copy">
              <p className="kicker">National Literacy Intelligence Platform</p>
              <h1>Ozeki National Literacy Intelligence Dashboard</h1>
              <p>
                Practical Literacy. Strong Teachers. Confident Readers, measured and improved
                with real classroom data across Uganda.
              </p>
            </div>
          </div>
        </section>

        <PublicStatsBar stats={{
          totalSchools: liveMetrics.totalSchools,
          totalLearners: liveMetrics.totalLearners,
          avgReadingScore: liveMetrics.averageReadingScore,
          avgCompScore: liveMetrics.averageCompScore
        }} />

        {/* ═══ Interactive Dashboard ═══ */}
        <section className="section impact-dashboard-section">
          <div className="container impact-dashboard-container">
            <PublicImpactMapExplorer
              syncUrl
              initialPeriod={firstValue(params.period) || "FY"}
              initialSelection={{
                region: firstValue(params.region),
                subRegion: firstValue(params.subRegion),
                district: firstValue(params.district),
                school: firstValue(params.school) || firstValue(params.schoolId),
              }}
            />
          </div>
        </section>
      </div>

      {/* ═══ Report Filters & Downloads ═══ */}
      <section
        id="reports"
        className="section impact-reports-section"
        style={{ background: "var(--md-sys-color-surface-container, #f5f5f5)" }}
      >
        <div className="container">
          <div className="impact-report-heading">
            <p className="kicker">REPORTS</p>
            <h2 className="tpd-page-title">Download Impact Reports</h2>
            <p>
              Partner-ready reports generated directly from verified program data.
              FY reports follow Uganda school-calendar sessions (Term I-III): 01 February to 30 November.
            </p>
          </div>

          {reportDataWarning ? (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <p className="meta-line">
                Report data is temporarily unavailable in this deployment environment. Dashboard visualization remains available.
              </p>
            </div>
          ) : null}

          <div className="card impact-filter-card" style={{ marginBottom: "2rem" }}>
            <h2>Filter Reports</h2>
            <ImpactReportFilters
              initialYear={selectedYear}
              initialReportType={selectedType}
              initialReportCategory={selectedCategory}
              initialPeriodType={selectedPeriodType}
              initialOutput={selectedOutput}
              initialRegion={selectedRegion}
              initialSubRegion={selectedSubRegion}
              initialDistrict={selectedDistrict}
              initialSchoolId={selectedSchoolId}
              reportTypes={facets.reportTypes}
              reportCategories={facets.reportCategories}
              periodTypes={facets.periodTypes}
              outputs={facets.outputs}
              period={firstValue(params.period) || undefined}
            />
            <div className="action-row" style={{ marginTop: "0.9rem", alignItems: "center", gap: "0.9rem" }}>
              {topFilteredReport ? (
                <>
                  <a className="button" href={`/api/impact-reports/${topFilteredReport.reportCode}/download`}>
                    {hasMultipleFilteredReports
                      ? "Download Top Filtered Report (PDF)"
                      : "Download Filtered Report (PDF)"}
                  </a>
                  <Link className="button button-ghost" href={`/impact-reports/${topFilteredReport.reportCode}`}>
                    View Selected Report
                  </Link>
                  {hasMultipleFilteredReports ? (
                    <span className="meta-line">
                      {reports.length.toLocaleString()} reports match current filters. Download targets the latest match.
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="meta-line">No report matches the current filters yet.</span>
              )}
            </div>
          </div>

          {/* Report cards */}
          <div className="cards-grid">
            {reports.map((report) => {
              const schoolsImpacted = Number(report.factPack?.coverageDelivery?.schoolsImpacted ?? 0);
              const teachersTrained = Number(report.factPack?.coverageDelivery?.teachersTrained ?? 0);
              const learnersAssessed = Number(
                report.factPack?.coverageDelivery?.assessmentsConducted?.endline ?? 0,
              );
              const resourcesDownloaded = Number(report.factPack?.engagement?.resourcesDownloaded ?? 0);
              const readingChange =
                report.factPack?.learningOutcomes?.readingComprehension?.change ?? "Data not available";

              return (
                <article className="card" key={report.reportCode}>
                  <p className="meta-pill">{report.reportType}</p>
                  <h3>{report.title}</h3>
                  <p className="meta-line">
                    Category: {report.reportCategory ?? "Not specified"}
                    <br />
                    Scope: {report.scopeType} - {report.scopeValue}
                    <br />
                    Period ({report.periodType ?? "FY"}): {report.periodStart} to {report.periodEnd}
                  </p>
                  <ul>
                    <li>Schools impacted: {schoolsImpacted.toLocaleString()}</li>
                    <li>Teachers trained: {teachersTrained.toLocaleString()}</li>
                    <li>Learners assessed: {learnersAssessed.toLocaleString()}</li>
                    <li>Resources downloaded: {resourcesDownloaded.toLocaleString()}</li>
                    <li>Key learning change: {readingChange}</li>
                  </ul>
                  <p className="meta-line">
                    Version {report.version} | Generated {new Date(report.generatedAt).toLocaleDateString()}
                  </p>
                  <p>
                    <a className="inline-download-link" href={`/api/impact-reports/${report.reportCode}/download`}>
                      Download PDF
                    </a>
                  </p>
                  <p>
                    <Link className="inline-download-link" href={`/impact-reports/${report.reportCode}`}>
                      View Web Version
                    </Link>
                  </p>
                </article>
              );
            })}

            {reports.length === 0 ? (
              <article className="card">
                <h3>No reports found</h3>
                <p>Adjust the filter options and try again, or check back later as new reports are generated.</p>
              </article>
            ) : null}
          </div>
        </div>
      </section>

      {/* ═══ School Reading Performance Privacy Note ═══ */}
      {selectedSchoolId ? (
        <section id="school-reading-performance" className="section">
          <div className="container">
            <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
              <p className="kicker">SCHOOL READING PERFORMANCE</p>
              <h2 className="tpd-page-title">Detailed learner and teacher names are not public</h2>
              <p>
                Public dashboards only show aggregated school performance. Detailed school reading
                performance reports with named learners or teachers are generated by staff on
                request, then shared through controlled channels.
              </p>
              <div className="action-row" style={{ justifyContent: "center", marginTop: "1rem" }}>
                <Link href="/request-support" className="button">
                  Request Staff-Generated School Report
                </Link>
                <Link href="/portal/reports?tab=school-reading-performance" className="button button-ghost">
                  Open Report Profile Guidance
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ═══ Methodology link ═══ */}
      <section className="section">
        <div className="container" style={{ textAlign: "center" }}>
          <Link className="button button-ghost" href="/impact/methodology">
            📐 View Our Methodology
          </Link>
        </div>
      </section>
    </>
  );
}
