import type { Metadata } from "next";
import Link from "next/link";
import { PublicImpactMapExplorer } from "@/components/dashboard/map/PublicImpactMapExplorer";
import { ImpactReportFilters } from "@/components/impact/ImpactReportFilters";
import { getImpactReportFilterFacets, listPublicImpactReports, getSchoolLearnerAnalysis } from "@/lib/db";
import {
  ImpactReportAudience,
  ImpactReportOutput,
  ImpactReportPeriodType,
  ImpactReportScopeType,
  ImpactReportType,
  ReportCategory,
} from "@/lib/types";
import { LEARNING_DOMAIN_DICTIONARY } from "@/lib/domain-dictionary";

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

function parseAudience(value: string): ImpactReportAudience | undefined {
  const allowed: ImpactReportAudience[] = ["Public-safe", "Staff-only"];
  return (allowed as string[]).includes(value) ? (value as ImpactReportAudience) : undefined;
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

function scoreColor(score: number | null): string {
  if (score === null || score === undefined) return "var(--color-text-muted)";
  if (score >= 70) return "var(--color-brand-orange-dark)";
  if (score >= 40) return "color-mix(in oklab, var(--color-brand-orange), black 18%)";
  return "var(--color-state-danger)";
}

function scoreBg(score: number | null): string {
  if (score === null || score === undefined) return "transparent";
  if (score >= 70) return "color-mix(in oklab, var(--color-brand-orange), white 90%)";
  if (score >= 40) return "color-mix(in oklab, var(--color-brand-orange), white 88%)";
  return "color-mix(in oklab, var(--color-state-danger), white 90%)";
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
  const selectedAudience = firstValue(params.audience);
  const selectedOutput = firstValue(params.output);
  const selectedScopeType = firstValue(params.scopeType);
  const selectedScopeValue = firstValue(params.scopeValue);
  const selectedRegion = firstValue(params.region);
  const selectedSubRegion = firstValue(params.subRegion);
  const selectedDistrict = firstValue(params.district);
  const selectedSchoolId = firstValue(params.schoolId) || firstValue(params.school);

  const facets = getImpactReportFilterFacets();
  const selectedYear = resolveReportYear(selectedYearParam, facets.years);
  const reports = listPublicImpactReports({
    year: selectedYear,
    reportType: parseReportType(selectedType),
    reportCategory: parseReportCategory(selectedCategory),
    periodType: parsePeriodType(selectedPeriodType),
    audience: parseAudience(selectedAudience),
    output: parseOutput(selectedOutput),
    scopeType: parseScopeType(selectedScopeType),
    scopeValue: selectedScopeValue || undefined,
    region: selectedRegion || undefined,
    subRegion: selectedSubRegion || undefined,
    district: selectedDistrict || undefined,
    schoolId: selectedSchoolId ? parseInt(selectedSchoolId, 10) : undefined,
    limit: 200,
  });

  /* ── Per-child analysis (when school selected) ── */
  const schoolIdNum = selectedSchoolId ? parseInt(selectedSchoolId, 10) : null;
  const selectedAssessmentType = firstValue(params.assessmentType) || undefined;
  const learnerAnalysis = schoolIdNum
    ? getSchoolLearnerAnalysis(schoolIdNum, selectedAssessmentType)
    : [];
  const selectedSchoolName = schoolIdNum
    ? facets.schools.find((s) => s.id === schoolIdNum)?.name ?? ""
    : "";

  return (
    <>
      <div className="impact-live-compact-zone">
        {/* ═══ Hero ═══ */}
        <section className="page-hero impact-page-hero">
          <div className="container impact-page-hero-container">
            <p className="kicker">Impact overview</p>
            <h1>Live Literacy Impact Dashboard</h1>
            <p>
              Public dashboard data is aggregated from verified staff submissions and published
              with privacy controls.
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
      <section id="reports" className="section" style={{ background: "var(--md-sys-color-surface-container, #f5f5f5)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <p className="kicker">REPORTS</p>
            <h2 className="tpd-page-title">Download Impact Reports</h2>
            <p>
              Partner-ready reports generated directly from verified program data.
              FY reports follow Uganda school-calendar sessions (Term I-III): 01 February to 30 November.
            </p>
          </div>

          <div className="card impact-filter-card" style={{ marginBottom: "2rem" }}>
            <h2>Filter Reports</h2>
            <ImpactReportFilters
              initialYear={selectedYear}
              initialReportType={selectedType}
              initialReportCategory={selectedCategory}
              initialPeriodType={selectedPeriodType}
              initialOutput={selectedOutput}
              initialAudience={selectedAudience}
              initialRegion={selectedRegion}
              initialSubRegion={selectedSubRegion}
              initialDistrict={selectedDistrict}
              initialSchoolId={selectedSchoolId}
              reportTypes={facets.reportTypes}
              reportCategories={facets.reportCategories}
              periodTypes={facets.periodTypes}
              outputs={facets.outputs}
              audiences={facets.audiences}
              period={firstValue(params.period) || undefined}
            />
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

      {/* ═══ Per-Child Learner Analysis (School Level) ═══ */}
      {schoolIdNum ? (
        <section id="learner-analysis" className="section">
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <p className="kicker">SCHOOL-LEVEL ANALYSIS</p>
              <h2 className="tpd-page-title">
                Learner Analysis{selectedSchoolName ? `: ${selectedSchoolName}` : ""}
              </h2>
              <p>
                Individual learner scores across 6 EGRA domains. Learners scoring below 40% in
                any domain are flagged as <strong style={{ color: "var(--color-state-danger)" }}>struggling</strong>.
              </p>
            </div>

            {/* Assessment type filter */}
            <div className="card" style={{ marginBottom: "1.5rem", padding: "0.8rem 1rem" }}>
              <form method="GET" action="/impact" style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                {/* Preserve other params */}
                {selectedYear && <input type="hidden" name="year" value={selectedYear} />}
                {selectedType && <input type="hidden" name="reportType" value={selectedType} />}
                {selectedRegion && <input type="hidden" name="region" value={selectedRegion} />}
                {selectedSubRegion && <input type="hidden" name="subRegion" value={selectedSubRegion} />}
                {selectedDistrict && <input type="hidden" name="district" value={selectedDistrict} />}
                <input type="hidden" name="schoolId" value={selectedSchoolId} />

                <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem", fontWeight: 600 }}>
                  Assessment Type:
                  <select name="assessmentType" defaultValue={selectedAssessmentType ?? ""} style={{ padding: "0.35rem 0.5rem", borderRadius: "8px", border: "1px solid var(--md-sys-color-outline)" }}>
                    <option value="">All</option>
                    <option value="baseline">Baseline</option>
                    <option value="progress">Progress</option>
                    <option value="endline">Endline</option>
                  </select>
                </label>
                <button className="button" type="submit" style={{ padding: "0.35rem 1rem", fontSize: "0.82rem" }}>Filter</button>
              </form>
            </div>

            {learnerAnalysis.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="learner-analysis-table">
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Gender</th>
                      <th>Class</th>
                      <th>Type</th>
                      <th>Date</th>
                        <th title={LEARNING_DOMAIN_DICTIONARY.letter_names.description}>{LEARNING_DOMAIN_DICTIONARY.letter_names.label_short}</th>
                        <th title={LEARNING_DOMAIN_DICTIONARY.letter_sounds.description}>{LEARNING_DOMAIN_DICTIONARY.letter_sounds.label_short}</th>
                        <th title={LEARNING_DOMAIN_DICTIONARY.real_words.description}>{LEARNING_DOMAIN_DICTIONARY.real_words.label_short}</th>
                        <th title={LEARNING_DOMAIN_DICTIONARY.made_up_words.description}>{LEARNING_DOMAIN_DICTIONARY.made_up_words.label_short}</th>
                        <th title={LEARNING_DOMAIN_DICTIONARY.story_reading.description}>{LEARNING_DOMAIN_DICTIONARY.story_reading.label_short}</th>
                        <th title={LEARNING_DOMAIN_DICTIONARY.comprehension.description}>{LEARNING_DOMAIN_DICTIONARY.comprehension.label_short}</th>
                      <th>Avg</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {learnerAnalysis.map((row, idx) => (
                      <tr key={`${row.learnerUid}-${row.assessmentType}-${idx}`} style={row.isStruggling ? { background: "color-mix(in oklab, var(--color-state-danger), white 94%)" } : undefined}>
                        <td style={{ fontWeight: 600 }}>{row.learnerName}</td>
                        <td>{row.gender}</td>
                        <td>{row.classGrade}</td>
                        <td><span className="meta-pill" style={{ fontSize: "0.65rem" }}>{row.assessmentType}</span></td>
                        <td style={{ fontSize: "0.78rem" }}>{row.assessmentDate}</td>
                        <td style={{ color: scoreColor(row.letterNamesScore), background: scoreBg(row.letterNamesScore), fontWeight: 700, textAlign: "center" }}>{row.letterNamesScore ?? "—"}</td>
                        <td style={{ color: scoreColor(row.letterSoundsScore), background: scoreBg(row.letterSoundsScore), fontWeight: 700, textAlign: "center" }}>{row.letterSoundsScore ?? "—"}</td>
                        <td style={{ color: scoreColor(row.realWordsScore), background: scoreBg(row.realWordsScore), fontWeight: 700, textAlign: "center" }}>{row.realWordsScore ?? "—"}</td>
                        <td style={{ color: scoreColor(row.madeUpWordsScore), background: scoreBg(row.madeUpWordsScore), fontWeight: 700, textAlign: "center" }}>{row.madeUpWordsScore ?? "—"}</td>
                        <td style={{ color: scoreColor(row.storyReadingScore), background: scoreBg(row.storyReadingScore), fontWeight: 700, textAlign: "center" }}>{row.storyReadingScore ?? "—"}</td>
                        <td style={{ color: scoreColor(row.comprehensionScore), background: scoreBg(row.comprehensionScore), fontWeight: 700, textAlign: "center" }}>{row.comprehensionScore ?? "—"}</td>
                        <td style={{ fontWeight: 700, textAlign: "center" }}>{row.averageScore ?? "—"}</td>
                        <td>
                          {row.isStruggling ? (
                            <span style={{ background: "var(--color-state-danger)", color: "#fff", borderRadius: "999px", padding: "0.15rem 0.55rem", fontSize: "0.68rem", fontWeight: 700 }}>
                              Needs Support
                            </span>
                          ) : (
                            <span style={{ background: "var(--color-brand-orange)", color: "#fff", borderRadius: "999px", padding: "0.15rem 0.55rem", fontSize: "0.68rem", fontWeight: 700 }}>
                              On Track
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
                <h3>No learner data found</h3>
                <p>No assessment results are available for this school yet. Data will appear here once learner assessments are entered.</p>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "var(--color-brand-orange)", display: "inline-block" }} /> ≥ 70% (Strong)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "color-mix(in oklab, var(--color-brand-orange), black 18%)", display: "inline-block" }} /> 40–69% (Developing)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "var(--color-state-danger)", display: "inline-block" }} /> &lt; 40% (Needs Support)
              </span>
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
