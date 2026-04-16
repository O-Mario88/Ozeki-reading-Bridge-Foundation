import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PublicImpactMapExplorer } from "@/components/dashboard/map/PublicImpactMapExplorer";
import { ImpactReportFilters } from "@/components/impact/ImpactReportFilters";
import { getImpactReportFilterFacetsAsync } from "@/services/dataService";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { ShieldAlert, Download, BarChart3, Presentation } from "lucide-react";

export const metadata: Metadata = {
  title: "Live Dashboard & Reports",
  description:
    "Explore live aggregated literacy impact and download reports by region, district, and school.",
};

export const revalidate = 300;

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
    periodTypes: ["Term One", "Term Two", "Term Three", "This Fiscal Year", "Last Fiscal Year", "Monthly"] as string[],
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
  const pdfDownloadUrl = `/api/impact/report-engine?scopeLevel=${activeScopeLevel}&scopeId=${encodeURIComponent(activeScopeId)}&period=${encodeURIComponent(selectedPeriodType || "This Fiscal Year")}&year=${selectedYear}&format=pdf&reportType=${encodeURIComponent(selectedType || "General Literacy Report")}&reportCategory=${encodeURIComponent(selectedCategory)}`;

  return (
    <>
      {/* 1. Public Explorer Dashboard */}
      <div className="bg-white pt-8 pb-3 px-4 md:px-6">
        <div className="max-w-[1400px] mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0a2a34] tracking-tight mb-2">
            Evidence-based Reading Impact
          </h1>
          <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
            Transforming literacy outcomes through continuous assessment, dedicated coaching, and community alignment. We verify every classroom milestone with real data across Uganda.
          </p>
        </div>
      </div>

      <SectionWrapper theme="off-white" className="!pt-6 !pb-12 border-none">

        <PremiumCard className="overflow-hidden p-1 shadow-2xl border-brand-primary/10" withHover={false}>
          <div className="bg-white rounded-[1.8rem] overflow-hidden">
             <Suspense fallback={<div className="h-[600px] w-full animate-pulse bg-gray-100 flex items-center justify-center text-gray-400 font-medium">Loading live data explorer...</div>}>
               <PublicImpactMapExplorer
                  syncUrl
                  compact={false}
                  initialPeriod={firstValue(params.period) || "FY"}
                  initialSelection={{
                    region: firstValue(params.region),
                    subRegion: firstValue(params.subRegion),
                    district: firstValue(params.district),
                    school: firstValue(params.school) || firstValue(params.schoolId),
                  }}
                  initialPayload={aggregate}
                />
             </Suspense>
          </div>
        </PremiumCard>
      </SectionWrapper>

      {/* 3. Reports Downloader */}
      <SectionWrapper theme="light" id="reports">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-6">
              <Presentation size={32} />
            </div>
            <h2 className="text-4xl font-bold text-brand-primary mb-4">Download Impact Reports</h2>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Partner-ready reports generated directly from verified program data.
              FY reports follow Uganda school-calendar sessions (Term I-III): 01 February to 30 November.
            </p>
          </div>

          {reportDataWarning ? (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 flex items-start gap-4 mb-4">
              <ShieldAlert className="w-6 h-6 shrink-0 text-orange-600" />
              <p className="text-sm font-medium">
                Report data is temporarily unavailable in this deployment environment. Dashboard visualization remains available.
              </p>
            </div>
          ) : null}

          <PremiumCard className="p-8 md:p-12">
            <h3 className="text-2xl font-bold text-brand-primary mb-8 border-b border-gray-100 pb-4">Configure Report</h3>
            
            <div className="mb-10 w-full">
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
            </div>

            <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              {hasData ? (
                <>
                  <a 
                    href={pdfDownloadUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-xl shadow-brand-primary/20 hover:-translate-y-0.5"
                  >
                    <Download size={20} />
                    Download AI Impact Report (PDF)
                  </a>
                  <p className="text-sm text-gray-500 font-medium text-center sm:text-right max-w-[250px]">
                    Report generated in real-time using current live data and AI synthesis.
                  </p>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 text-gray-500 w-full text-center font-medium">
                  No data is available for the currently selected filters.
                </div>
              )}
            </div>
          </PremiumCard>
        </div>
      </SectionWrapper>

      {/* 4. Privacy Notice (if school is selected) */}
      {selectedSchoolId && (
        <SectionWrapper theme="off-white" id="school-reading-performance">
          <PremiumCard className="p-8 md:p-12 text-center max-w-3xl mx-auto border-dashed border-2 bg-transparent shadow-none">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-brand-primary mb-4">Privacy Notice</h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              Public dashboards only show aggregated school performance. Detailed school reading
              performance reports with named learners or teachers are generated by staff on
              request, then shared through controlled channels.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/request-support" className="px-6 py-3 rounded-full bg-brand-primary text-white font-semibold flex items-center justify-center hover:bg-[#005a52] transition-colors">
                Request Staff-Generated Report
              </Link>
            </div>
          </PremiumCard>
        </SectionWrapper>
      )}

      {/* 5. Bottom Methodology & CTA Strip */}
      <CTAStrip 
        heading="Understand our approach."
        subheading="Review the data collection and synthesis methodology powering the National Literacy Intelligence Platform."
        primaryButtonText="Read the Methodology"
        primaryButtonHref="/impact/methodology"
        theme="brand"
      />
    </>
  );
}
