import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { getPortalLearningOutcomesSnapshot } from "@/lib/server/postgres/repositories/portal-learning-outcomes";

export const runtime = "nodejs";

/**
 * GET /api/portal/learning-outcomes/export-pdf
 *
 * Single-page A4 export of the Learning Outcomes dashboard. Same
 * pdf-lib pattern as the contact-profile PDF: header strip, KPI grid,
 * domain breakdown, top schools, alerts, footer note.
 */
export async function GET() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const snap = await getPortalLearningOutcomesSnapshot();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.067, 0.094, 0.153);
  const muted = rgb(0.4, 0.45, 0.55);
  const accent = rgb(0.024, 0.416, 0.404);
  const margin = 40;

  // Header strip
  page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: accent });
  page.drawText("Learning Outcomes Report", { x: margin, y: height - 38, size: 18, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`Generated ${new Date().toLocaleString("en-US")}`, { x: margin, y: height - 53, size: 9, font: fontRegular, color: rgb(0.85, 0.92, 0.91) });
  page.drawText("Ozeki Reading Bridge Foundation", { x: width - margin - 220, y: height - 38, size: 11, font: fontBold, color: rgb(1, 1, 1) });

  let y = height - 86;

  // KPI grid (3 cols × 2 rows)
  page.drawText("Headline KPIs", { x: margin, y, size: 12, font: fontBold, color: ink });
  y -= 16;

  const kpis: Array<[string, string, string]> = [
    ["Learners Assessed", snap.kpis.learnersAssessed.value.toLocaleString(), `${snap.kpis.learnersAssessed.deltaPct >= 0 ? "+" : ""}${snap.kpis.learnersAssessed.deltaPct}% vs last term`],
    ["Schools With Data", String(snap.kpis.schoolsWithData.value), `${snap.kpis.schoolsWithData.deltaCount >= 0 ? "+" : ""}${snap.kpis.schoolsWithData.deltaCount} active this month`],
    ["Overall Learning Score", `${snap.kpis.overallLearningScore.value}%`, `${snap.kpis.overallLearningScore.deltaPp >= 0 ? "+" : ""}${snap.kpis.overallLearningScore.deltaPp} pp`],
    ["At/Above Benchmark", `${snap.kpis.atOrAboveBenchmark.value}%`, `${snap.kpis.atOrAboveBenchmark.deltaPp >= 0 ? "+" : ""}${snap.kpis.atOrAboveBenchmark.deltaPp} pp vs baseline`],
    ["Teaching Quality", `${snap.kpis.teachingQualityScore.value}%`, "Observation analysis"],
    ["Reading Progression", `${snap.kpis.readingLevelProgression.value}%`, "Baseline to latest"],
  ];
  const colW = (width - margin * 2) / 3;
  for (let i = 0; i < kpis.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * colW;
    const ry = y - row * 44;
    const k = kpis[i];
    if (!k) continue;
    const [label, value, sub] = k;
    page.drawText(label, { x, y: ry, size: 9, font: fontRegular, color: muted });
    page.drawText(value, { x, y: ry - 13, size: 14, font: fontBold, color: ink });
    page.drawText(sub, { x, y: ry - 26, size: 8.5, font: fontRegular, color: muted });
  }
  y -= 100;

  // Domain mastery
  page.drawText("Learning Outcome Domains", { x: margin, y, size: 12, font: fontBold, color: ink });
  y -= 16;
  for (const d of snap.literacyDomains) {
    page.drawText(d.label, { x: margin, y, size: 10, font: fontRegular, color: muted });
    page.drawText(`${Math.round(d.pct)}%`, { x: margin + 220, y, size: 10, font: fontBold, color: ink });
    page.drawText(`${d.deltaPp >= 0 ? "↑" : "↓"} ${Math.abs(d.deltaPp).toFixed(1)} pp vs baseline`, {
      x: margin + 270, y, size: 9, font: fontRegular, color: d.deltaPp >= 0 ? rgb(0.086, 0.639, 0.290) : rgb(0.86, 0.15, 0.15),
    });
    page.drawText(`n=${d.sampleSize.toLocaleString()}`, { x: margin + 420, y, size: 9, font: fontRegular, color: muted });
    y -= 13;
  }
  y -= 8;

  // Top performing schools
  page.drawText("Top Performing Schools", { x: margin, y, size: 12, font: fontBold, color: ink });
  y -= 16;
  for (const [i, s] of snap.schoolBreakdown.topPerforming.entries()) {
    page.drawText(`${i + 1}.`, { x: margin, y, size: 10, font: fontRegular, color: muted });
    page.drawText(s.schoolName, { x: margin + 16, y, size: 10, font: fontBold, color: ink });
    page.drawText(s.region, { x: margin + 220, y, size: 9, font: fontRegular, color: muted });
    page.drawText(`${s.pct}%`, { x: margin + 360, y, size: 10, font: fontBold, color: accent });
    y -= 13;
  }
  y -= 8;

  // Alerts
  page.drawText("Outcome Alerts", { x: margin, y, size: 12, font: fontBold, color: ink });
  y -= 16;
  for (const a of snap.alerts) {
    page.drawText(`• ${a.count} ${a.label}`, { x: margin, y, size: 10, font: fontRegular, color: ink });
    y -= 13;
  }
  y -= 6;

  // Insight
  page.drawText("Learning Insight", { x: margin, y, size: 12, font: fontBold, color: ink });
  y -= 14;
  // Wrap simple paragraph
  const wrap = (text: string, max: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > max) {
        lines.push(cur.trim());
        cur = w;
      } else cur = cur + " " + w;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  };
  for (const line of wrap(snap.insight, 95)) {
    page.drawText(line, { x: margin, y, size: 9.5, font: fontRegular, color: muted });
    y -= 12;
  }

  // Footer
  page.drawText(
    "All metrics computed deterministically from the production database. Data updated " +
      new Date(snap.generatedAt).toLocaleString("en-US"),
    { x: margin, y: 32, size: 8, font: fontRegular, color: muted },
  );

  const bytes = await pdf.save();
  const filename = `Learning_Outcomes_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
