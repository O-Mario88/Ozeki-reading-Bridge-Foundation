import { NextRequest, NextResponse } from "next/server";
import { getDonorOutcomeChainPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ ref: string }> };

/**
 * Public endpoint: donor can see the impact of their sponsorship by reference.
 * No auth — the reference number itself is the credential (same model as /donors/[ref]).
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { ref } = await params;
    const chain = await getDonorOutcomeChainPostgres(decodeURIComponent(ref).toUpperCase().trim());
    if (!chain) return NextResponse.json({ error: "Sponsorship not found or not yet confirmed." }, { status: 404 });
    return NextResponse.json(chain);
  } catch (error) {
    logger.error("[sponsors/impact] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
