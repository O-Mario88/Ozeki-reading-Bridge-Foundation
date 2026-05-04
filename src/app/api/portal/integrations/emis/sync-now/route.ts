import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/server/audit/log";
import { pullEmisRoster, pushOutcomesToEmis } from "@/lib/server/emis-adapter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const direction = new URL(request.url).searchParams.get("direction") === "push" ? "push" : "pull";
  const result = direction === "pull"
    ? await pullEmisRoster("manual")
    : await pushOutcomesToEmis("manual");

  await auditLog({
    actor: user,
    action: "trigger",
    targetTable: "emis_sync_runs",
    targetId: result.runId,
    after: { direction, status: result.status },
    detail: `Manual EMIS ${direction} → ${result.status}`,
    request,
  });

  return NextResponse.json({ ok: true, result });
}
