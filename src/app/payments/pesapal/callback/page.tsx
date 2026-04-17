"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle, Clock, XCircle, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/public/PageHero";

function CallbackContent() {
   const searchParams = useSearchParams();
   const trackingId = searchParams.get('OrderTrackingId');
   
   const [status, setStatus] = useState<'polling'|'success'|'failed'>('polling');
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const [verifyData, setVerifyData] = useState<any>(null);

   useEffect(() => {
      if (!trackingId) return;

      const pollStatus = async () => {
         try {
            const res = await fetch(`/api/payments/verify?trackingId=${trackingId}`);
            const data = await res.json();
            
            if (data.status === 'Completed' || data.verified) {
               setVerifyData(data.metadata || data);
               setStatus('success');
            } else if (data.status === 'Failed' || data.status === 'INVALID') {
               setStatus('failed');
            } else {
               // Still pending Customer Action (IPN hasn't fired yet)
               setTimeout(pollStatus, 3000); 
            }
         } catch(_e) {
            setTimeout(pollStatus, 3000);
         }
      };

      pollStatus();
   }, [trackingId]);

   if (!trackingId) return <div className="p-20 text-center text-red-500">Invalid Payment Session</div>;

   return (
      <div className="max-w-2xl mx-auto px-4 py-20">
         <div className="bg-white border rounded-3xl shadow-xl overflow-hidden text-center p-12">
            
            {status === 'polling' && (
               <div className="animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center mx-auto mb-6">
                     <Clock className="w-10 h-10 text-blue-500 animate-spin" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-2">Awaiting Gateway Confirmation...</h2>
                  <p className="text-gray-500">Hold tight. OzekiRead is securely exchanging cryptographic validation metrics over the Pesapal IPN infrastructure to mathematically lock your receipt.</p>
               </div>
            )}

            {status === 'success' && (
               <div className="animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center mx-auto mb-6">
                     <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-3xl font-black text-green-900 mb-2">Payment Successfully Validated!</h2>
                  <p className="text-green-700/80 mb-8 max-w-md mx-auto">Your MT/Airtel network token has been verified. A secure localized receipt has been generated mapping automatically against your school index.</p>
                  
                  <div className="bg-gray-50 rounded-2xl border p-6 text-left space-y-4 mb-8">
                     <div className="flex justify-between items-center border-b pb-3 border-dashed border-gray-300">
                        <span className="text-gray-500 font-bold">Transaction Reference</span>
                        <span className="font-mono text-gray-900">{trackingId}</span>
                     </div>
                     <div className="flex justify-between items-center border-b pb-3 border-dashed border-gray-300">
                        <span className="text-gray-500 font-bold">Cryptographic Receipt ID</span>
                        <span className="font-mono text-[#006b61] font-bold bg-[#006b61]/10 px-2 py-1 rounded">{verifyData?.receiptNumber || 'OZK-RCT-PENDING'}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-bold">Remaining Residual Balance</span>
                        <span className="font-black text-gray-900">UGX {Number(verifyData?.balance || 0).toLocaleString()}</span>
                     </div>
                  </div>

                  <div className="flex justify-center gap-4">
                     <Link href="/services/request" className="text-gray-500 font-bold py-3 hover:underline">
                        Return to Homepage
                     </Link>
                     <Link href="/portal/finance" className="bg-[#006b61] text-white px-6 py-3 rounded-full font-bold shadow hover:bg-[#00524a] flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        View Finance Dashboard <ChevronRight className="w-4 h-4 ml-1" />
                     </Link>
                  </div>
               </div>
            )}

            {status === 'failed' && (
               <div className="animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mx-auto mb-6">
                     <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-2">Payment Verification Failed</h2>
                  <p className="text-red-500">The gateway rejected the transaction. Please verify if your PIN was correct or if you have sufficient mobile money balance.</p>
                  
                  <div className="mt-8">
                     <Link href="/services/request" className="bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow hover:bg-black">
                        Try Again
                     </Link>
                  </div>
               </div>
            )}
            
         </div>
      </div>
   );
}

export default function PesapalCallbackPage() {
   return (
      <div className="bg-gray-50 min-h-screen">
         <PageHero 
           imageSrc="/photos/17.jpeg"
           tagline="FinTech Layer"
           title="Payment Verification Log"
           subtitle="Executing highly secure server-side handshakes traversing Mobile Money operators to validate financial integrity natively."
         />
         <Suspense fallback={<div className="p-20 text-center text-gray-500">Loading payment status...</div>}>
            <CallbackContent />
         </Suspense>
      </div>
   );
}
