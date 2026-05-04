"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import type { DonorRecurringSubscriptionRow } from "@/lib/server/postgres/repositories/donor-portfolio";

const UGX = new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 });

type Props = {
  refCode: string;
  initialSubscriptions: DonorRecurringSubscriptionRow[];
};

export function DonorRecurringManager({ refCode, initialSubscriptions }: Props) {
  const router = useRouter();
  const [subs, setSubs] = useState(initialSubscriptions);
  const [adding, setAdding] = useState(false);
  const [planLabel, setPlanLabel] = useState("Monthly support");
  const [amount, setAmount] = useState(50000);
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/donors/${refCode}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planLabel, amountUgx: amount, frequency }),
      });
      const data = (await res.json()) as { ok?: boolean; subscription?: DonorRecurringSubscriptionRow; error?: string };
      if (!res.ok || !data.subscription) {
        setError(data.error ?? "Could not create plan.");
        return;
      }
      setSubs([data.subscription, ...subs]);
      setAdding(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id: number) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/donors/${refCode}/subscriptions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status: "cancelled", cancelledAt: new Date().toISOString() } : s)));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {subs.length === 0 ? (
        <p className="text-xs text-gray-500 mb-3">No recurring giving plan yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 mb-3">
          {subs.map((s) => (
            <li key={s.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.planLabel}</p>
                <p className="text-xs text-gray-500">
                  {UGX.format(s.amountUgx)} · {s.frequency}
                  {s.nextChargeDate ? ` · next ${s.nextChargeDate}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  s.status === "active" ? "bg-emerald-50 text-emerald-700"
                    : s.status === "pending" ? "bg-amber-50 text-amber-700"
                      : s.status === "cancelled" ? "bg-gray-100 text-gray-600"
                        : "bg-red-50 text-red-700"
                }`}>{s.status}</span>
                {s.status !== "cancelled" ? (
                  <button type="button" onClick={() => cancel(s.id)} disabled={submitting} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="plan-label" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Label</label>
              <input id="plan-label" value={planLabel} onChange={(e) => setPlanLabel(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
            </div>
            <div>
              <label htmlFor="plan-amount" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Amount (UGX)</label>
              <input id="plan-amount" type="number" min={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
            </div>
            <div>
              <label htmlFor="plan-frequency" className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Frequency</label>
              <select id="plan-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <p>Plans start as <strong>pending</strong>. Pesapal charge link is generated by our team and emailed to you to authorise.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 text-xs">Cancel</button>
              <button type="button" onClick={create} disabled={submitting} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#066a67] text-white text-xs font-bold disabled:bg-gray-300">
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Create plan
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:border-gray-300">
          <Plus className="w-3.5 h-3.5" /> Set up recurring giving
        </button>
      )}
    </div>
  );
}
