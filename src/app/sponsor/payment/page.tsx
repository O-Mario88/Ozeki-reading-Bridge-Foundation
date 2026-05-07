"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

// Default UGX amounts per sponsorship tier — kept in sync with the
// /api/payments/pesapal/sponsor/initiate min (50,000 UGX) and rough USD
// equivalents. Operators can adjust by editing this map; for tier-driven
// pricing pulled from sponsorship_tiers, use /sponsor instead.
const TIER_DEFAULTS_UGX: Record<string, number> = {
  school: 925_000,    // ~USD 250
  district: 55_500_000, // ~USD 15,000
  region: 277_500_000,  // ~USD 75,000
  custom: 100_000,
};

const ALLOWED_SPONSORSHIP_TYPES = new Set(["school", "district", "region", "sub-region", "subregion"]);

function SponsorshipPaymentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawType = searchParams.get("type") || "custom";
  const tierType = ALLOWED_SPONSORSHIP_TYPES.has(rawType) ? rawType : "school";

  const [amount, setAmount] = useState(String(TIER_DEFAULTS_UGX[tierType] ?? 100_000));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const donorName = String(formData.get("donorName") ?? "").trim();
    const email = String(formData.get("donorEmail") ?? "").trim();
    const phone = String(formData.get("donorPhone") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const sponsorshipTargetName = String(formData.get("targetName") ?? "").trim();
    const consentToUpdates = formData.get("consentToUpdates") === "on";
    const anonymous = formData.get("anonymous") === "on";

    try {
      const res = await fetch("/api/payments/pesapal/sponsor/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency: "UGX",
          sponsorshipType: tierType,
          sponsorshipTargetName: sponsorshipTargetName || null,
          donorType: "individual",
          name: donorName || null,
          email: email || null,
          phone: phone || null,
          message: message || null,
          anonymous,
          consentToUpdates,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(typeof payload.error === "string" ? payload.error : "Sponsorship initiation failed.");
        setLoading(false);
        return;
      }

      // Pesapal iframe redirect URL is returned as `redirectUrl` by the
      // initiate endpoint. Fall back to the success page if the gateway
      // didn't return one (defensive — shouldn't normally happen).
      if (payload.redirectUrl) {
        window.location.href = payload.redirectUrl;
      } else if (payload.merchantReference) {
        router.push(`/sponsor/success?ref=${encodeURIComponent(String(payload.merchantReference))}`);
      } else {
        setErrorMsg("Payment gateway did not return a redirect URL. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center">
          <span className="ozeki-badge bg-emerald-100 text-[#044f4d] mb-4">Secure Checkout</span>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-2">
            Fund {tierType.charAt(0).toUpperCase() + tierType.slice(1)} Sponsorship
          </h1>
          <p className="text-slate-500">
            You are completing a direct investment through OzekiRead&apos;s secure Pesapal gateway.
          </p>
        </header>

        <div className="ozeki-card border-t-4 border-t-ozeki-primary shadow-xl">
          <form onSubmit={handlePayment} className="space-y-6">
            <div>
              <h2 className="text-lg font-bold border-b pb-2 mb-4">Donor Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full name or organization</label>
                  <input required name="donorName" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. John Doe / Foundation X" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email address</label>
                  <input required type="email" name="donorEmail" className="w-full border rounded-lg px-3 py-2" placeholder="Receipt will be sent here" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone number</label>
                  <input
                    required
                    name="donorPhone"
                    inputMode="tel"
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="+256 700 000000"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Required by Pesapal for verification. Include country code.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target name (optional)</label>
                  <input name="targetName" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. specific district / school" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Optional message / dedication</label>
                  <input name="message" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="In honor of..." />
                </div>
                <div className="md:col-span-2 flex flex-col gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="consentToUpdates" defaultChecked />
                    <span>Send me impact updates about this sponsorship.</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="anonymous" />
                    <span>Make this sponsorship anonymous in public reporting.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-slate-700">Sponsorship amount (UGX)</span>
                <input
                  required
                  type="number"
                  min="50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border rounded-lg px-3 py-1 w-44 text-right font-bold text-lg text-[#066a67] focus:ring-2 focus:ring-emerald-500"
                  placeholder="100000"
                />
              </div>
              <p className="text-xs text-slate-400 text-right">
                Processed via Pesapal IPN. Minimum {Number(50_000).toLocaleString()} UGX.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !amount || Number(amount) < 50_000}
              className="ozeki-btn ozeki-btn-primary w-full py-4 text-xl mt-6 shadow-lg hover:shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Connecting to Pesapal..."
                : `Pay ${Number(amount || 0).toLocaleString()} UGX via Pesapal`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SponsorshipPaymentWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-20 text-slate-500">Loading secure checkout…</div>}>
      <SponsorshipPaymentForm />
    </Suspense>
  );
}
