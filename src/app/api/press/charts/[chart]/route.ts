import { NextResponse } from "next/server";
import { getPublicReachFootprint } from "@/lib/server/postgres/repositories/public-metrics";
import { getCostPerBeneficiarySummary } from "@/lib/server/postgres/repositories/cost-per-beneficiary";

export const runtime = "nodejs";
export const revalidate = 600;

const BRAND = "#066a67";
const BRAND_DARK = "#054d4a";
const TEXT = "#111827";
const MUTED = "#6b7280";

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      default: return "&apos;";
    }
  });
}

function svgWrap(width: number, height: number, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="32" y="40" font-family="Inter, Helvetica, Arial, sans-serif" font-size="11" font-weight="700" fill="${BRAND}" letter-spacing="1.5">OZEKI READING BRIDGE FOUNDATION</text>
  ${body}
  <text x="32" y="${height - 20}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="10" fill="${MUTED}">Live data · ozekiread.org</text>
</svg>`;
}

function renderReachChart(stats: { schools: number; districts: number; regions: number; learners: number; teachers: number }): string {
  const items: { label: string; value: number; color: string }[] = [
    { label: "Regions", value: stats.regions, color: BRAND_DARK },
    { label: "Districts", value: stats.districts, color: BRAND },
    { label: "Schools", value: stats.schools, color: "#0ea5a5" },
    { label: "Learners", value: stats.learners, color: "#22c55e" },
    { label: "Teachers", value: stats.teachers, color: "#f97316" },
  ];
  const max = Math.max(...items.map((i) => i.value), 1);
  const barWidth = 120;
  const gap = 28;
  const chartLeft = 60;
  const chartTop = 90;
  const chartHeight = 280;

  const bars = items.map((item, i) => {
    const x = chartLeft + i * (barWidth + gap);
    const h = (item.value / max) * chartHeight;
    const y = chartTop + chartHeight - h;
    const formatted = new Intl.NumberFormat("en-US").format(item.value);
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${item.color}" rx="6" />
      <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="${TEXT}">${formatted}</text>
      <text x="${x + barWidth / 2}" y="${chartTop + chartHeight + 22}" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="11" fill="${MUTED}">${escapeXml(item.label)}</text>
    `;
  }).join("");

  return svgWrap(800, 480, `
    <text x="32" y="68" font-family="Inter, Helvetica, Arial, sans-serif" font-size="22" font-weight="800" fill="${TEXT}">Reach footprint</text>
    ${bars}
  `);
}

function renderCostChart(summary: Awaited<ReturnType<typeof getCostPerBeneficiarySummary>>): string {
  const items: { label: string; value: number | null; color: string }[] = [
    { label: "Per learner reached", value: summary.figures.learnersReached.costPerUnitUsd, color: BRAND },
    { label: "Per learner improved", value: summary.figures.learnersImproved.costPerUnitUsd, color: "#0ea5a5" },
    { label: "Per teacher trained", value: summary.figures.teachersTrained.costPerUnitUsd, color: "#f97316" },
  ];
  const max = Math.max(...items.map((i) => i.value ?? 0), 1);
  const barWidth = 160;
  const gap = 40;
  const chartLeft = 80;
  const chartTop = 90;
  const chartHeight = 260;
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  const bars = items.map((item, i) => {
    const x = chartLeft + i * (barWidth + gap);
    const h = item.value === null ? 0 : (item.value / max) * chartHeight;
    const y = chartTop + chartHeight - h;
    const valueText = item.value !== null ? fmt.format(item.value) : "—";
    return `
      ${item.value !== null ? `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${item.color}" rx="6" />` : ""}
      <text x="${x + barWidth / 2}" y="${item.value !== null ? y - 8 : chartTop + chartHeight - 8}" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="${TEXT}">${escapeXml(valueText)}</text>
      <text x="${x + barWidth / 2}" y="${chartTop + chartHeight + 22}" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="11" fill="${MUTED}">${escapeXml(item.label)}</text>
    `;
  }).join("");

  return svgWrap(800, 480, `
    <text x="32" y="68" font-family="Inter, Helvetica, Arial, sans-serif" font-size="22" font-weight="800" fill="${TEXT}">Cost per beneficiary (USD)</text>
    ${bars}
  `);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ chart: string }> },
) {
  const { chart } = await context.params;

  if (chart === "reach-footprint") {
    const reach = (await getPublicReachFootprint()) ?? { schoolsReached: 0, districtsReached: 0, regionsReached: 0 };
    // Best-effort additional stats — fall back to zero on any error.
    const summary = await getCostPerBeneficiarySummary().catch(() => null);
    const svg = renderReachChart({
      schools: reach.schoolsReached,
      districts: reach.districtsReached,
      regions: reach.regionsReached,
      learners: summary?.learnersReached ?? 0,
      teachers: summary?.teachersTrained ?? 0,
    });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      },
    });
  }

  if (chart === "cost-per-beneficiary") {
    const summary = await getCostPerBeneficiarySummary();
    const svg = renderCostChart(summary);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      },
    });
  }

  return new NextResponse("Unknown chart.", { status: 404 });
}
