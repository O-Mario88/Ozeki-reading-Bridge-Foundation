import { NextRequest, NextResponse } from "next/server";
import { listFinanceHighRiskTransactions } from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Number(limitRaw || 25);
  const items = await listFinanceHighRiskTransactions(Number.isFinite(limit) ? limit : 25);
  return NextResponse.json({ items });
}
