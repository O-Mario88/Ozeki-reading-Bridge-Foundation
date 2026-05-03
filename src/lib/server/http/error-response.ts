import { NextResponse } from "next/server";

/**
 * Sanitised error response for portal/data endpoints.
 *
 * Why: returning `error.message` verbatim is a known SQL/schema disclosure
 * vector — Postgres errors like `relation "X" does not exist` or
 * `column "Y" of relation "Z"` reveal table layout to anyone probing the
 * route. We log the full error server-side (so ops can still debug) but
 * the wire response is generic.
 *
 * `clientMessage` is OPTIONAL and intended ONLY for messages we have
 * deliberately authored (e.g. `"Record not found."`, business-rule
 * messages). Pass `undefined`/omit it for unknown errors and a generic
 * "Server error" string is returned.
 */
export function sanitisedErrorResponse(
  scope: string,
  error: unknown,
  options: { status?: number; clientMessage?: string } = {},
): NextResponse {
  const status = options.status ?? 500;
  // Always log the underlying error with a scope tag so the server logs
  // are still actionable.
  console.error(`[${scope}]`, error);
  const body = {
    error: options.clientMessage ?? (status >= 500 ? "Server error." : "Request failed."),
  };
  return NextResponse.json(body, { status });
}
