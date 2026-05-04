import { queryPostgres } from "@/lib/server/postgres/client";

export type AuditInviteRow = {
  id: number;
  token: string;
  invitedEmail: string;
  invitedFullName: string;
  invitedOrganization: string | null;
  scopeNote: string | null;
  expiresAt: string;
  accountExpiresAt: string;
  consumedAt: string | null;
  consumedUserId: number | null;
  createdByUserId: number | null;
  createdAt: string;
};

const SELECT_COLUMNS = `
  id,
  token,
  invited_email AS "invitedEmail",
  invited_full_name AS "invitedFullName",
  invited_organization AS "invitedOrganization",
  scope_note AS "scopeNote",
  expires_at AS "expiresAt",
  account_expires_at AS "accountExpiresAt",
  consumed_at AS "consumedAt",
  consumed_user_id AS "consumedUserId",
  created_by_user_id AS "createdByUserId",
  created_at AS "createdAt"
`;

export async function createAuditInvitePostgres(input: {
  token: string;
  invitedEmail: string;
  invitedFullName: string;
  invitedOrganization?: string | null;
  scopeNote?: string | null;
  expiresAt: Date;
  accountExpiresAt: Date;
  createdByUserId: number;
}): Promise<AuditInviteRow> {
  const result = await queryPostgres(
    `
    INSERT INTO audit_invite_tokens (
      token, invited_email, invited_full_name, invited_organization, scope_note,
      expires_at, account_expires_at, created_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING ${SELECT_COLUMNS}
    `,
    [
      input.token,
      input.invitedEmail.trim().toLowerCase(),
      input.invitedFullName.trim(),
      input.invitedOrganization?.trim() || null,
      input.scopeNote?.trim() || null,
      input.expiresAt.toISOString(),
      input.accountExpiresAt.toISOString(),
      input.createdByUserId,
    ],
  );
  return result.rows[0] as AuditInviteRow;
}

export async function findAuditInviteByTokenPostgres(token: string): Promise<AuditInviteRow | null> {
  const result = await queryPostgres(
    `SELECT ${SELECT_COLUMNS} FROM audit_invite_tokens WHERE token = $1 LIMIT 1`,
    [token],
  );
  return (result.rows[0] as AuditInviteRow | undefined) ?? null;
}

export async function markAuditInviteConsumedPostgres(
  id: number,
  consumedUserId: number,
): Promise<void> {
  await queryPostgres(
    `
    UPDATE audit_invite_tokens
    SET consumed_at = NOW(), consumed_user_id = $2
    WHERE id = $1 AND consumed_at IS NULL
    `,
    [id, consumedUserId],
  );
}

export async function listAuditInvitesPostgres(limit = 100): Promise<AuditInviteRow[]> {
  const result = await queryPostgres(
    `SELECT ${SELECT_COLUMNS} FROM audit_invite_tokens ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return result.rows as AuditInviteRow[];
}
