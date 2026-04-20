import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import {
  verifyAuditChainPostgres,
  getLatestAuditCheckpointPostgres,
} from "@/lib/server/postgres/repositories/finance-controls";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePortalUser();
    const [live, latest] = await Promise.all([
      verifyAuditChainPostgres(),
      getLatestAuditCheckpointPostgres(),
    ]);
    return NextResponse.json({ live, lastCheckpoint: latest });
  } catch (error) {
    logger.error("[finance/audit-chain/verify] failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
