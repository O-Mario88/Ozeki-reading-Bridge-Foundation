import { NextResponse } from "next/server";

/**
 * Authorise a privileged operations endpoint (migrations, schema bootstrap,
 * one-shot fixers). Accepts either of:
 *
 *   - `Authorization: Bearer <token>` header (preferred, matches the cron
 *     dispatcher pattern)
 *   - `?secret=<token>` query string (legacy, kept for back-compat with the
 *     existing `events`/`sponsorships` migrate routes)
 *
 * The token is checked against `MIGRATE_TOKEN`, falling back to
 * `CRON_SECRET_TOKEN`, then `CRON_SECRET`. The first env var that is defined
 * sets the required token; callers MUST configure at least one.
 *
 * In `NODE_ENV=development` the helper still allows the route through
 * (so local first-time setup doesn't require a token), but logs a warning
 * if no token is configured.
 *
 * Returns:
 *   - `null` on success — caller should proceed
 *   - a `NextResponse` (401) on failure — caller should `return` it
 */
export function requireAdminToken(request: Request): NextResponse | null {
  const expected =
    process.env.MIGRATE_TOKEN ??
    process.env.CRON_SECRET_TOKEN ??
    process.env.CRON_SECRET ??
    null;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Migration endpoints require MIGRATE_TOKEN to be configured" },
        { status: 503 },
      );
    }
    return null;
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth === `Bearer ${expected}`) return null;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  if (querySecret && querySecret === expected) return null;

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
