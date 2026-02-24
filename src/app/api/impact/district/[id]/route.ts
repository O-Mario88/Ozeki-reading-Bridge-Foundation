import { getPublicImpactAggregate } from "@/lib/db";
import { cachedImpactJson, parsePeriod } from "@/app/api/impact/helpers";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const period = parsePeriod(request);
  const { id } = await context.params;
  const scopeId = decodeURIComponent(id);
  const aggregate = getPublicImpactAggregate("district", scopeId, period);
  return cachedImpactJson(aggregate);
}
