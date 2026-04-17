import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { createServiceRequestPostgres } from "@/lib/server/postgres/repositories/service-booking";
import { initiatePesapalOrderGateway } from "@/lib/server/payments/pesapal";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { schoolDetails, cartItems, estimatedTotal, requiredDepositAmount, paymentIntent, paymentAmount } = payload;

    if (!cartItems || cartItems.length === 0) {
       return NextResponse.json({ message: "Invalid payload: Missing core services." }, { status: 400 });
    }

    // 1. Resolve School Entity
    let targetSchoolId = null;
    const schoolLookup = await queryPostgres(
      `SELECT id FROM schools_directory WHERE name ILIKE $1 AND district ILIKE $2 LIMIT 1`,
      [`%${schoolDetails.schoolName}%`, `%${schoolDetails.district}%`]
    );

    if (schoolLookup.rows.length > 0) {
       targetSchoolId = schoolLookup.rows[0].id;
    } else {
       // Upsert new school
       const newSchool = await queryPostgres(
         `INSERT INTO schools_directory (name, district, school_type, ownership, emis_number, phone_number, head_teacher_name, head_teacher_phone)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
         [schoolDetails.schoolName, schoolDetails.district, schoolDetails.schoolType, schoolDetails.ownership, schoolDetails.emisNumber, schoolDetails.schoolPhone, schoolDetails.headTeacherName, schoolDetails.headTeacherPhone]
       );
       targetSchoolId = newSchool.rows[0].id;
    }

    // 2. Initialize the Booking Configuration inside Postgres
    payload.schoolId = targetSchoolId;
    const serviceRequestId = await createServiceRequestPostgres(payload);

    // 3. Initiate the Service Payments FinTech Ledger Table
    const merchantReference = `OZK-MERCHANT-${Date.now()}`;
    const payLedger = await queryPostgres(
      `INSERT INTO service_payments (
        service_request_id, school_id, provider, amount_due, required_deposit_amount, amount_requested,
        payment_type, payment_status, pesapal_merchant_reference, payer_phone
      ) VALUES ($1, $2, 'Pesapal V3', $3, $4, $5, $6, 'Payment Initiated', $7, $8) RETURNING id`,
      [
        serviceRequestId, targetSchoolId, estimatedTotal, requiredDepositAmount, paymentAmount,
        paymentIntent === 'deposit' ? '50% Deposit' : 'Full Payment',
        merchantReference, schoolDetails.requesterPhone
      ]
    );
    const paymentId = payLedger.rows[0].id;

    // 4. Hit the Mock Pesapal Network API to secure a tracking iFrame URL
    const gatewayResponse = await initiatePesapalOrderGateway(
       paymentId, merchantReference, paymentAmount, 'UGX', { phone: schoolDetails.requesterPhone }
    );

    // 5. Release Lock back to Frontend 
    return NextResponse.json({ success: true, redirectUrl: gatewayResponse.redirectUrl });

  } catch (err: unknown) {
    console.error("[Booking Generation Error]", err);
    return NextResponse.json({ message: "Failed to assemble Fintech Cart." }, { status: 500 });
  }
}
