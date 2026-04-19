import { withApiV1 } from "@/lib/server/api-v1";
import { getNationalTimeSeriesPostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 3600;

export const GET = withApiV1.table(async (req) => {
  const monthsParam = req.nextUrl.searchParams.get("months");
  const months = monthsParam ? Number(monthsParam) : 12;
  const points = await getNationalTimeSeriesPostgres(months);
  return {
    rows: points as unknown as Array<Record<string, unknown>>,
    meta: {
      months: points.length,
      asOf: new Date().toISOString(),
      note: "Monthly aggregates across all assessed learners. Grade/region breakdowns available via other endpoints.",
    },
    filename: "ozeki-national-time-series",
  };
}, { maxAgeSeconds: 3600 });
