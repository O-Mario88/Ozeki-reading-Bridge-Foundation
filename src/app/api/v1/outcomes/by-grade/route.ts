import { withApiV1 } from "@/lib/server/api-v1";
import { getOutcomesByGradePostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 3600;

export const GET = withApiV1.table(async () => {
  const rows = await getOutcomesByGradePostgres();
  return {
    rows: rows as unknown as Array<Record<string, unknown>>,
    meta: {
      asOf: new Date().toISOString(),
      note: "Averages across all assessment types. Minimum 10 unique learners per grade cell.",
    },
    filename: "ozeki-outcomes-by-grade",
  };
}, { maxAgeSeconds: 3600 });
