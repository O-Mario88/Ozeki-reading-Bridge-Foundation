import type { PortalUserRole, PortalUserStatus } from "@/lib/types";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import * as argon2 from "argon2";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

/** Detect whether a stored hash is Argon2id. */
function isArgon2Hash(hash: string): boolean {
  return hash.startsWith("$argon2id$");
}

/** Detect whether a stored hash is bcrypt ($2a$/$2b$ prefix, 60 chars). */
function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]?\$\d{2}\$.{53}$/.test(hash);
}

/** Hash a raw password with Argon2id. */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

/** Verify a raw password against a stored hash (Argon2id, bcrypt, or legacy SHA256). */
export async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  if (isArgon2Hash(storedHash)) {
    return argon2.verify(storedHash, plain);
  }
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(plain, storedHash);
  }
  // Legacy SHA256 fallback
  const sha256 = crypto.createHash("sha256").update(plain).digest("hex");
  return sha256 === storedHash;
}

export type PortalUserAuthRow = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: PortalUserRole;
  geographyScope: string | null;
  department: string | null;
  status: PortalUserStatus;
  mustChangePassword: boolean;
  isSupervisor: boolean;
  isME: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  passwordHash: string;
};

export type PortalUserSessionRow = Omit<PortalUserAuthRow, "passwordHash">;

