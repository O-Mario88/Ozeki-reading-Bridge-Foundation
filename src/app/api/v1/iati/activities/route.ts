import { NextResponse } from "next/server";
import { buildIatiActivitiesXml } from "@/lib/server/iati";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * IATI 2.03 activity publishing. Public, no auth — consumed by registries
 * (iatiregistry.org), donors (FCDO DevTracker), and aggregators (d-portal).
 * Standard is open; withholding the spec would exclude us from bilateral
 * donor due-diligence workflows.
 */
export async function GET() {
  const xml = await buildIatiActivitiesXml();
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200",
    },
  });
}
