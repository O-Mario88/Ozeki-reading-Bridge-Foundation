import { queryPostgres } from "@/lib/server/postgres/client";

/**
 * LIVE PESAPAL V3 FINTECH INTEGRATION LAYER
 * Encapsulates OAuth Bearer fetching, Order Submission, and Status Polling
 * securely targeting the Production Banking Infrastructure.
 */

function getPesapalBaseUrl() {
   const env = process.env.PESAPAL_ENVIRONMENT || 'sandbox';
   return env === 'live' ? 'https://pay.pesapal.com/v3' : 'https://pay.pesapal.com/v3'; 
   // Defaulting to Live since the user stated they are production keys.
}

async function fetchBearerToken(): Promise<string> {
   const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
   const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

   if (!consumerKey || !consumerSecret) {
      throw new Error("Missing PESAPAL_CONSUMER_KEY or PESAPAL_CONSUMER_SECRET in environment variables.");
   }

   const response = await fetch(`${getPesapalBaseUrl()}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
         'Accept': 'application/json'
      },
      body: JSON.stringify({
         consumer_key: consumerKey,
         consumer_secret: consumerSecret
      })
   });

   if (!response.ok) {
      throw new Error("Pesapal Authentication Failed: Unable to fetch Bearer Token.");
   }

   const data = await response.json();
   return data.token;
}

export async function initiatePesapalOrderGateway(paymentId: number, merchantReference: string, amount: number, currency: string, schoolContact: any) {
   // 1. Fetch Bearer Token dynamically
   const token = await fetchBearerToken();

   const ipnId = process.env.PESAPAL_IPN_ID || "c3b52d62-xxxx-xxxx-xxxx"; 
   // Note: In production you must formally register an IPN URL to get an IPN ID.
   
   const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ozekiread.org'}/payments/pesapal/callback`;

   // 2. Transmit the Official SubmitOrderRequest
   const orderPayload = {
      id: merchantReference,
      currency: currency,
      amount: amount,
      description: 'OzekiRead Services Booking',
      callback_url: callbackUrl,
      notification_id: ipnId,
      billing_address: {
         phone_number: schoolContact.phone || "000000000",
         email_address: schoolContact.email || "finance@ozekiread.org",
         first_name: "Ozeki",
         last_name: "School Client"
      }
   };

   const res = await fetch(`${getPesapalBaseUrl()}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
         "Authorization": \`Bearer \${token}\`,
         "Content-Type": "application/json",
         "Accept": "application/json"
      },
      body: JSON.stringify(orderPayload)
   });

   if (!res.ok) {
      const errPayload = await res.text();
      console.error("[PESAPAL TXN FAULT]", errPayload);
      throw new Error("Failed to secure Pesapal Gateway connection.");
   }

   const data = await res.json();
   
   const orderTrackingId = data.order_tracking_id;
   const gatewayIframeRedirect = data.redirect_url; // Directs user to the actual MTN/Airtel prompt page

   // 3. Store OrderTrackingId securely into internal postgres ledger
   if (merchantReference.startsWith('OZK-DNRC-')) {
      await queryPostgres(
        `UPDATE donations 
         SET pesapal_order_tracking_id = $1, payment_status = 'Pending Customer Action', updated_at = NOW()
         WHERE id = $2`,
        [orderTrackingId, paymentId]
      );
   } else if (merchantReference.startsWith('OZK-SPN-RCT-')) {
      await queryPostgres(
        `UPDATE sponsorships 
         SET pesapal_order_tracking_id = $1, payment_status = 'Pending Customer Action', updated_at = NOW()
         WHERE id = $2`,
        [orderTrackingId, paymentId]
      );
   } else {
      await queryPostgres(
        `UPDATE service_payments 
         SET pesapal_order_tracking_id = $1, payment_status = 'Pending Customer Action', updated_at = NOW()
         WHERE id = $2`,
        [orderTrackingId, paymentId]
      );
   }

   return {
      orderTrackingId: orderTrackingId,
      redirectUrl: gatewayIframeRedirect
   };
}

export async function verifyPesapalTransactionStatus(orderTrackingId: string) {
   const token = await fetchBearerToken();

   const res = await fetch(`${getPesapalBaseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
      headers: {
         "Authorization": \`Bearer \${token}\`,
         "Accept": "application/json",
         "Content-Type": "application/json"
      }
   });

   if (!res.ok) {
       throw new Error("Failed to verify transaction signature with Pesapal.");
   }

   const data = await res.json();
   /*
   Data structure example:
   {
      "payment_method": "MTN Mobile Money",
      "amount": 500000,
      "created_date": "...",
      "confirmation_code": "ABC123XXX",
      "payment_status_description": "COMPLETED",
      "description": "Transaction Successful"
   }
   */
   return data;
}
