"use client";

import { useState } from "react";
import { formatMoney } from "@/components/portal/finance/format";
import { FormModal, FormPage, FormSection, FormField } from "@/components/forms";
import type { FinanceLiabilityRecord } from "@/lib/server/postgres/repositories/finance-liabilities";

export function PortalFinanceLiabilitiesManager({ initialLiabilities }: { initialLiabilities: FinanceLiabilityRecord[] }) {
  const [liabilities, setLiabilities] = useState<FinanceLiabilityRecord[]>(initialLiabilities);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      description: fd.get("description"),
      date: fd.get("date"),
      amount: Number(fd.get("amount") || 0),
      type: fd.get("type") || "unpaid_expense",
    };

    try {
      const res = await fetch("/api/portal/finance/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log liability.");
      setLiabilities([data.liability, ...liabilities]);
      setIsAdding(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
         setError(String(err));
      }
    }
  }

  async function handleReverse(id: number) {
    if (!confirm("Are you sure you want to reverse this liability journal entry?")) return;
    try {
      const res = await fetch(`/api/portal/finance/liabilities/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reverse" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reversal failed");
      }
      setLiabilities(liabilities.map(l => l.id === id ? { ...l, status: 'reversed' } : l));
    } catch(err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2>Liabilities Registry</h2>
        <button className="button button-primary" onClick={() => { setIsAdding(true); setError(null); }}>
          Record Liability
        </button>
      </div>

      {error && !isAdding && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">
          Error: {error}
        </div>
      )}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Journal Entry</th>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {liabilities.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-4">
                  No liabilities registered.
                </td>
              </tr>
            ) : (
              liabilities.map((lib) => (
                <tr key={lib.id} className={lib.status === "reversed" ? "opacity-50 line-through" : ""}>
                  <td>{lib.entryNumber}</td>
                  <td>{lib.entryDate}</td>
                  <td>{lib.description}</td>
                  <td>
                    <span className="badge badge-gray capitalize">
                      {lib.liabilityType.replace("_", " ")}
                    </span>
                  </td>
                  <td>{formatMoney("UGX", lib.amount)}</td>
                  <td>
                    <span className={`badge badge-${lib.status === 'posted' ? 'green' : 'gray'}`}>
                      {lib.status}
                    </span>
                  </td>
                  <td>
                    {lib.status === "posted" && (
                      <button 
                        onClick={() => handleReverse(lib.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        open={isAdding}
        onClose={() => setIsAdding(false)}
        title="Record New Liability"
        description="Log an accrued expense or an outstanding loan to the Accounts Payable ledger."
        closeLabel="Cancel"
      >
        <form onSubmit={handleCreate}>
          <FormPage title="Liability Details" subtitle="Input the basic details of the debt.">
            {error ? <p className="form-message error">{error}</p> : null}
            <FormSection title="Information">
              <FormField label="Description / Cause" required>
                <input type="text" name="description" className="input" placeholder="e.g. Unpaid IT Consultant Invoice" required />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Entry Date" required>
                  <input type="date" name="date" className="input" required defaultValue={new Date().toISOString().split("T")[0]} />
                </FormField>
                <FormField label="Liability Origin">
                  <select name="type" className="input" required defaultValue="unpaid_expense">
                    <option value="unpaid_expense">Unpaid/Accrued Expense</option>
                    <option value="loan">Bank/External Loan</option>
                  </select>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Financials">
              <FormField label="Amount (UGX)" required>
                <input type="number" step="0.01" name="amount" className="input" required min="0" />
              </FormField>
            </FormSection>

            <div className="form-actions mt-6">
              <button className="button button-primary" type="submit">
                Post Liability Journal
              </button>
            </div>
          </FormPage>
        </form>
      </FormModal>
    </div>
  );
}
