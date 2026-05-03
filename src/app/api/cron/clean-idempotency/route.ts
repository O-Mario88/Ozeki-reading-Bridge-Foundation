import { NextRequest, NextResponse } from "next/server";
import { cleanExpiredIdempotencyKeys } from "@/lib/server/idempotency";
import { logger } from "@/lib/logger";
import { requireCronToken } from "@/lib/server/http/cron-auth";

export const runtime = "nodejs";

/**
 * Daily cron: delete expired idempotency keys.
 * Standardised on `Authorization: Bearer <CRON_SECRET_TOKEN>`; the legacy
 * `x-cron-secret` header is still accepted by the helper for back-compat.
 */
export async function GET(req: NextRequest) {
  const authError = requireCronToken(req);
  if (authError) return authError;
  try {
    const removed = await cleanExpiredIdempotencyKeys();
    logger.info("[cron] idempotency cleanup", { removed });
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    logger.error("[cron] idempotency cleanup failed", { error: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
