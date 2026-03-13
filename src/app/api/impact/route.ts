import { NextResponse } from "next/server";
import {
  getImpactSummary,
  getCostEffectivenessData,
  runImpactCalculator,
  getGovernmentViewData,
  getPublicImpactAggregate,
} from "@/lib/db";
import {
  buildFidelityFromAggregate,
  buildLearningGainsFromAggregate,
  buildQualitySummaryFromAggregate,
} from "@/lib/public-impact-views";

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

type AggregateScopeLevel = Awaited<ReturnType<typeof getPublicImpactAggregate>>["scope"]["level"];

function normalizeAggregateScopeLevel(
  value: string | null,
): AggregateScopeLevel | null {
  if (!value || value === "country") return "country";
  if (value === "region") return "region";
  if (value === "sub_region" || value === "subregion") return "subregion";
  if (value === "district") return "district";
  if (value === "school") return "school";
  return null;
}

async function getScopedAggregate(level: string | null, id: string, period?: string) {
  const aggregateLevel = normalizeAggregateScopeLevel(level);
  if (!aggregateLevel) {
    return null;
  }
  return getPublicImpactAggregate(
    aggregateLevel,
    aggregateLevel === "country" ? "Uganda" : id,
    period || "FY",
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const level = searchParams.get("level");
  const id = searchParams.get("id") || "Uganda";
  const period = searchParams.get("period") ?? undefined;

  // NLIS views — all return aggregated data only (no child-level identifiers)
  if (view === "fidelity") {
    const aggregate = await getScopedAggregate(level, id, period);
    if (aggregate) {
      return cachedJson(buildFidelityFromAggregate(aggregate, level || "country", id));
    }
  }

  if (view === "gains") {
    const aggregate = await getScopedAggregate(level, id, period);
    if (aggregate) {
      return cachedJson(buildLearningGainsFromAggregate(aggregate, level || "country", id));
    }
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
    const aggregate = await getScopedAggregate(level, id, period);
    if (aggregate) {
      return cachedJson(buildQualitySummaryFromAggregate(aggregate, level || "country", id));
    }
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
    level === "school"
  ) {
    const aggregate = await getScopedAggregate(level, id, period);
    if (aggregate) {
      return cachedJson(aggregate);
    }
  }

  return cachedJson(await getImpactSummary());
}
