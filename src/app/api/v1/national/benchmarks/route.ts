import { withApiV1 } from "@/lib/server/api-v1";
import { getNationalBenchmarksPostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 86400;

export const GET = withApiV1.table(async () => {
  const report = await getNationalBenchmarksPostgres();
  return {
    rows: report.benchmarks as unknown as Array<Record<string, unknown>>,
    meta: {
      totalLearnersAssessed: report.totalLearnersAssessed,
      asOf: report.asOf,
      note: "Minimum 10 unique learners per (grade, cycle) cell.",
    },
    filename: "ozeki-national-benchmarks",
  };
}, { maxAgeSeconds: 86400 });
