import { createHash, randomBytes } from "node:crypto";
import { queryPostgres } from "@/lib/server/postgres/client";

export type ApiKeyRecord = {
  id: number;
  keyPrefix: string;
  name: string;
  organisation: string | null;
  contactEmail: string | null;
  scopes: string[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  status: "active" | "revoked" | "expired";
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
};

export type ApiKeyCreationResult = {
  record: ApiKeyRecord;
  /** The full plaintext key — shown ONCE at creation and never stored. */
  plaintextKey: string;
};

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function extractPrefix(key: string): string {
  // Keys start with `ork_` (Ozeki Read Key) + 12 random chars as lookup prefix
  return key.slice(0, 16);
}

function mapRow(row: Record<string, unknown>): ApiKeyRecord {
  return {
    id: Number(row.id),
    keyPrefix: String(row.key_prefix),
    name: String(row.name),
    organisation: row.organisation ? String(row.organisation) : null,
    contactEmail: row.contact_email ? String(row.contact_email) : null,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    rateLimitPerMinute: Number(row.rate_limit_per_minute ?? 60),
    rateLimitPerDay: Number(row.rate_limit_per_day ?? 5000),
    status: (row.status as ApiKeyRecord["status"]) ?? "active",
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    createdAt: String(row.created_at),
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    revokeReason: row.revoke_reason ? String(row.revoke_reason) : null,
  };
}

export async function listApiKeysPostgres(): Promise<ApiKeyRecord[]> {
  const res = await queryPostgres<Record<string, unknown>>(
    `SELECT * FROM api_keys ORDER BY status ASC, created_at DESC`,
  );
  return res.rows.map(mapRow);
}

export async function createApiKeyPostgres(input: {
  name: string;
  organisation?: string | null;
  contactEmail?: string | null;
  scopes?: string[];
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  expiresAt?: string | null;
  createdByUserId: number;
}): Promise<ApiKeyCreationResult> {
  // Format: ork_{24-char-secret} — 4-char label + 24-char base64-urlsafe-ish secret
  const secret = randomBytes(18).toString("base64url");
  const plaintext = `ork_${secret}`;
  const prefix = extractPrefix(plaintext);
  const hash = hashKey(plaintext);

  const res = await queryPostgres<Record<string, unknown>>(
    `INSERT INTO api_keys
       (key_prefix, key_hash, name, organisation, contact_email, scopes, rate_limit_per_minute, rate_limit_per_day, expires_at, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      prefix,
      hash,
      input.name.trim(),
      input.organisation?.trim() ?? null,
      input.contactEmail?.trim() ?? null,
      input.scopes ?? ["read:public"],
      input.rateLimitPerMinute ?? 60,
      input.rateLimitPerDay ?? 5000,
      input.expiresAt ?? null,
      input.createdByUserId,
    ],
  );

  return { record: mapRow(res.rows[0]), plaintextKey: plaintext };
}

export async function revokeApiKeyPostgres(id: number, reason: string): Promise<void> {
  await queryPostgres(
    `UPDATE api_keys
     SET status = 'revoked', revoked_at = NOW(), revoke_reason = $2
     WHERE id = $1 AND status = 'active'`,
    [id, reason.trim() || "No reason provided"],
  );
}

export type ApiKeyVerifyResult =
  | { ok: true; key: ApiKeyRecord }
  | { ok: false; reason: "missing" | "invalid" | "revoked" | "expired" | "rate_limited" };

/** Verify an incoming Authorization bearer token against stored keys. */
export async function verifyApiKeyPostgres(rawAuthHeader: string | null): Promise<ApiKeyVerifyResult> {
  if (!rawAuthHeader) return { ok: false, reason: "missing" };
  const match = rawAuthHeader.match(/^Bearer\s+(\S+)$/i);
  if (!match) return { ok: false, reason: "invalid" };
  const token = match[1].trim();
  if (!token.startsWith("ork_")) return { ok: false, reason: "invalid" };

  const prefix = extractPrefix(token);
  const hash = hashKey(token);

  const res = await queryPostgres<Record<string, unknown>>(
    `SELECT * FROM api_keys WHERE key_prefix = $1 LIMIT 1`,
    [prefix],
  );
  const row = res.rows[0];
  if (!row) return { ok: false, reason: "invalid" };
  if (row.key_hash !== hash) return { ok: false, reason: "invalid" };

  const record = mapRow(row);
  if (record.status === "revoked") return { ok: false, reason: "revoked" };
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  // Rate limiting: count usage in the last 60 seconds and 24 hours
  const rateRes = await queryPostgres<Record<string, unknown>>(
    `SELECT
       COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '1 minute')::int AS per_min,
       COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '1 day')::int AS per_day
     FROM api_key_usage_logs WHERE api_key_id = $1`,
    [record.id],
  );
  const perMin = Number(rateRes.rows[0]?.per_min ?? 0);
  const perDay = Number(rateRes.rows[0]?.per_day ?? 0);
  if (perMin >= record.rateLimitPerMinute || perDay >= record.rateLimitPerDay) {
    return { ok: false, reason: "rate_limited" };
  }

  return { ok: true, key: record };
}

export async function logApiKeyUsagePostgres(input: {
  apiKeyId: number;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await queryPostgres(
    `INSERT INTO api_key_usage_logs
       (api_key_id, endpoint, method, status_code, latency_ms, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.apiKeyId,
      input.endpoint,
      input.method,
      input.statusCode,
      input.latencyMs ?? null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ],
  );
  await queryPostgres(
    `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
    [input.apiKeyId],
  );
}

export async function getApiKeyUsageSummaryPostgres(apiKeyId: number): Promise<{
  last24h: number;
  last7d: number;
  last30d: number;
  byEndpoint: Array<{ endpoint: string; count: number }>;
}> {
  const [sumRes, endpointRes] = await Promise.all([
    queryPostgres<Record<string, unknown>>(
      `SELECT
         COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '1 day')::int  AS last_24h,
         COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days')::int AS last_7d,
         COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '30 days')::int AS last_30d
       FROM api_key_usage_logs WHERE api_key_id = $1`,
      [apiKeyId],
    ),
    queryPostgres<Record<string, unknown>>(
      `SELECT endpoint, COUNT(*)::int AS count
       FROM api_key_usage_logs
       WHERE api_key_id = $1 AND occurred_at >= NOW() - INTERVAL '30 days'
       GROUP BY endpoint ORDER BY count DESC LIMIT 20`,
      [apiKeyId],
    ),
  ]);

  return {
    last24h: Number(sumRes.rows[0]?.last_24h ?? 0),
    last7d: Number(sumRes.rows[0]?.last_7d ?? 0),
    last30d: Number(sumRes.rows[0]?.last_30d ?? 0),
    byEndpoint: endpointRes.rows.map((r) => ({
      endpoint: String(r.endpoint),
      count: Number(r.count),
    })),
  };
}
