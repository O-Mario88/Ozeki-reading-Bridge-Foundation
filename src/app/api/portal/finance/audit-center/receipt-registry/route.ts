import { NextRequest, NextResponse } from "next/server";
import { listFinanceReceiptRegistry } from "@/lib/finance-db";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const vendor = request.nextUrl.searchParams.get("vendor") || undefined;
  const reference = request.nextUrl.searchParams.get("reference") || undefined;
  const fromDate = request.nextUrl.searchParams.get("from") || undefined;
  const toDate = request.nextUrl.searchParams.get("to") || undefined;
  const amountRaw = request.nextUrl.searchParams.get("amount");
  const amount = amountRaw ? Number(amountRaw) : undefined;
  const currency = request.nextUrl.searchParams.get("currency") || undefined;

  const receipts = listFinanceReceiptRegistry({
    vendor,
    reference,
    fromDate,
    toDate,
    amount: Number.isFinite(amount) ? amount : undefined,
    currency: currency as never,
  });
  return NextResponse.json({ receipts });
}
