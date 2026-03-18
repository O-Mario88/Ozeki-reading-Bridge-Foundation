import { NextResponse } from "next/server";
import { getPortalUserOrRedirect } from "@/lib/auth-server";
import { getFinanceInvoiceByIdPostgres, getFinanceSettingsPostgres } from "@/lib/server/postgres/repositories/finance";
import { buildInvoiceHtml, formatReportDate } from "@/lib/server/pdf/finance-pdf-templates";
import { renderBrandedPdf } from "@/lib/server/pdf/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await getPortalUserOrRedirect();
    const params = await props.params;

    const invoiceId = Number(params.id);
    if (!invoiceId || isNaN(invoiceId)) {
      return new NextResponse("Invalid invoice ID", { status: 400 });
    }

    const [invoice, settings] = await Promise.all([
      getFinanceInvoiceByIdPostgres(invoiceId),
      getFinanceSettingsPostgres()
    ]);

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    const { html, css } = buildInvoiceHtml(invoice, invoice.lineItems, settings);

    const pdfBuffer = await renderBrandedPdf({
      title: "INVOICE",
      subtitle: `Invoice #${invoice.invoiceNumber} | Issued: ${formatReportDate(invoice.issueDate)}`,
      documentNumber: invoice.invoiceNumber,
      footerNote: "Ozeki Financial Systems - Verified Invoice Document",
      accentHex: "#1f2a44",
      contentHtml: html,
      additionalCss: css,
      marginBottom: "8mm",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice_${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
