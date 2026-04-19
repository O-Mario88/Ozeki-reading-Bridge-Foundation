import { withApiV1 } from "@/lib/server/api-v1";
import { listSchoolsForApiPostgres } from "@/lib/server/postgres/repositories/national-intelligence";

export const runtime = "nodejs";
export const revalidate = 1800;

export const GET = withApiV1.table(async (req) => {
  const p = req.nextUrl.searchParams;
  const result = await listSchoolsForApiPostgres({
    region: p.get("region") ?? undefined,
    district: p.get("district") ?? undefined,
    limit: p.get("limit") ? Number(p.get("limit")) : 100,
    offset: p.get("offset") ? Number(p.get("offset")) : 0,
  });
  return {
    rows: result.data as unknown as Array<Record<string, unknown>>,
    meta: {
      ...result.pagination,
      asOf: new Date().toISOString(),
      note: "Schools are identified by opaque schoolId and schoolCode; no PII is exposed.",
    },
    filename: "ozeki-schools",
  };
}, { maxAgeSeconds: 1800 });
