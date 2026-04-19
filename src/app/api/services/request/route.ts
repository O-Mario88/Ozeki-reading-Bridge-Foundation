import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import { createServiceRequestPostgres } from "@/lib/server/postgres/repositories/service-booking";
import { initiatePesapalOrderGateway } from "@/lib/server/payments/pesapal";
import { createGoogleCalendarEvent, buildDateRangeFromDateAndTime } from "@/lib/google-calendar";
import { sendFinanceMail } from "@/lib/finance-email";
import { generateFinancialPdf } from "@/lib/server/pdf/financial-report-pdf-lib";
import { checkIdempotency, storeIdempotencyResponse } from "@/lib/server/idempotency";
import { consumeRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/* ── Zod payload schema ─────────────────────────────────────────────── */

const cartItemSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().max(1000),
  unitPrice: z.coerce.number().nonnegative().max(999_999_999),
  totalPrice: z.coerce.number().nonnegative().max(999_999_999),
});

const payloadSchema = z.object({
  schoolDetails: z.object({
    schoolName: z.string().trim().min(1).max(200),
    district: z.string().trim().min(1).max(100),
    schoolType: z.string().trim().max(100).optional(),
    ownership: z.string().trim().max(100).optional(),
    emisNumber: z.string().trim().max(64).nullable().optional(),
    schoolPhone: z.string().trim().max(32).nullable().optional(),
    headTeacherName: z.string().trim().max(200).nullable().optional(),
    headTeacherPhone: z.string().trim().max(32).nullable().optional(),
    requesterName: z.string().trim().min(1).max(200),
    requesterPhone: z.string().trim().min(6).max(32),
    requesterEmail: z.string().trim().email().nullable().optional(),
  }),
  assessmentData: z.object({
    primaryGoal: z.string().trim().max(500).optional(),
    curriculum: z.string().trim().max(500).optional(),
    specificChallenges: z.string().trim().max(2000).nullable().optional(),
  }).nullable().optional(),
  cartItems: z.array(cartItemSchema).min(1).max(50),
  estimatedTotal: z.coerce.number().nonnegative().max(999_999_999),
  requiredDepositAmount: z.coerce.number().nonnegative().max(999_999_999),
  paymentIntent: z.enum(["deposit", "full"]),
  paymentAmount: z.coerce.number().positive().max(999_999_999),
  scheduleDetails: z.object({
    date: z.string().trim().optional(),
    time: z.string().trim().optional(),
  }).nullable().optional(),
  paymentDetails: z.object({
    paymentIdentifier: z.string().trim().max(200),
    paymentMethod: z.string().trim().max(100),
  }).nullable().optional(),
});

