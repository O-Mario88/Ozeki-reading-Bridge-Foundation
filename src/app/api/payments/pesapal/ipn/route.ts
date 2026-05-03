import { NextResponse } from "next/server";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import { verifyPesapalTransactionStatus } from "@/lib/server/payments/pesapal";
import { generateReceiptNumber } from "@/lib/server/payments/receipt-numbers";

export async function POST(request: Request) {
   try {
      const ipnPayload = await request.json();
      const trackingId = ipnPayload.OrderTrackingId;

      if (!trackingId) return NextResponse.json({ message: "Invalid IPN Payload" }, { status: 400 });

      // ==========================================
      // MULTIPLEXER ROUTING GATEWAY
      // ==========================================

      // 1. Probe the Service Bookings Ledger
      const servicePaymentCheck = await queryPostgres(
         `SELECT id, service_request_id, school_id, amount_requested, currency, payment_type, payment_status, pesapal_merchant_reference
          FROM service_payments WHERE pesapal_order_tracking_id = $1 LIMIT 1`,
         [trackingId]
      );

      if (servicePaymentCheck.rows.length > 0) {
          return await processServiceBookingWebhook(servicePaymentCheck.rows[0], trackingId, ipnPayload);
      }

      // 2. Probe the Philanthropic Donations Ledger
      const donationCheck = await queryPostgres(
         `SELECT id, amount, currency, payment_status, pesapal_merchant_reference, donation_reference, donor_name, email, donation_purpose 
          FROM donations WHERE pesapal_order_tracking_id = $1 LIMIT 1`,
         [trackingId]
      );

      if (donationCheck.rows.length > 0) {
          return await processDonationWebhook(donationCheck.rows[0], trackingId, ipnPayload);
      }

      // 3. Probe the Geographic Sponsorships Ledger
      const sponsorCheck = await queryPostgres(
         `SELECT id, amount, currency, payment_status, pesapal_merchant_reference, sponsorship_reference, donor_name, donor_email, sponsorship_type, sponsorship_target_name, sponsorship_focus 
          FROM sponsorships WHERE pesapal_order_tracking_id = $1 LIMIT 1`,
         [trackingId]
      );

      if (sponsorCheck.rows.length > 0) {
          return await processSponsorshipWebhook(sponsorCheck.rows[0], trackingId, ipnPayload);
      }

      // 4. Unrecognized hash block
      return NextResponse.json({ message: "Transaction orphan blocked." }, { status: 404 });

   } catch(e: unknown) {
      console.error("[PESAPAL IPN FATAL EXCEPTION]", e);
      return NextResponse.json({ message: "Internal Integration Fault" }, { status: 500 });
   }
}

