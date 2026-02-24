import Link from "next/link";
import { getImpactReportFilterFacets, listPublicImpactReports } from "@/lib/db";
import { ImpactReportScopeType, ImpactReportType } from "@/lib/types";

export const metadata = {
  title: "Impact Reports",
  description:
    "Download FY impact reports, quarterly snapshots, and regional/district summaries generated from verified program data.",
};

export const dynamic = "force-dynamic";

function normalizeValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function parseType(value: string): ImpactReportType | undefined {
  const allowed: ImpactReportType[] = [
    "FY Impact Report",
    "Regional Impact Report",
    "District Report",
    "School Report",
    "Partner Snapshot Report",
  ];
  return (allowed as string[]).includes(value) ? (value as ImpactReportType) : undefined;
}

function parseScope(value: string): ImpactReportScopeType | undefined {
  const allowed: ImpactReportScopeType[] = ["National", "Region", "District", "School"];
  return (allowed as string[]).includes(value) ? (value as ImpactReportScopeType) : undefined;
}

export default async function ImpactReportsLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedYear = normalizeValue(params.year);
  const selectedType = normalizeValue(params.reportType);
  const selectedScopeType = normalizeValue(params.scopeType);
  const selectedScopeValue = normalizeValue(params.scopeValue);

  const facets = getImpactReportFilterFacets();
  const reports = listPublicImpactReports({
    year: selectedYear && /^\d{4}$/.test(selectedYear) ? selectedYear : undefined,
    reportType: parseType(selectedType),
    scopeType: parseScope(selectedScopeType),
    scopeValue: selectedScopeValue || undefined,
    limit: 200,
  });

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact</p>
          <h1>Download Impact Reports</h1>
          <p>
            Partner-ready reports generated directly from verified program data.
          </p>
          <p className="meta-line">
            FY reports follow Uganda school-calendar sessions (Term I-III): 01 February to 30 November.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container card impact-filter-card">
          <h2>Filters</h2>
          <form method="GET" className="filters impact-filter-grid">
            <label>
              <span>Year/FY</span>
              <select name="year" defaultValue={selectedYear}>
                <option value="">All years</option>
                {facets.years.map((year) => (
                  <option value={year} key={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Report type</span>
              <select name="reportType" defaultValue={selectedType}>
                <option value="">All report types</option>
                {facets.reportTypes.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Scope type</span>
              <select name="scopeType" defaultValue={selectedScopeType}>
                <option value="">All scope types</option>
                {facets.scopeTypes.map((scopeType) => (
                  <option value={scopeType} key={scopeType}>
                    {scopeType}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Region/District/Scope</span>
              <select name="scopeValue" defaultValue={selectedScopeValue}>
                <option value="">All scope values</option>
                {facets.scopeValues.map((scopeValue) => (
                  <option value={scopeValue} key={scopeValue}>
                    {scopeValue}
                  </option>
                ))}
              </select>
            </label>

            <button className="button" type="submit">
              Apply
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
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
                  Scope: {report.scopeType} - {report.scopeValue}
                  <br />
                  Period: {report.periodStart} to {report.periodEnd}
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
                  <Link className="inline-download-link" href={`/impact/reports/${report.reportCode}`}>
                    View Web Version
                  </Link>
                </p>
              </article>
            );
          })}

          {reports.length === 0 ? (
            <article className="card">
              <h3>No reports found</h3>
              <p>Adjust the filter options and try again.</p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <p className="meta-line">
            FY periods are aligned to Uganda school sessions to reflect implementation during active learning terms.
          </p>
          <p className="meta-line">
            Public reports are aggregated. School-level reports are shared securely via
            partner portal access.
          </p>
        </div>
      </section>
    </>
  );
}
