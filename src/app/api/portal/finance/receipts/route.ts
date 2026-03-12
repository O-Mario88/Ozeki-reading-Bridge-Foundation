import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createFinanceReceipt,
  exportFinanceRowsToCsv,
  issueFinanceReceipt,
  listFinanceReceipts,
} from "@/lib/finance-db";
import { FINANCE_INCOME_CATEGORIES } from "@/lib/finance-categories";
import { csvHeaders, requireFinanceReceiptEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const createSchema = z.object({
  contactId: z.coerce.number().int().positive(),
  category: z.enum(FINANCE_INCOME_CATEGORIES),
  receivedFrom: z.string().trim().min(2).max(200),
  receiptDate: z.string().trim().min(8),
  currency: z.enum(["UGX", "USD"]).default("UGX"),
  amountReceived: z.coerce.number().positive(),
  paymentMethod: z.enum(["cash", "bank_transfer", "mobile_money", "cheque", "other"]),
  referenceNo: z.string().trim().max(200).optional(),
  relatedInvoiceId: z.coerce.number().int().positive().optional(),
  description: z
    .string()
    .max(1000)
    .optional()
    .refine((value) => value === undefined || value.trim().length > 0, {
      message: "Description cannot be only whitespace.",
    })
    .transform((value) => value?.trim()),
  notes: z.string().trim().max(2000).optional(),
  issueNow: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireFinanceReceiptEditor();
  if (auth.error) {
    return auth.error;
  }
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const category = request.nextUrl.searchParams.get("category") || undefined;
  const fromDate = request.nextUrl.searchParams.get("from") || undefined;
  const toDate = request.nextUrl.searchParams.get("to") || undefined;
  const format = request.nextUrl.searchParams.get("format");

  const receipts = await listFinanceReceipts({
    status: status as never,
    category: category as never,
    fromDate,
    toDate,
  });

  if (format === "csv") {
    const rows = receipts.map((item) => ({
      receiptNumber: item.receiptNumber,
      receiptDate: item.receiptDate,
      category: item.category,
      currency: item.currency,
      amountReceived: item.amountReceived,
      paymentMethod: item.paymentMethod,
      description: item.description || "",
      status: item.status,
      relatedInvoiceId: item.relatedInvoiceId || "",
      createdAt: item.createdAt,
    }));
    const csv = exportFinanceRowsToCsv(rows, [
      "receiptNumber",
      "receiptDate",
      "category",
      "currency",
      "amountReceived",
      "paymentMethod",
      "description",
      "status",
      "relatedInvoiceId",
      "createdAt",
    ]);
    return new NextResponse(csv, { headers: csvHeaders(`finance-receipts-${Date.now()}.csv`) });
  }

  return NextResponse.json({ receipts });
}

export async function POST(request: Request) {
  const auth = await requireFinanceReceiptEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const parsed = createSchema.parse(await request.json());
    const created = createFinanceReceipt(
      {
        contactId: parsed.contactId,
        category: parsed.category,
        receivedFrom: parsed.receivedFrom,
        receiptDate: parsed.receiptDate,
        currency: parsed.currency,
        amountReceived: parsed.amountReceived,
        paymentMethod: parsed.paymentMethod,
        referenceNo: parsed.referenceNo,
        relatedInvoiceId: parsed.relatedInvoiceId,
        description: parsed.description,
        notes: parsed.notes,
      },
      auth.actor,
    );
    if (parsed.issueNow) {
      const issued = await issueFinanceReceipt(created.id, auth.actor, {
        sendEmail: parsed.sendEmail === true,
        ensurePdf: true,
      });
      return NextResponse.json(
        {
          receipt: issued.receipt,
          email: issued.email,
          issuedNow: true,
        },
        { status: 201 },
      );
    }
    return NextResponse.json({ receipt: created, issuedNow: false }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create receipt." },
      { status: 400 },
    );
  }
}
