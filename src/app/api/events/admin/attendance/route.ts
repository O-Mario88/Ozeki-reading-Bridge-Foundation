import { NextResponse } from "next/server";
import { requirePortalStaffUser } from "@/lib/auth";
import { updateTeacherAttendanceStatusPostgres } from "@/lib/server/postgres/repositories/training-events";

export async function POST(request: Request) {
  try {
    const user = await requirePortalStaffUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { registrationTeacherId, status } = await request.json();

    if (!registrationTeacherId || !status) {
      return NextResponse.json({ message: "Missing id or status" }, { status: 400 });
    }

    // Example statuses: 'Pending', 'Present', 'Absent', 'Walk-in'
    await updateTeacherAttendanceStatusPostgres(registrationTeacherId, status);

    return NextResponse.json({ success: true, message: "Attendance updated." });
  } catch (error: unknown) {
    console.error("[Attendance API Error]", error);
    return NextResponse.json(
      { message: "Failed to update attendance." },
      { status: 500 }
    );
  }
}
