import { NextResponse } from "next/server";
import { getPortalUserOrRedirect } from "@/lib/auth-server";
import { getPortalOperationalReportsData } from "@/services/dataService";
import { buildOperationsWorkspaceHtml } from "@/lib/server/pdf/program-pdf-templates";
import { renderBrandedPdf } from "@/lib/server/pdf/render";
import { formatReportDate } from "@/lib/server/pdf/finance-pdf-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request) {
  try {
    const user = await getPortalUserOrRedirect();

    const hasAccess =
      user.role === "Volunteer" ||
      user.role === "Staff" ||
      user.role === "Admin" ||
      user.isAdmin ||
      user.isSuperAdmin;

    if (!hasAccess) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const reportsData = await getPortalOperationalReportsData(user);

    if (!reportsData) {
      return new NextResponse("Data not available", { status: 404 });
    }

    const { html, css } = buildOperationsWorkspaceHtml(reportsData);

    const pdfBuffer = await renderBrandedPdf({
      title: "OPERATIONS SUMMARY",
      subtitle: `National Portfolio | Generated: ${formatReportDate(reportsData.generatedAt)}`,
      documentNumber: `OPS-${new Date().getFullYear()}`,
      footerNote: "Ozeki Operations Systems - Official Reporting Document",
      accentHex: "#1f2a44",
      contentHtml: html,
      additionalCss: css,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Operations_Summary_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating Operations PDF:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
