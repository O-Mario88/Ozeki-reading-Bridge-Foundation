import { NextResponse } from "next/server";
import {
  assertPartnerScopeAllowed,
  authenticatePartnerApiKeyAsync,
  getNationalReportPdf,
  listNationalReportPacksAsync,
  logPartnerExportAsync,
} from "@/lib/national-intelligence";

export const runtime = "nodejs";

function readApiKey(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const keyHeader = request.headers.get("x-partner-key") ?? "";

  if (keyHeader.trim()) {
    return keyHeader.trim();
  }
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ reportCode: string }> },
) {
  try {
    const apiKey = readApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: "Missing partner API key." }, { status: 401 });
    }

    const client = await authenticatePartnerApiKeyAsync(apiKey);
    if (!client) {
      return NextResponse.json({ error: "Invalid partner API key." }, { status: 401 });
    }

    const params = await context.params;
    const reportCode = params.reportCode;

    const report = (await listNationalReportPacksAsync({ limit: 500 })).find(
      (item) => item.reportCode === reportCode,
    );
    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    assertPartnerScopeAllowed({
      client,
      scopeType: report.scopeType,
      scopeId: report.scopeId,
    });

    const pdf = await getNationalReportPdf(reportCode);
    if (!pdf) {
      return NextResponse.json({ error: "Report PDF not found." }, { status: 404 });
    }

    await logPartnerExportAsync({
      clientId: client.clientId,
      partnerName: client.partnerName,
      endpoint: "/api/partner/reports/[reportCode]/pdf",
      scopeType: report.scopeType,
      scopeId: report.scopeId,
      format: "pdf",
    });

    return new NextResponse(pdf.bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.toLowerCase().includes("allowed") ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
