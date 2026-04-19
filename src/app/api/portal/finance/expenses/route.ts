import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { FinanceExpenseReceiptRecord } from "@/lib/types";
import {
  createFinanceExpenseAsync,
  createFinanceFileRecord,
  exportFinanceRowsToCsv,
  listFinanceExpenses,
  postFinanceExpenseAsync,
  submitFinanceExpenseAsync,
  upsertFinanceExpenseReceiptsAsync,
} from "@/services/financeService";
import { csvHeaders, requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

const receiptMetadataSchema = z.object({
  fileIndex: z.coerce.number().int().nonnegative(),
  vendorName: z.string().trim().min(2).max(200),
  receiptDate: z.string().trim().min(8),
  receiptAmount: z.coerce.number().positive().max(999_999_999, "Receipt amount exceeds maximum allowed."),
  currency: z.enum(["UGX", "USD"]).default("UGX"),
  referenceNo: z.string().trim().max(120).optional(),
});

const createSchema = z.object({
  vendorName: z.string().trim().min(2).max(200),
  date: z.string().trim().min(8),
  subcategory: z.string().trim().max(120).optional(),
  amount: z.coerce.number().positive().max(999_999_999, "Amount exceeds maximum allowed per transaction."),
  currency: z.enum(["UGX", "USD"]).default("UGX"),
  paymentMethod: z.enum(["cash", "bank_transfer", "mobile_money", "cheque", "other"]),
  description: z.string().trim().min(2).max(2000),
  notes: z.string().trim().max(2000).optional(),
  submitNow: z.boolean().optional(),
  autoPost: z.boolean().optional(),
  receiptMetadata: z.array(receiptMetadataSchema).optional(),
});

function normalizeTextField(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function parseToggleValue(value: FormDataEntryValue | null) {
  const raw = normalizeTextField(value).toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const status = request.nextUrl.searchParams.get("status") || undefined;
  const fromDate = request.nextUrl.searchParams.get("from") || undefined;
  const toDate = request.nextUrl.searchParams.get("to") || undefined;
  const subcategory = request.nextUrl.searchParams.get("subcategory") || undefined;
  const format = request.nextUrl.searchParams.get("format");

  const safeStatus = status && ["draft", "submitted", "posted", "blocked_mismatch", "void"].includes(status)
    ? status
    : undefined;

  const expenses = await listFinanceExpenses({
    status: safeStatus as never,
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
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let payload: z.infer<typeof createSchema>;
    const uploads: File[] = [];
    let parsedReceiptMetadata: z.infer<typeof receiptMetadataSchema>[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const metadataRaw = normalizeTextField(formData.get("receiptMetadata"));
      if (metadataRaw) {
        try {
          parsedReceiptMetadata = z.array(receiptMetadataSchema).parse(JSON.parse(metadataRaw));
        } catch {
          throw new Error("Invalid receipt metadata payload.");
        }
      }
      payload = createSchema.parse({
        vendorName: normalizeTextField(formData.get("vendorName")),
        date: normalizeTextField(formData.get("date")),
        subcategory: normalizeTextField(formData.get("subcategory")) || undefined,
        amount: Number(formData.get("amount") || 0),
        currency: normalizeTextField(formData.get("currency")) || "UGX",
        paymentMethod: normalizeTextField(formData.get("paymentMethod")),
        description: normalizeTextField(formData.get("description")),
        notes: normalizeTextField(formData.get("notes")) || undefined,
        submitNow: parseToggleValue(formData.get("submitNow")),
        autoPost: parseToggleValue(formData.get("autoPost")),
        receiptMetadata: parsedReceiptMetadata,
      });
      formData.getAll("receipts").forEach((entry) => {
        if (entry instanceof File) {
          uploads.push(entry);
        }
      });
    } else {
      payload = createSchema.parse(await request.json());
      parsedReceiptMetadata = payload.receiptMetadata || [];
    }

    const expense = await createFinanceExpenseAsync(
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
    if (!expense) {
      throw new Error("Failed to create expense record.");
    }

    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_MIME_TYPES = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

    for (const file of uploads) {
      if (!file || file.size <= 0) continue;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 10 MB size limit.` },
          { status: 400 },
        );
      }
      const mime = file.type?.toLowerCase() || "";
      if (!ALLOWED_MIME_TYPES.has(mime) && !mime.startsWith("image/")) {
        return NextResponse.json(
          { error: `File "${file.name}" has an unsupported type. Allowed: PDF, JPEG, PNG, WebP.` },
          { status: 400 },
        );
      }
    }

    const evidence = [];
    const evidenceMeta: Array<{
      fileId: number;
      fileHashSha256: string;
    }> = [];
    for (const file of uploads) {
      if (!file || file.size <= 0) {
        continue;
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const fileHashSha256 = crypto.createHash("sha256").update(bytes).digest("hex");

      // Duplicate file detection: reject if this exact file was already uploaded
      const dupFile = await queryPostgres<{ expense_id: number }>(
        `SELECT expense_id FROM finance_expense_receipts WHERE file_hash_sha256 = $1 LIMIT 1`,
        [fileHashSha256],
      );
      if (dupFile.rows.length > 0) {
        return NextResponse.json(
          { error: `File "${file.name}" appears to be a duplicate of a receipt already uploaded on expense ${dupFile.rows[0].expense_id}.` },
          { status: 409 },
        );
      }
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
      evidenceMeta.push({
        fileId: uploaded.id,
        fileHashSha256,
      });
    }

    let linkedReceipts: FinanceExpenseReceiptRecord[] = [];
    if (evidenceMeta.length > 0) {
      const metadataByIndex = new Map(parsedReceiptMetadata.map((item) => [item.fileIndex, item]));
      const defaults = evidenceMeta.length > 0
        ? Number(payload.amount || 0) / evidenceMeta.length
        : Number(payload.amount || 0);

      linkedReceipts = await upsertFinanceExpenseReceiptsAsync(
        expense.id,
        evidenceMeta.map((file, index) => {
          const metadata = metadataByIndex.get(index);
          return {
            fileId: file.fileId,
            fileHashSha256: file.fileHashSha256,
            vendorName: metadata?.vendorName || payload.vendorName,
            receiptDate: metadata?.receiptDate || payload.date,
            receiptAmount: metadata?.receiptAmount ?? defaults,
            currency: metadata?.currency || payload.currency,
            referenceNo: metadata?.referenceNo,
          };
        }),
        auth.actor,
      );
    }

    let finalExpense = expense;
    let submitted = false;
    let autoPosted = false;
    if (payload.submitNow || payload.autoPost) {
      finalExpense = await submitFinanceExpenseAsync(expense.id, auth.actor) as unknown as typeof expense;
      submitted = true;
    }
    if (payload.autoPost) {
      if (linkedReceipts.length === 0) {
        throw new Error("At least one receipt file with metadata is required to post this expense.");
      }
      const posted = await postFinanceExpenseAsync(expense.id, auth.actor);
      if (posted) finalExpense = posted;
      autoPosted = true;
      submitted = true;
    }

    return NextResponse.json({ expense: finalExpense, evidence, linkedReceipts, submitted, autoPosted }, { status: 201 });
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
