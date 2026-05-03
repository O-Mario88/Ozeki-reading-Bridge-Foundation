import { queryPostgres } from "@/lib/server/postgres/client";
import type { AuditLogEntry } from "@/lib/types";

export async function logAuditEventPostgres(
  userId: number,
  userName: string,
  action: string,
  targetTable: string,
  targetId: number | string | null = null,
  payloadBefore: string | null = null,
  payloadAfter: string | null = null,
  detail: string | null = null,
  ipAddress: string | null = null,
): Promise<AuditLogEntry> {
  const timestamp = new Date().toISOString();

  await queryPostgres(
    `
      INSERT INTO audit_logs (
        user_id,
        user_name,
        action,
        target_table,
        target_id,
        payload_before,
        payload_after,
        detail,
        ip_address,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz)
    `,
    [
      userId,
      userName,
      action,
      targetTable,
      targetId === null ? null : String(targetId),
      payloadBefore,
      payloadAfter,
      detail,
      ipAddress,
      timestamp,
    ],
  );

  return {
    id: 0,
    userId,
    userName,
    action,
    targetTable,
    targetId,
    payloadBefore,
    payloadAfter,
    detail,
    ipAddress,
    timestamp,
  };
}

export async function listAuditLogsPostgres(options?: {
  userId?: number;
  targetTable?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const conditions: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  if (options?.userId) {
    params.push(options.userId);
    conditions.push(`user_id = $${params.length}`);
  }
  if (options?.targetTable) {
    params.push(options.targetTable);
    conditions.push(`target_table = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(options?.limit ?? 100, 500);

  const result = await queryPostgres(
    `SELECT id, user_id AS "userId", user_name AS "userName", action, target_table AS "targetTable",
            target_id AS "targetId", detail, ip_address AS "ipAddress", timestamp
     FROM audit_logs ${where}
     ORDER BY timestamp DESC
     LIMIT ${limit}`,
    params,
  );

  return result.rows as unknown as AuditLogEntry[];
}

export interface AuditTrailFilter {
  userId?: number;
  action?: string;
  targetTable?: string;
  targetId?: string;
  dateFrom?: string; // ISO date
  dateTo?: string;   // ISO date
  search?: string;   // substring against user_name / detail
  limit?: number;
  offset?: number;
}

export interface AuditTrailRow extends AuditLogEntry {
  payloadBefore: string | null;
  payloadAfter: string | null;
}

export interface AuditTrailPage {
  rows: AuditTrailRow[];
  total: number;
  limit: number;
  offset: number;
  facets: {
    actions: Array<{ action: string; count: number }>;
    targetTables: Array<{ targetTable: string; count: number }>;
    actors: Array<{ userId: number; userName: string; count: number }>;
  };
}

export async function listAuditTrailPostgres(filter: AuditTrailFilter = {}): Promise<AuditTrailPage> {
  const conditions: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  if (filter.userId) {
    params.push(filter.userId);
    conditions.push(`user_id = $${params.length}`);
  }
  if (filter.action) {
    params.push(filter.action);
    conditions.push(`action = $${params.length}`);
  }
  if (filter.targetTable) {
    params.push(filter.targetTable);
    conditions.push(`target_table = $${params.length}`);
  }
  if (filter.targetId) {
    params.push(filter.targetId);
    conditions.push(`target_id = $${params.length}`);
  }
  if (filter.dateFrom) {
    params.push(filter.dateFrom);
    conditions.push(`timestamp >= $${params.length}::timestamptz`);
  }
  if (filter.dateTo) {
    params.push(filter.dateTo);
    conditions.push(`timestamp < $${params.length}::timestamptz`);
  }
  if (filter.search && filter.search.trim()) {
    params.push(`%${filter.search.trim().toLowerCase()}%`);
    conditions.push(
      `(LOWER(user_name) LIKE $${params.length} OR LOWER(COALESCE(detail, '')) LIKE $${params.length})`,
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  const offset = Math.max(filter.offset ?? 0, 0);

  const rowsParams = [...params, limit, offset];

  const [rowsResult, totalResult, actionFacet, tableFacet, actorFacet] = await Promise.all([
    queryPostgres(
      `SELECT id,
              user_id     AS "userId",
              user_name   AS "userName",
              action,
              target_table AS "targetTable",
              target_id    AS "targetId",
              payload_before AS "payloadBefore",
              payload_after  AS "payloadAfter",
              detail,
              ip_address   AS "ipAddress",
              timestamp
         FROM audit_logs
         ${where}
         ORDER BY timestamp DESC
         LIMIT $${rowsParams.length - 1} OFFSET $${rowsParams.length}`,
      rowsParams,
    ),
    queryPostgres(`SELECT COUNT(*)::int AS total FROM audit_logs ${where}`, params),
    queryPostgres(
      `SELECT action, COUNT(*)::int AS count
         FROM audit_logs ${where}
         GROUP BY action
         ORDER BY count DESC
         LIMIT 50`,
      params,
    ),
    queryPostgres(
      `SELECT target_table AS "targetTable", COUNT(*)::int AS count
         FROM audit_logs ${where}
         GROUP BY target_table
         ORDER BY count DESC
         LIMIT 50`,
      params,
    ),
    queryPostgres(
      `SELECT user_id AS "userId", user_name AS "userName", COUNT(*)::int AS count
         FROM audit_logs ${where}
         GROUP BY user_id, user_name
         ORDER BY count DESC
         LIMIT 50`,
      params,
    ),
  ]);

  return {
    rows: rowsResult.rows as unknown as AuditTrailRow[],
    total: (totalResult.rows[0] as { total: number } | undefined)?.total ?? 0,
    limit,
    offset,
    facets: {
      actions: actionFacet.rows as unknown as Array<{ action: string; count: number }>,
      targetTables: tableFacet.rows as unknown as Array<{ targetTable: string; count: number }>,
      actors: actorFacet.rows as unknown as Array<{ userId: number; userName: string; count: number }>,
    },
  };
}
