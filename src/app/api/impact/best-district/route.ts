import { NextResponse } from "next/server";
import { getPublicImpactAggregate } from "@/lib/db";
import {
  getReadingLevelPerformanceSummary,
  type ReadingLevelPerformanceSummary,
} from "@/lib/reading-level-performance";
import { parsePeriod } from "@/app/api/impact/helpers";

export const runtime = "nodejs";

type BestDistrictReadingPerformance = {
  district: string;
  performance: ReadingLevelPerformanceSummary;
};

function pickBestDistrict(period: string): BestDistrictReadingPerformance | null {
  const country = getPublicImpactAggregate("country", "Uganda", period);
  const districts = country.navigator.districts ?? [];
  let best: BestDistrictReadingPerformance | null = null;

  for (const district of districts) {
    const aggregate = getPublicImpactAggregate("district", district, period);
    const performance = getReadingLevelPerformanceSummary(aggregate.readingLevels);
    if (!performance) {
      continue;
    }

    if (!best) {
      best = { district, performance };
      continue;
    }

    if (performance.performancePercent > best.performance.performancePercent) {
      best = { district, performance };
      continue;
    }

    if (
      performance.performancePercent === best.performance.performancePercent &&
      performance.sampleSize > best.performance.sampleSize
    ) {
      best = { district, performance };
      continue;
    }

    if (
      performance.performancePercent === best.performance.performancePercent &&
      performance.sampleSize === best.performance.sampleSize &&
      district.localeCompare(best.district) < 0
    ) {
      best = { district, performance };
    }
  }

  return best;
}

export async function GET(request: Request) {
  const period = parsePeriod(request);
  const best = pickBestDistrict(period);

  return NextResponse.json(
    {
      period,
      bestDistrict: best,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=600, stale-while-revalidate=900",
      },
    },
  );
}