// ==========================================
// A. PHILANTHROPIC DONATIONS IPN LOGIC
// ==========================================
async function processDonationWebhook(donation: Record<string, unknown>, trackingId: string, ipnPayload: Record<string, unknown>) {
   if (donation.payment_status === 'Completed') {
       return NextResponse.json({ success: true, message: "Idempotent donation hit ignored." });
   }

   const gatewayVerification = await verifyPesapalTransactionStatus(trackingId);

   if (gatewayVerification.payment_status_description === 'COMPLETED') {
       await withPostgresClient(async (client) => {
           await client.query('BEGIN');
           try {
               const locked = await client.query(
                   `SELECT id, receipt_id, payment_status FROM donations WHERE id = $1 FOR UPDATE`,
                   [donation.id],
               );
               const liveRow = locked.rows[0] as { id: number; receipt_id: number | null; payment_status: string } | undefined;
               if (!liveRow || liveRow.payment_status === 'Completed' || liveRow.receipt_id != null) {
                   await client.query('COMMIT');
                   return;
               }

               const existingReceipt = await client.query(
                   `SELECT id FROM donation_receipts
                    WHERE donation_id = $1 AND archived_due_to_finance_reset IS FALSE
                    LIMIT 1`,
                   [donation.id],
               ).catch(() => ({ rows: [] as Array<{ id: number }> }));
               let receiptId = (existingReceipt.rows[0] as { id?: number } | undefined)?.id ?? null;

               await client.query(
                   `UPDATE donations
                    SET payment_status = 'Completed', payment_method = $1,
                        ipn_payload_json = $2, status_response_json = $3, updated_at = NOW(),
                        paid_at = COALESCE(paid_at, NOW())
                    WHERE id = $4`,
                   [gatewayVerification.payment_method, JSON.stringify(ipnPayload), JSON.stringify(gatewayVerification), donation.id],
               );

               if (receiptId == null) {
                   const receiptHash = generateReceiptNumber("OZK-DON-RCT");
                   try {
                       const receiptRes = await client.query(
                           `INSERT INTO donation_receipts (
                             receipt_number, donation_id, donation_reference, donor_name, donor_email,
                             amount, currency, donation_purpose, payment_method, pesapal_order_tracking_id, status
                           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Issued') RETURNING id`,
                           [
                             receiptHash, donation.id, donation.donation_reference, donation.donor_name, donation.email,
                             donation.amount, donation.currency, donation.donation_purpose,
                             gatewayVerification.payment_method, trackingId,
                           ],
                       );
                       receiptId = Number((receiptRes.rows[0] as { id: number }).id);
                   } catch (err) {
                       if ((err as { code?: string }).code === '23505') {
                           const rr = await client.query(
                               `SELECT id FROM donation_receipts WHERE donation_id = $1 LIMIT 1`,
                               [donation.id],
                           );
                           receiptId = Number((rr.rows[0] as { id: number }).id);
                       } else {
                           throw err;
                       }
                   }
               }

               await client.query(`UPDATE donations SET receipt_id = $1 WHERE id = $2 AND receipt_id IS NULL`, [receiptId, donation.id]);
               await client.query('COMMIT');
           } catch (e) {
               await client.query('ROLLBACK');
               throw e;
           }
       });
       return NextResponse.json({ success: true, message: "Donation Hook Successfully Reconciled" });
   }
   return NextResponse.json({ success: false, message: "Donation pending or failed in gateway." });
}

