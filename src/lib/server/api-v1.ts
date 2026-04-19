import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyApiKeyPostgres,
  logApiKeyUsagePostgres,
  type ApiKeyRecord,
} from "@/lib/server/postgres/repositories/api-keys";
import { logger } from "@/lib/logger";

/**
 * Wrap a v1 public API handler with API-key auth, rate limiting, usage
 * logging, content negotiation (JSON + CSV), and ETag-based caching.
 *
 * Two handler flavours:
 *   withApiV1(handler)           — returns a single payload
 *   withApiV1.table(handler)     — returns { rows, meta } for list endpoints,
 *                                  which the wrapper formats as JSON or CSV
 *                                  based on the client's Accept header.
 */

export type ApiV1Context<T> = {
  key: ApiKeyRecord;
  params: T;
};

type JsonHandler<T> = (req: NextRequest, ctx: ApiV1Context<T>) => Promise<NextResponse>;

type TableHandlerResult = {
  rows: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
  /** Filename stem used for the Content-Disposition header on CSV downloads. */
  filename?: string;
};

type TableHandler<T> = (req: NextRequest, ctx: ApiV1Context<T>) => Promise<TableHandlerResult>;

type ApiV1Options = {
  requiredScopes?: string[];
  /** Seconds to hint in Cache-Control: public, max-age=N. Defaults to 0. */
  maxAgeSeconds?: number;
};

function computeEtag(body: string): string {
  return `"${createHash("sha1").update(body).digest("hex").slice(0, 16)}"`;
}

function wantsCsv(req: NextRequest): boolean {
  const accept = (req.headers.get("accept") ?? "").toLowerCase();
  const format = req.nextUrl.searchParams.get("format")?.toLowerCase();
  return format === "csv" || accept.includes("text/csv");
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return csvCell(JSON.stringify(value));
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return lines.join("\n");
}

async function authenticate(req: NextRequest, requiredScopes?: string[]): Promise<{ ok: true; key: ApiKeyRecord } | { ok: false; response: NextResponse }> {
  const verify = await verifyApiKeyPostgres(req.headers.get("authorization"));
  if (!verify.ok) {
    const statusMap: Record<string, number> = {
      missing: 401, invalid: 401, revoked: 401, expired: 401, rate_limited: 429,
    };
    const status = statusMap[verify.reason] ?? 401;
    const hint = verify.reason === "missing"
      ? "Provide an `Authorization: Bearer ork_...` header."
      : verify.reason === "rate_limited"
        ? "You have exceeded your rate limit. Try again shortly."
        : "The API key was not accepted.";
    return {
      ok: false,
      response: NextResponse.json(
        { error: verify.reason, message: hint },
        { status, headers: { "WWW-Authenticate": "Bearer" } },
      ),
    };
  }
  if (requiredScopes?.length) {
    const hasAll = requiredScopes.every((s) => verify.key.scopes.includes(s));
    if (!hasAll) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "insufficient_scope", required: requiredScopes },
          { status: 403 },
        ),
      };
    }
  }
  return { ok: true, key: verify.key };
}

function attachStandardHeaders(
  response: NextResponse,
  key: ApiKeyRecord,
  maxAgeSeconds = 0,
): NextResponse {
  const headers = new Headers(response.headers);
  headers.set("X-Ozeki-API-Version", "1.0");
  headers.set("X-RateLimit-Limit-Minute", String(key.rateLimitPerMinute));
  headers.set("X-RateLimit-Limit-Day", String(key.rateLimitPerDay));
  if (maxAgeSeconds > 0 && !headers.has("Cache-Control")) {
    headers.set("Cache-Control", `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${Math.round(maxAgeSeconds * 2)}`);
  }
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function maybeReplay304(req: NextRequest, body: string, key: ApiKeyRecord): Promise<NextResponse | null> {
  const etag = computeEtag(body);
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    const response = new NextResponse(null, { status: 304, headers: { ETag: etag } });
    return attachStandardHeaders(response, key);
  }
  return null;
}

