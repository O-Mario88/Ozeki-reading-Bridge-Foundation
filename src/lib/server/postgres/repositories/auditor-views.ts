import { queryPostgres } from "@/lib/server/postgres/client";

export type AuditLogEntry = {
  id: number;
  userId: number | null;
  userName: string;
  action: string;
  targetTable: string | null;
  targetId: string | null;
  detail: string | null;
  ipAddress: string | null;
  timestamp: string;
};

export type AuditLogFilters = {
  action?: string;
  targetTable?: string;
  userQuery?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
};

export async function listAuditLogsForAuditor(
  filters: AuditLogFilters = {},
): Promise<AuditLogEntry[]> {
  const params: unknown[] = [];
  let where = "WHERE 1=1";

  if (filters.action) {
    params.push(filters.action);
    where += ` AND action = $${params.length}`;
  }
  if (filters.targetTable) {
    params.push(filters.targetTable);
    where += ` AND target_table = $${params.length}`;
  }
  if (filters.userQuery) {
    params.push(`%${filters.userQuery}%`);
    where += ` AND user_name ILIKE $${params.length}`;
  }
  if (filters.fromDate) {
    params.push(filters.fromDate);
    where += ` AND timestamp >= $${params.length}`;
  }
  if (filters.toDate) {
    params.push(filters.toDate);
    where += ` AND timestamp < $${params.length}`;
  }

  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);
  params.push(limit);

  const result = await queryPostgres(
    `
    SELECT
      id,
      user_id AS "userId",
      user_name AS "userName",
      action,
      target_table AS "targetTable",
      target_id AS "targetId",
      detail,
      ip_address AS "ipAddress",
      timestamp
    FROM audit_logs
    ${where}
    ORDER BY timestamp DESC, id DESC
    LIMIT $${params.length}
    `,
    params,
  );
  return result.rows as AuditLogEntry[];
}

export type RoleAssignmentRow = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSupervisor: boolean;
  isME: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export async function listRoleAssignmentsForAuditor(): Promise<RoleAssignmentRow[]> {
  const result = await queryPostgres(
    `
    SELECT
      id,
      full_name AS "fullName",
      email,
      role,
      status,
      is_admin AS "isAdmin",
      is_superadmin AS "isSuperAdmin",
      is_supervisor AS "isSupervisor",
      is_me AS "isME",
      expires_at AS "expiresAt",
      created_at AS "createdAt"
    FROM portal_users
    ORDER BY
      CASE WHEN is_superadmin THEN 0
           WHEN is_admin THEN 1
           WHEN is_me THEN 2
           WHEN is_supervisor THEN 3
           ELSE 4 END,
      lower(full_name)
    `,
  );
  return result.rows as RoleAssignmentRow[];
}

export type IntegrityBadge = {
  totalCoachingVisits: number;
  visitsWithGpsPhotos: number;
  totalTrainingRecords: number;
  trainingsWithPhotos: number;
  totalEvidencePhotos: number;
  evidencePhotosWithGps: number;
  uniquePhotoHashes: number;
  totalAuditLogEntries: number;
  auditLogLast7d: number;
  totalActiveUsers: number;
  totalAuditors: number;
  oldestAuditEntry: string | null;
  latestAuditEntry: string | null;
};

export async function getIntegrityBadgeForAuditor(): Promise<IntegrityBadge> {
  const [
    visitsAgg,
    visitsWithPhotosAgg,
    trainingsAgg,
    trainingsWithPhotosAgg,
    photosAgg,
    auditLogsAgg,
    usersAgg,
  ] = await Promise.all([
    queryPostgres(`SELECT COUNT(*)::int AS n FROM coaching_visits`),
    queryPostgres(`
      SELECT COUNT(DISTINCT parent_id)::int AS n
      FROM evidence_photos
      WHERE parent_type = 'coaching_visit'
    `),
    queryPostgres(`
      SELECT COUNT(*)::int AS n FROM (
        SELECT id FROM training_sessions
        UNION ALL
        SELECT id FROM portal_records WHERE module = 'training'
      ) t
    `).catch(() => ({ rows: [{ n: 0 }] })),
    queryPostgres(`
      SELECT COUNT(DISTINCT parent_id)::int AS n
      FROM evidence_photos
      WHERE parent_type IN ('training_session', 'training_record')
    `),
    queryPostgres(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL)::int AS with_gps,
        COUNT(DISTINCT photo_hash_sha256)::int AS unique_hashes
      FROM evidence_photos
    `).catch(() => ({ rows: [{ total: 0, with_gps: 0, unique_hashes: 0 }] })),
    queryPostgres(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days')::int AS last_7d,
        MIN(timestamp) AS oldest,
        MAX(timestamp) AS latest
      FROM audit_logs
    `),
    queryPostgres(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE role = 'Auditor' AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))::int AS auditors
      FROM portal_users
    `),
  ]);

  return {
    totalCoachingVisits: Number(visitsAgg.rows[0]?.n ?? 0),
    visitsWithGpsPhotos: Number(visitsWithPhotosAgg.rows[0]?.n ?? 0),
    totalTrainingRecords: Number(trainingsAgg.rows[0]?.n ?? 0),
    trainingsWithPhotos: Number(trainingsWithPhotosAgg.rows[0]?.n ?? 0),
    totalEvidencePhotos: Number(photosAgg.rows[0]?.total ?? 0),
    evidencePhotosWithGps: Number(photosAgg.rows[0]?.with_gps ?? 0),
    uniquePhotoHashes: Number(photosAgg.rows[0]?.unique_hashes ?? 0),
    totalAuditLogEntries: Number(auditLogsAgg.rows[0]?.total ?? 0),
    auditLogLast7d: Number(auditLogsAgg.rows[0]?.last_7d ?? 0),
    totalActiveUsers: Number(usersAgg.rows[0]?.active ?? 0),
    totalAuditors: Number(usersAgg.rows[0]?.auditors ?? 0),
    oldestAuditEntry: auditLogsAgg.rows[0]?.oldest ? String(auditLogsAgg.rows[0].oldest) : null,
    latestAuditEntry: auditLogsAgg.rows[0]?.latest ? String(auditLogsAgg.rows[0].latest) : null,
  };
}

const FINANCE_TABLES = [
  "finance_donations",
  "finance_expenses",
  "finance_receipts",
  "finance_audited_statements",
  "finance_approvals",
  "finance_audit_chain",
  "finance_audit_trail",
  "audited_financial_statements",
  "system_settings",
];

export async function listFinancePostingLogForAuditor(limit = 200): Promise<AuditLogEntry[]> {
  const result = await queryPostgres(
    `
    SELECT
      id,
      user_id AS "userId",
      user_name AS "userName",
      action,
      target_table AS "targetTable",
      target_id AS "targetId",
      detail,
      ip_address AS "ipAddress",
      timestamp
    FROM audit_logs
    WHERE target_table = ANY($1::text[])
    ORDER BY timestamp DESC, id DESC
    LIMIT $2
    `,
    [FINANCE_TABLES, Math.min(Math.max(limit, 1), 500)],
  );
  return result.rows as AuditLogEntry[];
}
