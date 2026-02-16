import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deletePortalSession } from "@/lib/db";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;

  if (token) {
    deletePortalSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    path: "/",
  });

  return response;
}
