"use client";

import { FormEvent, useMemo, useState } from "react";
import type { TrainingReportArtifactRecord, TrainingReportScopeType } from "@/lib/types";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";

interface PortalTrainingReportsManagerProps {
  initialReports: TrainingReportArtifactRecord[];
}

type ScopeOption = { value: TrainingReportScopeType; label: string; hint: string };

const scopeOptions: ScopeOption[] = [
  { value: "training_session", label: "Training Session", hint: "scopeValue = numeric training record id" },
  { value: "month", label: "Month", hint: "scopeValue = YYYY-MM" },
  { value: "quarter", label: "Quarter", hint: "scopeValue = YYYY-Q1" },
  { value: "fy", label: "Financial Year", hint: "scopeValue = YYYY or YYYY-YYYY" },
  { value: "district", label: "District", hint: "scopeValue = district name" },
  { value: "region", label: "Region", hint: "scopeValue = region name" },
  { value: "sub_region", label: "Sub-region", hint: "scopeValue = sub-region name" },
  { value: "country", label: "Country", hint: "scopeValue = country name (optional)" },
];

function toMonthStamp() {
  return new Date().toISOString().slice(0, 7);
}

function toDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function PortalTrainingReportsManager({ initialReports }: PortalTrainingReportsManagerProps) {
  const [reports, setReports] = useState(initialReports);
  const [scopeType, setScopeType] = useState<TrainingReportScopeType>("month");
  const [scopeValue, setScopeValue] = useState(toMonthStamp());
  const [periodStart, setPeriodStart] = useState(`${new Date().getUTCFullYear()}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(toDateStamp());
  const [includeObservedInsights, setIncludeObservedInsights] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [expandedCode, setExpandedCode] = useState("");

  const selectedScope = useMemo(
    () => scopeOptions.find((option) => option.value === scopeType) ?? scopeOptions[0],
    [scopeType],
  );

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback("Generating training report...");
    try {
      const response = await fetch("/api/portal/automation/training-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopeType,
          scopeValue: scopeValue.trim() || undefined,
          periodStart: periodStart.trim() || undefined,
          periodEnd: periodEnd.trim() || undefined,
          includeObservedInsights,
        }),
      });
      const json = (await response.json()) as {
        report?: TrainingReportArtifactRecord & { pdfUrl?: string | null };
        error?: string;
      };
      if (!response.ok || !json.report) {
        throw new Error(json.error ?? "Could not generate training report.");
      }
      setReports((prev) => [json.report as TrainingReportArtifactRecord, ...prev]);
      setExpandedCode(json.report.reportCode);
      setFeedback(`Generated ${json.report.reportCode}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not generate training report.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card portal-training-reports">
      <header>
        <h2>AI Training Report Generator</h2>
        <p>
          Generates facts-locked training reports from stored database records only, with a PDF
          export for internal use.
        </p>
      </header>

      <form className="portal-training-form" onSubmit={handleGenerate}>
        <label>
          <span>Scope type</span>
          <select value={scopeType} onChange={(event) => setScopeType(event.target.value as TrainingReportScopeType)}>
            {scopeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <small>{selectedScope.hint}</small>
        </label>
        <label>
          <span>Scope value</span>
          <input value={scopeValue} onChange={(event) => setScopeValue(event.target.value)} />
        </label>
        <label>
          <span>Period start</span>
          <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
        </label>
        <label>
          <span>Period end</span>
          <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={includeObservedInsights}
            onChange={(event) => setIncludeObservedInsights(event.target.checked)}
          />
          <span>Include observed-after-training insights (coaching + assessments)</span>
        </label>
        <div className="action-row">
          <button type="submit" className="button" disabled={saving}>
            {saving ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </form>

      {feedback ? <p className="portal-muted">{feedback}</p> : null}

      <div className="table-wrap">
        <DashboardListHeader template="160px minmax(0,1.6fr) 200px 170px minmax(0,1.4fr)">
          <span>Code</span>
          <span>Scope</span>
          <span>Period</span>
          <span>Generated</span>
          <span>Actions</span>
        </DashboardListHeader>
        {reports.length === 0 ? (
          <div className="portal-muted py-3">No generated training reports yet.</div>
        ) : (
          reports.map((report) => (
            <DashboardListRow
              key={report.reportCode}
              template="160px minmax(0,1.6fr) 200px 170px minmax(0,1.4fr)"
            >
              <span className="truncate">{report.reportCode}</span>
              <span className="truncate">{report.scopeType}: {report.scopeValue}</span>
              <span>{report.periodStart} to {report.periodEnd}</span>
              <span>{new Date(report.generatedAt).toLocaleString()}</span>
              <span className="min-w-0">
                <span className="action-row">
                  <a
                    className="button button-ghost"
                    href={`/api/portal/automation/training-report/${encodeURIComponent(report.reportCode)}/pdf`}
                  >
                    PDF
                  </a>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() =>
                      setExpandedCode((prev) => (prev === report.reportCode ? "" : report.reportCode))
                    }
                  >
                    {expandedCode === report.reportCode ? "Hide HTML" : "View HTML"}
                  </button>
                </span>
                {expandedCode === report.reportCode ? (
                  <details open style={{ marginTop: "0.5rem" }}>
                    <summary>Rendered HTML</summary>
                    <div
                      style={{
                        marginTop: "0.35rem",
                        border: "1px solid var(--md-sys-color-outline-variant)",
                        borderRadius: "12px",
                        background: "white",
                        maxHeight: "420px",
                        overflow: "auto",
                        padding: "0.75rem",
                      }}
                      dangerouslySetInnerHTML={{ __html: report.htmlReport }}
                    />
                  </details>
                ) : null}
              </span>
            </DashboardListRow>
          ))
        )}
      </div>
    </section>
  );
}

