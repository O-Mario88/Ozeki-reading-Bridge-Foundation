import { NextResponse } from "next/server";
import { createDonationIntentPostgres } from "@/lib/server/postgres/repositories/donations";
import { initiatePesapalOrderGateway } from "@/lib/server/payments/pesapal";

export async function POST(request: Request) {
   try {
     const body = await request.json();

     if (!body.amount || body.amount < 1000) {
        return NextResponse.json({ error: "Invalid donation amount." }, { status: 400 });
     }

     console.log(">> Constructing Secure Donation Intent & Pinging Pesapal...");

     // 1. Log native donation schema locally and generate Cryptographic References
     const dbRecord = await createDonationIntentPostgres({
        amount: body.amount,
        purpose: body.purpose,
        schoolName: body.schoolName,
        schoolDistrict: body.schoolDistrict,
        message: body.message,
        donorType: body.donorType,
        donorName: body.name,
        email: body.email,
        phone: body.phone,
        anonymous: body.anonymous
     });

     const paymentId = dbRecord.id; 
     // Note: we are passing the `donations.id` directly into the gateway. The IPN multiplexer will know to query this table because of the merchantReference string.
     const merchantRef = dbRecord.merchantReference;

     const contactPayload = {
        phone: body.phone || '000000000',
        email: body.email || 'donor@ozekiread.org'
     };

     // 2. Transmit Secure Command to Pesapal Live V3 grid
     const gatewayResponse = await initiatePesapalOrderGateway(
        paymentId,
        merchantRef,
        body.amount,
        "UGX",
        contactPayload
     );

     // Return the dynamic iframe injection URL back to the frontend wizard
     return NextResponse.json({
        success: true,
        redirectUrl: gatewayResponse.redirectUrl
     });

   } catch (e: unknown) {
     console.error("[DONATION INIT ERROR]", e);
     return NextResponse.json({ error: "Unable to secure payment gateway. Please try again later." }, { status: 500 });
   }
}
