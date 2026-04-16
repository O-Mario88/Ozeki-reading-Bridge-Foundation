import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { verifyPesapalTransactionStatus } from "@/lib/server/payments/pesapal";

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
         \`SELECT id, service_request_id, school_id, amount_requested, currency, payment_type, payment_status, pesapal_merchant_reference
          FROM service_payments WHERE pesapal_order_tracking_id = $1 LIMIT 1\`,
         [trackingId]
      );

      if (servicePaymentCheck.rows.length > 0) {
          return await processServiceBookingWebhook(servicePaymentCheck.rows[0], trackingId, ipnPayload);
      }

      // 2. Probe the Philanthropic Donations Ledger
      const donationCheck = await queryPostgres(
         \`SELECT id, amount, currency, payment_status, pesapal_merchant_reference, donation_reference, donor_name, email, donation_purpose 
          FROM donations WHERE pesapal_order_tracking_id = $1 LIMIT 1\`,
         [trackingId]
      );

      if (donationCheck.rows.length > 0) {
          return await processDonationWebhook(donationCheck.rows[0], trackingId, ipnPayload);
      }

      // 3. Probe the Geographic Sponsorships Ledger
      const sponsorCheck = await queryPostgres(
         `SELECT id, amount, currency, payment_status, pesapal_merchant_reference, sponsorship_reference, donor_name, donor_email, sponsorship_purpose 
          FROM sponsorships WHERE pesapal_order_tracking_id = $1 LIMIT 1`,
         [trackingId]
      );

      if (sponsorCheck.rows.length > 0) {
          return await processSponsorshipWebhook(sponsorCheck.rows[0], trackingId, ipnPayload);
      }

      // 4. Unrecognized hash block
      return NextResponse.json({ message: "Transaction orphan blocked." }, { status: 404 });

   } catch(e: any) {
      console.error("[PESAPAL IPN FATAL EXCEPTION]", e);
      return NextResponse.json({ message: "Internal Integration Fault" }, { status: 500 });
   }
}

// ==========================================
// A. PHILANTHROPIC DONATIONS IPN LOGIC
// ==========================================
async function processDonationWebhook(donation: any, trackingId: string, ipnPayload: any) {
   if (donation.payment_status === 'Completed') {
       return NextResponse.json({ success: true, message: "Idempotent donation hit ignored." });
   }

   const gatewayVerification = await verifyPesapalTransactionStatus(trackingId);

   if (gatewayVerification.payment_status_description === 'COMPLETED') {
       await queryPostgres('BEGIN');
       try {
           await queryPostgres(
               \`UPDATE donations 
                SET payment_status = 'Completed', payment_method = $1, 
                    ipn_payload_json = $2, status_response_json = $3, updated_at = NOW(),
                    paid_at = NOW()
                WHERE id = $4\`,
               [gatewayVerification.payment_method, JSON.stringify(ipnPayload), JSON.stringify(gatewayVerification), donation.id]
           );

           const receiptHash = \`OZK-DON-RCT-\${new Date().getFullYear()}-\${Math.random().toString().substring(2,8)}\`;
           const receiptRes = await queryPostgres(
               \`INSERT INTO donation_receipts (
                 receipt_number, donation_id, donation_reference, donor_name, donor_email,
                 amount, currency, donation_purpose, payment_method, pesapal_order_tracking_id, status
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Issued') RETURNING id\`,
               [
                 receiptHash, donation.id, donation.donation_reference, donation.donor_name, donation.email,
                 donation.amount, donation.currency, donation.donation_purpose, 
                 gatewayVerification.payment_method, trackingId
               ]
           );

           await queryPostgres(\`UPDATE donations SET receipt_id = $1 WHERE id = $2\`, [receiptRes.rows[0].id, donation.id]);
           await queryPostgres('COMMIT');
           return NextResponse.json({ success: true, message: "Donation Hook Successfully Reconciled" });

       } catch (e) {
           await queryPostgres('ROLLBACK');
           throw e;
       }
   }
   return NextResponse.json({ success: false, message: "Donation pending or failed in gateway." });
}

// ==========================================
// B. SCHOOL SERVICE BOOKINGS IPN LOGIC
// ==========================================
async function processServiceBookingWebhook(payment: any, trackingId: string, ipnPayload: any) {
   if (payment.payment_status === 'Completed') {
       return NextResponse.json({ success: true, message: "Idempotent service hit ignored." });
   }

   const gatewayVerification = await verifyPesapalTransactionStatus(trackingId);

   if (gatewayVerification.payment_status_description === 'COMPLETED') {
       await queryPostgres('BEGIN');
       try {
           await queryPostgres(
               \`UPDATE service_payments 
                SET payment_status = 'Completed', amount_paid = $1, payment_method = $2, 
                    ipn_payload_json = $3, status_response_json = $4, updated_at = NOW(),
                    payment_confirmed_at = NOW(), verified = true
                WHERE id = $5\`,
               [payment.amount_requested, gatewayVerification.payment_method, JSON.stringify(ipnPayload), JSON.stringify(gatewayVerification), payment.id]
           );

           const reqCheck = await queryPostgres(\`SELECT final_total, estimated_total, amount_paid FROM service_requests WHERE id = $1\`, [payment.service_request_id]);
           const totalTarget = Number(reqCheck.rows[0].final_total) > 0 ? Number(reqCheck.rows[0].final_total) : Number(reqCheck.rows[0].estimated_total);
           const newlyAccumulatedPaid = Number(reqCheck.rows[0].amount_paid) + Number(payment.amount_requested);
           const remainingBalance = totalTarget - newlyAccumulatedPaid;
           
           let newReqStatus = remainingBalance <= 0 ? 'Fully Paid' : 'Deposit Paid';

           await queryPostgres(
               \`UPDATE service_requests SET amount_paid = $1, balance = $2, status = $3, updated_at = NOW() WHERE id = $4\`,
               [newlyAccumulatedPaid, remainingBalance, newReqStatus, payment.service_request_id]
           );

           const receiptHash = \`OZK-RCT-\${new Date().getFullYear()}-\${Math.random().toString().substring(2,8)}\`;
           const receiptRes = await queryPostgres(
               \`INSERT INTO payment_receipts (
                 receipt_number, service_payment_id, service_request_id, school_id, receipt_type,
                 amount_paid, quotation_total, balance, currency, payment_method, pesapal_order_tracking_id, status
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Issued') RETURNING id\`,
               [receiptHash, payment.id, payment.service_request_id, payment.school_id, payment.payment_type.includes('Deposit') ? 'Deposit Receipt' : 'Full Payment Receipt', payment.amount_requested, totalTarget, remainingBalance, payment.currency, gatewayVerification.payment_method, trackingId]
           );
           
           await queryPostgres(\`UPDATE service_payments SET receipt_id = $1 WHERE id = $2\`, [receiptRes.rows[0].id, payment.id]);

           const schoolFetch = await queryPostgres(\`SELECT name FROM schools_directory WHERE id = $1\`, [payment.school_id]);
           const schoolName = schoolFetch.rows[0]?.name || 'Unknown School';

           await queryPostgres(
               \`INSERT INTO ozeki_tasks (task_type, title, description, school_id, service_request_id, priority, status)
                VALUES ($1, $2, $3, $4, $5, 'High', 'Pending Follow-Up')\`,
               ["Service Payment Coordination", \`Follow up: \${schoolName} - \${payment.payment_type} Secured\`, \`\${schoolName} has liquidated UGX \${payment.amount_requested}.\`, payment.school_id, payment.service_request_id]
           );

           await queryPostgres('COMMIT');
           return NextResponse.json({ success: true, message: "Service Hook Successfully Reconciled" });

       } catch (e) {
           await queryPostgres('ROLLBACK');
           throw e;
       }
   }
   return NextResponse.json({ success: false, message: "Service pending or failed in gateway." });
}

// ==========================================
// C. GEOSPATIAL SPONSORSHIPS IPN LOGIC
// ==========================================
async function processSponsorshipWebhook(sponsorRecord: any, trackingId: string, ipnPayload: any) {
   if (sponsorRecord.payment_status === 'Completed') {
       return NextResponse.json({ success: true, message: "Idempotent sponsorship hit ignored." });
   }

   const gatewayVerification = await verifyPesapalTransactionStatus(trackingId);

   if (gatewayVerification.payment_status_description === 'COMPLETED') {
       await queryPostgres('BEGIN');
       try {
           // A. Lock Status
           await queryPostgres(
               `UPDATE sponsorships 
                SET payment_status = 'Completed', payment_method = $1, 
                    ipn_payload_json = $2, status_response_json = $3, updated_at = NOW(),
                    paid_at = NOW()
                WHERE id = $4`,
               [gatewayVerification.payment_method, JSON.stringify(ipnPayload), JSON.stringify(gatewayVerification), sponsorRecord.id]
           );

           // B. Cryptographic Geographic Receipt
           const receiptHash = `OZK-SPN-RCT-${new Date().getFullYear()}-${Math.random().toString().substring(2,8)}`;
           const receiptRes = await queryPostgres(
               `INSERT INTO sponsorship_receipts (
                 receipt_number, sponsorship_id, sponsorship_reference, donor_name, donor_email,
                 sponsorship_type, sponsorship_target_name, sponsorship_focus,
                 amount, currency, payment_method, pesapal_order_tracking_id, status
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Issued') RETURNING id`,
               [
                 receiptHash, sponsorRecord.id, sponsorRecord.sponsorship_reference, sponsorRecord.donor_name, sponsorRecord.donor_email,
                 sponsorRecord.sponsorship_type, sponsorRecord.sponsorship_target_name, sponsorRecord.sponsorship_purpose,
                 sponsorRecord.amount, sponsorRecord.currency, gatewayVerification.payment_method, trackingId
               ]
           );

           // C. Bind Back & Commit
           await queryPostgres(`UPDATE sponsorships SET receipt_id = $1 WHERE id = $2`, [receiptRes.rows[0].id, sponsorRecord.id]);
           await queryPostgres('COMMIT');
           return NextResponse.json({ success: true, message: "Geospatial Sponsorship Hook Successfully Reconciled" });

       } catch (e) {
           await queryPostgres('ROLLBACK');
           throw e;
       }
   }
   return NextResponse.json({ success: false, message: "Sponsorship pending or failed in gateway." });
}
