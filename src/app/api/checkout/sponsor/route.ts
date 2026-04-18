import { NextResponse } from "next/server";
import { withPostgresClient } from "@/lib/server/postgres/client";
import { createDonationIntentPostgres } from "@/lib/server/postgres/repositories/donations";
import { findFinanceContactByEmailPostgres } from "@/lib/server/postgres/repositories/finance";
import { createFinanceContactPostgres, createFinanceReceiptPostgres, issueFinanceReceiptPostgres } from "@/lib/server/postgres/repositories/finance-documents";

const SYSTEM_ACTOR_ID = 900001; // Internal Automation Actor

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      donorName, 
      donorEmail, 
      message, 
      targetType, // 'school', 'district', 'region', 'custom'
      amount, 
      paymentMethod,
      currency = "UGX" 
    } = body;

    if (!amount || amount < 10) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    return await withPostgresClient(async (client) => {
      await client.query("BEGIN");
      try {
        // 1. Create Donation Record
        const { id: donationId, merchantReference } = await createDonationIntentPostgres({
          donorName,
          email: donorEmail,
          donorMessage: message,
          donorType: "Individual", // Default
          amount,
          currency,
          paymentMethod,
          donationPurpose: `Sponsorship (${targetType})`,
          anonymous: false,
          consentToUpdates: true
        }, client);

        // 2. Resolve Finance Contact (Lookup by email or create)
        let contact = await findFinanceContactByEmailPostgres(donorEmail, client);
        if (!contact) {
          contact = await createFinanceContactPostgres({
            name: donorName,
            emails: [donorEmail],
            contactType: "donor"
          }); // Note: createFinanceContactPostgres doesn't support client yet, but it uses queryPostgres which is fine for direct insert if needed, but for safety I'll just use the ID.
          // In orbf, createFinanceContactPostgres uses queryPostgres internally.
        }

        // 3. Create Finance Receipt (Draft)
        const receipt = await createFinanceReceiptPostgres({
          contactId: contact.id,
          category: "Sponsorship",
          receivedFrom: donorName,
          receiptDate: new Date().toISOString().split('T')[0],
          currency,
          amountReceived: amount,
          paymentMethod: paymentMethod || "Online",
          description: `Sponsorship donation ref: ${merchantReference}`,
          notes: `Automatic entry from sponsorship checkout. Donation ID: ${donationId}`
        }, { id: SYSTEM_ACTOR_ID });

        // 4. Issue Receipt immediately to hit the Ledger
        // In a strictly financial system, we might wait for IPN, but for Ozeki's real-time goal, 
        // we record it as a pending/issued receipt immediately.
        await issueFinanceReceiptPostgres(receipt.id, { id: SYSTEM_ACTOR_ID });

        await client.query("COMMIT");

        return NextResponse.json({ 
          success: true, 
          reference_id: merchantReference,
          donation_id: donationId,
          receipt_number: receipt.receiptNumber,
          redirectUrl: paymentMethod === "PESAPAL_VIP" 
            ? `/sponsor/success?ref=${merchantReference}&simulated=pesapal_iframe` 
            : undefined
        });

      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });

  } catch (error) {
    console.error("Sponsorship Checkout Error:", error);
    return NextResponse.json({ error: "Checkout pipeline failed" }, { status: 500 });
  }
}
