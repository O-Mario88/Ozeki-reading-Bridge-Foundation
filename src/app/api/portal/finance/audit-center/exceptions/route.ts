import { NextRequest, NextResponse } from "next/server";
import { listFinanceAuditExceptions } from "@/lib/finance-db";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const month = request.nextUrl.searchParams.get("month") || undefined;
  const entityType = request.nextUrl.searchParams.get("entityType") || undefined;
  const severity = request.nextUrl.searchParams.get("severity") || undefined;
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const ruleCode = request.nextUrl.searchParams.get("ruleCode") || undefined;
  const category = request.nextUrl.searchParams.get("category") || undefined;
  const subcategory = request.nextUrl.searchParams.get("subcategory") || undefined;
  const paymentMethod = request.nextUrl.searchParams.get("paymentMethod") || undefined;
  const currency = request.nextUrl.searchParams.get("currency") || undefined;
  const createdBy = request.nextUrl.searchParams.get("createdBy");

  const exceptions = await listFinanceAuditExceptions({
    month,
    entityType: entityType as never,
    severity: severity as never,
    status: status as never,
    ruleCode,
    category: category as never,
    subcategory,
    paymentMethod: paymentMethod as never,
    currency: currency as never,
    createdBy: createdBy ? Number(createdBy) : undefined,
  });

  return NextResponse.json({ exceptions });
}
