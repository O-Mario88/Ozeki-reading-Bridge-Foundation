import { NextResponse } from "next/server";
import { runNationalNightlyJobs } from "@/lib/national-intelligence";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { canAccessNationalIntelligenceInternal } from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

export async function POST() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessNationalIntelligenceInternal(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = runNationalNightlyJobs({ user });
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
