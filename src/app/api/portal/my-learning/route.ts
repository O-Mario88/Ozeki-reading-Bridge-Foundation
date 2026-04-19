import { NextResponse } from "next/server";
import { requirePortalUser } from "@/lib/auth";
import { getTeacherLearningJourneyPostgres } from "@/lib/server/postgres/repositories/lesson-lms";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requirePortalUser();
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    // Admins can request journeys for other users; otherwise always self
    const resolvedUserId = targetUserId && (user.isAdmin || user.isSuperAdmin)
      ? Number(targetUserId)
      : user.id;

    const journey = await getTeacherLearningJourneyPostgres(resolvedUserId);
    return NextResponse.json(journey);
  } catch (error) {
    console.error("[api/portal/my-learning]", error);
    return NextResponse.json({ error: "Journey unavailable" }, { status: 500 });
  }
}
