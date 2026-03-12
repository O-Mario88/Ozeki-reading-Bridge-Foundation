import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteFinanceInvoiceDraft,
  getFinanceInvoiceById,
  updateFinanceInvoiceDraft,
  voidFinanceInvoice,
} from "@/lib/finance-db";
import { FINANCE_INCOME_CATEGORIES } from "@/lib/finance-categories";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

const patchSchema = z.object({
  contactId: z.coerce.number().int().positive().optional(),
  category: z.enum(FINANCE_INCOME_CATEGORIES).optional(),
  issueDate: z.string().trim().min(8).optional(),
  dueDate: z.string().trim().min(8).optional(),
  currency: z.enum(["UGX", "USD"]).optional(),
  lineItems: z.array(
    z.object({
      description: z.string().trim().min(1).max(300),
      qty: z.coerce.number().positive(),
      unitPrice: z.coerce.number().min(0),
    }),
  ).optional(),
  tax: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const voidSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }
  const { id } = await context.params;
  const invoiceId = Number(id);
  if (!Number.isFinite(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id." }, { status: 400 });
  }
  const invoice = await getFinanceInvoiceById(invoiceId);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  return NextResponse.json({ invoice });
}

export async function PATCH(
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
    const parsed = patchSchema.parse(await request.json());
    const invoice = updateFinanceInvoiceDraft(invoiceId, parsed, auth.actor);
    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update invoice." },
      { status: 400 },
    );
  }
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
  const invoiceId = Number(id);
  if (!Number.isFinite(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id." }, { status: 400 });
  }

  try {
    const parsed = voidSchema.parse(await request.json());
    const current = await getFinanceInvoiceById(invoiceId);
    if (!current) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    if (current.status === "draft") {
      const deleted = deleteFinanceInvoiceDraft(invoiceId, parsed.reason, auth.actor);
      return NextResponse.json({ deleted });
    }
    const invoice = voidFinanceInvoice(invoiceId, parsed.reason, auth.actor);
    return NextResponse.json({ invoice, deleted: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to void invoice." },
      { status: 400 },
    );
  }
}