// ==========================================
// B. SCHOOL SERVICE BOOKINGS IPN LOGIC
// ==========================================
async function processServiceBookingWebhook(payment: Record<string, unknown>, trackingId: string, ipnPayload: Record<string, unknown>) {
   if (payment.payment_status === 'Completed') {
       return NextResponse.json({ success: true, message: "Idempotent service hit ignored." });
   }

   const gatewayVerification = await verifyPesapalTransactionStatus(trackingId);

   if (gatewayVerification.payment_status_description === 'COMPLETED') {
       await withPostgresClient(async (client) => {
           await client.query('BEGIN');
           try {
               // Lock + re-check to serialise concurrent IPN deliveries.
               const locked = await client.query(
                   `SELECT id, receipt_id, payment_status FROM service_payments WHERE id = $1 FOR UPDATE`,
                   [payment.id],
               );
               const liveRow = locked.rows[0] as { id: number; receipt_id: number | null; payment_status: string } | undefined;
               if (!liveRow || liveRow.payment_status === 'Completed' || liveRow.receipt_id != null) {
                   await client.query('COMMIT');
                   return;
               }

               const existingReceipt = await client.query(
                   `SELECT id FROM payment_receipts
                    WHERE service_payment_id = $1 AND archived_due_to_finance_reset IS FALSE
                    LIMIT 1`,
                   [payment.id],
               ).catch(() => ({ rows: [] as Array<{ id: number }> }));
               let receiptId = (existingReceipt.rows[0] as { id?: number } | undefined)?.id ?? null;

               await client.query(
                   `UPDATE service_payments
                    SET payment_status = 'Completed', amount_paid = $1, payment_method = $2,
                        ipn_payload_json = $3, status_response_json = $4, updated_at = NOW(),
                        payment_confirmed_at = COALESCE(payment_confirmed_at, NOW()), verified = true
                    WHERE id = $5`,
                   [payment.amount_requested, gatewayVerification.payment_method, JSON.stringify(ipnPayload), JSON.stringify(gatewayVerification), payment.id]
               );

               // Lock the service_requests row inside the same transaction so that
               // two concurrent IPNs on different service_payments for the same
               // booking serialise their amount_paid arithmetic — without this
               // FOR UPDATE both could read the same baseline and overwrite each
               // other's contribution.
               const reqCheck = await client.query(
                   `SELECT final_total, estimated_total, amount_paid
                    FROM service_requests WHERE id = $1 FOR UPDATE`,
                   [payment.service_request_id],
               );
               const totalTarget = Number(reqCheck.rows[0].final_total) > 0 ? Number(reqCheck.rows[0].final_total) : Number(reqCheck.rows[0].estimated_total);
               const newlyAccumulatedPaid = Number(reqCheck.rows[0].amount_paid) + Number(payment.amount_requested);
               const remainingBalance = totalTarget - newlyAccumulatedPaid;
               const newReqStatus = remainingBalance <= 0 ? 'Fully Paid' : 'Deposit Paid';

               await client.query(
                   `UPDATE service_requests SET amount_paid = $1, balance = $2, status = $3, updated_at = NOW() WHERE id = $4`,
                   [newlyAccumulatedPaid, remainingBalance, newReqStatus, payment.service_request_id]
               );

               if (receiptId == null) {
                   const receiptHash = generateReceiptNumber("OZK-RCT");
                   try {
                       const receiptRes = await client.query(
                           `INSERT INTO payment_receipts (
                             receipt_number, service_payment_id, service_request_id, school_id, receipt_type,
                             amount_paid, quotation_total, balance, currency, payment_method, pesapal_order_tracking_id, status
                           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Issued') RETURNING id`,
                           [receiptHash, payment.id, payment.service_request_id, payment.school_id, String(payment.payment_type).includes('Deposit') ? 'Deposit Receipt' : 'Full Payment Receipt', payment.amount_requested, totalTarget, remainingBalance, payment.currency, gatewayVerification.payment_method, trackingId]
                       );
                       receiptId = Number((receiptRes.rows[0] as { id: number }).id);
                   } catch (err) {
                       if ((err as { code?: string }).code === '23505') {
                           const rr = await client.query(
                               `SELECT id FROM payment_receipts WHERE service_payment_id = $1 LIMIT 1`,
                               [payment.id],
                           );
                           receiptId = Number((rr.rows[0] as { id: number }).id);
                       } else {
                           throw err;
                       }
                   }
               }

               await client.query(`UPDATE service_payments SET receipt_id = $1 WHERE id = $2 AND receipt_id IS NULL`, [receiptId, payment.id]);

               const schoolFetch = await client.query(`SELECT name FROM schools_directory WHERE id = $1`, [payment.school_id]);
               const schoolName = schoolFetch.rows[0]?.name ?? 'Unknown School';

               await client.query(
                   `INSERT INTO ozeki_tasks (task_type, title, description, school_id, service_request_id, priority, status)
                    VALUES ($1, $2, $3, $4, $5, 'High', 'Pending Follow-Up')`,
                   ["Service Payment Coordination", `Follow up: ${schoolName} - ${payment.payment_type} Secured`, `${schoolName} has liquidated UGX ${payment.amount_requested}.`, payment.school_id, payment.service_request_id]
               );

               await client.query('COMMIT');
           } catch (e) {
               await client.query('ROLLBACK');
               throw e;
           }
       });
       return NextResponse.json({ success: true, message: "Service Hook Successfully Reconciled" });
   }
   return NextResponse.json({ success: false, message: "Service pending or failed in gateway." });
}

