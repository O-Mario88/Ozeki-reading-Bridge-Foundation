import { NextResponse } from "next/server";

/**
 * Authorise a cron-driven endpoint.
 *
 * Standard contract (matches the dispatcher):
 *
 *   Authorization: Bearer <CRON_SECRET_TOKEN>
 *
 * For backwards compatibility this also accepts the legacy `x-cron-secret`
 * header that two routes (clean-idempotency, verify-audit-chain) historically
 * used. New routes should use the `Authorization: Bearer` form only.
 *
 * Token is read from `CRON_SECRET_TOKEN`, falling back to `CRON_SECRET`.
 *
 * In production with no secret configured, the route is refused outright (a
 * silently-anonymous cron endpoint is a vector). In development with no
 * secret, the call is allowed through to make local testing painless.
 *
 * Returns:
 *   - `null` on success — caller should proceed
 *   - a `NextResponse` (401/503) on failure — caller should `return` it
 */
export function requireCronToken(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET_TOKEN ?? process.env.CRON_SECRET ?? null;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Cron endpoints require CRON_SECRET_TOKEN to be configured" },
        { status: 503 },
      );
    }
    return null;
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth === `Bearer ${expected}`) return null;

  const legacy = request.headers.get("x-cron-secret");
  if (legacy && legacy === expected) return null;

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
