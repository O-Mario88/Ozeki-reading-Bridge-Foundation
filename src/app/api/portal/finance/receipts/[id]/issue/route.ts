import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { issueFinanceReceipt } from "@/services/financeService";
import { requireFinanceReceiptEditor } from "@/app/api/portal/finance/_utils";
import { readOptionalJsonBody, JsonBodyError } from "@/lib/server/http/json-body";

export const runtime = "nodejs";

const bodySchema = z.object({
  sendEmail: z.boolean().optional(),
  to: z.array(z.string().trim().email()).optional(),
  cc: z.array(z.string().trim().email()).optional(),
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
    const parsed = bodySchema.parse(await readOptionalJsonBody(request));
    const result = await issueFinanceReceipt(receiptId, auth.actor, {
      sendEmail: parsed.sendEmail,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    console.error("[api/portal/finance/receipts/issue]", error);
    return NextResponse.json({ error: "Failed to issue receipt." }, { status: 400 });
  }
}
