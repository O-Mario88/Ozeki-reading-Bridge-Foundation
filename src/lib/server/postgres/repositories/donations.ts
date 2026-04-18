import { queryPostgres, type PostgresClient } from "@/lib/server/postgres/client";

export type DonationRow = {
  id: number;
  donationReference: string;
  donorType: string | null;
  donorName: string | null;
  organizationName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  districtOrCity: string | null;
  donationPurpose: string | null;
  supportedSchoolName: string | null;
  supportedSchoolDistrict: string | null;
  donorMessage: string | null;
  anonymous: boolean;
  consentToUpdates: boolean;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  paymentStatus: string;
  pesapalOrderTrackingId: string | null;
  pesapalMerchantReference: string | null;
  internalReference: string | null;
  receiptId: number | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DonationReceiptRow = {
  id: number;
  receiptNumber: string;
  donationId: number | null;
  donationReference: string | null;
  donorName: string | null;
  donorEmail: string | null;
  amount: number;
  currency: string;
  donationPurpose: string | null;
  paymentMethod: string | null;
  pesapalOrderTrackingId: string | null;
  internalReference: string | null;
  receiptPdfUrl: string | null;
  issuedAt: string;
  sentToEmail: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// Orchestrates the exact insertion parameters
export async function createDonationIntentPostgres(
  payload: Record<string, unknown>,
  externalClient?: PostgresClient
): Promise<{id: number, merchantReference: string}> {
  const runner = externalClient || { query: queryPostgres };
  
  // If no external client, we manage our own transaction
  if (!externalClient) await queryPostgres('BEGIN');
  
  try {
     const donationRef = `OZK-DON-${new Date().getFullYear()}-${Math.random().toString().substring(2,8)}`;
     const merchantRef = `OZK-DNRC-${Date.now()}`; // Differentiate from School bookings which use OZK-MERCHANT

     const res = await runner.query(
        `INSERT INTO donations (
          donation_reference, donor_type, donor_name, organization_name, email, phone, country, district_or_city,
          donation_purpose, supported_school_name, supported_school_district, donor_message,
          anonymous, consent_to_updates, amount, currency, payment_status, pesapal_merchant_reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'Pending Payment', $17) RETURNING id`,
        [
          donationRef, payload.donorType, payload.donorName, payload.organizationName, payload.email,
          payload.phone, payload.country, payload.districtOrCity, payload.donationPurpose, payload.supportedSchoolName,
          payload.supportedSchoolDistrict, payload.donorMessage, payload.anonymous, payload.consentToUpdates,
          payload.amount, payload.currency || 'UGX', merchantRef
        ]
     );

     if (!externalClient) await queryPostgres('COMMIT');
     return { id: res.rows[0].id, merchantReference: merchantRef };

  } catch(e) {
     if (!externalClient) await queryPostgres('ROLLBACK');
     throw e;
  }
}
