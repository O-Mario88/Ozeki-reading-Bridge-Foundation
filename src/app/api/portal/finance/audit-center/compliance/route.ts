import { NextResponse } from "next/server";
import { listFinanceAuditComplianceChecks } from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const checks = await listFinanceAuditComplianceChecks();
  return NextResponse.json({ checks });
}
