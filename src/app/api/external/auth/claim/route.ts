import { NextResponse } from "next/server";
import { z } from "zod";
import { buildExternalSessionCookie, externalSlugFromRole } from "@/lib/external-auth";
import {
  consumeMagicLinkPostgres,
  createExternalSessionPostgres,
} from "@/lib/server/postgres/repositories/external-auth";
import { activateExternalUserPostgres } from "@/lib/server/postgres/repositories/external-users";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().trim().min(20).max(200) });

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const user = await consumeMagicLinkPostgres(parsed.token);
    if (!user) {
      return NextResponse.json({ error: "Link is invalid or has expired." }, { status: 410 });
    }
    await activateExternalUserPostgres(user.id);

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;
    const session = await createExternalSessionPostgres({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    await auditLog({
      actor: { id: 0, name: `${user.fullName} (external)` },
      action: "claim",
      targetTable: "external_user_sessions",
      targetId: user.id,
      after: { role: user.role, refCode: user.refCode },
      detail: `External user ${user.email ?? user.refCode} claimed magic-link session`,
      request,
    });

    const slug = externalSlugFromRole(user.role);
    const response = NextResponse.json({
      ok: true,
      role: user.role,
      refCode: user.refCode,
      redirectTo: `/portal/${slug}/dashboard`,
    });
    response.cookies.set(buildExternalSessionCookie(session.token));
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid token payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
