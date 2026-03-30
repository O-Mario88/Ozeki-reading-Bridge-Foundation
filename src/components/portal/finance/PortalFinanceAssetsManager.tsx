"use client";

import { useState } from "react";
import { formatMoney } from "@/components/portal/finance/format";
import { FormModal, FormPage, FormSection, FormField } from "@/components/forms";
import type { FinanceAssetRecord } from "@/lib/server/postgres/repositories/finance-assets";

export function PortalFinanceAssetsManager({ initialAssets }: { initialAssets: FinanceAssetRecord[] }) {
  const [assets, setAssets] = useState<FinanceAssetRecord[]>(initialAssets);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      acquisitionDate: fd.get("acquisitionDate"),
      purchaseValue: Number(fd.get("purchaseValue") || 0),
      currency: fd.get("currency") || "UGX",
      usefulLifeMonths: Number(fd.get("usefulLifeMonths") || 0),
      residualValue: Number(fd.get("residualValue") || 0),
      depreciationMethod: fd.get("depreciationMethod") || "none",
    };

    try {
      const res = await fetch("/api/portal/finance/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create asset.");
      setAssets([data.asset, ...assets]);
      setIsAdding(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDispose(id: number) {
    if (!confirm("Are you sure you want to dispose of this asset?")) return;
    try {
      const res = await fetch(`/api/portal/finance/assets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispose", reason: "Manual Disposal" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Disposal failed");
      }
      setAssets(assets.map(a => a.id === id ? { ...a, status: 'disposed' } : a));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch(err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2>Fixed Asset Register</h2>
        <button className="button button-primary" onClick={() => { setIsAdding(true); setError(null); }}>
          Register Fixed Asset
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
              <th>Asset Code</th>
              <th>Name</th>
              <th>Acquired On</th>
              <th>Purchase Value</th>
              <th>Useful Life (Mos)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-4">
                  No assets found.
                </td>
              </tr>
            ) : (
              assets.map((ast) => (
                <tr key={ast.id} className={ast.status === "disposed" ? "opacity-50 line-through" : ""}>
                  <td>{ast.assetCode}</td>
                  <td>{ast.name}</td>
                  <td>{ast.acquisitionDate}</td>
                  <td>{formatMoney(ast.currency, ast.purchaseValue)}</td>
                  <td>{ast.usefulLifeMonths}</td>
                  <td>
                    <span className={`badge badge-${ast.status === 'active' ? 'green' : 'gray'}`}>
                      {ast.status}
                    </span>
                  </td>
                  <td>
                    {ast.status === "active" && (
                      <button 
                        onClick={() => handleDispose(ast.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Dispose
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
        title="Register Fixed Asset"
        description="Add a new fixed asset to the registry."
        closeLabel="Close"
      >
        <form onSubmit={handleCreate}>
          <FormPage title="Asset Details" subtitle="Information about the acquired asset.">
            {error ? <p className="form-message error">{error}</p> : null}
            <FormSection title="Asset Details">
              <FormField label="Asset Name" required>
                <input type="text" name="name" className="input" placeholder="e.g. MacBook Pro, Toyota Hilux" required />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Acquisition Date" required>
                  <input type="date" name="acquisitionDate" className="input" required defaultValue={new Date().toISOString().split("T")[0]} />
                </FormField>
                <FormField label="Currency">
                  <select name="currency" className="input">
                    <option value="UGX">UGX</option>
                    <option value="USD">USD</option>
                  </select>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Valuation" description="Financial cost and expected lifespan.">
              <FormField label="Purchase Value" required>
                <input type="number" step="0.01" name="purchaseValue" className="input" required min="0" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Useful Life (Months)" required>
                  <input type="number" name="usefulLifeMonths" className="input" required min="1" defaultValue="36" />
                </FormField>
                <FormField label="Depreciation Method">
                  <select name="depreciationMethod" className="input" defaultValue="none">
                    <option value="none">None / Non-depreciating</option>
                    <option value="straight_line">Straight Line</option>
                  </select>
                </FormField>
              </div>
            </FormSection>
            
            <div className="form-actions mt-6">
              <button className="button button-primary" type="submit">
                Register Asset
              </button>
            </div>
          </FormPage>
        </form>
      </FormModal>
    </div>
  );
}
