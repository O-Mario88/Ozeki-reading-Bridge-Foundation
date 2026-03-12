import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { voidFinancePayment } from "@/lib/finance-db";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

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
    const payment = voidFinancePayment(paymentId, parsed.reason, auth.actor);
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
