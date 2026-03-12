import { NextRequest, NextResponse } from "next/server";
import { csvHeaders, requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { exportFinanceRowsToCsv, listFinanceLedgerTransactions } from "@/lib/finance-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const txnType = request.nextUrl.searchParams.get("txnType") || undefined;
  const category = request.nextUrl.searchParams.get("category") || undefined;
  const postedStatus = request.nextUrl.searchParams.get("postedStatus") || undefined;
  const fromDate = request.nextUrl.searchParams.get("from") || undefined;
  const toDate = request.nextUrl.searchParams.get("to") || undefined;
  const format = request.nextUrl.searchParams.get("format");

  const transactions = await listFinanceLedgerTransactions({
    txnType: txnType as never,
    category: category as never,
    postedStatus: postedStatus as never,
    fromDate,
    toDate,
  });

  if (format === "csv") {
    const rows = transactions.map((item) => ({
      id: item.id,
      txnType: item.txnType,
      category: item.category,
      subcategory: item.subcategory || "",
      date: item.date,
      currency: item.currency,
      amount: item.amount,
      counterpartyName: item.counterpartyName || "",
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      postedStatus: item.postedStatus,
      postedAt: item.postedAt || "",
      createdAt: item.createdAt,
    }));
    const csv = exportFinanceRowsToCsv(rows, [
      "id",
      "txnType",
      "category",
      "subcategory",
      "date",
      "currency",
      "amount",
      "counterpartyName",
      "sourceType",
      "sourceId",
      "postedStatus",
      "postedAt",
      "createdAt",
    ]);
    return new NextResponse(csv, { headers: csvHeaders(`finance-ledger-${Date.now()}.csv`) });
  }

  return NextResponse.json({ transactions });
}
