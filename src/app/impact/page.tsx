import type { Metadata } from "next";
import Link from "next/link";
import { StoryLibraryClient } from "@/components/StoryLibraryClient";
import { FeaturedAnthologyHero } from "@/components/dashboard/FeaturedAnthologyHero";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { BookOpen, ShieldAlert, Download, Presentation } from "lucide-react";
import {
    listPublishedAnthologiesPostgres,
    listPublishedStoriesPostgres,
    listStoryLanguagesPostgres,
    listStoryTagsPostgres,
} from "@/lib/server/postgres/repositories/public-content";
import { ImpactReportFilters } from "@/components/impact/ImpactReportFilters";
import { getImpactReportFilterFacetsAsync } from "@/services/dataService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "1001 Story Library & Impact Reports",
    description:
        "Read stories written by primary school learners across Uganda and download verified literacy impact reports.",
    openGraph: {
        title: "1001 Story Library & Impact",
        description: "Learner-authored stories and reading impact reports from Uganda.",
        type: "website",
    },
};

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

export default async function ImpactToStoryLibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
    const params = await searchParams;

    // --- Story Library Data ---
    let stories: Awaited<ReturnType<typeof listPublishedStoriesPostgres>>["stories"] = [];
    let total = 0;
    let anthologies: Awaited<ReturnType<typeof listPublishedAnthologiesPostgres>> = [];
    let languages: string[] = [];
    let tags: string[] = [];
    try {
        const result = await listPublishedStoriesPostgres({ limit: 24 });
        stories = result.stories;
        total = result.total;
        anthologies = await listPublishedAnthologiesPostgres({ limit: 24 });
        languages = await listStoryLanguagesPostgres();
        tags = await listStoryTagsPostgres();
    } catch (error) {
        console.error("Failed to load stories data.", error);
    }

    // --- Impact Report Data ---
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
        <div className="min-h-screen flex flex-col font-sans">
            <main className="flex-grow pt-[72px] md:pt-20">
                <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-24 border-b border-gray-100">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#006b61]/10 via-brand-background to-brand-background pointer-events-none" />
                    <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-bold text-sm mb-6 shadow-sm border border-[#FA7D15]/20">
                            <BookOpen className="w-4 h-4" /> 1001 Story Project
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
                            1001 Story Library
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                            Read stories written by primary school learners across Uganda.
                            Every story is a step toward confidence, literacy, and voice.
                        </p>
                    </div>
                </section>

                {anthologies.length > 0 && anthologies[0].featured && (
                    <FeaturedAnthologyHero anthology={anthologies[0]} />
                )}

                <SectionWrapper theme="off-white">
                    <div className="max-w-7xl mx-auto">
                        <StoryLibraryClient
                            initialStories={stories}
                            initialTotal={total}
                            initialAnthologies={anthologies}
                            languages={languages}
                            tags={tags}
                        />
                    </div>
                </SectionWrapper>

                {/* Reports Downloader */}
                <SectionWrapper theme="light" id="reports">
                    <div className="max-w-7xl mx-auto flex flex-col gap-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-6">
                                <Presentation size={32} />
                            </div>
                            <h2 className="text-4xl font-bold text-gray-900 mb-4">Download Impact Reports</h2>
                            <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
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

                        <PremiumCard className="p-8 md:p-12 w-full">
                            <h3 className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-100 pb-4">Configure Report</h3>
                            
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

                {/* Privacy Notice (if school is selected) */}
                {selectedSchoolId && (
                    <SectionWrapper theme="off-white" id="school-reading-performance">
                        <PremiumCard className="p-8 md:p-12 text-center max-w-7xl mx-auto border-dashed border-2 bg-transparent shadow-none">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldAlert className="w-6 h-6 text-gray-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Notice</h2>
                            <p className="text-gray-600 leading-relaxed mb-8 max-w-3xl mx-auto">
                                Public dashboards only show aggregated school performance. Detailed school reading
                                performance reports with named learners or teachers are generated by staff on
                                request, then shared through controlled channels.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link href="/request-support" className="px-6 py-3 rounded-full bg-gray-900 text-white font-semibold flex items-center justify-center hover:bg-gray-800 transition-colors">
                                    Request Staff-Generated Report
                                </Link>
                            </div>
                        </PremiumCard>
                    </SectionWrapper>
                )}

                {/* Bottom Methodology & CTA Strip */}
                <CTAStrip 
                    heading="Understand our approach."
                    subheading="Review the data collection and synthesis methodology powering the National Literacy Intelligence Platform."
                    primaryButtonText="Read the Methodology"
                    primaryButtonHref="/impact/methodology"
                    theme="brand"
                />
            </main>
        </div>
    );
}
