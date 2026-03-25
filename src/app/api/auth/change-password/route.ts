import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { findPortalUserAuthByIdPostgres, verifyPassword, hashPassword } from "@/lib/server/postgres/repositories/auth";

export const runtime = "nodejs";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = changePasswordSchema.parse(await request.json());

    // Verify current password
    const authRow = await findPortalUserAuthByIdPostgres(user.id);
    if (!authRow) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const currentValid = await verifyPassword(payload.currentPassword, authRow.passwordHash);
    if (!currentValid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    // Prevent reusing the same password
    const sameAsOld = await verifyPassword(payload.newPassword, authRow.passwordHash);
    if (sameAsOld) {
      return NextResponse.json({ error: "New password must be different from the current password." }, { status: 400 });
    }

    // Hash new password with bcrypt
    const newHash = await hashPassword(payload.newPassword);

    // Update password and clear must_change_password flag, set status to active
    await queryPostgres(
      `UPDATE portal_users
       SET password_hash = $1,
           must_change_password = FALSE,
           status = CASE WHEN status = 'invited' THEN 'active' ELSE status END
       WHERE id = $2`,
      [newHash, user.id],
    );

    return NextResponse.json({ ok: true, redirectTo: "/portal/dashboard" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 },
      );
    }
    console.error("[CHANGE-PASSWORD] Error:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