export type PrivilegedPortalAccountSeed = {
  fullName: string;
  email: string;
  phone: string | null;
  role: PortalUserRole;
  passwordHash: string;
  isSupervisor: boolean;
  isME: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

function mapPortalUserAuthRow(row: Record<string, unknown>): PortalUserAuthRow {
  return {
    id: Number(row.id),
    fullName: String(row.fullName ?? ""),
    email: String(row.email ?? ""),
    phone: row.phone ? String(row.phone) : null,
    role: String(row.role ?? "Volunteer") as PortalUserRole,
    geographyScope: row.geographyScope ? String(row.geographyScope) : null,
    department: row.department ? String(row.department) : null,
    status: (String(row.status ?? "active") as PortalUserStatus),
    mustChangePassword: Boolean(row.mustChangePassword),
    isSupervisor: Boolean(row.isSupervisor),
    isME: Boolean(row.isME),
    isAdmin: Boolean(row.isAdmin),
    isSuperAdmin: Boolean(row.isSuperAdmin),
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
        department,
        status,
        must_change_password AS "mustChangePassword",
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

export async function authenticatePortalUserPostgres(identifier: string, rawPassword: string) {
  const auth = await findPortalUserAuthByIdentifierPostgres(identifier);
  if (!auth) return null;
  if (auth.status === "deactivated") return null;

  // Verify password (Argon2id, bcrypt, or legacy SHA256)
  const valid = await verifyPassword(rawPassword, auth.passwordHash);
  if (!valid) return null;

  // Transparent migration: upgrade to Argon2id on successful login
  if (!isArgon2Hash(auth.passwordHash)) {
    const upgraded = await hashPassword(rawPassword);
    await queryPostgres(
      `UPDATE portal_users SET password_hash = $1 WHERE id = $2`,
      [upgraded, auth.id],
    );
  }

  // Update last_login_at
  await queryPostgres(
    `UPDATE portal_users SET last_login_at = NOW() WHERE id = $1`,
    [auth.id],
  );
  const { passwordHash: _, ...user } = auth;
  return user;
}

export async function createPortalSessionPostgres(userId: number, token?: string) {
  const resolvedToken = token ?? crypto.randomBytes(32).toString("hex");
  
  // Calculate expiry boundaries
  const authRow = await findPortalUserAuthByIdPostgres(userId);
  const isPrivileged = authRow && (authRow.isSuperAdmin || authRow.isAdmin || authRow.isME || authRow.isSupervisor);
  
  // Absolute lifetime: 8 hrs privileged, 12 hrs standard
  const maxAgeSec = isPrivileged ? 8 * 60 * 60 : 12 * 60 * 60; 
  const resolvedExpiresAt = new Date(Date.now() + maxAgeSec * 1000).toISOString();
  
  await insertPortalSessionPostgres(userId, resolvedToken, resolvedExpiresAt);
  // Default to cookies being maxAgeSec so they expire cleanly locally too
  return { token: resolvedToken, expiresAt: resolvedExpiresAt, userId, maxAge: maxAgeSec, isPrivileged };
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
        department,
        status,
        must_change_password AS "mustChangePassword",
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
        department,
        status,
        must_change_password AS "mustChangePassword",
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

export async function insertPortalSessionPostgres(userId: number, token: string, expiresAt: string, isMfaVerified: boolean = false) {
  await queryPostgres(
    `
      INSERT INTO portal_sessions (user_id, token, expires_at, is_mfa_verified)
      VALUES ($1, $2, $3::timestamptz, $4)
      ON CONFLICT (token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        expires_at = EXCLUDED.expires_at,
        is_mfa_verified = EXCLUDED.is_mfa_verified
    `,
    [userId, token, expiresAt, isMfaVerified],
  );
}

export async function deleteExpiredPortalSessionsPostgres() {
  await queryPostgres("DELETE FROM portal_sessions WHERE expires_at <= NOW()");
  // Also delete idle sessions across the system (30 minutes max buffer for non-privileged, 15m is checked actively)
  await queryPostgres("DELETE FROM portal_sessions WHERE last_active_at < NOW() - INTERVAL '30 minutes'");
}

export async function findPortalUserBySessionTokenPostgres(token: string) {
  // 1. Fetch the raw session and user details
  const result = await queryPostgres(
    `
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        u.phone,
        u.role,
        u.geography_scope AS "geographyScope",
        u.department,
        u.status,
        u.must_change_password AS "mustChangePassword",
        u.is_supervisor AS "isSupervisor",
        u.is_me AS "isME",
        u.is_admin AS "isAdmin",
        u.is_superadmin AS "isSuperAdmin",
        s.last_active_at AS "lastActiveAt"
      FROM portal_sessions s
      JOIN portal_users u ON u.id = s.user_id
      WHERE s.token = $1
        AND s.expires_at > NOW()
        AND u.status != 'deactivated'
      LIMIT 1
    `,
    [token],
  );

  if (!result.rows[0]) return null;

  const row = result.rows[0];
  const isPrivileged = row.isSuperAdmin || row.isAdmin || row.isME || row.isSupervisor;
  const idleMaxMinutes = isPrivileged ? 15 : 30;

  // 2. Validate Idle Timeout mathematically from last_active_at
  const lastActive = new Date(row.lastActiveAt).getTime();
  const idleMillis = Date.now() - lastActive;
  if (idleMillis > idleMaxMinutes * 60 * 1000) {
    // Delete the expired idle session so it can't be reused
    await deletePortalSessionPostgres(token);
    return null;
  }

  // 3. Slide the idle window by updating last_active_at
  // We do this asynchronously to avoid blocking the main auth read loop
  queryPostgres("UPDATE portal_sessions SET last_active_at = NOW() WHERE token = $1", [token]).catch(() => {});

  const { lastActiveAt: _, ...userRow } = row;
  return mapPortalUserSessionRow(userRow);
}

export async function deletePortalSessionPostgres(token: string) {
  await queryPostgres("DELETE FROM portal_sessions WHERE token = $1", [token]);
}

export async function recordLoginAttemptPostgres(identifier: string, ipAddress: string, success: boolean) {
  await queryPostgres(
    `INSERT INTO login_attempts (identifier, ip_address, success) VALUES ($1, $2, $3)`,
    [identifier.trim().toLowerCase(), ipAddress, success]
  );
}

export async function getRecentFailedLoginAttemptsPostgres(identifier: string, minutes: number = 15): Promise<number> {
  const result = await queryPostgres(
    `
      SELECT COUNT(*) as count 
      FROM login_attempts 
      WHERE identifier = $1 
        AND success = false 
        AND attempt_time > NOW() - INTERVAL '${minutes} minutes'
    `,
    [identifier.trim().toLowerCase()]
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function generateMfaOtpPostgres(userId: number): Promise<string> {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
  
  await queryPostgres(
    `
      INSERT INTO portal_user_mfa (user_id, secret_code, expires_at)
      VALUES ($1, $2, $3::timestamptz)
      ON CONFLICT (user_id) DO UPDATE SET
        secret_code = EXCLUDED.secret_code,
        expires_at = EXCLUDED.expires_at,
        created_at = NOW()
    `,
    [userId, code, expiresAt]
  );
  return code;
}

export async function verifyMfaOtpPostgres(userId: number, code: string): Promise<boolean> {
  const result = await queryPostgres(
    `
      SELECT id 
      FROM portal_user_mfa 
      WHERE user_id = $1 
        AND secret_code = $2 
        AND expires_at > NOW()
    `,
    [userId, code]
  );
  
  if (result.rows.length > 0) {
    // Consume the OTP
    await queryPostgres(`DELETE FROM portal_user_mfa WHERE user_id = $1`, [userId]);
    return true;
  }
  return false;
}
