import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import crypto from "node:crypto";

export const runtime = "nodejs";

/**
 * Bootstrap the admin password for edwin@ozekiread.org.
 * GET: Check if the admin account has a valid password hash.
 * POST: Set/reset the admin password.
 */
export async function GET() {
  try {
    const result = await queryPostgres(
      `SELECT id, email, password_hash, full_name, is_admin, is_superadmin
       FROM portal_users
       WHERE lower(email) = 'edwin@ozekiread.org'
       LIMIT 1`,
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Admin user edwin@ozekiread.org not found" }, { status: 404 });
    }
    const user = result.rows[0] as Record<string, unknown>;
    const hasValidPassword =
      typeof user.password_hash === "string" &&
      user.password_hash.length === 64 &&
      user.password_hash !== "bootstrap-seeded-disabled";
    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      isAdmin: user.is_admin,
      isSuperadmin: user.is_superadmin,
      hasValidPassword,
      passwordHashPrefix: String(user.password_hash ?? "").slice(0, 10) + "...",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "Ozeki@16079";
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

    const result = await queryPostgres(
      `UPDATE portal_users
       SET password_hash = $1
       WHERE lower(email) = 'edwin@ozekiread.org'
       RETURNING id, email, full_name`,
      [passwordHash],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
      passwordHashPrefix: passwordHash.slice(0, 10) + "...",
      message: "Password updated successfully for edwin@ozekiread.org",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
