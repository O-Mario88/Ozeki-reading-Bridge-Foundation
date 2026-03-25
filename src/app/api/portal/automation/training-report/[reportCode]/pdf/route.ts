import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { readTrainingReportPdf } from "@/lib/training-report-automation";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    reportCode: string;
  }>;
}

function canAccessInternalTrainingReports(user: {
  role: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}) {
  return (
    user.isAdmin ||
    user.isSuperAdmin ||
    user.role === "Staff" ||
    user.role === "Admin"
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessInternalTrainingReports(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportCode: reportCodeRaw } = await context.params;
  const reportCode = decodeURIComponent(reportCodeRaw);
  const report = await readTrainingReportPdf(reportCode);
  if (!report) {
    return NextResponse.json({ error: "Training report PDF was not found." }, { status: 404 });
  }

  const fileName = path.basename(report.artifact.pdfStoredPath || `${reportCode}.pdf`);
  return new NextResponse(report.bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}

