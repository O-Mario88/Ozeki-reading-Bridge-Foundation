import { NextResponse } from "next/server";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { runFinanceAuditSweep } from "@/services/financeService";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const summary = runFinanceAuditSweep(auth.actor);
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run finance audit sweep." },
      { status: 400 },
    );
  }
}
