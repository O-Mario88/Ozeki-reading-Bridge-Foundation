import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDonationIntentPostgres } from "@/lib/server/postgres/repositories/donations";
import { initiatePesapalOrderGateway } from "@/lib/server/payments/pesapal";
import { consumeRateLimit } from "@/lib/rate-limit";
import { checkIdempotency, storeIdempotencyResponse } from "@/lib/server/idempotency";
import { logger } from "@/lib/logger";
import { normalisePhoneNumber } from "@/lib/phone";

export const runtime = "nodejs";

const donationSchema = z.object({
  amount: z.coerce.number().int().min(1000).max(999_999_999),
  currency: z.string().trim().length(3).optional(),
  purpose: z.string().trim().max(500).nullable().optional(),
  schoolName: z.string().trim().max(200).nullable().optional(),
  schoolDistrict: z.string().trim().max(100).nullable().optional(),
  message: z.string().trim().max(2000).nullable().optional(),
  donorType: z.enum(["individual", "organization", "company"]).nullable().optional(),
  name: z.string().trim().max(200).nullable().optional(),
  organizationName: z.string().trim().max(200).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional(),
  phone: z.string().trim().min(6).max(32).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  districtOrCity: z.string().trim().max(200).nullable().optional(),
  anonymous: z.boolean().optional(),
  consentToUpdates: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  // Basic IP-based rate limit — 10 donation initiations / minute / IP.
  // Prevents abuse while leaving room for legitimate retries.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = consumeRateLimit(`donation-initiate:${ip}`, { maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many donation attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterSeconds)) } },
    );
  }

  try {
    const raw = await request.json();
    const parsed = donationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid donation payload." },
        { status: 400 },
      );
    }
    const body = parsed.data;

    // Normalise phone before persisting + before sending to Pesapal. We accept
    // user-friendly separators (spaces/dashes/+/parens) but reject obvious
    // junk (`abc def 123`) so analytics + outbound dialling stay clean.
    let normalisedPhone: ReturnType<typeof normalisePhoneNumber> = null;
    if (body.phone) {
      normalisedPhone = normalisePhoneNumber(body.phone);
      if (!normalisedPhone) {
        return NextResponse.json(
          { error: "Phone number contains invalid characters." },
          { status: 400 },
        );
      }
    }

    // Idempotency: if the client sent Idempotency-Key and we already processed
    // the identical payload, replay the original response instead of creating
    // a duplicate donation record.
    const idem = await checkIdempotency(request, "donation-initiate", body);
    if (idem.cached) return idem.replay;

    // 1. Record donation intent — field names here must match the repository's
    //    INSERT column order (donations.ts:155-167).
    const dbRecord = await createDonationIntentPostgres({
      amount: body.amount,
      currency: body.currency ?? "UGX",
      donationPurpose: body.purpose ?? null,
      supportedSchoolName: body.schoolName ?? null,
      supportedSchoolDistrict: body.schoolDistrict ?? null,
      donorMessage: body.message ?? null,
      donorType: body.donorType ?? null,
      donorName: body.name ?? null,
      organizationName: body.organizationName ?? null,
      email: body.email ?? null,
      phone: normalisedPhone?.display ?? null,
      country: body.country ?? null,
      districtOrCity: body.districtOrCity ?? null,
      anonymous: Boolean(body.anonymous),
      consentToUpdates: Boolean(body.consentToUpdates),
    });

    // 2. Initiate Pesapal payment
    const contactPayload = {
      phone: normalisedPhone?.digitsOnly ?? "000000000",
      email: body.email ?? "donor@ozekiread.org",
      name: body.anonymous ? undefined : body.name ?? undefined,
    };
    const description = body.purpose
      ? `Donation: ${String(body.purpose).slice(0, 100)}`
      : "OzekiRead Donation";

    const gatewayResponse = await initiatePesapalOrderGateway(
      dbRecord.id,
      dbRecord.merchantReference,
      body.amount,
      body.currency ?? "UGX",
      contactPayload,
      description,
    );

    const response = NextResponse.json({
      success: true,
      redirectUrl: gatewayResponse.redirectUrl,
      donationReference: dbRecord.merchantReference,
    });
    return storeIdempotencyResponse(idem, response);
  } catch (e: unknown) {
    logger.error("[donation/initiate] failed", { error: String(e) });
    return NextResponse.json(
      { error: "Payment gateway unavailable. Please try again or contact support." },
      { status: 503 },
    );
  }
}
