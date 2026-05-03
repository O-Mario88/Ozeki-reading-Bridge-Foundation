import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuditChainPostgres,
  writeAuditCheckpointPostgres,
} from "@/lib/server/postgres/repositories/finance-controls";
import { logger } from "@/lib/logger";
import { requireCronToken } from "@/lib/server/http/cron-auth";

export const runtime = "nodejs";

/**
 * Daily cron: verifies the finance audit chain and writes a checkpoint.
 * Consumers (public integrity badge, auditor API) read these checkpoints.
 * Standardised on `Authorization: Bearer <CRON_SECRET_TOKEN>`.
 */
export async function GET(req: NextRequest) {
  const authError = requireCronToken(req);
  if (authError) return authError;
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
