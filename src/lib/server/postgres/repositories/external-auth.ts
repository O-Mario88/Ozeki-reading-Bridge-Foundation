import crypto from "node:crypto";
import { queryPostgres } from "@/lib/server/postgres/client";
import {
  type ExternalUserRow,
  findExternalUserByIdPostgres,
} from "@/lib/server/postgres/repositories/external-users";

const MAGIC_LINK_TTL_MIN = 30;
const SESSION_TTL_DAYS = 30;

export async function issueMagicLinkPostgres(input: {
  userId: number;
  channel: "email" | "sms";
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MIN * 60 * 1000);
  await queryPostgres(
    `INSERT INTO external_user_magic_links (
      user_id, token, channel, purpose, expires_at, ip_address, user_agent
    ) VALUES ($1, $2, $3, 'login', $4, $5, $6)`,
    [
      input.userId,
      token,
      input.channel,
      expiresAt.toISOString(),
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ],
  );
  return { token, expiresAt };
}

export async function consumeMagicLinkPostgres(
  token: string,
): Promise<ExternalUserRow | null> {
  const result = await queryPostgres(
    `UPDATE external_user_magic_links
     SET consumed_at = NOW()
     WHERE token = $1 AND consumed_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [token],
  );
  const userId = Number(result.rows[0]?.user_id ?? 0);
  if (!userId) return null;
  return findExternalUserByIdPostgres(userId);
}

export async function createExternalSessionPostgres(input: {
  userId: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await queryPostgres(
    `INSERT INTO external_user_sessions (user_id, token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.userId, token, expiresAt.toISOString(), input.ipAddress ?? null, input.userAgent ?? null],
  );
  return { token, expiresAt };
}

export async function findExternalUserBySessionTokenPostgres(
  token: string,
): Promise<ExternalUserRow | null> {
  const result = await queryPostgres(
    `SELECT u.id
     FROM external_user_sessions s
     JOIN external_users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW() AND u.status = 'active'
     LIMIT 1`,
    [token],
  );
  const id = Number(result.rows[0]?.id ?? 0);
  if (!id) return null;
  void queryPostgres(
    `UPDATE external_user_sessions SET last_active_at = NOW() WHERE token = $1`,
    [token],
  ).catch(() => {});
  return findExternalUserByIdPostgres(id);
}

export async function deleteExternalSessionPostgres(token: string): Promise<void> {
  await queryPostgres(`DELETE FROM external_user_sessions WHERE token = $1`, [token]);
}
