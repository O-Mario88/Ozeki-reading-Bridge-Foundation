import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuditChainPostgres,
  writeAuditCheckpointPostgres,
} from "@/lib/server/postgres/repositories/finance-controls";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Daily cron: verifies the finance audit chain and writes a checkpoint.
 * Consumers (public integrity badge, auditor API) read these checkpoints.
 * Protected by CRON_SECRET header — same pattern as other cron routes.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (expected && expected !== provided) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await verifyAuditChainPostgres();
    await writeAuditCheckpointPostgres(result);
    if (!result.ok) {
      logger.error("[cron/verify-audit-chain] CHAIN BROKEN", {
        brokenAt: result.brokenAt, reason: result.brokenReason,
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[cron/verify-audit-chain] failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
