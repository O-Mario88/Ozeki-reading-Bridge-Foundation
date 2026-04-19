import { withApiV1 } from "@/lib/server/api-v1";
import { getProgrammeComparisonsPostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 7200;

export const GET = withApiV1.table(async () => {
  const comparisons = await getProgrammeComparisonsPostgres();
  return {
    rows: comparisons as unknown as Array<Record<string, unknown>>,
    meta: { asOf: new Date().toISOString() },
    filename: "ozeki-programme-comparisons",
  };
}, { maxAgeSeconds: 7200 });
