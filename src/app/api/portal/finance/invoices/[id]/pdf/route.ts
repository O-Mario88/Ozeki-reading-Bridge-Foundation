import { NextResponse } from "next/server";
import { getPortalUserOrRedirect } from "@/lib/auth-server";
import { getFinanceInvoiceByIdPostgres, getFinanceSettingsPostgres } from "@/lib/server/postgres/repositories/finance";
import { queryPostgres } from "@/lib/server/postgres/client";
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

    // Fetch contact details for the Billed To section
    let contact: { name: string; emails?: string[]; phone?: string; address?: string } | undefined;
    try {
      const contactResult = await queryPostgres(
        `SELECT name, emails_json AS "emailsJson", phone, address FROM finance_contacts WHERE id = $1 LIMIT 1`,
        [invoice.contactId],
      );
      const row = contactResult.rows[0] as Record<string, unknown> | undefined;
      if (row) {
        let emails: string[] = [];
        try { emails = JSON.parse(String(row.emailsJson || "[]")); } catch { /* ignore */ }
        contact = {
          name: String(row.name || ""),
          emails: Array.isArray(emails) ? emails : [],
          phone: row.phone ? String(row.phone) : undefined,
          address: row.address ? String(row.address) : undefined,
        };
      }
    } catch { /* proceed without contact details */ }

    const { html, css } = buildInvoiceHtml(invoice, invoice.lineItems, settings, contact);

    const pdfBuffer = await renderBrandedPdf({
      title: "INVOICE",
      subtitle: `Invoice #${invoice.invoiceNumber} | Issued: ${formatReportDate(invoice.issueDate)}`,
      documentNumber: invoice.invoiceNumber,
      footerNote: "Ozeki Financial Systems - Verified Invoice Document",
      accentHex: "#1f2a44",
      contentHtml: html,
      additionalCss: css,
      marginTop: "8mm",
      marginLeft: "8mm",
      marginRight: "8mm",
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
