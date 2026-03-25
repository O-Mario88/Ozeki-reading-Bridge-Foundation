import { NextResponse } from "next/server";
import { getImpactReportByCodeAsync, incrementImpactReportViewCountAsync } from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const user = await getAuthenticatedPortalUser();
  const report = await getImpactReportByCodeAsync(code, user);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  await incrementImpactReportViewCountAsync(code);
  return NextResponse.json({ report });
}
