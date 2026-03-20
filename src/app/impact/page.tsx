import type { Metadata } from "next";
import Link from "next/link";
import { PublicImpactMapExplorer } from "@/components/dashboard/map/PublicImpactMapExplorer";
import { ImpactReportFilters } from "@/components/impact/ImpactReportFilters";
import { getImpactReportFilterFacetsAsync } from "@/services/dataService";

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
  const selectedRegion = firstValue(params.region);
  const selectedSubRegion = firstValue(params.subRegion);
  const selectedDistrict = firstValue(params.district);
  const selectedSchoolId = firstValue(params.schoolId) || firstValue(params.school);

  let reportDataWarning = false;
  let facets = buildFallbackReportFacets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let aggregate: any = null;

  const activeScopeLevel = selectedSchoolId ? "school" : selectedDistrict ? "district" : selectedSubRegion ? "subregion" : selectedRegion ? "region" : "country";
  const activeScopeId = selectedSchoolId || selectedDistrict || selectedSubRegion || selectedRegion || "Uganda";

  try {
    facets = await getImpactReportFilterFacetsAsync();
    const selectedYear = resolveReportYear(selectedYearParam, facets.years);
    const { getPublicImpactAggregate } = await import("@/services/dataService");
    aggregate = await getPublicImpactAggregate(
      activeScopeLevel,
      activeScopeId,
      selectedPeriodType || "FY",
      "Public",
      selectedYear
    );
  } catch (error) {
    reportDataWarning = true;
    console.error("[impact] Failed to load report facets/list:", error);
  }

  const selectedYear = resolveReportYear(selectedYearParam, facets.years);

  const hasData = aggregate && aggregate.kpis.schoolsSupported > 0;
  const pdfDownloadUrl = `/api/impact/report-engine?scopeLevel=${activeScopeLevel}&scopeId=${encodeURIComponent(activeScopeId)}&period=${encodeURIComponent(selectedPeriodType || "FY")}&year=${selectedYear}&format=pdf`;

  return (
    <>
      <div className="impact-page-hero">
        {/* ═══ Impact Hero ═══ */}
        <section className="section impact-hero-section">
          <div className="container impact-hero-container">
            <h1 className="impact-page-title">Evidence-based Reading Impact</h1>
            <p className="impact-hero-lead">
              Transforming literacy outcomes through continuous assessment, dedicated coaching, and
              community alignment. The Reading Bridge Foundation verifies every classroom milestone
              with real classroom data across Uganda.
            </p>
          </div>
        </section>

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
              {hasData ? (
                <>
                  <a className="button" href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
                    Download AI Impact Report (PDF)
                  </a>
                  <span className="meta-line">
                    Report generated in real-time using current live data and AI synthesis.
                  </span>
                </>
              ) : (
                <span className="meta-line">No data is available for the currently selected filters.</span>
              )}
            </div>
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
