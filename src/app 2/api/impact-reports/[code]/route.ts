import { NextResponse } from "next/server";
import { getImpactReportByCode, incrementImpactReportViewCount } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const user = await getAuthenticatedPortalUser();
  const report = getImpactReportByCode(code, user);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  incrementImpactReportViewCount(code);
  return NextResponse.json({ report });
}
