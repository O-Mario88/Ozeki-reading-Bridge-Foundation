import { NextResponse } from "next/server";
import {
  getImpactSummary,
  getImpactDrilldownData,
  calculateFidelityScore,
  getFidelityDashboardData,
  getLearningGainsData,
  getCostEffectivenessData,
  runImpactCalculator,
  getDataQualitySummary,
  getGovernmentViewData,
} from "@/lib/db";

export const runtime = "nodejs";

function cachedJson(data: unknown) {
  return NextResponse.json(
    { ...((typeof data === "object" && data !== null) ? data : { data }), lastUpdated: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const level = searchParams.get("level");
  const id = searchParams.get("id") || "Uganda";

  // NLIS views — all return aggregated data only (no child-level identifiers)
  if (view === "fidelity") {
    const scopeType = (level || "country") as "country" | "region" | "district" | "school";
    if (scopeType === "school") {
      return cachedJson(calculateFidelityScore(scopeType, id));
    }
    return cachedJson(
      getFidelityDashboardData(scopeType as "country" | "region" | "district", id),
    );
  }

  if (view === "gains") {
    const period = searchParams.get("period") ?? undefined;
    return cachedJson(
      getLearningGainsData(level || "country", id, period),
    );
  }

  if (view === "cost") {
    const period = searchParams.get("period") ?? undefined;
    return cachedJson(
      getCostEffectivenessData(level || "country", id, period),
    );
  }

  if (view === "calculator") {
    const amount = Number(searchParams.get("amount") || 10000);
    return cachedJson(
      runImpactCalculator(amount, level || "country", id),
    );
  }

  if (view === "quality") {
    return cachedJson(
      getDataQualitySummary(level || "country", id),
    );
  }

  if (view === "government") {
    const period = searchParams.get("period") ?? undefined;
    return cachedJson(getGovernmentViewData(period));
  }

  // Original drill-down views
  if (
    level === "country" ||
    level === "region" ||
    level === "sub_region" ||
    level === "district" ||
    level === "sub_county" ||
    level === "parish" ||
    level === "school"
  ) {
    const data = getImpactDrilldownData(level, id);
    return cachedJson(data);
  }

  return cachedJson(getImpactSummary());
}

