"use client";

import { LucideFileText, LucidePieChart, LucideDownload, LucideTrendingUp, LucideWallet, LucideShield } from "lucide-react";
import { useState } from "react";

const REPORT_TYPES = [
  { id: "PnL", name: "Statement of Activities (P&L)", icon: LucideTrendingUp },
  { id: "BalanceSheet", name: "Statement of Financial Position", icon: LucideFileText },
  { id: "CashFlow", name: "Cash Flow Statement", icon: LucideWallet },
  { id: "BudgetActual", name: "Budget vs. Actual (Variance)", icon: LucidePieChart },
  { id: "Grants", name: "Grant Utilization Report", icon: LucideShield },
];

function ReportCard({ report }: { report: typeof REPORT_TYPES[0] }) {
  const [filterType, setFilterType] = useState<"monthly" | "yearly" | "all_time">("yearly");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 2050 - 2025 + 1 }, (_, i) => 2025 + i);

  // Compute URLs based on active card filters
  let startDate = "";
  let endDate = "";
  let asOfDate = "";

  if (filterType === "monthly") {
      startDate = `${selectedMonth}-01`;
      // Naive end of month (won't be perfect for Feb leap years but Postgres handles >= <= fine usually if we construct a valid string, better to just use standard JS date)
      const dateObj = new Date(selectedMonth + "-01");
      const lastDay = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
      endDate = lastDay.toISOString().slice(0, 10);
      asOfDate = endDate;
  } else if (filterType === "yearly") {
      startDate = `${selectedYear}-01-01`;
      endDate = `${selectedYear}-12-31`;
      asOfDate = endDate;
  } else {
      startDate = `1970-01-01`;
      endDate = `${currentYear + 10}-12-31`; // Effectively future
      asOfDate = endDate;
  }

  const downloadUrl = `/api/portal/finance/statements/${report.id}/pdf?startDate=${startDate}&endDate=${endDate}&asOfDate=${asOfDate}&fiscalYear=${selectedYear}`;

  return (
    <div className="ds-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
        <div style={{ padding: "0.75rem", background: "#eff6ff", borderRadius: "12px", color: "#2563eb" }}>
          <report.icon size={24} />
        </div>
        <h3 style={{ margin: "0", fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>{report.name}</h3>
      </div>
      
      <p style={{ margin: "0", fontSize: "0.85rem", color: "#64748b" }}>
        Generate a presentation-ready A4 PDF with exact structural formatting aligned to accounting standards.
      </p>

      {/* Filter UI */}
      <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginTop: "auto" }}>
        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Reporting Period</h4>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <button 
            onClick={() => setFilterType("monthly")}
            style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid", fontWeight: 500, background: filterType === "monthly" ? "#2563eb" : "#fff", color: filterType === "monthly" ? "#fff" : "#475569", borderColor: filterType === "monthly" ? "#2563eb" : "#cbd5e1", cursor: "pointer" }}
          >
            Monthly
          </button>
          <button 
            onClick={() => setFilterType("yearly")}
            style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid", fontWeight: 500, background: filterType === "yearly" ? "#2563eb" : "#fff", color: filterType === "yearly" ? "#fff" : "#475569", borderColor: filterType === "yearly" ? "#2563eb" : "#cbd5e1", cursor: "pointer" }}
          >
            Yearly
          </button>
          <button 
            onClick={() => setFilterType("all_time")}
            style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid", fontWeight: 500, background: filterType === "all_time" ? "#2563eb" : "#fff", color: filterType === "all_time" ? "#fff" : "#475569", borderColor: filterType === "all_time" ? "#2563eb" : "#cbd5e1", cursor: "pointer" }}
          >
            All Time
          </button>
        </div>

        {filterType === "monthly" && (
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
          />
        )}

        {filterType === "yearly" && (
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}

        {filterType === "all_time" && (
          <div style={{ fontSize: "0.85rem", color: "#64748b", padding: "0.5rem 0" }}>
            Generates from system inception to today.
          </div>
        )}
      </div>

      <a 
        href={downloadUrl}
        target="_blank"
        className="finance-btn finance-btn-primary"
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "0.5rem", textDecoration: "none", marginTop: "0.5rem" }}
      >
        <LucideDownload size={18} />
        Render A4 Statement
      </a>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FinanceReportsPage({ user: _user }: { user: any }) {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "#111827" }}>Financial Reports & Statements</h1>
        <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "0.95rem" }}>
          Export fully-featured, A4 format accounting statements aggregating live native transactions.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
        {REPORT_TYPES.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>

      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "1.5rem", borderRadius: "12px", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        <LucideShield className="text-blue-600" size={24} style={{ flexShrink: 0 }} />
        <div>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#1e3a8a", fontSize: "1.1rem" }}>Governed Fact Pipeline</h3>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#1e40af", lineHeight: 1.5 }}>
            These reports render strictly from exact ledger computations natively connected to the <strong>finance_transactions_ledger</strong>. AI narratives (if appended) are derived logically from verified database totals, and A4 sizing ensures perfect export compatibility.
          </p>
        </div>
      </div>
    </div>
  );
}
