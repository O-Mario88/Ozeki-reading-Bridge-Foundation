import type { Metadata } from "next";
import "./sociaplan.css";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { PublicImpactMapExplorer } from "@/components/dashboard/map/PublicImpactMapExplorer";
import { ImpactReportFilters } from "@/components/impact/ImpactReportFilters";
import { getImpactReportFilterFacetsAsync } from "@/services/dataService";
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
    <div className="sp-layout">
      {/* 1. Sidebar */}
      <aside className="sp-sidebar hidden md:flex">
        <div className="sp-logo-area">
          <div className="sp-logo-icon" />
          Ozeki Impact
        </div>
        <div className="sp-nav-group">
          <div className="sp-nav-label">Main Navigation</div>
          <Link href="/" className="sp-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </Link>
          <div className="sp-nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
            Dashboard
          </div>
          <Link href="/impact/methodology" className="sp-nav-item">
            <ShieldAlert /> Methodology
          </Link>
          <Link href="/impact/case-studies" className="sp-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Case Studies
          </Link>
          <Link href="/sponsor-a-district" className="sp-nav-item">
            <BarChart3 /> Sponsor Impact
          </Link>
        </div>
        
        <div className="sp-nav-group mt-auto">
          <div className="sp-nav-label">Support</div>
          <Link href="/contact" className="sp-nav-item">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            Knowledge Base
          </Link>
          <a href="mailto:support@ozekiread.org" className="sp-nav-item">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 16 16 12 12 8"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
            Help & Contact
          </a>
        </div>
      </aside>

      {/* 2. Main Area */}
      <main className="sp-main">
        <header className="sp-header">
          <div className="sp-search-bar hidden sm:flex">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#babcce" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            <input type="text" placeholder="Search for anything..." />
          </div>
          <div className="sp-header-right ml-auto sm:ml-0">
            <a href="#reports" className="sp-action-btn">
              + Generate Report
            </a>
            <div className="sp-profile">
              <div className="w-10 h-10 rounded-xl bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                <Image src="/photos/22.jpeg" alt="Avatar" width={40} height={40} className="object-cover" />
              </div>
              <span className="sp-profile-name hidden sm:block">Guest Explorer</span>
            </div>
          </div>
        </header>

        <div className="sp-content">
          <Suspense fallback={<div className="h-[600px] w-full animate-pulse bg-white flex items-center justify-center text-gray-400 font-medium rounded-[20px] shadow-sm">Loading real-time DB data...</div>}>
            <PublicImpactMapExplorer
              syncUrl
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

          {/* 3. Reports Downloader strictly preserved in lower card */}
          <div className="sp-reports-section mt-8" id="reports">
            <div className="flex flex-col mb-8">
              <h2 className="text-2xl font-bold text-[#2b2b36] mb-2 flex items-center gap-2">
                 <Presentation className="text-[#6259ce]" size={24} /> Download Impact Reports
              </h2>
              <p className="text-[13px] text-gray-500 font-medium">
                Partner-ready reports generated directly from verified program data.
              </p>
            </div>

            {reportDataWarning ? (
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 flex items-start gap-4 mb-6">
                <ShieldAlert className="w-6 h-6 shrink-0 text-orange-600" />
                <p className="text-sm font-medium">Report data is temporarily unavailable. Dashboard visualizer remains active.</p>
              </div>
            ) : null}

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

            <div className="pt-8 mt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              {hasData ? (
                <>
                  <a 
                    href={pdfDownloadUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#6259ce] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#5048b0] transition-colors shadow-sm"
                  >
                    <Download size={18} /> Download AI Impact Report (PDF)
                  </a>
                  <p className="text-[13px] text-gray-400 font-medium text-center sm:text-right max-w-[300px]">
                    Report generated in real-time. Wait mapping execution.
                  </p>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 text-gray-500 w-full text-center font-medium">
                  No data points available for the currently selected filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
