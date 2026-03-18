"use client";

import { LucideFileText, LucidePieChart, LucideDownload } from "lucide-react";

const REPORT_TYPES = [
  { id: "PnL", name: "Statement of Activities (P&L)", icon: LucideTrendingUp },
  { id: "BalanceSheet", name: "Statement of Financial Position", icon: LucideFileText },
  { id: "CashFlow", name: "Cash Flow Statement", icon: LucideWallet },
  { id: "BudgetActual", name: "Budget vs. Actual (Variance)", icon: LucidePieChart },
  { id: "Grants", name: "Grant Utilization Report", icon: LucideShield },
];

import { LucideTrendingUp, LucideWallet, LucideShield } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FinanceReportsPage({ user: _user }: { user: any }) {
  // We no longer need state handling for PDF downloads since we use native endpoints
  const year = 2024;
  const start = "2024-01-01";
  const end = "2024-12-31";

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

            <a 
              href={`/api/portal/finance/statements/${report.id}/pdf?fiscalYear=${year}&startDate=${start}&endDate=${end}`}
              target="_blank"
              className="button button-primary w-full flex items-center justify-center gap-2"
            >
              <LucideDownload className="w-4 h-4" />
              View PDF
            </a>
          </div>
        ))}
      </div>

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
