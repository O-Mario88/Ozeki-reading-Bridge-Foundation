import { getPublicImpactAggregate } from "@/lib/db";
import { cachedImpactJson, parsePeriod } from "@/app/api/impact/helpers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const period = parsePeriod(request);
  const aggregate = getPublicImpactAggregate("country", "Uganda", period);
  return cachedImpactJson(aggregate);
}
