"use client";

import Link from "next/link";
import { useMemo } from "react";
import type {
  FinanceDashboardSummary,
  FinanceExpenseRecord,
  FinanceInvoiceRecord,
  FinanceReceiptRecord,
} from "@/lib/types";
import { formatDate, formatMoney } from "@/components/portal/finance/format";

type PortalFinanceDashboardProps = {
  summary: FinanceDashboardSummary;
  totalAssets: number;
  recentInvoices: FinanceInvoiceRecord[];
  recentReceipts: FinanceReceiptRecord[];
  recentExpenses: FinanceExpenseRecord[];
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}


export function PortalFinanceDashboard({
  summary,
  totalAssets,
  recentInvoices,
  recentReceipts,
  recentExpenses,
}: PortalFinanceDashboardProps) {
  const today = todayIsoDate();
  const soonCutoff = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const dueSoon = useMemo(
    () =>
      recentInvoices
        .filter((item) =>
          item.status !== "void" &&
          item.status !== "paid" &&
          item.balanceDue > 0 &&
          item.dueDate >= today &&
          item.dueDate <= soonCutoff
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 8),
    [recentInvoices, soonCutoff, today],
  );

  const overdue = useMemo(
    () =>
      recentInvoices
        .filter((item) =>
          item.status !== "void" &&
          item.status !== "paid" &&
          item.balanceDue > 0 &&
          item.dueDate < today
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 8),
    [recentInvoices, today],
  );

  const activityRows = useMemo(() => {
    const rows: Array<{
      id: string;
      type: "Invoice" | "Receipt" | "Expense";
      ref: string;
      date: string;
      counterparty: string;
      amount: string;
      status: string;
    }> = [];

    recentInvoices.forEach((item) => {
      rows.push({
        id: `invoice-${item.id}`,
        type: "Invoice",
        ref: item.invoiceNumber,
        date: item.issueDate,
        counterparty: item.createdByName || "—",
        amount: formatMoney(item.currency, item.total),
        status: item.status,
      });
    });

    recentReceipts.forEach((item) => {
      rows.push({
        id: `receipt-${item.id}`,
        type: "Receipt",
        ref: item.receiptNumber,
        date: item.receiptDate,
        counterparty: item.receivedFrom || "—",
        amount: formatMoney(item.currency, item.amountReceived),
        status: item.status,
      });
    });

    recentExpenses.forEach((item) => {
      rows.push({
        id: `expense-${item.id}`,
        type: "Expense",
        ref: item.expenseNumber,
        date: item.date,
        counterparty: item.vendorName || "—",
        amount: formatMoney(item.currency, item.amount),
        status: item.status,
      });
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  }, [recentExpenses, recentInvoices, recentReceipts]);

  return (
    <div style={{ minWidth: 0 }}>
      {/* Sleek Header */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1f2937", margin: 0, letterSpacing: "-0.02em" }}>Finance Workspace</h1>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0.25rem 0 0" }}>Compact finance workspace with immutable posting rules and audit-safe actions.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/portal/finance/invoices" className="button button-sm">+ New Invoice</Link>
          <Link href="/portal/finance/receipts" className="button button-sm">+ New Receipt</Link>
          <Link href="/portal/finance/money-out" className="button button-ghost button-sm">New Expense</Link>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1f2937", margin: "0 0 1rem" }}>Financial Overview</h2>
        <div className="ds-metric-grid">
          <div className="ds-metric-card pink">
            <div className="ds-metric-content">
              <span className="ds-metric-title">Total Assets</span>
              <span className="ds-metric-value">{formatMoney(summary.currency, totalAssets)}</span>
              <span className="ds-metric-sub">Current Balance</span>
            </div>
            <div className="ds-metric-icon">🏦</div>
          </div>
          <div className="ds-metric-card blue">
            <div className="ds-metric-content">
              <span className="ds-metric-title">Income (YTD)</span>
              <span className="ds-metric-value">{formatMoney(summary.currency, summary.moneyIn)}</span>
              <span className="ds-metric-sub">Total earned</span>
            </div>
            <div className="ds-metric-icon">📈</div>
          </div>
          <div className="ds-metric-card purple">
            <div className="ds-metric-content">
              <span className="ds-metric-title">Expenses (YTD)</span>
              <span className="ds-metric-value">{formatMoney(summary.currency, summary.moneyOut)}</span>
              <span className="ds-metric-sub">Total spent</span>
            </div>
            <div className="ds-metric-icon">📉</div>
          </div>
          <div className="ds-metric-card green">
            <div className="ds-metric-content">
              <span className="ds-metric-title">Net (YTD)</span>
              <span className="ds-metric-value">{formatMoney(summary.currency, summary.net)}</span>
              <span className="ds-metric-sub">Surplus/Deficit</span>
            </div>
            <div className="ds-metric-icon">💰</div>
          </div>
          <div className="ds-metric-card">
            <div className="ds-metric-content">
              <span className="ds-metric-title">Outstanding</span>
              <span className="ds-metric-value">{formatMoney(summary.currency, summary.outstandingInvoiceTotal)}</span>
              <span className="ds-metric-sub">{summary.outstandingInvoiceCount} invoices</span>
            </div>
            <div className="ds-metric-icon">⏳</div>
          </div>
          <div className="ds-metric-card">
            <div className="ds-metric-content">
              <span className="ds-metric-title">Overdue</span>
              <span className="ds-metric-value">{overdue.length.toLocaleString()}</span>
              <span className="ds-metric-sub">Invoices past due</span>
            </div>
            <div className="ds-metric-icon">⚠️</div>
          </div>
        </div>
      </div>

      <section className="finance-dashboard-two-column">
        <article className="finance-table-card">
          <div className="finance-table-card-header">
            <h3>Recent Activity</h3>
          </div>
          {activityRows.length === 0 ? (
            <div className="finance-table-empty">No finance activity yet.</div>
          ) : (
            <div className="table-wrap finance-table-compact">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Counterparty</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRows.map((item) => (
                    <tr key={item.id}>
                      <td>{item.type}</td>
                      <td><strong>{item.ref}</strong></td>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.counterparty}</td>
                      <td style={{ textAlign: "right" }}>{item.amount}</td>
                      <td>
                        <span className={`finance-status-tag finance-status-${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <div className="finance-right-stack">
          <article className="finance-table-card">
            <div className="finance-table-card-header">
              <h3>Due Soon (14 days)</h3>
            </div>
            {dueSoon.length === 0 ? (
              <div className="finance-table-empty">No upcoming due invoices.</div>
            ) : (
              <div className="table-wrap finance-table-compact">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Due</th>
                      <th style={{ textAlign: "right" }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueSoon.map((item) => (
                      <tr key={item.id}>
                        <td>{item.invoiceNumber}</td>
                        <td>{formatDate(item.dueDate)}</td>
                        <td style={{ textAlign: "right" }}>{formatMoney(item.currency, item.balanceDue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="finance-table-card">
            <div className="finance-table-card-header">
              <h3>Overdue</h3>
            </div>
            {overdue.length === 0 ? (
              <div className="finance-table-empty">No overdue invoices.</div>
            ) : (
              <div className="table-wrap finance-table-compact">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Due</th>
                      <th style={{ textAlign: "right" }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.map((item) => (
                      <tr key={item.id}>
                        <td>{item.invoiceNumber}</td>
                        <td>{formatDate(item.dueDate)}</td>
                        <td style={{ textAlign: "right" }}>{formatMoney(item.currency, item.balanceDue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
