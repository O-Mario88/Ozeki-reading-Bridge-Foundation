import { NextResponse } from "next/server";
import { getLatestAuditCheckpointPostgres } from "@/lib/server/postgres/repositories/finance-controls";

export const runtime = "nodejs";
export const revalidate = 300; // badge can safely lag 5 minutes

/**
 * Public, unauthenticated endpoint that returns the current integrity
 * status for the "verified" badge on /transparency/financials. Returns
 * the last daily checkpoint result — not the live verify — so a flaky
 * mid-day state doesn't flip the badge red.
 */
export async function GET() {
  try {
    const checkpoint = await getLatestAuditCheckpointPostgres();
    return NextResponse.json({
      verifiedOk: checkpoint.verifiedOk,
      checkpointDate: checkpoint.checkpointDate,
      rowsVerified: checkpoint.rowsVerified,
      lastSequence: checkpoint.lastSequence,
      // Do NOT expose `brokenAt` publicly — it leaks internal state info.
      // Auditors with read:audit scope see it via /api/v1/audit/chain-status.
    });
  } catch {
    return NextResponse.json({ verifiedOk: false, checkpointDate: null });
  }
}
