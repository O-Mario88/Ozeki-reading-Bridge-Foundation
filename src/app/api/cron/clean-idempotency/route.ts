import { NextRequest, NextResponse } from "next/server";
import { cleanExpiredIdempotencyKeys } from "@/lib/server/idempotency";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Daily cron: delete expired idempotency keys.
 * Protect with CRON_SECRET header — same pattern as other cron routes.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (expected && expected !== provided) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const removed = await cleanExpiredIdempotencyKeys();
    logger.info("[cron] idempotency cleanup", { removed });
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    logger.error("[cron] idempotency cleanup failed", { error: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
