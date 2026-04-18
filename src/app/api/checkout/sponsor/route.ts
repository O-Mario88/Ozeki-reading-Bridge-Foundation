import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      donorName, 
      donorEmail, 
      message, 
      targetType, // 'school', 'district', 'region', 'custom'
      amount, 
      paymentMethod 
    } = body;

    if (!amount || amount < 10) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const internalReference = `OZ-SP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await queryPostgres('BEGIN');

    const result = await queryPostgres(
      `INSERT INTO donations (
        reference_id, donor_name, donor_email, target_entity_type, amount, payment_status, payment_method, message
      ) VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7) RETURNING id`,
      [internalReference, donorName, donorEmail, targetType, amount, paymentMethod, message]
    );

    await queryPostgres('COMMIT');

    // Simulate Pesapal Brokering Integration (In a real scenario, we call Pesapal's SubmitOrderRequest API here)
    if (paymentMethod === "PESAPAL_VIP") {
      // Return a simulated Pesapal redirect wrapper
      return NextResponse.json({ 
        success: true, 
        reference_id: internalReference,
        redirectUrl: `/sponsor/success?ref=${internalReference}&simulated=pesapal_iframe`
      });
    }

    // For Mobile Money (Push native flow)
    return NextResponse.json({ 
      success: true, 
      reference_id: internalReference,
      status: "Processing"
    });

  } catch (error) {
    await queryPostgres('ROLLBACK');
    console.error("Sponsorship Checkout Error:", error);
    return NextResponse.json({ error: "Brokerage pipeline failed" }, { status: 500 });
  }
}
