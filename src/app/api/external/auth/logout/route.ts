import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  EXTERNAL_SESSION_COOKIE,
  buildClearExternalSessionCookie,
} from "@/lib/external-auth";
import { deleteExternalSessionPostgres } from "@/lib/server/postgres/repositories/external-auth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(EXTERNAL_SESSION_COOKIE)?.value;
  if (token) {
    await deleteExternalSessionPostgres(token).catch(() => {});
  }
  const response = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"), 303);
  response.cookies.set(buildClearExternalSessionCookie());
  return response;
}
