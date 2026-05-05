import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getDashboardSnapshot } from "@/app/impact/dashboard/dashboard-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Real PDF download for the Public Live Impact Dashboard.
 * Renders the live snapshot as a portable A4 PDF: header, KPI grid,
 * fidelity / parity / funnel summaries, and a domain table. Uses
 * pdf-lib (already in deps) so no native browser dep is required.
 */

const TEAL_RGB = rgb(0.024, 0.416, 0.404);
const ORANGE_RGB = rgb(1, 0.447, 0.207);
const DARK_RGB = rgb(0.06, 0.09, 0.16);
const MUTED_RGB = rgb(0.39, 0.45, 0.55);
const SUBTLE_RGB = rgb(0.58, 0.64, 0.71);
const BORDER_RGB = rgb(0.91, 0.93, 0.95);
const WHITE_RGB = rgb(1, 1, 1);

const NUMBER = new Intl.NumberFormat("en-US");
const PCT = (n: number) => `${n.toFixed(1)}%`;

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return typeof value === "number" ? NUMBER.format(value) : value;
}

type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  helv: PDFFont;
  helvBold: PDFFont;
  width: number;
  height: number;
  cursor: number; // y position from top, decreasing as we render
};

function newPage(ctx: Ctx): void {
  ctx.page = ctx.pdf.addPage([595, 842]); // A4
  ctx.width = ctx.page.getSize().width;
  ctx.height = ctx.page.getSize().height;
  ctx.cursor = ctx.height - 40;
}

function ensure(ctx: Ctx, neededHeight: number): void {
  if (ctx.cursor - neededHeight < 50) newPage(ctx);
}

function drawText(ctx: Ctx, text: string, x: number, opts?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; maxWidth?: number }): void {
  const size = opts?.size ?? 10;
  const font = opts?.bold ? ctx.helvBold : ctx.helv;
  const color = opts?.color ?? DARK_RGB;
  ctx.page.drawText(text, { x, y: ctx.cursor, size, font, color, maxWidth: opts?.maxWidth });
}

function drawLine(ctx: Ctx, color = BORDER_RGB): void {
  ctx.page.drawLine({ start: { x: 40, y: ctx.cursor }, end: { x: ctx.width - 40, y: ctx.cursor }, color, thickness: 0.5 });
}

function gap(ctx: Ctx, n: number): void {
  ctx.cursor -= n;
}

function drawKpiRow(ctx: Ctx, kpis: { label: string; value: string; helper: string }[]): void {
  // 3 per row, 2 rows.
  const cellW = (ctx.width - 80 - 20) / 3; // 40 padding each side, 10 gap × 2
  const cellH = 64;
  const startY = ctx.cursor;
  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i]!;
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = 40 + col * (cellW + 10);
    const y = startY - row * (cellH + 8);
    ctx.page.drawRectangle({
      x, y: y - cellH, width: cellW, height: cellH,
      color: WHITE_RGB, borderColor: BORDER_RGB, borderWidth: 1,
    });
    ctx.page.drawText(kpi.label, { x: x + 10, y: y - 16, size: 7.5, font: ctx.helvBold, color: MUTED_RGB });
    ctx.page.drawText(kpi.value, { x: x + 10, y: y - 36, size: 18, font: ctx.helvBold, color: DARK_RGB });
    ctx.page.drawText(kpi.helper, { x: x + 10, y: y - 54, size: 8, font: ctx.helv, color: SUBTLE_RGB });
  }
  const rowsUsed = Math.ceil(kpis.length / 3);
  ctx.cursor = startY - rowsUsed * (cellH + 8) - 8;
}

function drawSectionHeader(ctx: Ctx, title: string, subtitle?: string): void {
  ensure(ctx, 50);
  drawText(ctx, title, 40, { size: 14, bold: true });
  gap(ctx, 14);
  if (subtitle) {
    drawText(ctx, subtitle, 40, { size: 9, color: MUTED_RGB });
    gap(ctx, 12);
  }
  drawLine(ctx);
  gap(ctx, 12);
}

