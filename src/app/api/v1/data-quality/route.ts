import { withApiV1 } from "@/lib/server/api-v1";
import { getDataQualityByDistrictPostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 7200;

export const GET = withApiV1.table(async () => {
  const report = await getDataQualityByDistrictPostgres();
  return {
    rows: report.districts as unknown as Array<Record<string, unknown>>,
    meta: {
      nationalAverage: report.nationalAverage,
      asOf: report.asOf,
    },
    filename: "ozeki-data-quality",
  };
}, { maxAgeSeconds: 7200 });
