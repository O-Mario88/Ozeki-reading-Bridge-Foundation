import { NextRequest, NextResponse } from "next/server";
import { getFinanceDashboardSummary, listFinanceEmailLogs } from "@/lib/finance-db";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const month = request.nextUrl.searchParams.get("month") || undefined;
  const currencyRaw = request.nextUrl.searchParams.get("currency");
  const currency = currencyRaw?.toUpperCase() === "USD" ? "USD" : "UGX";

  const summary = getFinanceDashboardSummary(month, currency);
  const recentEmails = listFinanceEmailLogs(20);
  return NextResponse.json({ summary, recentEmails });
}

