import { NextResponse } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { locale?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }
  const locale = body.locale && isLocale(body.locale) ? body.locale : "en";
  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set({
    name: LOCALE_COOKIE,
    value: locale,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
