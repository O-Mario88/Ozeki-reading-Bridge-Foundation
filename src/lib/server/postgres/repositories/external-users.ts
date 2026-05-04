import crypto from "node:crypto";
import { queryPostgres } from "@/lib/server/postgres/client";

export type ExternalUserRole =
  | "donor"
  | "parent"
  | "teacher"
  | "partner"
  | "district_officer";

export type ExternalUserStatus = "active" | "pending" | "deactivated";

export type ExternalUserRow = {
  id: number;
  refCode: string;
  role: ExternalUserRole;
  fullName: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  district: string | null;
  status: ExternalUserStatus;
  preferencesJson: Record<string, unknown> | null;
  notes: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const SELECT_COLUMNS = `
  id,
  ref_code AS "refCode",
  role,
  full_name AS "fullName",
  email,
  phone,
  organization,
  district,
  status,
  preferences_json AS "preferencesJson",
  notes,
  last_login_at AS "lastLoginAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

function generateRefCode(): string {
  // 12-char URL-safe code; collision-resistant enough for this scale.
  return crypto.randomBytes(9).toString("base64url");
}

export async function findExternalUserByEmailAndRolePostgres(
  email: string,
  role: ExternalUserRole,
): Promise<ExternalUserRow | null> {
  const result = await queryPostgres(
    `SELECT ${SELECT_COLUMNS} FROM external_users
     WHERE lower(email) = lower($1) AND role = $2 LIMIT 1`,
    [email, role],
  );
  return (result.rows[0] as ExternalUserRow | undefined) ?? null;
}

export async function findExternalUserByRefCodePostgres(
  refCode: string,
): Promise<ExternalUserRow | null> {
  const result = await queryPostgres(
    `SELECT ${SELECT_COLUMNS} FROM external_users WHERE ref_code = $1 LIMIT 1`,
    [refCode],
  );
  return (result.rows[0] as ExternalUserRow | undefined) ?? null;
}

export async function findExternalUserByIdPostgres(
  id: number,
): Promise<ExternalUserRow | null> {
  const result = await queryPostgres(
    `SELECT ${SELECT_COLUMNS} FROM external_users WHERE id = $1 LIMIT 1`,
    [id],
  );
  return (result.rows[0] as ExternalUserRow | undefined) ?? null;
}

export async function upsertExternalUserPostgres(input: {
  role: ExternalUserRole;
  email: string;
  fullName: string;
  organization?: string | null;
  district?: string | null;
  phone?: string | null;
}): Promise<ExternalUserRow> {
  const existing = await findExternalUserByEmailAndRolePostgres(input.email, input.role);
  if (existing) {
    if (existing.fullName !== input.fullName || existing.organization !== (input.organization ?? null)) {
      await queryPostgres(
        `UPDATE external_users
         SET full_name = $2, organization = COALESCE($3, organization),
             district = COALESCE($4, district), phone = COALESCE($5, phone),
             updated_at = NOW()
         WHERE id = $1`,
        [existing.id, input.fullName, input.organization ?? null, input.district ?? null, input.phone ?? null],
      );
    }
    return (await findExternalUserByIdPostgres(existing.id))!;
  }
  const refCode = generateRefCode();
  const result = await queryPostgres(
    `INSERT INTO external_users (
      ref_code, role, full_name, email, phone, organization, district, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING ${SELECT_COLUMNS}`,
    [
      refCode,
      input.role,
      input.fullName,
      input.email.toLowerCase(),
      input.phone ?? null,
      input.organization ?? null,
      input.district ?? null,
    ],
  );
  return result.rows[0] as ExternalUserRow;
}

export async function activateExternalUserPostgres(id: number): Promise<void> {
  await queryPostgres(
    `UPDATE external_users SET status = 'active', last_login_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status != 'deactivated'`,
    [id],
  );
}

export async function listExternalUsersByRolePostgres(
  role: ExternalUserRole,
  limit = 100,
): Promise<ExternalUserRow[]> {
  const result = await queryPostgres(
    `SELECT ${SELECT_COLUMNS} FROM external_users
     WHERE role = $1 ORDER BY created_at DESC LIMIT $2`,
    [role, Math.min(Math.max(limit, 1), 500)],
  );
  return result.rows as ExternalUserRow[];
}