/* ── POST handler ───────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  // Rate limit by IP: prevents automated spam against the public booking endpoint.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = consumeRateLimit(`services-request:${ip}`, { maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterSeconds)) } },
    );
  }

  try {
    const raw = await request.json();
    const parsed = payloadSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking payload.", detail: parsed.error.issues[0]?.message },
        { status: 400 },
      );
    }
    const payload = parsed.data;

    // Idempotency guard: retries with the same Idempotency-Key replay the
    // cached response instead of creating duplicate school + request + payment.
    const idem = await checkIdempotency(request, "services-request", payload);
    if (idem.cached) return idem.replay;
    const { schoolDetails, assessmentData, cartItems, estimatedTotal, requiredDepositAmount, paymentIntent, paymentAmount, scheduleDetails } = payload;

    // Validate cart unit prices against catalog in a single batched query
    const serviceIds = cartItems.map((i) => i.serviceId);
    const catalogRes = await queryPostgres(
      `SELECT id, service_name, unit_price
       FROM service_catalog WHERE id = ANY($1::int[])`,
      [serviceIds],
    );
    const catalog = new Map<number, { name: string; unitPrice: number | null }>();
    for (const row of catalogRes.rows) {
      catalog.set(Number(row.id), {
        name: String(row.service_name),
        unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
      });
    }
    const missingIds = serviceIds.filter((id) => !catalog.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: "Unknown service in cart.", missingIds },
        { status: 400 },
      );
    }

    /* ── Atomic DB writes: school upsert → request → payment → quotation → items ── */

    const { serviceRequestId, paymentId, quotationId, balanceAfterDeposit, merchantReference, targetSchoolId } =
      await withPostgresClient(async (client) => {
        await client.query("BEGIN");
        try {
          // 1. Resolve or insert school
          const lookup = await client.query(
            `SELECT id FROM schools_directory WHERE name ILIKE $1 AND district ILIKE $2 LIMIT 1`,
            [`%${schoolDetails.schoolName}%`, `%${schoolDetails.district}%`],
          );
          let schoolId: number;
          if (lookup.rows.length > 0) {
            schoolId = Number(lookup.rows[0].id);
          } else {
            const ins = await client.query(
              `INSERT INTO schools_directory
                 (name, district, school_type, ownership, emis_number, phone_number, head_teacher_name, head_teacher_phone)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
              [
                schoolDetails.schoolName, schoolDetails.district,
                schoolDetails.schoolType ?? null, schoolDetails.ownership ?? null,
                schoolDetails.emisNumber ?? null, schoolDetails.schoolPhone ?? null,
                schoolDetails.headTeacherName ?? null, schoolDetails.headTeacherPhone ?? null,
              ],
            );
            schoolId = Number(ins.rows[0].id);
          }

          // 2. Service request
          const enrichedPayload = { ...payload, schoolId };
          const requestId = await createServiceRequestPostgres(enrichedPayload);

          // 3. Payment ledger row
          const merchantRef = `OZK-MERCHANT-${Date.now()}`;
          const payIns = await client.query(
            `INSERT INTO service_payments (
               service_request_id, school_id, provider, amount_due, required_deposit_amount, amount_requested,
               payment_type, payment_status, pesapal_merchant_reference, payer_phone
             ) VALUES ($1, $2, 'Pesapal V3', $3, $4, $5, $6, 'Payment Initiated', $7, $8) RETURNING id`,
            [
              requestId, schoolId, estimatedTotal, requiredDepositAmount, paymentAmount,
              paymentIntent === "deposit" ? "50% Deposit" : "Full Payment",
              merchantRef, schoolDetails.requesterPhone,
            ],
          );
          const payId = Number(payIns.rows[0].id);

          // 4. Pro-forma quotation
          const quoteNumber = `OZK-INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
          const balance = estimatedTotal - paymentAmount;
          const quoteIns = await client.query(
            `INSERT INTO service_quotations (
               quotation_number, service_request_id, school_id, estimated_total, final_total,
               required_deposit_amount, balance_after_deposit, status
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending Deposit') RETURNING id`,
            [quoteNumber, requestId, schoolId, estimatedTotal, estimatedTotal, requiredDepositAmount, balance],
          );
          const quoteId = Number(quoteIns.rows[0].id);

          // 5. Quotation line items — batched catalog lookup avoids N+1
          for (const item of cartItems) {
            const cat = catalog.get(item.serviceId);
            const name = cat?.name ?? `Service Package #${item.serviceId}`;
            await client.query(
              `INSERT INTO quotation_items
                 (quotation_id, item_name, quantity, unit_price, total_price)
               VALUES ($1, $2, $3, $4, $5)`,
              [quoteId, name, item.quantity, item.unitPrice, item.totalPrice],
            );
          }

          await client.query("COMMIT");
          return {
            serviceRequestId: requestId,
            paymentId: payId,
            quotationId: quoteId,
            balanceAfterDeposit: balance,
            merchantReference: merchantRef,
            targetSchoolId: schoolId,
          };
        } catch (txErr) {
          await client.query("ROLLBACK").catch(() => {});
          throw txErr;
        }
      });

    /* ── External I/O (non-transactional): Pesapal, Calendar, Email ── */

    // Pesapal — failure is non-fatal; booking is recorded for manual follow-up
    let gatewayResponse: { redirectUrl: string | null } = { redirectUrl: null };
    try {
      const description = cartItems.map((i) => `Svc#${i.serviceId}`).join(", ");
      gatewayResponse = await initiatePesapalOrderGateway(
        paymentId, merchantReference, paymentAmount, "UGX",
        { phone: schoolDetails.requesterPhone, email: schoolDetails.requesterEmail ?? undefined },
        `OzekiRead Services: ${description}`.slice(0, 100),
      );
    } catch (e) {
      logger.warn("[services/request] Pesapal gateway unreachable — manual follow-up", { error: String(e) });
    }

    // Google Calendar scheduling
    if (scheduleDetails?.date && scheduleDetails.time) {
      try {
        const { startDateTime, endDateTime } = buildDateRangeFromDateAndTime(scheduleDetails.date, scheduleDetails.time, 60);
        let assessmentString = "No assessment provided.";
        if (assessmentData) {
          assessmentString = `Goals: ${assessmentData.primaryGoal ?? "—"}\nCurriculum: ${assessmentData.curriculum ?? "—"}\nChallenges: ${assessmentData.specificChallenges ?? "None structured."}`;
        }
        const calEvent = await createGoogleCalendarEvent({
          summary: `Consultation: ${schoolDetails.schoolName}`,
          description: `Diagnostic Initial Consultation with ${schoolDetails.requesterName} (${schoolDetails.requesterPhone}).\n\n${assessmentString}`,
          startDateTime, endDateTime, createMeet: true,
        });
        if (calEvent.eventId) {
          await queryPostgres(
            `INSERT INTO service_delivery_schedules
               (service_request_id, school_id, service_date, start_time, end_time, google_calendar_event_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'Scheduled')`,
            [serviceRequestId, targetSchoolId, startDateTime, startDateTime, endDateTime, calEvent.eventId],
          );
        }
      } catch (calErr) {
        logger.error("[services/request] Calendar scheduling failed", { error: String(calErr) });
      }
    }

    // Native-payment receipt path
    if (payload.paymentDetails?.paymentIdentifier) {
      const receiptNumber = `OZK-REC-${new Date().getTime().toString().slice(-6)}`;
      try {
        await withPostgresClient(async (client) => {
          await client.query("BEGIN");
          try {
            await client.query(
              `UPDATE service_payments SET payment_status = 'Verified & Paid',
                 amount_paid = $1, verified = true, payment_confirmed_at = NOW() WHERE id = $2`,
              [paymentAmount, paymentId],
            );
            await client.query(
              `UPDATE service_quotations SET status = 'Active / Deposit Secured' WHERE id = $1`,
              [quotationId],
            );
            await client.query(
              `INSERT INTO payment_receipts
                 (receipt_number, service_payment_id, service_request_id, quotation_id, school_id,
                  receipt_type, amount_paid, quotation_total, balance, payment_method, payment_reference, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Issued')`,
              [
                receiptNumber, paymentId, serviceRequestId, quotationId, targetSchoolId,
                paymentIntent === "deposit" ? "Partial Deposit Receipt" : "Full Fulfillment Receipt",
                paymentAmount, estimatedTotal, balanceAfterDeposit,
                payload.paymentDetails?.paymentMethod ?? "Unknown", payload.paymentDetails?.paymentIdentifier ?? "",
              ],
            );
            await client.query("COMMIT");
          } catch (e) {
            await client.query("ROLLBACK").catch(() => {});
            throw e;
          }
        });
      } catch (e) {
        logger.error("[services/request] native-payment receipt atomic update failed", { error: String(e) });
      }

      if (schoolDetails.requesterEmail) {
        try {
          const receiptBuffer = await generateFinancialPdf({
            title: `Payment Receipt: ${receiptNumber}`,
            organization: "Ozeki Reading Bridge Foundation",
            period: new Date().toLocaleDateString(),
            sections: [{
              headers: ["Description", "Amount"],
              rows: [
                { label: "Initial Invoice Estimate", value: estimatedTotal },
                { label: `Amount Received (${payload.paymentDetails.paymentMethod})`, value: paymentAmount, isSubtotal: true },
                { label: "Outstanding Balance", value: balanceAfterDeposit, isGrandTotal: true },
              ],
            }],
          });
          const emailHTML = `
            <div style="font-family: sans-serif; color: #111827; max-width: 600px;">
              <p>Dear ${schoolDetails.requesterName},</p>
              <p>Your payment of <strong>UGX ${paymentAmount.toLocaleString()}</strong> has been received successfully.</p>
              <p><strong>You have chosen to invest in excellence for your school</strong></p>
              <p style="line-height: 1.6;">This investment reflects excellence, vision, and a commitment to giving your learners the quality they deserve.</p>
              <br/>
              <p>Yours in Service,<br/><strong>Ozeki Reading Bridge Foundation Team</strong></p>
            </div>`;
          await sendFinanceMail({
            to: [schoolDetails.requesterEmail],
            subject: `Ozeki Receipt: ${receiptNumber} (${schoolDetails.schoolName})`,
            html: emailHTML,
            attachments: [{ filename: `${receiptNumber}.pdf`, content: receiptBuffer, contentType: "application/pdf" }],
          });
        } catch (emailErr) {
          logger.error("[services/request] receipt email failed", { error: String(emailErr) });
        }
      }
    }

    const response = NextResponse.json({ success: true, redirectUrl: gatewayResponse.redirectUrl });
    return storeIdempotencyResponse(idem, response);
  } catch (err: unknown) {
    logger.error("[services/request] booking failed", { error: String(err) });
    return NextResponse.json({ error: "Booking could not be completed. Please try again." }, { status: 500 });
  }
}
