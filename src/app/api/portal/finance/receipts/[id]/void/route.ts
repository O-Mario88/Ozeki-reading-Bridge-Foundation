import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { voidFinanceReceiptAsync } from "@/services/financeService";
import { requireFinanceReceiptEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const bodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceReceiptEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }
  const { id } = await context.params;
  const receiptId = Number(id);
  if (!Number.isFinite(receiptId)) {
    return NextResponse.json({ error: "Invalid receipt id." }, { status: 400 });
  }

  try {
    const parsed = bodySchema.parse(await request.json());
    const receipt = await voidFinanceReceiptAsync(receiptId, parsed.reason, auth.actor);
    return NextResponse.json({ receipt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to void receipt." },
      { status: 400 },
    );
  }
}
