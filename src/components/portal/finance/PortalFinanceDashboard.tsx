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
  recentInvoices: FinanceInvoiceRecord[];
  recentReceipts: FinanceReceiptRecord[];
  recentExpenses: FinanceExpenseRecord[];
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function FinanceKpi({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <article className="finance-kpi-card finance-kpi-card-compact">
      <p className="finance-kpi-label">{label}</p>
      <p className="finance-kpi-value finance-kpi-value-compact">{value}</p>
      {helper ? <p className="finance-kpi-sub">{helper}</p> : null}
    </article>
  );
}

export function PortalFinanceDashboard({
  summary,
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
    <div className="finance-dashboard-grid finance-dashboard-compact">
      <section className="finance-head-compact">
        <div>
          <h2>Finance</h2>
          <p>Compact finance workspace with immutable posting rules and audit-safe actions.</p>
        </div>
        <div className="action-row finance-head-actions">
          <Link href="/portal/finance/invoices" className="button button-sm">+ New Invoice</Link>
          <Link href="/portal/finance/receipts" className="button button-sm">+ New Receipt</Link>
          <Link href="/portal/finance/invoices" className="button button-ghost button-sm">Record Payment</Link>
          <Link href="/portal/finance/money-out" className="button button-ghost button-sm">New Expense</Link>
        </div>
      </section>

      <section className="finance-kpis finance-kpis-compact">
        <FinanceKpi label="Money In (MTD)" value={formatMoney(summary.currency, summary.moneyIn)} />
        <FinanceKpi label="Money Out (MTD)" value={formatMoney(summary.currency, summary.moneyOut)} />
        <FinanceKpi label="Net (MTD)" value={formatMoney(summary.currency, summary.net)} />
        <FinanceKpi
          label="Outstanding invoices"
          value={summary.outstandingInvoiceCount.toLocaleString()}
          helper={formatMoney(summary.currency, summary.outstandingInvoiceTotal)}
        />
        <FinanceKpi label="Overdue invoices" value={overdue.length.toLocaleString()} />
      </section>

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
