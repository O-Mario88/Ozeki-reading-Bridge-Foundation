import { NextResponse } from "next/server";
import { auditLog } from "@/lib/server/audit/log";
import { pullEmisRoster, pushOutcomesToEmis } from "@/lib/server/emis-adapter";

export const runtime = "nodejs";

function checkCronToken(request: Request): boolean {
  const expected = process.env.CRON_TOKEN?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const queryToken = new URL(request.url).searchParams.get("token");
  return header === `Bearer ${expected}` || queryToken === expected;
}

export async function GET(request: Request) {
  if (!checkCronToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pull = await pullEmisRoster("cron");
  const push = await pushOutcomesToEmis("cron");

  await auditLog({
    actor: { id: 0, name: "cron" },
    action: "cron_run",
    targetTable: "emis_sync_runs",
    after: { pullStatus: pull.status, pushStatus: push.status },
    detail: `Nightly EMIS sync — pull ${pull.status}, push ${push.status}`,
    request,
  });

  return NextResponse.json({ ok: true, pull, push });
}
