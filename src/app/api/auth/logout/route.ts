import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deletePortalSessionPostgres as deletePortalSession } from "@/lib/server/postgres/repositories/auth";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;

  if (token) {
    await deletePortalSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
