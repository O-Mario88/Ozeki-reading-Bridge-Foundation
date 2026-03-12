import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { getPublicImpactAggregate } from "@/lib/db";
import {
  buildPublicDashboardReportModel,
  generatePublicDashboardNarrative,
  renderPublicDashboardReportHtml,
} from "@/lib/public-dashboard-report-engine";
import type { PublicReportEngineFormat } from "@/lib/public-dashboard-report-engine";

type PublicScopeLevel = "country" | "region" | "subregion" | "district" | "school";

export const runtime = "nodejs";

function normalizeScopeLevel(value: string | null): PublicScopeLevel | null {
  if (!value) {
    return "country";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "country") return "country";
  if (normalized === "region") return "region";
  if (normalized === "subregion") return "subregion";
  if (normalized === "district") return "district";
  if (normalized === "school") return "school";
  return null;
}

function normalizeFormat(value: string | null): PublicReportEngineFormat {
  const normalized = String(value ?? "html").trim().toLowerCase();
  if (normalized === "json") return "json";
  if (normalized === "pdf") return "pdf";
  return "html";
}

function toFilenameSafe(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return normalized || "uganda";
}

function buildDashboardHref(
  scopeLevel: PublicScopeLevel,
  scopeId: string,
  period: string,
) {
  const query = new URLSearchParams();
  query.set("period", period);

  if (scopeLevel === "region") {
    query.set("region", scopeId);
  }
  if (scopeLevel === "subregion") {
    query.set("subRegion", scopeId);
  }
  if (scopeLevel === "district") {
    query.set("district", scopeId);
  }
  if (scopeLevel === "school") {
    query.set("school", scopeId);
  }

  return `/impact?${query.toString()}`;
}

export async function GET(request: NextRequest) {
  const scopeLevel = normalizeScopeLevel(request.nextUrl.searchParams.get("scopeLevel"));
  if (!scopeLevel) {
    return NextResponse.json({ error: "Invalid scopeLevel." }, { status: 400 });
  }

  const requestedScopeId = String(request.nextUrl.searchParams.get("scopeId") ?? "").trim();
  const scopeId = scopeLevel === "country" ? "Uganda" : requestedScopeId;
  if (scopeLevel !== "country" && !scopeId) {
    return NextResponse.json(
      { error: "scopeId is required for region, subregion, district, and school." },
      { status: 400 },
    );
  }

  const period = String(request.nextUrl.searchParams.get("period") ?? "FY").trim() || "FY";
  const format = normalizeFormat(request.nextUrl.searchParams.get("format"));

  try {
    const aggregate = getPublicImpactAggregate(scopeLevel, scopeId, period);
    const narrative = await generatePublicDashboardNarrative(aggregate);
    const report = buildPublicDashboardReportModel(aggregate, narrative);

    if (format === "json") {
      return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store" } });
    }

    const baseQuery = new URLSearchParams({
      scopeLevel,
      scopeId,
      period,
    });
    const pdfHref = `/api/impact/report-engine?${baseQuery.toString()}&format=pdf`;
    const dashboardHref = buildDashboardHref(scopeLevel, scopeId, period);
    const html = renderPublicDashboardReportHtml({
      report,
      pdfHref,
      dashboardHref,
    });

    if (format === "html") {
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 45_000,
      });
      await page.emulateMediaType("print");

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "12mm",
          right: "12mm",
          bottom: "12mm",
          left: "12mm",
        },
      });

      const filename = `public-dashboard-${scopeLevel}-${toFilenameSafe(scopeId)}-${toFilenameSafe(period)}.pdf`;
      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate report from dashboard data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
