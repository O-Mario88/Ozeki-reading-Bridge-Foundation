import { NextRequest, NextResponse } from "next/server";
import { buildIatiTransactionsXml } from "@/lib/server/iati";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const xml = await buildIatiTransactionsXml({ sinceDate: since });
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200",
    },
  });
}
