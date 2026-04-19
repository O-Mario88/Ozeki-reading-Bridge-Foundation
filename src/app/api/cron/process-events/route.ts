import { NextResponse } from "next/server";
import { processPendingEvents } from "@/lib/server/events/dispatcher";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET_TOKEN;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? 50);
    const result = await processPendingEvents({ limit });
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (error) {
    console.error("[cron/process-events]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
