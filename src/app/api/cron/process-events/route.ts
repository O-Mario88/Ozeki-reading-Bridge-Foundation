import { NextResponse } from "next/server";
import { processPendingEvents } from "@/lib/server/events/dispatcher";
import { requireCronToken } from "@/lib/server/http/cron-auth";
import { clampLimit } from "@/lib/server/http/pagination";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireCronToken(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const limit = clampLimit(searchParams.get("limit"), 50, 500);
    const result = await processPendingEvents({ limit });
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (error) {
    console.error("[cron/process-events]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
