import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { logger } from "@/lib/logger";

/**
 * Idempotency helper for public POST endpoints that create financial state
 * (donations, sponsorships, service requests). Clients pass an `Idempotency-Key`
 * header — a UUID they generate once per user action. Duplicate requests with
 * the same key within the TTL window return the cached response instead of
 * creating a second record.
 *
 * How to use from a route handler:
 *
 *   const idem = await checkIdempotency(req, "donation-initiate", payload);
 *   if (idem.cached) return idem.replay;
 *   // ... do work, build `response` ...
 *   await storeIdempotencyResponse(idem, response);
 *   return response;
 */

export type IdempotencyLookup =
  | { cached: true; replay: NextResponse }
  | { cached: false; key: string; scope: string; requestHash: string };

const DEFAULT_TTL_HOURS = 24;

function hashRequest(body: unknown): string {
  const serialized = typeof body === "string" ? body : JSON.stringify(body);
  return createHash("sha256").update(serialized).digest("hex");
}

export async function checkIdempotency(
  req: NextRequest,
  scope: string,
  body: unknown,
): Promise<IdempotencyLookup> {
  const rawKey = req.headers.get("idempotency-key")?.trim();
  if (!rawKey) {
    // No key provided → caller is responsible for duplicate-protection itself.
    // We still return a record so stores can optionally snapshot the response
    // even when the client didn't send one (low value; usually skipped).
    return { cached: false, key: "", scope, requestHash: hashRequest(body) };
  }
  // Guardrail: refuse unreasonable key lengths to avoid abuse.
  if (rawKey.length < 8 || rawKey.length > 200) {
    return { cached: false, key: "", scope, requestHash: hashRequest(body) };
  }

  const requestHash = hashRequest(body);

  try {
    const res = await queryPostgres(
      `SELECT request_hash, response_body, response_status
       FROM idempotency_keys
       WHERE idempotency_key = $1 AND scope = $2 AND expires_at > NOW()
       LIMIT 1`,
      [rawKey, scope],
    );
    const row = res.rows[0];
    if (!row) {
      return { cached: false, key: rawKey, scope, requestHash };
    }

    // Same key + different body → the client reused a key for a different
    // operation. Treat as a client bug and refuse rather than return wrong data.
    if (row.request_hash !== requestHash) {
      return {
        cached: true,
        replay: NextResponse.json(
          { error: "Idempotency-Key was already used with a different payload." },
          { status: 422 },
        ),
      };
    }

    // Same key + same body → replay stored response
    const replay = new NextResponse(String(row.response_body), {
      status: Number(row.response_status),
      headers: {
        "Content-Type": "application/json",
        "Idempotent-Replay": "true",
      },
    });
    return { cached: true, replay };
  } catch (err) {
    logger.warn("[idempotency] check failed — proceeding without cache", { error: String(err) });
    return { cached: false, key: rawKey, scope, requestHash };
  }
}

export async function storeIdempotencyResponse(
  lookup: IdempotencyLookup,
  response: NextResponse,
  ttlHours = DEFAULT_TTL_HOURS,
): Promise<NextResponse> {
  if (lookup.cached) return response;
  if (!lookup.key) return response;

  try {
    // Clone the response body so we can cache it without consuming the stream
    // that the caller will return to the client.
    const cloned = response.clone();
    const body = await cloned.text();

    await queryPostgres(
      `INSERT INTO idempotency_keys (idempotency_key, scope, request_hash, response_body, response_status, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' hours')::interval)
       ON CONFLICT (idempotency_key, scope) DO NOTHING`,
      [lookup.key, lookup.scope, lookup.requestHash, body, response.status, String(ttlHours)],
    );
  } catch (err) {
    // Cache write failure should never break the primary response.
    logger.warn("[idempotency] store failed — response returned un-cached", { error: String(err) });
  }
  return response;
}

/**
 * Periodic cleanup. Call from a daily cron route.
 */
export async function cleanExpiredIdempotencyKeys(): Promise<number> {
  try {
    const res = await queryPostgres(
      `DELETE FROM idempotency_keys WHERE expires_at < NOW() RETURNING id`,
    );
    return res.rows.length;
  } catch {
    return 0;
  }
}
