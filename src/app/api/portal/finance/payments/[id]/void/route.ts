import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { voidFinancePaymentAsync } from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const bodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }
  const { id } = await context.params;
  const paymentId = Number(id);
  if (!Number.isFinite(paymentId)) {
    return NextResponse.json({ error: "Invalid payment id." }, { status: 400 });
  }

  try {
    const parsed = bodySchema.parse(await request.json());
    const payment = await voidFinancePaymentAsync(paymentId, parsed.reason, auth.actor);
    await auditLog({
      actor: { id: auth.actor.id, name: auth.actor.userName },
      action: "void",
      targetTable: "finance_payments",
      targetId: paymentId,
      after: payment,
      detail: parsed.reason,
      request,
    });
    return NextResponse.json({ payment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to void payment." },
      { status: 400 },
    );
  }
}
