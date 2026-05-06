import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness probe used by Railway's deployment healthcheck gate.
 *
 * Railway calls the configured healthcheck path until it receives an HTTP
 * 200 response, then switches traffic to the new deployment. The gate is
 * not used for continuous monitoring — it only runs during deploy.
 *
 * This endpoint deliberately does NOT touch the database, OpenAI, SMTP,
 * or any other external dependency. A 200 here means: the Node process
 * booted, the standalone Next.js server is bound to PORT, and the
 * runtime is willing to handle requests. That's the right semantic for
 * "should Railway route traffic to this instance" — readiness of
 * downstream services is reported separately by /api/health, which can
 * be polled by uptime monitors and the operator dashboard.
 *
 * If you need to confirm DB / SMTP / Pesapal config before the deploy
 * goes live, point Railway at /api/health instead — that endpoint
 * returns 503 when any required dependency is missing.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "live",
      timestamp: new Date().toISOString(),
      uptime: typeof process !== "undefined" && typeof process.uptime === "function" ? process.uptime() : null,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
