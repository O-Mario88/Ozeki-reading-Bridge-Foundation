import { withApiV1 } from "@/lib/server/api-v1";
import { listDistrictsPostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 3600;

export const GET = withApiV1.table(async () => {
  const districts = await listDistrictsPostgres();
  return {
    rows: districts as unknown as Array<Record<string, unknown>>,
    meta: { asOf: new Date().toISOString() },
    filename: "ozeki-districts",
  };
}, { maxAgeSeconds: 3600 });
