import type { PoolClient } from "pg";
import {
  PREVIEW_ROW_LIMIT,
  type ImportPreviewResult,
  type ImportPreviewRow,
  type ImportPreviewSummary,
  type ImportType,
} from "@/lib/server/imports/constants";
import type { PortalUser } from "@/lib/types";

export function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeText(value: string | null | undefined) {
  return collapseWhitespace(String(value ?? "")).toLowerCase();
}

export function normalizePhone(value: string | null | undefined): string | null {
  const digits = String(value ?? "").replace(/[^0-9]+/g, "");
  return digits ? `+${digits}` : null;
}

export function isTruthyLike(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y" || normalized === "on";
}

export function isFalsyLike(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized === "0" || normalized === "false" || normalized === "no" || normalized === "n" || normalized === "off";
}

export function normalizeBooleanString(value: string | null | undefined) {
  if (isTruthyLike(value)) {
    return true;
  }
  if (isFalsyLike(value)) {
    return false;
  }
  return null;
}

export function normalizeOptionalDate(value: string | null | undefined) {
  const normalized = collapseWhitespace(String(value ?? ""));
  if (!normalized) {
    return null;
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

export function normalizeRequiredDate(value: string | null | undefined) {
  const parsed = normalizeOptionalDate(value);
  if (!parsed) {
    throw new Error("Enter a valid date.");
  }
  return parsed;
}

export function normalizeOptionalNumber(value: string | null | undefined) {
  const normalized = collapseWhitespace(String(value ?? ""));
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeOptionalInteger(value: string | null | undefined) {
  const parsed = normalizeOptionalNumber(value);
  return parsed === null ? null : Number.isInteger(parsed) ? parsed : null;
}

/**
 * Canonicalize a single header string so that common user variations all
 * map to the official snake_case column name.
 *
 * "School Name" → "school_name"
 * "SCHOOL_NAME" → "school_name"
 * "school-name" → "school_name"
 */
export function canonicalizeHeader(value: string): string {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_")       // spaces / hyphens → underscore
    .replace(/[^a-z0-9_]/g, "")     // strip anything else
    .replace(/_+/g, "_")            // collapse duplicate underscores
    .replace(/^_|_$/g, "");         // trim leading/trailing underscores
}

export function normalizeHeaderCells(row: unknown[]) {
  return row.map((value) => canonicalizeHeader(String(value ?? "")));
}

export function buildCsv(rows: Array<Record<string, unknown>>, orderedHeaders: string[]) {
  const escapeCell = (value: unknown) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const body = rows.map((row) => orderedHeaders.map((header) => escapeCell(row[header])).join(","));
  return [orderedHeaders.join(","), ...body].join("\n");
}

export function summarizePreviewRows(rows: ImportPreviewRow[]): ImportPreviewSummary {
  return rows.reduce<ImportPreviewSummary>(
    (summary, row) => {
      summary.totalRows += 1;
      if (row.status !== "ERROR") {
        summary.validRows += 1;
      }
      if (row.action === "CREATE") {
        summary.createCount += 1;
      } else if (row.action === "UPDATE") {
        summary.updateCount += 1;
      } else if (row.action === "SKIP") {
        summary.skippedCount += 1;
      } else if (row.action === "ERROR") {
        summary.errorCount += 1;
      }
      return summary;
    },
    {
      totalRows: 0,
      validRows: 0,
      createCount: 0,
      updateCount: 0,
      skippedCount: 0,
      errorCount: 0,
    },
  );
}

export function previewResultFromRows(args: {
  importJobId: number;
  importType: ImportType;
  fileName: string;
  fileFormat: "csv" | "xlsx";
  rows: ImportPreviewRow[];
  missingSchools?: ImportPreviewResult["missingSchools"];
  affectedRowsCount?: number;
}): ImportPreviewResult {
  return {
    importJobId: args.importJobId,
    importType: args.importType,
    fileName: args.fileName,
    fileFormat: args.fileFormat,
    summary: summarizePreviewRows(args.rows),
    rows: args.rows.slice(0, PREVIEW_ROW_LIMIT),
    missingSchools: args.missingSchools ?? [],
    missingSchoolsCount: args.missingSchools?.length ?? 0,
    affectedRowsCount: args.affectedRowsCount ?? 0,
  };
}

export function assertImportRole(user: PortalUser, importType: ImportType) {
  if (user.isSuperAdmin || user.isAdmin || user.isSupervisor || user.isME) {
    return;
  }

  const allowedRoles =
    importType === "schools"
      ? new Set<PortalUser["role"]>(["Staff", "DataClerk", "Admin"])
      : new Set<PortalUser["role"]>(["Staff", "DataClerk", "Admin", "Coach", "SchoolLeader"]);

  if (!allowedRoles.has(user.role)) {
    throw new Error("You do not have permission to run this import.");
  }
}

export function assertImportScope(user: PortalUser, scope: { country?: string | null; region?: string | null; district?: string | null }) {
  if (user.isSuperAdmin || user.isAdmin || user.isSupervisor || user.isME) {
    return;
  }
  const geographyScope = String(user.geographyScope ?? "").trim();
  if (!geographyScope) {
    return;
  }
  const [scopeType, scopeValueRaw] = geographyScope.split(":");
  const scopeValue = normalizeText(scopeValueRaw);
  if (!scopeType || !scopeValue) {
    return;
  }
  if (scopeType === "district" && scopeValue !== normalizeText(scope.district)) {
    throw new Error("This row falls outside your district scope.");
  }
  if (scopeType === "region" && scopeValue !== normalizeText(scope.region)) {
    throw new Error("This row falls outside your region scope.");
  }
  if (scopeType === "country" && scopeValue !== normalizeText(scope.country)) {
    throw new Error("This row falls outside your country scope.");
  }
}

export async function logAuditImportEvent(client: PoolClient, args: {
  userId: number;
  userName: string;
  action: string;
  targetId: string | number;
  detail: string;
  payloadAfter?: Record<string, unknown> | null;
}) {
  await client.query(
    `
      INSERT INTO audit_logs (
        user_id,
        user_name,
        action,
        target_table,
        target_id,
        payload_after,
        detail
      ) VALUES (
        $1, $2, $3, 'import_jobs', $4, $5, $6
      )
    `,
    [
      args.userId,
      args.userName,
      args.action,
      String(args.targetId),
      args.payloadAfter ? JSON.stringify(args.payloadAfter) : null,
      args.detail,
    ],
  );
}
