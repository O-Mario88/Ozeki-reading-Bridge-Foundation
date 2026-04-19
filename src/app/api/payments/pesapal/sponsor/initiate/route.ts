import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSponsorshipIntentPostgres } from "@/lib/server/postgres/repositories/sponsorships";
import { initiatePesapalOrderGateway } from "@/lib/server/payments/pesapal";
import { consumeRateLimit } from "@/lib/rate-limit";
import { checkIdempotency, storeIdempotencyResponse } from "@/lib/server/idempotency";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const sponsorSchema = z.object({
  amount: z.coerce.number().int().min(50_000).max(9_999_999_999),
  currency: z.string().trim().length(3).optional(),
  sponsorshipType: z.enum(["school", "district", "sub-region", "subregion", "region"]),
  sponsorshipTargetName: z.string().trim().max(200).nullable().optional(),
  sponsorshipFocus: z.string().trim().max(200).nullable().optional(),
  donorType: z.enum(["individual", "organization", "company"]).nullable().optional(),
  name: z.string().trim().max(200).nullable().optional(),
  organizationName: z.string().trim().max(200).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional(),
  phone: z.string().trim().min(6).max(32).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  message: z.string().trim().max(2000).nullable().optional(),
  anonymous: z.boolean().optional(),
  consentToUpdates: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = consumeRateLimit(`sponsor-initiate:${ip}`, { maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many sponsorship attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterSeconds)) } },
    );
  }

  try {
    const raw = await request.json();
    const parsed = sponsorSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid sponsorship payload." },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const idem = await checkIdempotency(request, "sponsor-initiate", body);
    if (idem.cached) return idem.replay;

    // 1. Log native geographic sponsorship schema locally
    const dbRecord = await createSponsorshipIntentPostgres({
      sponsorshipType: body.sponsorshipType,
      sponsorshipTargetName: body.sponsorshipTargetName ?? null,
      district: body.sponsorshipType === "district" ? body.sponsorshipTargetName : null,
      subRegion: (body.sponsorshipType === "sub-region" || body.sponsorshipType === "subregion") ? body.sponsorshipTargetName : null,
      region: body.sponsorshipType === "region" ? body.sponsorshipTargetName : null,
      sponsorshipFocus: body.sponsorshipFocus ?? null,
      amount: body.amount,
      currency: body.currency ?? "UGX",
      donorType: body.donorType ?? null,
      donorName: body.name ?? null,
      organizationName: body.organizationName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      country: body.country ?? null,
      donorMessage: body.message ?? null,
      anonymous: Boolean(body.anonymous),
      consentToUpdates: Boolean(body.consentToUpdates),
    });

    const contactPayload = {
      phone: body.phone ?? "000000000",
      email: body.email ?? "sponsor@ozekiread.org",
    };

    const gatewayResponse = await initiatePesapalOrderGateway(
      dbRecord.id,
      dbRecord.merchantReference,
      body.amount,
      body.currency ?? "UGX",
      contactPayload,
    );

    const response = NextResponse.json({
      success: true,
      redirectUrl: gatewayResponse.redirectUrl,
      sponsorshipReference: dbRecord.merchantReference,
    });
    return storeIdempotencyResponse(idem, response);
  } catch (e: unknown) {
    logger.error("[sponsor/initiate] failed", { error: String(e) });
    return NextResponse.json(
      { error: "Unable to secure Geospatial gateway. Please try again later." },
      { status: 500 },
    );
  }
}
