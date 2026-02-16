"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ImpactReportProgramType,
  ImpactReportRecord,
  ImpactReportScopeType,
  ImpactReportType,
} from "@/lib/types";

interface PortalImpactReportsManagerProps {
  initialReports: ImpactReportRecord[];
}

const reportTypeOptions: ImpactReportType[] = [
  "FY Impact Report",
  "Regional Impact Report",
  "District Report",
  "School Report",
  "Partner Snapshot Report",
];

const scopeTypeOptions: ImpactReportScopeType[] = [
  "National",
  "Region",
  "District",
  "School",
];

const programOptions: Array<{ value: ImpactReportProgramType; label: string }> = [
  { value: "training", label: "Training" },
  { value: "visit", label: "Coaching & Visits" },
  { value: "assessment", label: "Assessments" },
  { value: "story", label: "1001 Story" },
  { value: "resources", label: "Resource Library" },
  { value: "online-training", label: "Online Training" },
];

function parseReferenceDate(value?: string) {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildUgandaSchoolFyRange(reference: Date) {
  const fyYear = reference.getMonth() === 0 ? reference.getFullYear() - 1 : reference.getFullYear();
  return {
    fyYear,
    startDate: `${fyYear}-02-01`,
    endDate: `${fyYear}-11-30`,
  };
}

export function PortalImpactReportsManager({
  initialReports,
}: PortalImpactReportsManagerProps) {
  const currentFyRange = useMemo(() => buildUgandaSchoolFyRange(new Date()), []);
  const [reports, setReports] = useState(initialReports);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedPrograms, setSelectedPrograms] = useState<ImpactReportProgramType[]>([
    "training",
    "visit",
    "assessment",
    "story",
  ]);
  const [selectedReportType, setSelectedReportType] = useState<ImpactReportType>("FY Impact Report");
  const [periodStart, setPeriodStart] = useState(currentFyRange.startDate);
  const [periodEnd, setPeriodEnd] = useState(currentFyRange.endDate);
  const [scopeType, setScopeType] = useState<ImpactReportScopeType>("National");
  const [publicOnly, setPublicOnly] = useState(false);

  const stats = useMemo(() => {
    const total = reports.length;
    const publicCount = reports.filter((item) => item.isPublic).length;
    const thisYear = new Date().getFullYear().toString();
    const currentYearCount = reports.filter((item) => item.generatedAt.startsWith(thisYear)).length;
    return { total, publicCount, currentYearCount };
  }, [reports]);

  const fyInfoText = useMemo(() => {
    const reference = parseReferenceDate(periodStart || periodEnd);
    const range = buildUgandaSchoolFyRange(reference);
    return `FY ${range.fyYear}: ${range.startDate} to ${range.endDate}`;
  }, [periodEnd, periodStart]);

  function applyUgandaSchoolFyDates(referenceValue?: string) {
    const range = buildUgandaSchoolFyRange(parseReferenceDate(referenceValue));
    setPeriodStart(range.startDate);
    setPeriodEnd(range.endDate);
  }

  async function handleBuildReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const scopeValue = String(formData.get("scopeValue") ?? "").trim();
    const version = String(formData.get("version") ?? "v1.0").trim() || "v1.0";
    const title = String(formData.get("title") ?? "").trim();
    const partnerName = String(formData.get("partnerName") ?? "").trim();
    const publishPublic = formData.get("isPublic") === "true";

    if (selectedPrograms.length === 0) {
      setStatus("Select at least one program module before generating a report.");
      return;
    }

    setSaving(true);
    setStatus("Generating report fact pack and narrative...");

    try {
      const response = await fetch("/api/portal/impact-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          partnerName: partnerName || undefined,
          reportType: selectedReportType,
          scopeType,
          scopeValue: scopeValue || undefined,
          periodStart,
          periodEnd,
          programsIncluded: selectedPrograms,
          isPublic: publishPublic,
          version,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        report?: ImpactReportRecord;
      };

      if (!response.ok || !data.report) {
        throw new Error(data.error ?? "Could not generate impact report.");
      }

      setReports((prev) => [data.report as ImpactReportRecord, ...prev]);
      setStatus(`Report ${data.report.reportCode} generated successfully.`);
      form.reset();
      setSelectedPrograms(["training", "visit", "assessment", "story"]);
      setSelectedReportType("FY Impact Report");
      const resetRange = buildUgandaSchoolFyRange(new Date());
      setPeriodStart(resetRange.startDate);
      setPeriodEnd(resetRange.endDate);
      setScopeType("National");
      setPublicOnly(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not generate report.");
    } finally {
      setSaving(false);
    }
  }

  function toggleProgram(value: ImpactReportProgramType) {
    setSelectedPrograms((current) => {
      if (current.includes(value)) {
        return current.filter((entry) => entry !== value);
      }
      return [...current, value];
    });
  }

  const visibleReports = useMemo(
    () => (publicOnly ? reports.filter((item) => item.isPublic) : reports),
    [reports, publicOnly],
  );

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        <article className="portal-kpi-card">
          <p>Total reports generated</p>
          <strong>{stats.total.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Public reports</p>
          <strong>{stats.publicCount.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Generated this year</p>
          <strong>{stats.currentYearCount.toLocaleString()}</strong>
        </article>
      </section>

      <section className="card portal-filter-card">
        <h2>Impact Report Engine</h2>
        <p>
          Build evidence-forward impact reports from dashboard data. The narrative is
          generated from a locked fact pack and never invents numbers.
        </p>
        <p className="meta-line">
          FY reports follow Uganda school-calendar sessions (Term I, Term II, Term III).
          Current default window: {fyInfoText}.
        </p>

        <form className="form-grid portal-form-grid portal-filter-grid-pretty" onSubmit={handleBuildReport}>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Report Type</span>
            <select
              name="reportType"
              value={selectedReportType}
              onChange={(event) => {
                const nextType = event.currentTarget.value as ImpactReportType;
                setSelectedReportType(nextType);
                if (nextType === "FY Impact Report") {
                  applyUgandaSchoolFyDates(periodStart || periodEnd);
                }
              }}
            >
              {reportTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Scope</span>
            <select
              name="scopeType"
              value={scopeType}
              onChange={(event) => setScopeType(event.currentTarget.value as ImpactReportScopeType)}
            >
              {scopeTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="portal-filter-field">
            <span className="portal-filter-field-label">
              {scopeType === "National" ? "Scope Value (Optional)" : "Scope Value"}
            </span>
            <input
              name="scopeValue"
              placeholder={
                scopeType === "National"
                  ? "All"
                  : scopeType === "Region"
                    ? "e.g. Northern Region"
                    : scopeType === "District"
                      ? "e.g. Gulu"
                      : "School name"
              }
            />
          </label>

          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Version</span>
            <input name="version" defaultValue="v1.0" maxLength={24} />
          </label>

          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Date from</span>
            <input
              name="periodStart"
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.currentTarget.value)}
              required
            />
          </label>

          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Date to</span>
            <input
              name="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.currentTarget.value)}
              required
            />
          </label>

          <label className="portal-filter-field full-width">
            <span className="portal-filter-field-label">FY helper</span>
            <button
              type="button"
              className="button button-ghost button-compact"
              onClick={() => applyUgandaSchoolFyDates(periodStart || periodEnd)}
            >
              Use Uganda School FY Dates (01 Feb - 30 Nov)
            </button>
          </label>

          <label className="portal-filter-field full-width">
            <span className="portal-filter-field-label">Custom title (optional)</span>
            <input
              name="title"
              maxLength={180}
              placeholder="e.g. FY2025 Partner Snapshot - Northern Region"
            />
          </label>

          <label className="portal-filter-field full-width">
            <span className="portal-filter-field-label">Partner name (optional)</span>
            <input
              name="partnerName"
              maxLength={160}
              placeholder="e.g. District Education Partnership Fund"
            />
          </label>

          <fieldset className="card full-width">
            <legend>Programs Included</legend>
            <div className="portal-multiselect">
              {programOptions.map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={selectedPrograms.includes(option.value)}
                    onChange={() => toggleProgram(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Publish for public download</span>
            <select name="isPublic" defaultValue="false">
              <option value="false">No (internal only)</option>
              <option value="true">Yes (show on public impact reports page)</option>
            </select>
          </label>

          <div className="action-row full-width">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Generating..." : "Generate Impact Report"}
            </button>
            <a
              className="button button-ghost"
              href="/impact/reports"
              target="_blank"
              rel="noreferrer"
            >
              Open public reports library
            </a>
          </div>
        </form>
        {status ? <p className="form-message success">{status}</p> : null}
      </section>

      <section className="card">
        <div className="portal-module-header">
          <div>
            <h2>Generated Reports</h2>
            <p>Each report includes fact pack JSON, narrative sections, and downloadable PDF.</p>
          </div>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">View</span>
            <select
              value={publicOnly ? "public" : "all"}
              onChange={(event) => setPublicOnly(event.currentTarget.value === "public")}
            >
              <option value="all">All reports</option>
              <option value="public">Public reports only</option>
            </select>
          </label>
        </div>

        {visibleReports.length === 0 ? (
          <p>No impact reports generated yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Scope</th>
                  <th>Period</th>
                  <th>Version</th>
                  <th>Visibility</th>
                  <th>Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleReports.map((report) => (
                  <tr key={report.reportCode}>
                    <td>
                      <strong>{report.title}</strong>
                      <br />
                      <small>
                        {report.reportCode} · {report.reportType}
                      </small>
                      {report.partnerName ? (
                        <>
                          <br />
                          <small>Partner: {report.partnerName}</small>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {report.scopeType}
                      <br />
                      <small>{report.scopeValue}</small>
                    </td>
                    <td>
                      {report.periodStart}
                      <br />
                      <small>to {report.periodEnd}</small>
                    </td>
                    <td>{report.version}</td>
                    <td>{report.isPublic ? "Public" : "Internal"}</td>
                    <td>
                      Views: {report.viewCount}
                      <br />
                      <small>Downloads: {report.downloadCount}</small>
                    </td>
                    <td>
                      <div className="action-row">
                        <a className="button button-ghost" href={`/impact/reports/${report.reportCode}`}>
                          View
                        </a>
                        <a
                          className="button"
                          href={`/api/impact-reports/${report.reportCode}/download`}
                        >
                          PDF
                        </a>
                        <a
                          className="button button-ghost"
                          href={`/api/impact-reports/${report.reportCode}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          JSON
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
