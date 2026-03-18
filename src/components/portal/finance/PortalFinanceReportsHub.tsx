"use client";

import { useState } from "react";
import { formatMoney } from "@/components/portal/finance/format";

const REPORT_TYPES = [
  { id: "income-expense", label: "1. Income vs Expense Summary" },
  { id: "budget-vs-actual", label: "2. Budget vs Actual Report" },
  { id: "project-fund", label: "3. Project / Fund Financial Report" },
  { id: "expense-category", label: "4. Expense by Category Report" },
  { id: "cash-flow", label: "5. Cash Flow Statement" },
  { id: "receipts", label: "6. Receipts Report" },
  { id: "fixed-assets", label: "7. Fixed Assets Register" },
];

export function PortalFinanceReportsHub() {
  const [reportType, setReportType] = useState(REPORT_TYPES[0].id);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<Record<string, unknown>[] | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const url = new URL(`/api/portal/finance/reports/${reportType}`, window.location.origin);
      url.searchParams.set("startDate", startDate);
      url.searchParams.set("endDate", endDate);
      url.searchParams.set("fiscalYear", startDate.substring(0, 4));

      const res = await fetch(url.toString());
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || "Failed to load report");
      
      setReportData(json.data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    const url = new URL(`/api/portal/finance/reports/${reportType}`, window.location.origin);
    url.searchParams.set("startDate", startDate);
    url.searchParams.set("endDate", endDate);
    url.searchParams.set("fiscalYear", startDate.substring(0, 4));
    url.searchParams.set("format", "csv");
    window.location.href = url.toString();
  }

  function handleDownloadPdf() {
    const url = new URL(`/api/portal/finance/reports/${reportType}/pdf`, window.location.origin);
    url.searchParams.set("startDate", startDate);
    url.searchParams.set("endDate", endDate);
    url.searchParams.set("fiscalYear", startDate.substring(0, 4));
    window.open(url.toString(), "_blank");
  }

  function formatCell(key: string, value: unknown) {
    if (value === null || value === undefined) return "—";
    
    // Auto-format known money columns
    const moneyKeys = [
      "total_income", "total_expense", "budget_amount", "actual_amount", 
      "variance", "net_surplus", "net_cash_impact", "amount", "purchaseValue"
    ];
    
    if (moneyKeys.includes(key) && typeof value === 'number') {
      return formatMoney("UGX", value);
    }

    if (key === "variance_percentage" && typeof value === 'number') {
      return `${value.toFixed(2)}%`;
    }

    return String(value);
  }

  function formatColumnHeader(key: string) {
    return key.replace(/_/g, " ").replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  return (
    <div className="space-y-8">
      <div className="card">
        <h2>Report Configuration</h2>
        <form onSubmit={handleGenerate} className="form-grid portal-form-grid mt-4">
          <label className="portal-field-label">
            <span>Report Type</span>
            <select 
              value={reportType} 
              onChange={e => setReportType(e.target.value)}
              className="input w-full"
            >
              {REPORT_TYPES.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.label}</option>
              ))}
            </select>
          </label>
          
          <div className="grid grid-cols-2 gap-4">
            <label className="portal-field-label">
              <span>Start Date</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="input w-full" 
                required 
              />
            </label>
            <label className="portal-field-label">
              <span>End Date</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="input w-full" 
                required 
              />
            </label>
          </div>

          <div className="action-row mt-4">
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? "Generating..." : "Generate Report"}
            </button>
            {reportData && reportData.length > 0 && (
              <>
                <button type="button" onClick={handleExportCsv} className="button button-ghost">
                  Export CSV
                </button>
                <button type="button" onClick={handleDownloadPdf} className="button button-ghost">
                  Download PDF
                </button>
              </>
            )}
          </div>
        </form>
        {error && <p className="form-message error mt-4">{error}</p>}
      </div>

      {reportData && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3>{REPORT_TYPES.find(r => r.id === reportType)?.label}</h3>
            <span className="text-sm text-gray-500">
              {reportData.length} records found
            </span>
          </div>

          {reportData.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border rounded bg-gray-50">
              No data available for the selected period.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    {Object.keys(reportData[0]).map(key => (
                      <th key={key} className={typeof reportData[0][key] === 'number' ? 'text-right' : 'text-left'}>
                        {formatColumnHeader(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, i) => (
                    <tr key={i}>
                      {Object.keys(row).map(key => (
                        <td key={key} className={typeof row[key] === 'number' ? 'text-right' : 'text-left'}>
                          {formatCell(key, row[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