// ==========================================
// C. GEOSPATIAL SPONSORSHIPS IPN LOGIC
// ==========================================
async function processSponsorshipWebhook(sponsorRecord: Record<string, unknown>, trackingId: string, ipnPayload: Record<string, unknown>) {
   // Idempotency gate 1: status already Completed.
   if (sponsorRecord.payment_status === 'Completed') {
       return NextResponse.json({ success: true, message: "Idempotent sponsorship hit ignored." });
   }

   const gatewayVerification = await verifyPesapalTransactionStatus(trackingId);

   if (gatewayVerification.payment_status_description === 'COMPLETED') {
       await withPostgresClient(async (client) => {
           await client.query('BEGIN');
           try {
               // Lock the sponsorship row to serialise concurrent IPN deliveries.
               const locked = await client.query(
                   `SELECT id, receipt_id, payment_status FROM sponsorships WHERE id = $1 FOR UPDATE`,
                   [sponsorRecord.id],
               );
               const liveRow = locked.rows[0] as { id: number; receipt_id: number | null; payment_status: string } | undefined;
               // Idempotency gate 2: after the lock, re-check that we haven't already processed.
               if (!liveRow || liveRow.payment_status === 'Completed' || liveRow.receipt_id != null) {
                   await client.query('COMMIT');
                   return;
               }

               // Idempotency gate 3: an active receipt may already exist for this
               // sponsorship even though the parent row's status wasn't updated
               // (e.g. partial failure on a prior IPN). The UNIQUE index on
               // sponsorship_receipts(sponsorship_id) WHERE not archived blocks
               // duplicates, but we still prefer to detect + skip gracefully.
               const existingReceipt = await client.query(
                   `SELECT id FROM sponsorship_receipts
                    WHERE sponsorship_id = $1 AND archived_due_to_finance_reset IS FALSE
                    LIMIT 1`,
                   [sponsorRecord.id],
               ).catch(() => ({ rows: [] as Array<{ id: number }> }));
               let receiptId = (existingReceipt.rows[0] as { id?: number } | undefined)?.id ?? null;

               await client.query(
                   `UPDATE sponsorships
                    SET payment_status = 'Completed', payment_method = $1,
                        ipn_payload_json = $2, status_response_json = $3, updated_at = NOW(),
                        paid_at = COALESCE(paid_at, NOW())
                    WHERE id = $4`,
                   [gatewayVerification.payment_method, JSON.stringify(ipnPayload), JSON.stringify(gatewayVerification), sponsorRecord.id],
               );

               if (receiptId == null) {
                   const receiptHash = generateReceiptNumber("OZK-SPN-RCT");
                   try {
                       const receiptRes = await client.query(
                           `INSERT INTO sponsorship_receipts (
                             receipt_number, sponsorship_id, sponsorship_reference, donor_name, donor_email,
                             sponsorship_type, sponsorship_target_name, sponsorship_focus,
                             amount, currency, payment_method, pesapal_order_tracking_id, status
                           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Issued') RETURNING id`,
                           [
                             receiptHash, sponsorRecord.id, sponsorRecord.sponsorship_reference, sponsorRecord.donor_name, sponsorRecord.donor_email,
                             sponsorRecord.sponsorship_type, sponsorRecord.sponsorship_target_name, sponsorRecord.sponsorship_focus,
                             sponsorRecord.amount, sponsorRecord.currency, gatewayVerification.payment_method, trackingId,
                           ],
                       );
                       receiptId = Number((receiptRes.rows[0] as { id: number }).id);
                   } catch (err) {
                       // UNIQUE(sponsorship_id) violation ⇒ a concurrent IPN beat us. Look up + reuse.
                       if ((err as { code?: string }).code === '23505') {
                           const rr = await client.query(
                               `SELECT id FROM sponsorship_receipts WHERE sponsorship_id = $1 LIMIT 1`,
                               [sponsorRecord.id],
                           );
                           receiptId = Number((rr.rows[0] as { id: number }).id);
                       } else {
                           throw err;
                       }
                   }
               }

               await client.query(`UPDATE sponsorships SET receipt_id = $1 WHERE id = $2 AND receipt_id IS NULL`, [receiptId, sponsorRecord.id]);
               await client.query('COMMIT');
           } catch (e) {
               await client.query('ROLLBACK');
               throw e;
           }
       });
       return NextResponse.json({ success: true, message: "Geospatial Sponsorship Hook Successfully Reconciled" });
   }
   return NextResponse.json({ success: false, message: "Sponsorship pending or failed in gateway." });
}
