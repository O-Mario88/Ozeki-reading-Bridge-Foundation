"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function MockPesapalIframePage() {
   const searchParams = useSearchParams();
   const router = useRouter();
   const trackingId = searchParams.get('trackingId');
   const merchantRef = searchParams.get('ref');
   const amount = searchParams.get('amt');
   
   const [isPolling, setIsPolling] = useState(false);

   const triggerMockIPN = async () => {
      setIsPolling(true);
      try {
         // This physically simulates Pesapal's external backend hitting our Ozeki Webhook
         await fetch("/api/payments/pesapal/ipn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               OrderTrackingId: trackingId,
               OrderMerchantReference: merchantRef,
               OrderNotificationType: "IPN"
            })
         });

         // Push user to callback waiting room just like Pesapal naturally redirects
         setTimeout(() => {
            router.push(`/payments/pesapal/callback?OrderTrackingId=${trackingId}&OrderMerchantReference=${merchantRef}`);
         }, 1500);

      } catch (e) {
         alert("Mock Network Failure");
         setIsPolling(false);
      }
   };

   return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
         <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="bg-blue-600 text-white p-6 text-center">
               <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner">
                  <CreditCard className="w-8 h-8 text-blue-600" />
               </div>
               <h1 className="text-xl font-bold">Pesapal Secure Gateway</h1>
               <p className="text-blue-200 text-xs mt-1">(Development Mock Mode)</p>
            </div>

            <div className="p-8">
               <div className="flex justify-between items-center text-sm mb-4 border-b pb-4">
                  <span className="text-gray-500">Merchant</span>
                  <span className="font-bold text-gray-900">OzekiRead Systems</span>
               </div>
               <div className="flex justify-between items-center text-sm mb-4 border-b pb-4">
                  <span className="text-gray-500">Amount Due</span>
                  <span className="font-black text-blue-700 text-xl">UGX {Number(amount).toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center text-xs mb-8 text-gray-400">
                  <span>Ref: {merchantRef}</span>
               </div>

               <button 
                  disabled={isPolling}
                  onClick={triggerMockIPN}
                  className="w-full bg-[#fbbc05] hover:bg-[#e0a800] text-black font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
               >
                  {isPolling ? "Executing IPN Webhook..." : <><CheckCircle className="w-5 h-5"/> Simulate Mobile Money Payment</>}
               </button>
               
               <p className="text-[10px] text-gray-400 text-center mt-6">
                  In production, this screen is an iframe injecting Pesapal's official V3 gateway allowing clients to enter their MTN/Airtel PINs. By clicking the button above, you simulate a successful payment sending an automatic POST webhook securely to your servers backend.
               </p>
            </div>
         </div>
      </div>
   );
}
