"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function SponsorshipPaymentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tierType = searchParams.get("type") || "custom";

  const [amount, setAmount] = useState(
    tierType === "school" ? "250" : tierType === "district" ? "15000" : tierType === "region" ? "75000" : ""
  );
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("PESAPAL_VIP");

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      // Execute the unified native API hook simulating the Pesapal bridge
      const res = await fetch("/api/checkout/sponsor", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          targetType: tierType,
          amount: Number(amount),
          paymentMethod
        }),
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error("Payment brokerage failed");
      
      const payload = await res.json();
      
      if (payload.redirectUrl) {
        // Typically for Visa/Pesapal Iframe Redirects
        window.location.href = payload.redirectUrl;
      } else {
        // Auto-success for MTN/Airtel Native Mobile Money triggers
        router.push(`/sponsor/success?ref=${payload.reference_id}`);
      }
    } catch (_error) {
      alert("Payment simulation failed. Ensure Postgres backend is active.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center">
          <span className="ozeki-badge bg-emerald-100 text-emerald-800 mb-4">Secure Checkout</span>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-2">Fund {tierType.charAt(0).toUpperCase() + tierType.slice(1)} Project</h1>
          <p className="text-slate-500">You are completing a direct investment through OzekiRead's secure Pesapal gateway.</p>
        </header>

        <div className="ozeki-card border-t-4 border-t-ozeki-primary shadow-xl">
          <form onSubmit={handlePayment} className="space-y-6">
            
            {/* Donor Identity */}
            <div>
              <h2 className="text-lg font-bold border-b pb-2 mb-4">Donor Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name or Organization</label>
                  <input required name="donorName" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. John Doe / Foundation X" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input required type="email" name="donorEmail" className="w-full border rounded-lg px-3 py-2" placeholder="Receipt will be sent here" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Optional Message / Dedication</label>
                  <input name="message" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="In honor of..." />
                </div>
              </div>
            </div>

            {/* Financial Parameters */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-slate-700">Sponsorship Amount (USD)</span>
                {tierType === "custom" ? (
                  <input 
                    required 
                    type="number" 
                    min="10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border rounded-lg px-3 py-1 w-32 text-right font-bold text-lg text-emerald-700 focus:ring-2 focus:ring-emerald-500" 
                    placeholder="250"
                  />
                ) : (
                  <span className="text-2xl font-black text-ozeki-primary">${Number(amount).toLocaleString()}</span>
                )}
              </div>
              <p className="text-xs text-slate-400 text-right">Processed via secure IPN handoff. OzekiRead utilizes zero-knowledge card environments.</p>
            </div>

            {/* Payment Router */}
            <div>
              <h2 className="text-lg font-bold border-b pb-2 mb-4">Payment Method</h2>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => setPaymentMethod("PESAPAL_VIP")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === 'PESAPAL_VIP' ? 'border-ozeki-primary bg-emerald-50 text-ozeki-primary' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                >
                  <div className="font-bold mb-1">Credit / Debit Card</div>
                  <div className="text-xs opacity-70">Visa, Mastercard, Amex. Redirects to Pesapal Secure iFrame.</div>
                </button>
                <button 
                  type="button" 
                  onClick={() => setPaymentMethod("MOBILE_MONEY")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === 'MOBILE_MONEY' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                >
                  <div className="font-bold mb-1">Mobile Money (UGX)</div>
                  <div className="text-xs opacity-70">MTN & Airtel. Instant mobile push verification.</div>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !amount}
              className="ozeki-btn ozeki-btn-primary w-full py-4 text-xl mt-6 shadow-lg hover:shadow-emerald-900/30"
            >
              {loading ? "Establishing Secure Connection..." : `Authorize Investment ${amount ? '($' + Number(amount).toLocaleString() + ')' : ''}`}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

export default function SponsorshipPaymentWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-20 text-slate-500">Loading secure tunnel...</div>}>
      <SponsorshipPaymentForm />
    </Suspense>
  );
}
