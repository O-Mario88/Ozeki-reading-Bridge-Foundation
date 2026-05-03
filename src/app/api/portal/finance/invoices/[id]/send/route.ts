import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendFinanceInvoice } from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { readOptionalJsonBody, JsonBodyError } from "@/lib/server/http/json-body";

export const runtime = "nodejs";

const bodySchema = z.object({
  to: z.array(z.string().trim().email()).optional(),
  cc: z.array(z.string().trim().email()).optional(),
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
  const invoiceId = Number(id);
  if (!Number.isFinite(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id." }, { status: 400 });
  }

  try {
    const parsed = bodySchema.parse(await readOptionalJsonBody(request));
    const result = await sendFinanceInvoice(invoiceId, auth.actor, {
      to: parsed.to,
      cc: parsed.cc,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    console.error("[api/portal/finance/invoices/send]", error);
    return NextResponse.json({ error: "Failed to send invoice." }, { status: 400 });
  }
}
