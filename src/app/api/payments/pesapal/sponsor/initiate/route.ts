import { NextResponse } from "next/server";
import { createSponsorshipIntentPostgres } from "@/lib/server/postgres/repositories/sponsorships";
import { initiatePesapalOrderGateway } from "@/lib/server/payments/pesapal";

export async function POST(request: Request) {
   try {
     const body = await request.json();

     if (!body.amount || body.amount < 50000) {
        return NextResponse.json({ error: "Invalid sponsor amount." }, { status: 400 });
     }

     console.log(">> Constructing Secure Geospatial Intent & Pinging Pesapal...");

     // 1. Log native geographic sponsorship schema locally and generate Cryptographic References
     const dbRecord = await createSponsorshipIntentPostgres({
        sponsorshipType: body.sponsorshipType,
        sponsorshipTargetName: body.sponsorshipTargetName,
        district: body.sponsorshipType === 'district' ? body.sponsorshipTargetName : null,
        subRegion: body.sponsorshipType === 'sub-region' ? body.sponsorshipTargetName : null,
        region: body.sponsorshipType === 'region' ? body.sponsorshipTargetName : null,
        sponsorshipFocus: body.sponsorshipFocus,
        amount: body.amount,
        donorType: body.donorType,
        donorName: body.name,
        email: body.email,
        phone: body.phone,
        country: body.country,
        donorMessage: body.message,
        anonymous: body.anonymous
     });

     const paymentId = dbRecord.id; 
     const merchantRef = dbRecord.merchantReference;

     const contactPayload = {
        phone: body.phone || '000000000',
        email: body.email || 'sponsor@ozekiread.org'
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
     console.error("[SPONSOR INIT ERROR]", e);
     return NextResponse.json({ error: "Unable to secure Geospatial gateway. Please try again later." }, { status: 500 });
   }
}
