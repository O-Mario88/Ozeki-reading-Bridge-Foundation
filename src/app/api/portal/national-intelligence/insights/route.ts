import { NextResponse } from "next/server";
import { z } from "zod";
import { getNationalInsights, listPortalUsersForAssignments } from "@/lib/national-intelligence";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { canAccessNationalIntelligenceInternal } from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const querySchema = z.object({
  scopeType: z.enum(["country", "region", "sub_region", "district", "sub_county", "parish", "school"]),
  scopeId: z.string().trim().min(1),
  periodStart: z.string().trim().optional(),
  periodEnd: z.string().trim().optional(),
  includeAssignableUsers: z.coerce.boolean().optional(),
});

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessNationalIntelligenceInternal(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      scopeType: searchParams.get("scopeType") ?? "country",
      scopeId: searchParams.get("scopeId") ?? "Uganda",
      periodStart: searchParams.get("periodStart") ?? undefined,
      periodEnd: searchParams.get("periodEnd") ?? undefined,
      includeAssignableUsers: searchParams.get("includeAssignableUsers") ?? false,
    });

    const insights = getNationalInsights({
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
    });

    return NextResponse.json({
      insights,
      assignableUsers: parsed.includeAssignableUsers ? listPortalUsersForAssignments() : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid national insights query." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
