import { NextRequest, NextResponse } from "next/server";
import { listFinanceHighRiskTransactions } from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { clampLimit } from "@/lib/server/http/pagination";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const limit = clampLimit(request.nextUrl.searchParams.get("limit"), 25, 500);
  const items = await listFinanceHighRiskTransactions(limit);
  return NextResponse.json({ items });
}
