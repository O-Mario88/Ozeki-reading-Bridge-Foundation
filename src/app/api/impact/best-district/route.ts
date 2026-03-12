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

async function pickBestDistrict(period: string): Promise<BestDistrictReadingPerformance | null> {
  const country = await getPublicImpactAggregate("country", "Uganda", period);
  const districts = country.navigator.districts ?? [];
  let best: BestDistrictReadingPerformance | null = null;

  for (const district of districts) {
    const aggregate = await getPublicImpactAggregate("district", district, period);
    const fallback = getReadingLevelPerformanceSummary(aggregate.readingLevels);
    const averagePercent = aggregate.readingLevelAverages?.scopeAveragePercent ?? null;
    const performance: ReadingLevelPerformanceSummary | null =
      averagePercent !== null
        ? {
          cycle: "latest",
          sampleSize:
            aggregate.readingLevelAverages?.districtAverages[0]?.schoolCount ??
            fallback?.sampleSize ??
            0,
          performancePercent: averagePercent,
          levelLabels:
            fallback?.levelLabels ?? ["Developing Reader", "Fluent Reader", "Comprehending Reader"],
        }
        : fallback;
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
  const best = await pickBestDistrict(period);

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
