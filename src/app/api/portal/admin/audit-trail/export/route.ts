import { NextRequest } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { listAuditTrailPostgres } from "@/lib/server/postgres/repositories/audit";

export const runtime = "nodejs";

function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const user = await requirePortalUser();
  if (!user.isAdmin && !user.isSuperAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const page = await listAuditTrailPostgres({
    userId: sp.get("userId") && /^\d+$/.test(sp.get("userId")!) ? Number(sp.get("userId")) : undefined,
    action: sp.get("action") || undefined,
    targetTable: sp.get("targetTable") || undefined,
    targetId: sp.get("targetId") || undefined,
    dateFrom: sp.get("dateFrom") || undefined,
    dateTo: sp.get("dateTo") || undefined,
    search: sp.get("search") || undefined,
    limit: 5000,
    offset: 0,
  });

  const header = [
    "id", "timestamp", "userId", "userName", "action",
    "targetTable", "targetId", "ipAddress", "detail", "payloadBefore", "payloadAfter",
  ];
  const lines = [header.join(",")];
  for (const row of page.rows) {
    lines.push([
      row.id, row.timestamp, row.userId, row.userName, row.action,
      row.targetTable, row.targetId ?? "", row.ipAddress ?? "", row.detail ?? "",
      row.payloadBefore ?? "", row.payloadAfter ?? "",
    ].map(csvCell).join(","));
  }

  const fileName = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
