import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCurrentExternalUser } from "@/lib/external-auth";
import { auditLog } from "@/lib/server/audit/log";
import { getDonorTaxSummaryForYear } from "@/lib/server/postgres/repositories/donor-portfolio";

export const runtime = "nodejs";

const UGX = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const { ref } = await context.params;
  const user = await getCurrentExternalUser();
  if (!user || user.role !== "donor" || user.refCode !== ref) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const fyParam = Number(url.searchParams.get("fy") ?? new Date().getUTCFullYear());
  const fy = Number.isInteger(fyParam) && fyParam >= 2000 && fyParam <= 3000
    ? fyParam
    : new Date().getUTCFullYear();

  const summary = await getDonorTaxSummaryForYear(user.id, fy);

  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();

  const teal = rgb(0.024, 0.416, 0.404);
  const dark = rgb(0.12, 0.12, 0.15);
  const muted = rgb(0.42, 0.45, 0.5);

  // Header
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: teal });
  page.drawText("OZEKI READING BRIDGE FOUNDATION", { x: 40, y: height - 38, size: 12, font: helvBold, color: rgb(1, 1, 1) });
  page.drawText("Donor Tax-Deduction Summary", { x: 40, y: height - 60, size: 18, font: helvBold, color: rgb(1, 1, 1) });
  page.drawText(`Fiscal year: ${fy}`, { x: 40, y: height - 80, size: 11, font: helv, color: rgb(0.85, 0.93, 0.93) });

  // Donor block
  let y = height - 130;
  page.drawText("Donor", { x: 40, y, size: 9, font: helvBold, color: muted });
  y -= 14;
  page.drawText(user.fullName, { x: 40, y, size: 13, font: helvBold, color: dark });
  y -= 14;
  if (user.email) {
    page.drawText(user.email, { x: 40, y, size: 10, font: helv, color: muted });
    y -= 12;
  }
  if (user.organization) {
    page.drawText(user.organization, { x: 40, y, size: 10, font: helv, color: muted });
    y -= 12;
  }
  page.drawText(`Reference: ${user.refCode}`, { x: 40, y, size: 9, font: helv, color: muted });
  y -= 24;

  // Totals box
  page.drawRectangle({ x: 40, y: y - 64, width: width - 80, height: 60, color: rgb(0.97, 0.99, 0.99), borderColor: teal, borderWidth: 1 });
  page.drawText("Total contributed", { x: 56, y: y - 22, size: 9, font: helvBold, color: muted });
  page.drawText(UGX.format(summary.totalDonationsUgx), { x: 56, y: y - 42, size: 22, font: helvBold, color: dark });
  page.drawText(`${summary.donationCount} contribution${summary.donationCount === 1 ? "" : "s"}`, { x: 56, y: y - 56, size: 9, font: helv, color: muted });

  y -= 90;

  // Table header
  page.drawText("Itemised contributions", { x: 40, y, size: 11, font: helvBold, color: dark });
  y -= 16;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, color: muted, thickness: 0.5 });
  y -= 12;
  page.drawText("Date", { x: 40, y, size: 9, font: helvBold, color: muted });
  page.drawText("Reference", { x: 110, y, size: 9, font: helvBold, color: muted });
  page.drawText("Programme", { x: 220, y, size: 9, font: helvBold, color: muted });
  page.drawText("Amount", { x: width - 100, y, size: 9, font: helvBold, color: muted });
  y -= 8;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, color: muted, thickness: 0.5 });
  y -= 12;

  if (summary.rows.length === 0) {
    page.drawText("No contributions recorded for this fiscal year.", { x: 40, y, size: 10, font: helv, color: muted });
    y -= 16;
  } else {
    for (const row of summary.rows) {
      if (y < 80) break; // first-page only for v1
      page.drawText(row.date, { x: 40, y, size: 9, font: helv, color: dark });
      page.drawText(row.allocationCode.slice(0, 16), { x: 110, y, size: 9, font: helv, color: dark });
      page.drawText(row.programme.slice(0, 36), { x: 220, y, size: 9, font: helv, color: dark });
      const amountText = UGX.format(row.amountUgx);
      const amountWidth = helv.widthOfTextAtSize(amountText, 9);
      page.drawText(amountText, { x: width - 40 - amountWidth, y, size: 9, font: helv, color: dark });
      y -= 14;
    }
  }

  // Footer
  page.drawText(
    "This summary is generated automatically from the Ozeki Reading Bridge Foundation database. " +
      "All figures reflect contributions in Ugandan Shillings (UGX) as recorded at the time of allocation.",
    { x: 40, y: 60, size: 8, font: helv, color: muted, maxWidth: width - 80 },
  );
  page.drawText(`Generated ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC`, {
    x: 40, y: 40, size: 8, font: helv, color: muted,
  });

  const bytes = await pdf.save();

  await auditLog({
    actor: { id: 0, name: `${user.fullName} (donor)` },
    action: "download",
    targetTable: "donor_allocations",
    detail: `Donor downloaded tax summary for FY${fy} (${summary.donationCount} rows, ${summary.totalDonationsUgx} UGX)`,
    request,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ozeki-tax-summary-${fy}-${user.refCode}.pdf"`,
    },
  });
}
