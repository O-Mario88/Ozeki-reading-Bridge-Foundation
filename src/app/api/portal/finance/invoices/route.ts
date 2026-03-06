import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createFinanceInvoice,
  exportFinanceRowsToCsv,
  listFinanceInvoices,
} from "@/lib/finance-db";
import { FINANCE_INCOME_CATEGORIES } from "@/lib/finance-categories";
import { csvHeaders, requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
});

const createSchema = z.object({
  contactId: z.coerce.number().int().positive(),
  category: z.enum(FINANCE_INCOME_CATEGORIES),
  issueDate: z.string().trim().min(8),
  dueDate: z.string().trim().min(8),
  currency: z.enum(["UGX", "USD"]).default("UGX"),
  lineItems: z.array(lineItemSchema).min(1),
  tax: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const category = request.nextUrl.searchParams.get("category") || undefined;
  const fromDate = request.nextUrl.searchParams.get("from") || undefined;
  const toDate = request.nextUrl.searchParams.get("to") || undefined;
  const format = request.nextUrl.searchParams.get("format");

  const invoices = listFinanceInvoices({
    status: status as never,
    category: category as never,
    fromDate,
    toDate,
  });

  if (format === "csv") {
    const rows = invoices.map((item) => ({
      invoiceNumber: item.invoiceNumber,
      issueDate: item.issueDate,
      dueDate: item.dueDate,
      category: item.category,
      currency: item.currency,
      total: item.total,
      paidAmount: item.paidAmount,
      balanceDue: item.balanceDue,
      status: item.status,
      lastSentTo: item.lastSentTo || "",
      createdAt: item.createdAt,
    }));
    const csv = exportFinanceRowsToCsv(rows, [
      "invoiceNumber",
      "issueDate",
      "dueDate",
      "category",
      "currency",
      "total",
      "paidAmount",
      "balanceDue",
      "status",
      "lastSentTo",
      "createdAt",
    ]);
    return new NextResponse(csv, { headers: csvHeaders(`finance-invoices-${Date.now()}.csv`) });
  }

  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const parsed = createSchema.parse(await request.json());
    const invoice = createFinanceInvoice(
      {
        contactId: parsed.contactId,
        category: parsed.category,
        issueDate: parsed.issueDate,
        dueDate: parsed.dueDate,
        currency: parsed.currency,
        lineItems: parsed.lineItems,
        tax: parsed.tax,
        notes: parsed.notes,
      },
      auth.actor,
    );
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice." },
      { status: 400 },
    );
  }
}
