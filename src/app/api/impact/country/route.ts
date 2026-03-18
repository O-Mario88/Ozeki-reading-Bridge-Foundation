import { getPublicImpactAggregate } from "@/services/dataService";
import { cachedImpactJson, parsePeriod } from "@/app/api/impact/helpers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const period = parsePeriod(request);
  const aggregate = await getPublicImpactAggregate("country", "Uganda", period);
  return cachedImpactJson(aggregate);
}
