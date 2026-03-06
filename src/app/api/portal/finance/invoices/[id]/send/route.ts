import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendFinanceInvoice } from "@/lib/finance-db";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

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
    const parsed = bodySchema.parse(await request.json().catch(() => ({})));
    const result = await sendFinanceInvoice(invoiceId, auth.actor, {
      to: parsed.to,
      cc: parsed.cc,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invoice." },
      { status: 400 },
    );
  }
}
