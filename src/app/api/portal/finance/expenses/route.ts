import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createFinanceExpense,
  createFinanceFileRecord,
  exportFinanceRowsToCsv,
  listFinanceExpenses,
} from "@/lib/finance-db";
import { csvHeaders, requireFinanceSuperAdmin } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const createSchema = z.object({
  vendorName: z.string().trim().min(2).max(200),
  date: z.string().trim().min(8),
  subcategory: z.string().trim().max(120).optional(),
  amount: z.coerce.number().positive(),
  currency: z.enum(["UGX", "USD"]).default("UGX"),
  paymentMethod: z.enum(["cash", "bank_transfer", "mobile_money", "cheque", "other"]),
  description: z.string().trim().min(2).max(2000),
  notes: z.string().trim().max(2000).optional(),
});

function normalizeTextField(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export async function GET(request: NextRequest) {
  const auth = await requireFinanceSuperAdmin();
  if (auth.error) {
    return auth.error;
  }

  const status = request.nextUrl.searchParams.get("status") || undefined;
  const fromDate = request.nextUrl.searchParams.get("from") || undefined;
  const toDate = request.nextUrl.searchParams.get("to") || undefined;
  const subcategory = request.nextUrl.searchParams.get("subcategory") || undefined;
  const format = request.nextUrl.searchParams.get("format");

  const expenses = listFinanceExpenses({
    status: status as never,
    fromDate,
    toDate,
    subcategory,
  });

  if (format === "csv") {
    const rows = expenses.map((item) => ({
      expenseNumber: item.expenseNumber,
      date: item.date,
      vendorName: item.vendorName,
      subcategory: item.subcategory || "",
      currency: item.currency,
      amount: item.amount,
      paymentMethod: item.paymentMethod,
      status: item.status,
      createdAt: item.createdAt,
    }));
    const csv = exportFinanceRowsToCsv(rows, [
      "expenseNumber",
      "date",
      "vendorName",
      "subcategory",
      "currency",
      "amount",
      "paymentMethod",
      "status",
      "createdAt",
    ]);
    return new NextResponse(csv, { headers: csvHeaders(`finance-expenses-${Date.now()}.csv`) });
  }

  return NextResponse.json({ expenses });
}

export async function POST(request: NextRequest) {
  const auth = await requireFinanceSuperAdmin();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let payload: z.infer<typeof createSchema>;
    const uploads: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = createSchema.parse({
        vendorName: normalizeTextField(formData.get("vendorName")),
        date: normalizeTextField(formData.get("date")),
        subcategory: normalizeTextField(formData.get("subcategory")) || undefined,
        amount: Number(formData.get("amount") || 0),
        currency: normalizeTextField(formData.get("currency")) || "UGX",
        paymentMethod: normalizeTextField(formData.get("paymentMethod")),
        description: normalizeTextField(formData.get("description")),
        notes: normalizeTextField(formData.get("notes")) || undefined,
      });
      formData.getAll("receipts").forEach((entry) => {
        if (entry instanceof File) {
          uploads.push(entry);
        }
      });
    } else {
      payload = createSchema.parse(await request.json());
    }

    const expense = createFinanceExpense(
      {
        vendorName: payload.vendorName,
        date: payload.date,
        subcategory: payload.subcategory,
        amount: payload.amount,
        currency: payload.currency,
        paymentMethod: payload.paymentMethod,
        description: payload.description,
        notes: payload.notes,
      },
      auth.actor,
    );

    const evidence = [];
    for (const file of uploads) {
      if (!file || file.size <= 0) {
        continue;
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const uploaded = await createFinanceFileRecord(
        {
          sourceType: "expense",
          sourceId: expense.id,
          fileName: file.name,
          bytes,
          mimeType: file.type || "application/octet-stream",
        },
        auth.actor,
      );
      evidence.push(uploaded);
    }

    return NextResponse.json({ expense, evidence }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create expense." },
      { status: 400 },
    );
  }
}

