import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import type {
  ImportFileFormat,
  ImportPreviewRow,
  ImportRowStatus,
  ImportType,
} from "@/lib/server/imports/constants";
import { buildCsv, logAuditImportEvent, previewResultFromRows, summarizePreviewRows } from "@/lib/server/imports/utils";
import type { PortalUser } from "@/lib/types";

function rowStatusFromAction(action: ImportPreviewRow["action"]): ImportRowStatus {
  if (action === "ERROR") {
    return "ERROR";
  }
  if (action === "SKIP") {
    return "SKIPPED";
  }
  return "READY";
}

export async function createValidatedImportJob(args: {
  importType: ImportType;
  fileName: string;
  fileFormat: ImportFileFormat;
  actor: PortalUser;
  rows: ImportPreviewRow[];
  sourceTrainingRecordId?: number | null;
}) {
  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const summary = summarizePreviewRows(args.rows);
      const jobInsert = await client.query<{ id: number }>(
        `
          INSERT INTO import_jobs (
            import_type,
            file_name,
            file_format,
            uploaded_by_user_id,
            validated_by_user_id,
            source_training_record_id,
            status,
            total_rows,
            valid_rows,
            created_count,
            updated_count,
            skipped_count,
            error_count,
            started_at,
            validated_at,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $4, $5, 'validated', $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW(), NOW()
          )
          RETURNING id
        `,
        [
          args.importType,
          args.fileName,
          args.fileFormat,
          args.actor.id,
          args.sourceTrainingRecordId ?? null,
          summary.totalRows,
          summary.validRows,
          summary.createCount,
          summary.updateCount,
          summary.skippedCount,
          summary.errorCount,
        ],
      );
      const importJobId = Number(jobInsert.rows[0]?.id ?? 0);
      if (!importJobId) {
        throw new Error("Could not create import job.");
      }

      for (const row of args.rows) {
        await client.query(
          `
            INSERT INTO import_job_rows (
              import_job_id,
              row_number,
              raw_data_json,
              normalized_data_json,
              action,
              status,
              error_message,
              warning_message,
              suggested_fix,
              linked_school_id,
              linked_training_id,
              created_at,
              updated_at
            ) VALUES (
              $1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
            )
          `,
          [
            importJobId,
            row.rowNumber,
            JSON.stringify(row.rawData),
            row.normalizedData ? JSON.stringify(row.normalizedData) : null,
            row.action,
            rowStatusFromAction(row.action),
            row.errorMessage,
            row.warningMessage,
            row.suggestedFix,
            row.linkedSchoolId ?? null,
            row.linkedTrainingId ?? null,
          ],
        );
      }

      await logAuditImportEvent(client, {
        userId: args.actor.id,
        userName: args.actor.fullName,
        action: `import_validate_${args.importType}`,
        targetId: importJobId,
        detail: `Validated ${summary.totalRows} ${args.importType} import rows from ${args.fileName}.`,
        payloadAfter: {
          importType: args.importType,
          fileName: args.fileName,
          totalRows: summary.totalRows,
          validRows: summary.validRows,
          errorCount: summary.errorCount,
        },
      });

      await client.query("COMMIT");
      return previewResultFromRows({
        importJobId,
        importType: args.importType,
        fileName: args.fileName,
        fileFormat: args.fileFormat,
        rows: args.rows,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export interface PersistedImportJobRow {
  id: number;
  importJobId: number;
  rowNumber: number;
  rawData: Record<string, string>;
  normalizedData: Record<string, unknown> | null;
  action: ImportPreviewRow["action"];
  status: ImportRowStatus;
  errorMessage: string | null;
  warningMessage: string | null;
  suggestedFix: string | null;
  linkedSchoolId: number | null;
  linkedTrainingId: number | null;
  createdRecordId: string | null;
  updatedRecordId: string | null;
}

export interface PersistedImportJob {
  id: number;
  importType: ImportType;
  fileName: string;
  fileFormat: ImportFileFormat;
  sourceTrainingRecordId: number | null;
  status: string;
  rows: PersistedImportJobRow[];
}

export async function getImportJob(importJobId: number): Promise<PersistedImportJob | null> {
  const jobResult = await queryPostgres<{
    id: number;
    importType: ImportType;
    fileName: string;
    fileFormat: ImportFileFormat;
    sourceTrainingRecordId: number | null;
    status: string;
  }>(
    `
      SELECT
        id,
        import_type AS "importType",
        file_name AS "fileName",
        file_format AS "fileFormat",
        source_training_record_id AS "sourceTrainingRecordId",
        status
      FROM import_jobs
      WHERE id = $1
      LIMIT 1
    `,
    [importJobId],
  );
  const job = jobResult.rows[0];
  if (!job) {
    return null;
  }

  const rowResult = await queryPostgres<{
    id: number;
    importJobId: number;
    rowNumber: number;
    rawData: Record<string, string>;
    normalizedData: Record<string, unknown> | null;
    action: ImportPreviewRow["action"];
    status: ImportRowStatus;
    errorMessage: string | null;
    warningMessage: string | null;
    suggestedFix: string | null;
    linkedSchoolId: number | null;
    linkedTrainingId: number | null;
    createdRecordId: string | null;
    updatedRecordId: string | null;
  }>(
    `
      SELECT
        id,
        import_job_id AS "importJobId",
        row_number AS "rowNumber",
        raw_data_json AS "rawData",
        normalized_data_json AS "normalizedData",
        action,
        status,
        error_message AS "errorMessage",
        warning_message AS "warningMessage",
        suggested_fix AS "suggestedFix",
        linked_school_id AS "linkedSchoolId",
        linked_training_id AS "linkedTrainingId",
        created_record_id AS "createdRecordId",
        updated_record_id AS "updatedRecordId"
      FROM import_job_rows
      WHERE import_job_id = $1
      ORDER BY row_number ASC
    `,
    [importJobId],
  );

  return {
    ...job,
    rows: rowResult.rows,
  };
}

export async function updateImportJobRow(args: {
  importJobId: number;
  rowNumber: number;
  action: ImportPreviewRow["action"];
  status: ImportRowStatus;
  errorMessage?: string | null;
  warningMessage?: string | null;
  linkedSchoolId?: number | null;
  linkedTrainingId?: number | null;
  createdRecordId?: string | null;
  updatedRecordId?: string | null;
}) {
  await queryPostgres(
    `
      UPDATE import_job_rows
      SET
        action = $3,
        status = $4,
        error_message = $5,
        warning_message = $6,
        linked_school_id = $7,
        linked_training_id = $8,
        created_record_id = $9,
        updated_record_id = $10,
        updated_at = NOW()
      WHERE import_job_id = $1
        AND row_number = $2
    `,
    [
      args.importJobId,
      args.rowNumber,
      args.action,
      args.status,
      args.errorMessage ?? null,
      args.warningMessage ?? null,
      args.linkedSchoolId ?? null,
      args.linkedTrainingId ?? null,
      args.createdRecordId ?? null,
      args.updatedRecordId ?? null,
    ],
  );
}

export async function finalizeImportJob(args: {
  importJobId: number;
  actor: PortalUser;
}) {
  const rows = await queryPostgres<{
    action: ImportPreviewRow["action"];
    status: ImportRowStatus;
  }>(
    `SELECT action, status FROM import_job_rows WHERE import_job_id = $1`,
    [args.importJobId],
  );

  const summary = rows.rows.reduce(
    (accumulator, row) => {
      accumulator.totalRows += 1;
      if (row.status !== "ERROR") {
        accumulator.validRows += 1;
      }
      if (row.status === "CREATED") {
        accumulator.createdCount += 1;
      } else if (row.status === "UPDATED") {
        accumulator.updatedCount += 1;
      } else if (row.action === "SKIP" || row.status === "SKIPPED") {
        accumulator.skippedCount += 1;
      } else if (row.status === "ERROR") {
        accumulator.errorCount += 1;
      }
      return accumulator;
    },
    {
      totalRows: 0,
      validRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    },
  );

  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      const status = summary.errorCount > 0 ? "completed_with_errors" : "completed";
      await client.query(
        `
          UPDATE import_jobs
          SET
            committed_by_user_id = $2,
            status = $3,
            valid_rows = $4,
            created_count = $5,
            updated_count = $6,
            skipped_count = $7,
            error_count = $8,
            committed_at = NOW(),
            finished_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          args.importJobId,
          args.actor.id,
          status,
          summary.validRows,
          summary.createdCount,
          summary.updatedCount,
          summary.skippedCount,
          summary.errorCount,
        ],
      );
      await logAuditImportEvent(client, {
        userId: args.actor.id,
        userName: args.actor.fullName,
        action: "import_commit",
        targetId: args.importJobId,
        detail: `Committed import job ${args.importJobId}.`,
        payloadAfter: summary,
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

  return summary;
}

export async function markImportJobCommitting(importJobId: number, actor: PortalUser) {
  await queryPostgres(
    `
      UPDATE import_jobs
      SET
        status = 'committing',
        committed_by_user_id = $2,
        committed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
    [importJobId, actor.id],
  );
}

export async function getImportJobErrorCsv(importJobId: number) {
  const rows = await queryPostgres<{
    rowNumber: number;
    rawData: Record<string, string>;
    status: string;
    action: string;
    errorMessage: string | null;
    warningMessage: string | null;
    suggestedFix: string | null;
  }>(
    `
      SELECT
        row_number AS "rowNumber",
        raw_data_json AS "rawData",
        status,
        action,
        error_message AS "errorMessage",
        warning_message AS "warningMessage",
        suggested_fix AS "suggestedFix"
      FROM import_job_rows
      WHERE import_job_id = $1
        AND (status = 'ERROR' OR action = 'ERROR')
      ORDER BY row_number ASC
    `,
    [importJobId],
  );

  const flattened = rows.rows.map((row) => ({
    row_number: row.rowNumber,
    status: row.status,
    action: row.action,
    error_message: row.errorMessage ?? "",
    warning_message: row.warningMessage ?? "",
    suggested_fix: row.suggestedFix ?? "",
    ...row.rawData,
  }));
  const orderedHeaders = Array.from(
    new Set(flattened.flatMap((row) => Object.keys(row))),
  );
  return buildCsv(flattened, orderedHeaders);
}
