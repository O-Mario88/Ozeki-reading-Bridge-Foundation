import { NextResponse } from "next/server";
import { listGraduationQueueAsync } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

function canAccessQueue(
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedPortalUser>>>,
) {
  return (
    user.role === "Staff" ||
    user.role === "Admin" ||
    user.isAdmin ||
    user.isSuperAdmin ||
    user.isSupervisor ||
    user.isME
  );
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessQueue(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") ?? "200");
  const includeSnoozed = searchParams.get("includeSnoozed") === "1";
  const refresh = searchParams.get("refresh") !== "0";
  const summaryOnly = searchParams.get("summary") === "1";
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(1000, Math.round(limitRaw))) : 200;

  const queue = await listGraduationQueueAsync({
    limit,
    includeSnoozed,
    refresh,
  });

  if (summaryOnly) {
    return NextResponse.json({
      eligibleCount: queue.eligibleCount,
      updatedAt: queue.updatedAt,
      schools: queue.items.slice(0, 5).map((item) => ({
        schoolId: item.schoolId,
        schoolName: item.schoolName,
        district: item.district,
      })),
    });
  }

  return NextResponse.json({ queue });
}
