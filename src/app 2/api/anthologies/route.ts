import { NextRequest, NextResponse } from "next/server";
import { listPublishedAnthologies } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const limit = params.get("limit") ? Number(params.get("limit")) : 50;

    // We only expose published anthologies with approved consent
    const anthologies = listPublishedAnthologies({ limit });

    return NextResponse.json({ anthologies });
}
