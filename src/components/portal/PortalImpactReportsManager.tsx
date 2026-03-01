"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  "Sub-region Report",
  "District Report",
  "School Report",
  "School Coaching Pack",
  "Headteacher Summary",
  "Partner Snapshot Report",
];

const scopeTypeOptions: ImpactReportScopeType[] = [
  "National",
  "Region",
  "Sub-region",
  "District",
  "Sub-county",
  "Parish",
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [scopeType, setScopeType] = useState<ImpactReportScopeType>("National");

  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [subregions, setSubregions] = useState<Array<{ id: string; name: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [subcounties, setSubcounties] = useState<Array<{ id: string; name: string }>>([]);
  const [parishes, setParishes] = useState<Array<{ id: string; name: string }>>([]);

  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedSubRegionId, setSelectedSubRegionId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedSubCountyId, setSelectedSubCountyId] = useState("");
  const [selectedParishId, setSelectedParishId] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  const [schools, setSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [publicOnly, setPublicOnly] = useState(false);
  const [previewStats, setPreviewStats] = useState<{
    schoolsIncluded: number;
    learnersAssessed: number;
    dataCompleteness: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const computedScopeValue = useMemo(() => {
    if (scopeType === "School") return selectedSchoolId;
    if (scopeType === "Parish") return selectedParishId;
    if (scopeType === "Sub-county") return selectedSubCountyId;
    if (scopeType === "District") return selectedDistrictId;
    if (scopeType === "Sub-region") return selectedSubRegionId;
    if (scopeType === "Region") return selectedRegionId;
    return "";
  }, [scopeType, selectedDistrictId, selectedRegionId, selectedSchoolId, selectedSubRegionId, selectedSubCountyId, selectedParishId]);

  // Initial FY window setup
  useEffect(() => {
    const start = `${selectedYear}-02-01`;
    const end = `${selectedYear}-11-30`;
    setPeriodStart(start);
    setPeriodEnd(end);
  }, [selectedYear]);

  // Cascading Fetchers
  useEffect(() => {
    fetch("/api/geo/regions")
      .then(r => r.json())
      .then(data => setRegions(data.regions || []));
  }, []);

  useEffect(() => {
    if (selectedRegionId) {
      fetch(`/api/geo/subregions?regionId=${selectedRegionId}`)
        .then(r => r.json())
        .then(data => setSubregions(data.subregions || []));
    } else {
      setSubregions([]);
    }
    setSelectedSubRegionId("");
  }, [selectedRegionId]);

  useEffect(() => {
    if (selectedSubRegionId) {
      fetch(`/api/geo/districts?subregionId=${selectedSubRegionId}`)
        .then(r => r.json())
        .then(data => setDistricts(data.districts || []));
    } else {
      setDistricts([]);
    }
    setSelectedDistrictId("");
  }, [selectedSubRegionId]);

  useEffect(() => {
    if (selectedDistrictId) {
      fetch(`/api/geo/subcounties?districtId=${selectedDistrictId}`)
        .then(r => r.json())
        .then(data => setSubcounties(data.subcounties || []));
    } else {
      setSubcounties([]);
    }
    setSelectedSubCountyId("");
  }, [selectedDistrictId]);

  useEffect(() => {
    if (selectedSubCountyId) {
      fetch(`/api/geo/parishes?subcountyId=${selectedSubCountyId}`)
        .then(r => r.json())
        .then(data => setParishes(data.parishes || []));
    } else {
      setParishes([]);
    }
    setSelectedParishId("");
  }, [selectedSubCountyId]);

  useEffect(() => {
    if (scopeType === "School" && selectedDistrictId) {
      // Find district name from ID for legacy API compatibility or update API
      const districtName = districts.find(d => d.id === selectedDistrictId)?.name;
      if (districtName) {
        fetch(`/api/portal/schools?district=${encodeURIComponent(districtName)}`)
          .then((r) => r.json())
          .then((data) => setSchools(data.schools || []))
          .catch(() => setSchools([]));
      }
    } else {
      setSchools([]);
    }
    setSelectedSchoolId("");
  }, [scopeType, selectedDistrictId, districts]);

  useEffect(() => {
    if (scopeType !== "National" && !computedScopeValue) {
      setPreviewStats(null);
      return;
    }

    setPreviewLoading(true);
    fetch("/api/portal/reports/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scopeType,
        scopeValue: computedScopeValue,
        periodStart,
        periodEnd,
        programsIncluded: selectedPrograms,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPreviewStats(data.stats);
        else setPreviewStats(null);
      })
      .catch(() => setPreviewStats(null))
      .finally(() => setPreviewLoading(false));
  }, [scopeType, computedScopeValue, periodStart, periodEnd, selectedPrograms]);

  // Replaced with dynamic cascading fetchers above

  async function handleBuildReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const scopeValue = computedScopeValue;
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
      setSelectedYear(new Date().getFullYear());
      setScopeType("National");
      setSelectedRegionId("");
      setSelectedSubRegionId("");
      setSelectedDistrictId("");
      setSelectedSubCountyId("");
      setSelectedParishId("");
      setSelectedSchoolId("");
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
            <span className="portal-filter-field-label">Year</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {Array.from({ length: 2050 - 2024 + 1 }, (_, i) => 2024 + i).map(y => (
                <option key={y} value={y}>{y}</option>
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

          {scopeType !== "National" ? (
            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Region</span>
              <select
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
              >
                <option value="">Select Region...</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scopeType === "Sub-region" || scopeType === "District" || scopeType === "Sub-county" || scopeType === "Parish" || scopeType === "School" ? (
            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Sub-region</span>
              <select
                value={selectedSubRegionId}
                onChange={(e) => setSelectedSubRegionId(e.target.value)}
                disabled={!selectedRegionId}
              >
                <option value="">{selectedRegionId ? "Select Sub-region..." : "Select Region first"}</option>
                {subregions.map((sr) => (
                  <option key={sr.id} value={sr.id}>
                    {sr.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scopeType === "District" || scopeType === "Sub-county" || scopeType === "Parish" || scopeType === "School" ? (
            <label className="portal-filter-field">
              <span className="portal-filter-field-label">District</span>
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                disabled={!selectedSubRegionId}
              >
                <option value="">{selectedSubRegionId ? "Select District..." : "Select Sub-region first"}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scopeType === "Sub-county" || scopeType === "Parish" || scopeType === "School" ? (
            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Sub-county</span>
              <select
                value={selectedSubCountyId}
                onChange={(e) => setSelectedSubCountyId(e.target.value)}
                disabled={!selectedDistrictId}
              >
                <option value="">{selectedDistrictId ? "Select Sub-county..." : "Select District first"}</option>
                {subcounties.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scopeType === "Parish" || scopeType === "School" ? (
            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Parish</span>
              <select
                value={selectedParishId}
                onChange={(e) => setSelectedParishId(e.target.value)}
                disabled={!selectedSubCountyId}
              >
                <option value="">{selectedSubCountyId ? "Select Parish..." : "Select Sub-county first"}</option>
                {parishes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scopeType === "School" ? (
            <label className="portal-filter-field">
              <span className="portal-filter-field-label">School</span>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                disabled={!selectedDistrictId}
              >
                <option value="">{selectedDistrictId ? "Select School..." : "Select District first"}</option>
                {schools.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

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

          <div className="report-preview-box">
            <h4>Live Preview</h4>
            {previewLoading ? (
              <p className="preview-loading">Calculating scope metrics...</p>
            ) : previewStats ? (
              <ul className="preview-stats-list">
                <li>
                  <span className="preview-stat-label">Coverage</span>
                  <span className="preview-stat-value">
                    {previewStats.schoolsIncluded.toLocaleString()} schools
                  </span>
                </li>
                <li>
                  <span className="preview-stat-label">Assessments</span>
                  <span className="preview-stat-value">
                    {previewStats.learnersAssessed.toLocaleString()} learners
                  </span>
                </li>
                <li>
                  <span className="preview-stat-label">Completeness</span>
                  <span className="preview-stat-value">
                    {previewStats.dataCompleteness}
                  </span>
                </li>
              </ul>
            ) : (
              <p className="preview-empty">Select scope definitions to view impact size.</p>
            )}
            <div className="action-row full-width" style={{ marginTop: "1rem" }}>
              <button className="button" type="submit" disabled={saving || (scopeType !== "National" && !computedScopeValue)}>
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
