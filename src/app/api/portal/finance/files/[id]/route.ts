import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { loadFinanceFileForDownload, verifyFinanceFileSignature } from "@/services/financeService";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const fileId = Number(id);
  if (!Number.isFinite(fileId)) {
    return NextResponse.json({ error: "Invalid file id." }, { status: 400 });
  }

  const user = await getAuthenticatedPortalUser();
  const hasRoleAccess = Boolean(user?.isSuperAdmin);
  const hasSignatureAccess = verifyFinanceFileSignature(
    fileId,
    request.nextUrl.searchParams.get("expires"),
    request.nextUrl.searchParams.get("sig"),
  );

  if (!hasRoleAccess && !hasSignatureAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const file = await loadFinanceFileForDownload(fileId);
    return new NextResponse(file.bytes, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${file.fileName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "File not found." },
      { status: 404 },
    );
  }
}
