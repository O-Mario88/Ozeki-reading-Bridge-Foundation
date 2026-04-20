import { NextResponse } from "next/server";
import { withApiV1 } from "@/lib/server/api-v1";
import {
  verifyAuditChainPostgres,
  getLatestAuditCheckpointPostgres,
} from "@/lib/server/postgres/repositories/finance-controls";

export const runtime = "nodejs";
export const revalidate = 0;  // chain status must always be fresh for auditors

/**
 * External-auditor endpoint. Returns current chain integrity + the last
 * daily checkpoint. Requires an API key with `read:audit` scope (must be
 * explicitly granted by an admin — separate from `read:public`).
 */
export const GET = withApiV1(async () => {
  const [live, checkpoint] = await Promise.all([
    verifyAuditChainPostgres(),
    getLatestAuditCheckpointPostgres(),
  ]);
  return NextResponse.json({
    liveVerify: live,
    lastDailyCheckpoint: checkpoint,
    note: "A broken chain means at least one row in finance_audit_chain has been mutated since it was written. Investigate brokenAt + brokenReason.",
  });
}, { requiredScopes: ["read:audit"] });
