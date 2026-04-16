"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, XCircle, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/public/PageHero";

export default function PesapalCallbackPage() {
   const searchParams = useSearchParams();
   const trackingId = searchParams.get('OrderTrackingId');
   
   const [status, setStatus] = useState<'polling'|'success'|'failed'>('polling');
   const [verifyData, setVerifyData] = useState<any>(null);

   useEffect(() => {
      if (!trackingId) return;

      const pollStatus = async () => {
         try {
            const res = await fetch(`/api/payments/verify?trackingId=${trackingId}`);
            const data = await res.json();
            
            if (data.status === 'Completed' || data.verified) {
               setVerifyData(data);
               setStatus('success');
            } else if (data.status === 'Failed' || data.status === 'Reversed') {
               setStatus('failed');
            } else {
               // Still pending Customer Action (IPN hasn't fired yet)
               setTimeout(pollStatus, 3000); 
            }
         } catch(e) {
            setTimeout(pollStatus, 3000);
         }
      };

      pollStatus();
   }, [trackingId]);

   if (!trackingId) return <div className="p-20 text-center text-red-500">Invalid Payment Session</div>;

   return (
      <div className="bg-gray-50 min-h-screen">
         <PageHero 
           imageSrc="/photos/17.jpeg"
           tagline="FinTech Layer"
           title="Payment Verification Log"
           subtitle="Executing highly secure server-side handshakes traversing Mobile Money operators to validate financial integrity natively."
         />

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
                        <button className="bg-[#FA7D15] hover:bg-[#e86d0b] text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center">
                           <FileText className="w-5 h-5 mr-2" /> Download Official Receipt
                        </button>
                     </div>
                  </div>
               )}

               {status === 'failed' && (
                  <div className="animate-in fade-in zoom-in duration-500">
                     <div className="w-24 h-24 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-10 h-10 text-red-500" />
                     </div>
                     <h2 className="text-3xl font-black text-red-900 mb-2">Network Fault Detected</h2>
                     <p className="text-red-700/80 mb-8 max-w-md mx-auto">Pesapal reported a transaction anomaly resulting in payment termination. Please ensure your mobile money account possessed sufficient bounds and retry.</p>
                     
                     <Link href="/services/request" className="bg-gray-900 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex justify-center items-center">
                        Attempt Re-Booking <ChevronRight className="w-5 h-5 ml-2" />
                     </Link>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}