async function logUsage(
  key: ApiKeyRecord,
  req: NextRequest,
  endpoint: string,
  status: number,
  started: number,
): Promise<void> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;
  await logApiKeyUsagePostgres({
    apiKeyId: key.id,
    endpoint,
    method: req.method,
    statusCode: status,
    latencyMs: Date.now() - started,
    ipAddress: ip,
    userAgent,
  }).catch((err) => logger.warn("[api/v1] usage log failed", { error: String(err) }));
}

export function withApiV1<T = Record<string, never>>(
  handler: JsonHandler<T>,
  options: ApiV1Options = {},
) {
  return async (req: NextRequest, routeCtx: { params: Promise<T> }) => {
    const started = Date.now();
    const endpoint = new URL(req.url).pathname;

    const auth = await authenticate(req, options.requiredScopes);
    if (!auth.ok) return auth.response;

    let response: NextResponse;
    try {
      const params = await routeCtx.params;
      response = await handler(req, { key: auth.key, params });
    } catch (error) {
      logger.error("[api/v1] handler threw", { error: String(error), endpoint });
      response = NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    // ETag support for GET/200 JSON responses
    if (req.method === "GET" && response.status === 200) {
      const cloned = response.clone();
      const body = await cloned.text();
      const notModified = await maybeReplay304(req, body, auth.key);
      if (notModified) {
        logUsage(auth.key, req, endpoint, 304, started);
        return notModified;
      }
      // Attach ETag for this response
      const etag = computeEtag(body);
      response = new NextResponse(body, {
        status: response.status,
        headers: new Headers({ ...Object.fromEntries(response.headers), ETag: etag }),
      });
    }

    logUsage(auth.key, req, endpoint, response.status, started);
    return attachStandardHeaders(response, auth.key, options.maxAgeSeconds);
  };
}

/**
 * Variant for list endpoints. Handler returns raw rows; wrapper negotiates
 * JSON vs CSV based on client Accept header / ?format=csv.
 */
withApiV1.table = function table<T = Record<string, never>>(
  handler: TableHandler<T>,
  options: ApiV1Options = {},
) {
  return async (req: NextRequest, routeCtx: { params: Promise<T> }) => {
    const started = Date.now();
    const endpoint = new URL(req.url).pathname;

    const auth = await authenticate(req, options.requiredScopes);
    if (!auth.ok) return auth.response;

    let result: TableHandlerResult;
    try {
      const params = await routeCtx.params;
      result = await handler(req, { key: auth.key, params });
    } catch (error) {
      logger.error("[api/v1] table handler threw", { error: String(error), endpoint });
      const err = NextResponse.json({ error: "internal_error" }, { status: 500 });
      logUsage(auth.key, req, endpoint, 500, started);
      return attachStandardHeaders(err, auth.key);
    }

    if (wantsCsv(req)) {
      const csv = rowsToCsv(result.rows);
      const filename = `${result.filename ?? "ozeki-export"}.csv`;
      const response = new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Total-Rows": String(result.rows.length),
        },
      });
      logUsage(auth.key, req, endpoint, 200, started);
      return attachStandardHeaders(response, auth.key, options.maxAgeSeconds);
    }

    const jsonBody = JSON.stringify({
      data: result.rows,
      meta: {
        count: result.rows.length,
        ...(result.meta ?? {}),
      },
    });
    const notModified = await maybeReplay304(req, jsonBody, auth.key);
    if (notModified) {
      logUsage(auth.key, req, endpoint, 304, started);
      return notModified;
    }

    const response = new NextResponse(jsonBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: computeEtag(jsonBody),
      },
    });
    logUsage(auth.key, req, endpoint, 200, started);
    return attachStandardHeaders(response, auth.key, options.maxAgeSeconds);
  };
};
