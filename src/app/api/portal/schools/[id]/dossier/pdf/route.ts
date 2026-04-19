import { NextRequest, NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { buildSchoolDossierPostgres, type SchoolDossier } from "@/lib/server/postgres/repositories/school-intelligence";
import { renderBrandedPdf } from "@/lib/server/pdf/render";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function renderDossierHtml(d: SchoolDossier): string {
  const health = d.health;
  const t = d.trajectory;
  const roster = d.teacherRoster;
  const grad = d.graduation;
  const comp = d.districtComparison;

  const bandColor = (band: string) => {
    if (band === "Excellent") return "#047857";
    if (band === "Strong") return "#0284c7";
    if (band === "Developing") return "#d97706";
    if (band === "At Risk") return "#dc2626";
    return "#64748b";
  };

  const trajectoryColor = (band: string) => {
    if (band === "Accelerating") return "#047857";
    if (band === "Steady") return "#0284c7";
    if (band === "Stagnating") return "#d97706";
    if (band === "Regressing") return "#dc2626";
    return "#64748b";
  };

  const percentChip = (pct: number | null) => {
    if (pct == null) return "—";
    return `Top ${100 - pct}% in district`;
  };

  const criteriaRows = grad.criteria
    .map(
      (c) => `
      <tr>
        <td>${c.label}</td>
        <td>${c.target}</td>
        <td>${c.actual}</td>
        <td class="center">${c.met ? "✓" : "✗"}</td>
      </tr>`,
    )
    .join("");

  const trajectorySeriesText = t.series.length > 0
    ? t.series.map((s) => `${s.period}: ${s.score}%`).join("  ·  ")
    : "No assessment cycles recorded";

  return `
    <style>
      .dossier-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
      .score-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
      .score-big { font-size: 38px; font-weight: 800; line-height: 1; }
      .score-band { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
      .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
      .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
      .kpi-value { font-size: 20px; font-weight: 700; }
      .kpi-label { font-size: 10px; color: #64748b; margin-top: 2px; }
      .section-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      table th { background: #f1f5f9; text-align: left; padding: 5px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
      table td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
      .center { text-align: center; }
      .meta-row { font-size: 10px; color: #64748b; margin-top: 2px; }
    </style>

    <h2 style="margin: 0 0 2px;">${d.schoolName}</h2>
    <p class="meta-row">${d.schoolCode} · ${d.district} · ${d.subCounty} · ${d.enrollmentTotal.toLocaleString()} learners enrolled</p>

    <div class="dossier-grid">
      <!-- Health Score -->
      <div class="score-card">
        <p class="section-title" style="margin-top: 0;">School Health</p>
        <div class="score-big" style="color: ${bandColor(health.band)};">${health.overall}<span style="font-size: 18px; color: #94a3b8;">/100</span></div>
        <p class="score-band" style="color: ${bandColor(health.band)};">${health.band}</p>
        <div class="kpi-row">
          <div class="kpi">
            <div class="kpi-value">${health.components.literacyOutcomes}</div>
            <div class="kpi-label">Literacy</div>
          </div>
          <div class="kpi">
            <div class="kpi-value">${health.components.implementationFidelity}</div>
            <div class="kpi-label">Fidelity</div>
          </div>
          <div class="kpi">
            <div class="kpi-value">${health.components.coachingFrequency}</div>
            <div class="kpi-label">Coaching</div>
          </div>
          <div class="kpi">
            <div class="kpi-value">${health.components.trainingCoverage}</div>
            <div class="kpi-label">Training</div>
          </div>
        </div>
      </div>

      <!-- Trajectory -->
      <div class="score-card">
        <p class="section-title" style="margin-top: 0;">Trajectory</p>
        <div class="score-big" style="color: ${trajectoryColor(t.band)};">${t.band}</div>
        <p class="meta-row">
          ${t.deltaVsEarliest != null
            ? `<strong>${t.deltaVsEarliest >= 0 ? "+" : ""}${t.deltaVsEarliest} pp</strong> from baseline to latest`
            : "Insufficient data to compute trajectory."}
        </p>
        <p class="meta-row" style="margin-top: 6px;">${trajectorySeriesText}</p>
      </div>
    </div>

    <!-- Teacher Roster + District Comparison -->
    <div class="dossier-grid">
      <div class="score-card">
        <p class="section-title" style="margin-top: 0;">Teacher Roster</p>
        <div style="font-size: 22px; font-weight: 700;">${roster.trained}<span style="font-size: 14px; color: #64748b;"> / ${roster.total}</span></div>
        <p class="meta-row">trained teachers</p>
        <div class="kpi-row" style="grid-template-columns: repeat(3, 1fr);">
          <div class="kpi"><div class="kpi-value">${roster.observed}</div><div class="kpi-label">Observed</div></div>
          <div class="kpi"><div class="kpi-value">${roster.withAssessmentData}</div><div class="kpi-label">Assessed</div></div>
          <div class="kpi" style="${roster.untrained > 0 ? "background:#fef2f2;border-color:#fecaca;" : ""}"><div class="kpi-value" style="${roster.untrained > 0 ? "color:#dc2626;" : ""}">${roster.untrained}</div><div class="kpi-label">Untrained</div></div>
        </div>
      </div>

      <div class="score-card">
        <p class="section-title" style="margin-top: 0;">District Comparison</p>
        <div style="font-size: 22px; font-weight: 700;">#${comp.rankInDistrict ?? "—"}<span style="font-size: 14px; color: #64748b;"> / ${comp.totalInDistrict}</span></div>
        <p class="meta-row">${percentChip(comp.percentile)}</p>
        <p class="meta-row" style="margin-top: 6px;">
          School: <strong>${comp.thisSchoolScore}</strong>
          · District avg: <strong>${comp.districtAverage}</strong>
          · Median: <strong>${comp.districtMedian}</strong>
        </p>
      </div>
    </div>

    <!-- Graduation Readiness -->
    <p class="section-title">Graduation Readiness — ${grad.score}/100 ${grad.ready ? "✓ Ready" : "· In Progress"}</p>
    <table>
      <thead>
        <tr>
          <th>Criterion</th>
          <th>Target</th>
          <th>Actual</th>
          <th class="center">Met</th>
        </tr>
      </thead>
      <tbody>${criteriaRows}</tbody>
    </table>

    <p class="meta-row" style="margin-top: 14px; font-style: italic;">
      Based on ${health.sampleSizes.assessments} assessments,
      ${health.sampleSizes.observations} lesson observations,
      ${health.sampleSizes.visits} coaching visits in the past 12 months,
      and ${health.sampleSizes.teachers} teachers on roster.
    </p>
  `;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requirePortalStaffUser();
    const { id } = await params;
    const dossier = await buildSchoolDossierPostgres(Number(id));
    if (!dossier) return NextResponse.json({ error: "School not found." }, { status: 404 });

    const html = renderDossierHtml(dossier);
    const pdfBuffer = await renderBrandedPdf({
      title: `${dossier.schoolName} — School Brief`,
      subtitle: `${dossier.district} · ${dossier.schoolCode}`,
      contentHtml: html,
      documentNumber: `SCH-${dossier.schoolId}-BRIEF`,
      footerNote: `Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · Confidential internal use`,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="school-brief-${dossier.schoolId}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("[schools/dossier/pdf] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
