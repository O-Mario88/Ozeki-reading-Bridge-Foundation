import { queryPostgres } from "@/lib/server/postgres/client";

export type SponsorshipRow = {
  id: number;
  sponsorshipReference: string;
  sponsorshipType: string;
  sponsorshipTargetName: string | null;
  schoolId: number | null;
  district: string | null;
  subRegion: string | null;
  region: string | null;
  sponsorshipFocus: string | null;
  donorType: string | null;
  donorName: string | null;
  organizationName: string | null;
  donorEmail: string | null;
  donorPhone: string | null;
  donorCountry: string | null;
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

export type SponsorshipReceiptRow = {
  id: number;
  receiptNumber: string;
  sponsorshipId: number | null;
  sponsorshipReference: string | null;
  donorName: string | null;
  donorEmail: string | null;
  sponsorshipType: string | null;
  sponsorshipTargetName: string | null;
  sponsorshipFocus: string | null;
  amount: number;
  currency: string;
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

// Orchestrates the exact insertion parameters logging isolated Sponsor intents
export async function createSponsorshipIntentPostgres(payload: any): Promise<{id: number, merchantReference: string}> {
  await queryPostgres('BEGIN');
  try {
     const sponsorshipRef = \`OZK-SPN-\${new Date().getFullYear()}-\${Math.random().toString().substring(2,8)}\`;
     const merchantRef = \`OZK-SPN-RCT-\${Date.now()}\`; // Strict mapping prefix isolating IPN Webhook payloads to Pillar 3 multiplexer

     const res = await queryPostgres(
        \`INSERT INTO sponsorships (
          sponsorship_reference, sponsorship_type, sponsorship_target_name, district, sub_region, region, sponsorship_focus,
          donor_type, donor_name, organization_name, donor_email, donor_phone, donor_country, donor_message,
          anonymous, consent_to_updates, amount, currency, payment_status, pesapal_merchant_reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'Pending Payment', $19) RETURNING id\`,
        [
          sponsorshipRef, payload.sponsorshipType, payload.sponsorshipTargetName, payload.district, payload.subRegion, payload.region, payload.sponsorshipFocus,
          payload.donorType, payload.donorName, payload.organizationName, payload.email, payload.phone, payload.country, payload.donorMessage,
          payload.anonymous, payload.consentToUpdates, payload.amount, payload.currency || 'UGX', merchantRef
        ]
     );

     await queryPostgres('COMMIT');
     return { id: res.rows[0].id, merchantReference: merchantRef };

  } catch(e) {
     await queryPostgres('ROLLBACK');
     throw e;
  }
}
