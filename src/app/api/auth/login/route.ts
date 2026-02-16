import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePortalUser, createPortalSession } from "@/lib/db";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";

export const runtime = "nodejs";

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = authenticatePortalUser(payload.identifier, payload.password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email/phone or password." },
        { status: 401 },
      );
    }

    const session = createPortalSession(user.id);
    const response = NextResponse.json({
      ok: true,
      user: {
        fullName: user.fullName,
        role: user.role,
      },
    });

    response.cookies.set({
      name: PORTAL_SESSION_COOKIE,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: session.maxAge,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid sign-in payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
