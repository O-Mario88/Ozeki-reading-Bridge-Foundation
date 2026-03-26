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
