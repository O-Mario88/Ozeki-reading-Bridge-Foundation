"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FINANCE_INCOME_CATEGORIES } from "@/lib/finance-categories";
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

/* ── Status Pill ── */
function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  return (
    <span className={`finance-status-pill finance-status-pill--${normalized}`}>
      {status}
    </span>
  );
}

/* ── KPI Card ── */
function FinanceKpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <article className="finance-kpi-card">
      <p className="finance-kpi-label">{label}</p>
      <p className="finance-kpi-value">{value}</p>
      {sub && <p className="finance-kpi-sub">{sub}</p>}
    </article>
  );
}

/* ── Calendar Widget ── */
function FinanceCalendarCard({ invoices }: { invoices: FinanceInvoiceRecord[] }) {
  const [offset, setOffset] = useState(0);

  const { year, month, days, firstDow, monthLabel, dueDates } = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + offset);
    const y = now.getFullYear();
    const m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
      new Date(y, m, 1),
    );

    /* Collect due dates from invoices in this month */
    const dues = new Set<number>();
    invoices.forEach((inv) => {
      if (!inv.dueDate) return;
      const d = new Date(inv.dueDate);
      if (d.getFullYear() === y && d.getMonth() === m) {
        dues.add(d.getDate());
      }
    });

    return {
      year: y,
      month: m,
      days: daysInMonth,
      firstDow: firstDay,
      monthLabel: label,
      dueDates: dues,
    };
  }, [offset, invoices]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="finance-calendar-card">
      <div className="cal-header">
        <button type="button" className="cal-nav-btn" onClick={() => setOffset(offset - 1)} aria-label="Previous month">
          ‹
        </button>
        <h3>{monthLabel}</h3>
        <button type="button" className="cal-nav-btn" onClick={() => setOffset(offset + 1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="finance-cal-grid">
        {dayLabels.map((d) => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}
        {Array.from({ length: firstDow }, (_, i) => (
          <div key={`empty-${i}`} className="cal-day outside" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const classes = ["cal-day"];
          if (isToday(day)) classes.push("today");
          else if (dueDates.has(day)) classes.push("has-event");
          return (
            <div key={day} className={classes.join(" ")}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export function PortalFinanceDashboard({
  summary,
  recentInvoices,
  recentReceipts,
  recentExpenses,
}: PortalFinanceDashboardProps) {
  /* Combine recent items for the main table */
  const combinedItems = useMemo(() => {
    const items: Array<{
      type: string;
      ref: string;
      counterparty: string;
      category: string;
      amount: string;
      status: string;
      date: string;
    }> = [];

    recentInvoices.forEach((inv) => {
      items.push({
        type: "Invoice",
        ref: inv.invoiceNumber,
        counterparty: inv.createdByName ?? "—",
        category: inv.category ?? "—",
        amount: formatMoney(inv.currency, inv.total),
        status: inv.status,
        date: formatDate(inv.issueDate),
      });
    });

    recentReceipts.forEach((rec) => {
      items.push({
        type: "Receipt",
        ref: rec.receiptNumber,
        counterparty: rec.receivedFrom ?? "—",
        category: rec.category ?? "—",
        amount: formatMoney(rec.currency, rec.amountReceived),
        status: rec.status,
        date: formatDate(rec.receiptDate),
      });
    });

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [recentInvoices, recentReceipts]);

  return (
    <div className="finance-dashboard-grid">
      {/* ── KPI Row ── */}
      <div className="finance-kpis">
        <FinanceKpiCard
          label="Money In"
          value={formatMoney(summary.currency, summary.moneyIn)}
          sub="This month"
        />
        <FinanceKpiCard
          label="Money Out"
          value={formatMoney(summary.currency, summary.moneyOut)}
          sub="This month"
        />
        <FinanceKpiCard
          label="Outstanding Invoices"
          value={summary.outstandingInvoiceCount.toLocaleString()}
          sub={formatMoney(summary.currency, summary.outstandingInvoiceTotal)}
        />
        <FinanceKpiCard
          label="Net Position"
          value={formatMoney(summary.currency, summary.net)}
          sub="This month"
        />
      </div>

      {/* ── Category Breakdown ── */}
      <div className="finance-table-card">
        <div className="finance-table-card-header">
          <h3>Category Breakdown</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {FINANCE_INCOME_CATEGORIES.map((cat) => (
              <tr key={cat}>
                <td>{cat}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>
                  {formatMoney(summary.currency, summary.categoryBreakdown[cat])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Financial Summary Table ── */}
      <div className="finance-table-card">
        <div className="finance-table-card-header">
          <h3>Recent Transactions</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/portal/finance/invoices" className="finance-btn finance-btn-primary">
              New Invoice
            </Link>
            <Link href="/portal/finance/receipts" className="finance-btn finance-btn-outline">
              New Receipt
            </Link>
          </div>
        </div>
        {combinedItems.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--fin-text-muted)" }}>
            No recent transactions.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Reference</th>
                <th>Counterparty</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {combinedItems.map((item, i) => (
                <tr key={`${item.ref}-${i}`}>
                  <td>{item.type}</td>
                  <td style={{ fontWeight: 600 }}>{item.ref}</td>
                  <td>{item.counterparty}</td>
                  <td>{item.category}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{item.amount}</td>
                  <td><StatusPill status={item.status} /></td>
                  <td>{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Bottom Grid: Expenses + Calendar ── */}
      <div className="finance-dashboard-bottom">
        <div className="finance-table-card">
          <div className="finance-table-card-header">
            <h3>Recent Expenses</h3>
            <Link href="/portal/finance/money-out" className="finance-btn finance-btn-outline">
              View All
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--fin-text-muted)" }}>
              No expenses yet.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Expense #</th>
                  <th>Vendor</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.expenseNumber}</td>
                    <td>{item.vendorName}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {formatMoney(item.currency, item.amount)}
                    </td>
                    <td><StatusPill status={item.status} /></td>
                    <td>{formatDate(item.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <FinanceCalendarCard invoices={recentInvoices} />
      </div>
    </div>
  );
}
