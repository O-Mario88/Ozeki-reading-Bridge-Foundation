import type { PortalUserRole } from "@/lib/types";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";

export type PortalUserAuthRow = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: PortalUserRole;
  geographyScope: string | null;
  isSupervisor: number;
  isME: number;
  isAdmin: number;
  isSuperAdmin: number;
  passwordHash: string;
};

export type PortalUserSessionRow = Omit<PortalUserAuthRow, "passwordHash">;

export type PrivilegedPortalAccountSeed = {
  fullName: string;
  email: string;
  phone: string | null;
  role: PortalUserRole;
  passwordHash: string;
  isSupervisor: number;
  isME: number;
  isAdmin: number;
  isSuperAdmin: number;
};

function mapPortalUserAuthRow(row: Record<string, unknown>): PortalUserAuthRow {
  return {
    id: Number(row.id),
    fullName: String(row.fullName ?? ""),
    email: String(row.email ?? ""),
    phone: row.phone ? String(row.phone) : null,
    role: String(row.role ?? "Volunteer") as PortalUserRole,
    geographyScope: row.geographyScope ? String(row.geographyScope) : null,
    isSupervisor: Number(row.isSupervisor ? 1 : 0),
    isME: Number(row.isME ? 1 : 0),
    isAdmin: Number(row.isAdmin ? 1 : 0),
    isSuperAdmin: Number(row.isSuperAdmin ? 1 : 0),
    passwordHash: String(row.passwordHash ?? ""),
  };
}

function mapPortalUserSessionRow(row: Record<string, unknown>): PortalUserSessionRow {
  const auth = mapPortalUserAuthRow({ ...row, passwordHash: row.passwordHash ?? "" });
  const { passwordHash: _passwordHash, ...sessionRow } = auth;
  return sessionRow;
}

export async function syncPrivilegedPortalUsersPostgres(
  accounts: PrivilegedPortalAccountSeed[],
  disabledLegacyPasswordHash: string,
) {
  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      for (const account of accounts) {
        await client.query(
          `
            INSERT INTO portal_users (
              full_name,
              email,
              role,
              password_hash,
              phone,
              is_supervisor,
              is_me,
              is_admin,
              is_superadmin
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (email) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              role = EXCLUDED.role,
              password_hash = EXCLUDED.password_hash,
              phone = EXCLUDED.phone,
              is_supervisor = EXCLUDED.is_supervisor,
              is_me = EXCLUDED.is_me,
              is_admin = EXCLUDED.is_admin,
              is_superadmin = EXCLUDED.is_superadmin
          `,
          [
            account.fullName,
            account.email,
            account.role,
            account.passwordHash,
            account.phone,
            Boolean(account.isSupervisor),
            Boolean(account.isME),
            Boolean(account.isAdmin),
            Boolean(account.isSuperAdmin),
          ],
        );
      }

      await client.query(
        `
          UPDATE portal_users
          SET
            role = 'Volunteer',
            is_supervisor = FALSE,
            is_me = FALSE,
            is_admin = FALSE,
            is_superadmin = FALSE,
            password_hash = $2
          WHERE lower(email) = $1
        `,
        ["admin@ozekireadingbridge.org", disabledLegacyPasswordHash],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function findPortalUserAuthByIdentifierPostgres(identifier: string) {
  const normalizedIdentifier = identifier.trim();
  const normalizedEmail = normalizedIdentifier.toLowerCase();
  const result = await queryPostgres(
    `
      SELECT
        id,
        full_name AS "fullName",
        email,
        phone,
        role,
        geography_scope AS "geographyScope",
        is_supervisor AS "isSupervisor",
        is_me AS "isME",
        is_admin AS "isAdmin",
        is_superadmin AS "isSuperAdmin",
        password_hash AS "passwordHash"
      FROM portal_users
      WHERE lower(email) = $1 OR phone = $2
      LIMIT 1
    `,
    [normalizedEmail, normalizedIdentifier],
  );
  return result.rows[0] ? mapPortalUserAuthRow(result.rows[0]) : null;
}

export async function authenticatePortalUserPostgres(identifier: string, passwordHash: string) {
  const auth = await findPortalUserAuthByIdentifierPostgres(identifier);
  if (!auth || auth.passwordHash !== passwordHash) {
    return null;
  }
  const { passwordHash: _, ...user } = auth;
  return user;
}

export async function createPortalSessionPostgres(userId: number, token: string, expiresAt: string) {
  await insertPortalSessionPostgres(userId, token, expiresAt);
}

export async function findPortalUserAuthByIdPostgres(userId: number) {
  const result = await queryPostgres(
    `
      SELECT
        id,
        full_name AS "fullName",
        email,
        phone,
        role,
        geography_scope AS "geographyScope",
        is_supervisor AS "isSupervisor",
        is_me AS "isME",
        is_admin AS "isAdmin",
        is_superadmin AS "isSuperAdmin",
        password_hash AS "passwordHash"
      FROM portal_users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );
  return result.rows[0] ? mapPortalUserAuthRow(result.rows[0]) : null;
}

export async function findPortalUserByEmailPostgres(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await queryPostgres(
    `
      SELECT
        id,
        full_name AS "fullName",
        email,
        phone,
        role,
        geography_scope AS "geographyScope",
        is_supervisor AS "isSupervisor",
        is_me AS "isME",
        is_admin AS "isAdmin",
        is_superadmin AS "isSuperAdmin"
      FROM portal_users
      WHERE lower(email) = $1
      LIMIT 1
    `,
    [normalizedEmail],
  );
  return result.rows[0] ? mapPortalUserSessionRow(result.rows[0]) : null;
}

export async function insertPortalSessionPostgres(userId: number, token: string, expiresAt: string) {
  await queryPostgres(
    `
      INSERT INTO portal_sessions (user_id, token, expires_at)
      VALUES ($1, $2, $3::timestamptz)
      ON CONFLICT (token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        expires_at = EXCLUDED.expires_at
    `,
    [userId, token, expiresAt],
  );
}

export async function deleteExpiredPortalSessionsPostgres() {
  await queryPostgres("DELETE FROM portal_sessions WHERE expires_at <= NOW()");
}

export async function findPortalUserBySessionTokenPostgres(token: string) {
  const result = await queryPostgres(
    `
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        u.phone,
        u.role,
        u.geography_scope AS "geographyScope",
        u.is_supervisor AS "isSupervisor",
        u.is_me AS "isME",
        u.is_admin AS "isAdmin",
        u.is_superadmin AS "isSuperAdmin"
      FROM portal_sessions s
      JOIN portal_users u ON u.id = s.user_id
      WHERE s.token = $1
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [token],
  );
  return result.rows[0] ? mapPortalUserSessionRow(result.rows[0]) : null;
}

export async function deletePortalSessionPostgres(token: string) {
  await queryPostgres("DELETE FROM portal_sessions WHERE token = $1", [token]);
}