function drawTwoColTable(ctx: Ctx, rows: { label: string; value: string }[]): void {
  for (const row of rows) {
    ensure(ctx, 16);
    drawText(ctx, row.label, 40, { size: 9.5, color: MUTED_RGB });
    const valueWidth = ctx.helvBold.widthOfTextAtSize(row.value, 9.5);
    ctx.page.drawText(row.value, {
      x: ctx.width - 40 - valueWidth, y: ctx.cursor,
      size: 9.5, font: ctx.helvBold, color: DARK_RGB,
    });
    gap(ctx, 14);
  }
}

export async function GET(_request: Request) {
  const snapshot = await getDashboardSnapshot();

  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const firstPage = pdf.addPage([595, 842]);

  const ctx: Ctx = {
    pdf, page: firstPage, helv, helvBold,
    width: firstPage.getSize().width, height: firstPage.getSize().height,
    cursor: firstPage.getSize().height - 40,
  };

  // ─── Header ────────────────────────────────────────────────
  ctx.page.drawRectangle({ x: 0, y: ctx.height - 90, width: ctx.width, height: 90, color: TEAL_RGB });
  ctx.page.drawText("OZEKI READING BRIDGE FOUNDATION", { x: 40, y: ctx.height - 38, size: 11, font: helvBold, color: WHITE_RGB });
  ctx.page.drawText("Public Live Impact Dashboard", { x: 40, y: ctx.height - 60, size: 18, font: helvBold, color: WHITE_RGB });
  ctx.page.drawText(`Generated ${new Date(snapshot.generatedAt).toLocaleString()} UTC`, { x: 40, y: ctx.height - 80, size: 9, font: helv, color: rgb(0.85, 0.93, 0.93) });
  ctx.cursor = ctx.height - 110;

  // ─── KPI grid ──────────────────────────────────────────────
  drawSectionHeader(ctx, "Headline KPIs");
  const ac = snapshot.assessmentCounts;
  drawKpiRow(ctx, [
    { label: "SCHOOLS SUPPORTED", value: dash(snapshot.reach?.schoolsReached ?? 0), helper: `${snapshot.reach?.districtsReached ?? 0} districts` },
    { label: "READING TEACHERS", value: dash(snapshot.cost.teachersTrained), helper: `${snapshot.observation.totalSubmitted} observed` },
    { label: "EST. LEARNERS REACHED", value: dash(snapshot.cost.learnersReached), helper: `${dash(snapshot.cost.learnersImproved)} improved` },
    { label: "LEARNERS ASSESSED", value: dash(ac.total), helper: `${ac.baseline} baseline / ${ac.endline} endline` },
    { label: "COACHING VISITS", value: dash(snapshot.coaching?.completedLast90d ?? 0), helper: `${snapshot.coaching?.completionPct ?? 0}% on schedule (90d)` },
    { label: "ASSESSMENTS (B/P/E)", value: `${ac.baseline}/${ac.progress}/${ac.endline}`, helper: `${dash(ac.total)} total` },
  ]);

  // ─── Teaching Quality ──────────────────────────────────────
  drawSectionHeader(ctx, "Teaching Quality", "From submitted teacher-lesson observations.");
  const obs = snapshot.observation;
  drawTwoColTable(ctx, [
    { label: "Total submitted observations", value: dash(obs.totalSubmitted) },
    { label: "Fidelity", value: `${dash(obs.fidelityCount)} (${obs.fidelityPct}%)` },
    { label: "Partial", value: dash(obs.partialCount) },
    { label: "Low", value: dash(obs.lowCount) },
  ]);
  gap(ctx, 8);

  // ─── Funnel ────────────────────────────────────────────────
  drawSectionHeader(ctx, "Conversion Funnel", "Schools → contacted → baseline → in-class → endline.");
  const f = snapshot.funnel;
  drawTwoColTable(ctx, [
    { label: "Schools trusted", value: dash(f.schoolsTrusted) },
    { label: "Contacted / visited", value: dash(f.contactedOrVisited) },
    { label: "Baseline assessed (distinct learners)", value: dash(f.baselineAssessed) },
    { label: "In-class assessed", value: dash(f.inClassAssessed) },
    { label: "Endline assessed", value: dash(f.endlineAssessed) },
  ]);
  gap(ctx, 8);

  // ─── Reading improvement by grade band ──────────────────────
  drawSectionHeader(ctx, "Reading Improvement by Grade Band", "Paired baseline → endline learners (reading_stage_order delta > 0).");
  drawTwoColTable(ctx, snapshot.gradeBandImprovement.map((b) => ({
    label: b.band,
    value: b.paired > 0 ? `${b.improved}/${b.paired} (${b.improvedPct}%)` : "no paired data",
  })));
  gap(ctx, 8);

  // ─── Gender parity ─────────────────────────────────────────
  drawSectionHeader(ctx, "Gender Parity (school_learners)");
  drawTwoColTable(ctx, [
    { label: "Total learners on roster", value: dash(snapshot.parity.total) },
    { label: "Male", value: `${dash(snapshot.parity.male)} (${snapshot.parity.malePct}%)` },
    { label: "Female", value: `${dash(snapshot.parity.female)} (${snapshot.parity.femalePct}%)` },
  ]);
  gap(ctx, 8);

  // ─── Domain mastery ────────────────────────────────────────
  drawSectionHeader(ctx, "Learning Outcomes by Domain", "Mastery share across assessment_records.");
  drawTwoColTable(ctx, snapshot.domainMastery.map((d) => ({
    label: d.label,
    value: d.total > 0 ? `${d.mastered}/${d.total} (${d.masteredPct}%)` : "no data yet",
  })));
  gap(ctx, 8);

  // ─── Cost per beneficiary ─────────────────────────────────
  drawSectionHeader(ctx, "Cost per Beneficiary (USD)", "Programme spend ÷ beneficiary cohort.");
  const cf = snapshot.cost.figures;
  drawTwoColTable(ctx, [
    { label: "Per learner reached", value: cf.learnersReached.costPerUnitUsd != null ? `$${cf.learnersReached.costPerUnitUsd.toFixed(2)}` : "—" },
    { label: "Per learner improved", value: cf.learnersImproved.costPerUnitUsd != null ? `$${cf.learnersImproved.costPerUnitUsd.toFixed(2)}` : "—" },
    { label: "Per teacher trained", value: cf.teachersTrained.costPerUnitUsd != null ? `$${cf.teachersTrained.costPerUnitUsd.toFixed(2)}` : "—" },
    { label: "Programme spend (UGX)", value: PCT(0).startsWith("0") ? new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(snapshot.cost.programmeSpendUgx) : "—" },
  ]);
  gap(ctx, 8);

  // ─── Implementation health ─────────────────────────────────
  drawSectionHeader(ctx, "Implementation Health");
  drawTwoColTable(ctx, [
    { label: "Assessment completion %", value: PCT(snapshot.assessmentCompletion.completionPct) },
    { label: "Non-reader reduction", value: snapshot.nonReaderReduction.baselinePreReaders > 0 ? `${snapshot.nonReaderReduction.reduction} (${snapshot.nonReaderReduction.reductionPct}%)` : "—" },
    { label: "Stories published this month", value: dash(snapshot.stories?.newThisMonth ?? 0) },
    { label: "Stories total", value: dash(snapshot.stories?.totalPublished ?? 0) },
  ]);

  // ─── Footer ────────────────────────────────────────────────
  const lastPage = pdf.getPages()[pdf.getPageCount() - 1]!;
  lastPage.drawText(
    "Live snapshot from the Ozeki Reading Bridge Foundation production database. " +
      "Methodology: assessment_records (mastery_status), teacher_lesson_observations (overall_post_observation_rating), " +
      "coaching_visits (last 90 days), school_engagements + assessment_schedule_windows.",
    { x: 40, y: 50, size: 7, font: helv, color: SUBTLE_RGB, maxWidth: 515 },
  );
  lastPage.drawText(`ozekiread.org · ${new Date().toISOString().slice(0, 10)}`, {
    x: 40, y: 30, size: 7, font: helv, color: SUBTLE_RGB,
  });

  void ORANGE_RGB; // reserved for future accent — keep the token alive

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ozeki-public-impact-dashboard-${new Date().toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
