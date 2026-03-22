import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getPortalUserOrRedirect } from "@/lib/auth-server";
import { getFinanceReceiptByIdPostgres, getFinanceInvoiceByIdPostgres } from "@/lib/server/postgres/repositories/finance";
import { renderReceiptPdf } from "@/lib/server/pdf/finance-pdf-direct";
import type { FinancePaymentAllocationRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await getPortalUserOrRedirect();
    const params = await props.params;

    const receiptId = Number(params.id);
    if (!receiptId || isNaN(receiptId)) {
      return new NextResponse("Invalid receipt ID", { status: 400 });
    }

    const receipt = await getFinanceReceiptByIdPostgres(receiptId);

    if (!receipt) {
      return new NextResponse("Receipt not found", { status: 404 });
    }

    const allocations: FinancePaymentAllocationRecord[] = [];
    if (receipt.relatedInvoiceId) {
      // Look up the related invoice to get its number
      const relatedInvoice = await getFinanceInvoiceByIdPostgres(receipt.relatedInvoiceId);
      if (relatedInvoice) {
        allocations.push({
          id: 0,
          paymentId: receipt.id,
          invoiceId: relatedInvoice.id,
          allocatedAmount: receipt.amountReceived,
          invoiceNumber: relatedInvoice.invoiceNumber,
          createdBy: receipt.createdBy,
          createdAt: receipt.createdAt
        });
      }
    }

    const pdfBuffer = await renderReceiptPdf(receipt, allocations);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Receipt_${receipt.receiptNumber}.pdf"`,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error generating receipt PDF:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}

