import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { getAnnualReportDataPostgres, type AnnualReportData } from "@/lib/server/postgres/repositories/finance-intelligence";
import { renderBrandedPdf } from "@/lib/server/pdf/render";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ year: string }> };

function fmtUgx(n: number): string {
  return `UGX ${n.toLocaleString()}`;
}
function fmtUsd(n: number): string {
  return `USD ${n.toLocaleString()}`;
}

function renderAnnualReportHtml(d: AnnualReportData): string {
  const h = d.headlines;
  const o = d.outcomes;
  const g = d.geography;

  const categoryRows = d.finance.categoryBreakdown
    .map((c) => `<tr><td>${c.category}</td><td>${fmtUgx(c.totalUgx)}</td><td class="right">${c.pctOfSpend}%</td></tr>`)
    .join("");

  const donorRows = d.finance.topDonorsAnonymized
    .filter((x) => x.amountUgx > 0)
    .map((x) => `<tr><td>${x.label}</td><td class="right">${fmtUgx(x.amountUgx)}</td></tr>`)
    .join("");

  const districtRows = g.topDistricts
    .map((x) => `<tr><td>${x.district}</td><td class="right">${x.learners.toLocaleString()}</td><td class="right">${x.schools}</td></tr>`)
    .join("");

  return `
    <style>
      h2 { margin: 22px 0 8px; font-size: 16px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
      h3 { margin: 16px 0 6px; font-size: 13px; color: #334155; }
      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0; }
      .kpi-tile { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
      .kpi-value { font-size: 22px; font-weight: 800; color: #0f172a; }
      .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 6px 0 10px; }
      th { text-align: left; background: #f1f5f9; padding: 5px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
      td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
      td.right, th.right { text-align: right; }
      .narrative { font-size: 11px; line-height: 1.55; color: #334155; margin: 6px 0; }
      .highlight-banner { background: #006b61; color: white; padding: 16px 18px; border-radius: 8px; margin-top: 10px; }
      .highlight-banner p { margin: 4px 0; font-size: 11px; }
    </style>

    <p class="narrative">
      <strong>Annual Report ${d.year}</strong> — Covering programme delivery, learner outcomes, and
      financial stewardship from ${d.rangeStart} to ${d.rangeEnd}. Data drawn live from the
      Ozeki programme database on ${new Date(d.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}.
    </p>

    <div class="highlight-banner">
      <p><strong>Headline:</strong> ${h.schoolsSupported.toLocaleString()} schools supported ·
        ${h.teachersTrained.toLocaleString()} teachers trained ·
        ${h.learnersAssessed.toLocaleString()} learners assessed</p>
      ${o.improvementPp != null
        ? `<p><strong>Outcome:</strong> learner comprehension improved by <strong>${o.improvementPp >= 0 ? "+" : ""}${o.improvementPp} pp</strong> from baseline to endline.</p>`
        : ""}
      <p><strong>Stewardship:</strong> ${h.programmeDeliveryPct}% of expenditure went directly to programme delivery.</p>
    </div>

    <h2>1. Programme Delivery at a Glance</h2>
    <div class="kpi-grid">
      <div class="kpi-tile"><div class="kpi-value">${h.schoolsSupported.toLocaleString()}</div><div class="kpi-label">Schools Supported</div></div>
      <div class="kpi-tile"><div class="kpi-value">${h.teachersTrained.toLocaleString()}</div><div class="kpi-label">Teachers Trained</div></div>
      <div class="kpi-tile"><div class="kpi-value">${h.learnersAssessed.toLocaleString()}</div><div class="kpi-label">Learners Assessed</div></div>
      <div class="kpi-tile"><div class="kpi-value">${h.coachingVisits.toLocaleString()}</div><div class="kpi-label">Coaching Visits</div></div>
      <div class="kpi-tile"><div class="kpi-value">${h.trainingSessions.toLocaleString()}</div><div class="kpi-label">Training Sessions</div></div>
      <div class="kpi-tile"><div class="kpi-value">${o.fidelityObservations}</div><div class="kpi-label">Lesson Observations</div></div>
      <div class="kpi-tile"><div class="kpi-value">${o.fidelityPct}%</div><div class="kpi-label">Fidelity Rate</div></div>
      <div class="kpi-tile"><div class="kpi-value">${h.programmeDeliveryPct}%</div><div class="kpi-label">Programme Delivery</div></div>
    </div>

    <h2>2. Learner Reading Outcomes</h2>
    <p class="narrative">
      Reading comprehension is measured at baseline (before programme support) and endline (after the
      programme cycle completes). A positive delta indicates learners reading better after the intervention.
    </p>
    <div class="kpi-grid">
      <div class="kpi-tile">
        <div class="kpi-value">${o.baselineComprehension != null ? `${o.baselineComprehension}%` : "—"}</div>
        <div class="kpi-label">Baseline Comprehension</div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-value">${o.endlineComprehension != null ? `${o.endlineComprehension}%` : "—"}</div>
        <div class="kpi-label">Endline Comprehension</div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-value">${o.improvementPp != null ? (o.improvementPp >= 0 ? `+${o.improvementPp}` : o.improvementPp) + " pp" : "—"}</div>
        <div class="kpi-label">Improvement</div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-value">${o.assessedThisYear.toLocaleString()}</div>
        <div class="kpi-label">Learners in Sample</div>
      </div>
    </div>

    <h2>3. Geographic Reach</h2>
    <div class="kpi-grid">
      <div class="kpi-tile"><div class="kpi-value">${g.regionsCovered}</div><div class="kpi-label">Regions</div></div>
      <div class="kpi-tile"><div class="kpi-value">${g.districtsCovered}</div><div class="kpi-label">Districts</div></div>
      <div class="kpi-tile"><div class="kpi-value">${g.subCountiesCovered}</div><div class="kpi-label">Sub-counties</div></div>
      <div class="kpi-tile"><div class="kpi-value">${g.topDistricts.length}</div><div class="kpi-label">Top Focus Districts</div></div>
    </div>
    ${g.topDistricts.length > 0 ? `
      <h3>Top 10 districts by learners reached</h3>
      <table>
        <thead><tr><th>District</th><th class="right">Learners</th><th class="right">Schools</th></tr></thead>
        <tbody>${districtRows}</tbody>
      </table>
    ` : ""}

    <h2>4. Financial Stewardship</h2>
    <div class="kpi-grid">
      <div class="kpi-tile"><div class="kpi-value">${fmtUgx(h.totalReceivedUgx)}</div><div class="kpi-label">Total Received</div></div>
      <div class="kpi-tile"><div class="kpi-value">${fmtUgx(h.totalSpentUgx)}</div><div class="kpi-label">Total Spent</div></div>
      <div class="kpi-tile"><div class="kpi-value">${h.programmeDeliveryPct}%</div><div class="kpi-label">Programme Delivery</div></div>
      <div class="kpi-tile"><div class="kpi-value">${fmtUgx(h.costPerLearnerUgx)}</div><div class="kpi-label">Cost Per Learner</div></div>
    </div>

    <h3>Expenditure by category</h3>
    <table>
      <thead><tr><th>Category</th><th>Amount</th><th class="right">% of spend</th></tr></thead>
      <tbody>${categoryRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;font-style:italic;">No categorised expenditure in this period.</td></tr>'}</tbody>
    </table>

    ${donorRows ? `
      <h3>Income by source</h3>
      <table>
        <thead><tr><th>Source</th><th class="right">Amount</th></tr></thead>
        <tbody>${donorRows}</tbody>
      </table>
    ` : ""}

    <p class="narrative" style="margin-top: 18px;">
      <em>This report is generated automatically from live programme and finance data. All figures are subject
      to year-end audit adjustments. Cost-per-learner is computed as total programme expenditure ÷ learners
      assessed in the reporting period. &ldquo;Programme delivery%&rdquo; excludes categorised administrative
      and overhead costs.</em>
    </p>
  `;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { year } = await params;
    const y = Number(year);
    if (!Number.isInteger(y) || y < 2020 || y > 2050) {
      return NextResponse.json({ error: "Invalid year." }, { status: 400 });
    }

    const data = await getAnnualReportDataPostgres(y);
    const html = renderAnnualReportHtml(data);
    const pdfBuffer = await renderBrandedPdf({
      title: `Ozeki Foundation — Annual Report ${y}`,
      subtitle: `Programme outcomes & financial stewardship · ${data.rangeStart} to ${data.rangeEnd}`,
      contentHtml: html,
      documentNumber: `ANR-${y}`,
      footerNote: `Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · Live data from Ozeki programme database`,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ozeki-annual-report-${y}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("[annual-report/pdf] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
