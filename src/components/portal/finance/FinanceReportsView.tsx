"use client";

import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { generateFinancialReport } from "@/app/actions/finance-report-actions";
import { LucideFileText, LucidePieChart, LucideDownload, LucideLoader2 } from "lucide-react";

const REPORT_TYPES = [
  { id: "PnL", name: "Statement of Activities (P&L)", icon: LucideTrendingUp },
  { id: "BalanceSheet", name: "Statement of Financial Position", icon: LucideFileText },
  { id: "CashFlow", name: "Cash Flow Statement", icon: LucideWallet },
  { id: "BudgetActual", name: "Budget vs. Actual (Variance)", icon: LucidePieChart },
  { id: "Grants", name: "Grant Utilization Report", icon: LucideShield },
];

import { LucideTrendingUp, LucideWallet, LucideShield } from "lucide-react";

export default function FinanceReportsPage({ user }: { user: any }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [lastPdf, setLastPdf] = useState<{ url: string; name: string } | null>(null);

  async function handleGenerate(type: string) {
    setLoading(type);
    try {
      const result = await generateFinancialReport(type, {
        fiscalYear: 2024,
        startDate: "2024-01-01",
        endDate: "2024-12-31"
      });
      
      const blob = await fetch(`data:application/pdf;base64,${result.pdfBase64}`).then(res => res.blob());
      const url = URL.createObjectURL(blob);
      setLastPdf({ url, name: result.fileName });
      
      // Auto-download
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to generate report. Check API logs.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REPORT_TYPES.map((report) => (
          <div key={report.id} className="card p-6 flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <report.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">{report.name}</h3>
            </div>
            
            <p className="text-gray-500 text-sm mb-6">
              Generate a presentation-ready PDF including automated AI narration, variance analysis, and fund health summaries.
            </p>

            <button 
              disabled={!!loading}
              onClick={() => handleGenerate(report.id)}
              className="button button-primary w-full flex items-center justify-center gap-2"
            >
              {loading === report.id ? (
                <>
                  <LucideLoader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <LucideDownload className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {lastPdf && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full text-green-700">
              <LucideFileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-green-900">Success: {lastPdf.name}</p>
              <p className="text-sm text-green-700">The report was generated and downloaded successfully.</p>
            </div>
          </div>
          <a href={lastPdf.url} download={lastPdf.name} className="button button-outline button-sm">
            Download Again
          </a>
        </div>
      )}

      <div className="card p-6 bg-blue-50 border-blue-100">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <LucideShield className="w-5 h-5 text-blue-600" />
          Governed AI Pipeline
        </h3>
        <p className="text-sm text-blue-800 leading-relaxed">
          These reports are generated using a strictly controlled "Fact Pack" pipeline. The AI only analyzes data fetched directly 
          from the PostgreSQL ledger. Recommendations are based on Ozeki's financial health indicators.
          <strong> Manual signature is required on all generated PDFs before final archival.</strong>
        </p>
      </div>
    </div>
  );
}
