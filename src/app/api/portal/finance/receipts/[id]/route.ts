import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteFinanceReceiptDraftAsync,
  getFinanceReceiptById,
  voidFinanceReceiptAsync,
} from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const deleteSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }
  const { id } = await context.params;
  const receiptId = Number(id);
  if (!Number.isFinite(receiptId)) {
    return NextResponse.json({ error: "Invalid receipt id." }, { status: 400 });
  }
  const receipt = await getFinanceReceiptById(receiptId);
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }
  return NextResponse.json({ receipt });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }
  const { id } = await context.params;
  const receiptId = Number(id);
  if (!Number.isFinite(receiptId)) {
    return NextResponse.json({ error: "Invalid receipt id." }, { status: 400 });
  }

  try {
    const parsed = deleteSchema.parse(await request.json());
    const current = await getFinanceReceiptById(receiptId);
    if (!current) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    if (current.status === "draft") {
      const deleted = await deleteFinanceReceiptDraftAsync(receiptId, parsed.reason, auth.actor);
      return NextResponse.json({ deleted, receipt: null });
    }

    const receipt = await voidFinanceReceiptAsync(receiptId, parsed.reason, auth.actor);
    return NextResponse.json({ deleted: null, receipt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete or void receipt." },
      { status: 400 },
    );
  }
}
