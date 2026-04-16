import { NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { finalizeEventAndGeneratePathsPostgres } from "@/lib/server/postgres/repositories/training-events";

export async function POST(request: Request) {
  try {
    const user = await requirePortalStaffUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { eventId, recommendedLessonIds } = await request.json();

    if (!eventId || !Array.isArray(recommendedLessonIds)) {
      return NextResponse.json({ message: "Missing eventId or array of recommendedLessonIds" }, { status: 400 });
    }

    const result = await finalizeEventAndGeneratePathsPostgres(eventId, recommendedLessonIds);

    if (!result.success) {
       return NextResponse.json({ message: result.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully issued ${result.issuedCount} certificates and learning journeys.` 
    });

  } catch (error: any) {
    console.error("[Finalize Event API Error]", error);
    return NextResponse.json(
      { message: "Failed to finalize the event." },
      { status: 500 }
    );
  }
}
