import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { upsertExternalUserPostgres } from "@/lib/server/postgres/repositories/external-users";
import { issueMagicLinkPostgres } from "@/lib/server/postgres/repositories/external-auth";
import { sendMagicLinkEmail } from "@/lib/external-magic-link-email";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["donor", "parent", "teacher", "partner", "district_officer"]),
  organization: z.string().trim().max(200).optional(),
  district: z.string().trim().max(120).optional(),
});

const ROLE_LABELS: Record<z.infer<typeof schema>["role"], string> = {
  donor: "Donor",
  parent: "Parent",
  teacher: "Teacher",
  partner: "Partner",
  district_officer: "Government",
};

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());

    const user = await upsertExternalUserPostgres({
      role: parsed.role,
      email: parsed.email,
      fullName: parsed.fullName,
      organization: parsed.organization,
      district: parsed.district,
    });

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;

    const { token, expiresAt } = await issueMagicLinkPostgres({
      userId: user.id,
      channel: "email",
      ipAddress,
      userAgent,
    });

    const origin = new URL(request.url).origin;
    const loginUrl = `${origin}/portal/external/claim?token=${token}`;
    const expiresInMinutes = Math.max(
      1,
      Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000),
    );

    const sendResult = await sendMagicLinkEmail(parsed.email, {
      fullName: user.fullName,
      loginUrl,
      roleLabel: ROLE_LABELS[parsed.role],
      expiresInMinutes,
    });

    if (sendResult.status === "skipped") {
      logger.info("[external-auth] magic-link issued but SMTP unconfigured", { loginUrl });
    }

    await auditLog({
      actor: { id: 0, name: `${user.fullName} (external)` },
      action: "request",
      targetTable: "external_user_magic_links",
      targetId: user.id,
      after: { role: parsed.role, channel: "email", deliveryStatus: sendResult.status },
      detail: `Magic link issued for ${parsed.email} (${parsed.role})`,
      request,
    });

    return NextResponse.json({
      ok: true,
      deliveryStatus: sendResult.status,
      // Surface link only when SMTP isn't set so admin can hand it over manually.
      // Production builds with SMTP configured never expose this.
      devClaimUrl: sendResult.status === "skipped" ? loginUrl : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
