import { NextResponse } from "next/server";
import {
  getDonorROIPostgres,
  getAllDonorROIAggregatePostgres,
} from "@/lib/server/postgres/repositories/donor-roi";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");
    const email = searchParams.get("email");
    const sponsorshipId = searchParams.get("sponsorshipId");

    if (ref || email || sponsorshipId) {
      const data = await getDonorROIPostgres({
        sponsorshipReference: ref ?? undefined,
        donorEmail: email ?? undefined,
        sponsorshipId: sponsorshipId ? Number(sponsorshipId) : undefined,
      });
      if (!data) {
        return NextResponse.json({ error: "No donor record found" }, { status: 404 });
      }
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1200" },
      });
    }

    const aggregate = await getAllDonorROIAggregatePostgres();
    return NextResponse.json(aggregate, {
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1200" },
    });
  } catch (error) {
    console.error("[api/impact/donor-roi]", error);
    return NextResponse.json({ error: "Donor ROI unavailable" }, { status: 500 });
  }
}
