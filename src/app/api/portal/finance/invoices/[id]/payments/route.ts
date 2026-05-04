import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createFinanceFileRecord,
  listFinancePayments,
  recordFinancePayment,
} from "@/services/financeService";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const payloadSchema = z.object({
  date: z.string().trim().min(8),
  amount: z.coerce.number().positive(),
  method: z.enum(["cash", "bank_transfer", "mobile_money", "cheque", "other"]),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const allowedEvidenceMimePrefix = ["image/", "application/pdf"];

function isAllowedEvidenceMime(type: string) {
  return allowedEvidenceMimePrefix.some((prefix) => type.startsWith(prefix));
}

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
  return NextResponse.json({ payments: listFinancePayments({ invoiceId }) });
}

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
    const contentType = request.headers.get("content-type") || "";
    let payload: z.infer<typeof payloadSchema>;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = payloadSchema.parse({
        date: String(formData.get("date") || ""),
        amount: Number(formData.get("amount") || 0),
        method: String(formData.get("method") || ""),
        reference: String(formData.get("reference") || ""),
        notes: String(formData.get("notes") || ""),
      });
      files = formData.getAll("evidence").filter((item): item is File => item instanceof File);
    } else {
      payload = payloadSchema.parse(await request.json());
    }

    const paymentResult = await recordFinancePayment(
      {
        invoiceId: invoiceId,
        date: payload.date,
        amount: payload.amount,
        method: payload.method,
        reference: payload.reference,
        notes: payload.notes,
      },
      invoiceId,
      auth.actor,
    );
    if (!paymentResult?.payment) {
      throw new Error("Failed to create payment.");
    }

    const uploaded = [];
    for (const file of files) {
      if (!file || file.size <= 0) {
        continue;
      }
      if (!isAllowedEvidenceMime(file.type || "")) {
        throw new Error("Only PDF and image evidence files are allowed.");
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const stored = await createFinanceFileRecord(
        {
          sourceType: "payment_evidence",
          sourceId: paymentResult.payment.id,
          fileName: file.name,
          bytes,
          mimeType: file.type || "application/octet-stream",
        },
        auth.actor,
      );
      uploaded.push(stored);
    }

    await auditLog({
      actor: { id: auth.actor.id, name: auth.actor.userName },
      action: "create",
      targetTable: "finance_payments",
      targetId: paymentResult.payment.id,
      after: paymentResult.payment,
      detail: `Recorded payment of ${payload.amount} on invoice ${invoiceId}`,
      request,
    });
    return NextResponse.json(
      {
        payment: paymentResult.payment,
        invoice: paymentResult.invoice,
        autoReceipt: paymentResult.autoReceipt,
        evidence: uploaded,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record payment." },
      { status: 400 },
    );
  }
}
