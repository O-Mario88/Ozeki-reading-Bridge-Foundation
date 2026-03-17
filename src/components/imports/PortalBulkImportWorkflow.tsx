"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImportPreviewResult } from "@/lib/server/imports/constants";

type CommitSummary = {
  totalRows: number;
  validRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
};

interface PortalBulkImportWorkflowProps {
  importType: "schools" | "training_participants";
  title: string;
  description: string;
  validateUrl: string;
  commitUrl: string;
  csvTemplateHref: string;
  xlsxTemplateHref: string;
  backHref: string;
  backLabel: string;
  acceptedLabel?: string;
  trainingId?: number | null;
  contextLabel?: string | null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function summaryValue(summary: CommitSummary | ImportPreviewResult["summary"], key: keyof CommitSummary | keyof ImportPreviewResult["summary"]) {
  return Number(summary[key as keyof typeof summary] ?? 0);
}

function parseFileNameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) {
    return fallback;
  }
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

async function readJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return null;
}

async function downloadBlob(args: {
  url: string;
  method?: "GET" | "POST";
  body?: string;
  fallbackFileName: string;
}) {
  const response = await fetch(args.url, {
    method: args.method ?? "GET",
    headers: args.body
      ? {
          "content-type": "application/json",
        }
      : undefined,
    body: args.body,
  });
  if (!response.ok) {
    const payload = await readJson(response);
    throw new Error(payload?.error?.message ?? "Download failed.");
  }
  const blob = await response.blob();
  const fileName = parseFileNameFromDisposition(
    response.headers.get("content-disposition"),
    args.fallbackFileName,
  );
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function rowPrimaryLabel(importType: PortalBulkImportWorkflowProps["importType"], row: ImportPreviewResult["rows"][number]) {
  if (importType === "schools") {
    return row.rawData.school_name || `Row ${row.rowNumber}`;
  }
  const fullName = [row.rawData.first_name, row.rawData.last_name].filter(Boolean).join(" ").trim();
  return fullName || row.rawData.participant_external_id || `Row ${row.rowNumber}`;
}

function rowSecondaryLabel(importType: PortalBulkImportWorkflowProps["importType"], row: ImportPreviewResult["rows"][number]) {
  if (importType === "schools") {
    return [row.rawData.country, row.rawData.region, row.rawData.district, row.rawData.parish]
      .filter(Boolean)
      .join(" • ");
  }
  return [
    row.rawData.training_code,
    row.rawData.school_external_id || row.rawData.school_name,
    row.rawData.district,
  ]
    .filter(Boolean)
    .join(" • ");
}

export function PortalBulkImportWorkflow({
  importType,
  title,
  description,
  validateUrl,
  commitUrl,
  csvTemplateHref,
  xlsxTemplateHref,
  backHref,
  backLabel,
  acceptedLabel = ".csv, .xlsx, .xls up to 10MB",
  trainingId,
  contextLabel,
}: PortalBulkImportWorkflowProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "idle" | "error" | "success"; message: string }>({
    kind: "idle",
    message: "",
  });
  const [isDragging, setIsDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitSummary, setCommitSummary] = useState<CommitSummary | null>(null);
  const [downloadingMissing, setDownloadingMissing] = useState<"csv" | "xlsx" | null>(null);

  const hasBlockingErrors = (preview?.summary.errorCount ?? 0) > 0;
  const missingSchoolPreview = useMemo(() => preview?.missingSchools?.slice(0, 6) ?? [], [preview]);

  function resetWorkflow() {
    setPreview(null);
    setCommitSummary(null);
    setFeedback({ kind: "idle", message: "" });
  }

  function assignFile(file: File | null) {
    setSelectedFile(file);
    setPreview(null);
    setCommitSummary(null);
    setFeedback({ kind: "idle", message: "" });
  }

  async function handleValidate() {
    if (!selectedFile) {
      setFeedback({ kind: "error", message: "Choose a CSV or Excel file to validate." });
      return;
    }
    setValidating(true);
    setFeedback({ kind: "idle", message: "" });
    setCommitSummary(null);
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      if (trainingId) {
        formData.set("trainingId", String(trainingId));
      }
      const response = await fetch(validateUrl, {
        method: "POST",
        body: formData,
      });
      const payload = await readJson(response);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "Validation failed.");
      }
      setPreview(payload.preview as ImportPreviewResult);
      setFeedback({
        kind: payload.preview.summary.errorCount > 0 ? "error" : "success",
        message:
          payload.preview.summary.errorCount > 0
            ? `Validation found ${payload.preview.summary.errorCount} blocking row error(s).`
            : "Validation completed. Review the preview and commit when ready.",
      });
    } catch (error) {
      setPreview(null);
      setFeedback({ kind: "error", message: getErrorMessage(error, "Validation failed.") });
    } finally {
      setValidating(false);
    }
  }

  async function handleCommit() {
    if (!preview) {
      return;
    }
    setCommitting(true);
    setFeedback({ kind: "idle", message: "" });
    try {
      const response = await fetch(commitUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ importJobId: preview.importJobId }),
      });
      const payload = await readJson(response);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "Import commit failed.");
      }
      setCommitSummary(payload.summary as CommitSummary);
      setFeedback({
        kind: payload.summary.errorCount > 0 ? "error" : "success",
        message:
          payload.summary.errorCount > 0
            ? `Import committed with ${payload.summary.errorCount} row error(s).`
            : "Import committed successfully.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: getErrorMessage(error, "Import commit failed.") });
    } finally {
      setCommitting(false);
    }
  }

  async function handleDownloadErrors() {
    if (!preview) {
      return;
    }
    try {
      await downloadBlob({
        url: `/api/import/jobs/${preview.importJobId}/errors.csv`,
        fallbackFileName: `import-job-${preview.importJobId}-errors.csv`,
      });
    } catch (error) {
      setFeedback({ kind: "error", message: getErrorMessage(error, "Could not download error file.") });
    }
  }

  async function handleDownloadMissingSchools(format: "csv" | "xlsx") {
    if (!preview?.missingSchools?.length) {
      return;
    }
    setDownloadingMissing(format);
    try {
      await downloadBlob({
        url: "/api/import/training-participants/missing-schools-template",
        method: "POST",
        body: JSON.stringify({
          format,
          missingSchools: preview.missingSchools,
        }),
        fallbackFileName:
          format === "csv"
            ? "missing-schools-import-template.csv"
            : "missing-schools-import-template.xlsx",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: getErrorMessage(error, "Could not generate the missing schools template."),
      });
    } finally {
      setDownloadingMissing(null);
    }
  }

  return (
    <div className="portal-import-page">
      <section className="portal-import-card portal-import-hero">
        <div>
          <p className="portal-import-eyebrow">Bulk Import</p>
          <h2>{title}</h2>
          <p>{description}</p>
          {contextLabel ? <p className="portal-import-context">Context: {contextLabel}</p> : null}
        </div>
        <div className="action-row">
          <a href={xlsxTemplateHref} className="button button-ghost">
            Download Excel Template
          </a>
          <a href={csvTemplateHref} className="button button-ghost">
            Download CSV Template
          </a>
          <a href={backHref} className="button button-ghost">
            {backLabel}
          </a>
        </div>
      </section>

      <section className="portal-import-card">
        <div
          className={`portal-import-dropzone${isDragging ? " is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files?.[0] ?? null;
            assignFile(file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => assignFile(event.target.files?.[0] ?? null)}
            hidden
          />
          <p className="portal-import-dropzone-title">Drop a file here or choose one from your device.</p>
          <p className="portal-import-dropzone-copy">Accepted types: {acceptedLabel}</p>
          {selectedFile ? (
            <p className="portal-import-file-name">Selected file: {selectedFile.name}</p>
          ) : null}
          <div className="action-row">
            <button type="button" className="button" onClick={() => inputRef.current?.click()}>
              Choose File
            </button>
            <button type="button" className="button" onClick={() => void handleValidate()} disabled={validating}>
              {validating ? "Validating..." : "Validate Import"}
            </button>
            <button type="button" className="button button-ghost" onClick={resetWorkflow}>
              Reset
            </button>
          </div>
        </div>

        {feedback.message ? (
          <div className={`portal-import-feedback portal-import-feedback--${feedback.kind}`} role="status">
            {feedback.message}
          </div>
        ) : null}
      </section>

      {preview ? (
        <>
          {preview.missingSchoolsCount ? (
            <section className="portal-import-card portal-import-warning">
              <div>
                <h3>{preview.missingSchoolsCount} schools referenced in this file do not exist in the system.</h3>
                <p>
                  {preview.affectedRowsCount ?? 0} participant row(s) are blocked until those schools are imported.
                  Download the generated schools template, import those schools first, then re-run this participant import.
                </p>
                {missingSchoolPreview.length > 0 ? (
                  <ul className="portal-import-missing-list">
                    {missingSchoolPreview.map((school) => (
                      <li key={`${school.school_external_id || school.school_name}-${school.district}-${school.parish}`}>
                        <strong>{school.school_name || school.school_external_id || "Unnamed school"}</strong>
                        <span>
                          {[school.district, school.parish, school.country].filter(Boolean).join(" • ") || "Location details missing"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="action-row">
                <button
                  type="button"
                  className="button"
                  disabled={downloadingMissing !== null}
                  onClick={() => void handleDownloadMissingSchools("xlsx")}
                >
                  {downloadingMissing === "xlsx" ? "Preparing Excel..." : "Download Missing Schools Template"}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  disabled={downloadingMissing !== null}
                  onClick={() => void handleDownloadMissingSchools("csv")}
                >
                  {downloadingMissing === "csv" ? "Preparing CSV..." : "Download Missing Schools CSV"}
                </button>
              </div>
            </section>
          ) : null}

          <section className="portal-import-card">
            <div className="portal-import-summary-grid">
              {[
                ["Total rows", summaryValue(preview.summary, "totalRows")],
                ["Valid rows", summaryValue(preview.summary, "validRows")],
                ["Create", summaryValue(preview.summary, "createCount")],
                ["Update", summaryValue(preview.summary, "updateCount")],
                ["Skip", summaryValue(preview.summary, "skippedCount")],
                ["Errors", summaryValue(preview.summary, "errorCount")],
              ].map(([label, value]) => (
                <article key={label} className="portal-import-stat">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <div className="action-row" style={{ marginTop: "1rem" }}>
              <button
                type="button"
                className="button"
                onClick={() => void handleCommit()}
                disabled={committing || hasBlockingErrors}
              >
                {committing ? "Committing..." : "Commit Import"}
              </button>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => void handleDownloadErrors()}
                disabled={preview.summary.errorCount === 0}
              >
                Download Error File
              </button>
            </div>
            {hasBlockingErrors ? (
              <p className="portal-import-inline-note">
                Commit is disabled while blocking errors exist. Fix the rows listed below, or use the generated missing-schools template first.
              </p>
            ) : null}
            {commitSummary ? (
              <p className="portal-import-inline-note">
                Commit summary: {commitSummary.createdCount} created, {commitSummary.updatedCount} updated, {commitSummary.skippedCount} skipped, {commitSummary.errorCount} errors.
              </p>
            ) : null}
          </section>

          <section className="portal-import-card">
            <div className="portal-import-table-wrap">
              <table className="portal-import-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Record</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td>
                        <div className="portal-import-record-cell">
                          <strong>{rowPrimaryLabel(importType, row)}</strong>
                          <span>{rowSecondaryLabel(importType, row) || "No secondary context"}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`portal-import-pill portal-import-pill--${row.action.toLowerCase()}`}>
                          {row.action}
                        </span>
                      </td>
                      <td>{row.status}</td>
                      <td>
                        {row.errorMessage || row.warningMessage ? (
                          <div className="portal-import-record-cell">
                            {row.errorMessage ? <strong>{row.errorMessage}</strong> : null}
                            {row.warningMessage ? <span>{row.warningMessage}</span> : null}
                            {row.suggestedFix ? <span>{row.suggestedFix}</span> : null}
                          </div>
                        ) : (
                          <span className="portal-import-muted">Ready to commit.</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <style jsx>{`
        .portal-import-page {
          display: grid;
          gap: 1rem;
        }
        .portal-import-card {
          border: 1px solid rgba(78, 108, 136, 0.22);
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(244, 247, 250, 0.94));
          box-shadow: 0 22px 52px rgba(23, 39, 65, 0.08);
          padding: 1.2rem;
        }
        .portal-import-hero {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
        }
        .portal-import-eyebrow {
          margin: 0 0 0.2rem;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #5c6b7d;
        }
        .portal-import-hero h2 {
          margin: 0;
          font-size: 1.9rem;
          line-height: 1.1;
        }
        .portal-import-hero p {
          margin: 0.45rem 0 0;
          color: #516173;
          max-width: 60rem;
        }
        .portal-import-context {
          color: #0f5fc5;
          font-weight: 700;
        }
        .portal-import-dropzone {
          border: 1px dashed rgba(15, 95, 197, 0.3);
          border-radius: 18px;
          padding: 1.5rem;
          background:
            radial-gradient(circle at top left, rgba(15, 95, 197, 0.08), transparent 34%),
            rgba(248, 250, 252, 0.96);
          transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .portal-import-dropzone.is-dragging {
          border-color: rgba(15, 95, 197, 0.75);
          box-shadow: 0 16px 36px rgba(15, 95, 197, 0.18);
          transform: translateY(-1px);
        }
        .portal-import-dropzone-title {
          margin: 0;
          font-size: 1.08rem;
          font-weight: 700;
          color: #0f172a;
        }
        .portal-import-dropzone-copy,
        .portal-import-file-name,
        .portal-import-inline-note,
        .portal-import-muted {
          margin: 0.45rem 0 0;
          color: #607080;
        }
        .portal-import-feedback {
          margin-top: 1rem;
          padding: 0.9rem 1rem;
          border-radius: 14px;
          font-weight: 600;
        }
        .portal-import-feedback--error,
        .portal-import-warning {
          background: rgba(255, 244, 230, 0.96);
          border-color: rgba(214, 143, 36, 0.28);
        }
        .portal-import-feedback--success {
          background: rgba(234, 247, 238, 0.96);
          border-color: rgba(26, 127, 55, 0.22);
        }
        .portal-import-warning h3 {
          margin: 0;
          font-size: 1.08rem;
        }
        .portal-import-warning p {
          margin: 0.5rem 0 0;
          color: #5d4a1a;
        }
        .portal-import-missing-list {
          margin: 1rem 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.65rem;
        }
        .portal-import-missing-list li {
          padding: 0.8rem 0.9rem;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(214, 143, 36, 0.18);
          display: grid;
          gap: 0.2rem;
        }
        .portal-import-missing-list span {
          color: #7a6328;
          font-size: 0.95rem;
        }
        .portal-import-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.8rem;
        }
        .portal-import-stat {
          border-radius: 16px;
          padding: 0.9rem 1rem;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(78, 108, 136, 0.15);
          display: grid;
          gap: 0.3rem;
        }
        .portal-import-stat span {
          color: #607080;
          font-size: 0.9rem;
        }
        .portal-import-stat strong {
          font-size: 1.4rem;
          color: #0f172a;
        }
        .portal-import-table-wrap {
          overflow-x: auto;
        }
        .portal-import-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 840px;
        }
        .portal-import-table th,
        .portal-import-table td {
          text-align: left;
          padding: 0.8rem 0.9rem;
          border-bottom: 1px solid rgba(203, 213, 225, 0.9);
          vertical-align: top;
        }
        .portal-import-table th {
          font-size: 0.92rem;
          color: #475569;
          background: rgba(248, 250, 252, 0.94);
        }
        .portal-import-record-cell {
          display: grid;
          gap: 0.2rem;
        }
        .portal-import-record-cell strong {
          color: #0f172a;
        }
        .portal-import-record-cell span {
          color: #64748b;
          font-size: 0.92rem;
        }
        .portal-import-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 78px;
          padding: 0.28rem 0.65rem;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .portal-import-pill--create {
          background: rgba(14, 165, 233, 0.14);
          color: #0369a1;
        }
        .portal-import-pill--update {
          background: rgba(34, 197, 94, 0.12);
          color: #166534;
        }
        .portal-import-pill--skip {
          background: rgba(148, 163, 184, 0.18);
          color: #475569;
        }
        .portal-import-pill--error {
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
        }
        @media (max-width: 900px) {
          .portal-import-hero {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
